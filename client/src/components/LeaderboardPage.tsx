import { useEffect, useMemo, useState } from "react";
import { useQueries } from "@tanstack/react-query";
import type { Model, LeaderboardScore, TaskDefinition, BenchmarkResult } from "@shared/schema";
import { ArrowDown, ArrowDownUp, ArrowUp, BookOpen, ChevronRight, ExternalLink, Github, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  FAILURE_CATEGORIES,
  LEADERBOARD_ACCURACY_METRICS,
  PHAMDRUGBENCH_INTRO,
  TASK_TAXONOMY,
} from "@/data/benchmarkContent";
import { PharmDrugBenchHeroDiagram } from "@/components/PharmDrugBenchHeroDiagram";

type LeaderboardPageProps = {
  models: Model[];
  leaderboardScores: LeaderboardScore[];
  taskDefs: TaskDefinition[];
};

type RouteId = "home" | "leaderboard" | "errors" | "models" | "scenarios" | "runs";
type ScoreTab = "Accuracy" | "Efficiency" | "General information";
type SortDirection = "desc" | "asc";
type LeaderboardSort = { rowKey: string; direction: SortDirection };
type FailureSortKey = "model" | "cmm" | "ddi" | "formatting" | "adversarial" | "overall";
type FailureByModel = {
  model: Model;
  totalFailed: number;
  totalEvaluated: number;
  overallRate: number | null;
  domains: Array<(typeof FAILURE_CATEGORIES)[number] & { failed: number; total: number; rate: number | null }>;
};

const ROUTES: Array<{ id: Exclude<RouteId, "home">; label: string; hash: string }> = [
  { id: "leaderboard", label: "Leaderboard", hash: "#/leaderboard" },
  { id: "errors", label: "Errors", hash: "#/errors" },
  { id: "models", label: "Models", hash: "#/models" },
  { id: "scenarios", label: "Scenarios", hash: "#/scenarios" },
  { id: "runs", label: "Predictions", hash: "#/runs" },
];

const SCORE_TABS: ScoreTab[] = ["Accuracy", "Efficiency", "General information"];

const SCORE_ROWS: Record<
  ScoreTab,
  Array<{
    key: string;
    label: string;
    metricName?: string;
    tab?: string;
    subtitle?: string;
    kind?: "score" | "provider" | "access";
  }>
> = {
  Accuracy: LEADERBOARD_ACCURACY_METRICS.map((metric) => ({
    key: metric.name,
    label: metric.name === "Mean Win Rate" ? "Reported Mean" : metric.name,
    metricName: metric.name,
    tab: "Accuracy",
    subtitle: metric.subtitle,
    kind: "score",
  })),
  Efficiency: [
    {
      key: "cost",
      label: "Cost / 1M *",
      metricName: "Cost (per 1M tokens)",
      tab: "Efficiency",
      subtitle: "Indicative estimate",
      kind: "score",
    },
    {
      key: "latency",
      label: "Latency *",
      metricName: "Latency (s / request)",
      tab: "Efficiency",
      subtitle: "Indicative estimate",
      kind: "score",
    },
  ],
  "General information": [
    {
      key: "coverage",
      label: "Source Coverage",
      metricName: "Source Coverage",
      tab: "General information",
      subtitle: "Reported papers out of 4",
      kind: "score",
    },
    { key: "provider", label: "Provider", subtitle: "Model provider", kind: "provider" },
    { key: "access", label: "Access", subtitle: "Public availability", kind: "access" },
  ],
};

const DOMAIN_TASK_MAP = {
  cmm: [
    "Formulation Matching",
    "Drug Order Gen (Sig)",
    "Route Matching",
    "Rx-Bench DDI ID",
    "Renal Dose ID",
    "Drug-Indication",
  ],
  ddi: ["DDI ID", "DDI 3-Drug Combo", "DDI Multi-Drug", "DDI Verification"],
  formatting: [
    "MedMatch (Oral Solid)",
    "MedMatch (Oral Liq)",
    "MedMatch (IV Intermit)",
    "MedMatch (IV Push)",
    "MedMatch (Continuous Titrate)",
    "MedMatch (Continuous Non-Titrate)",
    "MedMatch Route Selection",
  ],
  adversarial: ["Pokémon (Generic)", "Pokémon (Brand)"],
};

const MODEL_DESCRIPTIONS: Record<string, string> = {
  "GPT-4o-mini": "GPT-4o mini is a compact GPT-4o family model from OpenAI, released in July 2024.",
  "GPT-5 Chat": "GPT-5 Chat is an OpenAI GPT-5 family chat model released in August 2025.",
  "MedGemma-27B": "MedGemma-27B is a medically tuned 27B Gemma family model from Google, released in May 2025.",
  "Gemma 3 27B": "Gemma 3 27B is a 27B open-weight Gemma 3 family model from Google, released in March 2025.",
  "Llama 3.3 70B": "Llama 3.3 70B Instruct is a Llama 3 family open-weight model from Meta, released in December 2024.",
  "Qwen3 32B": "Qwen3 32B is a 32B dense Qwen3 family model from Alibaba/Qwen, released in April 2025.",
  DrugGPT: "DrugGPT is a knowledge-grounded drug-analysis language model, introduced in 2024 and published in 2025.",
};

const SCENARIO_PAPER_GROUPS = TASK_TAXONOMY.filter((group) => group.domain !== "DDI Verification");

function routeFromHash(hash: string): RouteId {
  if (hash.startsWith("#/leaderboard")) return "leaderboard";
  if (hash.startsWith("#/errors")) return "errors";
  if (hash.startsWith("#/models")) return "models";
  if (hash.startsWith("#/scenarios")) return "scenarios";
  if (hash.startsWith("#/runs")) return "runs";
  return "home";
}

