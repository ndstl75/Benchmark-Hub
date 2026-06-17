import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertModelSchema, insertEvaluatorSchema, updateEvaluatorSchema } from "@shared/schema";
import { requireAdmin } from "./security";

const TOML_BARE_KEY = /^[A-Za-z0-9_-]+$/;

function tomlString(value: string): string {
  return JSON.stringify(value);
}

function tomlEnv(env: Record<string, string>): string | null {
  const entries = Object.entries(env);
  if (entries.length === 0) return 'LOG_LEVEL = "INFO"';
  const parts: string[] = [];
  for (const [key, value] of entries) {
    if (!TOML_BARE_KEY.test(key)) return null;
    parts.push(`${key} = ${tomlString(value)}`);
  }
  return parts.join(", ");
}

function singleString(value: unknown): string {
  if (Array.isArray(value)) return singleString(value[0]);
  return typeof value === "string" ? value : "";
}

function integerParam(value: unknown): number | null {
  const text = singleString(value);
  if (!/^\d+$/.test(text)) return null;
  const n = Number(text);
  return Number.isSafeInteger(n) ? n : null;
}

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {

  app.get("/api/models", async (_req, res) => {
    const models = await storage.getModels();
    res.json(models);
  });

  app.get("/api/models/:id", async (req, res) => {
    const id = integerParam(req.params.id);
    if (id == null) return res.status(400).json({ message: "Invalid model id" });
    const model = await storage.getModelById(id);
    if (!model) return res.status(404).json({ message: "Model not found" });
    res.json(model);
  });

  app.post("/api/models", requireAdmin, async (req, res) => {
    const parsed = insertModelSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ message: parsed.error.message });
    const model = await storage.createModel(parsed.data);
    res.status(201).json(model);
  });

  app.delete("/api/models/:id", requireAdmin, async (req, res) => {
    const id = integerParam(req.params.id);
    if (id == null) return res.status(400).json({ message: "Invalid model id" });
    await storage.deleteModel(id);
    res.status(204).send();
  });

  app.get("/api/benchmark-results/:modelId", async (req, res) => {
    const modelId = integerParam(req.params.modelId);
    if (modelId == null) return res.status(400).json({ message: "Invalid model id" });
    const results = await storage.getBenchmarkResults(modelId);
    res.json(results);
  });

  app.get("/api/leaderboard", async (req, res) => {
    const tab = req.query.tab as string | undefined;
    const scores = await storage.getLeaderboardScores(tab);
    res.json(scores);
  });

  app.get("/api/tasks", async (_req, res) => {
    const tasks = await storage.getTaskDefinitions();
    res.json(tasks);
  });

  app.get("/api/tasks/:name", async (req, res) => {
    const task = await storage.getTaskDefinitionByName(singleString(req.params.name));
    if (!task) return res.status(404).json({ message: "Task not found" });
    res.json(task);
  });

  app.get("/api/evaluators", requireAdmin, async (_req, res) => {
    const list = await storage.getEvaluators();
    res.json(list);
  });

  app.post("/api/evaluators", requireAdmin, async (req, res) => {
    const parsed = insertEvaluatorSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ message: parsed.error.message });
    const { name, dockerImage, agentbeatsId, env } = parsed.data;
    if (!dockerImage && !agentbeatsId) {
      return res.status(400).json({ message: "Either docker_image or agentbeats_id is required" });
    }
    const evaluator = await storage.createEvaluator({
      name,
      dockerImage: dockerImage ?? null,
      agentbeatsId: agentbeatsId ?? null,
      env: env ?? {},
    });
    res.status(201).json(evaluator);
  });

  app.patch("/api/evaluators/:id", requireAdmin, async (req, res) => {
    const id = integerParam(req.params.id);
    if (id == null) return res.status(400).json({ message: "Invalid evaluator id" });
    const existing = await storage.getEvaluatorById(id);
    if (!existing) return res.status(404).json({ message: "Evaluator not found" });
    const parsed = updateEvaluatorSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ message: parsed.error.message });
    const body = parsed.data;
    const dockerImage = body.dockerImage !== undefined ? (body.dockerImage as string | null) : existing.dockerImage;
    const agentbeatsId = body.agentbeatsId !== undefined ? (body.agentbeatsId as string | null) : existing.agentbeatsId;
    if (!dockerImage && !agentbeatsId) {
      return res.status(400).json({ message: "Either dockerImage or agentbeatsId must be set" });
    }
    const updated = await storage.updateEvaluator(id, {
      name: body.name !== undefined ? (body.name as string) : existing.name,
      dockerImage,
      agentbeatsId,
      env: body.env !== undefined ? body.env : existing.env ?? {},
    });
    res.json(updated);
  });

  app.delete("/api/evaluators/:id", requireAdmin, async (req, res) => {
    const id = integerParam(req.params.id);
    if (id == null) return res.status(400).json({ message: "Invalid evaluator id" });
    const existing = await storage.getEvaluatorById(id);
    if (!existing) return res.status(404).json({ message: "Evaluator not found" });
    await storage.deleteEvaluator(id);
    res.status(204).send();
  });

  app.get("/api/evaluators/export-scenario", requireAdmin, async (req, res) => {
    const evaluatorId = singleString(req.query.evaluatorId);
    const parsedEvaluatorId = evaluatorId ? integerParam(evaluatorId) : null;
    if (evaluatorId && parsedEvaluatorId == null) {
      return res.status(400).json({ message: "Invalid evaluator id" });
    }
    const evaluatorsList = await storage.getEvaluators();
    const evaluator = evaluatorId
      ? evaluatorsList.find((e) => e.id === parsedEvaluatorId)
      : evaluatorsList[0];
    if (!evaluator) {
      return res.status(404).json({ message: "No evaluator found. Add an Agent Doctor first." });
    }
    const models = await storage.getModels();
    const participants = models.filter((m) => m.dockerImage).map((m) => ({
      name: m.name.replace(/\s+/g, "_").toLowerCase(),
      dockerImage: m.dockerImage as string,
    }));
    const env = evaluator.env && typeof evaluator.env === "object" ? (evaluator.env as Record<string, string>) : {};
    const envStr = tomlEnv(env);
    if (envStr == null) {
      return res.status(400).json({ message: "Evaluator env keys must be TOML bare keys" });
    }
    const greenLines = ["[green_agent]"];
    if (evaluator.dockerImage) {
      greenLines.push(`image = ${tomlString(evaluator.dockerImage)}`);
    } else {
      greenLines.push(`agentbeats_id = ${tomlString(evaluator.agentbeatsId ?? "")}`);
    }
    greenLines.push(`env = { ${envStr} }`);
    const participantBlocks = participants.map(
      (p) => `[[participants]]\nname = ${tomlString(p.name)}\nimage = ${tomlString(p.dockerImage)}\nenv = {}`
    );
    const toml = greenLines.join("\n") + "\n\n" + participantBlocks.join("\n\n") + "\n\n[config]\n# Add assessment config\n";
    res.setHeader("Content-Type", "application/toml");
    res.setHeader("Content-Disposition", 'attachment; filename="scenario.toml"');
    res.send(toml);
  });

  return httpServer;
}
