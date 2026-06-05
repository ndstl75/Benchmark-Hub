import { useState, useEffect } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ModelSidebar } from "@/components/ModelSidebar";
import { DashboardPanel } from "@/components/DashboardPanel";
import { LeaderboardPanel } from "@/components/LeaderboardPanel";
import { AddModelDialog } from "@/components/AddModelDialog";
import { AgentDoctorPanel } from "@/components/AgentDoctorPanel";
import { TaskReference } from "@/components/TaskReference";
import { useModels, useBenchmarkResults } from "@/hooks/useBenchmark";
import { assetUrl } from "@/lib/assetUrl";
import { isStaticDeploy } from "@/lib/deployMode";

export default function Home() {
  const { data: models = [] } = useModels();
  const [selectedId, setSelectedId] = useState<number | null>(null);

  useEffect(() => {
    if (models.length && selectedId == null) {
      setSelectedId(models[0].id);
    }
  }, [models, selectedId]);

  const selectedModel = models.find((m) => m.id === selectedId);
  const { data: results, isLoading } = useBenchmarkResults(selectedId);

  return (
    <div className="flex h-full min-h-0 flex-col">
      {isStaticDeploy && (
        <div className="bg-muted border-b px-6 py-2 text-center text-sm text-muted-foreground">
          Read-only demo on GitHub Pages — use Docker for full Agent Doctor and API features.
        </div>
      )}
      <header className="flex items-center justify-between border-b bg-card px-6 py-3 shrink-0">
        <div className="flex items-center gap-3">
          <img src={assetUrl("logo.png")} alt="PhamDrugBench" className="h-8 w-auto" />
          <div>
            <h1 className="text-lg font-semibold">PhamDrugBench</h1>
            <p className="text-xs text-muted-foreground">Pharmacy AI agent benchmarking</p>
          </div>
        </div>
        {!isStaticDeploy && <AddModelDialog />}
      </header>

      <div className="flex flex-1 min-h-0 overflow-hidden">
        <ModelSidebar models={models} selectedId={selectedId} onSelect={setSelectedId} />

        <main className="flex-1 overflow-auto p-6">
          <Tabs defaultValue="dashboard" className="space-y-4">
            <TabsList>
              <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
              <TabsTrigger value="leaderboard">Leaderboard</TabsTrigger>
              <TabsTrigger value="agent-doctor">Agent Doctor</TabsTrigger>
              <TabsTrigger value="tasks">Tasks</TabsTrigger>
            </TabsList>

            <TabsContent value="dashboard">
              <DashboardPanel model={selectedModel} results={results} isLoading={isLoading} />
            </TabsContent>
            <TabsContent value="leaderboard">
              <LeaderboardPanel />
            </TabsContent>
            <TabsContent value="agent-doctor">
              <AgentDoctorPanel />
            </TabsContent>
            <TabsContent value="tasks">
              <TaskReference />
            </TabsContent>
          </Tabs>
        </main>
      </div>
    </div>
  );
}
