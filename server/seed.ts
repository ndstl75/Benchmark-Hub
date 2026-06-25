import { readFileSync } from "fs";
import { join } from "path";
import { writeJsonl, jsonlExists } from "./jsonl";
import type {
  Model,
  BenchmarkResult,
  LeaderboardScore,
  TaskDefinition,
} from "@shared/schema";

type BenchmarkData = {
  models: Array<{
    name: string;
    type: string;
    provider: string;
    access: string;
    winRate: number;
    costPer1mTokens: string;
    latency: string;
    isCustom?: boolean;
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

function loadBenchmarkData(): BenchmarkData {
  const dataPath = join(process.cwd(), "server", "data", "benchmark.json");
  return JSON.parse(readFileSync(dataPath, "utf-8")) as BenchmarkData;
}

function clearJsonlData() {
  writeJsonl("models", []);
  writeJsonl("benchmark_results", []);
  writeJsonl("leaderboard_scores", []);
  writeJsonl("task_definitions", []);
  writeJsonl("evaluators", []);
}

export async function seed() {
  const force = process.env.SEED_FORCE === "1";
  const hasData = jsonlExists("models");

  if (hasData && !force) {
    return;
  }

  if (force && hasData) {
    console.log("Force reseed: clearing existing JSONL data...");
    clearJsonlData();
  }

  const data = loadBenchmarkData();
  console.log("Seeding JSONL store from server/data/benchmark.json...");

  const models: Model[] = data.models.map((model, index) => ({
    id: index + 1,
    name: model.name,
    type: model.type,
    provider: model.provider,
    access: model.access,
    winRate: model.winRate,
    costPer1mTokens: model.costPer1mTokens,
    latency: model.latency,
    isCustom: model.isCustom ?? false,
  }));
  writeJsonl("models", models);
  console.log(`Wrote ${models.length} models`);

  const modelIdByName = new Map(models.map((model) => [model.name, model.id]));

  const benchmarkResults: BenchmarkResult[] = data.benchmarkResults.map((row, index) => {
    const modelId = modelIdByName.get(row.modelName);
    if (modelId == null) {
      throw new Error(`Unknown model in benchmarkResults: ${row.modelName}`);
    }
    return {
      id: index + 1,
      modelId,
      taskName: row.taskName,
      earned: row.earned,
      failed: row.failed,
    };
  });
  writeJsonl("benchmark_results", benchmarkResults);
  console.log(`Wrote ${benchmarkResults.length} benchmark results`);

  const leaderboardScores: LeaderboardScore[] = data.leaderboardScores.map((row, index) => {
    const modelId = modelIdByName.get(row.modelName);
    if (modelId == null) {
      throw new Error(`Unknown model in leaderboardScores: ${row.modelName}`);
    }
    return {
      id: index + 1,
      modelId,
      metricName: row.metricName,
      tab: row.tab,
      value: row.value,
    };
  });
  writeJsonl("leaderboard_scores", leaderboardScores);
  console.log(`Wrote ${leaderboardScores.length} leaderboard scores`);

  const taskDefinitions: TaskDefinition[] = data.taskDefinitions.map((task, index) => ({
    id: index + 1,
    name: task.name,
    prompt: task.prompt,
    response: task.response,
    humanAnnotation: task.humanAnnotation,
    agreement: task.agreement,
    metrics: task.metrics,
  }));
  writeJsonl("task_definitions", taskDefinitions);
  console.log(`Wrote ${taskDefinitions.length} task definitions`);

  if (!jsonlExists("evaluators")) {
    writeJsonl("evaluators", []);
  }

  console.log("Seeding complete.");
}

const isRunDirect = typeof process !== "undefined" && process.argv[1]?.includes("seed");
if (isRunDirect) {
  seed().catch(console.error).finally(() => process.exit(0));
}
