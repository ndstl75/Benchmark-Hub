"""Build server/data/benchmark.json from AIChemist-Lab appendix source tables."""

from __future__ import annotations

import csv
import json
from pathlib import Path
from statistics import mean

ROOT = Path(__file__).resolve().parents[2]
SOURCES = ROOT / "docs" / "appendices" / "sources"
OUT = ROOT / "server" / "data" / "benchmark.json"

MODELS = [
    {
        "name": "GPT-4o-mini",
        "type": "Standard",
        "provider": "OpenAI",
        "access": "API",
        "costPer1mTokens": "$0.15",
        "latency": "2.1s",
        "entity_cols": ["GPT-4o-mini"],
        "route_cols": ["GPT-4o-mini"],
        "eval_key": "gpt-4o-mini",
        "ddi_cols": ["GPT-4o-mini"],
        "ddi_paper_cols": ["GPT-4o-mini"],
        "rx_llm_cols": ["GPT-4o-mini"],
    },
    {
        "name": "GPT-5 Chat",
        "type": "Reasoning",
        "provider": "OpenAI",
        "access": "API",
        "costPer1mTokens": "$1.10",
        "latency": "8.2s",
        "entity_cols": ["GPT-5 Chat"],
        "route_cols": ["GPT-5-chat"],
        "eval_key": "azure-gpt-5-chat",
        "ddi_cols": ["GPT-5-Chat"],
        "ddi_paper_cols": ["GPT-5-Chat"],
        "rx_llm_cols": ["GPT-5-Chat"],
    },
    {
        "name": "MedGemma-27B",
        "type": "Medical",
        "provider": "Google",
        "access": "Open Weights",
        "costPer1mTokens": "$0.15",
        "latency": "1.8s",
        "entity_cols": [],
        "route_cols": [],
        "eval_key": "",
        "ddi_cols": [],
        "ddi_paper_cols": ["MedGemma-27B"],
        "rx_llm_cols": ["MedGemma-27B"],
    },
    {
        "name": "Gemma 3 27B",
        "type": "Standard",
        "provider": "Google",
        "access": "Open Weights",
        "costPer1mTokens": "$0.15",
        "latency": "1.8s",
        "entity_cols": ["Gemma3"],
        "route_cols": ["Gemma-3-27B-IT"],
        "eval_key": "google_gemma-3-27b-it",
        "ddi_cols": ["Gemma-27B"],
        "ddi_paper_cols": [],
        "rx_llm_cols": [],
    },
    {
        "name": "Llama 3.3 70B",
        "type": "Standard",
        "provider": "Meta",
        "access": "Open Weights",
        "costPer1mTokens": "$0.70",
        "latency": "3.2s",
        "entity_cols": ["LLaMA3"],
        "route_cols": ["LLaMA-3.3-70B-Instruct"],
        "eval_key": "meta-llama_Llama-3.3-70B-Instruct",
        "ddi_cols": ["LLaMA3-70B"],
        "ddi_paper_cols": ["LLaMA3-70B"],
        "rx_llm_cols": ["LLaMA3-70B"],
    },
    {
        "name": "Qwen3 32B",
        "type": "Standard",
        "provider": "Alibaba",
        "access": "Open Weights",
        "costPer1mTokens": "$0.20",
        "latency": "2.5s",
        "entity_cols": ["Qwen3"],
        "route_cols": ["Qwen3-32B"],
        "eval_key": "Qwen_Qwen3-32B",
        "ddi_cols": ["Qwen3-32B"],
        "ddi_paper_cols": ["Qwen3-32B"],
        "rx_llm_cols": ["Qwen3-32B"],
    },
    {
        "name": "DrugGPT",
        "type": "Standard",
        "provider": "DrugGPT",
        "access": "Specialized",
        "costPer1mTokens": "N/A",
        "latency": "N/A",
        "entity_cols": [],
        "route_cols": [],
        "eval_key": "druggpt",
        "ddi_cols": [],
        "ddi_paper_cols": ["DrugGPT"],
        "rx_llm_cols": ["DrugGPT"],
    },
]

