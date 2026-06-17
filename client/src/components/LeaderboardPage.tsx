import { useEffect, useMemo, useState } from "react";
import { useQueries } from "@tanstack/react-query";
import type { Model, LeaderboardScore, TaskDefinition, BenchmarkResult } from "@shared/schema";
import { BookOpen, ChevronRight, ExternalLink, Github, Search } from "lucide-react";
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
    "Rx-LLM DDI ID",
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
  if (metricName === "Rx-LLM (CMM)") return `${modelName} CMM`;
  if (metricName === "DDI Identification") return `${modelName} DDI`;
  if (metricName === "Drug or Pokémon?") return `${modelName} Pokémon`;
  if (metricName === "Cost (per 1M tokens)" || metricName === "Latency (s / request)") return modelName;
  return `${modelName} ${metricName}`;
}

function slug(text: string): string {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "");
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

  const scenarioRows = useMemo(() => {
    return TASK_TAXONOMY.flatMap((group) =>
      group.tasks.map((taskName) => {
        const definition = taskDefs.find((task) => task.name === taskName);
        return {
          key: `${group.domain}-${taskName}`,
          scenario: group.domain,
          taskName,
          what: definition?.prompt ?? group.dataset,
          who: "Clinician / evaluator",
          when: "Medication-safety evaluation",
          language: "English",
          url: group.url,
        };
      }),
    );
  }, [taskDefs]);

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
          {activeRoute === "scenarios" && <ScenariosView rows={scenarioRows} />}
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
                  {models.map((model) => (
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
                      <div className="font-medium text-slate-900">{row.label}</div>
                      {row.subtitle && <div className="mt-0.5 text-xs text-slate-500">{row.subtitle}</div>}
                    </td>
                    {models.map((model) => {
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
        <div className="space-y-1 text-xs text-slate-500 leading-relaxed">
          <p>
            <strong>Reported Mean</strong> averages only source-backed study scores. Coverage shows how many of the four primary papers contribute.
          </p>
          <p>
            Rx-LLM (CMM) is the macro mean of six primary task metrics from Rx-LLM Tables 2-3. MedGemma-27B is listed separately where source tables report MedGemma rather than base Gemma 3 27B.
            <span className="ml-2 font-semibold">*</span> Cost and Latency are indicative estimates only.
          </p>
        </div>
      </div>
    </div>
  );
}

function ErrorAnalysis({ failureByModel }: { failureByModel: FailureByModel[] }) {
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
                <th className="px-4 py-2.5 text-left min-w-[150px]">Model</th>
                {FAILURE_CATEGORIES.map((cat) => (
                  <th key={cat.key} className="px-4 py-2.5 text-left min-w-[160px]">{cat.label}</th>
                ))}
                <th className="px-4 py-2.5 text-left min-w-[130px]">Overall Error</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {failureByModel.map(({ model, domains, overallRate, totalFailed, totalEvaluated }) => (
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
    <div className="space-y-8">
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
                    Public PharmDrugBench row with source-backed reported mean {formatScoreAsPercent(model.winRate)}.
                    Cost estimate {model.costPer1mTokens}; latency estimate {model.latency}.
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
  rows,
}: {
  rows: Array<{
    key: string;
    scenario: string;
    taskName: string;
    what: string;
    who: string;
    when: string;
    language: string;
    url: string;
  }>;
}) {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl sm:text-4xl font-bold tracking-tight">Scenarios</h1>
        <p className="text-slate-600 mt-2">A scenario represents a medication-safety use case and its evaluation task.</p>
      </div>
      <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[920px] text-sm">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/70 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                <th className="px-4 py-3 text-left">Scenario</th>
                <th className="px-4 py-3 text-left">Task</th>
                <th className="px-4 py-3 text-left">What</th>
                <th className="px-4 py-3 text-left">Who</th>
                <th className="px-4 py-3 text-left">When</th>
                <th className="px-4 py-3 text-left">Language</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {rows.map((row) => (
                <tr key={row.key} className="hover:bg-slate-50/70">
                  <td className="px-4 py-4 min-w-[210px]">
                    <a href={row.url} target="_blank" rel="noopener noreferrer" className="font-semibold text-blue-700 hover:underline">
                      {row.scenario}
                    </a>
                  </td>
                  <td className="px-4 py-4 min-w-[180px] text-slate-900">{row.taskName}</td>
                  <td className="px-4 py-4 max-w-md text-slate-700">{row.what}</td>
                  <td className="px-4 py-4 text-slate-700">{row.who}</td>
                  <td className="px-4 py-4 text-slate-700">{row.when}</td>
                  <td className="px-4 py-4 text-slate-700">{row.language}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
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
