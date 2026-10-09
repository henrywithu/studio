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
  proxy: { server: process.env.HTTPS_PROXY },
});
const routes = JSON.parse(
  await readFile("research/reference/routes.json", "utf8"),
);
let cursor = 0;
await Promise.all(
  Array.from({ length: 2 }, async () => {
    while (cursor < routes.length) {
      const url = routes[cursor++];
      const name = url.split(".com/")[1].replaceAll("/", "__") || "home";
      const page = await browser.newPage({
        viewport: { width: 1440, height: 900 },
      });
      try {
        await page.route("**/*", (r) =>
          ["media", "image"].includes(r.request().resourceType())
            ? r.abort()
            : r.continue(),
        );
        await page.goto(url, { waitUntil: "domcontentloaded", timeout: 45000 });
        await page.waitForFunction(
          () => !!document.querySelector("#__nuxt")?._vnode,
          { timeout: 15000 },
        );
        await page.waitForTimeout(1000);
        const result = await page.evaluate(() => {
          const media = new Map(),
            widgets = [],
            seen = new Set();
          function walk(v) {
            if (!v || typeof v !== "object" || seen.has(v)) return;
            seen.add(v);
            if (v.component) {
              const c = v.component;
              if (c.props?.data?.src)
                media.set(v.el, JSON.parse(JSON.stringify(c.props.data)));
              if (
                [
                  "PlayerAlt",
                  "Equalizer",
                  "TextSplitter",
                  "Carousel",
                  "HeaderThemeTrigger",
                ].includes(c.type.__name)
              )
                widgets.push({
                  name: c.type.__name,
                  class: v.el?.className,
                  props: JSON.parse(JSON.stringify(c.props)),
                });
              walk(c.subTree);
            }
            if (v.suspense) walk(v.suspense.activeBranch);
            if (Array.isArray(v.children)) v.children.forEach(walk);
          }
          walk(document.querySelector("#__nuxt")._vnode);
          return {
            media: [
              ...document.querySelectorAll(
                "main picture.base-image,main .base-video",
              ),
            ].map((e) => ({
              class: e.className,
              asset: media.get(e) || null,
              src:
                e
                  .querySelector("img.base-image__img,video")
                  ?.getAttribute("src") || "",
            })),
            widgets,
          };
        });
        await writeFile(
          "research/browser/" + name + "-data.json",
          JSON.stringify(result),
        );
        console.log(
          name,
          result.media.length,
          result.media.filter((m) => !m.asset).length,
        );
      } catch (e) {
        console.log("FAIL", name, e.message.slice(0, 120));
      } finally {
        await page.close();
      }
    }
  }),
);
await browser.close();
