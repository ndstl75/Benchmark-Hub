# Docker

PhamDrugBench runs on port **8447** in Docker.

## Build

```bash
docker build -t phamdrugbench .
```

## Run

Requires `DATABASE_URL` (e.g. Neon Postgres). For OpenAI models, set `OPENAI_API_KEY` and optionally `OPENAI_MODEL` (default: `gpt-5-mini`) in the environment or in `.env` when using docker-compose.

```bash
docker run -e DATABASE_URL="postgresql://..." -p 8447:8447 phamdrugbench
```

App is available at http://localhost:8447.

## Docker Compose

Includes a local Postgres service. `.env` is read by the app; `DATABASE_URL` is set automatically for the app container.

```bash
docker compose up --build -d
```

The app container runs schema push on startup (creates tables if missing), then the server starts and seeds simulated data when the DB is empty. Postgres data is stored in a `pgdata` volume so it persists across `docker compose down && up`.

To restart (rebuild and run):

```bash
docker compose down && docker compose up --build -d
```

App: http://localhost:8447.

**Simulated data:** On first startup (or with an empty DB), the app creates tables and seeds task definitions, models, benchmark results, and leaderboard so the dashboard shows data. If you ever need to run schema push manually:

```bash
docker compose run --rm -e DATABASE_URL=postgresql://postgres:postgres@db:5432/agent_benchmark_hub app sh -c "npx drizzle-kit push --config=drizzle.config.ts"
```

## Database migration

The Agent Doctor feature uses an `evaluators` table. Run schema sync once with the same `DATABASE_URL` (e.g. `npm run db:push` from the project root; when using docker-compose, run the one-off push command above).
