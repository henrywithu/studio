import assert from "node:assert/strict";
import { chromium, request } from "playwright";
import { mkdir, writeFile } from "node:fs/promises";
const proxy = process.env.HTTPS_PROXY || process.env.HTTP_PROXY;
const http = proxy
  ? await request.newContext({ proxy: { server: proxy } })
  : null;
await mkdir("research/screenshots", { recursive: true });
const browser = await chromium.launch({
  executablePath: "/usr/bin/chromium",
  args: ["--no-sandbox"],
});
const results = [];
for (const width of [320, 390, 768, 1024, 1440]) {
  const page = await browser.newPage({ viewport: { width, height: 900 } });
  await page.route("**/*", async (r) => {
    if (r.request().resourceType() === "media") return r.abort();
    if (http && r.request().url().startsWith("https:")) {
      const x = await http.fetch(r.request());
      await r.fulfill({ response: x });
      await x.dispose();
      return;
    }
    await r.continue();
  });
  for (const route of ["/contact", "/about"]) {
    await page.goto(
      (process.env.STUDIO_ORIGIN || "http://localhost:5173") + route,
    );
    await page.waitForFunction(
      () =>
        document.querySelector(".page-root") &&
        !document.querySelector(".preloader,.studio-transition"),
    );
    await page.waitForTimeout(1700);
    const info = await page.evaluate(() => ({
      overflow: document.documentElement.scrollWidth - innerWidth,
      title: document
        .querySelector(".contact-hero__wrapper .h1,.about-hero__title")
        ?.getBoundingClientRect()
        .toJSON(),
      image: document
        .querySelector(".contact-hero__fg")
        ?.getBoundingClientRect()
        .toJSON(),
    }));
    assert(info.overflow <= 1, `${route} ${width}: overflow ${info.overflow}`);
    if (route === "/contact") {
      const pics = page.locator(".contact-hero img");
      for (const img of await pics.all()) await img.evaluate((e) => e.decode());
      if (width >= 1024)
        assert(info.title.right < info.image.left, "Desktop contact collision");
    } else {
      const intro = await page
        .locator(".about-intro")
        .evaluate((e) => e.getBoundingClientRect().top + scrollY);
      await page.evaluate((y) => scrollTo(0, y + 50), intro);
      await page.waitForTimeout(800);
      assert.equal(
        await page
          .locator(".about-hero")
          .evaluate((e) => getComputedStyle(e).visibility),
        "hidden",
        "Hero must hide at intro",
      );
      await page.evaluate(() => scrollTo(0, 0));
      await page.waitForTimeout(800);
      assert.equal(
        await page
          .locator(".about-hero")
          .evaluate((e) => getComputedStyle(e).visibility),
        "visible",
        "Hero must restore",
      );
    }
    await page.screenshot({
      path: `research/screenshots/${route.slice(1)}-${width}-updated.png`,
    });
    results.push({ route, width, ...info });
    console.log("PASS", route, width);
  }
  await page.close();
}
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
await page.route("**/*", async (r) => {
  if (r.request().resourceType() === "media") return r.abort();
  if (http && r.request().url().startsWith("https:")) {
    const x = await http.fetch(r.request());
    await r.fulfill({ response: x });
    return x.dispose();
  }
  return r.continue();
});
await page.goto((process.env.STUDIO_ORIGIN || "http://localhost:5173") + "/");
await page.waitForTimeout(2200);
await page.locator(".home-about__awards").scrollIntoViewIfNeeded();
await page.waitForTimeout(900);
assert.match(
  await page.locator(".home-about__awards").innerText(),
  /Trapnest Cards/,
);
await page.screenshot({
  path: "research/screenshots/home-trapnest-projects.png",
});
await page.locator(".home-clients").scrollIntoViewIfNeeded();
await page.waitForTimeout(1000);
assert(
  !/Gucci|Mercedes|BAFTA/.test(await page.locator(".page-root").innerText()),
);
await page.screenshot({
  path: "research/screenshots/home-trapnest-curiosity.png",
});
await mkdir("docs/evidence", { recursive: true });
await writeFile(
  "docs/evidence/trapnest-layout.json",
  JSON.stringify({ checks: results, homeListsVerified: true }, null, 2) + "\n",
);
await browser.close();
await http?.dispose();
