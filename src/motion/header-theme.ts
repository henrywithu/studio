import { ScrollTrigger } from "./engine";
/** Trigger properties extracted from each source HeaderThemeTrigger component. */
export function setupHeaderTheme(root: HTMLElement) {
  const header = document.querySelector("header");
  if (!header) return;
  const set = (theme: string) => {
    header.classList.toggle("header--light", theme === "light");
    header.classList.toggle("header--dark", theme === "dark");
  };
  const flip = () =>
    set(header.classList.contains("header--light") ? "dark" : "light");
  root
    .querySelectorAll<HTMLElement>("[data-header-theme]")
    .forEach((element) => {
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
      });
    });
  const footer = root.querySelector(".footer");
  if (footer)
    ScrollTrigger.create({
      trigger: footer,
      start: "top 2%",
      end: "bottom 2%",
      onEnter: () => set("light"),
      onLeaveBack: () => set("dark"),
      onEnterBack: () => set("light"),
    });
  const first = root.querySelector<HTMLElement>("[data-header-theme]");
  if (first && scrollY < 10) set(first.dataset.headerTheme!);
}
