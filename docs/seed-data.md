# Seed data

`server/data/benchmark.json` is the canonical source for demo data loaded by `server/seed.ts`.

- **Task definitions** come from `docs/seed-tasks-table.txt` (17 PhamDrugBench tasks).
- **Models, benchmark results, and leaderboard scores** in the JSON are **illustrative** until real evaluation runs are imported.

Regenerate the JSON after editing the task table:

```bash
npm run generate:benchmark
npm run db:reseed
```
