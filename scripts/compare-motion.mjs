import { chromium } from "playwright";
import { readFile, writeFile, mkdir } from "node:fs/promises";
const pin = (await readFile("scripts/inspect-reference.mjs", "utf8")).match(
  /--ignore-certificate-errors-spki-list=([^']+)/,
)[1];
const browser = await chromium.launch({
  executablePath: "/usr/bin/chromium",
  args: [
    "--no-sandbox",
    "--disable-dev-shm-usage",
    "--ignore-certificate-errors-spki-list=" + pin,
  ],
  proxy: { server: process.env.HTTPS_PROXY, bypass: "localhost,127.0.0.1" },
});
const images = JSON.parse(
  await readFile("research/assets-manifest.json", "utf8"),
);
const sources = new Map(
  images.map((i) => {
    const u = new URL(i.url);
    u.searchParams.sort();
    return [u.href, i.path];
  }),
);
const jobs = [
  ["/", [1800, 2850, 5200, 7200]],
  ["/about", [2000]],
  ["/entertainment", [900]],
  ["/contact", [1300]],
  ["/blog", [1200]],
  ["/work/gorillaz-the-mountain-the-mooncave-and-the-sad-god", [1800]],
];
const report = [];
await mkdir("research/screenshots/motion", { recursive: true });
for (const [route, positions] of jobs.filter(
  ([route]) =>
    !process.env.MOTION_ROUTES ||
    process.env.MOTION_ROUTES.split(",").includes(route),
)) {
  const pair = { route };
  for (const [label, origin] of [
    ["reference", process.env.REFERENCE_ORIGIN || "http://localhost:5174"],
    ["studio", "http://localhost:5173"],
  ]) {
    const page = await browser.newPage({
      viewport: { width: 1440, height: 900 },
    });
    await page.route("**/*", async (r) => {
      if (r.request().resourceType() === "media") return r.abort();
      if (r.request().url().startsWith("https://www.datocms-assets.com/")) {
        const u = new URL(r.request().url());
        if (!u.pathname.endsWith(".svg")) u.searchParams.set("fm", "webp");
        u.searchParams.sort();
        const path = sources.get(u.href);
        if (path) return r.fulfill({ path });
      }
      return r.continue();
    });
    await page.goto(origin + route, { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(6000);
    pair[label] = [];
    for (const y of positions) {
      await page.evaluate((y) => window.scrollTo(0, y), y);
      await page.waitForTimeout(1600);
      const data = await page.evaluate(() => ({
        y: scrollY,
        height: document.documentElement.scrollHeight,
        layers: [
          ...document.querySelectorAll(
            ".home-hero__wrapper,.home-featured-work-asset__fig-wrapper,.home-featured-work-title,.home-about__header,.about-hero__fg-inner,.about-intro,.originals-hero__wrapper,.contact-hero__wrapper,.blog-featured-article__link,.case-hero__container",
          ),
        ].map((e) => ({
          class: e.className,
          transform: getComputedStyle(e).transform,
          top: Math.round(e.getBoundingClientRect().top),
        })),
      }));
      pair[label].push(data);
      await page.screenshot({
        path: `research/screenshots/motion/${route.slice(1).replaceAll("/", "__") || "home"}-${y}-${label}.png`,
      });
    }
    await page.close();
  }
  report.push(pair);
  console.log("motion", route);
  await writeFile(
    process.env.MOTION_REPORT || "research/browser/motion-comparison.json",
    JSON.stringify(report, null, 2),
  );
}
await browser.close();
