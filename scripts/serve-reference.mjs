/** Research-only replay server. Original JS never enters Studio's application or build. */
import http from "node:http";
import { readFile } from "node:fs/promises";
import path from "node:path";
const root = path.resolve("research/reference");
const mime = {
  ".html": "text/html",
  ".js": "text/javascript",
  ".css": "text/css",
  ".json": "application/json",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".webp": "image/webp",
  ".mp4": "video/mp4",
  ".mp3": "audio/mpeg",
};
http
  .createServer(async (req, res) => {
    try {
      const url = new URL(req.url, "http://localhost");
      const p = decodeURIComponent(url.pathname);
      let file;
      if (p.startsWith("/_nuxt/")) file = path.join(root, p);
      else if (p.endsWith("/_payload.json")) {
        const route = p.slice(1, -14).replace(/\/$/, "");
        file = path.join(
          root,
          "payloads",
          (route.replaceAll("/", "__") || "home") + ".json",
        );
      } else if (/^\/(fonts|favicons|images|assets|media|audio)\//.test(p))
        file = path.resolve("public", "." + p);
      else
        file = path.join(
          root,
          "pages",
          (p.slice(1).replace(/\/$/, "").replaceAll("/", "__") || "home") +
            ".html",
        );
      if (!file.startsWith(root) && !file.startsWith(path.resolve("public")))
        throw Error("Invalid path");
      const data = await readFile(file);
      res.writeHead(200, {
        "Content-Type": mime[path.extname(file)] || "application/octet-stream",
      });
      res.end(data);
    } catch {
      res.writeHead(404);
      res.end("Not found");
    }
  })
  .listen(5174, "0.0.0.0", () =>
    console.log("Research reference replay: http://localhost:5174"),
  );
