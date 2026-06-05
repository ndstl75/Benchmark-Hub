import { readFileSync } from "fs";
import { join } from "path";
import { db } from "./db";
import { models, benchmarkResults, leaderboardScores, taskDefinitions } from "@shared/schema";

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

async function clearBenchmarkTables() {
  await db.delete(benchmarkResults);
  await db.delete(leaderboardScores);
  await db.delete(taskDefinitions);
  await db.delete(models);
}

export async function seed() {
  const force = process.env.SEED_FORCE === "1";
  const existingModels = await db.select().from(models);
  if (existingModels.length > 0 && !force) {
    return;
  }

  const data = loadBenchmarkData();
  if (force && existingModels.length > 0) {
    console.log("Force reseed: clearing existing benchmark data...");
    await clearBenchmarkTables();
  }

  console.log("Seeding database from server/data/benchmark.json...");

  const insertedModels = await db
    .insert(models)
    .values(
      data.models.map((m) => ({
        name: m.name,
        type: m.type,
        provider: m.provider,
        access: m.access,
        winRate: m.winRate,
        costPer1mTokens: m.costPer1mTokens,
        latency: m.latency,
        isCustom: m.isCustom ?? false,
      })),
    )
    .returning();
  console.log(`Inserted ${insertedModels.length} models`);

  const modelIdByName = new Map(insertedModels.map((m) => [m.name, m.id]));

  const benchmarkRows = data.benchmarkResults.map((row) => {
    const modelId = modelIdByName.get(row.modelName);
    if (modelId == null) {
      throw new Error(`Unknown model in benchmarkResults: ${row.modelName}`);
    }
    return { modelId, taskName: row.taskName, earned: row.earned, failed: row.failed };
  });
  await db.insert(benchmarkResults).values(benchmarkRows);
  console.log(`Inserted ${benchmarkRows.length} benchmark results`);

  const leaderboardRows = data.leaderboardScores.map((row) => {
    const modelId = modelIdByName.get(row.modelName);
    if (modelId == null) {
      throw new Error(`Unknown model in leaderboardScores: ${row.modelName}`);
    }
    return { modelId, metricName: row.metricName, tab: row.tab, value: row.value };
  });
  await db.insert(leaderboardScores).values(leaderboardRows);
  console.log(`Inserted ${leaderboardRows.length} leaderboard scores`);

  await db.insert(taskDefinitions).values(data.taskDefinitions);
  console.log(`Inserted ${data.taskDefinitions.length} task definitions`);

  console.log("Seeding complete.");
}

const isRunDirect = typeof process !== "undefined" && process.argv[1]?.includes("seed");
if (isRunDirect) {
  seed().catch(console.error).finally(() => process.exit(0));
}
