import { chromium } from "playwright";
import { mkdir, writeFile } from "node:fs/promises";
const browser = await chromium.launch({
  executablePath: "/usr/bin/chromium",
  headless: true,
  args: [
    "--no-sandbox",
    "--disable-dev-shm-usage",
    "--ignore-certificate-errors-spki-list=4Jz9K43E+svsUxawyhKXqAph5rofh2GHMe8GZukW6Y8=,afj1FTiIMbHQHOmidXdhQB6B4cjqJkX1xzeV2w81Cn4=,n9jEr2dCP1tg9exQzr7xEpZ4TjG2QWO02LUFhmAzII4=,mm7GRB+EoFiXrsaQVQC33Cm7oRBrUc78x3fJXMmh9R0=,n9jEr2dCP1tg9exQzr7xEpZ4TjG2QWO02LUFhmAzII4=",
  ],
  proxy: { server: process.env.HTTPS_PROXY },
});
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
await mkdir("research/browser", { recursive: true });
await mkdir("research/screenshots", { recursive: true });
const requests = [];
page.on("request", (r) =>
  requests.push({ url: r.url(), type: r.resourceType() }),
);
page.on("pageerror", (e) => console.log("PAGEERROR", e.message));
await page.goto("https://thelinestudio.com/", {
  waitUntil: "domcontentloaded",
  timeout: 60000,
});
await page.waitForTimeout(6000);
await page.screenshot({ path: "research/screenshots/home-desktop.png" });
await writeFile("research/browser/home-hydrated.html", await page.content());
await writeFile(
  "research/browser/home-measurements.json",
  JSON.stringify(
    await page.evaluate(() => ({
      title: document.title,
      bodyClass: document.body.className,
      fonts: [...document.fonts].map((f) => ({
        family: f.family,
        status: f.status,
      })),
      media: [...document.querySelectorAll("video,img")].map((e) => ({
        tag: e.tagName,
        src: e.currentSrc,
        poster: e.poster,
        html: e.outerHTML,
      })),
      structure: [...document.querySelector("main").children].map((e) => ({
        tag: e.tagName,
        class: e.className,
        children: [...e.children].map((c) => ({
          tag: c.tagName,
          class: c.className,
        })),
      })),
      rects: [...document.querySelectorAll("header,.home>div,footer")].map(
        (e) => ({
          class: e.className,
          rect: e.getBoundingClientRect().toJSON(),
          style: e.getAttribute("style"),
        }),
      ),
    })),
    null,
    2,
  ),
);
await writeFile(
  "research/browser/home-requests.json",
  JSON.stringify(requests, null, 2),
);
await page.evaluate(() => window.scrollTo(0, 1800));
await page.waitForTimeout(1500);
await page.screenshot({ path: "research/screenshots/home-intro.png" });
await page.evaluate(() => window.scrollTo(0, 2850));
await page.waitForTimeout(1500);
await page.screenshot({ path: "research/screenshots/home-featured.png" });
await page.setViewportSize({ width: 390, height: 844 });
await page.goto("https://thelinestudio.com/", {
  waitUntil: "domcontentloaded",
  timeout: 60000,
});
await page.waitForTimeout(5000);
await page.screenshot({ path: "research/screenshots/home-mobile.png" });
await writeFile("research/browser/home-mobile.html", await page.content());
await browser.close();
console.log("Reference inspected.");
