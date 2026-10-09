import { SplitText } from "gsap/SplitText";
import { gsap, ScrollTrigger, reducedMotion, blink } from "./engine";
gsap.registerPlugin(SplitText);
/** Recreate line, word and character splitting, including the font's first-letter correction. */
export function setupText(root: HTMLElement) {
  const splits: SplitText[] = [],
    cleanup: (() => void)[] = [];
  root.querySelectorAll<HTMLElement>(".text-splitter").forEach((element) => {
    if (!element.textContent?.trim()) return;
    const paragraphs = element.querySelectorAll("p");
    const targets = paragraphs.length ? Array.from(paragraphs) : element;
    const heading = !!element.closest(
      "h1,h2,h3,.module-subtitle-title,.module-subtitle-copy",
    );
    const address = element.closest(".footer-col--address");
    if (address) paragraphs.forEach((p) => (p.style.display = "block"));
    const footerCTA = element.closest<HTMLElement>(".footer-cta");
    const excerpt = element.closest(
      ".work-item-meta-bot__excerpt,.news-item__excerpt",
    );
    const split = SplitText.create(targets, {
      type:
        element.dataset.splitType ||
        (footerCTA ? "chars" : heading ? "lines,words" : "lines"),
      linesClass:
        element.dataset.splitLine ||
        (excerpt ? "work-item-meta-bot__line" : "anim-line"),
      wordsClass: "anim-word",
      charsClass: "anim-char",
      autoSplit: true,
      onSplit(self) {
        if (element.dataset.splitFont === "true")
          self.lines.forEach((line) => {
            const char = line.textContent?.trim().charAt(0);
            if (char) line.classList.add("letter-" + char);
          });
        if (element.dataset.splitDisplay === "true")
          gsap.set(self.lines, { display: "inline-flex" });
        if (excerpt) gsap.set(self.lines, { opacity: 0 });
      },
    });
    splits.push(split);
    element.classList.add("text-splitter--splitted");
    if (footerCTA && !reducedMotion) {
      const enter = () => {
        const offset =
          footerCTA
            .querySelector(".footer-cta__svg--clone")!
            .getBoundingClientRect().width + 20;
        gsap.killTweensOf(split.chars);
        const timeline = gsap.timeline();
        split.chars.forEach((char, i) =>
          timeline.add(blink(char, true), 0.025 * i),
        );
        timeline.set(
          split.chars,
          { x: offset },
          0.025 * (split.chars.length + 1),
        );
        split.chars.forEach((char, i) =>
          timeline.add(blink(char), 0.025 * (split.chars.length + 1 + i)),
        );
      };
      const leave = () => {
        gsap.killTweensOf(split.chars);
        const timeline = gsap.timeline();
        split.chars.forEach((char, i) =>
          timeline.set(char, { opacity: 0 }, 0.025 * i),
        );
        timeline.set(
          split.chars,
          { x: 0 },
          0.025 + 0.01 * (split.chars.length + 1),
        );
        split.chars.forEach((char, i) =>
          timeline.add(
            blink(char),
            0.01 * (split.chars.length + 1) + 0.025 * i,
          ),
        );
      };
      footerCTA.addEventListener("mouseenter", enter);
      footerCTA.addEventListener("mouseleave", leave);
      cleanup.push(() => {
        footerCTA.removeEventListener("mouseenter", enter);
        footerCTA.removeEventListener("mouseleave", leave);
      });
    }
    if (excerpt) {
      const card = element.closest<HTMLElement>(".work-grid-item,.news-item")!;
      if (!card) return;
      const enter = () =>
        gsap.fromTo(
          split.lines,
          { opacity: 0, y: 20 },
          { opacity: 1, y: 0, stagger: 0.08, duration: 0.8, ease: "expoOut" },
        );
      const leave = () =>
        gsap.to(split.lines, { opacity: 0, duration: 0.5, ease: "expoOut" });
      card.addEventListener("mouseenter", enter);
      card.addEventListener("mouseleave", leave);
      cleanup.push(() => {
        card.removeEventListener("mouseenter", enter);
        card.removeEventListener("mouseleave", leave);
      });
    }
  });
  ScrollTrigger.refresh();
  return () => {
    cleanup.forEach((fn) => fn());
    splits.forEach((split) => split.revert());
  };
}