# Pokemon appendix (PMC Table 2, default drug-dosing confabulation %). Suspicion detected = 100 - rate.
POKEMON_CONFAB_DEFAULT_DOSING = {
    "GPT-4o-mini": {"generic": 97.7, "brand": 98.8},
    "Llama 3.3 70B": {"generic": 86.0, "brand": 91.9},
    "Gemma 3 27B": {"generic": 95.9, "brand": 97.7},
    "Qwen3 32B": {"generic": 98.4, "brand": 98.8},
}

MEDMATCH_CATEGORY_MAP = {
    "Oral solid (n=40)": "MedMatch (Oral Solid)",
    "Oral liquid (n=10)": "MedMatch (Oral Liq)",
    "Intravenous intermittent (n=17)": "MedMatch (IV Intermit)",
    "Intravenous push (n=17)": "MedMatch (IV Push)",
    "Intravenous continuous infusion titratable (n=11)": "MedMatch (Continuous Titrate)",
    "Intravenous continuous infusion non-titratable (n=6)": "MedMatch (Continuous Non-Titrate)",
}

MEDMATCH_PAPER_NOTE = (
    "MedMatch paper (PMC12870651): 100 clinician-annotated medication prompts; "
    "one-shot prompting; triplicate runs; MedMatch score = exact match on all JSON slots."
)
MEDMATCH_FORMAT_NOTE = (
    "Convert free-text medication order to standardized MedMatch JSON slot format per administration class."
)

RX_BENCH_NOTE = "Rx-Bench benchmark: 250 clinician-annotated cases (inpatient and outpatient). Zero-shot prompting; temperature 0.7; 3 trials."
DDI_PAPER_NOTE = "DDI identification paper: 750 clinician-annotated DDI scenarios. Zero-shot; precision, recall, F1, accuracy, self-consistency."
POKEMON_JUDGE = (
    "Suspects fictitious | Inherited confabulation (answered as if real drug) | "
    "Epistemic confabulation (replaced fictitious drug with real medication)"
)

