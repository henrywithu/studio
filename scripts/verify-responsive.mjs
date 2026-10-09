import { chromium } from "playwright";
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
await p.route("**/*", (r) =>
  r.request().resourceType() === "media" ? r.abort() : r.continue(),
);
try {
  for (const width of [320, 768, 1024]) {
    await p.setViewportSize({ width, height: 900 });
    for (const route of [
      "/",
      "/work",
      "/about",
      "/entertainment",
      "/blog",
      "/podcast",
      "/contact",
      "/shop",
    ]) {
      await p.goto("http://localhost:5173" + route);
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
}
