import assert from "node:assert/strict";
import { readFile, stat } from "node:fs/promises";
import { test } from "node:test";
import { build } from "esbuild";
import { Miniflare, convertV4MiniflareOptions } from "miniflare";
import { load } from "cheerio";

test("legacy video URLs reuse verified byte-identical R2 objects without local copies", async () => {
  const media = JSON.parse(
    await readFile("workers/site/local-media.json", "utf8"),
  );
  const manifest = JSON.parse(
    await readFile("docs/evidence/r2-videos.json", "utf8"),
  );
  for (const item of media) {
    const entry = manifest.entries.find((entry) => entry.key === item.key);
    assert(entry, "Mapping must reference an existing verified object");
    assert.equal(entry.status, "verified");
    assert.equal(item.bytes, entry.bytes);
    assert.equal(item.md5, entry.etag.replaceAll('"', ""));
    await assert.rejects(stat("public" + item.path), { code: "ENOENT" });
  }
});

test("standard build prepares Wrangler assets without duplicate R2 video binaries", async () => {
  const config = JSON.parse(await readFile("wrangler.jsonc", "utf8"));
  const directory = config.assets.directory;
  assert((await stat(directory + "/index.html")).isFile());
  assert((await stat(directory + "/brand/og.jpg")).isFile());
  const media = JSON.parse(
    await readFile("workers/site/local-media.json", "utf8"),
  );
  for (const item of media) {
    await assert.rejects(stat(directory + item.path), { code: "ENOENT" });
    await assert.rejects(stat("dist" + item.path), { code: "ENOENT" });
  }
  const content = await readFile("public/content/home.json", "utf8");
  for (const item of media) {
    assert(!content.includes(item.path));
    assert(content.includes(item.key));
  }
});

test("all migrated site assets are verified and removed; retired modules have no routes or nav links", async () => {
  const manifest = JSON.parse(
    await readFile("docs/evidence/r2-site-assets.json", "utf8"),
  );
  assert.equal(manifest.entries.length, 3061);
  for (const item of manifest.entries) {
    assert.equal(item.status, "verified", item.path);
    assert.equal(item.md5, item.etag, item.path);
    await assert.rejects(stat("public" + item.path), { code: "ENOENT" });
    await assert.rejects(stat("dist" + item.path), { code: "ENOENT" });
  }
  const routes = JSON.parse(
    await readFile("public/content/routes.json", "utf8"),
  );
  assert.equal(routes.length, 112);
  for (const { file, route } of routes) {
    assert(!["/shop", "/podcast"].includes(route));
    const text = await readFile("public/content/" + file, "utf8");
    assert(
      !text.includes('"href":"/shop"') && !text.includes('"href":"/podcast"'),
      file,
    );
  }
  for (const path of ["/podcast", "/shop"]) {
    await assert.rejects(stat("dist" + path), { code: "ENOENT" });
    assert(!(await readFile("dist/sitemap.xml", "utf8")).includes(path + "/"));
  }
});

