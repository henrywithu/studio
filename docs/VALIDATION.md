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
