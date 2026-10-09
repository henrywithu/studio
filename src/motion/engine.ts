import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { CustomEase } from "gsap/CustomEase";
import Lenis from "lenis";
gsap.registerPlugin(ScrollTrigger, CustomEase);
CustomEase.create("expoOut", "0.19,1,0.22,1");
CustomEase.create("pageOut", "0.44,0.14,0.28,1");
CustomEase.create("carouselOut", "1,0,0.25,0.995");
CustomEase.create("filterOut", "0.14,1,0.34,1");
gsap.defaults({ ease: "power2.out" });
export const reducedMotion = window.matchMedia(
  "(prefers-reduced-motion: reduce)",
).matches;
export const lenis = new Lenis({ lerp: 0.2, autoRaf: false });
lenis.on("scroll", ScrollTrigger.update);
const tick = (time: number) => lenis.raf(time * 1000);
gsap.ticker.add(tick);
if (import.meta.hot)
  import.meta.hot.dispose(() => {
    gsap.ticker.remove(tick);
    lenis.destroy();
  });
gsap.ticker.lagSmoothing(0);
export function blink(target: gsap.TweenTarget, out = false) {
  const tl = gsap
    .timeline()
    .set(target, { opacity: 0 }, 0)
    .set(target, { opacity: 1 }, 0.09);
  return out
    ? tl.set(target, { opacity: 0 }, 0.15)
    : tl.set(target, { opacity: 0 }, 0.15).set(target, { opacity: 1 }, 0.21);
}
export { gsap, ScrollTrigger };