TASK_DEFINITIONS = [
    {
        "name": "Formulation Matching",
        "prompt": f"Generic drug name (e.g., amlodipine). List all FDA-approved dosage forms. {RX_BENCH_NOTE}",
        "response": "Complete and correct list of formulations.",
        "humanAnnotation": "Complete and correct list of formulations.",
        "agreement": "96%",
        "metrics": ["Precision", "Recall", "F1-score", "Accuracy", "Correctness consistency"],
    },
    {
        "name": "Drug Order Gen (Sig)",
        "prompt": f"Generic drug name (e.g., carvedilol). Generate one clinically appropriate complete oral medication order (sig). {RX_BENCH_NOTE}",
        "response": "One clinically appropriate complete medication order.",
        "humanAnnotation": "Clinically appropriate complete medication order.",
        "agreement": "98%",
        "metrics": ["Exact match", "HAMeC score", "Correctness consistency"],
    },
    {
        "name": "Route Matching",
        "prompt": f"Generic drug name (e.g., prednisolone). List all safe routes of administration. {RX_BENCH_NOTE}",
        "response": "Complete and correct list of routes.",
        "humanAnnotation": "Complete and correct list of routes.",
        "agreement": "95%",
        "metrics": ["Precision", "Recall", "F1-score", "Accuracy", "Correctness consistency"],
    },
    {
        "name": "Rx-Bench DDI ID",
        "prompt": (
            "Pointwise two-drug classification: identify clinically significant interacting pair "
            f"(Category C, D, or X) from a medication list with full dosing. {RX_BENCH_NOTE}"
        ),
        "response": "Correct interacting drug pair.",
        "humanAnnotation": "Correct interacting drug pair.",
        "agreement": "94%",
        "metrics": ["Precision", "Recall", "F1-score", "Accuracy", "Self-consistency"],
    },
    {
        "name": "Renal Dose ID",
        "prompt": f"Generic drug name (e.g., vancomycin). Determine if renal dose adjustment is required (Yes/No). {RX_BENCH_NOTE}",
        "response": "Yes or No.",
        "humanAnnotation": "Yes or No.",
        "agreement": "99%",
        "metrics": ["Precision", "Recall", "F1-score", "Exact match", "Correctness consistency"],
    },
    {
        "name": "Drug-Indication",
        "prompt": f"Drug name. Identify FDA-approved clinical indications. {RX_BENCH_NOTE}",
        "response": "Correct list of FDA-approved indications.",
        "humanAnnotation": "Correct list of FDA-approved indications.",
        "agreement": "93%",
        "metrics": ["Precision", "Recall", "F1-score", "Accuracy", "Correctness consistency"],
    },
    {
        "name": "DDI ID",
        "prompt": (
            "Pointwise DDI identification: classify clinically significant two-drug interactions "
            f"from the DDI identification paper. {DDI_PAPER_NOTE}"
        ),
        "response": "Correct pointwise DDI classification.",
        "humanAnnotation": "Correct pointwise DDI classification.",
        "agreement": "94%",
        "metrics": ["Precision", "Recall", "F1-score", "Accuracy", "Self-consistency"],
    },
    {
        "name": "DDI Verification",
        "prompt": (
            "Drug pair with proposed interaction category and clinical action. "
            "Verify whether the proposed interaction assessment is correct (hedging/default prompt). "
            "Source: LLM-Uncertainty-DDI supplement."
        ),
        "response": '"A" (Correct) or "B" (Incorrect).',
        "humanAnnotation": '"A" (Correct) or "B" (Incorrect).',
        "agreement": "97%",
        "metrics": ["Correct answer rate", "Refusal rate", "Correct given attempted"],
    },
    {
        "name": "DDI 3-Drug Combo",
        "prompt": f"Pairwise three-drug discrimination: identify interacting pair(s) from three medications with full dosing. {DDI_PAPER_NOTE}",
        "response": "Correct interacting pair(s).",
        "humanAnnotation": "Correct interacting pair(s).",
        "agreement": "90%",
        "metrics": ["Precision", "Recall", "F1-score", "Accuracy", "Self-consistency"],
    },
    {
        "name": "DDI Multi-Drug",
        "prompt": f"Listwise 4–6 drug selection: identify all interacting pairs from a polypharmacy regimen. {DDI_PAPER_NOTE}",
        "response": "All correct interacting drug pairs.",
        "humanAnnotation": "All correct interacting drug pairs.",
        "agreement": "82%",
        "metrics": ["Precision", "Recall", "F1-score", "Accuracy", "Self-consistency"],
    },
    {
        "name": "MedMatch (Oral Solid)",
        "prompt": f"{MEDMATCH_FORMAT_NOTE} Oral solid (n=40). {MEDMATCH_PAPER_NOTE}",
        "response": "[drug name][numerical dose][abbreviated unit strength of dose][amount][formulation] by mouth [frequency]",
        "humanAnnotation": "Exact JSON slot match for oral solid MedMatch format.",
        "agreement": "91%",
        "metrics": ["MedMatch score (exact field match)", "Micro-F1"],
    },
    {
        "name": "MedMatch (Oral Liq)",
        "prompt": f"{MEDMATCH_FORMAT_NOTE} Oral liquid (n=10). {MEDMATCH_PAPER_NOTE}",
        "response": "[drug name][numerical dose][abbreviated unit strength of dose][numerical volume][abbreviated unit strength of volume] of the [concentration][formulation unit] [formulation] by mouth [frequency]",
        "humanAnnotation": "Exact JSON slot match for oral liquid MedMatch format.",
        "agreement": "90%",
        "metrics": ["MedMatch score (exact field match)", "Micro-F1"],
    },
    {
        "name": "MedMatch (IV Intermit)",
        "prompt": f"{MEDMATCH_FORMAT_NOTE} IV intermittent (n=17). {MEDMATCH_PAPER_NOTE}",
        "response": "[drug name][numerical dose][abbreviated unit strength of dose][amount of diluent volume][volume unit][compatible diluent type] intravenously infused over [infusion time] [frequency]",
        "humanAnnotation": "Exact JSON slot match for IV intermittent MedMatch format.",
        "agreement": "88%",
        "metrics": ["MedMatch score (exact field match)", "Micro-F1"],
    },
    {
        "name": "MedMatch (IV Push)",
        "prompt": f"{MEDMATCH_FORMAT_NOTE} IV push (n=17). {MEDMATCH_PAPER_NOTE}",
        "response": "[drug name][numerical dose][abbreviated unit strength of dose][amount of volume][volume unit] of the [concentration][concentration unit][formulation] intravenous push [frequency]",
        "humanAnnotation": "Exact JSON slot match for IV push MedMatch format.",
        "agreement": "89%",
        "metrics": ["MedMatch score (exact field match)", "Micro-F1"],
    },
    {
        "name": "MedMatch (Continuous Titrate)",
        "prompt": f"{MEDMATCH_FORMAT_NOTE} IV continuous titratable (n=11). {MEDMATCH_PAPER_NOTE}",
        "response": '[drug name][numerical dose][abbreviated unit strength of dose] "in" [diluent volume][volume unit][compatible diluent type] "continuous intravenous infusion starting at" [starting rate][unit of measure] "titrated by" [titration dose][titration unit] [titration frequency] to achieve [titration goal]',
        "humanAnnotation": "Exact JSON slot match for continuous titratable infusion.",
        "agreement": "85%",
        "metrics": ["MedMatch score (exact field match)", "Micro-F1"],
    },
    {
        "name": "MedMatch (Continuous Non-Titrate)",
        "prompt": f"{MEDMATCH_FORMAT_NOTE} IV continuous non-titratable (n=6). {MEDMATCH_PAPER_NOTE}",
        "response": '[drug name][numerical dose][abbreviated unit strength of dose][diluent volume][volume unit]"in"[compatible diluent type] "continuous intravenous infusion at" [rate][unit of measure]',
        "humanAnnotation": "Exact JSON slot match for continuous non-titratable infusion.",
        "agreement": "87%",
        "metrics": ["MedMatch score (exact field match)", "Micro-F1"],
    },
    {
        "name": "MedMatch Route Selection",
        "prompt": (
            "Route omitted from medication prompt. Classify order into administration route category: "
            "oral solid, oral liquid, IV intermittent, IV push, or IV continuous (titratable/non-titratable). "
            f"{MEDMATCH_PAPER_NOTE} Dataset posted at github.com/AIChemist-Lab/MedMatch."
        ),
        "response": "Correct route category (by mouth, IV push, IV intermittent, or IV continuous).",
        "humanAnnotation": "Correct route category assignment.",
        "agreement": "88%",
        "metrics": ["Route accuracy", "MedMatch score"],
    },
    {
        "name": "Pokémon (Generic)",
        "prompt": (
            "250 medication vignettes: 4–6 real generic medications plus one fabricated Pokémon "
            "medication with complete dosing (drug, dose, unit, route, frequency). "
            "Task: provide dosing range or indication. Drug or Pokémon? paper (PMC12870567)."
        ),
        "response": POKEMON_JUDGE,
        "humanAnnotation": POKEMON_JUDGE,
        "agreement": "86%",
        "metrics": ["LLM-as-a-judge", "Confabulation rate"],
    },
    {
        "name": "Pokémon (Brand)",
        "prompt": (
            "250 medication vignettes: 4–6 real brand medications plus one fabricated Pokémon "
            "medication with complete dosing. Task: provide dosing range or indication. "
            "Drug or Pokémon? paper (PMC12870567)."
        ),
        "response": POKEMON_JUDGE,
        "humanAnnotation": POKEMON_JUDGE,
        "agreement": "85%",
        "metrics": ["LLM-as-a-judge", "Confabulation rate"],
    },
]


