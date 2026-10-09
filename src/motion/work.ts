import { gsap, lenis, ScrollTrigger, blink, reducedMotion } from "./engine";
export function setupWork(root: HTMLElement) {
  const work = root.querySelector<HTMLElement>(".work");
  if (!work) return () => {};
  const cleanup: (() => void)[] = [];
  const on = (e: Element | null, event: string, fn: EventListener) => {
    e?.addEventListener(event, fn);
    cleanup.push(() => e?.removeEventListener(event, fn));
  };
  const grid = work.querySelector<HTMLElement>(".work-grid-wrapper")!;
  const list = work.querySelector<HTMLElement>(".work-list")!;
  const toggle = work.querySelector<HTMLElement>(".work-layout-toggle")!;
  const filter = work.querySelector<HTMLElement>(".work-filters")!;
  const filterToggle = work.querySelector<HTMLElement>(
    ".work-filters__toggle",
  )!;
  const cards = Array.from(
    work.querySelectorAll<HTMLElement>(".work-grid-item"),
  );
  const rows = Array.from(
    work.querySelectorAll<HTMLElement>(".work-list-item"),
  );
  let layout = "grid",
    sortColumn = -1,
    direction = 0;
  const defaultRows = [...rows];
  list.style.display = "none";
  toggle.classList.remove("work-layout-toggle--visible");
  let directorQuery = !!new URLSearchParams(location.search).get("director");
  const layoutButtons = Array.from(toggle.querySelectorAll("button"));
  let switching = false;
  const setLayout = (value: string, animate = true) => {
    if (switching || (value === layout && animate)) return;
    const old = layout === "grid" ? grid : list;
    const next = value === "grid" ? grid : list;
    layout = value;
    work.classList.toggle("work--list-open", layout === "list");
    if (animate && !reducedMotion) {
      switching = true;
      next.style.display = "block";
      gsap.set(next, {
        position: "absolute",
        top: 0,
        left: 0,
        width: "100%",
        zIndex: 10,
      });
      gsap.fromTo(
        next,
        { xPercent: 20, y: innerHeight * 1.2, rotation: 8 },
        {
          xPercent: 0,
          y: 0,
          rotation: 0,
          duration: 0.8,
          delay: 0.6,
          ease: "filterOut",
          onComplete: () => {
            old.style.display = "none";
            gsap.set(next, {
              clearProps: "position,top,left,width,zIndex,transform",
            });
            switching = false;
            ScrollTrigger.refresh();
          },
        },
      );
    } else {
      grid.style.display = layout === "grid" ? "block" : "none";
      list.style.display = layout === "list" ? "block" : "none";
    }
    list.classList.toggle("work-list--visible", layout === "list");
    layoutButtons.forEach((b, i) => {
      b.classList.toggle(
        "button-pill--active",
        i === (layout === "grid" ? 0 : 1),
      );
      b.setAttribute("aria-pressed", String(i === (layout === "grid" ? 0 : 1)));
    });
    lenis.scrollTo(0, { immediate: !animate, duration: 0.6 });
    ScrollTrigger.refresh();
  };
  layoutButtons.forEach((b, i) =>
    on(b, "click", () => setLayout(i === 0 ? "grid" : "list")),
  );
  setLayout("grid", false);
  const filterList = filter.querySelector<HTMLElement>(
    ".work-filters__list-wrapper",
  )!;
  const acetate = work.querySelector<HTMLElement>(".work-filters-acetate");
  if (acetate) acetate.style.display = "none";
  let stopDelay: gsap.core.Tween | null = null;
  const closeFilters = () => {
    stopDelay?.kill();
    gsap.killTweensOf(filterList);
    gsap.to(filterList, {
      xPercent: innerWidth < 1024 ? -50 : -10,
      yPercent: 115,
      rotation: 8,
      duration: reducedMotion ? 0 : 0.8,
      ease: "filterOut",
      onComplete: () => {
        filterList.style.display = "none";
      },
    });
    if (acetate) acetate.style.display = "none";
    filter.classList.remove("work-filters--visible");
    work.classList.remove("work--filters-open");
    lenis.start();
  };
  on(filterToggle, "click", () => {
    if (filter.classList.contains("work-filters--visible")) {
      closeFilters();
      return;
    }
    const open = true;
    gsap.killTweensOf(filterList);
    filter.classList.add("work-filters--visible");
    work.classList.toggle("work--filters-open", open);
    filterList.style.display = open ? "block" : "none";
    if (acetate) acetate.style.display = open ? "block" : "none";
    if (open)
      gsap.fromTo(
        filterList,
        { xPercent: innerWidth < 1024 ? -50 : -10, yPercent: 115, rotation: 8 },
        {
          xPercent: 0,
          yPercent: 0,
          rotation: 0,
          duration: reducedMotion ? 0 : 0.8,
          ease: "filterOut",
        },
      );
    lenis.scrollTo(0, { duration: 0.6 });
    if (open) stopDelay = gsap.delayedCall(0.6, () => lenis.stop());
    else lenis.start();
  });
  on(filter.querySelector(".button-close"), "click", closeFilters);
  const filterButtons = Array.from(
    work.querySelectorAll<HTMLElement>(".work-filter__btn"),
  );
  const columns = [5, 4, 3, 3, 3, 9, 4, 5, 3, 3, 3, 9];
  const sizes = [
    "Medium",
    "Small",
    "ExtraSmall",
    "ExtraSmall",
    "ExtraSmall",
    "Big",
    "Small",
    "Medium",
    "ExtraSmall",
    "ExtraSmall",
    "ExtraSmall",
    "Big",
  ];
  function applyFilter(label: string) {
    let index = 0;
    cards.forEach((card) => {
      const visible =
        label === "All" ||
        JSON.parse(card.dataset.tags || "[]").includes(label);
      card.style.display = visible ? "" : "none";
      if (!visible) return;
      const column = columns[index % columns.length];
      card.className = card.className.replace(
        /work-grid-item--col-\d+/,
        `work-grid-item--col-${column}`,
      );
      const asset = JSON.parse(card.dataset.thumbnails || "{}")[
        sizes[index++ % sizes.length]
      ];
      if (asset) {
        const image = card.querySelector<HTMLImageElement>(
          ".work-grid-item__fig img",
        );
        const video = card.querySelector<HTMLVideoElement>(
          ".work-grid-item__fig video",
        );
        if (image && !asset.video) {
          for (const [key, value] of Object.entries(asset))
            image.setAttribute(key, String(value));
        } else if (video && asset.video) {
          video.dataset.src = asset.src;
          video.dataset.srcSmall = asset.small || asset.src;
          video.src = innerWidth < 1024 ? video.dataset.srcSmall : asset.src;
          void video.play().catch(() => {});
        }
      }
    });
    const selected = filterButtons.find(
      (button) => button.childNodes[0]?.textContent?.trim() === label,
    );
    if (selected) {
      filterToggle.firstChild!.textContent = label + " ";
      filterToggle.querySelector(".work-filter__count")!.textContent =
        selected.querySelector(".work-filter__count")!.textContent;
      const all = filterButtons[0].closest("li")!;
      const selectedRow = selected.closest("li")!;
      const parent = selectedRow.parentElement!;
      parent.prepend(all);
      parent.prepend(selectedRow);
      const items = Array.from(parent.children);
      items.forEach((item, i) => {
        let slash = item.querySelector(".work-filter__slash");
        if (i === items.length - 1) slash?.remove();
        else if (!slash) {
          slash = document.createElement("em");
          slash.className = "work-filter__slash h1";
          slash.textContent = "/";
          item.append(slash);
        }
      });
    }
    closeFilters();
    blink(grid);
    ScrollTrigger.refresh();
  }
  filterButtons.forEach((button) =>
    on(button, "click", () =>
      applyFilter(button.childNodes[0]?.textContent?.trim() || "All"),
    ),
  );
  const sortButtons = work.querySelectorAll(".work-list-header__btn");
  sortButtons.forEach((button, column) =>
    on(button, "click", () => {
      direction =
        sortColumn === column && direction === 1 ? -1 : direction === 0 ? 1 : 0;
      sortColumn = direction === 0 ? -1 : column;
      history.replaceState({}, "", "/work");
      const field = (row: HTMLElement): string => {
        if (column === 0) return row.dataset.sortDate || "";
        if (column === 1) return row.dataset.sortTitle || "";
        const values: string[] = JSON.parse(
          (column === 2 ? row.dataset.sortDirectors : row.dataset.sortTags) ||
            "[]",
        );
        return (direction === 1 ? values[0] : values.at(-1)) || "";
      };
      const sorted =
        direction === 0
          ? defaultRows
          : [...rows].sort(
              (a, b) =>
                direction *
                (column === 0 ? -1 : 1) *
                (field(a) === field(b) ? 0 : field(a) < field(b) ? -1 : 1),
            );
      sorted.forEach((row) => row.parentElement!.appendChild(row));
      rows.forEach((row) => {
        const names: string[] = JSON.parse(row.dataset.sortDirectors || "[]");
        if (column === 2 && direction === -1) names.reverse();
        const target = row.querySelector(".work-list-item__director");
        if (target)
          target.replaceChildren(
            ...names.flatMap((name, i) => {
              if (!i) return [document.createTextNode(name)];
              const slash = document.createElement("em");
              slash.textContent = " / ";
              return [slash, document.createTextNode(name)];
            }),
          );
      });
      sortButtons.forEach((b) => {
        b.querySelectorAll<SVGElement>(".filter-status__svg").forEach(
          (svg, i) => {
            svg.style.display =
              direction === 0 ||
              (b === button && i === (direction === 1 ? 0 : 1))
                ? ""
                : "none";
          },
        );
        b.setAttribute(
          "aria-sort",
          direction === 0
            ? "none"
            : b === button
              ? direction === 1
                ? "ascending"
                : "descending"
              : "none",
        );
      });
      blink(list.querySelector("ul"));
    }),
  );
  ScrollTrigger.create({
    trigger: work,
    start: "top top-=200",
    endTrigger: root.querySelector(".footer"),
    end: "top bottom",
    onToggle: (self) => {
      if (directorQuery) return;
      toggle.classList.toggle("work-layout-toggle--visible", self.isActive);
      work
        .querySelector(".work-back-to-top")
        ?.classList.toggle("work-back-to-top--visible", self.isActive);
    },
  });
  on(work.querySelector(".work-reset button"), "click", () => {
    sortColumn = -1;
    direction = 0;
    directorQuery = false;
    history.replaceState({}, "", "/work");
    sortButtons.forEach((b) => {
      b.setAttribute("aria-sort", "none");
      b.querySelectorAll<SVGElement>(".filter-status__svg").forEach(
        (svg) => (svg.style.display = ""),
      );
    });
    work.querySelector(".work-reset")?.classList.remove("work-reset--visible");
    defaultRows.forEach((row) => row.parentElement!.appendChild(row));
    applyFilter("All");
  });
  const hover = (e: Event) => {
    const row = e.currentTarget as HTMLElement;
    const highlight = work!.querySelector(".work-list__highlight");
    gsap.set(highlight, { y: row.offsetTop });
  };
  rows.forEach((row) => {
    on(row, "mouseenter", hover);
  });
  on(window as unknown as Element, "keydown", ((event: KeyboardEvent) => {
    if (event.key === "Escape") closeFilters();
  }) as EventListener);
  const director = new URLSearchParams(location.search).get("director");
  if (director) {
    const preferred = new Set(
      cards
        .filter((card) => card.dataset.directors?.split(" ").includes(director))
        .map((card) => card.querySelector("a")?.getAttribute("href")),
    );
    [...rows]
      .sort(
        (a, b) =>
          Number(preferred.has(b.querySelector("a")?.getAttribute("href"))) -
          Number(preferred.has(a.querySelector("a")?.getAttribute("href"))),
      )
      .forEach((row) => row.parentElement!.append(row));
    setLayout("list", false);
    toggle.classList.remove("work-layout-toggle--visible");
    work.querySelector(".work-reset")?.classList.add("work-reset--visible");
    sortButtons.forEach((b, i) =>
      b
        .querySelectorAll<SVGElement>(".filter-status__svg")
        .forEach(
          (svg, j) => (svg.style.display = i === 2 && j === 1 ? "" : "none"),
        ),
    );
  }
  return () => {
    stopDelay?.kill();
    gsap.killTweensOf([filterList, grid, list]);
    cleanup.forEach((fn) => fn());
    lenis.start();
  };
}
