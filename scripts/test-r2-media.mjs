import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";
import { Miniflare, convertV4MiniflareOptions } from "miniflare";

test("R2 delivery streams MP4s with browser range, cache and access semantics", async () => {
  const mf = new Miniflare(convertV4MiniflareOptions({
    modules: true,
    script: await readFile(new URL("../workers/media/index.mjs", import.meta.url), "utf8"),
    compatibilityDate: "2026-10-09",
    r2Buckets: ["VIDEOS"],
  }));
  try {
    const bucket = await mf.getR2Bucket("VIDEOS");
    const bytes = new Uint8Array(256).map((_, i) => i);
    await bucket.put("videos/vimeo/123-1080p.mp4", bytes, { httpMetadata: { contentType: "video/mp4" } });
    await bucket.put("private.mp4", bytes);
    const url = "https://media.test/videos/vimeo/123-1080p.mp4";
    const full = await mf.dispatchFetch(url);
    assert.equal(full.status, 200);
    assert.equal(full.headers.get("content-type"), "video/mp4");
    assert.equal(full.headers.get("access-control-allow-origin"), "*");
    assert.deepEqual(new Uint8Array(await full.arrayBuffer()), bytes);
    const head = await mf.dispatchFetch(url, { method: "HEAD", headers: { Range: "bytes=0-31" } });
    assert.equal(head.status, 200);
    assert.equal(head.headers.get("content-length"), "256");
    assert.equal((await head.arrayBuffer()).byteLength, 0);
    for (const [range, contentRange, expected] of [
      ["bytes=0-31", "bytes 0-31/256", bytes.slice(0, 32)],
      ["bytes=200-", "bytes 200-255/256", bytes.slice(200)],
      ["bytes=-10", "bytes 246-255/256", bytes.slice(246)],
      ["bytes=250-999", "bytes 250-255/256", bytes.slice(250)],
    ]) {
      const response = await mf.dispatchFetch(url, { headers: { Range: range } });
      assert.equal(response.status, 206);
      assert.equal(response.headers.get("content-range"), contentRange);
      assert.deepEqual(new Uint8Array(await response.arrayBuffer()), expected);
    }
    for (const range of ["bytes=256-", "bytes=-0", "bytes=10-5"]) {
      const response = await mf.dispatchFetch(url, { headers: { Range: range } });
      assert.equal(response.status, 416);
      assert.equal(response.headers.get("content-range"), "bytes */256");
    }
    const cached = await mf.dispatchFetch(url, { headers: { "If-None-Match": `W/${full.headers.get("etag")}` } });
    assert.equal(cached.status, 304);
    const modified = await mf.dispatchFetch(url, { headers: { "If-Modified-Since": head.headers.get("last-modified") } });
    assert.equal(modified.status, 304);
    const mismatch = await mf.dispatchFetch(url, { headers: { Range: "bytes=0-31", "If-Range": '"stale"' } });
    assert.equal(mismatch.status, 200);
    await mismatch.arrayBuffer();
    assert.equal((await mf.dispatchFetch(url, { method: "OPTIONS" })).status, 204);
    assert.equal((await mf.dispatchFetch(url, { method: "PUT", body: "bad" })).status, 405);
    assert.equal((await mf.dispatchFetch("https://media.test/private.mp4")).status, 404);
    assert.equal((await mf.dispatchFetch("https://media.test/videos/missing.mp4")).status, 404);
  } finally {
    await mf.dispose();
  }
});

test("temporary importer authenticates, restricts sources and preserves existing objects", async () => {
  let sourceFetches = 0;
  const bytes = new Uint8Array(32);
  bytes.set([102, 116, 121, 112], 4);
  const mf = new Miniflare(convertV4MiniflareOptions({
    modules: true,
    script: await readFile(new URL("../workers/import/index.mjs", import.meta.url), "utf8"),
    compatibilityDate: "2026-10-09",
    r2Buckets: ["VIDEOS"],
    bindings: { IMPORT_TOKEN: "local-test-token" },
    outboundService: async () => {
      sourceFetches++;
      return new Response(bytes, { headers: { "Content-Type": "video/mp4", "Content-Length": "32" } });
    },
  }));
  try {
    const url = "https://import.test/import";
    const body = JSON.stringify({
      source: "https://player.vimeo.com/progressive_redirect/playback/123/rendition/1080p/file.mp4",
      key: "videos/vimeo/123-1080p.mp4",
    });
    assert.equal((await mf.dispatchFetch(url, { method: "POST", body })).status, 401);
    const headers = { Authorization: "Bearer local-test-token", "Content-Type": "application/json" };
    for (const source of ["https://example.com/video.mp4", "http://player.vimeo.com/video.mp4", "https://player.vimeo.com@localhost/video.mp4"]) {
      const invalid = await mf.dispatchFetch(url, { method: "POST", headers,
        body: JSON.stringify({ source, key: "videos/vimeo/123-1080p.mp4" }) });
      assert.equal(invalid.status, 400);
    }
    assert.equal(sourceFetches, 0);
    const imported = await mf.dispatchFetch(url, { method: "POST", headers, body });
    assert.equal(imported.status, 200, await imported.clone().text());
    assert.equal((await imported.json()).size, 32);
    const existing = await mf.dispatchFetch(url, { method: "POST", headers, body });
    assert.equal((await existing.json()).existing, true);
    assert.equal(sourceFetches, 1);
    const bucket = await mf.getR2Bucket("VIDEOS");
    const stored = await bucket.get("videos/vimeo/123-1080p.mp4");
    assert.deepEqual(new Uint8Array(await stored.arrayBuffer()), bytes);
  } finally {
    await mf.dispose();
  }
});
