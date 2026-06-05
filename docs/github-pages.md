# GitHub Pages deployment

Live demo: **https://aichemist-lab.github.io/Benchmark-Hub/**

## How it works

GitHub Pages serves static files only. The Pages build sets:

- `VITE_BASE_PATH=/Benchmark-Hub/` — asset and router base path
- `VITE_DEPLOY_MODE=static` — load data from bundled JSON instead of `/api/*`

At build time, [`script/build-pages.ts`](../script/build-pages.ts) copies [`data/benchmark.json`](data/benchmark.json) to `client/public/data/benchmark.json`, runs Vite, and writes `404.html` + `.nojekyll` for SPA routing.

## Local preview

```bash
npm run build:pages
npm run preview:pages
# open http://localhost:4173/Benchmark-Hub/
```

## Refresh demo data

Edit `data/benchmark.json` directly (it's the source of truth for the static demo), then:

```bash
npm run build:pages
git add data/benchmark.json
git push origin main          # triggers deploy workflow
```

## Limitations (read-only)

- No Express API or Postgres on Pages
- No add/delete models or evaluators
- No Agent Doctor (write/export) — the demo UI shows guidance for self-hosting if needed

## Repo settings

In GitHub: **Settings → Pages → Build and deployment → Source: GitHub Actions**.
