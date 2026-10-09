import { chromium } from "playwright";
import { readFile, writeFile, mkdir } from "node:fs/promises";
import assert from "node:assert/strict";
const browser = await chromium.launch({
  executablePath: process.env.CHROMIUM_PATH || "/usr/bin/chromium",
  args: ["--no-sandbox", "--disable-dev-shm-usage"],
});
const origin = process.env.STUDIO_ORIGIN || "http://localhost:5173";
const report = {
  routes: [],
  interactions: [],
  errors: [],
  motion: process.env.NORMAL_MOTION ? "normal" : "reduced",
};
const page = await browser.newPage({
  viewport: { width: 1440, height: 900 },
  reducedMotion: process.env.NORMAL_MOTION ? "no-preference" : "reduce",
});
page.on("pageerror", (e) =>
  report.errors.push({ route: page.url(), message: e.message }),
);
await page.route("**/*", (r) =>
  r.request().resourceType() === "media" &&
  !r.request().url().includes("/audio/")
    ? r.abort()
    : r.continue(),
);
const routes = JSON.parse(
  await readFile("public/content/routes.json", "utf8"),
).map((item) => item.route);
try {
  for (const width of process.env.CONTROLS_ONLY ? [] : [1440, 390]) {
    await page.setViewportSize({ width, height: width === 390 ? 844 : 900 });
    for (const route of routes) {
      await page.goto(origin + route, { waitUntil: "domcontentloaded" });
      await page.waitForSelector(".page-root");
      await page.waitForFunction(() => !document.querySelector(".preloader"));
      await page.evaluate(() => document.fonts.ready);
      const result = await page.evaluate(() => ({
        title: document.title,
        width: document.documentElement.scrollWidth,
        height: document.documentElement.scrollHeight,
        sections: document.querySelector(".page-root").children.length,
      }));
      assert(result.sections > 0, route + " empty");
      assert(result.width <= width + 1, route + " overflow at " + width);
      report.routes.push({ route, viewport: width, ...result });
      if (report.routes.length % 20 === 0)
        console.log("routes", report.routes.length, "/", routes.length * 2);
    }
  }
  await page.setViewportSize({ width: 1440, height: 900 });
  async function open(route) {
    await page.goto(origin + route);
    await page.waitForSelector(".page-root");
    await page.waitForFunction(() => !document.querySelector(".preloader"));
  }
  async function check(name, fn) {
    await fn();
    report.interactions.push(name);
    console.log("PASS", name);
  }
  await open("/work");
  await check(
    "work filters restore All and preserve source counts",
    async () => {
      await page.locator(".work-filters__toggle").click();
      await page
        .locator(".work-filter__btn")
        .filter({ hasText: "Branded" })
        .click();
      assert.match(
        await page.locator(".work-filters__toggle").innerText(),
        /Branded/,
      );
      const visible = await page.locator(".work-grid-item:visible").count();
      assert(visible > 0 && visible < 77);
      await page.locator(".work-filters__toggle").click();
      await page
        .locator(".work-filter__btn")
        .filter({ hasText: /^All/ })
        .click();
      assert.equal(await page.locator(".work-grid-item:visible").count(), 77);
      assert.match(
        await page.locator(".work-filters__toggle").innerText(),
        /85/,
      );
    },
  );
  await check("list sorting completes three-state cycle", async () => {
    await page.evaluate(() => window.scrollTo(0, 300));
    await page.waitForTimeout(800);
    await page.locator(".work-layout-toggle button").nth(1).click();
    const first = await page.locator(".work-list-item").first().innerText();
    const sort = page.locator(".work-list-header__btn").nth(1);
    await sort.click();
    assert.equal(await sort.getAttribute("aria-sort"), "ascending");
    await sort.click();
    assert.equal(await sort.getAttribute("aria-sort"), "descending");
    await sort.click();
    assert.equal(
      await page.locator(".work-list-item").first().innerText(),
      first,
    );
  });
  await check(
    "client navigation and returning home preserve logo",
    async () => {
      for (const route of ["/about", "/contact", "/"]) {
        await page.locator(`.nav-item__link[href="${route}"]`).click();
        await page.waitForFunction(
          (route) =>
            document.querySelector(".page-root") &&
            location.pathname === route &&
            document.title.length > 0,
          route,
        );
        await page.waitForTimeout(process.env.NORMAL_MOTION ? 1800 : 350);
      }
      assert.equal(
        (await page.locator(".home-hero__wrapper svg").count()) > 0,
        true,
      );
      assert.equal(await page.locator(".studio-transition").count(), 0);
      await page.goBack();
      await page.waitForSelector(".contact-hero");
    },
  );
  await open("/contact");
  await check("FAQ switches answers exclusively", async () => {
    await page.locator(".accordion button").nth(1).click();
    await page.waitForTimeout(100);
    assert.equal(await page.locator(".accordion--open").count(), 1);
    assert.equal(
      await page
        .locator(".accordion button")
        .nth(1)
        .getAttribute("aria-expanded"),
      "true",
    );
  });
  await check(
    "newsletter rejects invalid email without submission",
    async () => {
      const input = page.locator(".newsletter input");
      await input.fill("invalid");
      await input.press("Enter");
      assert.equal(await input.evaluate((e) => e.validity.valid), false);
    },
  );
  await open("/work/gorillaz-the-mountain-the-mooncave-and-the-sad-god");
  await check("project crew opens and closes", async () => {
    await page.locator(".case-hero__trigger").click({ force: true });
    await page.waitForTimeout(1200);
    assert.equal(
      await page.locator(".case-hero-team").evaluate((e) => e.hidden),
      false,
    );
    await page.locator(".case-hero-team button").first().click({ force: true });
    await page.waitForTimeout(1200);
    assert.equal(
      await page.locator(".case-hero-team").evaluate((e) => e.hidden),
      true,
    );
  });
  await open("/about");
  await check("directional carousel advances original image", async () => {
    const before = await page
      .locator(".carousel-cursor__fig:visible img")
      .getAttribute("src");
    await page
      .locator(".carousel-cursor__btn")
      .click({ position: { x: 1000, y: 150 } });
    await page.waitForTimeout(process.env.NORMAL_MOTION ? 1500 : 150);
    assert.notEqual(
      await page
        .locator(".carousel-cursor__fig:visible img")
        .getAttribute("src"),
      before,
    );
  });
  await open("/podcast");
  await check(
    "original podcast previews play exclusively and stop",
    async () => {
      const buttons = page.locator(".sound-equalizer__btn[data-audio]");
      await buttons.nth(0).click();
      await page.waitForFunction(() =>
        document.querySelector('.sound-equalizer__btn[aria-pressed="true"]'),
      );
      await buttons.nth(1).click();
      await page.waitForFunction(
        () =>
          document
            .querySelectorAll(".sound-equalizer__btn[data-audio]")[1]
            .getAttribute("aria-pressed") === "true",
      );
      assert.equal(
        await page.locator(".podcast-list-item--playing").count(),
        1,
      );
      await buttons.nth(1).click();
      assert.equal(
        await page.locator(".podcast-list-item--playing").count(),
        0,
      );
    },
  );
  await open("/work/hero-marvel-snap");
  await check("director note opens and closes", async () => {
    await page.evaluate(() => window.scrollTo(0, 2000));
    await page.waitForTimeout(400);
    await page.locator(".director-note-toggle button").click({ force: true });
    await page.waitForTimeout(1200);
    assert.equal(
      await page.locator(".director-note").evaluate((e) => e.hidden),
      false,
    );
    await page
      .locator(".director-note__btn")
      .filter({ hasText: /Close/ })
      .click({ force: true });
    await page.waitForTimeout(1200);
    assert.equal(
      await page.locator(".director-note").evaluate((e) => e.hidden),
      true,
    );
  });
  await check("original full film player opens and Escape closes", async () => {
    const player = page.locator(".player-alt").first();
    await player.locator(".player-alt__btn").click({ force: true });
    assert.equal(
      await player.evaluate((e) => e.classList.contains("player-alt--open")),
      true,
    );
    const video = player.locator(".player-alt__video video");
    if (await video.count())
      assert.equal(
        await video.evaluate((v) => v.controls && !v.muted && !v.loop),
        true,
      );
    await page.keyboard.press("Escape");
    assert.equal(
      await player.evaluate((e) => e.classList.contains("player-alt--open")),
      false,
    );
  });
  await check(
    "next-project transition reaches the original linked project",
    async () => {
      await page.evaluate(() =>
        window.scrollTo(0, document.documentElement.scrollHeight),
      );
      await page.waitForTimeout(1200);
      const link = page.locator('.case-footer a[href^="/work/"]').first();
      const href = await link.getAttribute("href");
      await link.click({ force: true });
      await page.waitForFunction((href) => location.pathname === href, href);
      await page.waitForTimeout(1600);
      assert.equal(await page.locator(".studio-transition").count(), 0);
      assert.equal(await page.locator(".page-root").count(), 1);
    },
  );
  await open("/contact");
  await check("footer credits reveal and close", async () => {
    await page.evaluate(() =>
      window.scrollTo(0, document.documentElement.scrollHeight),
    );
    await page.waitForTimeout(1200);
    await page.locator(".footer__credits").click();
    await page.waitForTimeout(1900);
    assert.equal(await page.locator(".footer--credits-open").count(), 1);
    await page.locator(".footer-credits__btn-svg").click({ force: true });
    await page.waitForTimeout(900);
    assert.equal(await page.locator(".footer--credits-open").count(), 0);
  });
  await page.setViewportSize({ width: 390, height: 844 });
  await open("/");
  await check("mobile menu opens, Escape closes, link navigates", async () => {
    await page.locator(".nav-toggle").click();
    assert.equal(
      await page.locator(".nav-toggle").getAttribute("aria-expanded"),
      "true",
    );
    await page.keyboard.press("Escape");
    assert.equal(
      await page.locator(".nav-toggle").getAttribute("aria-expanded"),
      "false",
    );
    await page.locator(".nav-toggle").click();
    await page.locator('.nav-item__link[href="/work"]').click();
    await page.waitForSelector(".work");
    assert.equal(await page.locator(".header--nav-open").count(), 0);
    assert.equal(
      await page.locator("body").evaluate((e) => e.classList.contains("oh")),
      false,
    );
  });
  assert.equal(report.errors.length, 0, JSON.stringify(report.errors));
} catch (e) {
  report.failure = e.stack;
  console.error(e);
  process.exitCode = 1;
} finally {
  await mkdir("research/browser", { recursive: true });
  await writeFile(
    "research/browser/studio-verification" +
      (process.env.NORMAL_MOTION
        ? "-motion"
        : process.env.CONTROLS_ONLY
          ? "-controls"
          : "") +
      ".json",
    JSON.stringify(report, null, 2),
  );
  await browser.close();
}
