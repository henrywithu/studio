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
import { updateMetadata } from "./metadata";
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
  const transition = useRef<"page" | "case-next">("page");
  const outgoing = useRef<HTMLElement | null>(null);
  useEffect(() => {
    let canceled = false;
    setError(false);
    fetchPage(route)
      .then((data) => {
        if (!canceled) {
          setPage(data);
          updateMetadata(data);
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
    const navigate = async (path: string, seamless = false) => {
      if (navigating.current || path === location.pathname) return;
      navigating.current = true;
      try {
        await fetchPage(path);
        const element = root.current?.querySelector<HTMLElement>(".page-root");
        lenis.stop();
        window.dispatchEvent(
          new CustomEvent("studio:transition", { detail: true }),
        );
        transition.current = seamless ? "case-next" : "page";
        if (seamless && !reducedMotion) {
          const footer = element?.querySelector<HTMLElement>(
            ".case-footer__inner",
          );
          if (footer) {
            await gsap.to(footer, {
              y: -footer.getBoundingClientRect().top,
              duration: 1,
              ease: "expoOut",
            });
            gsap.set(footer.querySelectorAll(".case-footer__content"), {
              xPercent: 0,
              yPercent: 0,
              rotation: 0,
            });
          }
        }
        if (element && !reducedMotion && !seamless) {
          const overlay = document.createElement("div");
          overlay.className = "studio-transition";
          overlay.setAttribute("aria-hidden", "true");
          const snapshot = element.cloneNode(true) as HTMLElement;
          snapshot.style.transform = `translateY(${-scrollY}px)`;
          overlay.append(snapshot);
          document.body.append(overlay);
          outgoing.current = overlay;
        }
        history.pushState({}, "", path);
        lenis.scrollTo(0, { immediate: true, force: true });
        setRoute(path);
      } catch {
        window.dispatchEvent(
          new CustomEvent("studio:transition", { detail: false }),
        );
        navigating.current = false;
        lenis.start();
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
      if (url.search) {
        location.href = url.pathname + url.search;
        return;
      }
      void navigate(url.pathname, !!link.closest(".case-footer"));
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
      if (!first.current && !reducedMotion && transition.current === "page") {
        const element = container.querySelector<HTMLElement>(".page-root")!;
        gsap.set(element, {
          position: "fixed",
          top: 0,
          left: 0,
          width: "100%",
          zIndex: 200,
        });
        gsap.fromTo(
          element,
          {
            xPercent: -10,
            y: innerHeight * 1.05,
            rotation: -4,
            transformOrigin: "top right",
          },
          {
            xPercent: 0,
            y: 0,
            rotation: 0,
            duration: 0.8,
            ease: "pageOut",
            onComplete: () => {
              gsap.set(element, {
                clearProps:
                  "position,top,left,width,zIndex,transform,transformOrigin",
              });
              lenis.scrollTo(0, { immediate: true, force: true });
              lenis.start();
              window.dispatchEvent(
                new CustomEvent("studio:transition", { detail: false }),
              );
              navigating.current = false;
              ScrollTrigger.refresh();
              const old = outgoing.current;
              if (old) {
                gsap.to(old.firstElementChild, {
                  y: -innerHeight * 0.25,
                  rotation: 4,
                  duration: 0.78,
                  ease: "pageOut",
                  transformOrigin: "center top",
                  onComplete: () => old.remove(),
                });
                outgoing.current = null;
              }
            },
          },
        );
      } else {
        lenis.start();
        window.dispatchEvent(
          new CustomEvent("studio:transition", { detail: false }),
        );
        navigating.current = false;
      }
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