test("site serves oversized media at unchanged URLs with seeking and restricted R2 access", async () => {
  const bundle = await build({
    entryPoints: ["workers/site/index.mjs"],
    bundle: true,
    write: false,
    format: "esm",
  });
  const mf = new Miniflare(
    convertV4MiniflareOptions({
      modules: true,
      script: bundle.outputFiles[0].text,
      compatibilityDate: "2026-10-09",
      r2Buckets: ["LOCAL_VIDEOS"],
      serviceBindings: {
        ASSETS: (request) =>
          new Response("static:" + new URL(request.url).pathname),
      },
    }),
  );
  try {
    const bucket = await mf.getR2Bucket("LOCAL_VIDEOS");
    const bytes = new Uint8Array(256).map((_, i) => i);
    await bucket.put("videos/vimeo/1168089886-1440p.mp4", bytes);
    await bucket.put("private.mp4", bytes);
    const site = JSON.parse(
      await readFile("docs/evidence/r2-site-assets.json", "utf8"),
    );
    const image = site.entries.find(
      (item) => item.contentType === "image/webp",
    );
    const audio = site.entries.find(
      (item) => item.contentType === "audio/mpeg",
    );
    const localVideo = site.entries.find(
      (item) => item.contentType === "video/mp4",
    );
    for (const item of [image, audio, localVideo]) {
      await bucket.put(item.key, bytes, {
        httpMetadata: { contentType: item.contentType },
      });
      const asset = await mf.dispatchFetch("https://studio.test" + item.path);
      assert.equal(asset.status, 200);
      assert.equal(asset.headers.get("Content-Type"), item.contentType);
      assert.deepEqual(new Uint8Array(await asset.arrayBuffer()), bytes);
      const seek = await mf.dispatchFetch("https://studio.test" + item.path, {
        headers: { Range: "bytes=10-19" },
      });
      assert.equal(seek.status, 206);
      assert.deepEqual(
        new Uint8Array(await seek.arrayBuffer()),
        bytes.slice(10, 20),
      );
    }
    const url = "https://studio.test/media/748af0586f32345b.mp4";
    const full = await mf.dispatchFetch(url);
    assert.equal(full.status, 200);
    assert.deepEqual(new Uint8Array(await full.arrayBuffer()), bytes);
    const range = await mf.dispatchFetch(url, {
      headers: { Range: "bytes=10-19" },
    });
    assert.equal(range.status, 206);
    assert.equal(range.headers.get("Content-Range"), "bytes 10-19/256");
    assert.deepEqual(
      new Uint8Array(await range.arrayBuffer()),
      bytes.slice(10, 20),
    );
    const head = await mf.dispatchFetch(url, { method: "HEAD" });
    assert.equal(head.headers.get("Content-Length"), "256");
    assert.equal((await head.arrayBuffer()).byteLength, 0);
    assert.equal((await mf.dispatchFetch(url, { method: "POST" })).status, 405);
    for (const path of [
      "/",
      "/about/",
      "/brand/og.jpg",
      "/videos/vimeo/1168089886-1440p.mp4",
      "/private.mp4",
      "/assets/index-test.js",
      "/assets/index-test.css",
      "/assets/unknown.webp",
      "/site/assets/unknown.webp",
    ])
      assert.equal(
        await (await mf.dispatchFetch("https://studio.test" + path)).text(),
        "static:" + path,
      );
    assert.equal(
      (await mf.dispatchFetch("https://studio.test/media/e89d3045a7786331.mp4"))
        .status,
      404,
    );
  } finally {
    await mf.dispose();
  }
});

test("every production route has crawler-readable Studio metadata and matching canonical URLs", async () => {
  const routes = JSON.parse(
    await readFile("public/content/routes.json", "utf8"),
  );
  for (const { route, file } of routes) {
    const page = JSON.parse(await readFile("public/content/" + file, "utf8"));
    const html = await readFile(
      route === "/" ? "dist/index.html" : "dist" + route + "/index.html",
      "utf8",
    );
    const $ = load(html);
    const url =
      "https://studio.henrywithu.com" + (route === "/" ? "/" : route + "/");
    assert.match($("title").text(), /Trapnest Studio/);
    assert.equal($("title").text(), page.title);
    assert.equal($('meta[property="og:title"]').attr("content"), page.title);
    assert.equal(
      $('meta[name="twitter:description"]').attr("content"),
      page.description,
    );
    assert.equal($('meta[property="og:url"]').attr("content"), url);
    assert.equal($('link[rel="canonical"]').attr("href"), url);
    assert.equal(
      $('meta[property="og:image"]').attr("content"),
      "https://studio.henrywithu.com/brand/og.jpg",
    );
  }
  assert.match(
    await readFile("dist/robots.txt", "utf8"),
    /studio.henrywithu.com\/sitemap.xml/,
  );
  assert.equal(
    load(await readFile("dist/404.html", "utf8"))('meta[name="robots"]').attr(
      "content",
    ),
    "noindex",
  );
});
