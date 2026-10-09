import { readFile, stat } from "node:fs/promises";
import { spawnSync } from "node:child_process";

// Upload only the two oversized local files, under a new prefix. Never touches videos/vimeo/.
const storageMode = process.argv.includes("--local") ? "--local" : "--remote";
const media = JSON.parse(await readFile("workers/site/local-media.json", "utf8"));
for (const item of media) {
  await stat("public" + item.path);
  const result = spawnSync(process.execPath, [
    "node_modules/wrangler/bin/wrangler.js", "r2", "object", "put", "studio/" + item.key,
    "--file", "public" + item.path, "--content-type", "video/mp4", storageMode,
  ], { stdio: "inherit" });
  if (result.error) throw result.error;
  if (result.status !== 0) process.exit(result.status || 1);
}
