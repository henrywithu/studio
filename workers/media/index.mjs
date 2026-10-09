/** Public, read-only delivery of the migrated video prefix in the studio bucket. */
export default {
  async fetch(request, env) {
    const headers = new Headers({
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, HEAD, OPTIONS",
      "Access-Control-Allow-Headers": "Range, If-Range, If-None-Match, If-Modified-Since",
      "Access-Control-Expose-Headers": "Content-Length, Content-Range, Accept-Ranges, ETag",
      "Accept-Ranges": "bytes",
      "X-Content-Type-Options": "nosniff",
    });
    const reply = (body, status) => new Response(body, { status, headers });
    if (request.method === "OPTIONS") return reply(null, 204);
    if (!["GET", "HEAD"].includes(request.method)) {
      headers.set("Allow", "GET, HEAD, OPTIONS");
      return reply("Method not allowed", 405);
    }
    let key;
    try {
      key = decodeURIComponent(new URL(request.url).pathname.slice(1));
    } catch {
      return reply("Invalid path", 400);
    }
    if (!/^videos\/[a-zA-Z0-9/_-]+\.mp4$/.test(key))
      return reply("Not found", 404);
    try {
      const meta = await env.VIDEOS.head(key);
      if (!meta) return reply("Not found", 404);
      meta.writeHttpMetadata(headers);
      headers.set("Content-Type", "video/mp4");
      headers.set("Cache-Control", "public, max-age=31536000, immutable");
      headers.set("ETag", meta.httpEtag);
      headers.set("Last-Modified", meta.uploaded.toUTCString());
      const noneMatch = request.headers.get("If-None-Match");
      const modifiedSince = request.headers.get("If-Modified-Since");
      if (
        (noneMatch && noneMatch.split(",").some((tag) =>
          tag.trim() === "*" || tag.trim().replace(/^W\//, "") === meta.httpEtag)) ||
        (!noneMatch && modifiedSince &&
          Date.parse(modifiedSince) >= Math.floor(meta.uploaded.getTime() / 1000) * 1000)
      ) return reply(null, 304);
      if (request.method === "HEAD") {
        headers.set("Content-Length", String(meta.size));
        return reply(null, 200);
      }
      const ifRange = request.headers.get("If-Range");
      const useRange = !ifRange || ifRange === meta.httpEtag ||
        Date.parse(ifRange) >= Math.floor(meta.uploaded.getTime() / 1000) * 1000;
      const range = useRange ? parseRange(request.headers.get("Range"), meta.size) : null;
      if (range === false) {
        headers.delete("Cache-Control");
        headers.set("Content-Range", `bytes */${meta.size}`);
        return reply(null, 416);
      }
      const object = await env.VIDEOS.get(key, {
        ...(range ? { range } : {}),
        onlyIf: { etagMatches: meta.etag },
      });
      if (!object) return reply("Not found", 404);
      if (!("body" in object)) return reply(null, 412);
      headers.set("Content-Length", String(range ? range.length : object.size));
      if (range) headers.set("Content-Range",
        `bytes ${range.offset}-${range.offset + range.length - 1}/${object.size}`);
      return reply(object.body, range ? 206 : 200);
    } catch (error) {
      console.error(JSON.stringify({ event: "video_delivery_failed", key, message: String(error) }));
      headers.delete("Cache-Control");
      return reply("Video temporarily unavailable", 503);
    }
  },
};

/** Unsupported/malformed multipart ranges are ignored; unsatisfiable ranges return false. */
export function parseRange(value, size) {
  const match = /^bytes=(\d*)-(\d*)$/.exec(value || "");
  if (!match || (!match[1] && !match[2])) return null;
  const start = match[1] ? Number(match[1]) : Math.max(0, size - Number(match[2]));
  const end = match[1] && match[2] ? Math.min(Number(match[2]), size - 1) : size - 1;
  if (!Number.isSafeInteger(start) || !Number.isSafeInteger(end) ||
    start >= size || end < start || (!match[1] && Number(match[2]) === 0)) return false;
  return { offset: start, length: end - start + 1 };
}
