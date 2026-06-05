import { useMemo, useState } from "react";
import { useQueries } from "@tanstack/react-query";
import type { Model, LeaderboardScore, TaskDefinition, BenchmarkResult } from "@shared/schema";
import {
  Award,
  BookOpen,
  ChevronRight,
  ExternalLink,
  Github,
  LayoutDashboard,
  ArrowUpDown,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  CITATION_BIBTEX,
  FAILURE_CATEGORIES,
  LEADERBOARD_ACCURACY_METRICS,
  METHODOLOGY_STEPS,
  PAPER_CITATIONS,
  PHAMDRUGBENCH_INTRO,
  SUBGROUP_COLUMNS,
  TASK_TAXONOMY,
} from "@/data/benchmarkContent";
import { PhamDrugBenchHeroDiagram } from "@/components/PhamDrugBenchHeroDiagram";
import { TaskExplorer } from "@/components/TaskExplorer";
import { TrajectoryViewer } from "@/components/TrajectoryViewer";

type LeaderboardPageProps = {
  models: Model[];
  leaderboardScores: LeaderboardScore[];
  taskDefs: TaskDefinition[];
  onNavigateTab: (tab: string) => void;
};

type ModelFilter = "all" | "proprietary" | "open" | "specialized";
type SortMetric = "Mean Win Rate" | "Rx-LLM (CMM)" | "DDI Identification" | "MedMatch" | "Drug or Pokémon?";

const NAV_SECTIONS = [
  { id: "leaderboard", label: "Leaderboard" },
  { id: "breakdowns", label: "Breakdowns" },
  { id: "tasks", label: "Tasks" },
  { id: "trajectory", label: "Trajectory" },
  { id: "methodology", label: "Methodology" },
] as const;

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

function heatmapColor(pct: number): string {
  const clamped = Math.max(0, Math.min(100, pct));
  const opacity = 0.15 + (clamped / 100) * 0.75;
  return `rgba(13, 148, 136, ${opacity})`;
}

function providerBadgeClass(provider: string): string {
  const map: Record<string, string> = {
    OpenAI: "bg-emerald-50 text-emerald-700",
    Google: "bg-blue-50 text-blue-700",
    Meta: "bg-indigo-50 text-indigo-700",
    Alibaba: "bg-orange-50 text-orange-700",
    DrugGPT: "bg-violet-50 text-violet-700",
  };
  return map[provider] ?? "bg-slate-100 text-slate-600";
}

function modelMatchesFilter(model: Model, filter: ModelFilter): boolean {
  if (filter === "all") return true;
  if (filter === "proprietary") return model.access === "API";
  if (filter === "open") return model.access === "Open Weights";
  if (filter === "specialized") return model.access === "Specialized";
  return true;
}

function taskDomainForName(taskName: string): keyof typeof DOMAIN_TASK_MAP | null {
  for (const [domain, tasks] of Object.entries(DOMAIN_TASK_MAP)) {
    if (tasks.includes(taskName)) return domain as keyof typeof DOMAIN_TASK_MAP;
  }
  return null;
}

