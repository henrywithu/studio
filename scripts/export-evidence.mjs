/** Export provenance and hashes without placing production application code in the client. */
import { readFile, writeFile, readdir, stat, mkdir } from "node:fs/promises";
import { createHash } from "node:crypto";
const sha = (buffer) => createHash("sha256").update(buffer).digest("hex");
await mkdir("docs/evidence", { recursive: true });
const images = JSON.parse(
  await readFile("research/assets-manifest.json", "utf8"),
);
const aliases = {
  ...JSON.parse(await readFile("research/video-aliases.json", "utf8")),
  ...JSON.parse(await readFile("research/audio-aliases.json", "utf8")),
};
const sources = [
  ...images.map((item) => ({ source: item.url, path: item.path })),
  ...Object.entries(aliases).map(([source, path]) => ({
    source,
    path: "public" + path,
  })),
];
const inventory = [];
const r2Media = [
  ...JSON.parse(await readFile("workers/site/local-media.json", "utf8")),
  ...JSON.parse(await readFile("docs/evidence/r2-site-assets.json", "utf8"))
    .entries,
];
for (const item of sources) {
  const remote = r2Media.find((video) => "public" + video.path === item.path);
  if (remote) {
    inventory.push({
      ...item,
      bytes: remote.bytes,
      sha256: remote.sha256,
      storage: "r2",
      key: remote.key,
    });
    continue;
  }
  const buffer = await readFile(item.path);
  inventory.push({ ...item, bytes: buffer.byteLength, sha256: sha(buffer) });
}
for (const directory of ["public/fonts", "public/favicons", "public/images"])
  for (const name of await readdir(directory)) {
    const path = directory + "/" + name;
    if ((await stat(path)).isFile()) {
      const buffer = await readFile(path);
      inventory.push({
        source: "https://thelinestudio.com/" + path.slice(7),
        path,
        bytes: buffer.byteLength,
        sha256: sha(buffer),
      });
    }
  }
await writeFile(
  "docs/evidence/assets.json",
  JSON.stringify(inventory, null, 2) + "\n",
);
const resources = [];
for (const name of await readdir("research/reference/_nuxt")) {
  const path = "research/reference/_nuxt/" + name;
  if (!(await stat(path)).isFile()) continue;
  const buffer = await readFile(path);
  resources.push({
    source: "https://thelinestudio.com/_nuxt/" + name,
    bytes: buffer.byteLength,
    sha256: sha(buffer),
  });
}
await writeFile(
  "docs/evidence/reference-resources.json",
  JSON.stringify(resources, null, 2) + "\n",
);
const totals = {
  imageCrops: images.length,
  localVideos: Object.values(aliases).filter(
    (v) => v.endsWith(".mp4") && !r2Media.some((video) => video.path === v),
  ).length,
  r2BackedLocalUrls: r2Media.length,
  localAudio: Object.values(aliases).filter(
    (v) => v.endsWith(".mp3") && !r2Media.some((item) => item.path === v),
  ).length,
  files: inventory.filter((item) => item.storage !== "r2").length,
  bytes: inventory.reduce(
    (sum, item) => sum + (item.storage === "r2" ? 0 : item.bytes),
    0,
  ),
  referenceResources: resources.length,
};
await writeFile(
  "docs/evidence/inventory.json",
  JSON.stringify(totals, null, 2) + "\n",
);
console.log(totals);
