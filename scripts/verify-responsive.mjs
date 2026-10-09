import { chromium, request } from "playwright";
import assert from "node:assert/strict";
import { writeFile } from "node:fs/promises";
const b = await chromium.launch({
  executablePath: process.env.CHROMIUM_PATH || "/usr/bin/chromium",
  args: ["--no-sandbox", "--disable-dev-shm-usage"],
});
const p = await b.newPage({ reducedMotion: "reduce" });
const report = [];
const errors = [];
p.on("pageerror", (e) => errors.push(e.message));
const origin = process.env.STUDIO_ORIGIN || "http://localhost:5173";
const proxy = process.env.HTTPS_PROXY || process.env.HTTP_PROXY;
const transport = proxy
  ? await request.newContext({ proxy: { server: proxy } })
  : null;
await p.route("**/*", async (route) => {
  if (route.request().resourceType() === "media") return route.abort();
  if (transport && route.request().url().startsWith("https:")) {
    const response = await transport.fetch(route.request());
    await route.fulfill({ response });
    await response.dispose();
    return;
  }
  return route.continue();
});
try {
  for (const width of [320, 768, 1024]) {
    await p.setViewportSize({ width, height: 900 });
    for (const route of [
      "/",
      "/work",
      "/about",
      "/entertainment",
      "/blog",
      "/contact",
    ]) {
      await p.goto(origin + route);
      await p.waitForSelector(".page-root");
      await p.waitForFunction(() => !document.querySelector(".preloader"));
      await p.evaluate(() => document.fonts.ready);
      const documentWidth = await p.evaluate(
        () => document.documentElement.scrollWidth,
      );
      report.push({ route, width, documentWidth });
      assert(documentWidth <= width + 1, route + " overflows at " + width);
    }
    console.log("responsive", width, "passed");
  }
  assert.equal(errors.length, 0);
} catch (e) {
  console.error(e);
  process.exitCode = 1;
} finally {
  await writeFile(
    "research/browser/responsive-verification.json",
    JSON.stringify({ report, errors }, null, 2),
  );
  await b.close();
  await transport?.dispose();
}
