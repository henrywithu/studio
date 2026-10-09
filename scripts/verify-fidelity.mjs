import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
import { chromium, request } from "playwright";

const origin = process.env.STUDIO_ORIGIN || "http://localhost:5173";
const proxy = process.env.HTTPS_PROXY || process.env.HTTP_PROXY;
const transport = proxy
  ? await request.newContext({ proxy: { server: proxy } })
  : null;
const browser = await chromium.launch({
  executablePath: process.env.CHROMIUM_PATH || "/usr/bin/chromium",
  args: ["--no-sandbox", "--disable-dev-shm-usage"],
});
const report = { origin, checks: [], errors: [] };
try {
  for (const width of [1440, 390]) {
    const page = await browser.newPage({ viewport: { width, height: 900 } });
    page.on("pageerror", (error) => report.errors.push(error.message));
    await page.route("**/*", async (route) => {
      if (route.request().resourceType() === "media") return route.abort();
      if (transport && route.request().url().startsWith("https:")) {
        const response = await transport.fetch(route.request());
        await route.fulfill({ response });
        await response.dispose();
        return;
      }
      return route.continue();
    });
    const normalize = (path) => path.replace(/\/$/, "") || "/";
    async function ready(path) {
      await page.waitForSelector(`.page-root[data-route="${path}"]`);
      await page.waitForFunction(
        () =>
          !document.querySelector(".preloader,.studio-transition") &&
          document.querySelector(".page-root")?.style.position !== "fixed",
      );
      await page.evaluate(() => document.fonts.ready);
    }
    async function open(path) {
      await page.goto(origin + path, { waitUntil: "domcontentloaded" });
      await ready(normalize(path));
    }
    async function clickNav(path) {
      if (
        width < 1024 &&
        (await page.locator(".nav-toggle").getAttribute("aria-expanded")) !==
          "true"
      )
        await page.locator(".nav-toggle").click();
      await page.locator(`.nav-item__link[href="${path}"]`).click();
    }
    async function check(name, callback) {
      await callback();
      report.checks.push({ width, name });
      console.log("PASS", width, name);
    }
    await open("/blog/");
    await check("current trailing-slash route stays usable", async () => {
      await clickNav("/blog");
      await clickNav("/work");
      await ready("/work");
      assert.equal(normalize(new URL(page.url()).pathname), "/work");
    });
    await check(
      "rapid hover and navigation leave one correctly spaced active dot",
      async () => {
        for (const path of ["/about", "/blog", "/contact"])
          await page
            .locator(`.nav-item__link[href="${path}"]`)
            .dispatchEvent("mouseenter");
        await clickNav("/blog");
        await ready("/blog");
        await page.mouse.move(700, 400);
        await page.waitForTimeout(650);
        const links = await page
          .locator(".nav-item__link")
          .evaluateAll((elements) =>
            elements.map((link) => ({
              href: link.getAttribute("href"),
              active: link.getAttribute("aria-current"),
              scale: new DOMMatrix(
                getComputedStyle(link.querySelector(".dot")).transform,
              ).a,
              rect: link
                .querySelector(".link__label")
                .getBoundingClientRect()
                .toJSON(),
            })),
          );
        assert.deepEqual(
          links.filter((link) => link.scale > 0.5).map((link) => link.href),
          ["/blog"],
        );
        assert.deepEqual(
          links.filter((link) => link.active).map((link) => link.href),
          ["/blog"],
        );
        if (width >= 1024)
          for (let i = 1; i < links.length; i++) {
            assert(
              links[i].rect.left > links[i - 1].rect.right,
              "Navigation labels overlap",
            );
            assert(
              links[i].rect.right <= width,
              "Navigation extends outside viewport",
            );
          }
      },
    );
    await open("/");
    await check(
      "portrait photo stack and original background layers",
      async () => {
        const figs = page.locator(".home-about__figs");
        await figs.scrollIntoViewIfNeeded();
        await page.waitForTimeout(650);
        for (const image of await figs.locator("img").all())
          await image.evaluate((img) => img.decode());
        const ratios = await figs
          .locator("picture")
          .evaluateAll((elements) =>
            elements.map((e) => e.clientWidth / e.clientHeight),
          );
        assert.equal(ratios.length, 2);
        assert(ratios.every((ratio) => Math.abs(ratio - 2 / 3) < 0.01));
        assert.equal(
          await page
            .locator("header")
            .evaluate((e) => getComputedStyle(e).color),
          "rgb(11, 11, 11)",
        );
        assert.equal(
          await page
            .locator(".home-about__grid")
            .evaluate((e) => getComputedStyle(e).backgroundColor),
          "rgb(248, 248, 248)",
        );
        await page.evaluate(() => window.scrollTo(0, 0));
        await page.waitForTimeout(500);
        assert.equal(
          await page
            .locator("header")
            .evaluate((e) => getComputedStyle(e).color),
          "rgb(248, 248, 248)",
        );
        const layer = await page.locator(".home-hero__layer").evaluate((e) => {
          const style = getComputedStyle(e);
          return { color: style.backgroundColor, blend: style.mixBlendMode };
        });
        assert.deepEqual(layer, { color: "rgb(255, 0, 0)", blend: "multiply" });
      },
    );
    await open("/about");
    await check(
      "page sheets rotate concurrently, dim and finish without stale overlays",
      async () => {
        await page.evaluate(() => {
          window.studioFrames = [];
          const deadline = performance.now() + 2400;
          function frame() {
            const incoming = document.querySelector(
              'main .page-root[data-route="/blog"]',
            );
            const outgoing = document.querySelector(
              ".studio-transition .page-root",
            );
            if (incoming?.style.position === "fixed" && outgoing) {
              const rotation = (element) => {
                const m = new DOMMatrix(getComputedStyle(element).transform);
                return (Math.atan2(m.b, m.a) * 180) / Math.PI;
              };
              window.studioFrames.push({
                time: performance.now(),
                incoming: rotation(incoming),
                outgoing: rotation(outgoing),
                origin: getComputedStyle(incoming)
                  .transformOrigin.split(" ")
                  .map(parseFloat),
                height: incoming.offsetHeight,
                width: incoming.offsetWidth,
                shade: Number(
                  getComputedStyle(
                    document.querySelector(".studio-transition-shade"),
                  ).opacity,
                ),
              });
            }
            if (performance.now() < deadline) requestAnimationFrame(frame);
          }
          requestAnimationFrame(frame);
        });
        await clickNav("/blog");
        await ready("/blog");
        const frames = await page.evaluate(() => window.studioFrames);
        assert(frames.length > 5, "Transition frames were not captured");
        assert(
          frames.some(
            (f) => f.incoming < -0.1 && f.outgoing > 0.1 && f.shade > 0.05,
          ),
          "Sheets must move and dim together",
        );
        assert(
          frames.every(
            (f) =>
              Math.abs(f.origin[0] - f.width / 2) < 1 &&
              Math.abs(f.origin[1] - f.height / 2) < 1,
          ),
          "Reference rotates around the sheet center",
        );
        assert(
          frames.at(-1).time - frames[0].time < 1200,
          "Transition retained the outgoing sheet too long",
        );
        assert.equal(await page.locator(".page-root").count(), 1);
      },
    );
    await open("/about");
    await check(
      "Back during a transition releases navigation and scrolling",
      async () => {
        await clickNav("/blog");
        await page.waitForSelector('.page-root[data-route="/blog"]');
        await page.goBack({ waitUntil: "domcontentloaded" });
        await ready("/about");
        await clickNav("/contact");
        await ready("/contact");
        await page.evaluate(() => window.scrollTo(0, 300));
        await page.waitForTimeout(100);
        assert(await page.evaluate(() => scrollY > 0));
        assert.equal(await page.locator(".page-root").count(), 1);
      },
    );
    await open("/");
    await check("failed route prefetch can recover on retry", async () => {
      let failures = 0;
      const failOnce = async (route) => {
        if (failures++ === 0)
          return route.fulfill({ status: 503, body: "Temporary failure" });
        return route.fallback();
      };
      await page.route("**/content/about.json", failOnce);
      const failedPrefetch = page.waitForResponse(
        (response) =>
          response.url().endsWith("/content/about.json") &&
          response.status() === 503,
      );
      await page
        .locator('.nav-item__link[href="/about"]')
        .dispatchEvent("pointerover");
      await failedPrefetch;
      await clickNav("/about");
      await ready("/about");
      assert(failures >= 2);
      await page.unroute("**/content/about.json", failOnce);
    });
    await check("unknown route recovers through the Home link", async () => {
      await page.goto(origin + "/missing-fidelity-route/", {
        waitUntil: "domcontentloaded",
      });
      await page.waitForSelector(".studio-error");
      assert.equal(
        await page.locator("header").evaluate((e) => getComputedStyle(e).color),
        "rgb(11, 11, 11)",
      );
      await page.locator('.studio-error a[href="/"]').click();
      await ready("/");
    });
    await page.close();
  }
  assert.deepEqual(report.errors, []);
} catch (error) {
  report.failure = error.stack;
  throw error;
} finally {
  await mkdir("research/browser", { recursive: true });
  await writeFile(
    "research/browser/fidelity-verification.json",
    JSON.stringify(report, null, 2) + "\n",
  );
  await browser.close();
  await transport?.dispose();
}
