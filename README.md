# PhamDrugBench

Web platform for benchmarking pharmacy AI agents on autonomous medication tasks (CMM, DDI, MedMatch, and adversarial confabulation checks).

## Stack

- **Frontend:** React 19, Vite, Tailwind CSS 4, shadcn-style UI, TanStack Query, Recharts
- **Backend:** Express 5, TypeScript
- **Database:** PostgreSQL, Drizzle ORM

## Quick start

```bash
cp .env.example .env
# Edit .env if needed (DATABASE_URL, optional OPENAI_API_KEY)

docker compose up --build -d
# App: http://localhost:7693
```

Local development (Postgres on host port 5434 via Compose):

```bash
docker compose up -d db
npm install
npm run db:push
npm run db:reseed
npm run dev
```

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | API + Vite on port 7693 |
| `npm run build` | Production client + server bundle |
| `npm run db:push` | Apply Drizzle schema |
| `npm run db:reseed` | Reload data from `server/data/benchmark.json` |
| `npm run generate:benchmark` | Regenerate `benchmark.json` from `docs/seed-tasks-table.txt` |

## Project layout

- `client/src/pages/Home.tsx` — Dashboard, leaderboard, Agent Doctor, tasks
- `server/routes.ts` — REST API under `/api`
- `server/data/benchmark.json` — Seed data
- `shared/schema.ts` — Database schema

See [docs/architecture.md](docs/architecture.md) and [docs/docker.md](docs/docker.md).

## Security

See [SECURITY.md](SECURITY.md). Never commit `.env`.
