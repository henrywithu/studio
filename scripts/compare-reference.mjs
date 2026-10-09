import { chromium } from "playwright";
import { readFile, writeFile, mkdir } from "node:fs/promises";
const pin = (await readFile("scripts/inspect-reference.mjs", "utf8")).match(
  /--ignore-certificate-errors-spki-list=([^']+)/,
)[1];
const browser = await chromium.launch({
  executablePath: "/usr/bin/chromium",
  headless: true,
  args: [
    "--no-sandbox",
    "--disable-dev-shm-usage",
    "--ignore-certificate-errors-spki-list=" + pin,
  ],
  proxy: { server: process.env.HTTPS_PROXY, bypass: "localhost,127.0.0.1" },
});
const jobs = (
  process.env.COMPARE_ROUTES?.split(",") || [
    "/",
    "/work",
    "/about",
    "/entertainment",
    "/blog",
    "/contact",
    "/work/gorillaz-the-mountain-the-mooncave-and-the-sad-god",
  ]
).flatMap((route) => [1440, 390].map((width) => ({ route, width })));
const results = [];
let index = 0;
await mkdir("research/screenshots/comparison", { recursive: true });
await Promise.all(
  Array.from({ length: 1 }, async () => {
    while (index < jobs.length) {
      const job = jobs[index++],
        name =
          (job.route.slice(1).replaceAll("/", "__") || "home") +
          "-" +
          job.width;
      const pair = { ...job };
      for (const origin of [
        process.env.REFERENCE_ORIGIN || "https://thelinestudio.com",
        "http://localhost:5173",
      ]) {
        const label = origin.endsWith(":5173") ? "studio" : "reference",
          page = await browser.newPage({
            viewport: {
              width: job.width,
              height: job.width === 390 ? 844 : 900,
            },
            isMobile: job.width === 390,
            hasTouch: job.width === 390,
          });
        const errors = [];
        page.on("pageerror", (e) => errors.push(e.message));
        try {
          await page.goto(origin + job.route, {
            waitUntil: "domcontentloaded",
            timeout: 60000,
          });
          await page.waitForTimeout(6500);
          await page.evaluate(async () => {
            await document.fonts.ready;
            document.querySelectorAll("video").forEach((v) => {
              v.pause();
              if (v.readyState > 1) v.currentTime = 0.25;
            });
          });
          await page.waitForTimeout(400);
          await page.screenshot({
            path: `research/screenshots/comparison/${name}-${label}.png`,
          });
          pair[label] = {
            errors,
            ...(await page.evaluate(() => {
              const page =
                document.querySelector(".page-root") ||
                [...document.querySelector("main").children].at(-1);
              return {
                height: document.documentElement.scrollHeight,
                width: document.documentElement.scrollWidth,
                sections: [...page.children].map((e) => ({
                  class: e.className,
                  top: Math.round(e.getBoundingClientRect().top + scrollY),
                  height: Math.round(e.getBoundingClientRect().height),
                })),
                footer: {
                  height: document
                    .querySelector(".footer__content")
                    ?.getBoundingClientRect().height,
                  html: document.querySelector(".footer-col--address")
                    ?.innerHTML,
                },
                images: [...document.images]
                  .filter(
                    (i) =>
                      i.complete &&
                      !i.naturalWidth &&
                      i.className === "base-image__img",
                  )
                  .map((i) => i.src),
              };
            })),
          };
          console.log(
            name,
            label,
            pair[label].height,
            pair[label].width,
            errors.length,
          );
        } catch (e) {
          pair[label] = { error: e.message };
          console.log("FAIL", name, label, e.message);
        } finally {
          await page.close();
        }
      }
      results.push(pair);
      await writeFile(
        "research/browser/comparison-report.json",
        JSON.stringify(results, null, 2),
      );
    }
  }),
);
await browser.close();
await writeFile(
  "research/browser/comparison-report.json",
  JSON.stringify(results, null, 2),
);
