# Trapnest Studio architecture

## Client ownership

Studio is a React 19 / TypeScript application built with Vite. `npm run dev` provides native module HMR and React Fast Refresh; `npm run build` runs strict TypeScript compilation and produces a static client build. The GSAP ticker and Lenis instance are disposed during module replacement.

`src/App.tsx` owns route fetching, prefetching, browser history, page transitions, controller lifetime and document metadata. Routes load independently from `public/content/`; shared header and the Trapnest loading-wordmark geometry live in `src/content/chrome.json`. The content format is a typed element tree, rendered through `src/components/Content.tsx`. No Vue, Nuxt, reference application bundle, evaluated script or raw executable HTML is used by Studio.

The content renderer preserves original SVG paths, scope attributes, semantics and CSS classes. React owns structure; narrowly scoped controllers own ephemeral transforms, text splitting and media playback. Controllers return cleanup functions, and GSAP contexts revert route motion on navigation.

## Modules

| Module                               | Responsibility                                                                                         |
| ------------------------------------ | ------------------------------------------------------------------------------------------------------ |
| `components/Header.tsx`              | Active links, mobile navigation, link hover, London opening status, header themes                      |
| `components/Preloader.tsx`           | Original wordmark shapes, counter, blinks and loading sheet                                            |
| `components/Cursor.tsx`              | Smoothed DOM pointer labels and original thumbnail previews                                            |
| `components/Scrollbar.tsx`           | Original constant-size draggable scrollbar                                                             |
| `motion/engine.ts`                   | GSAP plugins, exact cubic easing curves, Lenis ticker, blink primitives                                |
| `motion/home.ts`                     | Hero, featured-project sheets, intro, photographs and client list scroll choreography                  |
| `motion/pages.ts`                    | About, Contact, Entertainment, Feed, Shop, project hero, crew, director note, next project             |
| `motion/header-theme.ts`             | Source component theme-trigger behavior                                                                |
| `motion/shared.ts`                   | Footer geometry, sticky text, marquees, drag galleries and podcast layers                              |
| `motion/controls.ts`                 | FAQ, credits, native full-film players, scroll controls, exclusive podcast previews                    |
| `motion/carousels.ts`                | Numbered case carousels and directional About carousel                                                 |
| `motion/work.ts`                     | Work grid/list transition, filters, exact crop variants, column sequence, sorting, director query      |
| `motion/text.ts` / `motion/lines.ts` | Responsive splitting, original first-glyph corrections, native line measurement and hover choreography |
| `motion/media.ts`                    | Viewport-driven video loading/playback and original small-screen media selection                       |
| `motion/newsletter.ts`               | Placeholder typing, validation and configurable subscription endpoint                                  |

The extracted styles remain in separate component/route files under `src/styles/reference/`, including their original names. `src/styles/studio.css` contains application ownership/accessibility rules and explicitly explained corrections for original route-specific stylesheet ordering. No shader pipeline exists in the reference; its effects use SVG, DOM and CSS blending.

## Asset and data pipeline

1. `fetch-pages.py`, `fetch-payloads.py`, and `fetch-bundles.py` collect public reference evidence.
2. `decode-payload.mjs` independently resolves the flattened Nuxt content data.
3. Browser inspection scripts capture original component props, conditional crew panels, directors’ notes and header theme triggers.
4. `extract-content.mjs` generates declarative route content, exact responsive crop URLs and extracted CSS.
5. `download-assets.py`, `download-videos.py`, and `download-audio.py` obtain original media. Aliases replace original URLs with local paths where media is stored locally.
6. `export-evidence.mjs` exports source URLs, file sizes and SHA-256 checksums into `docs/evidence/`.

The source application and browser snapshots reside only in ignored `research/` directories. `serve-reference.mjs` is an optional research replay server on port 5174, separate from Studio; it requires those ignored snapshots. The Studio build does not include or connect to it.

## Running and verifying

```sh
npm install
npm run dev
npm run build
# Requires Chromium and a running Studio dev server:
npm run verify
# Recovered reference snapshots are required for these research checks:
REFERENCE_ORIGIN=http://localhost:5174 npm run compare
```

Browser scripts accept `CHROMIUM_PATH` where supported; the cloud default is `/usr/bin/chromium`. Route and screenshot reports are ignored scratch output; finalized evidence is recorded in `docs/evidence/`.

`VITE_NEWSLETTER_ENDPOINT` can point to an authorized subscription service. The default is the reference’s original public endpoint. Valid subscriptions were not sent during verification. Remote Vimeo previews and case films now use the `studio` R2 bucket through the read-only `studio-media` Worker. Separate mobile and desktop renditions, lazy loading, and native full-film controls remain intact. YouTube sources retain their external URLs. All local images, font files, local homepage loop videos and podcast preview audio ship with the project. See [R2 media storage](R2_MEDIA.md) and its verified migration manifest for the source-to-object mappings.

## Trapnest identity and Workers hosting

`src/metadata.ts` updates route metadata during client navigation. `scripts/build-metadata.mjs` emits route-specific HTML heads, a sitemap, robots rules and a 404 page. The original GSAP/Lenis transition system remains unchanged.

`wrangler.jsonc` serves static assets at `studio.henrywithu.com`. Only two oversized local video URLs invoke `workers/site/index.mjs`, which uses the existing R2 streaming implementation. `scripts/prepare-workers.mjs` creates the upload copy; `scripts/seed-local-media.mjs` seeds the two original local files into simulated R2 for preview. Production maps their unchanged URLs to byte-identical objects from the existing verified Vimeo collection. The existing 317 Vimeo renditions and media Worker are unchanged. See [deployment](CLOUDFLARE.md).
