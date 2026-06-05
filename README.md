# PhamDrugBench

Pharmacy AI agent benchmarking dashboard.

**Live demo:** https://aichemist-lab.github.io/Benchmark-Hub/

## Build for GitHub Pages

```bash
npm install
npm run build:pages
```

Output: `dist/public/` (includes `data/benchmark.json`, `404.html`, `.nojekyll`).

Preview locally:

```bash
npm run preview:pages
# http://localhost:4173/Benchmark-Hub/
```

## Deploy

Push to `main` — GitHub Actions deploys automatically.

**Settings → Pages → Source: GitHub Actions**

## Data

Edit [`data/benchmark.json`](data/benchmark.json) (demo models, scores, tasks), then rebuild and push.