function hashForRoute(route: RouteId): string {
  if (route === "home") return "#/";
  return ROUTES.find((r) => r.id === route)?.hash ?? "#/";
}

function formatScoreAsPercent(value: string | number | undefined): string {
  if (value == null || value === "-") return "—";
  const n = typeof value === "number" ? value : parseFloat(value);
  if (Number.isNaN(n)) return String(value);
  if (n >= 0 && n <= 1) return `${(n * 100).toFixed(1)}%`;
  return String(value);
}

function formatCount(value: number): string {
  return Number.isInteger(value) ? String(value) : value.toFixed(1);
}

function getScore(
  scores: LeaderboardScore[],
  modelId: number,
  metricName: string,
  tab = "Accuracy",
): string {
  return scores.find((s) => s.modelId === modelId && s.metricName === metricName && s.tab === tab)?.value ?? "-";
}

function getRawScore(
  scores: LeaderboardScore[],
  modelId: number,
  row: (typeof SCORE_ROWS)[ScoreTab][number],
): string {
  if (!row.metricName) return "-";
  return getScore(scores, modelId, row.metricName, row.tab);
}

function formatScoreCell(
  scores: LeaderboardScore[],
  model: Model,
  row: (typeof SCORE_ROWS)[ScoreTab][number],
): string {
  if (row.kind === "provider") return model.provider;
  if (row.kind === "access") return model.access;
  const raw = getRawScore(scores, model.id, row);
  if (row.tab === "Accuracy") return formatScoreAsPercent(raw);
  return raw === "-" ? "—" : raw;
}

function parseSortableNumber(value: string): number | null {
  if (value === "-" || value === "N/A") return null;
  const match = value.replace(/[$,%]/g, "").match(/-?\d+(\.\d+)?/);
  return match ? Number(match[0]) : null;
}

function compareNullableNumbers(a: number | null, b: number | null, direction: SortDirection): number {
  if (a == null && b == null) return 0;
  if (a == null) return 1;
  if (b == null) return -1;
  return direction === "desc" ? b - a : a - b;
}

function SortIcon({ active, direction }: { active: boolean; direction: SortDirection }) {
  const Icon = active ? (direction === "desc" ? ArrowDown : ArrowUp) : ArrowDownUp;
  return <Icon size={12} className={active ? "text-teal-700" : "text-slate-300"} aria-hidden />;
}

function scoreTone(value: string): string {
  return value === "N/A" || value === "-" ? "text-slate-400 font-semibold" : "text-slate-700";
}

function errorRateColor(rate: number): string {
  return rate > 0 ? "bg-rose-500" : "bg-slate-300";
}

function errorRateText(rate: number): string {
  return rate > 0 ? "text-slate-900" : "text-slate-500";
}

function providerDotClass(provider: string): string {
  const map: Record<string, string> = {
    OpenAI: "bg-teal-500",
    Google: "bg-blue-500",
    Meta: "bg-indigo-500",
    Alibaba: "bg-orange-500",
    DrugGPT: "bg-violet-500",
  };
  return map[provider] ?? "bg-slate-400";
}

function taskDomainForName(taskName: string): keyof typeof DOMAIN_TASK_MAP | null {
  for (const [domain, tasks] of Object.entries(DOMAIN_TASK_MAP)) {
    if (tasks.includes(taskName)) return domain as keyof typeof DOMAIN_TASK_MAP;
  }
  return null;
}

function scenarioForTaskName(taskName: string): string {
  return TASK_TAXONOMY.find((group) => (group.tasks as readonly string[]).includes(taskName))?.domain ?? "Unmapped scenario";
}

function predictionQueryForMetric(modelName: string, metricName?: string): string {
  if (!metricName || metricName === "Mean Win Rate" || metricName === "Source Coverage") return modelName;
  if (metricName === "Rx-Bench (CMM)") return `${modelName} CMM`;
  if (metricName === "DDI Identification") return `${modelName} DDI`;
  if (metricName === "Drug or Pokémon?") return `${modelName} Pokémon`;
  if (metricName === "Cost (per 1M tokens)" || metricName === "Latency (s / request)") return modelName;
  return `${modelName} ${metricName}`;
}

function slug(text: string): string {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "");
}

function modelDescription(model: Model): string {
  return MODEL_DESCRIPTIONS[model.name] ?? `${model.name} is a ${model.provider} model entry; release metadata is not tracked.`;
}

