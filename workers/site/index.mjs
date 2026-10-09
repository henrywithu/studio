import media from "../media/index.mjs";
import localMedia from "./local-media.json";
import siteMedia from "../../docs/evidence/r2-site-assets.json";

const mediaKeys = new Map(
  [...localMedia, ...siteMedia.entries].map((item) => [item.path, item.key]),
);

/** Preserve original media URLs using an explicit R2 allowlist; pages and bundles stay static. */
export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const key = mediaKeys.get(url.pathname);
    if (key) {
      url.pathname = "/" + key;
      return media.fetch(new Request(url, request), {
        VIDEOS: env.LOCAL_VIDEOS,
      });
    }
    return env.ASSETS.fetch(request);
  },
};