def parse_pct(value: str) -> float:
    return float(value.strip().replace("%", ""))


def load_entity_table() -> dict[str, dict[str, float]]:
    """Returns MedMatch category field-average scores by model."""
    path = SOURCES / "entity_accuracy_table.csv"
    category_avgs: dict[str, dict[str, list[float]]] = {}
    cur = None
    with path.open(newline="", encoding="utf-8") as f:
        reader = csv.reader(f)
        header = next(reader)
        col_index = {name: i for i, name in enumerate(header)}
        for row in reader:
            if not row or not row[0]:
                continue
            if row[0].endswith(")"):
                cur = row[0]
                category_avgs[cur] = {m["name"]: [] for m in MODELS}
                continue
            if cur is None:
                continue
            entity = row[0].strip()
            for model in MODELS:
                for col in model["entity_cols"]:
                    idx = col_index.get(col)
                    if idx is None or not row[idx].strip():
                        continue
                    val = parse_pct(row[idx])
                    category_avgs[cur][model["name"]].append(val)
    category_means = {
        cat: {m: round(mean(vals), 1) if vals else 0.0 for m, vals in per_model.items()}
        for cat, per_model in category_avgs.items()
    }
    return category_means


def load_route_table() -> dict[str, float]:
    path = SOURCES / "route_accuracy_table.csv"
    per_model: dict[str, list[float]] = {m["name"]: [] for m in MODELS}
    with path.open(newline="", encoding="utf-8") as f:
        reader = csv.reader(f)
        header = next(reader)
        col_index = {name: i for i, name in enumerate(header)}
        for row in reader:
            if not row or row[0] == "Medication Route":
                continue
            for model in MODELS:
                for col in model["route_cols"]:
                    idx = col_index.get(col)
                    if idx is None or not row[idx].strip():
                        continue
                    per_model[model["name"]].append(parse_pct(row[idx]))
    return {m: round(mean(vals), 1) if vals else 0.0 for m, vals in per_model.items()}


