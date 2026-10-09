import { useLayoutEffect, useRef } from "react";
import chrome from "../content/chrome.json";
import { Content } from "./Content";
import type { ElementNode } from "../content/types";
import { gsap, blink, lenis } from "../motion/engine";
export function Header({ route, ready }: { route: string; ready: boolean }) {
  const ref = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    const header = ref.current!.querySelector("header")!;
    header.classList.add("header--visible");
    const links = Array.from(
      header.querySelectorAll<HTMLAnchorElement>(".nav-item__link"),
    );
    links.forEach((link) => {
      const href = link.getAttribute("href")!;
      const active = href === "/" ? route === "/" : route.startsWith(href);
      link.classList.toggle("router-link-active", active);
      link.classList.toggle("router-link-exact-active", href === route);
      if (active) link.setAttribute("aria-current", "page");
      else link.removeAttribute("aria-current");
    });
    function toggle() {
      const open = header.classList.toggle("header--nav-open");
      document.body.classList.toggle("oh", open);
      header.querySelector(".nav")?.classList.toggle("nav--open", open);
      header
        .querySelector(".nav-toggle")
        ?.setAttribute("aria-expanded", String(open));
      gsap.to(header.querySelector(".nav-toggle__svg--burger"), {
        opacity: open ? 0 : 1,
        duration: 0.2,
      });
      gsap.to(header.querySelectorAll(".nav-toggle__svg--close path"), {
        opacity: open ? 1 : 0,
        stagger: 0.05,
        duration: 0.2,
      });
      if (open) lenis.stop();
      else lenis.start();
    }
    const button = header.querySelector(".nav-toggle");
    button?.setAttribute("aria-label", "Toggle navigation");
    button?.setAttribute("aria-expanded", "false");
    button?.addEventListener("click", toggle);
    const escape = (event: KeyboardEvent) => {
      if (
        event.key === "Escape" &&
        header.classList.contains("header--nav-open")
      )
        toggle();
    };
    window.addEventListener("keydown", escape);
    const hover = (event: Event) => {
      gsap.to((event.currentTarget as Element).querySelector(".dot"), {
        scale: 1,
        duration: 0.4,
        ease: "expoOut",
      });
      const index = links.indexOf(event.currentTarget as HTMLAnchorElement);
      header
        .querySelectorAll(".nav-item")
        .forEach((li, i) =>
          li.classList.toggle("nav-item--translated", i >= index),
        );
    };
    const leave = (event: Event) => {
      const link = event.currentTarget as HTMLAnchorElement;
      gsap.to(link.querySelector(".dot"), {
        scale: link.classList.contains("router-link-active") ? 1 : 0,
        duration: 0.4,
        ease: "expoOut",
      });
      header
        .querySelectorAll(".nav-item")
        .forEach((li) => li.classList.remove("nav-item--translated"));
    };
    links.forEach((link) => {
      link.addEventListener("mouseenter", hover);
      link.addEventListener("mouseleave", leave);
    });
    header
      .querySelectorAll(".header-status > .dot")
      .forEach((dot) => dot.remove());
    const status = header.querySelector(".header-status > span");
    if (status) {
      status.textContent = "INDEPENDENT / CREATIVE";
      const dot = document.createElement("span");
      dot.className = "dot--8 dot--filled dot dot--red";
      status.before(dot);
    }
    return () => {
      button?.removeEventListener("click", toggle);
      window.removeEventListener("keydown", escape);
      document.body.classList.remove("oh");
      header.classList.remove("header--nav-open");
      header.querySelector(".nav")?.classList.remove("nav--open");
      lenis.start();
      links.forEach((link) => {
        link.removeEventListener("mouseenter", hover);
        link.removeEventListener("mouseleave", leave);
      });
    };
  }, [route]);
  useLayoutEffect(() => {
    const header = ref.current!.querySelector("header")!;
    header.classList.toggle("header--preloader", !ready);
    header.classList.toggle("header--preloader-done", ready);
    if (ready) {
      const theme =
        ["/", "/shop", "/contact", "/blog"].includes(route) ||
        route.startsWith("/work/")
          ? "light"
          : "dark";
      header.classList.toggle("header--light", theme === "light");
      header.classList.toggle("header--dark", theme === "dark");
      const tl = gsap.timeline();
      header
        .querySelectorAll(".nav-item__link,.header-status,.header-location")
        .forEach((element, i) => tl.add(blink(element), i * 0.04));
    }
  }, [ready, route]);
  return (
    <div ref={ref} className="chrome-root">
      <Content node={chrome.header as ElementNode} />
    </div>
  );
}
