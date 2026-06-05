import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { isStaticDeploy } from "@/lib/deployMode";
import { useCreateEvaluator, useDeleteEvaluator, useEvaluators } from "@/hooks/useBenchmark";
import { useState } from "react";
import { Download, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "@/hooks/use-toast";

export function AgentDoctorPanel() {
  if (isStaticDeploy) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Agent Doctor (green evaluator)</CardTitle>
          <CardDescription>
            Configuring evaluators and exporting Docker scenarios requires the self-hosted stack.
          </CardDescription>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground space-y-2">
          <p>
            The GitHub Pages demo is read-only. To add evaluators, set env vars, and export{" "}
            <code className="text-xs bg-muted px-1 rounded">scenario.toml</code>, run locally with Docker:
          </p>
          <pre className="rounded-md bg-muted p-3 text-xs overflow-x-auto">
            {`docker compose up --build -d\n# open http://localhost:7693`}
          </pre>
        </CardContent>
      </Card>
    );
  }

  return <AgentDoctorEditor />;
}

function AgentDoctorEditor() {
  const { data: evaluators = [], isLoading } = useEvaluators();
  const createEvaluator = useCreateEvaluator();
  const deleteEvaluator = useDeleteEvaluator();
  const [name, setName] = useState("");
  const [dockerImage, setDockerImage] = useState("");
  const [envKey, setEnvKey] = useState("");
  const [envValue, setEnvValue] = useState("");

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    const env: Record<string, string> = {};
    if (envKey.trim()) env[envKey.trim()] = envValue;
    try {
      await createEvaluator.mutateAsync({
        name,
        dockerImage: dockerImage || null,
        agentbeatsId: null,
        env,
      });
      toast({ title: "Agent Doctor saved" });
      setName("");
      setDockerImage("");
      setEnvKey("");
      setEnvValue("");
    } catch (err) {
      toast({ title: "Error", description: String(err), variant: "destructive" });
    }
  }

  function exportScenario(evaluatorId?: number) {
    const q = evaluatorId != null ? `?evaluatorId=${evaluatorId}` : "";
    window.open(`/api/evaluators/export-scenario${q}`, "_blank");
    toast({
      title: "Export started",
      description: "scenario.toml may contain secrets from evaluator env vars.",
    });
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Agent Doctor (green evaluator)</CardTitle>
          <CardDescription>
            Configure the evaluator agent for Docker or AgentBeats. Env values are masked in the API; exports include real values.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleAdd} className="grid gap-3 max-w-md">
            <div>
              <Label htmlFor="ev-name">Name</Label>
              <Input id="ev-name" required value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div>
              <Label htmlFor="ev-docker">Docker image</Label>
              <Input id="ev-docker" value={dockerImage} onChange={(e) => setDockerImage(e.target.value)} placeholder="evaluator:latest" />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label htmlFor="ev-key">Env key</Label>
                <Input id="ev-key" value={envKey} onChange={(e) => setEnvKey(e.target.value)} placeholder="LOG_LEVEL" />
              </div>
              <div>
                <Label htmlFor="ev-val">Env value</Label>
                <Input id="ev-val" value={envValue} onChange={(e) => setEnvValue(e.target.value)} type="password" autoComplete="off" />
              </div>
            </div>
            <Button type="submit" disabled={createEvaluator.isPending}>
              Add evaluator
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Saved evaluators</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {isLoading && <p className="text-sm text-muted-foreground">Loading…</p>}
          {evaluators.map((ev) => (
            <div key={ev.id} className="flex items-start justify-between gap-4 rounded-md border p-3">
              <div>
                <p className="font-medium">{ev.name}</p>
                <p className="text-xs text-muted-foreground">{ev.dockerImage ?? ev.agentbeatsId ?? "No image"}</p>
                {ev.env && Object.keys(ev.env).length > 0 && (
                  <p className="text-xs mt-1 font-mono">
                    {Object.entries(ev.env).map(([k, v]) => `${k}=${v}`).join(", ")}
                  </p>
                )}
              </div>
              <div className="flex gap-2 shrink-0">
                <Button size="sm" variant="outline" onClick={() => exportScenario(ev.id)}>
                  <Download className="h-4 w-4" />
                </Button>
                <Button
                  size="sm"
                  variant="destructive"
                  onClick={() => deleteEvaluator.mutate(ev.id)}
                  disabled={deleteEvaluator.isPending}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}
          {!isLoading && evaluators.length === 0 && (
            <p className="text-sm text-muted-foreground">No evaluators yet.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
