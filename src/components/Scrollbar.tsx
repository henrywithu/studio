import { useLayoutEffect, useRef } from "react";
import { lenis } from "../motion/engine";
export function Scrollbar() {
  const ref = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    const handle = ref.current!;
    let dragging = false,
      offset = 0;
    const update = () => {
      const height = Math.max(
        (innerHeight * innerHeight) / document.documentElement.scrollHeight,
        innerWidth * 0.046296,
      );
      handle.style.height = height + "px";
      handle.style.transform = `translateY(${lenis.progress * (innerHeight - height)}px)`;
    };
    lenis.on("scroll", update);
    window.addEventListener("resize", update);
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
