import { chromium } from "playwright";
import { readFile, writeFile } from "node:fs/promises";
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
const output = [];
for (const [route, width, selector] of [["/blog", 390, ".news-item"]]) {
  const pair = { route, width };
  for (const origin of ["http://localhost:5174", "http://localhost:5173"]) {
    const page = await browser.newPage({
      viewport: { width, height: width === 390 ? 844 : 900 },
      isMobile: width === 390,
      hasTouch: width === 390,
    });
    await page.route("**/*", (r) =>
      r.request().resourceType() === "media" ? r.abort() : r.continue(),
    );
    await page.goto(origin + route);
    await page.waitForTimeout(6500);
    pair[origin] = await page.evaluate(
      (selector) =>
        [...document.querySelectorAll(selector)].map((e) => ({
          class: e.className,
          children: [e, ...e.querySelectorAll("*")]
            .filter(
              (e) =>
                !e.closest("svg,picture") &&
                !["path", "video", "br"].includes(e.tagName.toLowerCase()),
            )
            .map((e) => ({
              tag: e.tagName,
              class: e.className,
              text: e.children.length ? undefined : e.textContent?.slice(0, 80),
              top: Math.round(e.getBoundingClientRect().top),
              width: Math.round(e.getBoundingClientRect().width),
              height: Math.round(e.getBoundingClientRect().height),
              display: getComputedStyle(e).display,
              font: getComputedStyle(e).fontSize,
              margin: getComputedStyle(e).margin,
              padding: getComputedStyle(e).padding,
              html: e.matches(".text-splitter") ? e.innerHTML : undefined,
              fontFamily: getComputedStyle(e).fontFamily,
              fontWeight: getComputedStyle(e).fontWeight,
              letterSpacing: getComputedStyle(e).letterSpacing,
            })),
        })),
      selector,
    );
    await page.close();
  }
  output.push(pair);
  console.log(width, route);
}
await browser.close();
await writeFile(
  "research/browser/layout-final-diagnosis.json",
  JSON.stringify(output, null, 2),
);