export function LeaderboardPage({ models, leaderboardScores, taskDefs }: LeaderboardPageProps) {
  const [activeRoute, setActiveRoute] = useState<RouteId>(() =>
    typeof window === "undefined" ? "home" : routeFromHash(window.location.hash),
  );
  const [scoreTab, setScoreTab] = useState<ScoreTab>("Accuracy");
  const [predictionQuery, setPredictionQuery] = useState("");
  const [predictionRegex, setPredictionRegex] = useState(false);

  useEffect(() => {
    const handleHashChange = () => setActiveRoute(routeFromHash(window.location.hash));
    handleHashChange();
    window.addEventListener("hashchange", handleHashChange);
    return () => window.removeEventListener("hashchange", handleHashChange);
  }, []);

  const navigate = (route: RouteId) => {
    setActiveRoute(route);
    window.location.hash = hashForRoute(route);
    window.setTimeout(() => window.scrollTo({ top: 0, behavior: "smooth" }), 0);
  };

  const benchmarkQueries = useQueries({
    queries: models.map((m) => ({
      queryKey: ["/api/benchmark-results", m.id],
      queryFn: async (): Promise<BenchmarkResult[]> => {
        const res = await fetch(`/api/benchmark-results/${m.id}`);
        if (!res.ok) return [];
        return res.json();
      },
    })),
  });

  const rankedModels = useMemo(() => {
    return [...models].sort((a, b) => {
      const aVal = parseFloat(getScore(leaderboardScores, a.id, "Mean Win Rate"));
      const bVal = parseFloat(getScore(leaderboardScores, b.id, "Mean Win Rate"));
      if (Number.isNaN(aVal) && Number.isNaN(bVal)) return 0;
      if (Number.isNaN(aVal)) return 1;
      if (Number.isNaN(bVal)) return -1;
      return bVal - aVal;
    });
  }, [models, leaderboardScores]);

  const allBenchmarkResults = useMemo(() => {
    const map = new Map<number, BenchmarkResult[]>();
    models.forEach((m, i) => {
      map.set(m.id, benchmarkQueries[i]?.data ?? []);
    });
    return map;
  }, [models, benchmarkQueries]);

  const failureByModel = useMemo(() => {
    return rankedModels.map((model) => {
      const results = allBenchmarkResults.get(model.id) ?? [];
      const totals = { cmm: 0, ddi: 0, formatting: 0, adversarial: 0 };
      const failed = { cmm: 0, ddi: 0, formatting: 0, adversarial: 0 };

      for (const r of results) {
        const domain = taskDomainForName(r.taskName);
        if (!domain) continue;
        totals[domain] += r.earned + r.failed;
        failed[domain] += r.failed;
      }

      const totalEvaluated = Object.values(totals).reduce((a, b) => a + b, 0);
      const totalFailed = Object.values(failed).reduce((a, b) => a + b, 0);

      return {
        model,
        totalFailed,
        totalEvaluated,
        overallRate: totalEvaluated > 0 ? (totalFailed / totalEvaluated) * 100 : null,
        domains: FAILURE_CATEGORIES.map((c) => {
          const key = c.key as keyof typeof failed;
          const total = totals[key];
          const fail = failed[key];
          return {
            ...c,
            failed: fail,
            total,
            rate: total > 0 ? (fail / total) * 100 : null,
          };
        }),
      };
    });
  }, [rankedModels, allBenchmarkResults]);

  const predictionRows = useMemo(() => {
    return rankedModels.flatMap((model) => {
      const results = allBenchmarkResults.get(model.id) ?? [];
      return results.map((result) => {
        const total = result.earned + result.failed;
        const errorRate = total > 0 ? (result.failed / total) * 100 : null;
        return {
          run: `${slug(result.taskName)}:model=${slug(model.name)}`,
          model,
          scenario: scenarioForTaskName(result.taskName),
          taskName: result.taskName,
          earned: result.earned,
          failed: result.failed,
          total,
          errorRate,
        };
      });
    });
  }, [rankedModels, allBenchmarkResults]);

  const filteredPredictionRows = useMemo(() => {
    const q = predictionQuery.trim();
    if (!q) return predictionRows;
    if (predictionRegex) {
      try {
        const re = new RegExp(q, "i");
        return predictionRows.filter((row) => re.test(`${row.run} ${row.model.name} ${row.scenario} ${row.taskName}`));
      } catch {
        return [];
      }
    }
    const lower = q.toLowerCase();
    const tokens = lower.split(/\s+/).filter(Boolean);
    return predictionRows.filter((row) => {
      const haystack = `${row.run} ${row.model.name} ${row.model.provider} ${row.scenario} ${row.taskName}`.toLowerCase();
      return tokens.every((token) => haystack.includes(token));
    });
  }, [predictionQuery, predictionRegex, predictionRows]);

  const openPredictions = (query: string) => {
    setPredictionQuery(query);
    navigate("runs");
  };

  const scoreRows = SCORE_ROWS[scoreTab];

  const bestByRow = useMemo(() => {
    const max = new Map<string, number>();
    for (const row of scoreRows) {
      if (row.tab !== "Accuracy" || !row.metricName) continue;
      const values = rankedModels
        .map((model) => parseFloat(getRawScore(leaderboardScores, model.id, row)))
        .filter((value) => !Number.isNaN(value));
      if (values.length) max.set(row.key, Math.max(...values));
    }
    return max;
  }, [scoreRows, rankedModels, leaderboardScores]);

  return (
    <div className="physicianbench-page min-h-screen bg-[#fafafa] text-slate-900">
      <header className="sticky top-0 z-50 border-b border-slate-200/80 bg-white/95 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-6 h-16 flex items-center justify-between gap-2 lg:gap-4">
          <button
            type="button"
            onClick={() => navigate("home")}
            className="flex flex-shrink-0 items-center gap-2.5 cursor-pointer"
          >
            <img src="/logo.png" alt="" width={28} height={28} className="rounded-md flex-shrink-0" />
            <span className="font-bold text-sm tracking-tight whitespace-nowrap">PharmDrugBench</span>
          </button>
          <nav className="hidden md:flex min-w-0 flex-1 items-center justify-center gap-0.5 overflow-x-auto lg:gap-1">
            {ROUTES.map((route) => (
              <a
                key={route.id}
                href={route.hash}
                onClick={() => setActiveRoute(route.id)}
                aria-current={activeRoute === route.id ? "page" : undefined}
                className={`flex-shrink-0 px-2.5 lg:px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                  activeRoute === route.id
                    ? "bg-teal-50 text-teal-800"
                    : "text-slate-600 hover:text-teal-700 hover:bg-teal-50/60"
                }`}
              >
                {route.label}
              </a>
            ))}
          </nav>
          <Button variant="outline" size="sm" className="flex-shrink-0 text-slate-600" asChild>
            <a href="https://github.com/AIChemist-Lab" target="_blank" rel="noopener noreferrer">
              <Github size={14} className="mr-1.5" />
              GitHub
            </a>
          </Button>
        </div>
      </header>

      {activeRoute === "home" ? (
        <HomeView navigate={navigate} models={rankedModels} scores={leaderboardScores} />
      ) : (
        <main className="max-w-7xl mx-auto px-4 sm:px-6 py-10 sm:py-14">
          {activeRoute === "leaderboard" && (
            <LeaderboardView
              scoreTab={scoreTab}
              setScoreTab={setScoreTab}
              rows={scoreRows}
              models={rankedModels}
              scores={leaderboardScores}
              bestByRow={bestByRow}
              openPredictions={openPredictions}
            />
          )}
          {activeRoute === "errors" && <ErrorAnalysis failureByModel={failureByModel} />}
          {activeRoute === "models" && <ModelsView models={rankedModels} />}
          {activeRoute === "scenarios" && (
            <ScenariosView models={rankedModels} resultsByModel={allBenchmarkResults} taskDefs={taskDefs} />
          )}
          {activeRoute === "runs" && (
            <PredictionsView
              rows={filteredPredictionRows}
              totalRows={predictionRows.length}
              query={predictionQuery}
              setQuery={setPredictionQuery}
              regex={predictionRegex}
              setRegex={setPredictionRegex}
            />
          )}
        </main>
      )}

      <footer className="border-t border-slate-200 bg-white py-8 mt-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-slate-500">
          <div className="flex items-center gap-2">
            <img src="/logo.png" alt="" width={20} height={20} className="rounded" />
            <span className="font-semibold text-slate-700">PharmDrugBench</span>
            <span className="text-slate-300">·</span>
            <span>v1</span>
          </div>
          <p className="text-xs text-center">
            Built for advancing medication-safety LLM evaluation · Dataset and leaderboard open to the community
          </p>
        </div>
      </footer>
    </div>
  );
}

