import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { BenchmarkResult, Model } from "@/hooks/useBenchmark";

type Props = {
  model: Model | undefined;
  results: BenchmarkResult[] | undefined;
  isLoading: boolean;
};

export function DashboardPanel({ model, results, isLoading }: Props) {
  if (!model) {
    return (
      <Card>
        <CardContent className="py-12 text-center text-muted-foreground">
          Select a model from the sidebar to view per-task performance.
        </CardContent>
      </Card>
    );
  }

  const chartData = (results ?? []).map((r) => ({
    task: r.taskName.length > 28 ? `${r.taskName.slice(0, 26)}…` : r.taskName,
    earned: r.earned,
    failed: r.failed,
    fullName: r.taskName,
  }));

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>{model.name}</CardTitle>
          <CardDescription>
            {model.provider} · {model.access} · Win rate {(model.winRate * 100).toFixed(0)}% · {model.latency}
          </CardDescription>
        </CardHeader>
      </Card>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="rounded-lg border border-primary/30 bg-primary/5 p-4">
          <p className="text-xs font-medium text-primary mb-1">Green evaluator agent</p>
          <p className="text-sm">Runs pharmacy benchmark tasks and scores target model responses.</p>
        </div>
        <div className="rounded-lg border border-secondary/30 bg-secondary/5 p-4">
          <p className="text-xs font-medium text-secondary mb-1">Purple target agent</p>
          <p className="text-sm">Model under test — {model.dockerImage ? `Docker: ${model.dockerImage}` : "API or hosted endpoint"}.</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Per-task pass / fail</CardTitle>
          <CardDescription>Earned vs failed scores by PhamDrugBench task</CardDescription>
        </CardHeader>
        <CardContent className="h-[360px]">
          {isLoading ? (
            <p className="text-muted-foreground text-sm">Loading results…</p>
          ) : chartData.length === 0 ? (
            <p className="text-muted-foreground text-sm">No benchmark results for this model.</p>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 8, right: 8, left: 0, bottom: 64 }}>
                <XAxis dataKey="task" angle={-45} textAnchor="end" height={80} interval={0} tick={{ fontSize: 10 }} />
                <YAxis domain={[0, 1]} tickFormatter={(v) => `${(v * 100).toFixed(0)}%`} />
                <Tooltip
                  formatter={(value: number) => `${(value * 100).toFixed(1)}%`}
                  labelFormatter={(_, payload) => payload?.[0]?.payload?.fullName ?? ""}
                />
                <Legend />
                <Bar dataKey="earned" name="Earned" stackId="a" fill="hsl(160 84% 39%)" />
                <Bar dataKey="failed" name="Failed" stackId="a" fill="hsl(271 91% 65%)" />
              </BarChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
