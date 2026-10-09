import assert from "node:assert/strict";
import { readFile, writeFile } from "node:fs/promises";
import { request } from "playwright";
import { createHash } from "node:crypto";

const manifest = JSON.parse(
  await readFile("docs/evidence/r2-site-assets.json", "utf8"),
);
const proxy = process.env.HTTPS_PROXY || process.env.HTTP_PROXY;
const transport = await request.newContext(
  proxy ? { proxy: { server: proxy } } : {},
);
const entries = manifest.entries;
let next = 0;
let verified = 0;
const errors = [];
try {
  await Promise.all(
    Array.from({ length: 16 }, async () => {
      while (next < entries.length) {
        const item = entries[next++];
        const url = process.env.STUDIO_ORIGIN
          ? process.env.STUDIO_ORIGIN + item.path
          : manifest.baseUrl + "/" + item.key;
        try {
          let response;
          for (let attempt = 0; attempt < 3; attempt++) {
            response = await transport.head(url, { timeout: 60000 });
            if (response.ok()) break;
            await response.dispose();
          }
          assert.equal(response.status(), 200, url);
          const headers = response.headers();
          if (item.contentType === "image/svg+xml") {
            // Cloudflare may compress SVGs and omit their HEAD Content-Length.
            const image = await transport.get(url);
            assert.equal(image.status(), 200, url);
            const buffer = await image.body();
            assert.equal(buffer.byteLength, item.bytes, url);
            assert.equal(
              createHash("md5").update(buffer).digest("hex"),
              item.md5,
              url,
            );
            await image.dispose();
          } else {
            assert.equal(Number(headers["content-length"]), item.bytes, url);
            assert.equal(headers.etag?.replaceAll('"', ""), item.md5, url);
          }
          assert.equal(headers["content-type"], item.contentType, url);
          await response.dispose();
          if (
            item.contentType.startsWith("video/") ||
            item.contentType.startsWith("audio/")
          ) {
            const range = await transport.get(url, {
              headers: { Range: "bytes=0-31" },
            });
            assert.equal(range.status(), 206, url);
            assert.equal(
              range.headers()["content-range"],
              `bytes 0-31/${item.bytes}`,
              url,
            );
            assert.equal((await range.body()).byteLength, 32, url);
            await range.dispose();
          }
          verified++;
          if (verified % 300 === 0)
            console.log("Verified delivery:", verified, "/", entries.length);
        } catch (error) {
          errors.push({ path: item.path, error: String(error) });
        }
      }
    }),
  );
  const report = {
    date: new Date().toISOString(),
    origin: process.env.STUDIO_ORIGIN || manifest.baseUrl,
    files: entries.length,
    verified,
    bytes: entries.reduce((n, e) => n + e.bytes, 0),
    errors,
  };
  await writeFile(
    `docs/evidence/r2-site-${process.env.STUDIO_ORIGIN ? "live" : "delivery"}.json`,
    JSON.stringify(report, null, 2) + "\n",
  );
  console.log(JSON.stringify(report));
  assert.equal(errors.length, 0);
} finally {
  await transport.dispose();
}
