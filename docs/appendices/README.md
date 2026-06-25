# PharmDrugBench Supplementary Appendices

PharmDrugBench task definitions align with four primary papers:

- **Rx-Bench** — [medRxiv 10.64898/2025.12.01.25341004v2](https://www.medrxiv.org/content/10.64898/2025.12.01.25341004v2) plus `RxLLM_submission_4.8.26.docx` manuscript tables (6 CMM benchmarks, 250 cases each)
- **DDI identification** — [medRxiv 10.64898/2025.12.03.25341549v2](https://www.medrxiv.org/content/10.64898/2025.12.03.25341549v2) (750 scenarios, 3 formats)
- **MedMatch** — [PMC12870651](https://pmc.ncbi.nlm.nih.gov/articles/PMC12870651/) / [medRxiv 10.64898/2026.01.13.26343949](https://www.medrxiv.org/content/10.64898/2026.01.13.26343949v1) (100 medication prompts; JSON slot-filling and route selection)
- **Drug or Pokémon?** — [PMC12870567](https://pmc.ncbi.nlm.nih.gov/articles/PMC12870567/) (250 adversarial vignettes)

Leaderboard scores are built from appendix tables in AIChemist-Lab repos under `sources/`:

- **Rx-Bench** — primary task metrics from manuscript Tables 2-3 (`rx_llm_tables_2_3.csv`). The dashboard score is the macro mean across the six primary CMM task metrics, and the leaderboard also splits out all six task-level rows.
- **[MedMatch](https://github.com/AIChemist-Lab/MedMatch)** — entity/route accuracy, drug order generation (`entity_accuracy_table.csv`, `route_accuracy_table.csv`). `evaluation_results.json` is included for reference but is not currently consumed by the build script.
- **LLM-DDI** — DDI identification Table 3 experiment accuracies (`ddi_identification_table3.csv`). `MedGemma-27B` is listed as a separate model row when source tables report MedGemma rather than base Gemma 3 27B.
- **LLM-Uncertainty-DDI** — DDI verification accuracy (`table_4_results.csv`)
- **Pokemon-Drugs-Names** — fictitious-drug confabulation rates (PMC Table 2; embedded in build script)

## Supported models (7)

GPT-4o-mini, GPT-5 Chat, MedGemma-27B, Gemma 3 27B, Llama 3.3 70B, Qwen3 32B, DrugGPT

## Regenerate benchmark data

```bash
npm run build:benchmark   # writes server/data/benchmark.json
npm run db:reseed         # reload PostgreSQL from JSON
```

## Run locally

```bash
docker compose up -d db    # Postgres on localhost:5447
npm run dev                # API + UI on :8447 with hot reload
```

Production:

```bash
docker compose up -d --build   # http://localhost:8447
```

Optional: upload DOCX supplements here for manual table extraction:

- `benchmarking-paper-supplement.docx`
- `ddi-paper-supplement.docx`
- `pokemon-supplement-4.23.docx`
