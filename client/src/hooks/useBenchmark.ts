import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { isStaticDeploy } from "@/lib/deployMode";
import * as staticBenchmark from "@/lib/staticBenchmark";

export type Model = {
  id: number;
  name: string;
  type: string;
  provider: string;
  access: string;
  winRate: number;
  costPer1mTokens: string;
  latency: string;
  isCustom: boolean | null;
  dockerImage: string | null;
};

export type BenchmarkResult = {
  id: number;
  modelId: number;
  taskName: string;
  earned: number;
  failed: number;
};

export type LeaderboardScore = {
  id: number;
  modelId: number;
  metricName: string;
  tab: string;
  value: string;
};

export type TaskDefinition = {
  id: number;
  name: string;
  prompt: string;
  response: string;
  humanAnnotation: string;
  agreement: string;
  metrics: string[];
};

export type Evaluator = {
  id: number;
  name: string;
  dockerImage: string | null;
  agentbeatsId: string | null;
  env: Record<string, string> | null;
};

export function useModels() {
  return useQuery<Model[]>({
    queryKey: ["/api/models", isStaticDeploy],
    queryFn: () =>
      isStaticDeploy
        ? staticBenchmark.getModels()
        : fetch("/api/models").then((r) => r.json()),
  });
}

export function useBenchmarkResults(modelId: number | null) {
  return useQuery<BenchmarkResult[]>({
    queryKey: ["/api/benchmark-results", modelId, isStaticDeploy],
    queryFn: () =>
      isStaticDeploy
        ? staticBenchmark.getBenchmarkResults(modelId!)
        : fetch(`/api/benchmark-results/${modelId}`).then((r) => r.json()),
    enabled: modelId != null,
  });
}

export function useLeaderboard(tab: string) {
  return useQuery<LeaderboardScore[]>({
    queryKey: ["/api/leaderboard", tab, isStaticDeploy],
    queryFn: () =>
      isStaticDeploy
        ? staticBenchmark.getLeaderboard(tab)
        : fetch(`/api/leaderboard?tab=${encodeURIComponent(tab)}`).then((r) => r.json()),
  });
}

export function useTasks() {
  return useQuery<TaskDefinition[]>({
    queryKey: ["/api/tasks", isStaticDeploy],
    queryFn: () =>
      isStaticDeploy
        ? staticBenchmark.getTasks()
        : fetch("/api/tasks").then((r) => r.json()),
  });
}

export function useEvaluators() {
  return useQuery<Evaluator[]>({
    queryKey: ["/api/evaluators", isStaticDeploy],
    queryFn: () =>
      isStaticDeploy
        ? Promise.resolve([])
        : fetch("/api/evaluators").then((r) => r.json()),
  });
}

export function useCreateModel() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (body: Record<string, unknown>) => {
      if (isStaticDeploy) throw new Error("Read-only on GitHub Pages");
      const res = await apiRequest("POST", "/api/models", body);
      return res.json();
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["/api/models"] }),
  });
}

export function useDeleteModel() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) => {
      if (isStaticDeploy) throw new Error("Read-only on GitHub Pages");
      await apiRequest("DELETE", `/api/models/${id}`);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["/api/models"] }),
  });
}

export function useCreateEvaluator() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (body: Record<string, unknown>) => {
      if (isStaticDeploy) throw new Error("Read-only on GitHub Pages");
      const res = await apiRequest("POST", "/api/evaluators", body);
      return res.json();
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["/api/evaluators"] }),
  });
}

export function useDeleteEvaluator() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) => {
      if (isStaticDeploy) throw new Error("Read-only on GitHub Pages");
      await apiRequest("DELETE", `/api/evaluators/${id}`);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["/api/evaluators"] }),
  });
}
