import media from "../media/index.mjs";
import localMedia from "./local-media.json";

/** Preserve the three legacy media URLs using verified R2 objects; pages remain static. */
export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const video = localMedia.find(item => item.path === url.pathname);
    if (video) {
      url.pathname = "/" + video.key;
      return media.fetch(new Request(url, request), { VIDEOS: env.LOCAL_VIDEOS });
    }
    return env.ASSETS.fetch(request);
  },
};
