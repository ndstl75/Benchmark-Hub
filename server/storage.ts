import {
  type Model,
  type InsertModel,
  type BenchmarkResult,
  type InsertBenchmarkResult,
  type LeaderboardScore,
  type InsertLeaderboardScore,
  type TaskDefinition,
  type InsertTaskDefinition,
  type Evaluator,
  type InsertEvaluator,
} from "@shared/schema";
import { readJsonl, writeJsonl, nextId } from "./jsonl";

const COLLECTIONS = {
  models: "models",
  benchmarkResults: "benchmark_results",
  leaderboardScores: "leaderboard_scores",
  taskDefinitions: "task_definitions",
  evaluators: "evaluators",
} as const;

export interface IStorage {
  getModels(): Promise<Model[]>;
  getModelById(id: number): Promise<Model | undefined>;
  getModelByName(name: string): Promise<Model | undefined>;
  createModel(model: InsertModel): Promise<Model>;
  deleteModel(id: number): Promise<void>;

  getBenchmarkResults(modelId: number): Promise<BenchmarkResult[]>;
  createBenchmarkResult(result: InsertBenchmarkResult): Promise<BenchmarkResult>;
  getBenchmarkResultsByModel(modelId: number): Promise<BenchmarkResult[]>;

  getLeaderboardScores(tab?: string): Promise<LeaderboardScore[]>;
  createLeaderboardScore(score: InsertLeaderboardScore): Promise<LeaderboardScore>;

  getTaskDefinitions(): Promise<TaskDefinition[]>;
  getTaskDefinitionByName(name: string): Promise<TaskDefinition | undefined>;
  createTaskDefinition(task: InsertTaskDefinition): Promise<TaskDefinition>;

  getEvaluators(): Promise<Evaluator[]>;
  getEvaluatorById(id: number): Promise<Evaluator | undefined>;
  createEvaluator(data: InsertEvaluator): Promise<Evaluator>;
  updateEvaluator(id: number, data: Partial<InsertEvaluator>): Promise<Evaluator | undefined>;
  deleteEvaluator(id: number): Promise<void>;
}

export class JsonlStorage implements IStorage {
  async getModels(): Promise<Model[]> {
    return readJsonl<Model>(COLLECTIONS.models);
  }

  async getModelById(id: number): Promise<Model | undefined> {
    return (await this.getModels()).find((model) => model.id === id);
  }

  async getModelByName(name: string): Promise<Model | undefined> {
    return (await this.getModels()).find((model) => model.name === name);
  }

  async createModel(model: InsertModel): Promise<Model> {
    const models = await this.getModels();
    if (models.some((existing) => existing.name === model.name)) {
      throw new Error(`Model already exists: ${model.name}`);
    }
    const created: Model = { ...model, id: nextId(models) };
    writeJsonl(COLLECTIONS.models, [...models, created]);
    return created;
  }

  async deleteModel(id: number): Promise<void> {
    const models = await this.getModels();
    writeJsonl(
      COLLECTIONS.models,
      models.filter((model) => model.id !== id),
    );
    const results = readJsonl<BenchmarkResult>(COLLECTIONS.benchmarkResults);
    writeJsonl(
      COLLECTIONS.benchmarkResults,
      results.filter((result) => result.modelId !== id),
    );
    const scores = readJsonl<LeaderboardScore>(COLLECTIONS.leaderboardScores);
    writeJsonl(
      COLLECTIONS.leaderboardScores,
      scores.filter((score) => score.modelId !== id),
    );
  }

  async getBenchmarkResults(modelId: number): Promise<BenchmarkResult[]> {
    return readJsonl<BenchmarkResult>(COLLECTIONS.benchmarkResults)
      .filter((result) => result.modelId === modelId)
      .sort((a, b) => a.taskName.localeCompare(b.taskName));
  }

  async createBenchmarkResult(result: InsertBenchmarkResult): Promise<BenchmarkResult> {
    const results = readJsonl<BenchmarkResult>(COLLECTIONS.benchmarkResults);
    const created: BenchmarkResult = { ...result, id: nextId(results) };
    writeJsonl(COLLECTIONS.benchmarkResults, [...results, created]);
    return created;
  }

  async getBenchmarkResultsByModel(modelId: number): Promise<BenchmarkResult[]> {
    return this.getBenchmarkResults(modelId);
  }

  async getLeaderboardScores(tab?: string): Promise<LeaderboardScore[]> {
    const scores = readJsonl<LeaderboardScore>(COLLECTIONS.leaderboardScores);
    return tab ? scores.filter((score) => score.tab === tab) : scores;
  }

  async createLeaderboardScore(score: InsertLeaderboardScore): Promise<LeaderboardScore> {
    const scores = readJsonl<LeaderboardScore>(COLLECTIONS.leaderboardScores);
    const created: LeaderboardScore = { ...score, id: nextId(scores) };
    writeJsonl(COLLECTIONS.leaderboardScores, [...scores, created]);
    return created;
  }

  async getTaskDefinitions(): Promise<TaskDefinition[]> {
    return readJsonl<TaskDefinition>(COLLECTIONS.taskDefinitions).sort((a, b) => a.id - b.id);
  }

  async getTaskDefinitionByName(name: string): Promise<TaskDefinition | undefined> {
    return (await this.getTaskDefinitions()).find((task) => task.name === name);
  }

  async createTaskDefinition(task: InsertTaskDefinition): Promise<TaskDefinition> {
    const tasks = readJsonl<TaskDefinition>(COLLECTIONS.taskDefinitions);
    const created: TaskDefinition = { ...task, id: nextId(tasks) };
    writeJsonl(COLLECTIONS.taskDefinitions, [...tasks, created]);
    return created;
  }

  async getEvaluators(): Promise<Evaluator[]> {
    return readJsonl<Evaluator>(COLLECTIONS.evaluators);
  }

  async getEvaluatorById(id: number): Promise<Evaluator | undefined> {
    return (await this.getEvaluators()).find((evaluator) => evaluator.id === id);
  }

  async createEvaluator(data: InsertEvaluator): Promise<Evaluator> {
    const evaluators = readJsonl<Evaluator>(COLLECTIONS.evaluators);
    const created: Evaluator = { ...data, id: nextId(evaluators) };
    writeJsonl(COLLECTIONS.evaluators, [...evaluators, created]);
    return created;
  }

  async updateEvaluator(id: number, data: Partial<InsertEvaluator>): Promise<Evaluator | undefined> {
    const evaluators = readJsonl<Evaluator>(COLLECTIONS.evaluators);
    const index = evaluators.findIndex((evaluator) => evaluator.id === id);
    if (index < 0) return undefined;
    const updated: Evaluator = { ...evaluators[index], ...data };
    evaluators[index] = updated;
    writeJsonl(COLLECTIONS.evaluators, evaluators);
    return updated;
  }

  async deleteEvaluator(id: number): Promise<void> {
    const evaluators = readJsonl<Evaluator>(COLLECTIONS.evaluators);
    writeJsonl(
      COLLECTIONS.evaluators,
      evaluators.filter((evaluator) => evaluator.id !== id),
    );
  }
}

export const storage = new JsonlStorage();
