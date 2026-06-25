---
title: Benchmark Hub
emoji: 📊
colorFrom: blue
colorTo: green
sdk: docker
app_port: 7860
pinned: false
license: mit
---

# PharmDrugBench

A web-based pharmacy agent benchmarking platform that evaluates AI agents on autonomous
pharmacy tasks. Benchmark data is loaded from JSONL files in `server/data/` (seeded from
`benchmark.json` on first start) and served through an interactive dashboard and public leaderboard.

**Live demo:** this Space runs the production Docker image on port **7860** and seeds JSONL
data automatically on first boot.

- **Frontend:** React + Vite + TailwindCSS + shadcn/ui + Recharts
- **Backend:** Express.js (TypeScript)
- **Storage:** JSONL files (`models`, `benchmark_results`, `leaderboard_scores`, `task_definitions`, `evaluators`)
- **Server state:** TanStack Query

The app runs on **port 8447**.

---

## Quick start (Docker, recommended)

This is the easiest way to run the app with one command.

**Requirements:** Docker + Docker Compose.

```bash
# 1. Create your local env file
cp .env.example .env
# (optional) edit .env to add an OPENAI_API_KEY if you evaluate OpenAI models

# 2. Build and start the app
docker compose up --build -d

# 3. Open the app
#    http://localhost:8447
```

On first start the app seeds JSONL data files from `server/data/benchmark.json` if they are missing.

```bash
docker compose down              # stop
docker compose down && docker compose up --build -d   # rebuild + restart
```

More Docker details: [`docs/docker.md`](docs/docker.md).

---

## Local development (without Docker for the app)

**Requirements:** Node.js 20+.

```bash
# 1. Install dependencies
npm install

# 2. Configure environment
cp .env.example .env             # then set OPENAI_API_KEY as needed

# 3. Seed JSONL data and run the dev server (hot reload)
npm run db:seed
npm run dev                      # http://localhost:8447
```

---

## Configuration

All settings come from `.env` (copy from `.env.example`):

| Variable         | Required | Description                                              |
| ---------------- | -------- | -------------------------------------------------------- |
| `PORT`           | no       | Port the server listens on (default `8447`).             |
| `DATA_DIR`       | no       | Directory for JSONL data files (default `server/data`).  |
| `ADMIN_API_TOKEN`| no       | Token required for write/admin API routes. Without it, public deployments are read-only. |
| `OPENAI_API_KEY` | no       | Only needed when evaluating OpenAI models.               |
| `OPENAI_MODEL`   | no       | OpenAI model to use (default `gpt-5-mini`).              |

`.env` is gitignored — never commit real secrets.

---

## Common commands

```bash
npm run dev          # start dev server (API + UI) on :8447
npm run build        # build client + server into dist/
npm start            # run the production build
npm run db:seed      # seed JSONL files from server/data/benchmark.json
npm run db:reseed    # force re-seed (clears and reloads)
npm run check        # TypeScript type-check
```

---

## Project structure

```
client/                 React app (Vite)
  src/pages/Home.tsx     Main page: dashboard, leaderboard, sidebar
server/                  Express API
  index.ts               Server entrypoint
  routes.ts              API routes (prefixed with /api)
  storage.ts             JSONL-backed CRUD operations
  jsonl.ts               JSONL read/write helpers
  seed.ts                Seeds JSONL files from benchmark.json
  config.ts              Env configuration
  data/*.jsonl           Runtime data store
  data/benchmark.json    Canonical import source for benchmark data
shared/schema.ts         Zod schemas and types
docs/                    Docker + appendix/data-source notes
```

## API endpoints

| Method   | Path                              | Description                          |
| -------- | --------------------------------- | ------------------------------------ |
| `GET`    | `/api/models`                     | List all models                      |
| `GET`    | `/api/benchmark-results/:modelId` | Benchmark results for a model        |
| `GET`    | `/api/leaderboard?tab=`           | Leaderboard scores (optional tab)    |
| `GET`    | `/api/tasks`                      | List task definitions                |
| `POST`   | `/api/models`                     | Admin-only: add a custom model       |
| `DELETE` | `/api/models/:id`                 | Admin-only: remove a model and its scores |
| `GET/POST/PATCH/DELETE` | `/api/evaluators*`     | Admin-only evaluator management/export |

Admin routes require `x-admin-token: <ADMIN_API_TOKEN>` or
`Authorization: Bearer <ADMIN_API_TOKEN>`.

## Updating benchmark data

Edit `server/data/benchmark.json`, then reload it into JSONL files:

```bash
npm run db:reseed
```

To regenerate the JSON from the appendix source tables, see
[`docs/appendices/README.md`](docs/appendices/README.md).
