import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";
import { build } from "esbuild";
import { Miniflare, convertV4MiniflareOptions } from "miniflare";
import { load } from "cheerio";

test("site serves oversized media at unchanged URLs with seeking and restricted R2 access", async () => {
  const bundle = await build({ entryPoints: ["workers/site/index.mjs"], bundle: true, write: false, format: "esm" });
  const mf = new Miniflare(convertV4MiniflareOptions({
    modules: true,
    script: bundle.outputFiles[0].text,
    compatibilityDate: "2026-10-09",
    r2Buckets: ["LOCAL_VIDEOS"],
    serviceBindings: { ASSETS: request => new Response("static:" + new URL(request.url).pathname) },
  }));
  try {
    const bucket = await mf.getR2Bucket("LOCAL_VIDEOS");
    const bytes = new Uint8Array(256).map((_, i) => i);
    await bucket.put("videos/local/748af0586f32345b.mp4", bytes);
    await bucket.put("private.mp4", bytes);
    const url = "https://studio.test/media/748af0586f32345b.mp4";
    const full = await mf.dispatchFetch(url);
    assert.equal(full.status, 200);
    assert.deepEqual(new Uint8Array(await full.arrayBuffer()), bytes);
    const range = await mf.dispatchFetch(url, { headers: { Range: "bytes=10-19" } });
    assert.equal(range.status, 206);
    assert.equal(range.headers.get("Content-Range"), "bytes 10-19/256");
    assert.deepEqual(new Uint8Array(await range.arrayBuffer()), bytes.slice(10, 20));
    const head = await mf.dispatchFetch(url, { method: "HEAD" });
    assert.equal(head.headers.get("Content-Length"), "256");
    assert.equal((await head.arrayBuffer()).byteLength, 0);
    assert.equal((await mf.dispatchFetch(url, { method: "POST" })).status, 405);
    for (const path of ["/", "/about/", "/brand/og.jpg", "/videos/local/748af0586f32345b.mp4", "/private.mp4"])
      assert.equal(await (await mf.dispatchFetch("https://studio.test" + path)).text(), "static:" + path);
    assert.equal((await mf.dispatchFetch("https://studio.test/media/e89d3045a7786331.mp4")).status, 404);
  } finally { await mf.dispose(); }
});

test("every production route has crawler-readable Studio metadata and matching canonical URLs", async () => {
  const routes = JSON.parse(await readFile("public/content/routes.json", "utf8"));
  for (const { route, file } of routes) {
    const page = JSON.parse(await readFile("public/content/" + file, "utf8"));
    const html = await readFile(route === "/" ? "dist/index.html" : "dist" + route + "/index.html", "utf8");
    const $ = load(html);
    const url = "https://studio.henrywithu.com" + (route === "/" ? "/" : route + "/");
    assert.match($("title").text(), /Trapnest Studio/);
    assert.equal($("title").text(), page.title);
    assert.equal($('meta[property="og:title"]').attr("content"), page.title);
    assert.equal($('meta[name="twitter:description"]').attr("content"), page.description);
    assert.equal($('meta[property="og:url"]').attr("content"), url);
    assert.equal($('link[rel="canonical"]').attr("href"), url);
    assert.equal($('meta[property="og:image"]').attr("content"), "https://studio.henrywithu.com/brand/og.jpg");
  }
  assert.match(await readFile("dist/robots.txt", "utf8"), /studio.henrywithu.com\/sitemap.xml/);
  assert.equal(load(await readFile("dist/404.html", "utf8"))('meta[name="robots"]').attr("content"), "noindex");
});
