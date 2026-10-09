import assert from "node:assert/strict";
import { readFile, writeFile } from "node:fs/promises";
import { chromium, request } from "playwright";

const origin = process.env.STUDIO_ORIGIN || "http://localhost:5173";
const manifest = JSON.parse(
  await readFile("docs/evidence/r2-site-assets.json", "utf8"),
);
const proxy = process.env.HTTPS_PROXY || process.env.HTTP_PROXY;
const transport = await request.newContext(
  proxy ? { proxy: { server: proxy } } : {},
);
const browser = await chromium.launch({
  executablePath: "/usr/bin/chromium",
  args: ["--no-sandbox"],
});
const checks = [];
const errors = [];
try {
  const page = await browser.newPage({ reducedMotion: "reduce" });
  page.on("pageerror", (error) => errors.push(error.message));
  let allowVideo = false;
  await page.route("**/*", async (route) => {
    const req = route.request();
    if (req.resourceType() === "media" && !allowVideo) return route.abort();
    if (req.url().startsWith("https:")) {
      const response = await transport.fetch(req, { timeout: 60000 });
      await route.fulfill({ response });
      await response.dispose();
      return;
    }
    return route.continue();
  });
  for (const width of [1440, 390]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto(origin + "/");
    await page.waitForFunction(
      () =>
        document.querySelector(".page-root") &&
        !document.querySelector(".preloader"),
    );
    assert.equal(await page.locator(".nav-item__link").count(), 6);
    assert.deepEqual(
      await page
        .locator(".nav-item__link")
        .evaluateAll((links) => links.map((a) => a.getAttribute("href"))),
      ["/", "/work", "/entertainment", "/about", "/blog", "/contact"],
    );
    const portraits = page.locator(".home-about__fig img");
    assert.equal(await portraits.count(), 2);
    await portraits.first().scrollIntoViewIfNeeded();
    await page.waitForFunction(() =>
      [...document.querySelectorAll(".home-about__fig img")].every(
        (img) => img.complete && img.naturalWidth > 0,
      ),
    );
    const journal = page.locator(".news-item__fig img");
    await journal.first().scrollIntoViewIfNeeded();
    await page.waitForFunction(() =>
      [...document.querySelectorAll(".news-item__fig img")].every(
        (img) => img.complete && img.naturalWidth > 0,
      ),
    );
    checks.push({
      width,
      name: "six navigation links, portrait stack and both journal images load from R2",
    });
    for (const path of ["/podcast/", "/shop/"]) {
      await page.goto(origin + path);
      await page.waitForSelector(".route-error");
      assert.equal(await page.locator(".page-root").count(), 0);
      checks.push({ width, name: "removed module returns 404", path });
    }
  }
  allowVideo = true;
  for (const item of manifest.entries.filter(
    (e) => e.contentType === "video/mp4",
  )) {
    await page.goto("about:blank");
    await page.setContent(
      `<video muted controls preload="auto" src="${manifest.baseUrl}/${item.key}"></video>`,
    );
    await page.waitForFunction(
      () => document.querySelector("video").readyState >= 2,
      null,
      { timeout: 60000 },
    );
    await page.locator("video").evaluate(async (video) => {
      await video.play();
    });
    await page.waitForFunction(
      () => document.querySelector("video").currentTime > 0.1,
    );
    const state = await page.locator("video").evaluate(async (video) => {
      video.pause();
      await new Promise((resolve, reject) => {
        const timer = setTimeout(
          () => reject(new Error("Seek timeout")),
          30000,
        );
        video.addEventListener(
          "seeked",
          () => {
            clearTimeout(timer);
            resolve();
          },
          { once: true },
        );
        video.currentTime = Math.min(1, video.duration / 2);
      });
      return {
        duration: video.duration,
        width: video.videoWidth,
        height: video.videoHeight,
        seekTime: video.currentTime,
      };
    });
    assert(state.duration > 0 && state.width > 0 && state.seekTime > 0);
    checks.push({
      name: "former local video plays and seeks",
      path: item.path,
      ...state,
    });
  }
  assert.deepEqual(errors, []);
  await writeFile(
    "docs/evidence/r2-site-browser.json",
    JSON.stringify({ origin, checks, errors }, null, 2) + "\n",
  );
  console.log(JSON.stringify({ checks, errors }));
} finally {
  await browser.close();
  await transport.dispose();
}
