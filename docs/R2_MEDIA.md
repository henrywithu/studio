# Video storage in Cloudflare R2

Remote Vimeo MP4 renditions are migrated to the `studio` bucket under `videos/vimeo/`.
Former local media files now live under `site/` in R2. Desktop and mobile renditions retain separate keys.
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
supports their three old `/media/` URLs. The five other original videos were subsequently migrated without changing their bytes. The 317 verified objects, delivery Worker and original verification
records are preserved. See [deployment configuration](CLOUDFLARE.md).

## Full site-media migration

All 3,061 former local images, videos and audio files (639,924,419 bytes) are now in
`studio/site/`, with their paths, MIME types, MD5/SHA-256 checksums and Git blob IDs
recorded in `docs/evidence/r2-site-assets.json`. R2 validates each upload's checksum.
An independent bucket inventory matched every key, byte count and MD5; all 3,061
public URLs passed delivery verification, including audio/video range requests.
`docs/evidence/r2-site-delivery.json` records this check. The original 317 Vimeo
objects and verification records are preserved.

The site Worker uses an explicit URL allowlist to serve existing `/assets/`,
`/media/`, `/audio/` and `/images/` paths directly from R2. Build bundles under
`/assets/` still use Workers Static Assets. `npm run dev` redirects known media
paths to the read-only media Worker, so no binaries need to be downloaded for
local development. `npm run media:site:verify` checks all active migrated media.

Podcast and Explore are removed from the live site's pages and navigation.
Unused migrated images and retired Podcast audio are identified by the runtime usage audit for removal from R2; all referenced archive media is preserved. The temporary authenticated
upload Worker is deleted after migration; production requires no upload token.
All four binary directories are excluded from Git and purged from its history.

For future local-media additions, temporarily deploy `workers/asset-import/wrangler.jsonc`,
set its `IMPORT_TOKEN` secret, add pending manifest entries, and run
`STUDIO_IMPORT_TOKEN_FILE=/private/token python3 scripts/migrate-site-assets.py`.
The importer only accepts authenticated PUTs in the `site/` prefix, checks MD5 during
upload, and refuses to overwrite existing objects. Verify delivery before removing
local files; delete the importer again when finished.

## Runtime usage and cleanup

`npm run media:audit` scans every deployed content section and source asset reference,
including encoded carousel data, against both manifests. It writes
`docs/evidence/r2-usage.json` and rejects runtime references to retired or deleted objects.
Provenance-only metadata is excluded; the three documented legacy video URLs remain supported.
The site and development media allowlists serve only entries marked `verified`.
Historical records marked `retired` or `deleted` remain for checksum and migration evidence.

Cleanup is limited to exact audited keys in the owned `studio` bucket, after deploying
and verifying their replacement content. Reconcile sizes and ETags against the bucket
before deleting; independently list the bucket afterward to confirm removal. Preserve
every referenced object and all 317 original video renditions. Do not use prefix deletion.
