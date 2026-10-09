# Studio

A modular TypeScript reconstruction of [THE LINE Studio](https://thelinestudio.com/), based on extracted source assets and measured behavior.

```sh
npm install
npm run dev
npm run build
```

See [reverse engineering evidence](docs/REVERSE_ENGINEERING.md), [architecture](docs/ARCHITECTURE.md), and [validation](docs/VALIDATION.md). Production scripts and browser snapshots are retained locally in ignored `research/` directories solely for inspection. Studio does not run the reference's application bundle.

The frontend has no deployment configured. Remote Vimeo videos are served from the
`studio` Cloudflare R2 bucket by the `studio-media` Worker. See [R2 media storage](docs/R2_MEDIA.md)
for the migration manifest, delivery configuration, and verification commands.
Milestones are committed to `main`.
