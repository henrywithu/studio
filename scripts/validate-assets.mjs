import assert from "node:assert/strict";
import { readFile, readdir, stat } from "node:fs/promises";
const inventory = JSON.parse(
  await readFile("docs/evidence/assets.json", "utf8"),
);
const videos = JSON.parse(
  await readFile("docs/evidence/r2-videos.json", "utf8"),
);
const siteMedia = JSON.parse(
  await readFile("docs/evidence/r2-site-assets.json", "utf8"),
);
for (const item of inventory) {
  if (item.storage === "r2") {
    const object = [...videos.entries, ...siteMedia.entries].find(
      (entry) => entry.key === item.key,
    );
    assert(["verified", "retired", "deleted"].includes(object?.status), item.path);
    assert.equal(object.bytes, item.bytes, item.path);
    await assert.rejects(stat(item.path), { code: "ENOENT" });
    continue;
  }
  const file = await stat(item.path);
  assert.equal(file.size, item.bytes, item.path);
}
const resources = new Set();
let nodes = 0;
function walk(value) {
  if (!value || typeof value !== "object") return;
  if (value.tag) {
    nodes++;
    assert.notEqual(value.tag, "script");
    for (const [key, v] of Object.entries(value.attrs)) {
      assert(!key.startsWith("on"), "Executable attribute");
      if (
        [
          "src",
          "data-src",
          "data-src-small",
          "data-preview",
          "data-audio",
        ].includes(key) &&
        /^\/(assets|fonts|media|audio|images|favicons)\//.test(v)
      )
        resources.add("public" + v);
      if (key === "srcset")
        for (const part of v.split(",")) {
          const u = part.trim().split(" ")[0];
          if (u.startsWith("/assets/")) resources.add("public" + u);
        }
    }
  }
  for (const v of Object.values(value)) if (typeof v === "object") walk(v);
}
for (const name of await readdir("public/content"))
  if (name.endsWith(".json"))
    walk(JSON.parse(await readFile("public/content/" + name, "utf8")));
for (const path of resources) {
  const remote = siteMedia.entries.find(
    (item) => "public" + item.path === path,
  );
  if (remote) assert.equal(remote.status, "verified", path);
  else await stat(path);
}
console.log({
  inventoriedFiles: inventory.length,
  localFiles: inventory.filter((item) => item.storage !== "r2").length,
  r2DuplicatesRemoved: inventory.filter((item) => item.storage === "r2").length,
  renderedAssetReferences: resources.size,
  nodes,
  missing: 0,
  executableContent: 0,
});