function HomeView({
  navigate,
  models,
  scores,
}: {
  navigate: (route: RouteId) => void;
  models: Model[];
  scores: LeaderboardScore[];
}) {
  return (
    <main className="max-w-7xl mx-auto px-4 sm:px-6 py-10 sm:py-14">
      <section className="grid md:grid-cols-[minmax(0,0.92fr)_minmax(320px,1.08fr)] gap-8 lg:gap-12 items-center overflow-visible">
        <div className="text-left space-y-5">
          <div className="space-y-3">
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-teal-700">
              Medication-safety LLM benchmark
            </p>
            <h1 className="text-4xl lg:text-5xl font-bold tracking-tight text-slate-900 leading-[1.04]">
              {PHAMDRUGBENCH_INTRO.headline}
            </h1>
            <p className="text-lg sm:text-xl text-slate-600 leading-snug max-w-xl">
              {PHAMDRUGBENCH_INTRO.subheadline}
            </p>
          </div>
          <div className="max-w-2xl pt-1">
            <p className="text-sm font-semibold text-slate-800">{PHAMDRUGBENCH_INTRO.institution}</p>
            <p className="text-[11px] sm:text-xs text-slate-600 leading-[1.55]">
              {PHAMDRUGBENCH_INTRO.authors}
            </p>
          </div>
          <p className="text-slate-600 leading-relaxed text-[14px] max-w-xl">
            {PHAMDRUGBENCH_INTRO.summary}
          </p>
          <div className="flex flex-wrap items-center gap-3 pt-1">
            <Button
              size="lg"
              type="button"
              className="bg-teal-700 hover:bg-teal-800 text-white rounded-lg px-6 shrink-0 cursor-pointer"
              onClick={() => navigate("leaderboard")}
            >
              Leaderboard
              <ChevronRight size={16} className="ml-1" />
            </Button>
            <Button
              variant="outline"
              size="lg"
              type="button"
              className="rounded-lg shrink-0 border-slate-200 text-slate-700 cursor-pointer"
              onClick={() => navigate("errors")}
            >
              Errors
            </Button>
            <Button variant="outline" size="lg" className="rounded-lg shrink-0 border-slate-200 text-slate-700" asChild>
              <a href="https://www.medrxiv.org/content/10.64898/2025.12.01.25341004v2" target="_blank" rel="noopener noreferrer">
                <BookOpen size={16} className="mr-2" />
                Read the Paper
              </a>
            </Button>
          </div>
        </div>
        <div className="w-full space-y-5">
          <HomeRankingPreview models={models} scores={scores} navigate={navigate} />
          <div className="w-full flex justify-center lg:justify-end">
            <PharmDrugBenchHeroDiagram className="w-full max-w-[640px] opacity-95" />
          </div>
        </div>
      </section>
    </main>
  );
}

