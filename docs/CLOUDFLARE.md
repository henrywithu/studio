# Deploy Trapnest Studio to Cloudflare Workers

The production hostname is **studio.henrywithu.com**. `wrangler.jsonc` configures the `trapnest-studio` Worker, its custom domain, static assets and the existing `studio` R2 bucket. This setup has been validated locally; the site has not been deployed by this branding task.

## Deploy

Use the Cloudflare account that owns `henrywithu.com` and the existing `studio` bucket. Authenticate Wrangler through your usual login or a `CLOUDFLARE_API_TOKEN` supplied outside the repository. The identity needs Workers deployment, R2 write access for the two local files, and permissions for the custom domain in that zone.

```sh
npm ci
npm run deploy:check   # Build, prepare, validate; no production or R2 changes
npm run workers:test  # Local R2 delivery and metadata checks; run after the build
npm run deploy        # Build, upload two local files to R2, deploy the site Worker
```

For Cloudflare Workers Builds connected to this repository, select `main`, use `npm run build` as the build command and `npm run workers:upload-media && npx wrangler deploy` as the deploy command. The standard build automatically runs `postbuild` to create `.cloudflare/assets`; no separate preparation command is needed. The upload step handles only the two oversized local videos and requires R2 write permission. `npm run deploy` also supports deployment from a local authenticated machine or CI.

Wrangler attaches `studio.henrywithu.com` as a custom domain and provisions its certificate. If an existing DNS record already occupies that exact hostname, resolve that record in the Cloudflare dashboard before attaching the custom domain. The main Trapnest site uses a different hostname.

## Preserved media

All 317 verified Vimeo renditions continue using the existing `studio-media` Worker and `videos/vimeo/` objects. This deployment does not redeploy that Worker or alter those objects. It does not rerun the migration or importer.

Two original local MP4s exceed Workers' 25 MiB static asset limit:

| Existing URL | Bytes | R2 key |
| --- | ---: | --- |
| `/media/748af0586f32345b.mp4` | 39,750,246 | `videos/local/748af0586f32345b.mp4` |
| `/media/e89d3045a7786331.mp4` | 29,125,022 | `videos/local/e89d3045a7786331.mp4` |

The deployment command uploads the unchanged files to those new keys. The site Worker streams them at their existing URLs, using the existing range/HEAD/conditional-request delivery implementation. Only those two URLs route through the Worker; it does not expose arbitrary R2 keys. Repeating deployment writes the same local bytes to the same two keys.

The original local assets remain in `public/` and `dist/` for Vite development and preview. The build's `postbuild` lifecycle runs `scripts/prepare-workers.mjs`, creating an ignored `.cloudflare/assets/` copy without the two oversized files and verifying all remaining files against the static asset size and count limits. `workers:prepare` can also run this step independently. Never deploy raw `dist/` with Wrangler, because it includes those oversized originals.

## Routing and metadata

The build emits an HTML shell for each of the 114 known routes, with route-specific title, description, canonical, OG and Twitter metadata available before JavaScript runs. This preserves client-side transitions while supporting direct visits, search crawlers and social previews. Canonical URLs use trailing slashes. Unknown paths return the Studio 404 page with `noindex`; missing JSON, images and media do not silently become the home page.

`dist/sitemap.xml` and `dist/robots.txt` are generated from the route inventory. Static asset headers are defined in `public/_headers`. The custom domain and all metadata use `https://studio.henrywithu.com`.

## Preview and smoke check

```sh
npm run workers:dev
```

This command seeds the two oversized files into the simulated local R2 bucket, so they also play in the Workers preview. It never uploads to production R2. Vite dev/preview retains all original local videos. The other R2 renditions continue using their existing verified public URLs. `workers:test` seeds temporary test bytes and verifies seeking, HEAD responses, method restrictions and isolation from private keys.

After deployment, check `/`, `/about/`, `/blog/`, an archive deep link, `/brand/og.jpg`, `/robots.txt`, `/sitemap.xml` and an unknown path. Confirm byte-range playback on the two local media URLs and the existing R2 rendition URLs.

Sources: [Workers Static Assets](https://developers.cloudflare.com/workers/static-assets/), [routing](https://developers.cloudflare.com/workers/static-assets/routing/), [static asset limits](https://developers.cloudflare.com/workers/platform/limits/#static-assets), [Wrangler configuration](https://developers.cloudflare.com/workers/wrangler/configuration/).
