import { useLayoutEffect, useRef } from "react";
import { lenis, gsap } from "../motion/engine";
export function Scrollbar() {
  const ref = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    const handle = ref.current!;
    let dragging = false,
      offset = 0;
    const update = () => {
      const height = handle.getBoundingClientRect().height;
      gsap.set(handle, {
        y: lenis.progress * (innerHeight - height),
        force3D: true,
      });
    };
    lenis.on("scroll", update);
    window.addEventListener("resize", update);
    const transition = (event: Event) =>
      gsap.to(handle, {
        xPercent: (event as CustomEvent<boolean>).detail ? 110 : 0,
        duration: 1,
        ease: "expoOut",
      });
    window.addEventListener("studio:transition", transition);
    const down = (event: PointerEvent) => {
      dragging = true;
      offset = event.offsetY;
      handle.setPointerCapture(event.pointerId);
      event.preventDefault();
    };
    const move = (event: PointerEvent) => {
      if (dragging)
        lenis.scrollTo(
          ((event.clientY - offset) / (innerHeight - handle.offsetHeight)) *
            lenis.limit,
          { immediate: true },
        );
    };
    const up = () => {
      dragging = false;
    };
    handle.addEventListener("pointerdown", down);
    handle.addEventListener("pointermove", move);
    handle.addEventListener("pointerup", up);
    update();
    return () => {
      lenis.off("scroll", update);
      window.removeEventListener("resize", update);
      window.removeEventListener("studio:transition", transition);
      handle.removeEventListener("pointerdown", down);
      handle.removeEventListener("pointermove", move);
      handle.removeEventListener("pointerup", up);
    };
  }, []);
  return (
    <div className="scrollbar" aria-hidden="true">
      <div className="scrollbar__wrapper">
        <div ref={ref} className="scrollbar__handle" />
      </div>
    </div>
  );
}
