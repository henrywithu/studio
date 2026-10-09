import { useLayoutEffect, useRef } from "react";
import { gsap, reducedMotion } from "../motion/engine";
export function Cursor() {
  const root = useRef<HTMLDivElement>(null),
    label = useRef<HTMLParagraphElement>(null),
    preview = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    if (!matchMedia("(hover: hover)").matches) return;
    const element = root.current!;
    const point = { x: innerWidth / 2, y: innerHeight / 2, rotation: 0 };
    const target = { ...point };
    let show = false;
    let hasRotation = false;
    let rotationRange = 10;
    const resize = () => {
      rotationRange = 30;
    };
    const tick = () => {
      point.x += (target.x - point.x) * (reducedMotion ? 1 : 0.1);
      point.y += (target.y - point.y) * (reducedMotion ? 1 : 0.1);
      point.rotation +=
        (((target.x / innerWidth) * 2 - 1) * rotationRange - point.rotation) *
        0.1;
      gsap.set(element, {
        x: point.x,
        y: point.y,
        rotation: hasRotation ? point.rotation : 0,
        force3D: true,
      });
    };
    gsap.ticker.add(tick);
    const move = (event: PointerEvent) => {
      target.x = event.clientX;
      target.y = event.clientY;
      const hit = (event.target as HTMLElement).closest<HTMLElement>(
        ".home-hero__wrapper,.home-featured-work-asset__fig-wrapper,.work-grid-item__fig,.player-alt__btn,.news-item__fig,.news-list-item__fig,.work-list-item,.podcast-list-item,.module-carousel__fig,.module-slider__wrapper,.case-hero__trigger,.shop__col,.carousel-cursor__btn",
      );
      const text =
        hit?.dataset.cursorLabel ||
        (hit?.matches(".home-hero__wrapper")
          ? "Scroll to explore"
          : hit?.matches(".player-alt__btn")
            ? "Play"
            : hit?.matches(".shop__col")
              ? "Visit shop"
              : hit?.matches(".case-hero__trigger")
                ? "View crew"
                : hit?.matches(".news-item__fig,.news-list-item__fig")
                  ? "Read article"
                  : hit?.matches(
                        ".module-carousel__fig,.module-slider__wrapper",
                      )
                    ? "Drag to explore"
                    : "View case study");
      const next = !!hit;
      hasRotation = !!hit?.matches(".carousel-cursor__btn");
      if (show !== next) {
        show = next;
        label.current!.classList.toggle("cursor-label--visible", show);
        element.classList.toggle("cursor--visible", show);
      }
      if (hit && label.current!.textContent !== text)
        label.current!.textContent = text;
      preview.current!.classList.toggle(
        "studio-cursor-preview--carousel",
        !!hit?.matches(".carousel-cursor__btn"),
      );
      if (
        hit?.matches(".work-list-item,.podcast-list-item,.carousel-cursor__btn")
      ) {
        const img = hit.dataset.preview
          ? Object.assign(new Image(), { src: hit.dataset.preview })
          : hit.querySelector("img") ||
            document.querySelector<HTMLImageElement>(
              `a[href="${hit.querySelector("a")?.getAttribute("href")}"] .work-grid-item__fig img`,
            );
        if (
          img &&
          preview.current?.dataset.src !== (img as HTMLImageElement).src
        ) {
          const nextImage = img.cloneNode(true) as HTMLImageElement;
          nextImage.loading = "eager";
          preview.current!.replaceChildren(nextImage);
          if (!reducedMotion && !hit.matches(".carousel-cursor__btn"))
            gsap.fromTo(
              nextImage,
              { opacity: 0, yPercent: 10, rotation: 2 },
              {
                opacity: 1,
                yPercent: 0,
                rotation: 0,
                duration: 0.4,
                ease: "expoOut",
              },
            );
          preview.current!.dataset.src = (img as HTMLImageElement).src;
        }
        preview.current!.style.display = img ? "block" : "none";
      } else preview.current!.style.display = "none";
    };
    const leave = () => {
      label.current!.classList.remove("cursor-label--visible");
      preview.current!.style.display = "none";
      element.classList.remove("cursor--visible");
      show = false;
    };
    window.addEventListener("pointermove", move);
    document.addEventListener("pointerleave", leave);
    window.addEventListener("resize", resize);
    return () => {
      gsap.ticker.remove(tick);
      window.removeEventListener("pointermove", move);
      document.removeEventListener("pointerleave", leave);
      window.removeEventListener("resize", resize);
    };
  }, []);
  return (
    <div ref={root} className="cursor" aria-hidden="true">
      <p ref={label} className="cursor-label slash-light p7 ttu fw440" />
      <div ref={preview} className="studio-cursor-preview" />
    </div>
  );
}
