import { chromium } from "playwright";
import { readFile, writeFile, mkdir } from "node:fs/promises";
const inspector = await readFile("scripts/inspect-reference.mjs", "utf8");
const pin = inspector.match(/--ignore-certificate-errors-spki-list=([^']+)/)[1];
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
await mkdir("research/screenshots/local", { recursive: true });
const report = [];
for (const route of [
  "",
  "work",
  "about",
  "entertainment",
  "blog",
  "contact",
  "work/gorillaz-the-mountain-the-mooncave-and-the-sad-god",
]) {
  const page = await browser.newPage({
    viewport: { width: 1440, height: 900 },
  });
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("console", (m) => {
    if (m.type() === "error" && !m.text().includes("Failed to load resource"))
      errors.push(m.text().slice(0, 500));
  });
  await page.goto("http://localhost:5173/" + route, {
    waitUntil: "domcontentloaded",
    timeout: 60000,
  });
  await page.waitForTimeout(5500);
  await page.screenshot({
    path:
      "research/screenshots/local/" +
      (route.replaceAll("/", "__") || "home") +
      "-top.png",
  });
  report.push({
    route: route || "/",
    errors,
    ...(await page.evaluate(() => ({
      title: document.title,
      height: document.documentElement.scrollHeight,
      width: document.documentElement.scrollWidth,
      viewport: innerWidth,
      blankImages: [...document.images].filter(
        (img) => img.classList.contains("base-image__img") && !img.complete,
      ).length,
      brokenImages: [...document.images]
        .filter((img) => img.complete && !img.naturalWidth)
        .map((img) => img.src),
      text: document.body.innerText.slice(0, 1000),
    }))),
  });
  console.log(route || "home", errors.slice(0, 3));
  if (!route) {
    for (const y of [900, 1800, 2850, 5200, 7200, 8800]) {
      await page.evaluate((y) => window.scrollTo(0, y), y);
      await page.waitForTimeout(800);
      await page.screenshot({
        path: `research/screenshots/local/home-${y}.png`,
      });
    }
  }
  await page.close();
}
const mobile = await browser.newPage({
  viewport: { width: 390, height: 844 },
  isMobile: true,
  hasTouch: true,
});
await mobile.goto("http://localhost:5173/");
await mobile.waitForTimeout(5500);
await mobile.screenshot({ path: "research/screenshots/local/home-mobile.png" });
await mobile.click(".nav-toggle");
await mobile.waitForTimeout(1000);
await mobile.screenshot({ path: "research/screenshots/local/mobile-menu.png" });
report.push({
  route: "mobile",
  ...(await mobile.evaluate(() => ({
    width: document.documentElement.scrollWidth,
    viewport: innerWidth,
    nav: document.querySelector(".nav")?.className,
  }))),
});
await browser.close();
await writeFile(
  "research/browser/local-report.json",
  JSON.stringify(report, null, 2),
);
