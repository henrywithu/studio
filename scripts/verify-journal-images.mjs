import assert from "node:assert/strict";
import { chromium, request } from "playwright";

const origin = process.env.STUDIO_ORIGIN || "http://localhost:5173";
const browser = await chromium.launch({
  executablePath: process.env.CHROMIUM_PATH || "/usr/bin/chromium",
  args: ["--no-sandbox", "--disable-dev-shm-usage"],
});
const proxy = process.env.HTTPS_PROXY || process.env.HTTP_PROXY;
const transport =
  origin.startsWith("https:") && proxy
    ? await request.newContext({ proxy: { server: proxy } })
    : null;
try {
  for (const width of [1440, 390]) {
    const page = await browser.newPage({ viewport: { width, height: 900 } });
    await page.route("**/*", async (route) => {
      if (route.request().resourceType() === "media") return route.abort();
      if (
        transport &&
        route
          .request()
          .url()
          .startsWith(origin + "/")
      ) {
        const response = await transport.fetch(route.request());
        await route.fulfill({ response });
        await response.dispose();
        return;
      }
      return route.continue();
    });
    async function checkImages(label) {
      await page.waitForSelector(
        '.home-featured-news img[src^="/images/journal/"]',
        { state: "attached" },
      );
      await page.waitForFunction(() => !document.querySelector(".preloader"));
      const images = page.locator(
        '.home-featured-news img[src^="/images/journal/"]',
      );
      assert.equal(await images.count(), 2);
      for (const image of await images.all()) {
        await image.scrollIntoViewIfNeeded();
        await image.evaluate((img) => img.decode());
        await page.waitForFunction(
          (src) => {
            const img = document.querySelector(`img[src="${src}"]`);
            return (
              img?.naturalWidth > 0 &&
              getComputedStyle(img.closest("picture"), "::before").opacity ===
                "0"
            );
          },
          await image.getAttribute("src"),
        );
        assert(await image.isVisible());
      }
      console.log(`PASS ${width}px ${label}: both journal images visible`);
    }
    await page.goto(origin + "/", { waitUntil: "domcontentloaded" });
    await checkImages("initial load");
    await page.reload({ waitUntil: "domcontentloaded" });
    await checkImages("reload");
    await page.goto(origin + "/about", { waitUntil: "domcontentloaded" });
    await page.waitForSelector(".about", { state: "attached" });
    await page.waitForFunction(() => !document.querySelector(".preloader"));
    if (width < 1024) await page.locator(".nav-toggle").click();
    await page.locator('.nav-item__link[href="/"]').click();
    await page.waitForFunction(
      () =>
        location.pathname === "/" &&
        !!document.querySelector(
          '.home-featured-news img[src^="/images/journal/"]',
        ),
    );
    await checkImages("client navigation");
    await page.close();
  }
} finally {
  await browser.close();
  await transport?.dispose();
}
