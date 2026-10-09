import { gsap, lenis, ScrollTrigger, blink, reducedMotion } from "./engine";
export function setupControls(root: HTMLElement) {
  const cleanups: (() => void)[] = [];
  const listen = (
    element: Element | null,
    event: string,
    fn: EventListener,
  ) => {
    element?.addEventListener(event, fn);
    cleanups.push(() => element?.removeEventListener(event, fn));
  };
  root
    .querySelectorAll(".back-to-top,.work-back-to-top button")
    .forEach((button) =>
      listen(button, "click", () => lenis.scrollTo(0, { duration: 0.8 })),
    );
  const accordions = Array.from(
    root.querySelectorAll<HTMLElement>(".accordion"),
  );
  const setAccordion = (item: HTMLElement, open: boolean, animate = true) => {
    const content = item.querySelector<HTMLElement>(".accordion__content");
    if (!content) return;
    item.classList.toggle("accordion--open", open);
    item.querySelector("button")?.setAttribute("aria-expanded", String(open));
    gsap.to(content, {
      height: open
        ? content.querySelector<HTMLElement>(".accordion__wrapper")
            ?.scrollHeight || content.scrollHeight
        : 1,
      duration: animate && !reducedMotion ? 0.6 : 0,
      ease: "power2.out",
      onComplete: () => {
        if (open) content.style.height = "auto";
        ScrollTrigger.refresh();
      },
    });
  };
  accordions.forEach((item, i) => {
    const button = item.querySelector("button");
    const content = item.querySelector<HTMLElement>(".accordion__content");
    if (!button || !content) return;
    content.id = "accordion-" + i;
    button.setAttribute("aria-controls", content.id);
    button.setAttribute(
      "aria-label",
      item.querySelector(".accordion__title")?.textContent || "Expand answer",
    );
    setAccordion(item, i === 0, false);
    listen(button, "click", () => {
      const open = !item.classList.contains("accordion--open");
      accordions.forEach((other) =>
        setAccordion(other, other === item && open),
      );
      blink(item.querySelector(".accordion__id"));
    });
  });
  root.querySelectorAll<HTMLElement>(".footer").forEach((footer) => {
    const credits = footer.querySelector<HTMLElement>(".footer-credits");
    if (!credits) return;
    gsap.set(credits, {
      yPercent: 110,
      rotation: 8,
      transformOrigin: "bottom left",
    });
    const close = () => {
      gsap.to(credits, {
        yPercent: 110,
        rotation: 8,
        duration: 0.8,
        ease: "pageOut",
      });
    };
    listen(footer.querySelector(".footer__credits"), "click", () => {
      lenis.scrollTo("bottom", { duration: 0.8 });
      gsap.to(credits, {
        yPercent: 0,
        rotation: 0,
        duration: 0.8,
        delay: 0.82,
        ease: "expoOut",
      });
      blink(credits.querySelector(".footer-credits__copy"));
    });
    listen(credits.querySelector("button"), "click", close);
    listen(window as unknown as Element, "keydown", ((e: KeyboardEvent) => {
      if (e.key === "Escape") close();
    }) as EventListener);
  });
  root.querySelectorAll<HTMLElement>(".player-alt").forEach((player) => {
    const button = player.querySelector(".player-alt__btn");
    const video = player.querySelector<HTMLVideoElement>(
      ".player-alt__video video",
    );
    const iframe = player.querySelector<HTMLIFrameElement>(
      ".player-alt__video iframe",
    );
    const close = () => {
      player.classList.remove("player-alt--open");
      player
        .querySelectorAll(".player-alt__content-wrapper")
        .forEach((e) =>
          e.classList.remove("player-alt__content-wrapper--scaled"),
        );
      video?.pause();
      if (iframe?.dataset.originalSrc) iframe.src = iframe.dataset.originalSrc;
    };
    listen(button, "mousedown", () =>
      player
        .querySelectorAll(".player-alt__content-wrapper")
        .forEach((e) => e.classList.add("player-alt__content-wrapper--scaled")),
    );
    listen(button, "click", () => {
      player.classList.add("player-alt--open");
      if (video?.dataset.src) {
        video.src = video.dataset.src;
        video.muted = false;
        video.controls = true;
        video.loop = false;
        video.closest(".base-video")?.classList.add("base-video--loaded");
        void video.play().catch(() => {});
      }
      if (iframe) {
        iframe.dataset.originalSrc = iframe.src;
        iframe.src += (iframe.src.includes("?") ? "&" : "?") + "autoplay=1";
      }
      button?.setAttribute("aria-label", "Video playing");
    });
    listen(window as unknown as Element, "keydown", ((e: KeyboardEvent) => {
      if (e.key === "Escape") close();
    }) as EventListener);
    if (video) listen(video, "ended", close);
  });
  root
    .querySelectorAll(
      ".originals-hero__btn,.contact-hero__btn,.case-hero-content__arrow",
    )
    .forEach((button) =>
      listen(button, "click", () => {
        const target = root.querySelector(
          ".originals-intro,.contact-details,.case-intro",
        );
        if (target) lenis.scrollTo(target as HTMLElement, { duration: 1 });
      }),
    );
  // Original preview recordings with independent equalizer animation and one active sound.
  let active: HTMLAudioElement | null = null;
  const sounds: HTMLAudioElement[] = [];
  root
    .querySelectorAll<HTMLElement>(".sound-equalizer__btn[data-audio]")
    .forEach((button) => {
      const audio = new Audio(button.dataset.audio);
      audio.preload = "none";
      audio.volume = 0.5;
      sounds.push(audio);
      const row = button.closest(".podcast-list-item");
      const bars = button.parentElement!.querySelectorAll(
        ".sound-equalizer__bar",
      );
      let tl: gsap.core.Timeline | null = null;
      const stop = () => {
        audio.pause();
        tl?.kill();
        gsap.set(bars, { scaleY: 0 });
        row?.classList.remove("podcast-list-item--playing");
        button.setAttribute("aria-pressed", "false");
      };
      listen(button, "click", () => {
        if (!audio.paused) {
          stop();
          return;
        }
        active?.pause();
        root
          .querySelectorAll(".podcast-list-item--playing")
          .forEach((el) => el.classList.remove("podcast-list-item--playing"));
        active = audio;
        void audio
          .play()
          .then(() => {
            row?.classList.add("podcast-list-item--playing");
            button.setAttribute("aria-pressed", "true");
            tl = gsap.timeline({ repeat: -1, repeatRefresh: true });
            bars.forEach((bar, i) => {
              tl!.to(
                bar,
                {
                  scaleY: () => gsap.utils.random(0.1, 1),
                  duration: 0.5,
                  repeat: 1,
                  yoyo: true,
                  ease: "power2.out",
                },
                i * 0.025,
              );
            });
          })
          .catch(() => stop());
      });
      audio.addEventListener("ended", stop);
      audio.addEventListener("pause", stop);
      cleanups.push(() => {
        stop();
        audio.src = "";
      });
    });
  return () => {
    active?.pause();
    sounds.forEach((sound) => sound.pause());
    cleanups.forEach((fn) => fn());
  };
}
