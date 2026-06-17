# Primary Paper Data Extract

This folder organizes the four primary paper data sources referenced by PharmDrugBench. It is derived from `server/data/benchmark.json`, `client/src/data/benchmarkContent.ts`, and `docs/appendices/sources/`.

## Files

- `primary_papers.csv`: one row per primary paper, with DOI/PMC, source URL, dataset scope, task count, task names, and source files.
- `paper_task_map.csv`: one row per paper-task mapping, including metrics and source status.
- `paper_model_scores.csv`: one row per paper-level dashboard score and model. Scores are fractions and percents when reported; blank score cells mean N/A.
- `paper_task_scores.csv`: one row per paper-task-model score. Blank score cells mean N/A, not zero.
- `primary_paper_data.json`: nested version of the same paper, task, and model-score data.

## Primary papers

| Paper ID | Paper | Dashboard metric | Tasks |
| --- | --- | --- | ---: |
| rx-llm | Rx-LLM: a benchmarking suite to evaluate safe large language model performance for medication-related tasks | Rx-LLM (CMM) | 6 |
| ddi-identification | Drug-drug interaction identification using large language models | DDI Identification | 3 |
| medmatch | MedMatch: a first step for the automation of large language model performance benchmarking for medication-related tasks | MedMatch | 7 |
| drug-or-pokemon | Drug or Pokemon? Large language model performance in identification of fabricated medications | Drug or Pokémon? | 2 |

## Current public score policy

- Rx-LLM task definitions are included, but Rx-LLM model performance is N/A until public supplementary score tables are added.
- DDI identification values come from `docs/appendices/sources/ddi_identification_table3.csv`.
- MedMatch values are source-derived aggregates from `entity_accuracy_table.csv` and `route_accuracy_table.csv`; DrugGPT is not reported.
- Drug or Pokemon values are suspicion-detected scores, computed as `100 - default drug-dosing confabulation rate` from the embedded PMC Table 2 rates; GPT-5 Chat and DrugGPT are not reported.
- The app also references `LLM-Uncertainty-DDI` as a supplemental DDI verification source, but this extract keeps it out of the four-primary-paper tables.
