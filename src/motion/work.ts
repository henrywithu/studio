import { gsap, lenis, ScrollTrigger, blink } from "./engine";
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
    currentFilter = "All",
    sortColumn = -1,
    direction = 1;
  const defaultRows = [...rows];
  list.style.display = "none";
  toggle.classList.add("work-layout-toggle--visible");
  const layoutButtons = Array.from(toggle.querySelectorAll("button"));
  const setLayout = (value: string) => {
    layout = value;
    work.classList.toggle("work--list-open", layout === "list");
    grid.style.display = layout === "grid" ? "block" : "none";
    list.style.display = layout === "list" ? "block" : "none";
    list.classList.toggle("work-list--visible", layout === "list");
    layoutButtons.forEach((b, i) => {
      b.classList.toggle(
        "button-pill--active",
        i === (layout === "grid" ? 0 : 1),
      );
      b.setAttribute("aria-pressed", String(i === (layout === "grid" ? 0 : 1)));
    });
    lenis.scrollTo(0, { immediate: true });
    ScrollTrigger.refresh();
  };
  layoutButtons.forEach((b, i) =>
    on(b, "click", () => setLayout(i === 0 ? "grid" : "list")),
  );
  setLayout("grid");
  const filterList = filter.querySelector<HTMLElement>(
    ".work-filters__list-wrapper",
  )!;
  const acetate = work.querySelector<HTMLElement>(".work-filters-acetate");
  if (acetate) acetate.style.display = "none";
  const closeFilters = () => {
    filterList.style.display = "none";
    if (acetate) acetate.style.display = "none";
    filter.classList.remove("work-filters--visible");
    work.classList.remove("work--filters-open");
    lenis.start();
  };
  on(filterToggle, "click", () => {
    const open = filter.classList.toggle("work-filters--visible");
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
          duration: 0.8,
          ease: "expoOut",
        },
      );
    lenis.scrollTo(0, { duration: 0.6 });
    if (open) gsap.delayedCall(0.6, () => lenis.stop());
    else lenis.start();
  });
  on(filter.querySelector(".button-close"), "click", closeFilters);
  const filterButtons = Array.from(
    work.querySelectorAll<HTMLElement>(".work-filter__btn"),
  );
  function applyFilter(label: string) {
    currentFilter = label;
    const visible = (el: HTMLElement) =>
      label === "All" || el.textContent?.includes(label);
    cards.forEach((card) => (card.style.display = visible(card) ? "" : "none"));
    rows.forEach((row) => (row.style.display = visible(row) ? "" : "none"));
    if (filterToggle) {
      const count = cards.filter(visible).length;
      filterToggle.firstChild!.textContent = label + " ";
      filterToggle.querySelector(".work-filter__count")!.textContent =
        `[${count}]`;
    }
    closeFilters();
    blink(grid);
    ScrollTrigger.refresh();
  }
  filterButtons.forEach((button) =>
    on(button, "click", () =>
      applyFilter(button.textContent?.replace(/\[.*\]/, "").trim() || "All"),
    ),
  );
  const sortButtons = work.querySelectorAll(".work-list-header__btn");
  sortButtons.forEach((button, column) =>
    on(button, "click", () => {
      direction = sortColumn === column ? -direction : 1;
      sortColumn = column;
      work.querySelector(".work-reset")?.classList.add("work-reset--visible");
      const field = [
        ".work-list-item__date",
        ".work-list-item__title",
        ".work-list-item__director",
        ".work-list-item__tags",
      ][column];
      const sorted = [...rows].sort(
        (a, b) =>
          direction *
          (a.querySelector(field)?.textContent || "").localeCompare(
            b.querySelector(field)?.textContent || "",
          ),
      );
      sorted.forEach((row) => row.parentElement!.appendChild(row));
      sortButtons.forEach((b) =>
        b.setAttribute(
          "aria-sort",
          b === button
            ? direction === 1
              ? "ascending"
              : "descending"
            : "none",
        ),
      );
      blink(list.querySelector("ul"));
    }),
  );
  ScrollTrigger.create({
    trigger: work,
    start: "top top-=200",
    endTrigger: root.querySelector(".footer"),
    end: "top bottom",
    onToggle: (self) =>
      work
        .querySelector(".work-back-to-top")
        ?.classList.toggle("work-back-to-top--visible", self.isActive),
  });
  on(work.querySelector(".work-reset button"), "click", () => {
    sortColumn = -1;
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
    cards.forEach(
      (card) =>
        (card.style.display = card.dataset.directors
          ?.split(" ")
          .includes(director)
          ? ""
          : "none"),
    );
    const hrefs = new Set(
      cards
        .filter((card) => card.style.display !== "none")
        .map((card) => card.querySelector("a")?.getAttribute("href")),
    );
    rows.forEach(
      (row) =>
        (row.style.display = hrefs.has(
          row.querySelector("a")?.getAttribute("href"),
        )
          ? ""
          : "none"),
    );
    work.querySelector(".work-reset")?.classList.add("work-reset--visible");
  }
  return () => {
    cleanup.forEach((fn) => fn());
    lenis.start();
  };
}
