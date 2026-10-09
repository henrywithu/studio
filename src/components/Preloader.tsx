import { useLayoutEffect, useRef } from "react";
import chrome from "../content/chrome.json";
import { Content } from "./Content";
import type { ElementNode } from "../content/types";
import { gsap, lenis, blink, reducedMotion } from "../motion/engine";
export function Preloader({
  home,
  onDone,
}: {
  home: boolean;
  onDone: () => void;
}) {
  const root = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    const container = root.current!;
    const loader = container.querySelector<HTMLElement>(".preloader")!;
    loader.classList.toggle("preloader--home", home);
    const wrapper = loader.querySelector<HTMLElement>(".preloader__wrapper")!;
    const mark = loader.querySelector(".preloader__r");
    const fps = loader.querySelector<HTMLElement>(".preloader__fps");
    const labels = loader.querySelectorAll(".preloader__fps-label");
    const count = labels[0];
    const line = wrapper.querySelectorAll(".logo__line");
    const letters = wrapper.querySelectorAll(".logo__letter");
    lenis.stop();
    const complete = () => {
      if (home) {
        const target = document.querySelector(".home-hero__wrapper");
        if (target)
          target.querySelector<HTMLElement>(
            ".preloader__wrapper",
          )!.style.opacity = "1";
        document
          .querySelector(".home-hero")
          ?.classList.add("home-hero--preloader-done");
        document
          .querySelector(".home-hero__fig")
          ?.classList.add("home-hero__fig--visible");
      }
      loader.style.display = "none";
      lenis.start();
      onDone();
    };
    if (reducedMotion) {
      gsap.set([wrapper, mark], { opacity: 1 });
      complete();
      return;
    }
    const ctx = gsap.context(() => {
      gsap.set(letters, { opacity: 0 });
      gsap.set(wrapper.querySelectorAll(".logo__shape--xy"), {
        transformOrigin: "center",
        scale: 3,
      });
      gsap.set(wrapper.querySelectorAll(".logo__shape--y"), {
        transformOrigin: "center",
        scaleY: 3,
      });
      gsap.set(wrapper.querySelectorAll(".logo__shape--x"), {
        transformOrigin: "center",
        scaleX: 5,
      });
      gsap.set(line, { transformOrigin: "left", scaleX: 0 });
      const counter = { value: 0 };
      gsap.to(counter, {
        value: 24,
        duration: 3,
        delay: 0.8,
        ease: "expo.inOut",
        onUpdate: () => {
          count.textContent = Math.round(counter.value)
            .toString()
            .padStart(2, "0");
        },
      });
      const tl = gsap.timeline({
        delay: 0.5,
        onComplete: () => {
          if (home) complete();
          else
            gsap.to(loader, {
              yPercent: -125,
              xPercent: 10,
              rotation: 15,
              transformOrigin: "top right",
              duration: 0.8,
              delay: 0.2,
              ease: "pageOut",
              onComplete: complete,
            });
        },
      });
      labels.forEach((label, i) => tl.add(blink(label), i * 0.12));
      tl.set(wrapper, { opacity: 1 }, 0)
        .to(line, { scaleX: 1, duration: 1.2, ease: "power1.out" }, 0)
        .to(line, { scaleY: 3.6, duration: 0.35, ease: "expo.inOut" }, 1.18)
        .set(line, { scaleX: 1, scaleY: 1 }, 1.53)
        .set(letters, { opacity: 1 }, 1.53);
      letters.forEach((letter, i) =>
        tl.to(
          letter.querySelectorAll(".logo__shape"),
          { scaleX: 1, scaleY: 1, duration: 1, ease: "power4.out" },
          1.53 + i * 0.01,
        ),
      );
      tl.add(blink(mark), 1.8).add(blink(fps, true), 2.8);
    }, container);
    return () => {
      ctx.revert();
      lenis.start();
    };
  }, []);
  return (
    <div ref={root}>
      <Content node={chrome.loader as ElementNode} />
    </div>
  );
}
