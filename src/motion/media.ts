import { ScrollTrigger } from "./engine";
/** Original lazy loading and 1024px source selection; video is loaded near its viewport. */
export function setupMedia(root: HTMLElement) {
  const videos = Array.from(
    root.querySelectorAll<HTMLVideoElement>("video[data-src]"),
  );
  const loaded = new Set<HTMLVideoElement>();
  function load(video: HTMLVideoElement) {
    if (loaded.has(video) || video.closest(".player-alt__video")) return;
    loaded.add(video);
    video.src = (
      innerWidth < 1024 && video.dataset.srcSmall
        ? video.dataset.srcSmall
        : video.dataset.src
    )!;
    video.muted = true;
    video.addEventListener(
      "canplay",
      () => {
        video.closest(".base-video")?.classList.add("base-video--loaded");
        if (video.autoplay || video.closest(".home-featured-work"))
          void video.play().catch(() => {});
      },
      { once: true },
    );
    video.load();
  }
  const lazy = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (entry.isIntersecting) load(entry.target as HTMLVideoElement);
      }
    },
    { rootMargin: "200% 0px" },
  );
  const visibility = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        const video = entry.target as HTMLVideoElement;
        if (!loaded.has(video)) continue;
        if (entry.isIntersecting) {
          if (video.loop) void video.play().catch(() => {});
        } else video.pause();
      }
    },
    { rootMargin: "0px" },
  );
  videos.forEach((video) => {
    lazy.observe(video);
    visibility.observe(video);
  });
  const refresh = () => ScrollTrigger.refresh();
  root
    .querySelectorAll("img")
    .forEach((img) => img.addEventListener("load", refresh, { once: true }));
  const resize = () => {
    for (const video of loaded) {
      const next = (
        innerWidth < 1024 && video.dataset.srcSmall
          ? video.dataset.srcSmall
          : video.dataset.src
      )!;
      if (video.getAttribute("src") !== next) {
        video.src = next;
        video.load();
      }
    }
  };
  window.addEventListener("resize", resize);
  return () => {
    lazy.disconnect();
    visibility.disconnect();
    window.removeEventListener("resize", resize);
    root
      .querySelectorAll("img")
      .forEach((img) => img.removeEventListener("load", refresh));
    videos.forEach((video) => {
      video.pause();
      video.removeAttribute("src");
      video.load();
    });
  };
}
