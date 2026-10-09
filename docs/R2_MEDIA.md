# Video storage in Cloudflare R2

Remote Vimeo MP4 renditions are migrated to the `studio` bucket under `videos/vimeo/`.
Local `/media/` files stay local. Desktop and mobile renditions retain separate keys.
The public, read-only `studio-media` Worker serves that prefix at
`https://studio-media.henrywithu.workers.dev/videos/…`. The bucket itself stays private;
other bucket prefixes are not exposed. The Worker supports streaming, HEAD, byte
ranges for seeking, conditional requests, and CORS. It does not proxy Vimeo at runtime.

`docs/evidence/r2-videos.json` records source URLs, reference pages, object keys,
import sizes, ETags, verification status, and unsupported sources. Only verified
objects replace source references, including JSON inside `data-thumbnails`.
Re-running the content extraction applies those aliases automatically.

## Delivery Worker

```sh
npm ci
npm run media:test
npm run media:browser            # Requires Chromium and a running Studio dev server
npm run media:deploy
```

Wrangler uses your Cloudflare authentication. The Worker binds directly to `studio`;
the frontend needs no R2 credentials. The app's normal build remains `npm run build`.
Use a custom Worker domain later if desired, then change the manifest's `baseUrl`
and reapply content aliases (or replace the old delivery origin in existing content).

## Migration

```sh
npm run media:plan                # Read content; no network or R2 changes
npm run media:refresh             # Refresh signed URLs from THE LINE's public pages
npx wrangler deploy --config workers/import/wrangler.jsonc
npx wrangler secret put IMPORT_TOKEN --config workers/import/wrangler.jsonc
STUDIO_IMPORT_TOKEN_FILE=/path/to/private-token npm run media:upload
npm run media:apply
npm run media:verify
npx wrangler delete --config workers/import/wrangler.jsonc
```

Use a random secret and a private token file outside the repository. Never commit
credentials. `STUDIO_IMPORT_URL` can select another deployed importer. The importer
accepts only authenticated imports from Vimeo's public progressive playback URLs
into the corresponding video key, streams directly into R2, and does not overwrite
existing objects. Uploads resume from the manifest and verify delivery metadata,
MP4 signatures, and byte ranges. Use `upload --limit 1` for a trial. Delete the
temporary importer after migration; it is not required for playback.

YouTube watch/embed URLs are not MP4s. They are tracked as unsupported rather than
uploaded as HTML. Failed Vimeo downloads retain their original sources and failure
details until a verified replacement is available. A Vimeo login is unnecessary
for the public signed file URLs; restricted files may need the owner's download/API access.

## Completed migration

317 Vimeo renditions (8,903,104,087 bytes) were imported and verified on October 9,
2026. The app's 83 affected content files now use R2, including thumbnail data and
406 video source attributes. The 24 existing local source attributes remain local.
The temporary `studio-video-import` Worker was deleted after transfer; only the
read-only delivery Worker remains deployed. All objects were checked for MP4 format,
content length, and byte-range delivery. YouTube downloads were blocked by the
execution environment's outbound proxy; the 16 YouTube source references remain external.

## Duplicate local files removed

Three local MP4s were subsequently matched byte-for-byte to existing verified R2
objects and removed from the working tree and rewritten Git history (73,514,454
bytes). The application now uses those R2 URLs directly, and the site Worker
supports their three old `/media/` URLs. Five other original local videos remain
unchanged. The 317 verified objects, delivery Worker and original verification
records are preserved. See [deployment configuration](CLOUDFLARE.md).