function HomeRankingPreview({
  models,
  scores,
  navigate,
}: {
  models: Model[];
  scores: LeaderboardScore[];
  navigate: (route: RouteId) => void;
}) {
  return (
    <section
      aria-label="Current PharmDrugBench ranking"
      className="max-w-xl overflow-hidden rounded-lg border border-slate-200/80 bg-white"
    >
      <div className="flex items-center justify-between gap-3 border-b border-slate-100 px-4 py-3">
        <div>
          <h2 className="text-sm font-bold text-slate-900">Current Ranking</h2>
          <p className="text-[11px] text-slate-500">Reported Mean · source-backed values only</p>
        </div>
        <button
          type="button"
          onClick={() => navigate("leaderboard")}
          className="text-xs font-semibold text-teal-700 hover:text-teal-900 hover:underline"
        >
          Full leaderboard
        </button>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-slate-50/70 text-[10px] font-semibold uppercase tracking-wider text-slate-500">
              <th className="w-10 px-4 py-2 text-left">#</th>
              <th className="px-3 py-2 text-left">Model</th>
              <th className="px-3 py-2 text-right">Mean</th>
              <th className="px-4 py-2 text-right">Coverage</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {models.map((model, index) => {
              const mean = getScore(scores, model.id, "Mean Win Rate");
              const coverage = getScore(scores, model.id, "Source Coverage", "General information");
              return (
                <tr key={model.id} className="hover:bg-slate-50/70">
                  <td className="px-4 py-2.5 text-xs font-semibold text-slate-500">{index + 1}</td>
                  <td className="px-3 py-2.5">
                    <div className="flex items-center gap-2">
                      <span className={`h-1.5 w-1.5 rounded-full ${providerDotClass(model.provider)}`} />
                      <span className="font-medium text-slate-900">{model.name}</span>
                    </div>
                  </td>
                  <td className="px-3 py-2.5 text-right font-semibold tabular-nums text-slate-900">
                    {formatScoreAsPercent(mean)}
                  </td>
                  <td className="px-4 py-2.5 text-right text-xs tabular-nums text-slate-500">{coverage}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function LeaderboardView({
  scoreTab,
  setScoreTab,
  rows,
  models,
  scores,
  bestByRow,
  openPredictions,
}: {
  scoreTab: ScoreTab;
  setScoreTab: (tab: ScoreTab) => void;
  rows: typeof SCORE_ROWS[ScoreTab];
  models: Model[];
  scores: LeaderboardScore[];
  bestByRow: Map<string, number>;
  openPredictions: (query: string) => void;
}) {
  const [sort, setSort] = useState<LeaderboardSort>({ rowKey: "Mean Win Rate", direction: "desc" });
  const activeSortRow = rows.find((row) => row.key === sort.rowKey && row.kind === "score") ?? rows.find((row) => row.kind === "score");
  const sortedModels = useMemo(() => {
    if (!activeSortRow) return models;
    return [...models].sort((a, b) => {
      const result = compareNullableNumbers(
        parseSortableNumber(getRawScore(scores, a.id, activeSortRow)),
        parseSortableNumber(getRawScore(scores, b.id, activeSortRow)),
        sort.direction,
      );
      return result || a.name.localeCompare(b.name);
    });
  }, [activeSortRow, models, scores, sort.direction]);

  const toggleSort = (row: (typeof SCORE_ROWS)[ScoreTab][number]) => {
    if (row.kind !== "score") return;
    setSort((current) => ({
      rowKey: row.key,
      direction: current.rowKey === row.key && current.direction === "desc" ? "asc" : "desc",
    }));
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl sm:text-4xl font-bold tracking-tight">Leaderboard: PharmDrugBench Scenarios</h1>
        <p className="text-slate-600 mt-2">Medication-safety benchmarks with source-backed public values.</p>
      </div>

      <div className="space-y-4">
        <div className="border-b border-slate-200">
          <div className="flex flex-wrap gap-1" role="tablist" aria-label="Leaderboard metric tabs">
            {SCORE_TABS.map((tab) => (
              <button
                key={tab}
                type="button"
                role="tab"
                aria-selected={scoreTab === tab}
                onClick={() => setScoreTab(tab)}
                className={`border border-b-0 px-4 py-2 text-sm font-medium transition-colors ${
                  scoreTab === tab
                    ? "border-slate-200 bg-white text-slate-900"
                    : "border-transparent text-slate-500 hover:text-slate-900"
                }`}
              >
                {tab}
              </button>
            ))}
          </div>
        </div>

        <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[980px] text-sm" data-testid="table-leaderboard">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/70 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                  <th className="sticky left-0 z-10 w-[220px] bg-slate-50/95 px-4 py-3 text-left">Metric</th>
                  {sortedModels.map((model) => (
                    <th key={model.id} className="min-w-[140px] px-4 py-3 text-left normal-case tracking-normal">
                      <div className="font-semibold text-slate-700">{model.name}</div>
                      <div className="mt-1 inline-flex items-center gap-1.5 text-[10px] font-medium text-slate-400">
                        <span className={`h-1.5 w-1.5 rounded-full ${providerDotClass(model.provider)}`} />
                        {model.provider}
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {rows.map((row) => (
                  <tr key={row.key} className="hover:bg-slate-50/70">
                    <td className="sticky left-0 z-10 bg-white px-4 py-3">
                      {row.kind === "score" ? (
                        <button
                          type="button"
                          onClick={() => toggleSort(row)}
                          className="inline-flex items-center gap-1.5 text-left font-medium text-slate-900 hover:text-teal-800"
                          aria-label={`Sort models by ${row.label}`}
                        >
                          {row.label}
                          <SortIcon active={activeSortRow?.key === row.key} direction={sort.direction} />
                        </button>
                      ) : (
                        <div className="font-medium text-slate-900">{row.label}</div>
                      )}
                      {row.subtitle && <div className="mt-0.5 text-xs text-slate-500">{row.subtitle}</div>}
                    </td>
                    {sortedModels.map((model) => {
                      const raw = getRawScore(scores, model.id, row);
                      const n = parseFloat(raw);
                      const isBest =
                        row.tab === "Accuracy" &&
                        bestByRow.has(row.key) &&
                        !Number.isNaN(n) &&
                        n === bestByRow.get(row.key);
                      const clickable = row.kind === "score" && raw !== "N/A" && raw !== "-";
                      return (
                        <td key={model.id} className="px-4 py-3 tabular-nums">
                          {clickable ? (
                            <button
                              type="button"
                              onClick={() => openPredictions(predictionQueryForMetric(model.name, row.metricName))}
                              className={`inline-flex items-center gap-1 hover:underline ${isBest ? "font-bold text-slate-950" : scoreTone(raw)}`}
                            >
                              {formatScoreCell(scores, model, row)}
                              <ExternalLink size={11} className="text-slate-300" />
                            </button>
                          ) : (
                            <span className={row.kind === "score" ? scoreTone(raw) : "text-slate-700"}>
                              {formatScoreCell(scores, model, row)}
                            </span>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
        {scoreTab === "Accuracy" ? (
          <div className="space-y-1 text-xs text-slate-500 leading-relaxed">
            <p>
              <strong>Reported Mean</strong> averages only source-backed study scores. Coverage shows how many of the four primary papers contribute.
            </p>
            <p>
              Rx-Bench (CMM) is the macro mean of six primary task metrics from Rx-Bench Tables 2-3; task-level scores are grouped by paper in Scenarios. MedGemma-27B is listed separately where source tables report MedGemma rather than base Gemma 3 27B.
            </p>
          </div>
        ) : scoreTab === "Efficiency" ? (
          <p className="text-xs text-slate-500 leading-relaxed">
            <span className="font-semibold">*</span> Cost and Latency are indicative estimates only.
          </p>
        ) : (
          <p className="text-xs text-slate-500 leading-relaxed">
            Source Coverage reports how many primary source papers contribute to each model row; provider and access are descriptive metadata.
          </p>
        )}
      </div>
    </div>
  );
}

function ErrorAnalysis({ failureByModel }: { failureByModel: FailureByModel[] }) {
  const [sort, setSort] = useState<{ key: FailureSortKey; direction: SortDirection }>({ key: "overall", direction: "desc" });
  const sortedFailureByModel = useMemo(() => {
    return [...failureByModel].sort((a, b) => {
      if (sort.key === "model") {
        const result = a.model.name.localeCompare(b.model.name);
        return sort.direction === "desc" ? -result : result;
      }
      const aValue = sort.key === "overall" ? a.overallRate : a.domains.find((domain) => domain.key === sort.key)?.rate ?? null;
      const bValue = sort.key === "overall" ? b.overallRate : b.domains.find((domain) => domain.key === sort.key)?.rate ?? null;
      return compareNullableNumbers(aValue, bValue, sort.direction) || a.model.name.localeCompare(b.model.name);
    });
  }, [failureByModel, sort]);

  const toggleSort = (key: FailureSortKey) => {
    setSort((current) => ({
      key,
      direction: current.key === key && current.direction === "desc" ? "asc" : "desc",
    }));
  };

  const SortHeader = ({ sortKey, children }: { sortKey: FailureSortKey; children: string }) => (
    <button
      type="button"
      onClick={() => toggleSort(sortKey)}
      className="inline-flex items-center gap-1.5 text-left hover:text-teal-800"
      aria-label={`Sort by ${children}`}
    >
      {children}
      <SortIcon active={sort.key === sortKey} direction={sort.direction} />
    </button>
  );

  return (
    <section className="space-y-4">
      <div>
        <h1 className="text-3xl sm:text-4xl font-bold tracking-tight">Error Analysis</h1>
        <p className="text-sm text-slate-600 mt-1">
          Error rate by evaluated domain. Each cell shows failed normalized task-points over total evaluated task-points; unreported N/A tasks are excluded.
        </p>
      </div>
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
        {FAILURE_CATEGORIES.map((cat) => (
          <div key={cat.key} className="rounded-lg border border-slate-200/80 bg-white p-3">
            <p className="text-xs font-bold text-slate-800">{cat.label}</p>
            <p className="text-[11px] text-slate-500 mt-1">{cat.description}</p>
          </div>
        ))}
      </div>
      <div className="rounded-lg border border-slate-200/80 bg-white overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200/80 bg-slate-50/50 text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                <th className="px-4 py-2.5 text-left min-w-[150px]">
                  <SortHeader sortKey="model">Model</SortHeader>
                </th>
                {FAILURE_CATEGORIES.map((cat) => (
                  <th key={cat.key} className="px-4 py-2.5 text-left min-w-[160px]">
                    <SortHeader sortKey={cat.key as FailureSortKey}>{cat.label}</SortHeader>
                  </th>
                ))}
                <th className="px-4 py-2.5 text-left min-w-[130px]">
                  <SortHeader sortKey="overall">Overall Error</SortHeader>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {sortedFailureByModel.map(({ model, domains, overallRate, totalFailed, totalEvaluated }) => (
                <tr key={model.id} className="align-top hover:bg-slate-50/70 transition-colors">
                  <td className="px-4 py-3 font-semibold text-slate-900">{model.name}</td>
                  {domains.map((domain) => (
                    <td key={domain.key} className="px-4 py-3">
                      {domain.rate == null ? (
                        <div className="text-xs font-semibold text-slate-400">N/A</div>
                      ) : (
                        <ErrorCell rate={domain.rate} failed={domain.failed} total={domain.total} />
                      )}
                    </td>
                  ))}
                  <td className="px-4 py-3">
                    {overallRate == null ? (
                      <div className="text-xs font-semibold text-slate-400">N/A</div>
                    ) : (
                      <ErrorCell rate={overallRate} failed={totalFailed} total={totalEvaluated} />
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}

function ErrorCell({ rate, failed, total }: { rate: number; failed: number; total: number }) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-baseline justify-between gap-3">
        <span className={`text-sm font-bold ${errorRateText(rate)}`}>{rate.toFixed(1)}%</span>
        <span className="text-[11px] font-mono text-slate-500">
          {Math.round(failed)} / {Math.round(total)}
        </span>
      </div>
      <div className="h-1.5 rounded-full bg-slate-100 overflow-hidden" aria-hidden>
        <div className={`h-full rounded-full ${errorRateColor(rate)}`} style={{ width: `${Math.max(2, Math.min(100, rate))}%` }} />
      </div>
    </div>
  );
}

function ModelsView({ models }: { models: Model[] }) {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl sm:text-4xl font-bold tracking-tight">Models</h1>
      </div>
      <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-sm">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/70 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                <th className="px-4 py-3 text-left">Creator</th>
                <th className="px-4 py-3 text-left">Model</th>
                <th className="px-4 py-3 text-left">Description</th>
                <th className="px-4 py-3 text-left">Access</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {models.map((model) => (
                <tr key={model.id} className="hover:bg-slate-50/70">
                  <td className="px-4 py-4 text-base text-slate-900">{model.provider}</td>
                  <td className="px-4 py-4">
                    <div className="text-xl font-medium leading-snug text-slate-900">{model.name}</div>
                    <div className="text-xs text-slate-500">{model.type}</div>
                  </td>
                  <td className="px-4 py-4 max-w-lg text-slate-700">
                    {modelDescription(model)}
                  </td>
                  <td className="px-4 py-4">
                    <Badge variant="outline" className={model.access === "Open Weights" ? "border-emerald-100 bg-emerald-50 text-emerald-700" : "border-amber-100 bg-amber-50 text-amber-700"}>
                      {model.access}
                    </Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function ScenariosView({
  models,
  resultsByModel,
  taskDefs,
}: {
  models: Model[];
  resultsByModel: Map<number, BenchmarkResult[]>;
  taskDefs: TaskDefinition[];
}) {
  const [selectedPaper, setSelectedPaper] = useState<string>(SCENARIO_PAPER_GROUPS[0].domain);
  const [selectedTaskName, setSelectedTaskName] = useState<string>(SCENARIO_PAPER_GROUPS[0].tasks[0]);

  const paper = SCENARIO_PAPER_GROUPS.find((group) => group.domain === selectedPaper) ?? SCENARIO_PAPER_GROUPS[0];
  const taskName = (paper.tasks as readonly string[]).includes(selectedTaskName)
    ? selectedTaskName
    : paper.tasks[0];
  const taskDef = taskDefs.find((task) => task.name === taskName);

  const taskScores = useMemo(() => {
    return models
      .map((model) => {
        const result = resultsByModel.get(model.id)?.find((row) => row.taskName === taskName);
        const total = result ? result.earned + result.failed : 0;
        const score = result && total > 0 ? result.earned / total : null;
        return { model, result, total, score };
      })
      .sort((a, b) => compareNullableNumbers(a.score, b.score, "desc"));
  }, [models, resultsByModel, taskName]);

  const handlePaperChange = (domain: string) => {
    const nextPaper = SCENARIO_PAPER_GROUPS.find((group) => group.domain === domain) ?? SCENARIO_PAPER_GROUPS[0];
    setSelectedPaper(nextPaper.domain);
    setSelectedTaskName(nextPaper.tasks[0]);
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl sm:text-4xl font-bold tracking-tight">Scenarios</h1>
        <p className="text-slate-600 mt-2">Paper-grouped medication-safety task definitions and source-backed model scores.</p>
      </div>

      <div>
        <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Benchmark paper</span>
        <div className="mt-2 flex flex-wrap gap-2">
          {SCENARIO_PAPER_GROUPS.map((group) => {
            const active = group.domain === paper.domain;
            return (
              <button
                key={group.domain}
                type="button"
                onClick={() => handlePaperChange(group.domain)}
                aria-pressed={active}
                className={`rounded-full border px-4 py-2 text-sm font-semibold transition-colors ${
                  active
                    ? "border-teal-600 bg-teal-600 text-white shadow-sm"
                    : "border-slate-200 bg-white text-slate-600 hover:border-teal-300 hover:text-teal-700"
                }`}
              >
                {group.domain}
              </button>
            );
          })}
        </div>
      </div>

      <div className="rounded-lg border border-slate-200 bg-white">
        <div className="grid gap-4 px-4 py-3 min-[900px]:grid-cols-[minmax(180px,0.62fr)_minmax(0,1.08fr)_minmax(220px,0.72fr)]">
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-wider text-teal-700">{paper.domain}</p>
            <h2 className="mt-1 text-xl font-bold leading-snug text-slate-900">{taskName}</h2>
            <p className="mt-2 line-clamp-2 text-sm leading-relaxed text-slate-600">{paper.paper}</p>
            <p className="mt-1 truncate text-xs text-slate-500">{paper.dataset}</p>
          </div>

          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Prompt</p>
            <p className="mt-2 line-clamp-3 text-sm leading-relaxed text-slate-700">{taskDef?.prompt ?? paper.dataset}</p>
          </div>

          <div className="space-y-2">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Reference</p>
              <a
                href={paper.url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex shrink-0 items-center gap-1 text-sm font-semibold text-teal-700 hover:underline"
              >
                Source <ExternalLink size={13} />
              </a>
            </div>
            <p className="line-clamp-2 text-sm leading-relaxed text-slate-700">{taskDef?.humanAnnotation ?? "Clinician annotation"}</p>
            <div className="flex flex-wrap gap-1.5">
              {(taskDef?.metrics ?? ["Source-backed score"]).map((metric) => (
                <Badge key={metric} variant="outline" className="rounded-md border-slate-200 bg-slate-50 text-slate-600">
                  {metric}
                </Badge>
              ))}
            </div>
          </div>
        </div>
      </div>

      <section className="grid items-start gap-4 min-[860px]:grid-cols-[250px_minmax(0,1fr)] xl:grid-cols-[280px_minmax(0,1fr)]">
        <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
          <div className="border-b border-slate-100 px-3 py-2.5">
            <h2 className="text-sm font-bold text-slate-900">Tasks In This Paper</h2>
            <p className="mt-1 text-xs text-slate-500">{paper.tasks.length} source tasks</p>
          </div>
          <div className="divide-y divide-slate-100">
            {paper.tasks.map((name) => {
              const definition = taskDefs.find((task) => task.name === name);
              const selected = name === taskName;
              return (
                <button
                  key={name}
                  type="button"
                  onClick={() => setSelectedTaskName(name)}
                  aria-pressed={selected}
                  className={`group flex w-full items-center gap-1.5 border-l-2 px-3 py-2.5 text-left transition-colors ${
                    selected
                      ? "border-teal-500 bg-teal-50"
                      : "border-transparent bg-white hover:bg-slate-50"
                  }`}
                >
                  <span className="min-w-0 flex-1">
                    <span className={`block text-sm font-semibold leading-snug ${selected ? "text-teal-900" : "text-slate-900"}`}>
                      {name}
                    </span>
                    <span className="mt-1 block truncate text-xs leading-snug text-slate-500">
                      {definition?.metrics.slice(0, 3).join(" · ") ?? paper.dataset}
                    </span>
                  </span>
                  <ChevronRight
                    size={16}
                    className={`shrink-0 transition-opacity ${
                      selected ? "text-teal-500 opacity-100" : "text-slate-300 opacity-0 group-hover:opacity-100"
                    }`}
                  />
                </button>
              );
            })}
          </div>
        </div>

        <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
          <div className="border-b border-slate-100 px-4 py-3">
            <h2 className="text-base font-bold text-slate-900">Model Scores</h2>
            <p className="mt-1 text-xs text-slate-500">Sorted by selected task score.</p>
          </div>
          <div>
            <table className="w-full table-fixed text-sm">
              <colgroup>
                <col style={{ width: "42%" }} />
                <col style={{ width: "24%" }} />
                <col style={{ width: "18%" }} />
                <col style={{ width: "16%" }} />
              </colgroup>
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/70 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                  <th className="px-3 py-3 text-left">Model</th>
                  <th className="px-3 py-3 text-right">Score</th>
                  <th className="px-3 py-3 text-right">Earned</th>
                  <th className="px-3 py-3 text-left">Source</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {taskScores.map(({ model, result, total, score }, index) => (
                  <tr key={model.id} className="hover:bg-slate-50/70">
                    <td className="px-3 py-3">
                      <div className="flex min-w-0 items-center gap-2.5">
                        <span className={`w-5 shrink-0 text-right text-xs font-semibold tabular-nums ${score == null ? "text-slate-300" : "text-slate-400"}`}>
                          {score == null ? "–" : index + 1}
                        </span>
                        <div className="min-w-0">
                          <div className="truncate font-semibold text-slate-900">{model.name}</div>
                          <div className="truncate text-xs text-slate-500">{model.provider}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-3 py-3 text-right">
                      {score == null ? (
                        <span className="tabular-nums text-slate-400">N/A</span>
                      ) : (
                        <div className="flex items-center justify-end gap-2">
                          <span className="font-semibold tabular-nums text-slate-900">{formatScoreAsPercent(score)}</span>
                          <span className="hidden h-1.5 w-14 overflow-hidden rounded-full bg-slate-100 sm:inline-block">
                            <span className="block h-full rounded-full bg-teal-500" style={{ width: `${Math.round(score * 100)}%` }} />
                          </span>
                        </div>
                      )}
                    </td>
                    <td className="px-3 py-3 text-right text-xs tabular-nums text-slate-600 sm:text-sm">
                      {result ? `${formatCount(result.earned)} / ${formatCount(total)}` : "—"}
                    </td>
                    <td className="px-3 py-3 text-xs text-slate-600 sm:text-sm">
                      <span className="block truncate">{result ? "Paper" : "Not reported"}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>
    </div>
  );
}

function PredictionsView({
  rows,
  totalRows,
  query,
  setQuery,
  regex,
  setRegex,
}: {
  rows: Array<{
    run: string;
    model: Model;
    scenario: string;
    taskName: string;
    earned: number;
    failed: number;
    total: number;
    errorRate: number | null;
  }>;
  totalRows: number;
  query: string;
  setQuery: (query: string) => void;
  regex: boolean;
  setRegex: (regex: boolean) => void;
}) {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl sm:text-4xl font-bold tracking-tight">Predictions</h1>
        <p className="text-slate-600 mt-2">Benchmark result rows backing the public board.</p>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <label className="relative block w-full max-w-sm">
          <span className="sr-only">Search predictions</span>
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search"
            className="h-12 w-full border border-slate-300 bg-white px-4 pr-11 text-sm focus:outline-none focus:ring-1 focus:ring-teal-500"
          />
          <Search size={18} className="absolute right-4 top-3.5 text-slate-500" />
        </label>
        <label className="inline-flex items-center gap-2 text-sm text-slate-700">
          <input type="checkbox" checked={regex} onChange={(event) => setRegex(event.target.checked)} />
          Regex
        </label>
        <span className="text-sm text-slate-500">
          {rows.length} / {totalRows} results
        </span>
      </div>

      <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[860px] text-sm">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/70 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                <th className="px-4 py-3 text-left">Run</th>
                <th className="px-4 py-3 text-left">Model</th>
                <th className="px-4 py-3 text-left">Scenario / Task</th>
                <th className="px-4 py-3 text-left">Earned</th>
                <th className="px-4 py-3 text-left">Failed</th>
                <th className="px-4 py-3 text-left">Error rate</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {rows.slice(0, 120).map((row) => (
                <tr key={`${row.run}-${row.taskName}`} className="hover:bg-slate-50/70">
                  <td className="px-4 py-3 font-mono text-xs text-blue-700">{row.run}</td>
                  <td className="px-4 py-3 text-slate-900">{row.model.name}</td>
                  <td className="px-4 py-3 text-slate-700">
                    <div className="font-medium text-slate-900">{row.scenario}</div>
                    <div className="mt-0.5 text-xs text-slate-500">{row.taskName}</div>
                  </td>
                  <td className="px-4 py-3 tabular-nums text-slate-700">{Math.round(row.earned)}</td>
                  <td className="px-4 py-3 tabular-nums text-slate-700">{Math.round(row.failed)}</td>
                  <td className="px-4 py-3 tabular-nums text-slate-700">
                    {row.errorRate == null ? "N/A" : `${row.errorRate.toFixed(1)}%`}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      {rows.length > 120 && (
        <p className="text-xs text-slate-500">Showing first 120 rows. Narrow the search to inspect a smaller set.</p>
      )}
    </div>
  );
}
