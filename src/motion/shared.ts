import { gsap, ScrollTrigger, reducedMotion } from "./engine";

/** Layout measurements and shared media motion, transcribed from the source modules. */
export function setupSharedMotion(root: HTMLElement) {
  const cleanups: (() => void)[] = [];
  const listen = (el: EventTarget, name: string, fn: EventListener) => {
    el.addEventListener(name, fn);
    cleanups.push(() => el.removeEventListener(name, fn));
  };
  root.querySelectorAll<HTMLElement>(".footer").forEach((footer) => {
    const content = footer.querySelector<HTMLElement>(".footer__content");
    const wrapper = footer.querySelectorAll<HTMLElement>(".footer__wrapper")[1];
    if (!content || !wrapper) return;
    const measure = () => {
      footer.style.paddingBottom = `${content.getBoundingClientRect().height + 8}px`;
      ScrollTrigger.refresh();
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(content);
    cleanups.push(() => observer.disconnect());
    if (!reducedMotion) {
      gsap.to(footer.querySelector(".footer__svg-wrapper"), {
        xPercent: innerWidth >= 1024 ? -7 : -14,
        yPercent: innerWidth >= 1024 ? 0 : -40,
        rotation: -6,
        transformOrigin: "top left",
        ease: "power1.inOut",
        scrollTrigger: {
          trigger: wrapper,
          start: "top top",
          end: "max",
          scrub: true,
        },
      });
      gsap.fromTo(
        footer.querySelector(".footer__sticky-inner"),
        { yPercent: 15 },
        {
          yPercent: 0,
          ease: "none",
          scrollTrigger: {
            trigger: wrapper,
            start: "bottom bottom",
            end: "max",
            scrub: true,
          },
        },
      );
    }
    footer
      .querySelectorAll<HTMLElement>(".footer-col--mobile-acc")
      .forEach((col) => {
        const button = col.querySelector<HTMLElement>(".footer-col__title");
        const inner = col.querySelector<HTMLElement>(".footer-col__wrapper");
        if (!button || !inner) return;
        listen(button, "click", () => {
          if (innerWidth >= 1024) return;
          const open = col.classList.toggle("footer-col--mobile-acc-open");
          footer
            .querySelectorAll<HTMLElement>(".footer-col--mobile-acc")
            .forEach((other) => {
              if (other === col) return;
              other.classList.remove("footer-col--mobile-acc-open");
              gsap.to(other.querySelector(".footer-col__wrapper"), {
                height: 1,
                duration: 0.6,
                ease: "power2.out",
              });
            });
          gsap.to(inner, {
            height: open ? inner.scrollHeight : 0,
            duration: 0.6,
            ease: "power2.out",
            onComplete: measure,
          });
        });
      });
  });
  root.querySelectorAll<HTMLElement>(".module-slider").forEach((slider) => {
    const wrapper = slider.querySelector<HTMLElement>(
      ".module-slider__wrapper",
    );
    const inner = slider.querySelector<HTMLElement>(".module-slider__inner");
    if (!wrapper || !inner) return;
    let max = 0,
      current = 0,
      target = 0,
      down: number | null = null,
      last = 0;
    const measure = () => {
      slider.querySelectorAll<HTMLElement>(".sliders__fig").forEach((fig) => {
        const media = fig.querySelector<HTMLImageElement | HTMLVideoElement>(
          "img,video",
        );
        const w = Number(media?.getAttribute("width")),
          h = Number(media?.getAttribute("height"));
        if (w && h) fig.style.width = `${(w * wrapper.clientHeight) / h}px`;
      });
      max = Math.min(0, wrapper.clientWidth - inner.scrollWidth);
      current = target = last = 0;
    };
    const tick = () => {
      current += (target - current) * 0.15;
      gsap.set(inner, { x: current });
    };
    const end = () => {
      down = null;
      last = target;
      inner.classList.remove(
        "module-slider__inner--pointer-down",
        "module-slider__inner--dragging",
      );
    };
    listen(wrapper, "pointerdown", ((e: PointerEvent) => {
      down = e.clientX;
      last = target;
      wrapper.setPointerCapture(e.pointerId);
      inner.classList.add("module-slider__inner--pointer-down");
    }) as EventListener);
    listen(wrapper, "pointermove", ((e: PointerEvent) => {
      if (down === null) return;
      target = gsap.utils.clamp(max, 0, last + e.clientX - down);
      if (Math.abs(e.clientX - down) > 1)
        inner.classList.add("module-slider__inner--dragging");
    }) as EventListener);
    listen(wrapper, "pointerup", end);
    listen(wrapper, "pointercancel", end);
    listen(window, "resize", measure);
    measure();
    gsap.ticker.add(tick);
    cleanups.push(() => gsap.ticker.remove(tick));
  });
  root.querySelectorAll<HTMLElement>(".marquee").forEach((marquee) => {
    const inner = marquee.querySelector<HTMLElement>(".marquee__wrapper");
    if (!inner || reducedMotion) return;
    const tween = gsap.fromTo(
      inner,
      { xPercent: 0 },
      {
        xPercent: -25,
        duration: (inner.scrollWidth / marquee.clientWidth) * 5,
        ease: "none",
        repeat: -1,
      },
    );
    ScrollTrigger.create({
      trigger: marquee,
      start: "top bottom",
      end: "bottom top",
      onToggle: (self) => {
        if (self.isActive) tween.play();
        else tween.pause();
      },
    });
  });
  const podcastFig = root.querySelector(".podcast-episodes__fig-wrapper");
  if (podcastFig && !reducedMotion)
    gsap.fromTo(
      root.querySelectorAll(".podcast-episodes__fig-inner"),
      { yPercent: 20, xPercent: 10, rotation: -2 },
      {
        yPercent: 50,
        xPercent: 0,
        rotation: -4,
        ease: "none",
        scrollTrigger: {
          trigger: podcastFig,
          start: "clamp(top 90%)",
          end: "clamp(bottom top)",
          scrub: 0.5,
        },
      },
    );
  return () => cleanups.forEach((fn) => fn());
}
