# Deploy Trapnest Studio to Cloudflare Workers

The production hostname is **studio.henrywithu.com**. `wrangler.jsonc` configures the `studio` Worker, its custom domain, static assets and the existing `studio` R2 bucket. Cloudflare Workers Builds deployed the site on 9 October 2026. The configuration name matches the connected Worker, `studio`.

## Deploy

Use the Cloudflare account that owns `henrywithu.com` and the existing `studio` bucket. Authenticate Wrangler through your usual login or a `CLOUDFLARE_API_TOKEN` supplied outside the repository. The identity needs Workers deployment, permissions for the custom domain in that zone.

```sh
npm ci
npm run deploy:check   # Build, prepare, validate; no production or R2 changes
npm run workers:test  # Local R2 delivery and metadata checks; run after the build
npm run deploy        # Build and deploy the site Worker; no R2 uploads
```

For Cloudflare Workers Builds connected to this repository, select `main`, use `npm run build` as the build command and `npx wrangler deploy` as the deploy command. The standard build automatically runs `postbuild` to create `.cloudflare/assets`; no separate preparation command is needed. Production uses existing R2 objects and needs no media upload step. `npm run deploy` also supports deployment from a local authenticated machine or CI.

Wrangler attaches `studio.henrywithu.com` as a custom domain and provisions its certificate. If an existing DNS record already occupies that exact hostname, resolve that record in the Cloudflare dashboard before attaching the custom domain. The main Trapnest site uses a different hostname.

## Preserved media

All 317 verified Vimeo renditions continue using the existing `studio-media` Worker and `videos/vimeo/` objects. This deployment does not redeploy that Worker or alter those objects. It does not rerun the migration or importer.

Three original MP4s are byte-identical to existing verified R2 objects:

| Existing URL | Bytes | R2 key |
| --- | ---: | --- |
| `/media/2fa5e6d065819f13.mp4` | 4,639,186 | `videos/vimeo/1007627724-1080p.mp4` |
| `/media/748af0586f32345b.mp4` | 39,750,246 | `videos/vimeo/1168089886-1440p.mp4` |
| `/media/e89d3045a7786331.mp4` | 29,125,022 | `videos/vimeo/1075238854-1440p.mp4` |

These files are byte-identical to three already-verified objects in the Vimeo migration. Their sizes and MD5 hashes match the recorded R2 ETags. The site Worker reads those existing keys and streams them at the original local URLs, with range/HEAD/conditional-request support. The URL allowlist also covers the subsequently migrated site media; it does not expose arbitrary R2 keys. No additional media upload or R2 write permission is needed.

Keep Cloudflare Workers Builds connected to the `studio` Worker. The config name matches it, so CLI deployment also targets the same Worker as CI.

The application now requests these three videos directly from the existing media Worker. Their redundant local binaries have been removed from `public/`, deployment output and rewritten Git history. The site Worker preserves the three legacy `/media/` URLs for existing links. The five other original local videos are now stored under `site/media/` in R2 with unchanged bytes. The 317 original R2 objects and their verification records are untouched.

The build's `postbuild` lifecycle runs `scripts/prepare-workers.mjs`, creating the ignored `.cloudflare/assets/` package and verifying static asset size/count limits and the absence of R2 duplicate files. `workers:prepare` can also run this step independently.

## Routing and metadata

The build emits an HTML shell for each of the 112 known routes, with route-specific title, description, canonical, OG and Twitter metadata available before JavaScript runs. This preserves client-side transitions while supporting direct visits, search crawlers and social previews. Canonical URLs use trailing slashes. Unknown paths return the Studio 404 page with `noindex`; missing JSON, images and media do not silently become the home page.

`dist/sitemap.xml` and `dist/robots.txt` are generated from the route inventory. Static asset headers are defined in `public/_headers`. The custom domain and all metadata use `https://studio.henrywithu.com`.

## Preview and smoke check

```sh
npm run workers:dev
```

Vite and Workers previews use the verified public R2 URLs directly; no binary seeding or production upload is needed. The compatibility `/media/` endpoints are available on production; a local Worker test seeds temporary fixture bytes to exercise those endpoints. `workers:test` verifies seeking, HEAD responses, method restrictions and isolation from private keys.

After deployment, check `/`, `/about/`, `/blog/`, an archive deep link, `/brand/og.jpg`, `/robots.txt`, `/sitemap.xml` and an unknown path. Confirm byte-range playback on the three legacy media URLs and the existing R2 rendition URLs.

Sources: [Workers Static Assets](https://developers.cloudflare.com/workers/static-assets/), [routing](https://developers.cloudflare.com/workers/static-assets/routing/), [static asset limits](https://developers.cloudflare.com/workers/platform/limits/#static-assets), [Wrangler configuration](https://developers.cloudflare.com/workers/wrangler/configuration/).

## Site media in R2

All former local images, videos and audio are mapped by
`docs/evidence/r2-site-assets.json` to byte-identical R2 objects under `site/`.
The site Worker preserves their original URLs and streams them with MIME types,
HEAD, ETags and byte ranges. It uses the existing `LOCAL_VIDEOS` R2 binding.
`run_worker_first` covers `/assets/*`, `/media/*`, `/audio/*` and `/images/*`;
unknown asset paths, including built JavaScript/CSS, fall through to Static Assets.
The build now prepares 242 files rather than bundling 640 MB of binary media.
The fonts, OG, logo, favicon and content JSON remain static assets.
Podcast and Explore (`/podcast/`, `/shop/`) return the site's normal 404.
