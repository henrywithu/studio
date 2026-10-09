# Trapnest Studio

An independent creative playground by Henry, exploring life, art, science and technology. A sub-project of [Trapnest](https://henrywithu.com/), intended for **studio.henrywithu.com**.

```sh
npm ci
npm run dev
npm run build
npm run verify
```

The Studio identity, journal, contact details and metadata are original to Trapnest. The visual archive retains the films, artwork, audio, credited artists, motion and interaction of the existing reconstruction of THE LINE. Archive material is identified as such; it is not presented as Henry’s client work.

The 317 verified R2 video renditions and their delivery Worker are preserved. See [media delivery](docs/R2_MEDIA.md), [architecture](docs/ARCHITECTURE.md), and [validation](docs/VALIDATION.md). Historical reverse-engineering evidence is retained in `docs/`; ignored `research/` files are for local inspection.

## Cloudflare Workers

```sh
npm run deploy:check
npm run workers:test
npm run deploy
```

See [deployment instructions](docs/CLOUDFLARE.md). The deploy command prepares the assets, uploads only the two oversized local MP4s under a new R2 prefix, then deploys `trapnest-studio` at **studio.henrywithu.com**. The 317 existing verified R2 renditions are untouched. Authentication uses your Cloudflare account; no secrets belong in the repository.
