import { timingSafeEqual } from "node:crypto";
export default {
  async fetch(request, env) {
    const expected = new TextEncoder().encode("Bearer " + env.IMPORT_TOKEN);
    const actual = new TextEncoder().encode(
      request.headers.get("Authorization") || "",
    );
    if (
      !env.IMPORT_TOKEN ||
      actual.length !== expected.length ||
      !timingSafeEqual(actual, expected)
    )
      return new Response("Unauthorized", { status: 401 });
    const key = new URL(request.url).pathname.slice(1);
    if (
      !/^site\/(assets|media|audio|images)\/[a-zA-Z0-9/_.-]+$/.test(key) ||
      key.includes("..") ||
      request.method !== "PUT"
    )
      return new Response("Invalid request", { status: 400 });
    const hash = request.headers.get("X-Content-MD5");
    if (!/^[a-f0-9]{32}$/.test(hash || ""))
      return new Response("Checksum required", { status: 400 });
    const old = await env.MEDIA.head(key);
    if (old)
      return Response.json(
        { key, bytes: old.size, etag: old.etag },
        { status: old.etag === hash ? 200 : 409 },
      );
    const object = await env.MEDIA.put(key, request.body, {
      md5: hash,
      onlyIf: { etagDoesNotMatch: "*" },
      httpMetadata: {
        contentType:
          request.headers.get("Content-Type") || "application/octet-stream",
        cacheControl: "public, max-age=31536000, immutable",
      },
    });
    if (!object) return new Response("Object exists", { status: 409 });
    return Response.json({ key, bytes: object.size, etag: object.etag });
  },
};
