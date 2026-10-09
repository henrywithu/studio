import { gsap, reducedMotion } from "./engine";
export function setupCarousels(root: HTMLElement) {
  const cleanup: (() => void)[] = [];
  root.querySelectorAll<HTMLElement>(".module-carousel").forEach((carousel) => {
    const slides = Array.from(
      carousel.querySelectorAll<HTMLElement>(".module-carousel__fig"),
    );
    const buttons = Array.from(
      carousel.querySelectorAll<HTMLElement>(".module-carousel-nav__nav-btn"),
    );
    const thumbs = Array.from(
      carousel.querySelectorAll<HTMLElement>(".module-carousel-aside__btn"),
    );
    const extras = carousel.querySelectorAll(".module-carousel-extra__item");
    let active = 0,
      dragX: number | null = null;
    if (!slides.length) return;
    const firstNav = buttons[0]?.closest("li");
    if (firstNav)
      gsap.set(carousel.querySelector(".module-carousel-nav__highlight"), {
        height: firstNav.getBoundingClientRect().height,
      });
    function select(index: number) {
      index = (index + slides.length) % slides.length;
      if (index === active) return;
      const old = slides[active];
      const next = slides[index];
      active = index;
      old.style.zIndex = "0";
      next.style.display = "block";
      next.style.zIndex = "1";
      gsap.fromTo(
        next,
        { xPercent: -20, yPercent: 100, rotation: 18 },
        {
          xPercent: 0,
          yPercent: 0,
          rotation: 0,
          duration: reducedMotion ? 0 : 1,
          ease: "expoOut",
        },
      );
      gsap.to(old, {
        xPercent: -5,
        yPercent: 100,
        rotation: -4,
        duration: reducedMotion ? 0 : 1,
        ease: "expoOut",
        onComplete: () => {
          old.style.display = "none";
          old.querySelector("video")?.pause();
        },
      });
      const video = next.querySelector("video");
      if (video?.dataset.src && !video.src) {
        video.src = (
          innerWidth < 1024 && video.dataset.srcSmall
            ? video.dataset.srcSmall
            : video.dataset.src
        )!;
        video.muted = true;
        video.closest(".base-video")?.classList.add("base-video--loaded");
      }
      void video?.play().catch(() => {});
      buttons.forEach((b, i) => {
        b.closest("li")?.classList.toggle(
          "module-carousel-nav__item--active",
          i === index,
        );
        b.setAttribute("aria-pressed", String(i === index));
      });
      gsap.set(carousel.querySelector(".module-carousel-nav__highlight"), {
        yPercent: 100 * index,
      });
      extras.forEach((extra, i) =>
        extra.classList.toggle(
          "module-carousel-extra__item--active",
          i === index,
        ),
      );
    }
    slides.forEach((slide, i) => {
      slide.style.display = i ? "none" : "block";
    });
    [buttons, thumbs].forEach((group) =>
      group.forEach((button, i) => {
        const fn = () => select(i);
        button.addEventListener("click", fn);
        cleanup.push(() => button.removeEventListener("click", fn));
      }),
    );
    const down = (e: PointerEvent) => {
      dragX = e.clientX;
    };
    const up = (e: PointerEvent) => {
      if (dragX === null) return;
      const distance = e.clientX - dragX;
      if (Math.abs(distance) > 30) select(active + (distance < 0 ? 1 : -1));
      dragX = null;
    };
    const area = carousel.querySelector<HTMLElement>(
      ".module-carousel__wrapper",
    )!;
    area.addEventListener("pointerdown", down);
    window.addEventListener("pointerup", up);
    cleanup.push(() => {
      area.removeEventListener("pointerdown", down);
      window.removeEventListener("pointerup", up);
    });
  });
  return () => cleanup.forEach((fn) => fn());
}

/** About page's directional image carousel and its original sheet transition geometry. */
export function setupCursorCarousels(root: HTMLElement) {
  const cleanup: (() => void)[] = [];
  root.querySelectorAll<HTMLElement>(".carousel-cursor").forEach((carousel) => {
    const slides = Array.from(
      carousel.querySelectorAll<HTMLElement>(".carousel-cursor__fig"),
    );
    const button = carousel.querySelector<HTMLButtonElement>(
      ".carousel-cursor__btn",
    );
    let active = 0,
      busy = false;
    if (!button) return;
    const previews: string[] = JSON.parse(carousel.dataset.previews || "[]");
    const updatePreview = (event: PointerEvent | MouseEvent) => {
      const previous = event.clientX < innerWidth / 2;
      button.dataset.cursorLabel = `${previous ? "previous" : "next"} / [${active + 1}/${slides.length}]`;
      button.dataset.preview =
        previews[
          (active + (previous ? -1 : 1) + slides.length) % slides.length
        ] || "";
    };
    button.addEventListener("pointermove", updatePreview);
    cleanup.push(() =>
      button.removeEventListener("pointermove", updatePreview),
    );
    const click = (event: MouseEvent) => {
      if (busy || slides.length < 2) return;
      busy = true;
      const previous = event.clientX < innerWidth / 2,
        old = slides[active];
      active = (active + (previous ? -1 : 1) + slides.length) % slides.length;
      const next = slides[active];
      next.style.display = "block";
      next.style.zIndex = "1";
      old.style.zIndex = "0";
      const offset = {
        xPercent: previous ? 110 : -110,
        yPercent: previous ? -40 : 30,
        rotation: previous ? 10 : -10,
      };
      gsap.fromTo(next, offset, {
        xPercent: 0,
        yPercent: 0,
        rotation: 0,
        duration: reducedMotion ? 0 : 1.4,
        ease: "expoOut",
        onComplete: () => {
          busy = false;
        },
      });
      gsap.to(old, {
        ...offset,
        duration: reducedMotion ? 0 : 1,
        ease: "carouselOut",
        onComplete: () => {
          old.style.display = "none";
        },
      });
      button.setAttribute(
        "aria-label",
        `${previous ? "Previous" : "Next"} image (${active + 1}/${slides.length})`,
      );
      updatePreview(event);
    };
    button.addEventListener("click", click);
    cleanup.push(() => button.removeEventListener("click", click));
  });
  return () => cleanup.forEach((fn) => fn());
}
