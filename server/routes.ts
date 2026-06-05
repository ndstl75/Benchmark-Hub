import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertModelSchema, insertEvaluatorSchema } from "@shared/schema";

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {

  app.get("/api/models", async (_req, res) => {
    const models = await storage.getModels();
    res.json(models);
  });

  app.get("/api/models/:id", async (req, res) => {
    const model = await storage.getModelById(parseInt(req.params.id));
    if (!model) return res.status(404).json({ message: "Model not found" });
    res.json(model);
  });

  app.post("/api/models", async (req, res) => {
    const parsed = insertModelSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ message: parsed.error.message });
    const model = await storage.createModel(parsed.data);
    res.status(201).json(model);
  });

  app.delete("/api/models/:id", async (req, res) => {
    await storage.deleteModel(parseInt(req.params.id));
    res.status(204).send();
  });

  app.get("/api/benchmark-results/:modelId", async (req, res) => {
    const results = await storage.getBenchmarkResults(parseInt(req.params.modelId));
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
    const task = await storage.getTaskDefinitionByName(req.params.name);
    if (!task) return res.status(404).json({ message: "Task not found" });
    res.json(task);
  });

  app.get("/api/evaluators", async (_req, res) => {
    const list = await storage.getEvaluators();
    res.json(list);
  });

  app.post("/api/evaluators", async (req, res) => {
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

  app.patch("/api/evaluators/:id", async (req, res) => {
    const id = parseInt(req.params.id);
    const existing = await storage.getEvaluatorById(id);
    if (!existing) return res.status(404).json({ message: "Evaluator not found" });
    const body = req.body as Record<string, unknown>;
    const dockerImage = body.dockerImage !== undefined ? (body.dockerImage as string | null) : existing.dockerImage;
    const agentbeatsId = body.agentbeatsId !== undefined ? (body.agentbeatsId as string | null) : existing.agentbeatsId;
    if (!dockerImage && !agentbeatsId) {
      return res.status(400).json({ message: "Either dockerImage or agentbeatsId must be set" });
    }
    const updated = await storage.updateEvaluator(id, {
      name: body.name !== undefined ? (body.name as string) : existing.name,
      dockerImage,
      agentbeatsId,
      env: body.env !== undefined ? (body.env as Record<string, string>) : existing.env,
    });
    res.json(updated);
  });

  app.delete("/api/evaluators/:id", async (req, res) => {
    const id = parseInt(req.params.id);
    const existing = await storage.getEvaluatorById(id);
    if (!existing) return res.status(404).json({ message: "Evaluator not found" });
    await storage.deleteEvaluator(id);
    res.status(204).send();
  });

  app.get("/api/evaluators/export-scenario", async (req, res) => {
    const evaluatorId = req.query.evaluatorId as string | undefined;
    const evaluatorsList = await storage.getEvaluators();
    const evaluator = evaluatorId
      ? evaluatorsList.find((e) => e.id === parseInt(evaluatorId))
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
    const envStr = Object.keys(env).length
      ? Object.entries(env).map(([k, v]) => `${k} = "${v.replace(/"/g, '\\"')}"`).join(", ")
      : "LOG_LEVEL = \"INFO\"";
    const greenLines = ["[green_agent]"];
    if (evaluator.dockerImage) {
      greenLines.push(`image = "${evaluator.dockerImage}"`);
    } else {
      greenLines.push(`agentbeats_id = "${evaluator.agentbeatsId ?? ""}"`);
    }
    greenLines.push(`env = { ${envStr} }`);
    const participantBlocks = participants.map(
      (p) => `[[participants]]\nname = "${p.name}"\nimage = "${p.dockerImage}"\nenv = {}`
    );
    const toml = greenLines.join("\n") + "\n\n" + participantBlocks.join("\n\n") + "\n\n[config]\n# Add assessment config\n";
    res.setHeader("Content-Type", "application/toml");
    res.setHeader("Content-Disposition", 'attachment; filename="scenario.toml"');
    res.send(toml);
  });

  return httpServer;
}
