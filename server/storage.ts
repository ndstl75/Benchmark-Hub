import {
  type Model, type InsertModel,
  type BenchmarkResult, type InsertBenchmarkResult,
  type LeaderboardScore, type InsertLeaderboardScore,
  type TaskDefinition, type InsertTaskDefinition,
  type Evaluator, type InsertEvaluator,
  models, benchmarkResults, leaderboardScores, taskDefinitions, evaluators,
} from "@shared/schema";
import { db } from "./db";
import { eq, asc } from "drizzle-orm";

export interface IStorage {
  getModels(): Promise<Model[]>;
  getModelById(id: number): Promise<Model | undefined>;
  getModelByName(name: string): Promise<Model | undefined>;
  createModel(model: InsertModel): Promise<Model>;
  deleteModel(id: number): Promise<void>;

  getBenchmarkResults(modelId: number): Promise<BenchmarkResult[]>;
  createBenchmarkResult(result: InsertBenchmarkResult): Promise<BenchmarkResult>;

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

export class DatabaseStorage implements IStorage {
  async getModels(): Promise<Model[]> {
    return db.select().from(models);
  }

  async getModelById(id: number): Promise<Model | undefined> {
    const [model] = await db.select().from(models).where(eq(models.id, id));
    return model;
  }

  async getModelByName(name: string): Promise<Model | undefined> {
    const [model] = await db.select().from(models).where(eq(models.name, name));
    return model;
  }

  async createModel(model: InsertModel): Promise<Model> {
    const [created] = await db.insert(models).values(model).returning();
    return created;
  }

  async deleteModel(id: number): Promise<void> {
    await db.delete(benchmarkResults).where(eq(benchmarkResults.modelId, id));
    await db.delete(leaderboardScores).where(eq(leaderboardScores.modelId, id));
    await db.delete(models).where(eq(models.id, id));
  }

  async getBenchmarkResults(modelId: number): Promise<BenchmarkResult[]> {
    return db.select().from(benchmarkResults).where(eq(benchmarkResults.modelId, modelId)).orderBy(asc(benchmarkResults.taskName));
  }

  async createBenchmarkResult(result: InsertBenchmarkResult): Promise<BenchmarkResult> {
    const [created] = await db.insert(benchmarkResults).values(result).returning();
    return created;
  }

  async getLeaderboardScores(tab?: string): Promise<LeaderboardScore[]> {
    if (tab) {
      return db.select().from(leaderboardScores).where(eq(leaderboardScores.tab, tab));
    }
    return db.select().from(leaderboardScores);
  }

  async createLeaderboardScore(score: InsertLeaderboardScore): Promise<LeaderboardScore> {
    const [created] = await db.insert(leaderboardScores).values(score).returning();
    return created;
  }

  async getTaskDefinitions(): Promise<TaskDefinition[]> {
    return db.select().from(taskDefinitions).orderBy(asc(taskDefinitions.id));
  }

  async getTaskDefinitionByName(name: string): Promise<TaskDefinition | undefined> {
    const [task] = await db.select().from(taskDefinitions).where(eq(taskDefinitions.name, name));
    return task;
  }

  async createTaskDefinition(task: InsertTaskDefinition): Promise<TaskDefinition> {
    const [created] = await db.insert(taskDefinitions).values(task).returning();
    return created;
  }

  async getEvaluators(): Promise<Evaluator[]> {
    return db.select().from(evaluators);
  }

  async getEvaluatorById(id: number): Promise<Evaluator | undefined> {
    const [row] = await db.select().from(evaluators).where(eq(evaluators.id, id));
    return row;
  }

  async createEvaluator(data: InsertEvaluator): Promise<Evaluator> {
    const [created] = await db.insert(evaluators).values(data).returning();
    return created;
  }

  async updateEvaluator(id: number, data: Partial<InsertEvaluator>): Promise<Evaluator | undefined> {
    const [updated] = await db.update(evaluators).set(data).where(eq(evaluators.id, id)).returning();
    return updated;
  }

  async deleteEvaluator(id: number): Promise<void> {
    await db.delete(evaluators).where(eq(evaluators.id, id));
  }
}

export const storage = new DatabaseStorage();
