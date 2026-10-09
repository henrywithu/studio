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
    const activeIndex = links.findIndex((link) => {
      const href = link.getAttribute("href")!;
      const path = route.replace(/\/$/, "") || "/";
      return href === path || (href !== "/" && path.startsWith(href + "/"));
    });
    header.classList.toggle(
      "header--shop",
      route.replace(/\/$/, "") === "/shop",
    );
    links.forEach((link, index) => {
      const href = link.getAttribute("href")!;
      const active = index === activeIndex;
      link.classList.toggle("router-link-active", active);
      link.classList.toggle("router-link-exact-active", href === route);
      link
        .closest(".nav-item")
        ?.classList.toggle("nav-item--translated", index < activeIndex);
      gsap.set(link.querySelector(".dot"), { clearProps: "transform" });
      if (active) link.setAttribute("aria-current", "page");
      else link.removeAttribute("aria-current");
    });
    const logo = header.querySelector(".header-logo__link")!;
    logo.classList.toggle("router-link-active", activeIndex === 0);
    logo.classList.toggle("router-link-exact-active", activeIndex === 0);
    if (activeIndex === 0) logo.setAttribute("aria-current", "page");
    else logo.removeAttribute("aria-current");
    const burger = header.querySelectorAll(".nav-toggle__svg--burger path");
    const cross = header.querySelectorAll(".nav-toggle__svg--close path");
    gsap.set(burger, { opacity: 1 });
    gsap.set(cross, { opacity: 0 });
    function toggle() {
      const open = header.classList.toggle("header--nav-open");
      document.body.classList.toggle("oh", open);
      header.querySelector(".nav")?.classList.toggle("nav--open", open);
      header
        .querySelector(".nav-toggle")
        ?.setAttribute("aria-expanded", String(open));
      header
        .querySelector(".nav-toggle")
        ?.setAttribute(
          "aria-label",
          open ? "Close navigation" : "Open navigation",
        );
      gsap.killTweensOf([...burger, ...cross]);
      const hide = open ? burger : cross;
      const show = open ? cross : burger;
      gsap
        .timeline()
        .set(hide, { opacity: 0, stagger: 0.05 }, 0)
        .set(hide, { opacity: 1, stagger: 0.05 }, 0.08)
        .set(hide, { opacity: 0, stagger: 0.05 }, 0.16)
        .set(show, { opacity: 1, stagger: 0.05 }, 0.35)
        .set(show, { opacity: 0, stagger: 0.05 }, 0.43)
        .set(show, { opacity: 1, stagger: 0.05 }, 0.51);
      if (open) lenis.stop();
      else lenis.start();
    }
    const button = header.querySelector(".nav-toggle");
    button?.setAttribute("aria-label", "Open navigation");
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
    const animateLabel = (event: Event) => {
      const label = (event.currentTarget as Element).querySelector(
        ".link__label",
      );
      gsap.killTweensOf(label);
      if (event.type === "click") {
        blink(label).set(label, { clearProps: "opacity" });
        if (header.classList.contains("header--nav-open")) toggle();
      } else {
        gsap
          .timeline()
          .set(label, { opacity: 0 })
          .set(label, { opacity: 1, clearProps: "opacity" }, 0.09);
      }
    };
    links.forEach((link) => {
      link.addEventListener("mouseenter", animateLabel);
      link.addEventListener("click", animateLabel);
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
      const wasOpen = header.classList.contains("header--nav-open");
      document.body.classList.remove("oh");
      header.classList.remove("header--nav-open");
      header.querySelector(".nav")?.classList.remove("nav--open");
      if (wasOpen) lenis.start();
      gsap.killTweensOf([
        ...burger,
        ...cross,
        ...header.querySelectorAll(".link__label"),
      ]);
      gsap.set(header.querySelectorAll(".link__label"), {
        clearProps: "opacity",
      });
      links.forEach((link) => {
        link.removeEventListener("mouseenter", animateLabel);
        link.removeEventListener("click", animateLabel);
      });
    };
  }, [route]);
  useLayoutEffect(() => {
    const header = ref.current!.querySelector("header")!;
    header.classList.toggle("header--preloader", !ready);
    header.classList.toggle("header--preloader-done", ready);
    if (ready) {
      const tl = gsap.timeline();
      header
        .querySelectorAll(".nav-item__link,.header-status,.header-location")
        .forEach((element, i) => tl.add(blink(element), i * 0.04));
      return () => {
        tl.kill();
      };
    }
  }, [ready]);
  return (
    <div ref={ref} className="chrome-root">
      <Content node={chrome.header as ElementNode} />
    </div>
  );
}
