import assert from "node:assert/strict";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { chromium, request as httpRequest } from "playwright";

const manifest = JSON.parse(await readFile("docs/evidence/r2-videos.json", "utf8"));
const origin = process.env.STUDIO_ORIGIN || "http://localhost:5173";
const media = (key) => {
  const entry = manifest.entries.find((item) => item.key === key);
  assert.equal(entry?.status, "verified", key);
  return `${manifest.baseUrl}/${key}`;
};
const desktop = media("videos/vimeo/1002011443-1080p.mp4");
const mobile = media("videos/vimeo/1002011443-720p.mp4");
const film = media("videos/vimeo/1003655090-1080p.mp4");
const browser = await chromium.launch({
  executablePath: process.env.CHROMIUM_PATH || "/usr/bin/chromium",
  args: ["--no-sandbox", "--disable-dev-shm-usage"],
});
const proxy = process.env.HTTPS_PROXY || process.env.HTTP_PROXY;
// Node honors the managed session's trusted CA. Chromium lacks that proxy CA;
// forward the bounded test videos with TLS verification kept enabled.
const transport = proxy ? await httpRequest.newContext({ proxy: { server: proxy } }) : null;
const report = { checks: [], errors: [], transport: proxy ? "HTTPS via trusted session proxy" : "browser HTTPS" };
try {
  for (const width of [1440, 390]) {
    const page = await browser.newPage({ viewport: { width, height: 900 }, reducedMotion: "reduce" });
    page.on("pageerror", (error) => report.errors.push(error.message));
    // Bound verification bandwidth to the preview and film under test.
    const allowed = new Set([desktop, mobile, film]);
    const requests = [];
    await page.route("**/*", async (route) => {
      const request = route.request();
      if (request.resourceType() === "media") {
        requests.push(request.url());
        if (!allowed.has(request.url())) return route.abort();
        if (transport) {
          const response = await transport.fetch(request, { timeout: 60000 });
          await route.fulfill({ response });
          await response.dispose();
          return;
        }
      }
      return route.continue();
    });
    await page.goto(origin + "/work/the-mighty-grand-piton", { waitUntil: "domcontentloaded" });
    await page.waitForFunction(() => document.querySelector(".page-root") && !document.querySelector(".preloader"));
    const preview = page.locator(`video[data-src="${desktop}"]`).first();
    await preview.scrollIntoViewIfNeeded();
    await page.waitForFunction((src) => [...document.querySelectorAll("video")].some((video) =>
      video.src === src && video.readyState >= 1), width < 1024 ? mobile : desktop, { timeout: 60000 });
    await preview.evaluate(async (video) => { video.muted = true; await video.play(); });
    await page.waitForFunction((src) => {
      const video = [...document.querySelectorAll("video")].find((v) => v.currentSrc === src);
      return video?.readyState >= 2 && video.currentTime > 0;
    }, width < 1024 ? mobile : desktop, { timeout: 60000 });
    const state = await preview.evaluate((video) => ({
      src: video.currentSrc, duration: video.duration, width: video.videoWidth, height: video.videoHeight,
    }));
    assert.equal(state.src, width < 1024 ? mobile : desktop);
    assert(state.duration > 0 && state.width > 0);
    report.checks.push({ check: "responsive preview playback", viewport: width, ...state });
    const player = page.locator(".player-alt").first();
    await player.locator(".player-alt__btn").click({ force: true });
    const fullVideo = player.locator(".player-alt__video video");
    await page.waitForFunction((src) => {
      const video = [...document.querySelectorAll("video")].find((v) => v.currentSrc === src);
      return video?.readyState >= 2 && video.currentTime > 0 && !video.paused;
    }, film, { timeout: 60000 });
    const filmState = await fullVideo.evaluate(async (video) => {
      video.pause();
      await new Promise((resolve, reject) => {
        const timeout = setTimeout(() => reject(new Error("Video seek timed out")), 30000);
        video.addEventListener("seeked", () => { clearTimeout(timeout); resolve(); }, { once: true });
        video.currentTime = Math.min(3, video.duration / 2);
      });
      return { src: video.currentSrc, duration: video.duration, seekTime: video.currentTime, controls: video.controls };
    });
    assert.equal(filmState.src, film);
    assert(filmState.controls && filmState.seekTime > 0);
    await page.keyboard.press("Escape");
    assert.equal(await player.evaluate((element) => element.classList.contains("player-alt--open")), false);
    report.checks.push({ check: "full film playback, seeking and close", viewport: width, ...filmState });
    assert(requests.every((url) => !url.includes("vimeo.com")), "Browser requested Vimeo");
    await page.close();
  }
  assert.deepEqual(report.errors, []);
  console.log(JSON.stringify(report, null, 2));
} finally {
  await mkdir("research/browser", { recursive: true });
  await writeFile("research/browser/r2-playback.json", JSON.stringify(report, null, 2) + "\n");
  await browser.close();
  await transport?.dispose();
}
