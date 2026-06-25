import { useState, useMemo, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import type { Model, BenchmarkResult, LeaderboardScore, TaskDefinition, Evaluator } from "@shared/schema";
import { 
  BarChart,
  Bar,
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
} from "recharts";
import { 
  Activity,
  Award,
  LayoutDashboard,
  FolderOpen,
  Settings,
  DollarSign,
  Clock,
  Github,
  Server,
  Microscope,
  Bot,
  BrainCircuit,
  Database,
  BarChart3,
  ShieldCheck,
  BookOpen,
  ExternalLink,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter
} from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { DatasetDiagram } from "@/components/DatasetDiagram";
import { LeaderboardPage } from "@/components/LeaderboardPage";
import {
  DATASET_PROJECTS,
  LEADERBOARD_ACCURACY_METRICS,
  TASK_TAXONOMY,
} from "@/data/benchmarkContent";

/** PharmDrugBench logo: brand icon + wordmark */
function PharmDrugBenchLogo({ className = "", iconSize = 32 }: { className?: string; iconSize?: number }) {
  return (
    <div className={`flex items-center gap-2.5 ${className}`}>
      <img
        src="/logo.png"
        alt=""
        width={iconSize}
        height={iconSize}
        className="flex-shrink-0 rounded-md"
        aria-hidden
      />
      <div>
        <h1 className="font-bold text-base leading-tight tracking-tight text-slate-900" data-testid="text-app-title">PharmDrugBench</h1>
        <p className="text-[10px] text-slate-500 font-medium leading-tight">Source-backed medication safety benchmarks</p>
      </div>
    </div>
  );
}

type AgentTaskData = {
  domain: string;
  earned: number;
  failed: number;
};

export default function Home() {
  const [activeTab, setActiveTab] = useState('Public Leaderboard');
  const [activeAgent, setActiveAgent] = useState('GPT-5 Chat');
  const [selectedTask, setSelectedTask] = useState('Drug Order Gen (Sig)');
  const [dockerInput, setDockerInput] = useState('');
  const [selectedCustomModels, setSelectedCustomModels] = useState<string[]>([]);
  const [evaluatorName, setEvaluatorName] = useState('');
  const [evaluatorDockerImage, setEvaluatorDockerImage] = useState('');
  const [evaluatorAgentBeatsId, setEvaluatorAgentBeatsId] = useState('');
  const [evaluatorSource, setEvaluatorSource] = useState<'docker' | 'agentbeats'>('docker');

  const { data: allModels = [] } = useQuery<Model[]>({
    queryKey: ["/api/models"],
  });

  const { data: taskDefs = [] } = useQuery<TaskDefinition[]>({
    queryKey: ["/api/tasks"],
  });

  const { data: leaderboardScores = [] } = useQuery<LeaderboardScore[]>({
    queryKey: ["/api/leaderboard"],
  });

  const { data: evaluatorsList = [] } = useQuery<Evaluator[]>({
    queryKey: ["/api/evaluators"],
  });

  const activeModel = allModels.find(m => m.name === activeAgent);

  useEffect(() => {
    if (allModels.length === 0) return;
    const supported = allModels.filter(m => !m.isCustom);
    const current = supported.find(m => m.name === activeAgent);
    if (!current && supported.length > 0) {
      const top = [...supported].sort((a, b) => b.winRate - a.winRate)[0];
      setActiveAgent(top.name);
    }
  }, [allModels, activeAgent]);

  const { data: benchmarkData = [] } = useQuery<BenchmarkResult[]>({
    queryKey: ["/api/benchmark-results", activeModel?.id],
    enabled: !!activeModel,
    queryFn: async () => {
      if (!activeModel) return [];
      const res = await fetch(`/api/benchmark-results/${activeModel.id}`);
      if (!res.ok) throw new Error("Failed to fetch");
      return res.json();
    },
  });

  const addModelMutation = useMutation({
    mutationFn: async (model: any) => {
      const res = await fetch("/api/models", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(model),
      });
      if (!res.ok) throw new Error("Failed to add model");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/models"] });
    },
  });

  const currentEval = useMemo(() => {
    const task = taskDefs.find(t => t.name === selectedTask);
    if (task) {
      return {
        prompt: task.prompt,
        response: task.response,
        human: task.humanAnnotation,
        agreement: task.agreement,
        metrics: task.metrics,
      };
    }
    return {
      prompt: `Scenario for ${selectedTask}...`,
      response: `LLM generated response for ${selectedTask}...`,
      human: `Expert clinical annotation for ${selectedTask}...`,
      agreement: '92%',
      metrics: ['Exact match', 'Paper metrics'],
    };
  }, [selectedTask, taskDefs]);

  const domainEarnings: AgentTaskData[] = useMemo(() => {
    const orderByTaskDefs = (a: AgentTaskData, b: AgentTaskData) => {
      const ia = taskDefs.findIndex(t => t.name === a.domain);
      const ib = taskDefs.findIndex(t => t.name === b.domain);
      if (ia === -1 && ib === -1) return 0;
      if (ia === -1) return 1;
      if (ib === -1) return -1;
      return ia - ib;
    };
    if (benchmarkData.length > 0) {
      const mapped = benchmarkData.map(b => ({
        domain: b.taskName,
        earned: b.earned,
        failed: b.failed,
      }));
      return taskDefs.length > 0 ? [...mapped].sort(orderByTaskDefs) : mapped;
    }
    if (taskDefs.length > 0) {
      return taskDefs.map(t => ({
        domain: t.name,
        earned: 0,
        failed: 0,
      }));
    }
    return [];
  }, [benchmarkData, taskDefs]);

  const agents = useMemo(() => {
    return allModels
      .filter(m => !m.isCustom)
      .map(m => ({
        name: m.name,
        type: m.type === 'Reasoning' ? 'Reasoning' as const : 'Non-Reasoning' as const,
        score: `Reported mean: ${Math.round(m.winRate * 100)}%`,
      }));
  }, [allModels]);

  const leaderboardModels = useMemo(() => {
    return allModels.filter(m => !m.isCustom);
  }, [allModels]);

  const getDashboardMetricValue = (metricName: string, modelId: number | undefined) => {
    if (modelId == null) return '—';
    const score = leaderboardScores.find(
      s => s.metricName === metricName && s.modelId === modelId && s.tab === 'Accuracy'
    );
    return score?.value ?? '—';
  };

  const getGeneralMetricValue = (metricName: string, modelId: number | undefined) => {
    if (modelId == null) return '—';
    const score = leaderboardScores.find(
      s => s.metricName === metricName && s.modelId === modelId && s.tab === 'General information'
    );
    return score?.value ?? '—';
  };

  const baselineModel = allModels.find(m => m.name === 'GPT-4o-mini');
  const metricDeltaLabel = (metricName: string, modelId: number | undefined) => {
    if (!baselineModel || modelId == null || modelId === baselineModel.id) return null;
    const cur = parseFloat(getDashboardMetricValue(metricName, modelId));
    const base = parseFloat(getDashboardMetricValue(metricName, baselineModel.id));
    if (Number.isNaN(cur) || Number.isNaN(base)) return null;
    const delta = cur - base;
    const sign = delta >= 0 ? '+' : '';
    return `${sign}${delta.toFixed(2)} vs GPT-4o-mini`;
  };

  const formatScoreAsPercent = (value: string) => {
    const n = parseFloat(value);
    if (Number.isNaN(n) || n < 0 || n > 1) return value;
    return `${(n * 100).toFixed(1)}%`;
  };

  const formatDashboardMetric = (metricName: string, value: string) => {
    if (value === '—') return value;
    const paperMetrics = LEADERBOARD_ACCURACY_METRICS.map((m) => m.name);
    if (paperMetrics.includes(metricName as (typeof paperMetrics)[number])) {
      return formatScoreAsPercent(value);
    }
    return value;
  };

  const availableCustomModels = [
    { id: 'llama-3-8b', name: 'Llama 3 8B Instruct', type: 'Local Weights' },
    { id: 'mistral-7b', name: 'Mistral 7B', type: 'Local Weights' },
    { id: 'med-alpaca', name: 'MedAlpaca 13B', type: 'Docker Agent' },
    { id: 'clinical-camel', name: 'ClinicalCamel', type: 'Docker Agent' },
    { id: 'custom-docker', name: 'my-custom-med-agent:latest', type: 'Docker Agent' },
  ];

  const handleAddCustomModels = () => {
    selectedCustomModels.forEach(id => {
      const cm = availableCustomModels.find(m => m.id === id);
      if (cm) {
        addModelMutation.mutate({
          name: cm.name,
          type: 'Standard',
          provider: cm.type === 'Docker Agent' ? 'Docker' : 'Local',
          access: cm.type,
          winRate: 0.5 + Math.random() * 0.3,
          costPer1mTokens: '$0.00',
          latency: 'N/A',
          isCustom: true,
          dockerImage: cm.type === 'Docker Agent' ? cm.name : null,
        });
      }
    });
    setSelectedCustomModels([]);
  };

  const handleConnectDocker = () => {
    if (!dockerInput.trim()) return;
    addModelMutation.mutate({
      name: dockerInput.trim(),
      type: 'Standard',
      provider: 'Docker',
      access: 'Docker Agent',
      winRate: 0.5 + Math.random() * 0.3,
      costPer1mTokens: '$0.00',
      latency: 'N/A',
      isCustom: true,
      dockerImage: dockerInput.trim(),
    });
    setDockerInput('');
  };

  const addEvaluatorMutation = useMutation({
    mutationFn: async (data: { name: string; dockerImage: string | null; agentbeatsId: string | null }) => {
      const res = await fetch("/api/evaluators", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || "Failed to add evaluator");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/evaluators"] });
      setEvaluatorName("");
      setEvaluatorDockerImage("");
      setEvaluatorAgentBeatsId("");
    },
  });

  const deleteEvaluatorMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await fetch(`/api/evaluators/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete");
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/evaluators"] }),
  });

  const handleAddAgentDoctor = () => {
    if (!evaluatorName.trim()) return;
    const dockerImage = evaluatorSource === "docker" ? evaluatorDockerImage.trim() || null : null;
    const agentbeatsId = evaluatorSource === "agentbeats" ? evaluatorAgentBeatsId.trim() || null : null;
    if (!dockerImage && !agentbeatsId) return;
    addEvaluatorMutation.mutate({ name: evaluatorName.trim(), dockerImage, agentbeatsId });
  };

  const sidebarLinks = [
    { name: 'Public Leaderboard', icon: Award },
    { name: 'Dashboard', icon: LayoutDashboard },
    { name: 'Task Taxonomy', icon: FolderOpen },
    { name: 'Dataset Mapping', icon: Database },
    { name: 'Evaluation Process', icon: Microscope },
  ];

  if (activeTab === 'Public Leaderboard') {
    return (
      <LeaderboardPage
        models={leaderboardModels}
        leaderboardScores={leaderboardScores}
        taskDefs={taskDefs}
      />
    );
  }

  return (
    <div className="h-screen min-h-screen bg-[#FAFAFA] text-slate-900 font-sans flex overflow-hidden">
      
      <aside className="w-[21rem] bg-white border-r border-slate-200 flex-shrink-0 flex flex-col h-screen sticky top-0">
        <div className="p-3">
          <PharmDrugBenchLogo iconSize={32} />
        </div>

        <div className="mx-3 my-2 px-2.5 py-2 flex items-center justify-between border border-slate-200 rounded-md cursor-pointer hover:bg-slate-50 shadow-sm" data-testid="button-phi-instance">
          <div className="flex items-center gap-2 text-xs text-slate-600 font-medium">
            <ShieldCheck size={14} className="text-emerald-500" />
            PHI Compliant Instance
          </div>
          <Settings size={14} className="text-slate-400" />
        </div>

        <div className="flex-1 overflow-y-auto py-2">
          <nav className="flex flex-col gap-0.5 px-1.5 mb-6">
            {sidebarLinks.map(link => {
              const isLeaderboard = link.name === 'Public Leaderboard';
              const isActive = activeTab === link.name;
              const activeClasses = isActive
                ? (isLeaderboard ? 'bg-blue-50/70 text-blue-600' : 'bg-emerald-50/60 text-emerald-600')
                : 'text-slate-600 hover:bg-slate-50';
              const iconColor = isActive ? (isLeaderboard ? 'text-blue-600' : 'text-emerald-600') : 'text-slate-400';
              return (
                <button
                  key={link.name}
                  data-testid={`link-${link.name.toLowerCase().replace(/\s+/g, '-')}`}
                  onClick={() => setActiveTab(link.name)}
                  className={`flex items-center gap-2 px-2.5 py-2 rounded-md text-sm font-medium transition-colors ${activeClasses}`}
                >
                  <link.icon size={18} className={iconColor} strokeWidth={isActive ? 2.5 : 2} />
                  {link.name}
                </button>
              );
            })}
          </nav>

          <div className="px-3 mb-2">
            <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">SUPPORTED LLMS</h3>
          </div>
          <div className="flex flex-col px-1.5">
            {agents.map(agent => (
              <button 
                key={agent.name}
                data-testid={`button-agent-${agent.name.toLowerCase().replace(/\s+/g, '-')}`}
                onClick={() => {
                  setActiveAgent(agent.name);
                  setActiveTab('Dashboard');
                }}
                className={`flex flex-col items-start px-2.5 py-1.5 rounded-md transition-colors border ${
                  activeAgent === agent.name 
                    ? 'bg-slate-50/80 border-slate-200 shadow-sm' 
                    : 'hover:bg-slate-50 border-transparent'
                }`}
              >
                <div className="flex items-center justify-between w-full">
                  <div className="flex items-center gap-2 text-xs font-semibold text-slate-700">
                    <div className={`w-1.5 h-1.5 rounded-full ${agent.type === 'Reasoning' ? 'bg-purple-500' : 'bg-blue-500'}`}></div>
                    {agent.name}
                  </div>
                  <Badge variant="outline" className={`text-[9px] px-1 py-0 h-4 border-none ${agent.type === 'Reasoning' ? 'bg-purple-50 text-purple-600' : 'bg-blue-50 text-blue-600'}`}>
                    {agent.type}
                  </Badge>
                </div>
                <div className="text-[11px] font-medium text-slate-400 pl-3.5 mt-0.5">{agent.score}</div>
              </button>
            ))}
            
            <Dialog>
              <DialogTrigger asChild>
                <button data-testid="button-add-custom-model" className="flex items-center justify-center gap-2 px-3 py-2.5 mt-2 rounded-md border border-dashed border-slate-300 text-xs font-medium text-slate-500 hover:bg-slate-50 transition-colors w-full">
                  + Add Custom Model
                </button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                  <DialogTitle>Add Custom Models</DialogTitle>
                  <DialogDescription>
                    Select existing agent models or connect a Docker agent to evaluate.
                  </DialogDescription>
                </DialogHeader>
                <div className="py-2 flex flex-col gap-4">
                  <div className="space-y-3">
                    <h4 className="text-sm font-medium text-slate-900">Available Models</h4>
                    <div className="grid gap-1 border rounded-md p-2 max-h-[200px] overflow-y-auto bg-slate-50/50">
                      {availableCustomModels.map((model) => (
                        <div key={model.id} className="flex items-start space-x-3 p-2 hover:bg-white rounded-md border border-transparent hover:border-slate-200 transition-colors">
                          <Checkbox 
                            id={model.id} 
                            className="mt-0.5"
                            data-testid={`checkbox-model-${model.id}`}
                            checked={selectedCustomModels.includes(model.id)}
                            onCheckedChange={(checked) => {
                              setSelectedCustomModels(prev => 
                                checked 
                                  ? [...prev, model.id]
                                  : prev.filter(id => id !== model.id)
                              );
                            }}
                          />
                          <div className="grid gap-1.5 leading-none">
                            <label
                              htmlFor={model.id}
                              className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer text-slate-700"
                            >
                              {model.name}
                            </label>
                            <p className="text-[11px] text-slate-500">
                              {model.type}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                  
                  <div className="border-t border-slate-100 pt-4">
                    <h4 className="text-sm font-medium text-slate-900 mb-3">Connect Docker Agent</h4>
                    <div className="flex gap-2">
                      <input 
                        type="text" 
                        data-testid="input-docker-image"
                        value={dockerInput}
                        onChange={(e) => setDockerInput(e.target.value)}
                        placeholder="docker pull your-agent/image:tag" 
                        className="flex h-9 w-full rounded-md border border-slate-200 bg-white px-3 py-1 text-sm shadow-sm transition-colors placeholder:text-slate-400 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-emerald-500"
                      />
                      <Button variant="outline" className="h-9" data-testid="button-connect-docker" onClick={handleConnectDocker}>Connect</Button>
                    </div>
                  </div>
                </div>
                <DialogFooter className="pt-2">
                  <DialogTrigger asChild>
                    <Button type="button" variant="ghost" data-testid="button-cancel-add">Cancel</Button>
                  </DialogTrigger>
                  <DialogTrigger asChild>
                    <Button type="button" className="bg-emerald-600 hover:bg-emerald-700 text-white" data-testid="button-add-selected" onClick={handleAddCustomModels}>Add Selected</Button>
                  </DialogTrigger>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>

          <div className="px-3 mb-2 mt-4">
            <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">AGENT DOCTOR</h3>
          </div>
          <div className="flex flex-col px-2">
            {evaluatorsList.map((e) => (
              <div
                key={e.id}
                className="flex items-center justify-between px-2.5 py-1.5 rounded-md border border-transparent hover:bg-slate-50 group"
              >
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-medium text-slate-700 truncate">{e.name}</p>
                  <p className="text-[11px] text-slate-500 truncate">
                    {e.dockerImage ? `Docker: ${e.dockerImage}` : `AgentBeats: ${e.agentbeatsId ?? ""}`}
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 px-2 text-slate-400 opacity-0 group-hover:opacity-100"
                  onClick={() => deleteEvaluatorMutation.mutate(e.id)}
                >
                  Remove
                </Button>
              </div>
            ))}
            <Dialog>
              <DialogTrigger asChild>
                <button data-testid="button-add-agent-doctor" className="flex items-center justify-center gap-2 px-3 py-2.5 mt-2 rounded-md border border-dashed border-slate-300 text-xs font-medium text-slate-500 hover:bg-slate-50 transition-colors w-full">
                  + Add Agent Doctor
                </button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                  <DialogTitle>Add Agent Doctor</DialogTitle>
                  <DialogDescription>
                    Register an evaluator (green agent) to run assessments against models. Use Docker image or AgentBeats ID.
                  </DialogDescription>
                </DialogHeader>
                <div className="py-2 flex flex-col gap-4">
                  <div>
                    <label className="text-sm font-medium text-slate-700">Name</label>
                    <input
                      type="text"
                      data-testid="input-evaluator-name"
                      value={evaluatorName}
                      onChange={(e) => setEvaluatorName(e.target.value)}
                      placeholder="e.g. Debate Judge"
                      className="mt-1 flex h-9 w-full rounded-md border border-slate-200 bg-white px-3 py-1 text-sm"
                    />
                  </div>
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant={evaluatorSource === "docker" ? "default" : "outline"}
                      size="sm"
                      onClick={() => setEvaluatorSource("docker")}
                    >
                      Docker
                    </Button>
                    <Button
                      type="button"
                      variant={evaluatorSource === "agentbeats" ? "default" : "outline"}
                      size="sm"
                      onClick={() => setEvaluatorSource("agentbeats")}
                    >
                      AgentBeats ID
                    </Button>
                  </div>
                  {evaluatorSource === "docker" ? (
                    <div>
                      <label className="text-sm font-medium text-slate-700">Docker image</label>
                      <input
                        type="text"
                        data-testid="input-evaluator-docker"
                        value={evaluatorDockerImage}
                        onChange={(e) => setEvaluatorDockerImage(e.target.value)}
                        placeholder="ghcr.io/org/evaluator:v1"
                        className="mt-1 flex h-9 w-full rounded-md border border-slate-200 bg-white px-3 py-1 text-sm"
                      />
                    </div>
                  ) : (
                    <div>
                      <label className="text-sm font-medium text-slate-700">AgentBeats ID</label>
                      <input
                        type="text"
                        data-testid="input-evaluator-agentbeats"
                        value={evaluatorAgentBeatsId}
                        onChange={(e) => setEvaluatorAgentBeatsId(e.target.value)}
                        placeholder="From agentbeats.dev"
                        className="mt-1 flex h-9 w-full rounded-md border border-slate-200 bg-white px-3 py-1 text-sm"
                      />
                    </div>
                  )}
                </div>
                <DialogFooter className="pt-2">
                  <DialogTrigger asChild>
                    <Button type="button" variant="ghost" data-testid="button-cancel-agent-doctor">Cancel</Button>
                  </DialogTrigger>
                  <Button
                    type="button"
                    className="bg-emerald-600 hover:bg-emerald-700 text-white"
                    data-testid="button-save-agent-doctor"
                    onClick={handleAddAgentDoctor}
                    disabled={!evaluatorName.trim() || (evaluatorSource === "docker" ? !evaluatorDockerImage.trim() : !evaluatorAgentBeatsId.trim())}
                  >
                    Add
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
            {evaluatorsList.length > 0 && (
              <a
                href="/api/evaluators/export-scenario"
                download="scenario.toml"
                className="mt-2 flex items-center justify-center gap-2 px-3 py-2 rounded-md border border-slate-200 text-xs font-medium text-slate-600 hover:bg-slate-50 w-full"
              >
                Export scenario.toml
              </a>
            )}
          </div>
        </div>

        <div className="p-3 border-t border-slate-100 bg-slate-50/50">
          <Button variant="default" className="w-full bg-[#0F172A] hover:bg-slate-800 text-white flex items-center justify-center gap-2 shadow-md rounded-lg h-9 font-medium text-xs" data-testid="link-github" asChild>
            <a href="https://github.com/AIChemist-Lab" target="_blank" rel="noopener noreferrer">
              <Github size={16} /> PharmDrugBench GitHub <span className="text-amber-400">&#9733;</span>
            </a>
          </Button>
          <p className="text-center text-[10px] font-medium text-slate-400 mt-3">Autonomous Pharmacy Evaluation</p>
        </div>
      </aside>

      <main className="flex-1 min-h-0 overflow-y-auto min-w-0">
        <div className="px-6 py-8 w-full max-w-[100%]">
          {activeTab === 'Dashboard' ? (
            <>
              <div className="flex items-center justify-between mb-8">
                <div>
                  <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight mb-1" data-testid="text-active-agent">{activeAgent}</h2>
                  <p className="text-[13px] text-slate-500 font-medium flex items-center gap-2">
                    <BrainCircuit size={14} className="text-purple-500" />
                    {activeModel?.type === 'Reasoning' ? 'Reasoning' : 'Standard'} Model Evaluation & Performance Analysis
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <Badge variant="outline" className="bg-emerald-50 text-emerald-600 border border-emerald-200 px-3 py-1.5 text-xs font-bold uppercase tracking-widest flex items-center gap-1.5 shadow-sm rounded-lg">
                    <span className="text-emerald-500 text-sm">&#10003;</span> CLINICIAN VALIDATED
                  </Badge>
                  <Badge variant="outline" className="bg-blue-50 text-blue-600 border border-blue-200 px-3 py-1.5 text-xs font-bold uppercase tracking-widest flex items-center gap-1.5 shadow-sm rounded-lg">
                    <Server size={14} /> PHI SECURE
                  </Badge>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-4 gap-5 mb-5">
                <Card className="shadow-sm border-slate-200/60 rounded-2xl bg-white hover:border-slate-300 transition-colors">
                  <CardContent className="p-5 flex flex-col h-[130px] justify-between">
                    <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center">
                      <FolderOpen size={16} className="text-slate-500" strokeWidth={2.5} />
                    </div>
                    <div>
                      <p className="text-[11px] font-semibold text-slate-400 mb-1">Healthcare Categories</p>
                      <p className="text-[22px] font-extrabold text-slate-900 tracking-tight" data-testid="text-categories">5</p>
                      <p className="text-[10px] text-slate-400">paper-aligned domains</p>
                    </div>
                  </CardContent>
                </Card>

                <Card className="shadow-sm border-slate-200/60 rounded-2xl bg-white hover:border-slate-300 transition-colors">
                  <CardContent className="p-5 flex flex-col h-[130px] justify-between">
                    <div className="flex justify-between items-start">
                      <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center">
                        <Database size={16} className="text-blue-500" strokeWidth={2.5} />
                      </div>
                    </div>
                    <div>
                      <p className="text-[11px] font-semibold text-slate-400 mb-1">Specific Tasks Benchmarked</p>
                      <p className="text-[22px] font-extrabold text-slate-900 tracking-tight" data-testid="text-tasks-count">{taskDefs.length}</p>
                      <p className="text-[10px] text-slate-400">evaluation tasks</p>
                    </div>
                  </CardContent>
                </Card>

                <Card className="shadow-sm border-slate-200/60 rounded-2xl bg-white hover:border-slate-300 transition-colors">
                  <CardContent className="p-5 flex flex-col h-[130px] justify-between">
                    <div className="w-8 h-8 rounded-lg bg-emerald-50 flex items-center justify-center">
                      <Bot size={16} className="text-emerald-500" strokeWidth={2.5} />
                    </div>
                    <div>
                      <p className="text-[11px] font-semibold text-slate-400 mb-1">Human Annotation Agreement</p>
                      <p className="text-[22px] font-extrabold text-slate-900 tracking-tight" data-testid="text-agreement">—</p>
                      <p className="text-[10px] text-slate-400">vs clinician annotation</p>
                    </div>
                  </CardContent>
                </Card>

                <Card className="shadow-sm border-slate-200/60 rounded-2xl bg-white hover:border-slate-300 transition-colors">
                  <CardContent className="p-5 flex flex-col h-[130px] justify-between">
                    <div className="w-8 h-8 rounded-lg bg-purple-50 flex items-center justify-center">
                      <BarChart3 size={16} className="text-purple-500" strokeWidth={2.5} />
                    </div>
                    <div>
                      <p className="text-[11px] font-semibold text-slate-400 mb-1">Reported Mean</p>
                      <div className="flex items-center gap-2">
                        <p className="text-[22px] font-extrabold text-slate-900 tracking-tight" data-testid="text-win-rate">
                          {activeModel ? `${(activeModel.winRate * 100).toFixed(1)}%` : '92.0%'}
                        </p>
                        {activeModel && allModels.filter(m => !m.isCustom).sort((a, b) => b.winRate - a.winRate)[0]?.name === activeModel.name && (
                          <Badge variant="outline" className="bg-emerald-50 text-emerald-600 border-none px-1 py-0 h-4 text-[9px] font-bold">&#129351; 1st</Badge>
                        )}
                      </div>
                      <p className="text-[10px] text-slate-400">Cost: {activeModel?.costPer1mTokens || '$0.14'}/1M tokens</p>
                    </div>
                  </CardContent>
                </Card>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-8">
                <Card className="shadow-sm border-slate-200/60 rounded-2xl bg-white hover:border-slate-300 transition-colors">
                  <CardContent className="p-5 flex flex-col h-[110px] justify-between">
                    <div className="flex items-center justify-between">
                      <p className="text-[12px] font-semibold text-slate-500">Rx-Bench (CMM)</p>
                      <BookOpen size={14} className="text-slate-400" />
                    </div>
                    <div>
                      <p className="text-[28px] font-extrabold text-slate-900 tracking-tight" data-testid="text-rx-llm">
                        {activeModel ? formatDashboardMetric("Rx-Bench (CMM)", getDashboardMetricValue("Rx-Bench (CMM)", activeModel.id)) : '—'}
                      </p>
                      <p className="text-[10px] font-medium text-emerald-500 mt-0.5">
                        {getDashboardMetricValue("Rx-Bench (CMM)", activeModel?.id) === 'N/A'
                          ? 'Not reported for this model'
                          : metricDeltaLabel("Rx-Bench (CMM)", activeModel?.id) ?? '6 CMM benchmarks'}
                      </p>
                    </div>
                  </CardContent>
                </Card>

                <Card className="shadow-sm border-slate-200/60 rounded-2xl bg-white hover:border-slate-300 transition-colors">
                  <CardContent className="p-5 flex flex-col h-[110px] justify-between">
                    <div className="flex items-center justify-between">
                      <p className="text-[12px] font-semibold text-slate-500">MedMatch</p>
                      <Activity size={14} className="text-slate-400" />
                    </div>
                    <div>
                      <p className="text-[28px] font-extrabold text-slate-900 tracking-tight" data-testid="text-medmatch">
                        {activeModel ? formatDashboardMetric("MedMatch", getDashboardMetricValue("MedMatch", activeModel.id)) : '—'}
                      </p>
                      <p className="text-[10px] font-medium text-emerald-500 mt-0.5">
                        {metricDeltaLabel("MedMatch", activeModel?.id) ?? 'PMC12870651 formatting suite'}
                      </p>
                    </div>
                  </CardContent>
                </Card>

                <Card className="shadow-sm border-slate-200/60 rounded-2xl bg-white hover:border-slate-300 transition-colors">
                  <CardContent className="p-5 flex flex-col h-[110px] justify-between">
                    <div className="flex items-center justify-between">
                      <p className="text-[12px] font-semibold text-slate-500">Reported Mean</p>
                      <Bot size={14} className="text-slate-400" />
                    </div>
                    <div>
                      <p className="text-[28px] font-extrabold text-slate-900 tracking-tight" data-testid="text-mean-win-rate">
                        {activeModel ? (() => { const v = getDashboardMetricValue("Mean Win Rate", activeModel.id); return v !== '—' ? formatScoreAsPercent(v) : '—'; })() : '—'}
                      </p>
                      <p className="text-[10px] font-medium text-slate-400 mt-0.5">
                        Source coverage: {getGeneralMetricValue("Source Coverage", activeModel?.id)}
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 min-w-0">
                <Card className="shadow-sm border-slate-200/60 rounded-2xl bg-white hover:border-slate-300 transition-colors min-w-0 overflow-hidden">
                  <CardContent className="p-6 h-full flex flex-col">
                    <div className="flex items-center justify-between mb-6">
                      <h3 className="text-sm font-bold text-slate-900">LLM Evaluation Process</h3>
                      <Badge variant="outline" className="bg-blue-50 text-blue-600 border-none" data-testid="text-selected-task">{selectedTask}</Badge>
                    </div>
                    
                    <div className="flex-1 flex flex-col md:flex-row items-center justify-center gap-6 relative">
                      <div className="flex flex-col gap-6 w-full max-w-4xl mx-auto z-10">
                        <div className="flex gap-4 items-start w-full md:w-5/6">
                          <div className="flex-shrink-0 w-10 h-10 rounded-full bg-emerald-100 border border-emerald-200 flex items-center justify-center shadow-sm">
                            <Bot size={22} className="text-emerald-600" />
                          </div>
                          <div className="relative bg-[#F4F6FA] border-2 border-[#1E3A8A] rounded-2xl rounded-tl-sm p-4 shadow-sm w-full">
                            <div className="absolute -left-2 top-0 w-0 h-0 border-t-8 border-r-8 border-b-0 border-l-0 border-solid border-transparent border-r-[#1E3A8A]"></div>
                            <div className="absolute -left-[5px] top-[2px] w-0 h-0 border-t-[6px] border-r-[6px] border-b-0 border-l-0 border-solid border-transparent border-r-[#F4F6FA] z-10"></div>
                            <p className="text-[15px] text-slate-800 leading-relaxed font-medium" data-testid="text-eval-prompt">
                              <span className="font-bold text-slate-900 mr-1">Prompt Scenario:</span>
                              {currentEval.prompt}
                            </p>
                          </div>
                        </div>

                        <div className="flex gap-4 items-end justify-end w-full md:w-5/6 self-end mt-2">
                          <div className="relative bg-[#F4F6FA] border-2 border-[#1E3A8A] rounded-2xl rounded-br-sm p-4 shadow-sm w-full text-right">
                            <div className="absolute -right-2 bottom-0 w-0 h-0 border-b-8 border-l-8 border-t-0 border-r-0 border-solid border-transparent border-l-[#1E3A8A]"></div>
                            <div className="absolute -right-[5px] bottom-[2px] w-0 h-0 border-b-[6px] border-l-[6px] border-t-0 border-r-0 border-solid border-transparent border-l-[#F4F6FA] z-10"></div>
                            <p className="text-[15px] text-slate-800 leading-relaxed text-left" data-testid="text-eval-response">
                              <span className="font-bold text-slate-900 mr-1">LLM Response:</span>
                              "{currentEval.response}"
                            </p>
                          </div>
                          <div className="flex-shrink-0 w-10 h-10 rounded-full bg-purple-100 border border-purple-200 flex items-center justify-center shadow-sm">
                            <Bot size={22} className="text-purple-600" />
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="mt-6 pt-4 border-t border-slate-100">
                      <div className="flex items-start gap-4 text-xs text-slate-500">
                        <div className="flex items-center gap-1 font-semibold text-slate-700">
                          <Activity size={14} className="text-emerald-500" /> Evaluation Metrics:
                        </div>
                        {currentEval.metrics.map((metric, idx) => (
                          <span key={idx} data-testid={`text-metric-${idx}`}>&#8226; {metric}</span>
                        ))}
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="shadow-sm border-slate-200/60 rounded-2xl bg-white hover:border-slate-300 transition-colors min-w-0 overflow-hidden">
                  <CardContent className="p-6">
                    <div className="flex flex-col mb-4">
                      <h3 className="text-sm font-bold text-slate-900 mb-3">Performance Over Task Taxonomy</h3>
                      <div className="flex items-center gap-4 text-[10px] font-medium text-slate-400">
                        <div className="flex items-center gap-1.5">
                          <div className="w-1.5 h-1.5 bg-[#22C55E]"></div>
                          Passed (Accurate)
                        </div>
                        <div className="flex items-center gap-1.5">
                          <div className="w-1.5 h-1.5 bg-[#F87171]"></div>
                          Failed (Inaccurate)
                        </div>
                      </div>
                    </div>

                    {benchmarkData.length === 0 && domainEarnings.length > 0 && (
                      <p className="text-xs text-amber-600 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 mb-3">
                        No benchmark results for this model yet. Chart shows task taxonomy; run evaluations to see pass/fail.
                      </p>
                    )}

                    <div className="h-[400px] w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart 
                          data={domainEarnings} 
                          layout="vertical" 
                          margin={{ top: 0, right: 0, left: 50, bottom: 0 }}
                          barSize={12}
                          onClick={(data) => {
                            if (data && data.activeLabel) {
                              setSelectedTask(data.activeLabel);
                            }
                          }}
                          className="cursor-pointer"
                        >
                          <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#F1F5F9" />
                          <XAxis type="number" hide />
                          <YAxis 
                            type="category" 
                            dataKey="domain" 
                            axisLine={false}
                            tickLine={false}
                            tick={{ fontSize: 9, fill: '#64748B' }}
                            width={180}
                          />
                          <Tooltip 
                            cursor={{fill: '#F8FAFC'}}
                            contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)', fontSize: '12px' }}
                          />
                          <Bar dataKey="earned" stackId="a" fill="#22C55E" />
                          <Bar dataKey="failed" stackId="a" fill="#F87171" />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>

              </div>
            </>
          ) : activeTab === 'Dataset Mapping' ? (
            <div className="flex flex-col gap-8 animate-in fade-in duration-500">
              <div>
                <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight mb-2">Dataset Mapping</h2>
                <p className="text-[14px] text-slate-600 leading-relaxed max-w-3xl">
                  Each benchmark dataset is maintained in an AIChemist-Lab GitHub repository. Select a card to open the source code, CSVs, and evaluation scripts for that project.
                </p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                {DATASET_PROJECTS.map((project) => (
                  <a
                    key={project.id}
                    href={project.githubUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    data-testid={`dataset-card-${project.id}`}
                    className="group flex flex-col rounded-2xl border border-slate-200/80 bg-white shadow-sm hover:shadow-md hover:border-emerald-200 transition-all overflow-hidden focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2"
                  >
                    <div className="aspect-[16/10] bg-slate-50 border-b border-slate-100 overflow-hidden p-2">
                      <DatasetDiagram id={project.id} className="group-hover:scale-[1.01] transition-transform duration-300" />
                    </div>
                    <div className="flex flex-col flex-1 p-5">
                      <Badge
                        variant="outline"
                        className="w-fit mb-3 bg-violet-50 text-violet-700 border-violet-200 text-[10px] font-bold uppercase tracking-wide px-2.5 py-0.5"
                      >
                        {project.category}
                      </Badge>
                      <h3 className="text-base font-bold text-slate-900 leading-snug group-hover:text-emerald-700 transition-colors">
                        {project.title}
                      </h3>
                      <p className="text-[13px] text-slate-500 mt-2 leading-relaxed flex-1">
                        {project.description}
                      </p>
                      <div className="flex items-center justify-between mt-4 pt-4 border-t border-slate-100">
                        <span className="text-[11px] font-semibold text-slate-400">
                          {project.tasks} PharmDrugBench task{project.tasks === 1 ? "" : "s"}
                        </span>
                        <span className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-emerald-600 group-hover:underline">
                          <Github size={14} />
                          View on GitHub
                          <ExternalLink size={12} className="opacity-60" />
                        </span>
                      </div>
                    </div>
                  </a>
                ))}
              </div>
              <div className="rounded-2xl border border-slate-200/80 bg-slate-50/60 px-6 py-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                  <p className="text-sm font-semibold text-slate-800">All projects · AIChemist-Lab</p>
                  <p className="text-[13px] text-slate-500 mt-1">
                    MedMatch, LLM-DDI, LLM-Uncertainty-DDI, and Pokemon-Drugs-Names repos plus the Rx-Bench manuscript.
                  </p>
                </div>
                <Button variant="outline" className="border-emerald-200 text-emerald-700 hover:bg-emerald-50 shrink-0" asChild>
                  <a href="https://github.com/AIChemist-Lab" target="_blank" rel="noopener noreferrer">
                    <Github size={16} className="mr-2" />
                    Open organization
                  </a>
                </Button>
              </div>
            </div>
          ) : activeTab === 'Task Taxonomy' ? (
            <div className="flex flex-col gap-8 animate-in fade-in duration-500">
              <div>
                <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight mb-2">Task Taxonomy</h2>
                <p className="text-[14px] text-slate-600 leading-relaxed max-w-3xl">
                  Nineteen task definitions grouped by domain and primary paper. Public performance values are shown only where source tables are available; missing study values remain N/A.
                </p>
              </div>
              {TASK_TAXONOMY.map((group) => (
                <Card key={group.domain} className="shadow-sm border-slate-200/60 rounded-2xl bg-white">
                  <CardContent className="p-6">
                    <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 mb-5">
                      <div>
                        <h3 className="text-base font-bold text-slate-900">{group.domain}</h3>
                        <p className="text-[13px] text-slate-500 mt-1">{group.paper}</p>
                        <p className="text-[12px] text-slate-400 mt-0.5">{group.dataset}</p>
                      </div>
                      <div className="flex flex-col sm:items-end gap-2 shrink-0">
                        <a
                          href={group.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-[12px] font-semibold text-blue-600 hover:text-blue-700 whitespace-nowrap"
                        >
                          View paper →
                        </a>
                        <a
                          href={group.githubUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-[12px] font-semibold text-emerald-600 hover:text-emerald-700 whitespace-nowrap"
                        >
                          <Github size={13} />
                          GitHub →
                        </a>
                      </div>
                    </div>
                    <div className="grid gap-3">
                      {group.tasks.map((taskName) => {
                        const task = taskDefs.find((t) => t.name === taskName);
                        return (
                          <div
                            key={taskName}
                            className="rounded-xl border border-slate-200/80 bg-slate-50/50 px-4 py-3"
                          >
                            <p className="text-sm font-semibold text-slate-800">{taskName}</p>
                            {task ? (
                              <>
                                <p className="text-[12px] text-slate-600 mt-1.5 leading-relaxed line-clamp-2">
                                  {task.prompt}
                                </p>
                                <div className="flex flex-wrap gap-1.5 mt-2">
                                  {task.metrics.map((m) => (
                                    <Badge
                                      key={m}
                                      variant="outline"
                                      className="text-[10px] px-1.5 py-0 h-5 border-slate-200 bg-white text-slate-600"
                                    >
                                      {m}
                                    </Badge>
                                  ))}
                                </div>
                              </>
                            ) : (
                              <p className="text-[12px] text-slate-400 mt-1">Loading task definition…</p>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-[60vh] text-slate-400">
              <div className="w-16 h-16 rounded-2xl bg-slate-100 flex items-center justify-center mb-4 border border-slate-200 shadow-sm">
                <Settings size={28} className="text-slate-400" />
              </div>
              <h2 className="text-xl font-bold text-slate-700 mb-2" data-testid="text-section-title">{activeTab}</h2>
              <p className="text-sm">This section is currently under construction.</p>
              <Button 
                variant="outline" 
                className="mt-6 border-slate-200"
                data-testid="button-return-dashboard"
                onClick={() => setActiveTab('Dashboard')}
              >
                Return to Dashboard
              </Button>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
