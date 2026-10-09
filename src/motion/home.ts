import { gsap, ScrollTrigger, reducedMotion } from "./engine";
/** Transforms and trigger ranges transcribed from the inspected home module. */
export function setupHome(root: HTMLElement) {
  root.querySelector(".home-hero")?.classList.add("home-hero--preloader-done");
  root
    .querySelector(".home-hero__fig")
    ?.classList.add("home-hero__fig--visible");
  if (reducedMotion) return;
  const q = (s: string) => root.querySelector<HTMLElement>(s);
  const hero = q(".home-hero"),
    layer = q(".home-hero__layer"),
    wordmark = q(".home-hero__wrapper"),
    intro = q(".home-intro"),
    introWrapper = q(".home-intro__wrapper");
  if (hero && layer && wordmark) {
    gsap
      .timeline({
        scrollTrigger: {
          trigger: layer,
          start: "top top+=1",
          end: "bottom top",
          scrub: true,
        },
      })
      .to(
        [layer, wordmark],
        {
          xPercent: -10,
          rotation: -15,
          transformOrigin: "bottom left",
          ease: "power1.in",
        },
        0,
      );
    ScrollTrigger.create({
      trigger: ".home-featured-work",
      start: "top top",
      onEnter: () => (hero.style.visibility = "hidden"),
      onLeaveBack: () => (hero.style.visibility = "visible"),
    });
  }
  if (intro && introWrapper) {
    gsap
      .timeline({
        scrollTrigger: {
          trigger: intro,
          start: "top bottom",
          end: "top center",
          scrub: true,
        },
      })
      .fromTo(
        introWrapper,
        { xPercent: -10, rotation: 8, transformOrigin: "left" },
        { xPercent: 0, rotation: 0 },
        0,
      );
    gsap
      .timeline({
        scrollTrigger: {
          trigger: intro,
          start: "top 35%",
          end: "bottom top-=50%",
          scrub: true,
        },
      })
      .to(
        intro,
        {
          xPercent: -10,
          rotation: -4,
          yPercent: 5,
          transformOrigin: "right",
          ease: "power1.out",
        },
        0,
      );
  }
  const scrollers = root.querySelectorAll(".home-featured-work__scroller");
  const items = root.querySelectorAll<HTMLElement>(".home-featured-work-asset");
  items.forEach((item, i) => {
    const scroller = scrollers[i],
      sheet = item.querySelector(".home-featured-work-asset__wrapper"),
      fig = item.querySelector(".home-featured-work-asset__fig-wrapper");
    if (!scroller || !sheet || !fig) return;
    const last = i === items.length - 1;
    ScrollTrigger.create({
      trigger: scroller,
      start: i === 0 ? "top bottom" : "top 55%",
      end: "bottom top",
      onToggle: (self) =>
        item.classList.toggle(
          "home-featured-work-asset--active",
          self.isActive,
        ),
    });
    gsap
      .timeline({
        scrollTrigger: {
          trigger: scroller,
          start: "top bottom",
          end: "top top",
          scrub: true,
        },
      })
      .fromTo(
        sheet,
        {
          yPercent: 110,
          xPercent: 15,
          rotation: 15,
          transformOrigin: "top left",
        },
        { yPercent: 0, xPercent: 0, rotation: 0, force3D: true, ease: "none" },
        0,
      )
      .fromTo(
        fig,
        { yPercent: 130, xPercent: 20, rotation: 15 },
        { yPercent: 0, xPercent: 0, rotation: 0, force3D: true, ease: "none" },
        0.06,
      );
    gsap
      .timeline({
        scrollTrigger: {
          trigger: scroller,
          start: "top top+=1",
          end: "bottom top",
          scrub: true,
        },
      })
      .to(
        sheet,
        {
          yPercent: last ? 50 : -80,
          xPercent: last ? -10 : -25,
          rotation: last ? -3 : -7,
          force3D: true,
          ease: "none",
        },
        0,
      )
      .to(
        fig,
        {
          yPercent: last ? 40 : -50,
          xPercent: last ? -2.5 : -5,
          rotation: last ? -2 : -5,
          force3D: true,
          ease: "none",
        },
        0,
      );
  });
  const about = q(".home-about"),
    heading = q(".home-about__header-wrapper"),
    figs = q(".home-about__figs");
  const photos = root.querySelectorAll(".home-about__fig");
  if (about && heading)
    gsap
      .timeline({
        scrollTrigger: {
          trigger: about,
          start: "top bottom",
          end: "top center",
          scrub: true,
        },
      })
      .fromTo(
        heading,
        { xPercent: -20, yPercent: 20, rotation: 16, transformOrigin: "left" },
        { xPercent: 0, yPercent: 0, rotation: 0 },
        0,
      );
  if (figs && photos.length > 1)
    gsap
      .timeline({
        scrollTrigger: {
          trigger: figs,
          start: "top 102%",
          end: "top 15%",
          scrub: true,
        },
      })
      .fromTo(
        photos[0],
        { xPercent: -45, yPercent: 20, rotation: 4.89 },
        { xPercent: 0, yPercent: 0, rotation: 0, ease: "power1.inOut" },
        0,
      )
      .fromTo(
        photos[photos.length - 1],
        { xPercent: 25, yPercent: 0, rotation: 8 },
        { xPercent: 45, yPercent: -10, rotation: 4.89, ease: "power1.inOut" },
        0,
      );
  const clients = q(".home-clients");
  if (clients)
    ScrollTrigger.create({
      trigger: clients,
      start: "top 90%",
      once: true,
      onEnter: () => {
        gsap.to(clients.querySelectorAll("i"), {
          opacity: 1,
          stagger: 0.05,
          duration: 0,
        });
        gsap.to(clients.querySelectorAll(".home-client__wrapper"), {
          opacity: 1,
          stagger: 0.03,
          duration: 0,
          delay: 0.2,
        });
      },
    });
}
