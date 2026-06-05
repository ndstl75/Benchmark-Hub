import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useLeaderboard, useModels } from "@/hooks/useBenchmark";

const TABS = ["Accuracy", "Efficiency", "General information"] as const;

function LeaderboardTable({ tab }: { tab: string }) {
  const { data: scores = [], isLoading } = useLeaderboard(tab);
  const { data: models = [] } = useModels();

  const modelNames = models.map((m) => m.name);
  const metrics = Array.from(new Set(scores.map((s) => s.metricName)));

  if (isLoading) return <p className="text-sm text-muted-foreground p-4">Loading…</p>;
  if (!metrics.length) return <p className="text-sm text-muted-foreground p-4">No leaderboard data.</p>;

  const valueMap = new Map<string, string>();
  for (const s of scores) {
    const m = models.find((x) => x.id === s.modelId);
    if (m) valueMap.set(`${s.metricName}:${m.name}`, s.value);
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead className="sticky left-0 bg-background">Metric</TableHead>
          {modelNames.map((name) => (
            <TableHead key={name} className="text-center min-w-[100px]">
              {name}
            </TableHead>
          ))}
        </TableRow>
      </TableHeader>
      <TableBody>
        {metrics.map((metric) => (
          <TableRow key={metric}>
            <TableCell className="font-medium sticky left-0 bg-background">{metric}</TableCell>
            {modelNames.map((name) => (
              <TableCell key={name} className="text-center tabular-nums">
                {valueMap.get(`${metric}:${name}`) ?? "—"}
              </TableCell>
            ))}
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

export function LeaderboardPanel() {
  return (
    <Card className="physicianbench-page">
      <CardHeader>
        <CardTitle>Public leaderboard</CardTitle>
        <CardDescription>Transposed view — metrics as rows, models as columns</CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue={TABS[0]}>
          <TabsList>
            {TABS.map((t) => (
              <TabsTrigger key={t} value={t}>
                {t}
              </TabsTrigger>
            ))}
          </TabsList>
          {TABS.map((t) => (
            <TabsContent key={t} value={t} className="overflow-x-auto mt-4">
              <LeaderboardTable tab={t} />
            </TabsContent>
          ))}
        </Tabs>
      </CardContent>
    </Card>
  );
}
