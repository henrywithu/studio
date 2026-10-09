# Studio validation

Reference snapshot: 2026-10-09. Browser: Chromium. Studio build: React / strict TypeScript / Vite; original production application code is absent from the client build.

## Completed checks

- All 114 public routes render at 1440px and 390px (228 route/viewport checks).
- Eight primary routes also fit 320px, 768px and 1024px (24 additional checks).
- No browser application errors or horizontal overflow occurred in those checks.
- Strict TypeScript compilation and the production Vite build pass.
- Source-image downloads finish with zero failures; all inventoried local files exist and have recorded SHA-256 hashes.
- Browser controls are exercised with reduced motion and normal animations: work filters/counts, list sorting, client navigation/back/home logo, FAQ, invalid newsletter input, crew, About carousel, exclusive podcast playback, director notes, full-film controls/Escape, next-project navigation, footer credits and mobile menu/Escape.
- Actual original local MP3 playback succeeds. A sampled original full-film progressive stream responds HTTP206 with `video/mp4`; other large films retain original streaming URLs.
- Scroll-state captures compare original and Studio transforms on Home, About, Entertainment, Contact, Feed and a project case. The sampled transforms match; a CSS identity matrix is equivalent to the reference's `none` for one About layer.

The development environment disconnected during work and later recovered. The final checks use the recovered workspace. A research-only reference replay served the extracted original runtime and content after intermittent reference503 responses. This server is excluded from Studio's application and production build.

## Measured document heights

Both sides use the same viewport dimensions and original font. These are complete document heights, not a pixel-similarity score.

| Route                | Width | Reference | Studio | Difference |
| -------------------- | ----: | --------: | -----: | ---------: |
| Home                 |  1440 |      9613 |   9613 |          0 |
| Home                 |   390 |      9540 |   9540 |          0 |
| Work                 |  1440 |     32476 |  32476 |          0 |
| Work                 |   390 |     34547 |  34546 |         −1 |
| About                |  1440 |     10567 |  10567 |          0 |
| About                |   390 |     10300 |  10300 |          0 |
| Entertainment        |  1440 |     17505 |  17505 |          0 |
| Entertainment        |   390 |      8978 |   8978 |          0 |
| Feed                 |  1440 |     10020 |  10020 |          0 |
| Feed                 |   390 |     12753 |  12752 |         −1 |
| Podcast              |  1440 |      4575 |   4575 |          0 |
| Podcast              |   390 |      3486 |   3486 |          0 |
| Contact              |  1440 |      5750 |   5750 |          0 |
| Contact              |   390 |      6841 |   6841 |          0 |
| Shop                 |  1440 |       900 |    900 |          0 |
| Shop                 |   390 |       844 |    844 |          0 |
| The Mountain project |  1440 |      8380 |   8380 |          0 |
| The Mountain project |   390 |      6859 |   6859 |          0 |

Representative source/local screenshots were manually compared at initial and scrolled positions. Matching document dimensions are useful evidence of layout fidelity, but do not establish universal pixel identity. Every public route is checked for rendering; detailed paired motion/screenshot checks cover the representative routes listed above.

## Explicit limits and dependencies

- One-pixel accumulated rounding differences remain on mobile Work and Feed.
- Animated video frames, randomized equalizer values, London opening status and frame scheduling vary with time. Motion is reconstructed from original timings/transforms in current libraries rather than executing the production bundle.
- Large case films, YouTube embeds, outgoing shop/social links and the subscription service use their original external destinations. They require connectivity and remain controlled by those services. Full film controls were checked without downloading every full film.
- Valid newsletter subscriptions were not submitted. The endpoint can be overridden with `VITE_NEWSLETTER_ENDPOINT`.
- The original Unilever gallery contains one blank image slot with no recoverable source; that slot remains blank.
- Browser validation uses Chromium, not a claim of exhaustive Safari/Firefox coverage.
- Cookie consent is omitted as requested. No deployment was performed.

Reproduce route/control checks with `npm run verify`; `NORMAL_MOTION=1 CONTROLS_ONLY=1 npm run verify` exercises complete motion. Source comparisons require ignored research captures and `npm run research:replay`, then `REFERENCE_ORIGIN=http://localhost:5174 npm run compare`. Provenance and compact final reports live in `docs/evidence/`.

## Trapnest Studio rebrand and Workers preparation — 9 October 2026

The preceding reference geometry measurements describe the earlier reconstruction. The new content changes page heights; they are retained as historical evidence, not measurements of the branded site.

- All 114 routes rendered at 1440px and 390px after the rebrand, with no horizontal overflow or application errors (228 checks).
- All 13 existing interaction checks passed with reduced and normal motion, including carousel movement, original podcast audio, full-film controls and page/next-project transitions.
- Every video, audio, iframe, source and media data attribute across all 114 routes was compared to `cf686e8` and is identical. `public/media/`, `public/audio/`, original archive assets, the verified R2 manifests and the media Worker have no changes. All motion modules retain their existing animation code; only newsletter destination behavior changes.
- The generated brand assets and primary pages were inspected at desktop and mobile sizes. Studio photography on Home, About and Contact now uses the main Trapnest journal’s featured images; underlying 3D, video and motion assets stay intact.
- Strict TypeScript, Vite build, all 114 production HTML metadata checks, sitemap/robots/404 checks, local Workers R2 streaming/range/HEAD tests and Wrangler dry run passed.
- The actual local Workers runtime served Home, About, Contact, Journal and an archive deep link with correct canonical/OG metadata. Unknown pages and missing JSON return HTTP 404. The OG asset returns HTTP 200 and client navigation updates metadata.
- Workers packaging contains 3,308 eligible files. Two unchanged oversized local MP4s are excluded only from the upload copy and served through R2 at their original URLs. Local preview seeds exact files into simulated R2; production now reuses byte-identical objects already present in the verified R2 collection.

The 317 R2 renditions were already verified in the preceding milestone; this task preserved that evidence rather than repeating remote reachability checks. No production deployment, DNS change or production R2 upload was performed during the rebrand. See [Cloudflare deployment](CLOUDFLARE.md).

## Production deployment follow-up — 9 October 2026

Cloudflare Workers Builds successfully deployed Worker `studio` to studio.henrywithu.com. The repository config now uses the same Worker name. The two oversized local-video URLs originally returned 404 because CI did not run the extra upload command. Inspection showed that both files already exist in the 317 verified Vimeo renditions, with exactly matching sizes and MD5 hashes. The URL mapping now reuses those existing R2 keys, eliminating the production upload step. Local seeding is explicitly local-only. Standard CI commands are `npm run build` and `npx wrangler deploy`.

## Journal image visibility follow-up — 9 October 2026

The two Home journal photos decoded successfully on production, but their red loading overlays remained visible. The image load handler only recognized the original `/assets/` paths, excluding the new `/images/journal/` files. It now handles every image path while retaining the existing overlay fade and all motion/media code.

The production build passes. `npm run verify:images` checks decoded photos and transparent loading overlays at 1440px and 390px, on initial load, reload and client navigation back to Home, with normal animations. All six local checks pass. Run against deployment with `STUDIO_ORIGIN=https://studio.henrywithu.com npm run verify:images`.
