import { gsap, ScrollTrigger, reducedMotion, lenis } from "./engine";
import { MotionPathPlugin } from "gsap/MotionPathPlugin";
gsap.registerPlugin(MotionPathPlugin);
/** Additional original route-specific layers and hover geometry. */
export function setupPageMotion(root: HTMLElement) {
  const cleanups: (() => void)[] = [];
  const q = (s: string) => root.querySelector<HTMLElement>(s);
  const about = q(".about-hero");
  if (about) {
    about.classList.add("is-visible");
    if (!reducedMotion) {
      gsap
        .timeline({
          scrollTrigger: {
            trigger: ".about-hero-scroller",
            start: "top top",
            end: "bottom top-=100%",
            scrub: 0.5,
          },
        })
        .to(q(".about-hero__bg-inner"), { yPercent: -50, rotation: 8 }, 0)
        .to(
          q(".about-hero__fg-inner"),
          { yPercent: -60, xPercent: -2, rotation: -8 },
          0,
        );
      const intro = q(".about-intro");
      if (intro)
        gsap.fromTo(
          intro,
          { xPercent: 10, rotation: -8, transformOrigin: "right" },
          {
            xPercent: 0,
            rotation: 0,
            scrollTrigger: {
              trigger: intro,
              start: "top bottom",
              end: "top center",
              scrub: true,
            },
          },
        );
    }
  }
  const contact = q(".contact-hero");
  if (contact && !reducedMotion) {
    const wrapper = q(".contact-hero__wrapper"),
      foreground = root.querySelectorAll(".contact-hero__fg-inner"),
      fig = q(".contact-hero__fg-fig"),
      bg = q(".contact-hero__bg");
    const scrollMotion = () => {
      gsap
        .timeline({
          scrollTrigger: {
            trigger: contact,
            start: "top top",
            end: "bottom top",
            scrub: 0.5,
          },
        })
        .to(
          wrapper,
          {
            yPercent: -20,
            xPercent: 10,
            rotation: 8,
            transformOrigin: "top right",
            ease: "none",
          },
          0,
        )
        .to(
          fig,
          {
            yPercent: -40,
            xPercent: 10,
            rotation: 8,
            transformOrigin: "top left",
            ease: "none",
          },
          0,
        )
        .to(
          foreground,
          {
            yPercent: -50,
            rotation: 8,
            transformOrigin: "top left",
            ease: "none",
          },
          0,
        )
        .to(bg, { yPercent: -10, ease: "none" }, 0);
    };
    gsap
      .timeline({ delay: 0.5, onComplete: scrollMotion })
      .fromTo(
        wrapper,
        { yPercent: 100 },
        { yPercent: 0, duration: 1, clearProps: "all", ease: "expoOut" },
        0,
      )
      .fromTo(
        fig,
        {
          yPercent: 120,
          xPercent: -10,
          rotation: 6,
          transformOrigin: "top right",
        },
        {
          yPercent: 0,
          xPercent: 0,
          rotation: 0,
          duration: 1.3,
          clearProps: "all",
          ease: "expoOut",
        },
        0.2,
      )
      .fromTo(
        foreground,
        {
          yPercent: 120,
          xPercent: -20,
          rotation: 8,
          transformOrigin: "top left",
        },
        {
          yPercent: 0,
          xPercent: 0,
          rotation: 0,
          duration: 1,
          clearProps: "all",
          ease: "expoOut",
        },
        0.3,
      );
  }
  const caseFooter = q(".case-footer__wrapper");
  if (caseFooter && !reducedMotion)
    gsap.fromTo(
      caseFooter.querySelectorAll(".case-footer__content"),
      { rotation: -16, yPercent: 28, xPercent: -15 },
      {
        rotation: -8,
        yPercent: -10,
        xPercent: -8,
        transformOrigin: "top right",
        ease: "none",
        scrollTrigger: {
          trigger: caseFooter,
          start: "top bottom",
          end: "max",
          scrub: 0.5,
        },
      },
    );
  root.querySelectorAll<HTMLElement>(".case-hero").forEach((hero) => {
    if (reducedMotion) return;
    const sheet = hero.querySelectorAll(".case-hero__container"),
      fig = hero.querySelector(".case-hero__fig-wrapper");
    gsap
      .timeline({
        scrollTrigger: {
          trigger: hero,
          start: "top top",
          end: "bottom top",
          scrub: 0.5,
        },
      })
      .to(
        sheet,
        {
          yPercent: -30,
          xPercent: 15,
          rotation: 8,
          transformOrigin: "top right",
          ease: "none",
        },
        0,
      )
      .to(fig, { yPercent: -10, ease: "none" }, 0);
  });
  const entertainment = q(".originals-hero");
  if (entertainment && !reducedMotion) {
    const sheets = entertainment.querySelectorAll(".originals-hero__wrapper");
    const art = entertainment.querySelector("figure");
    const tl = gsap
      .timeline({
        scrollTrigger: {
          trigger: entertainment,
          start: "top top",
          end: "bottom top",
          scrub: 0.5,
        },
      })
      .to(
        sheets,
        {
          yPercent: -80,
          xPercent: -15,
          rotation: -8,
          transformOrigin: "top left",
          ease: "none",
        },
        0,
      );
    if (art)
      tl.to(
        art,
        innerWidth < 1024
          ? {
              yPercent: -20,
              rotation: -15,
              transformOrigin: "top left",
              ease: "none",
            }
          : {
              yPercent: -10,
              xPercent: 5,
              rotation: 2,
              transformOrigin: "top right",
              ease: "none",
            },
        0,
      );
  }
  const blog = q(".blog-featured-article");
  if (blog && !reducedMotion) {
    const link = blog.querySelector(".blog-featured-article__link");
    gsap
      .timeline({
        scrollTrigger: {
          trigger: blog,
          start: "top top+=1",
          end: "bottom top",
          scrub: true,
        },
      })
      .to(link, { yPercent: 60, xPercent: 10, rotation: 8, ease: "none" }, 0);
  }
  root.querySelectorAll<HTMLElement>(".case-hero").forEach((hero) => {
    const team = hero.querySelector<HTMLElement>(".case-hero-team");
    if (!team) return;
    const containers = hero.querySelectorAll(
      ".case-hero__acetate--main,.case-hero__content",
    );
    const clone = hero.querySelector(".case-hero__acetate--clone");
    let opened = false;
    const toggle = (open: boolean) => {
      if (open === opened) return;
      opened = open;
      hero.classList.toggle("case-hero--team-open", open);
      gsap.to(containers, {
        y: open ? -180 : 0,
        duration: 1,
        ease: "expoOut",
        clearProps: open ? "" : "transform",
      });
      gsap.to(clone, {
        yPercent: open ? -100 : 0,
        duration: 1,
        ease: "expoOut",
        clearProps: open ? "" : "transform",
      });
      if (open) {
        team.hidden = false;
        gsap.fromTo(
          team,
          { xPercent: 15, yPercent: 120, rotation: -10 },
          {
            xPercent: 0,
            yPercent: 0,
            rotation: 0,
            duration: 1,
            ease: "expoOut",
          },
        );
      } else
        gsap.to(team, {
          xPercent: 15,
          yPercent: 120,
          rotation: -10,
          duration: 1,
          ease: "expoOut",
          onComplete: () => {
            team.hidden = true;
          },
        });
    };
    const open = () => {
      if (lenis.scroll > 200) {
        lenis.scrollTo(0, { duration: 0.2 });
        gsap.delayedCall(0.2, () => toggle(true));
      } else toggle(true);
    };
    const close = (event?: Event) => {
      event?.stopPropagation();
      toggle(false);
    };
    hero
      .querySelectorAll(".case-hero__trigger,.case-hero-content__cta button")
      .forEach((button) => {
        button.addEventListener("click", open);
        cleanups.push(() => button.removeEventListener("click", open));
      });
    team.querySelector("button")?.addEventListener("click", close);
    cleanups.push(() =>
      team.querySelector("button")?.removeEventListener("click", close),
    );
    const scroll = () => {
      if (opened && lenis.scroll > 150) close();
    };
    lenis.on("scroll", scroll);
    cleanups.push(() => lenis.off("scroll", scroll));
  });
  const note = q(".director-note");
  const noteToggle = q(".director-note-toggle");
  if (note && noteToggle) {
    const hero = q(".case-study-hero"),
      footer = q(".case-footer");
    if (hero && footer)
      ScrollTrigger.create({
        trigger: hero,
        start: "bottom center",
        endTrigger: footer,
        end: "top bottom",
        onToggle: (self) =>
          noteToggle.classList.toggle(
            "director-note-toggle--visible",
            self.isActive,
          ),
      });
    const open = () => {
      note.hidden = false;
      gsap.fromTo(
        note,
        { xPercent: -15, yPercent: 115, rotation: 10 },
        { xPercent: 0, yPercent: 0, rotation: 0, duration: 1, ease: "expoOut" },
      );
      lenis.stop();
    };
    const close = () => {
      gsap.to(note, {
        xPercent: -15,
        yPercent: 115,
        rotation: 10,
        duration: 1,
        ease: "expoOut",
        onComplete: () => {
          note.hidden = true;
        },
      });
      lenis.start();
    };
    const button = noteToggle.querySelector("button");
    button?.addEventListener("click", open);
    cleanups.push(() => button?.removeEventListener("click", open));
    note
      .querySelectorAll(".director-note__btn,.director-note__close")
      .forEach((button) => {
        button.addEventListener("click", close);
        cleanups.push(() => button.removeEventListener("click", close));
      });
    const director = note.querySelector<HTMLButtonElement>("[data-director]");
    const filter = () => {
      location.href = "/work?director=" + director?.dataset.director;
    };
    director?.addEventListener("click", filter);
    cleanups.push(() => director?.removeEventListener("click", filter));
  }
  return () => cleanups.forEach((fn) => fn());
}
