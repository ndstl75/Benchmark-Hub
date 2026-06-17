# PharmDrugBench

A web-based pharmacy agent benchmarking platform that evaluates AI agents on autonomous
pharmacy tasks. Benchmark data is loaded from `server/data/benchmark.json` and seeded into
PostgreSQL, then served through an interactive dashboard and public leaderboard.

- **Frontend:** React + Vite + TailwindCSS + shadcn/ui + Recharts
- **Backend:** Express.js (TypeScript)
- **Database:** PostgreSQL with Drizzle ORM
- **Server state:** TanStack Query

The app runs on **port 8447**.

---

## Quick start (Docker, recommended)

This is the easiest way to run everything (app + PostgreSQL) with one command.

**Requirements:** Docker + Docker Compose.

```bash
# 1. Create your local env file
cp .env.example .env
# (optional) edit .env to add an OPENAI_API_KEY if you evaluate OpenAI models

# 2. Build and start the app + database
docker compose up --build -d

# 3. Open the app
#    http://localhost:8447
```

On first start the app creates the database tables and seeds the benchmark data
automatically. Postgres data is stored in a `pgdata` volume, so it survives restarts.

```bash
docker compose down              # stop
docker compose down && docker compose up --build -d   # rebuild + restart
```

More Docker details: [`docs/docker.md`](docs/docker.md).

---

## Local development (without Docker for the app)

**Requirements:** Node.js 20+, and a PostgreSQL database.

```bash
# 1. Install dependencies
npm install

# 2. Configure environment
cp .env.example .env             # then set DATABASE_URL / OPENAI_API_KEY as needed

# 3. (Optional) start just a local Postgres via Docker
docker compose up -d db          # exposes Postgres on localhost:5447

# 4. Create tables and run the dev server (hot reload)
npm run db:push
npm run dev                      # http://localhost:8447
```

> Tip: when using the bundled Postgres, the app automatically rewrites the
> `@db:5432` host in `DATABASE_URL` to `@localhost:5447` for local dev.

---

## Configuration

All settings come from `.env` (copy from `.env.example`):

| Variable         | Required | Description                                              |
| ---------------- | -------- | -------------------------------------------------------- |
| `PORT`           | no       | Port the server listens on (default `8447`).             |
| `DATABASE_URL`   | yes      | PostgreSQL connection string.                            |
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
npm run db:push      # sync the database schema
npm run db:seed      # seed the DB from server/data/benchmark.json
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
  storage.ts             Database CRUD operations
  db.ts                  Database connection
  seed.ts                Seeds DB from benchmark.json
  config.ts              Env / DATABASE_URL resolution
  data/benchmark.json    Canonical benchmark data
shared/schema.ts         Drizzle schema (models, results, leaderboard, tasks)
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

Edit `server/data/benchmark.json`, then reload it into the database:

```bash
npm run db:reseed
```

To regenerate the JSON from the appendix source tables, see
[`docs/appendices/README.md`](docs/appendices/README.md).
