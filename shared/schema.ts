import { sql } from "drizzle-orm";
import { pgTable, text, varchar, integer, real, boolean, serial, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const models = pgTable("models", {
  id: serial("id").primaryKey(),
  name: text("name").notNull().unique(),
  type: text("type").notNull(),
  provider: text("provider").notNull(),
  access: text("access").notNull(),
  winRate: real("win_rate").notNull(),
  costPer1mTokens: text("cost_per_1m_tokens").notNull(),
  latency: text("latency").notNull(),
  isCustom: boolean("is_custom").default(false),
  dockerImage: text("docker_image"),
});

export const benchmarkResults = pgTable("benchmark_results", {
  id: serial("id").primaryKey(),
  modelId: integer("model_id").notNull(),
  taskName: text("task_name").notNull(),
  earned: real("earned").notNull(),
  failed: real("failed").notNull(),
});

export const leaderboardScores = pgTable("leaderboard_scores", {
  id: serial("id").primaryKey(),
  modelId: integer("model_id").notNull(),
  metricName: text("metric_name").notNull(),
  tab: text("tab").notNull(),
  value: text("value").notNull(),
});

export const taskDefinitions = pgTable("task_definitions", {
  id: serial("id").primaryKey(),
  name: text("name").notNull().unique(),
  prompt: text("prompt").notNull(),
  response: text("response").notNull(),
  humanAnnotation: text("human_annotation").notNull(),
  agreement: text("agreement").notNull(),
  metrics: text("metrics").array().notNull(),
});

export const evaluators = pgTable("evaluators", {
  id: serial("id").primaryKey(),
  name: text("name").notNull().unique(),
  dockerImage: text("docker_image"),
  agentbeatsId: text("agentbeats_id"),
  env: jsonb("env").$type<Record<string, string>>().default({}),
});

export const insertModelSchema = createInsertSchema(models).omit({ id: true });
export const insertBenchmarkResultSchema = createInsertSchema(benchmarkResults).omit({ id: true });
export const insertLeaderboardScoreSchema = createInsertSchema(leaderboardScores).omit({ id: true });
export const insertTaskDefinitionSchema = createInsertSchema(taskDefinitions).omit({ id: true });
export const insertEvaluatorSchema = createInsertSchema(evaluators).omit({ id: true });

export type InsertModel = z.infer<typeof insertModelSchema>;
export type Model = typeof models.$inferSelect;
export type InsertBenchmarkResult = z.infer<typeof insertBenchmarkResultSchema>;
export type BenchmarkResult = typeof benchmarkResults.$inferSelect;
export type InsertLeaderboardScore = z.infer<typeof insertLeaderboardScoreSchema>;
export type LeaderboardScore = typeof leaderboardScores.$inferSelect;
export type InsertTaskDefinition = z.infer<typeof insertTaskDefinitionSchema>;
export type TaskDefinition = typeof taskDefinitions.$inferSelect;
export type InsertEvaluator = z.infer<typeof insertEvaluatorSchema>;
export type Evaluator = typeof evaluators.$inferSelect;
