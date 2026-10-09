import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import siteMedia from "./docs/evidence/r2-site-assets.json";
const redirects = new Map(
  siteMedia.entries
    .filter((item) => item.status === "verified")
    .map((item) => [item.path, item.key]),
);
const r2Media = {
  name: "r2-media",
  configureServer(server: import("vite").ViteDevServer) {
    server.middlewares.use((request, response, next) => {
      const url = new URL(request.url || "/", "http://localhost");
      const key = redirects.get(url.pathname);
      if (!key) return next();
      response.writeHead(302, {
        Location: `${siteMedia.baseUrl}/${key}${url.search}`,
      });
      response.end();
    });
  },
};
export default defineConfig({
  plugins: [react(), r2Media],
  server: { host: "0.0.0.0", port: 5173 },
  build: { target: "es2022" },
});