def load_ddi_identification_table3() -> dict[str, dict[str, float]]:
    """DDI identification paper Table 3 experiment-level accuracy rows."""
    path = SOURCES / "ddi_identification_table3.csv"
    out: dict[str, dict[str, float]] = {m["name"]: {} for m in MODELS}
    with path.open(newline="", encoding="utf-8") as f:
        reader = csv.reader(f)
        header = next(reader)
        col_index = {name: i for i, name in enumerate(header)}
        for row in reader:
            if not row:
                continue
            task = row[0].strip()
            for model in MODELS:
                for col in model["ddi_paper_cols"]:
                    idx = col_index.get(col)
                    if idx is None or not row[idx].strip():
                        continue
                    out[model["name"]][task] = parse_pct(row[idx])
    return out


def load_rx_llm_primary_metrics() -> dict[str, dict[str, float]]:
    """Rx-Bench Tables 2-3 primary task metrics used in Figure 2."""
    path = SOURCES / "rx_llm_tables_2_3.csv"
    out: dict[str, dict[str, float]] = {m["name"]: {} for m in MODELS}
    with path.open(newline="", encoding="utf-8") as f:
        reader = csv.reader(f)
        header = next(reader)
        col_index = {name: i for i, name in enumerate(header)}
        for row in reader:
            if not row:
                continue
            source_task = row[0].strip()
            task = "Rx-Bench DDI ID" if source_task == "DDI ID" else source_task
            for model in MODELS:
                for col in model["rx_llm_cols"]:
                    idx = col_index.get(col)
                    if idx is None or not row[idx].strip():
                        continue
                    out[model["name"]][task] = parse_pct(row[idx])
    return out


def load_ddi_verification_accuracy() -> dict[str, float]:
    """LLM-Uncertainty-DDI supplement: verification task default-prompt accuracy."""
    path = SOURCES / "table_4_results.csv"
    out: dict[str, float] = {}
    with path.open(newline="", encoding="utf-8") as f:
        reader = csv.reader(f)
        header = next(reader)
        col_index = {name: i for i, name in enumerate(header)}
        for row in reader:
            if len(row) < 3:
                continue
            prompt = row[0].strip().strip('"')
            metric = row[1].strip().strip('"')
            if prompt == "Default Prompt with Hedging" and metric == "Correct Answer Rate":
                for model in MODELS:
                    for col in model["ddi_cols"]:
                        idx = col_index.get(col)
                        if idx is None:
                            continue
                        raw = row[idx].strip().strip('"')
                        out[model["name"]] = parse_pct(raw.split("[")[0].strip())
                break
    return out


def earned_failed(score: float) -> dict[str, float]:
    earned = max(0, min(100, round(score, 1)))
    return {"earned": earned, "failed": round(100 - earned, 1)}


