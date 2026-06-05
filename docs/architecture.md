# Architecture

## Data flow

1. `server/data/benchmark.json` holds models, per-task results, leaderboard rows, and task definitions.
2. On startup, `server/seed.ts` loads the JSON when the database is empty (or when `SEED_FORCE=1`).
3. The React app reads data via `/api/*` endpoints implemented in `server/routes.ts`.

## Database tables

| Table | Purpose |
|-------|---------|
| `models` | LLMs / agents under evaluation |
| `benchmark_results` | Per-model, per-task earned/failed scores |
| `leaderboard_scores` | Tabbed leaderboard metrics |
| `task_definitions` | 17 pharmacy benchmark tasks |
| `evaluators` | Green “Agent Doctor” evaluator configuration |

## API

- `GET /api/models`, `POST /api/models`, `DELETE /api/models/:id`
- `GET /api/benchmark-results/:modelId`
- `GET /api/leaderboard?tab=`
- `GET /api/tasks`, `GET /api/tasks/:name`
- `GET|POST|PATCH|DELETE /api/evaluators`
- `GET /api/evaluators/export-scenario` — TOML download (may include secrets)

Evaluator `env` values are **masked** in JSON API responses; export still returns real values for Docker scenarios.

## UI

- **Sidebar:** model selection drives the dashboard chart.
- **Leaderboard:** transposed tables for Accuracy, Efficiency, and General information tabs.
- **Agent Doctor:** configure evaluator Docker image and env vars.
- **Tasks:** collapsible reference for all task definitions.