const DOMAIN_TASK_MAP = {
  cmm: [
    "Formulation Matching",
    "Drug Order Gen (Sig)",
    "Route Matching",
    "DDI ID",
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

export function LeaderboardPage({
  models,
  leaderboardScores,
  taskDefs,
  onNavigateTab,
}: LeaderboardPageProps) {
  const [modelFilter, setModelFilter] = useState<ModelFilter>("all");
  const [sortBy, setSortBy] = useState<SortMetric>("Mean Win Rate");
  const [copied, setCopied] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [selectedTaskId, setSelectedTaskId] = useState("formulation_matching_ckd");

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

  const allBenchmarkResults = useMemo(() => {
    const map = new Map<number, BenchmarkResult[]>();
    models.forEach((m, i) => {
      map.set(m.id, benchmarkQueries[i]?.data ?? []);
    });
    return map;
  }, [models, benchmarkQueries]);

  const rankedModels = useMemo(() => {
    const filtered = models.filter((m) => modelMatchesFilter(m, modelFilter));
    return [...filtered].sort((a, b) => {
      const aVal = parseFloat(getScore(leaderboardScores, a.id, sortBy));
      const bVal = parseFloat(getScore(leaderboardScores, b.id, sortBy));
      if (Number.isNaN(aVal) && Number.isNaN(bVal)) return 0;
      if (Number.isNaN(aVal)) return 1;
      if (Number.isNaN(bVal)) return -1;
      return bVal - aVal;
    });
  }, [models, modelFilter, sortBy, leaderboardScores]);

  const filterCounts = useMemo(() => ({
    all: models.length,
    proprietary: models.filter((m) => m.access === "API").length,
    open: models.filter((m) => m.access === "Open Weights").length,
    specialized: models.filter((m) => m.access === "Specialized").length,
  }), [models]);

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

      const totalFailed = Object.values(failed).reduce((a, b) => a + b, 0);
      if (totalFailed === 0) {
        return { model, segments: [25, 25, 25, 25] };
      }

      return {
        model,
        segments: FAILURE_CATEGORIES.map((c) =>
          Math.round((failed[c.key as keyof typeof failed] / totalFailed) * 100),
        ),
      };
    });
  }, [rankedModels, allBenchmarkResults]);

  const scrollTo = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const copyCitation = async (text?: string, id?: string) => {
    await navigator.clipboard.writeText(text ?? CITATION_BIBTEX);
    if (id) {
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    } else {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="physicianbench-page min-h-screen bg-[#fafafa] text-slate-900">
      {/* Top nav — PhysicianBench style */}
      <header className="sticky top-0 z-50 border-b border-slate-200/80 bg-white/95 backdrop-blur-md">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2.5 min-w-0">
            <img src="/logo.png" alt="" width={28} height={28} className="rounded-md flex-shrink-0" />
            <span className="font-bold text-sm tracking-tight truncate">PhamDrugBench</span>
          </div>
          <nav className="hidden md:flex items-center gap-1">
            {NAV_SECTIONS.map((s) => (
              <button
                key={s.id}
                onClick={() => scrollTo(s.id)}
                className="px-3 py-1.5 text-sm font-medium text-slate-600 hover:text-teal-700 rounded-md hover:bg-teal-50/60 transition-colors"
              >
                {s.label}
              </button>
            ))}
          </nav>
          <div className="flex items-center gap-2 flex-shrink-0">
            <Button
              variant="ghost"
              size="sm"
              className="text-slate-600 hidden sm:flex"
              onClick={() => onNavigateTab("Dashboard")}
            >
              <LayoutDashboard size={14} className="mr-1.5" />
              Dashboard
            </Button>
            <Button variant="outline" size="sm" className="text-slate-600" asChild>
              <a href="https://github.com/AIChemist-Lab" target="_blank" rel="noopener noreferrer">
                <Github size={14} className="mr-1.5" />
                GitHub
              </a>
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-10 sm:py-14 space-y-16 sm:space-y-20">
        {/* Hero — PhysicianBench split: title left, diagram right */}
        <section className="grid lg:grid-cols-[minmax(0,0.96fr)_minmax(500px,1.04fr)] gap-10 lg:gap-6 items-center overflow-visible">
          <div className="text-left space-y-5">
            <div>
              <h1 className="text-3xl sm:text-4xl lg:text-[2.85rem] font-bold tracking-tight leading-[1.06]">
                <span className="text-teal-800 block">{PHAMDRUGBENCH_INTRO.headline}:</span>
                <span className="font-serif text-slate-900 block whitespace-nowrap">Evaluating LLM</span>
                <span className="font-serif text-slate-900 block whitespace-nowrap">Agents on</span>
              </h1>
              <p className="text-2xl sm:text-3xl lg:text-[2.45rem] font-serif italic font-semibold text-teal-800 mt-1 leading-[1.05]">
                Medication-Safety Benchmarks
              </p>
            </div>
            {/* Stanford / PhysicianBench-style: logo left, affiliation text right */}
            <div className="flex items-center gap-5 sm:gap-6 max-w-2xl pt-1">
              <img
                src="/cuanschutz-logo.png"
                alt="University of Colorado Anschutz Medical Campus"
                width={160}
                height={56}
                className="h-12 sm:h-14 md:h-16 w-auto object-contain shrink-0"
              />
              <div className="min-w-0">
                <p className="text-sm font-semibold text-slate-800">{PHAMDRUGBENCH_INTRO.institution}</p>
                <p className="text-[11px] sm:text-xs text-slate-600 leading-[1.55]">
                  {PHAMDRUGBENCH_INTRO.authors}
                </p>
              </div>
            </div>
            <p className="text-slate-600 leading-relaxed text-[14px] max-w-xl">
              {PHAMDRUGBENCH_INTRO.summary}
            </p>
            <div className="flex flex-nowrap items-center gap-3">
              <Button
                size="lg"
                className="bg-teal-700 hover:bg-teal-800 text-white rounded-lg px-6 shrink-0"
                onClick={() => scrollTo("leaderboard")}
              >
                View Leaderboard
                <ChevronRight size={16} className="ml-1" />
              </Button>
              <Button variant="outline" size="lg" className="rounded-lg shrink-0" onClick={() => scrollTo("tasks")}>
                Explore Tasks
              </Button>
              <Button variant="outline" size="lg" className="rounded-lg shrink-0" asChild>
                <a
                  href="https://www.medrxiv.org/content/10.64898/2025.12.01.25341004v2"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <BookOpen size={16} className="mr-2" />
                  Read the Paper
                </a>
              </Button>
            </div>
          </div>

          <div className="w-full lg:ml-0 xl:ml-2 flex justify-center lg:justify-end">
            <PhamDrugBenchHeroDiagram className="w-full max-w-none lg:scale-[1.16] xl:scale-[1.25] 2xl:scale-[1.3] origin-center" />
          </div>
        </section>

        {/* Leaderboard table */}
        <section id="leaderboard" className="scroll-mt-20 space-y-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-teal-700 mb-1">Results</p>
            <h2 className="text-2xl font-bold tracking-tight">Leaderboard</h2>
            <p className="text-sm text-slate-600 mt-1">
              Macro win rate and paper-aligned scores from published appendix tables.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="flex flex-wrap gap-2">
              {(
                [
                  ["all", "All"],
                  ["proprietary", "Proprietary"],
                  ["open", "Open-Source"],
                  ["specialized", "Specialized"],
                ] as const
              ).map(([key, label]) => (
                <button
                  key={key}
                  onClick={() => setModelFilter(key)}
                  className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors ${
                    modelFilter === key
                      ? "bg-teal-700 text-white border-teal-700"
                      : "bg-white text-slate-600 border-slate-200 hover:border-teal-300"
                  }`}
                >
                  {label} ({filterCounts[key]})
                </button>
              ))}
            </div>
            <div className="flex items-center gap-2 text-sm text-slate-600">
              <ArrowUpDown size={14} className="text-slate-400" />
              <span className="text-xs font-medium">sort by</span>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as SortMetric)}
                className="text-xs font-semibold border border-slate-200 rounded-md px-2 py-1.5 bg-white focus:outline-none focus:ring-1 focus:ring-teal-500"
              >
                {LEADERBOARD_ACCURACY_METRICS.map((m) => (
                  <option key={m.name} value={m.name}>
                    {m.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm" data-testid="table-leaderboard">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50/80 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                    <th className="px-4 py-3 text-left w-10">#</th>
                    <th className="px-4 py-3 text-left min-w-[160px]">Model</th>
                    <th className="px-4 py-3 text-left">Provider</th>
                    <th className="px-4 py-3 text-center">Mean Win Rate</th>
                    <th className="px-4 py-3 text-center">Rx-LLM</th>
                    <th className="px-4 py-3 text-center">DDI ID</th>
                    <th className="px-4 py-3 text-center">MedMatch</th>
                    <th className="px-4 py-3 text-center">Pokémon</th>
                    <th className="px-4 py-3 text-center">Cost / 1M</th>
                    <th className="px-4 py-3 text-center">Latency</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {rankedModels.map((model, idx) => (
                    <tr key={model.id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="px-4 py-3.5 text-slate-400 font-mono text-xs">{idx + 1}</td>
                      <td className="px-4 py-3.5 font-semibold text-slate-900">
                        <div className="flex items-center gap-2">
                          {idx === 0 && sortBy === "Mean Win Rate" && (
                            <Award size={14} className="text-amber-500 flex-shrink-0" />
                          )}
                          {model.name}
                          {model.type === "Reasoning" && (
                            <Badge variant="outline" className="text-[9px] px-1 py-0 h-4 border-purple-200 text-purple-600 bg-purple-50">
                              reasoning
                            </Badge>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3.5">
                        <span className={`inline-flex px-2 py-0.5 rounded text-xs font-medium ${providerBadgeClass(model.provider)}`}>
                          {model.provider}
                        </span>
                      </td>
                      <td className="px-4 py-3.5 text-center font-bold text-slate-900">
                        {formatScoreAsPercent(getScore(leaderboardScores, model.id, "Mean Win Rate"))}
                      </td>
                      <td className="px-4 py-3.5 text-center text-slate-700">
                        {formatScoreAsPercent(getScore(leaderboardScores, model.id, "Rx-LLM (CMM)"))}
                      </td>
                      <td className="px-4 py-3.5 text-center text-slate-700">
                        {formatScoreAsPercent(getScore(leaderboardScores, model.id, "DDI Identification"))}
                      </td>
                      <td className="px-4 py-3.5 text-center text-slate-700">
                        {formatScoreAsPercent(getScore(leaderboardScores, model.id, "MedMatch"))}
                      </td>
                      <td className="px-4 py-3.5 text-center text-slate-700">
                        {formatScoreAsPercent(getScore(leaderboardScores, model.id, "Drug or Pokémon?"))}
                      </td>
                      <td className="px-4 py-3.5 text-center font-mono text-xs text-slate-600">
                        {getScore(leaderboardScores, model.id, "Cost (per 1M tokens)", "Efficiency")}
                      </td>
                      <td className="px-4 py-3.5 text-center font-mono text-xs text-slate-600">
                        {getScore(leaderboardScores, model.id, "Latency (s / request)", "Efficiency")}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
          <p className="text-xs text-slate-500 leading-relaxed">
            <strong>Mean Win Rate</strong> macro-average across four benchmark papers. Domain columns show paper-aligned
            aggregate scores. Cost and latency from model configuration.
          </p>
        </section>

        {/* Performance by subgroup heatmap */}
        <section id="breakdowns" className="scroll-mt-20 space-y-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-teal-700 mb-1">Where models succeed and fail</p>
            <h2 className="text-2xl font-bold tracking-tight">Performance by Subgroup</h2>
            <p className="text-sm text-slate-600 mt-1">
              Paper-aligned domain scores. Darker teal cells indicate higher win rate within that subgroup.
            </p>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50/80">
                    <th className="px-4 py-3 text-left text-[11px] font-bold uppercase tracking-wider text-slate-500 min-w-[140px]">
                      Model
                    </th>
                    {SUBGROUP_COLUMNS.map((col) => (
                      <th key={col.key} className="px-3 py-3 text-center text-[11px] font-bold text-slate-500 min-w-[80px]">
                        <div>{col.label}</div>
                        <div className="font-normal text-slate-400 normal-case tracking-normal">n={col.n}</div>
                      </th>
                    ))}
                    <th className="px-3 py-3 text-center text-[11px] font-bold uppercase tracking-wider text-slate-500">
                      Overall
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {rankedModels.map((model) => {
                    const overall = parseFloat(getScore(leaderboardScores, model.id, "Mean Win Rate")) * 100;
                    return (
                      <tr key={model.id}>
                        <td className="px-4 py-2.5 font-semibold text-slate-800 text-xs">{model.name}</td>
                        {SUBGROUP_COLUMNS.map((col) => {
                          const raw = getScore(leaderboardScores, model.id, col.key);
                          const pct = parseFloat(raw) * 100;
                          return (
                            <td
                              key={col.key}
                              className="px-3 py-2.5 text-center text-xs font-semibold text-slate-800"
                              style={{ backgroundColor: Number.isNaN(pct) ? undefined : heatmapColor(pct) }}
                            >
                              {Number.isNaN(pct) ? "—" : pct.toFixed(1)}
                            </td>
                          );
                        })}
                        <td
                          className="px-3 py-2.5 text-center text-xs font-bold text-slate-900"
                          style={{ backgroundColor: Number.isNaN(overall) ? undefined : heatmapColor(overall) }}
                        >
                          {Number.isNaN(overall) ? "—" : overall.toFixed(1)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </section>

        {/* Error analysis */}
        <section className="space-y-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-teal-700 mb-1">Error analysis</p>
            <h2 className="text-2xl font-bold tracking-tight">Where Do Failures Come From?</h2>
            <p className="text-sm text-slate-600 mt-1">
              Failed cases grouped by benchmark domain. DDI and adversarial tasks account for the largest share of failures across models.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
            {FAILURE_CATEGORIES.map((cat) => (
              <div key={cat.key} className="rounded-lg border border-slate-200 bg-white p-3">
                <p className="text-xs font-bold text-slate-800">{cat.label}</p>
                <p className="text-[11px] text-slate-500 mt-1">{cat.description}</p>
              </div>
            ))}
          </div>

          <div className="space-y-3">
            {failureByModel.map(({ model, segments }) => (
              <div key={model.id} className="flex items-center gap-3">
                <span className="text-xs font-semibold text-slate-700 w-28 flex-shrink-0 truncate">{model.name}</span>
                <div className="flex-1 flex h-6 rounded overflow-hidden border border-slate-100">
                  {segments.map((pct, i) => (
                    <div
                      key={FAILURE_CATEGORIES[i].key}
                      className="failure-segment flex items-center justify-center text-[9px] font-bold text-white/90"
                      style={{
                        width: `${Math.max(pct, 0)}%`,
                        backgroundColor: ["#0d9488", "#14b8a6", "#2dd4bf", "#5eead4"][i],
                        minWidth: pct > 0 ? "1.5rem" : 0,
                      }}
                      title={`${FAILURE_CATEGORIES[i].label}: ${pct}%`}
                    >
                      {pct >= 12 ? pct : ""}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Explore Tasks — PhysicianBench split-panel explorer */}
        <section id="tasks" className="scroll-mt-20 space-y-5">
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-teal-700 mb-1">Task pool</p>
            <h2 className="text-2xl font-bold tracking-tight">Explore Tasks</h2>
            <p className="text-sm text-slate-600 mt-1 max-w-3xl">
              Browse all {taskDefs.length || 18} clinician-validated tasks grouped by benchmark paper — CMM Rx-LLM,
              DDI Multi-Format, MedMatch Formatting, and Adversarial Drug or Pokémon — with checkpoint-level
              evaluation rubrics.
            </p>
          </div>

          <TaskExplorer
            taskDefs={taskDefs}
            selectedId={selectedTaskId}
            onSelect={setSelectedTaskId}
          />

          <div className="rounded-xl border border-slate-200 bg-slate-50/50 p-5">
            <h3 className="text-sm font-bold text-slate-900 mb-3">Full task taxonomy by paper</h3>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {TASK_TAXONOMY.map((group) => (
                <div key={group.domain} className="rounded-lg border border-slate-200 bg-white p-3">
                  <p className="text-xs font-bold text-slate-800">{group.domain}</p>
                  <p className="text-[10px] text-slate-500 mt-1">{group.tasks.length} tasks · {group.dataset}</p>
                  <a
                    href={group.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-[10px] font-semibold text-teal-700 mt-2 hover:underline"
                  >
                    View paper <ExternalLink size={10} />
                  </a>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Trajectory viewer — adapted for prompt → response → benchmark evaluation */}
        <section id="trajectory" className="scroll-mt-20 space-y-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-teal-700 mb-1">Watch agents work</p>
            <h2 className="text-2xl font-bold tracking-tight">Trajectory Viewer</h2>
            <p className="text-sm text-slate-600 mt-1 max-w-3xl">
              Step through a model evaluation session with{" "}
              <span className="font-semibold text-slate-700">GPT-4o-mini (gpt-5-mini eval)</span>. Each step shows
              the clinical prompt, LLM response, and checkpoint-level evaluation reply — adapted from the{" "}
              <a
                href="https://healthrex.github.io/PhysicianBench/#leaderboard"
                target="_blank"
                rel="noopener noreferrer"
                className="text-teal-700 hover:underline"
              >
                PhysicianBench
              </a>{" "}
              trajectory replay for paper-aligned medication tasks.
            </p>
          </div>
          <TrajectoryViewer taskId={selectedTaskId} />
        </section>

        {/* Methodology */}
        <section id="methodology" className="scroll-mt-20 space-y-6">
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-teal-700 mb-1">How it works</p>
            <h2 className="text-2xl font-bold tracking-tight">Methodology</h2>
            <p className="text-sm text-slate-600 mt-1">
              Every design choice maximizes clinical realism while keeping evaluation reproducible.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 gap-5">
            {METHODOLOGY_STEPS.map((step) => (
              <div key={step.step} className="rounded-xl border border-slate-200 bg-white p-5">
                <p className="text-2xl font-black text-teal-100 leading-none mb-2">{step.step}</p>
                <h3 className="text-sm font-bold text-slate-900 -mt-6 mb-2 relative">{step.title}</h3>
                <p className="text-sm text-slate-600 leading-relaxed">{step.description}</p>
              </div>
            ))}
          </div>

          <blockquote className="rounded-xl border-l-4 border-teal-600 bg-teal-50/50 px-5 py-4 text-sm text-slate-700 italic">
            End-to-end completion, not isolated atomic skills. Macro win rate averages performance across all four
            benchmark papers — CMM, DDI, MedMatch, and adversarial safety.
          </blockquote>

          {/* Citations — all benchmark papers */}
          <div className="rounded-xl border border-slate-200 bg-white p-5 space-y-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-xs font-bold uppercase tracking-widest text-teal-700">Cite</p>
                <h3 className="text-lg font-bold">Citations</h3>
                <p className="text-sm text-slate-600 mt-1">
                  All five PhamDrugBench source papers and supplements.
                </p>
              </div>
              <Button variant="outline" size="sm" onClick={() => copyCitation()}>
                {copied ? "Copied all!" : "Copy all BibTeX"}
              </Button>
            </div>
            <div className="space-y-4">
              {PAPER_CITATIONS.map((paper) => (
                <div key={paper.id} className="rounded-lg border border-slate-100 bg-slate-50/50 p-4 space-y-2">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <a
                        href={paper.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm font-semibold text-teal-800 hover:underline"
                      >
                        {paper.title}
                      </a>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 text-xs"
                      onClick={() => copyCitation(paper.bibtex, paper.id)}
                    >
                      {copiedId === paper.id ? "Copied!" : "Copy BibTeX"}
                    </Button>
                  </div>
                  <pre className="text-[11px] bg-white border border-slate-200 rounded-lg p-3 overflow-x-auto text-slate-700 font-mono leading-relaxed">
                    {paper.bibtex}
                  </pre>
                </div>
              ))}
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-slate-200 bg-white py-8 mt-8">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-slate-500">
          <div className="flex items-center gap-3">
            <img
              src="/cuanschutz-logo.png"
              alt="University of Colorado Anschutz Medical Campus"
              width={120}
              height={32}
              className="h-7 w-auto object-contain opacity-90"
            />
            <div className="flex items-center gap-2 border-l border-slate-200 pl-3">
              <img src="/logo.png" alt="" width={20} height={20} className="rounded" />
              <span className="font-semibold text-slate-700">PhamDrugBench</span>
              <span className="text-slate-300">·</span>
              <span>v1</span>
            </div>
          </div>
          <p className="text-xs text-center">
            Built for advancing medication-safety LLM evaluation · Dataset and leaderboard open to the community
          </p>
        </div>
      </footer>
    </div>
  );
}
