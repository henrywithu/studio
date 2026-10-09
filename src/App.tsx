import { useEffect, useLayoutEffect, useRef, useState } from "react";
import type { PageContent, ElementNode } from "./content/types";
import { Content } from "./components/Content";
import { Header } from "./components/Header";
import { Preloader } from "./components/Preloader";
import { Cursor } from "./components/Cursor";
import { Scrollbar } from "./components/Scrollbar";
import { gsap, ScrollTrigger, lenis, reducedMotion } from "./motion/engine";
import { setupHome } from "./motion/home";
import { setupMedia } from "./motion/media";
import { setupControls } from "./motion/controls";
import { setupCarousels, setupCursorCarousels } from "./motion/carousels";
import { setupPageMotion } from "./motion/pages";
import { setupWork } from "./motion/work";
import { setupText } from "./motion/text";
import { setupHeaderTheme } from "./motion/header-theme";
import { setupSharedMotion } from "./motion/shared";
import { setupNewsletter } from "./motion/newsletter";
const cache = new Map<string, Promise<PageContent>>();
function fetchPage(path: string) {
  const route = path.replace(/\/$/, "") || "/";
  if (!cache.has(route)) {
    const name = route === "/" ? "home" : route.slice(1).replaceAll("/", "__");
    cache.set(
      route,
      fetch("/content/" + name + ".json").then((response) => {
        if (!response.ok) throw new Error("Page not found");
        return response.json() as Promise<PageContent>;
      }),
    );
  }
  return cache.get(route)!;
}
export function App() {
  const [route, setRoute] = useState(location.pathname),
    [page, setPage] = useState<PageContent | null>(null),
    [ready, setReady] = useState(false),
    [error, setError] = useState(false);
  const root = useRef<HTMLElement>(null);
  const navigating = useRef(false);
  const first = useRef(true);
  useEffect(() => {
    let canceled = false;
    setError(false);
    fetchPage(route)
      .then((data) => {
        if (!canceled) {
          setPage(data);
          document.title = data.title;
          let meta = document.querySelector<HTMLMetaElement>(
            'meta[name="description"]',
          );
          if (!meta) {
            meta = document.createElement("meta");
            meta.name = "description";
            document.head.appendChild(meta);
          }
          meta.content = data.description;
        }
      })
      .catch(() => {
        if (!canceled) setError(true);
      });
    return () => {
      canceled = true;
    };
  }, [route]);
  useEffect(() => {
    const navigate = async (path: string, push = true) => {
      if (navigating.current || path === location.pathname) return;
      navigating.current = true;
      try {
        await fetchPage(path);
        const element = root.current?.querySelector<HTMLElement>(".page-root");
        if (push) history.pushState({}, "", path);
        if (element && !reducedMotion)
          await gsap.to(element, {
            y: -innerHeight * 0.25,
            rotation: 4,
            duration: 0.78,
            ease: "pageOut",
            transformOrigin: "center top",
          });
        lenis.scrollTo(0, { immediate: true });
        setRoute(path);
        setTimeout(() => {
          navigating.current = false;
        }, 100);
      } catch {
        navigating.current = false;
      }
    };
    const click = (event: MouseEvent) => {
      if (
        event.button !== 0 ||
        event.metaKey ||
        event.ctrlKey ||
        event.shiftKey ||
        event.altKey
      )
        return;
      const link = (event.target as Element).closest<HTMLAnchorElement>(
        "a[href]",
      );
      if (!link || link.target === "_blank" || link.hasAttribute("download"))
        return;
      const url = new URL(link.href);
      if (url.origin !== location.origin || !url.pathname.startsWith("/"))
        return;
      if (url.hash && url.pathname === location.pathname) return;
      event.preventDefault();
      void navigate(url.pathname);
    };
    const pop = () => {
      lenis.scrollTo(0, { immediate: true });
      setRoute(location.pathname);
    };
    document.addEventListener("click", click);
    window.addEventListener("popstate", pop);
    const prefetch = (event: PointerEvent) => {
      const link = (event.target as Element).closest<HTMLAnchorElement>(
        'a[href^="/"]',
      );
      if (link) void fetchPage(new URL(link.href).pathname).catch(() => {});
    };
    document.addEventListener("pointerover", prefetch);
    return () => {
      document.removeEventListener("click", click);
      window.removeEventListener("popstate", pop);
      document.removeEventListener("pointerover", prefetch);
    };
  }, []);
  useLayoutEffect(() => {
    if (!page || !root.current) return;
    const container = root.current;
    const cleanups: (() => void)[] = [];
    const context = gsap.context(() => {
      cleanups.push(
        setupNewsletter(container),
        setupMedia(container),
        setupControls(container),
        setupCarousels(container),
        setupCursorCarousels(container),
        setupWork(container),
        setupPageMotion(container),
      );
      ScrollTrigger.refresh();
    }, container);
    return () => {
      cleanups.forEach((fn) => fn());
      context.revert();
    };
  }, [page]);
  useLayoutEffect(() => {
    if (!page || !ready || !root.current) return;
    const container = root.current;
    const cleanups: (() => void)[] = [];
    const context = gsap.context(() => {
      cleanups.push(setupText(container));
      setupHeaderTheme(container);
      if (page.route === "/") setupHome(container);
      cleanups.push(setupSharedMotion(container));
      if (!first.current && !reducedMotion)
        gsap.fromTo(
          container.querySelector(".page-root"),
          { xPercent: -10, y: innerHeight * 1.05, rotation: -4 },
          {
            xPercent: 0,
            y: 0,
            rotation: 0,
            duration: 0.8,
            ease: "pageOut",
            clearProps: "transform",
          },
        );
      ScrollTrigger.refresh();
    }, container);
    first.current = false;
    return () => {
      cleanups.forEach((fn) => fn());
      context.revert();
    };
  }, [page, ready]);
  return (
    <main ref={root} className={page?.mainClass || "route-index"}>
      <Header route={route} ready={ready} />
      {page && !ready && (
        <Preloader home={route === "/"} onDone={() => setReady(true)} />
      )}
      <Cursor />
      <Scrollbar />
      {page && (
        <div key={page.route} className={`${page.pageClass} page-root`}>
          {page.sections.map((section, i) => (
            <PageSection key={i} node={section} />
          ))}
        </div>
      )}
      {error && (
        <div className="studio-error">
          <h1>Page not found</h1>
          <a href="/">Back to home</a>
        </div>
      )}
    </main>
  );
}
function PageSection({ node }: { node: ElementNode }) {
  return <Content node={node} />;
}