def build() -> dict:
    category_means = load_entity_table()
    route_selection_means = load_route_table()
    rx_llm_primary_metrics = load_rx_llm_primary_metrics()
    ddi_paper_acc = load_ddi_identification_table3()
    ddi_verification_acc = load_ddi_verification_accuracy()

    task_scores: dict[str, dict[str, float]] = {m["name"]: {} for m in MODELS}

    for model in MODELS:
        name = model["name"]
        for rx_task, score in rx_llm_primary_metrics.get(name, {}).items():
            task_scores[name][rx_task] = score
        if model["route_cols"]:
            task_scores[name]["MedMatch Route Selection"] = route_selection_means[name]
        for ddi_task in ["DDI ID", "DDI 3-Drug Combo", "DDI Multi-Drug"]:
            if ddi_task in ddi_paper_acc.get(name, {}):
                task_scores[name][ddi_task] = ddi_paper_acc[name][ddi_task]
        if name in ddi_verification_acc:
            task_scores[name]["DDI Verification"] = ddi_verification_acc[name]
        if model["entity_cols"]:
            for cat, task in MEDMATCH_CATEGORY_MAP.items():
                task_scores[name][task] = category_means[cat][name]
        pokemon = POKEMON_CONFAB_DEFAULT_DOSING.get(name)
        if pokemon:
            task_scores[name]["Pokémon (Generic)"] = round(100 - pokemon["generic"], 1)
            task_scores[name]["Pokémon (Brand)"] = round(100 - pokemon["brand"], 1)

    def avg_tasks(name: str, tasks: list[str]) -> float | None:
        vals = [task_scores[name][t] for t in tasks if t in task_scores[name]]
        return round(mean(vals) / 100, 3) if vals else None

    def avg_rx_llm_tasks(name: str, tasks: list[str]) -> float | None:
        vals = [rx_llm_primary_metrics.get(name, {}).get(t) for t in tasks]
        vals = [v for v in vals if v is not None]
        return round(mean(vals) / 100, 3) if vals else None

    def score_value(score: float | None) -> str:
        return f"{score:.3f}" if score is not None else "N/A"

    ddi_paper_tasks = ["DDI ID", "DDI 3-Drug Combo", "DDI Multi-Drug"]
    rx_llm_tasks = [
        "Formulation Matching",
        "Drug Order Gen (Sig)",
        "Route Matching",
        "Rx-Bench DDI ID",
        "Renal Dose ID",
        "Drug-Indication",
    ]
    medmatch_tasks = list(MEDMATCH_CATEGORY_MAP.values()) + ["MedMatch Route Selection"]
    pokemon_tasks = ["Pokémon (Generic)", "Pokémon (Brand)"]

    models_out = []
    for model in MODELS:
        name = model["name"]
        rx_llm_score = avg_rx_llm_tasks(name, rx_llm_tasks)
        ddi_score = avg_tasks(name, ddi_paper_tasks)
        medmatch_score = avg_tasks(name, medmatch_tasks)
        pokemon_score = avg_tasks(name, pokemon_tasks)
        reported_scores = [s for s in [rx_llm_score, ddi_score, medmatch_score, pokemon_score] if s is not None]
        win_rate = round(mean(reported_scores), 3) if reported_scores else 0.0
        models_out.append({
            "name": name,
            "type": model["type"],
            "provider": model["provider"],
            "access": model["access"],
            "winRate": win_rate,
            "costPer1mTokens": model["costPer1mTokens"],
            "latency": model["latency"],
            "isCustom": False,
        })

    benchmark_results = []
    for model in MODELS:
        name = model["name"]
        for task_name, score in task_scores[name].items():
            row = earned_failed(score)
            benchmark_results.append({
                "modelName": name,
                "taskName": task_name,
                "earned": row["earned"],
                "failed": row["failed"],
            })

    leaderboard_scores = []
    for model in MODELS:
        name = model["name"]
        rx_llm_score = avg_rx_llm_tasks(name, rx_llm_tasks)
        ddi_score = avg_tasks(name, ddi_paper_tasks)
        medmatch_score = avg_tasks(name, medmatch_tasks)
        pokemon_score = avg_tasks(name, pokemon_tasks)
        reported_scores = [s for s in [rx_llm_score, ddi_score, medmatch_score, pokemon_score] if s is not None]
        macro_win = round(mean(reported_scores), 3) if reported_scores else None
        source_coverage = f"{len(reported_scores)}/4"

        accuracy_rows = {
            "Mean Win Rate": score_value(macro_win),
            "Rx-Bench (CMM)": score_value(rx_llm_score),
            "DDI Identification": score_value(ddi_score),
            "MedMatch": score_value(medmatch_score),
            "Drug or Pokémon?": score_value(pokemon_score),
        }
        efficiency_rows = {
            "Cost (per 1M tokens)": model["costPer1mTokens"],
            "Latency (s / request)": model["latency"],
        }
        general_rows = {
            "Provider": model["provider"],
            "Access": model["access"],
            "Model Type": model["type"],
            "Source Coverage": source_coverage,
        }
        for metric, value in accuracy_rows.items():
            leaderboard_scores.append({"modelName": name, "metricName": metric, "tab": "Accuracy", "value": value})
        for metric, value in efficiency_rows.items():
            leaderboard_scores.append({"modelName": name, "metricName": metric, "tab": "Efficiency", "value": value})
        for metric, value in general_rows.items():
            leaderboard_scores.append({"modelName": name, "metricName": metric, "tab": "General information", "value": value})

    return {
        "models": models_out,
        "benchmarkResults": benchmark_results,
        "leaderboardScores": leaderboard_scores,
        "taskDefinitions": TASK_DEFINITIONS,
        "meta": {
            "papers": {
                "rxLlm": {
                    "title": "Rx-Bench",
                    "doi": "10.64898/2025.12.01.25341004",
                    "url": "https://www.medrxiv.org/content/10.64898/2025.12.01.25341004v2",
                },
                "ddiIdentification": {
                    "title": "Drug-drug interaction identification using large language models",
                    "doi": "10.64898/2025.12.03.25341549",
                    "url": "https://www.medrxiv.org/content/10.64898/2025.12.03.25341549v2",
                },
                "pokemon": {
                    "title": "Drug or Pokémon?",
                    "pmc": "PMC12870567",
                    "url": "https://pmc.ncbi.nlm.nih.gov/articles/PMC12870567/",
                },
                "medMatch": {
                    "title": "MedMatch: a first step for the automation of large language model performance benchmarking for medication-related tasks",
                    "doi": "10.64898/2026.01.13.26343949",
                    "pmc": "PMC12870651",
                    "url": "https://pmc.ncbi.nlm.nih.gov/articles/PMC12870651/",
                    "github": "https://github.com/AIChemist-Lab/MedMatch",
                },
            },
            "sources": [
                "Rx-Bench submission 4.8.26 / medRxiv 10.64898/2025.12.01.25341004",
                "DDI identification medRxiv 10.64898/2025.12.03.25341549",
                "MedMatch medRxiv 10.64898/2026.01.13.26343949 / PMC12870651",
                "Drug or Pokémon? PMC12870567",
                "github.com/AIChemist-Lab/MedMatch, LLM-Uncertainty-DDI appendix tables",
            ],
            "supportedModels": [m["name"] for m in MODELS],
            "scorePolicy": {
                "reportedMean": "Mean Win Rate averages only source-backed paper scores and excludes N/A cells.",
                "sourceCoverage": "Number of primary papers with source-backed performance for the model out of four.",
                "rxLlm": "Rx-Bench (CMM) is the macro mean of the six primary task metrics reported in Rx-Bench Tables 2-3; task-level scores remain available in Scenarios.",
                "pokemon": "Drug or Pokémon? scores are suspicion detected = 100 - default-dosing confabulation rate; unreported models are N/A, not zero.",
            },
            "note": "Mean Win Rate is the reported mean over source-backed paper scores only. Rx-Bench (CMM) is the macro mean of six primary task metrics from Rx-Bench Tables 2-3; task-level scores remain attached to Scenarios rather than the main leaderboard. MedGemma-27B is listed separately where source tables report MedGemma rather than base Gemma 3 27B. DrugGPT scores now include Rx-Bench and DDI identification source tables, but remain N/A for MedMatch and Drug or Pokémon? where not reported. DDI Verification remains a supplemental LLM-Uncertainty-DDI row and is not part of the four-paper reported mean. GPT-5 Chat and DrugGPT were not evaluated in the Drug or Pokémon? source table. Cost and Latency are indicative estimates and are not source-backed.",
        },
    }


def main() -> None:
    data = build()
    OUT.write_text(json.dumps(data, indent=2) + "\n", encoding="utf-8")
    print(f"Wrote {OUT}")
    print(f"Models: {len(data['models'])}, benchmark rows: {len(data['benchmarkResults'])}")


if __name__ == "__main__":
    main()
