# PhamDrugBench

Web dashboard for benchmarking pharmacy AI agents.

**Live demo:** https://aichemist-lab.github.io/Benchmark-Hub/

## Build for GitHub Pages

```bash
npm install
npm run build:pages
```

This outputs the static site to `dist/public/` (with `404.html` and `.nojekyll` for SPA routing).

Preview it locally:

```bash
npm run preview:pages
# open http://localhost:4173/Benchmark-Hub/
```

## Deploy

Push to `main` and GitHub Actions deploys automatically via [`.github/workflows/deploy-pages.yml`](.github/workflows/deploy-pages.yml):

```bash
git push origin main
```

One-time setup: in GitHub, go to **Settings → Pages → Source: GitHub Actions**.

See [docs/github-pages.md](docs/github-pages.md) for details.
