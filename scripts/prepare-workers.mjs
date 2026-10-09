import { cp, rm, readdir, stat, readFile, mkdir } from "node:fs/promises";
import { join } from "node:path";
import assert from "node:assert/strict";

const limit = 25 * 1024 * 1024;
const media = [...JSON.parse(
  await readFile("workers/site/local-media.json", "utf8"),
), ...JSON.parse(await readFile("docs/evidence/r2-site-assets.json", "utf8")).entries];
await rm(".cloudflare/assets", { recursive: true, force: true });
await mkdir(".cloudflare", { recursive: true });
await cp("dist", ".cloudflare/assets", { recursive: true });
let count = 0;
async function check(directory) {
  for (const item of await readdir(directory, { withFileTypes: true })) {
    const path = join(directory, item.name);
    if (item.isDirectory()) await check(path);
    else {
      assert(
        (await stat(path)).size <= limit,
        `${path} exceeds Workers' static asset limit`,
      );
      count++;
    }
  }
}
await check(".cloudflare/assets");
assert(count <= 20000, "Asset count exceeds Workers Free plan limit");
for (const item of media) {
  await assert.rejects(stat("public" + item.path), { code: "ENOENT" });
  await assert.rejects(stat("dist" + item.path), { code: "ENOENT" });
}
console.log(
  `Prepared ${count} Workers assets. R2-backed media have no local duplicate files.`,
);
