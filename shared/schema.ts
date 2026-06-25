import { z } from "zod";

export const insertModelSchema = z.object({
  name: z.string().trim().min(1),
  type: z.string().trim().min(1),
  provider: z.string().trim().min(1),
  access: z.string().trim().min(1),
  winRate: z.number(),
  costPer1mTokens: z.string(),
  latency: z.string(),
  isCustom: z.boolean().optional().default(false),
  dockerImage: z.string().nullable().optional(),
});

export const insertBenchmarkResultSchema = z.object({
  modelId: z.number().int().positive(),
  taskName: z.string().trim().min(1),
  earned: z.number(),
  failed: z.number(),
});

export const insertLeaderboardScoreSchema = z.object({
  modelId: z.number().int().positive(),
  metricName: z.string().trim().min(1),
  tab: z.string().trim().min(1),
  value: z.string(),
});

export const insertTaskDefinitionSchema = z.object({
  name: z.string().trim().min(1),
  prompt: z.string(),
  response: z.string(),
  humanAnnotation: z.string(),
  agreement: z.string(),
  metrics: z.array(z.string()),
});

export const evaluatorEnvSchema = z.record(
  z.string().regex(/^[A-Za-z0-9_-]+$/, "Env keys must be TOML bare keys"),
  z.string(),
);

export const insertEvaluatorSchema = z
  .object({
    name: z.string().trim().min(1).max(120),
    dockerImage: z.string().trim().min(1).max(512).nullable().optional(),
    agentbeatsId: z.string().trim().min(1).max(256).nullable().optional(),
    env: evaluatorEnvSchema.optional().default({}),
  })
  .strict();

export const updateEvaluatorSchema = insertEvaluatorSchema.partial().refine((data) => Object.keys(data).length > 0, {
  message: "At least one evaluator field is required",
});

export type InsertModel = z.infer<typeof insertModelSchema>;
export type Model = InsertModel & { id: number };
export type InsertBenchmarkResult = z.infer<typeof insertBenchmarkResultSchema>;
export type BenchmarkResult = InsertBenchmarkResult & { id: number };
export type InsertLeaderboardScore = z.infer<typeof insertLeaderboardScoreSchema>;
export type LeaderboardScore = InsertLeaderboardScore & { id: number };
export type InsertTaskDefinition = z.infer<typeof insertTaskDefinitionSchema>;
export type TaskDefinition = InsertTaskDefinition & { id: number };
export type InsertEvaluator = z.infer<typeof insertEvaluatorSchema>;
export type UpdateEvaluator = z.infer<typeof updateEvaluatorSchema>;
export type Evaluator = InsertEvaluator & { id: number };
