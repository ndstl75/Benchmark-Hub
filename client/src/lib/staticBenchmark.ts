import type {
  BenchmarkResult,
  LeaderboardScore,
  Model,
  TaskDefinition,
} from "@/hooks/useBenchmark";

type RawBenchmark = {
  models: Array<{
    name: string;
    type: string;
    provider: string;
    access: string;
    winRate: number;
    costPer1mTokens: string;
    latency: string;
    isCustom?: boolean;
    dockerImage?: string;
  }>;
  benchmarkResults: Array<{
    modelName: string;
    taskName: string;
    earned: number;
    failed: number;
  }>;
  leaderboardScores: Array<{
    modelName: string;
    metricName: string;
    tab: string;
    value: string;
  }>;
  taskDefinitions: Array<{
    name: string;
    prompt: string;
    response: string;
    humanAnnotation: string;
    agreement: string;
    metrics: string[];
  }>;
};

type Normalized = {
  models: Model[];
  benchmarkResults: BenchmarkResult[];
  leaderboardScores: LeaderboardScore[];
  taskDefinitions: TaskDefinition[];
};

let normalized: Normalized | null = null;

async function loadRaw(): Promise<RawBenchmark> {
  const url = `${import.meta.env.BASE_URL}data/benchmark.json`;
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Failed to load benchmark data (${res.status}): ${url}`);
  }
  return res.json() as Promise<RawBenchmark>;
}

async function ensureNormalized(): Promise<Normalized> {
  if (normalized) return normalized;

  const raw = await loadRaw();
  const modelIdByName = new Map<string, number>();
  const models: Model[] = raw.models.map((m, i) => {
    const id = i + 1;
    modelIdByName.set(m.name, id);
    return {
      id,
      name: m.name,
      type: m.type,
      provider: m.provider,
      access: m.access,
      winRate: m.winRate,
      costPer1mTokens: m.costPer1mTokens,
      latency: m.latency,
      isCustom: m.isCustom ?? false,
      dockerImage: m.dockerImage ?? null,
    };
  });

  let resultId = 1;
  const benchmarkResults: BenchmarkResult[] = raw.benchmarkResults.map((row) => {
    const modelId = modelIdByName.get(row.modelName);
    if (modelId == null) {
      throw new Error(`Unknown model in benchmarkResults: ${row.modelName}`);
    }
    return {
      id: resultId++,
      modelId,
      taskName: row.taskName,
      earned: row.earned,
      failed: row.failed,
    };
  });

  let scoreId = 1;
  const leaderboardScores: LeaderboardScore[] = raw.leaderboardScores.map((row) => {
    const modelId = modelIdByName.get(row.modelName);
    if (modelId == null) {
      throw new Error(`Unknown model in leaderboardScores: ${row.modelName}`);
    }
    return {
      id: scoreId++,
      modelId,
      metricName: row.metricName,
      tab: row.tab,
      value: row.value,
    };
  });

  const taskDefinitions: TaskDefinition[] = raw.taskDefinitions.map((t, i) => ({
    id: i + 1,
    name: t.name,
    prompt: t.prompt,
    response: t.response,
    humanAnnotation: t.humanAnnotation,
    agreement: t.agreement,
    metrics: t.metrics,
  }));

  normalized = { models, benchmarkResults, leaderboardScores, taskDefinitions };
  return normalized;
}

export async function getModels(): Promise<Model[]> {
  return (await ensureNormalized()).models;
}

export async function getBenchmarkResults(modelId: number): Promise<BenchmarkResult[]> {
  const data = await ensureNormalized();
  return data.benchmarkResults.filter((r) => r.modelId === modelId);
}

export async function getLeaderboard(tab: string): Promise<LeaderboardScore[]> {
  const data = await ensureNormalized();
  return data.leaderboardScores.filter((s) => s.tab === tab);
}

export async function getTasks(): Promise<TaskDefinition[]> {
  return (await ensureNormalized()).taskDefinitions;
}
