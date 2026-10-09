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
  proxy: { server: process.env.HTTPS_PROXY },
});
for (const route of [
  "home",
  "work",
  "about",
  "entertainment",
  "blog",
  "podcast",
  "contact",
  "shop",
  "work/gorillaz-the-mountain-the-mooncave-and-the-sad-god",
]) {
  const p = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  await p.goto("https://thelinestudio.com/" + (route === "home" ? "" : route), {
    waitUntil: "domcontentloaded",
    timeout: 60000,
  });
  await p.waitForTimeout(4500);
  const name = route.replaceAll("/", "__");
  await p.screenshot({ path: `research/screenshots/${name}-top.png` });
  const max = Math.min(
    await p.evaluate(() => document.body.scrollHeight),
    50000,
  );
  for (let y = 0; y < max; y += 1300) {
    await p.evaluate((y) => window.scrollTo(0, y), y);
    await p.waitForTimeout(100);
  }
  await p.waitForTimeout(1500);
  await writeFile(`research/browser/${name}-full.html`, await p.content());
  await writeFile(
    `research/browser/${name}-media.json`,
    JSON.stringify(
      await p.evaluate(() =>
        [...document.querySelectorAll("picture.base-image,.base-video")].map(
          (e) => ({
            class: e.className,
            src:
              e
                .querySelector("img.base-image__img,video")
                ?.getAttribute("src") || "",
            srcset: e.querySelector("source")?.getAttribute("srcset") || "",
            sizes: e.querySelector("img")?.getAttribute("sizes") || "",
            html: e.outerHTML,
          }),
        ),
      ),
      null,
      2,
    ),
  );
  console.log("Captured", route, max);
  await p.close();
}
await browser.close();
