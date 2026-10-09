import { gsap, ScrollTrigger } from "./engine";
/** Trigger properties extracted from each source HeaderThemeTrigger component. */
export function setupHeaderTheme(root: HTMLElement, route: string, delay = 0) {
  const header = document.querySelector("header");
  if (!header) return () => {};
  const triggers: ScrollTrigger[] = [];
  const set = (theme: string) => {
    header.classList.toggle("header--light", theme === "light");
    header.classList.toggle("header--dark", theme === "dark");
  };
  const flip = () =>
    set(header.classList.contains("header--light") ? "dark" : "light");
  const initialize = () => {
    root
      .querySelectorAll<HTMLElement>("[data-header-theme]")
      .forEach((element) => {
        triggers.push(
          ScrollTrigger.create({
            trigger: element,
            start: "top 2%",
            end: "bottom 2%",
            onEnter: () => set(element.dataset.headerTheme!),
            onEnterBack: () => set(element.dataset.headerTheme!),
            onLeaveBack: flip,
            onLeave: () => {
              if (element.dataset.headerLeave === "true") flip();
            },
          }),
        );
      });
    const footer = root.querySelector(".footer");
    if (footer)
      triggers.push(
        ScrollTrigger.create({
          trigger: footer,
          start: "top 2%",
          end: "bottom 2%",
          onEnter: () => set("light"),
          onLeaveBack: () => set("dark"),
          onEnterBack: () => set("light"),
        }),
      );
    const first = root.querySelector<HTMLElement>("[data-header-theme]");
    if (scrollY < 10)
      set(
        first?.dataset.headerTheme ||
          (["/", "/contact", "/blog"].includes(route) ||
          route.startsWith("/work/")
            ? "light"
            : "dark"),
      );
  };
  const timer = delay ? gsap.delayedCall(delay, initialize) : null;
  if (!delay) initialize();
  return () => {
    timer?.kill();
    triggers.forEach((trigger) => trigger.kill());
  };
}
