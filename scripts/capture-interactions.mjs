import { chromium } from "playwright";
import { readFile, writeFile, access } from "node:fs/promises";
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
const routes = JSON.parse(await readFile("research/reference/routes.json"));
let index = 0;
await Promise.all(
  Array.from({ length: 4 }, async () => {
    while (index < routes.length) {
      const url = routes[index++];
      const name = url.split(".com/")[1].replaceAll("/", "__") || "home";
      try {
        await access("research/browser/" + name + "-interactions.json");
        continue;
      } catch {}
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
        );
        await page.waitForTimeout(5200);
        const themes = await page.evaluate(() => {
          const widgets = [],
            seen = new Set();
          function walk(v) {
            if (!v || typeof v !== "object" || seen.has(v)) return;
            seen.add(v);
            if (v.component) {
              const c = v.component;
              if (c.type.__name === "HeaderThemeTrigger")
                widgets.push({
                  class: v.el?.className,
                  props: JSON.parse(JSON.stringify(c.props)),
                });
              walk(c.subTree);
            }
            if (v.suspense) walk(v.suspense.activeBranch);
            if (Array.isArray(v.children)) v.children.forEach(walk);
          }
          walk(document.querySelector("#__nuxt")._vnode);
          return widgets;
        });
        let crew = "",
          note = "";
        if (name.startsWith("work__")) {
          const trigger = page.locator(".case-hero__trigger").first();
          if (await trigger.count()) {
            await trigger.click({ force: true });
            await page.waitForTimeout(350);
            crew = await page
              .locator(".case-hero-team")
              .first()
              .evaluate((e) => e.outerHTML)
              .catch(() => "");
            await page
              .locator(".case-hero-team__btn")
              .first()
              .click({ force: true })
              .catch(() => {});
          }
          const toggle = page.locator(".director-note-toggle");
          if (await toggle.count()) {
            await toggle.locator("button").evaluate((e) => e.click());
            await page.waitForTimeout(400);
            note = await page
              .locator(".director-note")
              .evaluate((e) => e.outerHTML)
              .catch(() => "");
          }
        }
        const media = await page.evaluate(() => {
          const result = [],
            seen = new Set();
          function walk(v) {
            if (!v || typeof v !== "object" || seen.has(v)) return;
            seen.add(v);
            if (v.component) {
              const c = v.component;
              if (c.props?.data?.src && v.el?.closest(".director-note"))
                result.push({
                  class: v.el.className,
                  asset: JSON.parse(JSON.stringify(c.props.data)),
                });
              walk(c.subTree);
            }
            if (v.suspense) walk(v.suspense.activeBranch);
            if (Array.isArray(v.children)) v.children.forEach(walk);
          }
          walk(document.querySelector("#__nuxt")._vnode);
          return result;
        });
        await writeFile(
          "research/browser/" + name + "-interactions.json",
          JSON.stringify({ themes, crew, note, media }),
        );
        console.log(name, themes.length, !!crew, !!note);
      } catch (e) {
        console.log("FAIL", name, e.message.slice(0, 180));
      } finally {
        await page.close();
      }
    }
  }),
);
await browser.close();
