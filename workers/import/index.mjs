/** Temporary migration Worker. Set IMPORT_TOKEN as a secret; delete Worker after use. */
export default {
  async fetch(request, env) {
    if (!env.IMPORT_TOKEN) return new Response("Importer disabled", { status: 503 });
    const encoder = new TextEncoder();
    const [actual, expected] = await Promise.all([
      crypto.subtle.digest("SHA-256", encoder.encode(request.headers.get("Authorization") || "")),
      crypto.subtle.digest("SHA-256", encoder.encode(`Bearer ${env.IMPORT_TOKEN}`)),
    ]);
    if (!crypto.subtle.timingSafeEqual(actual, expected))
      return new Response("Unauthorized", { status: 401 });
    if (request.method !== "POST" || new URL(request.url).pathname !== "/import")
      return new Response("Not found", { status: 404 });
    if (Number(request.headers.get("Content-Length") || 0) > 8192)
      return new Response("Request too large", { status: 413 });
    let source, key;
    try {
      ({ source, key } = await request.json());
      const url = new URL(source);
      const match = /^\/progressive_redirect\/playback\/(\d+)\/rendition\/(\d+p)\//.exec(url.pathname);
      if (url.protocol !== "https:" || url.hostname !== "player.vimeo.com" ||
        url.username || url.password || url.port || !match ||
        key !== `videos/vimeo/${match[1]}-${match[2]}.mp4`)
        return new Response("Source or key not allowed", { status: 400 });
    } catch {
      return new Response("Invalid request", { status: 400 });
    }
    try {
      const existing = await env.VIDEOS.head(key);
      if (existing) return Response.json({ key, size: existing.size, etag: existing.etag, existing: true });
      const response = await fetch(source, {
        headers: { Referer: "https://thelinestudio.com/" },
        signal: AbortSignal.timeout(600000),
      });
      const size = Number(response.headers.get("Content-Length"));
      if (response.status !== 200 || !response.body ||
        !/^(video\/mp4|application\/octet-stream)(;|$)/i.test(response.headers.get("Content-Type") || "") ||
        !Number.isSafeInteger(size) || size <= 0) {
        await response.body?.cancel();
        return Response.json({ error: "Source did not return a complete video", sourceStatus: response.status }, { status: 502 });
      }
      const object = await env.VIDEOS.put(key, response.body, {
        onlyIf: { etagDoesNotMatch: "*" },
        httpMetadata: { contentType: "video/mp4", cacheControl: "public, max-age=31536000, immutable" },
        customMetadata: { source, importedAt: new Date().toISOString() },
      });
      if (!object) return new Response("Concurrent import; retry", { status: 409 });
      if (object.size !== size) throw new Error("Stored video length differs from source");
      console.log(JSON.stringify({ event: "video_imported", key, size: object.size }));
      return Response.json({ key, size: object.size, etag: object.etag });
    } catch (error) {
      console.error(JSON.stringify({ event: "video_import_failed", key, message: String(error) }));
      return Response.json({ error: String(error) }, { status: 502 });
    }
  },
};
