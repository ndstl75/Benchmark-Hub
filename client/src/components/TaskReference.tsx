import { useState } from "react";
import { ChevronDown, ChevronRight } from "@/components/icons";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useTasks } from "@/hooks/useBenchmark";

export function TaskReference() {
  const { data: tasks = [], isLoading } = useTasks();
  const [openId, setOpenId] = useState<number | null>(null);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Task definitions ({tasks.length})</CardTitle>
        <CardDescription>PhamDrugBench pharmacy evaluation tasks</CardDescription>
      </CardHeader>
      <CardContent className="space-y-2">
        {isLoading && <p className="text-sm text-muted-foreground">Loading…</p>}
        {tasks.map((t) => {
          const open = openId === t.id;
          return (
            <div key={t.id} className="rounded-md border">
              <button
                type="button"
                className="flex w-full items-center gap-2 p-3 text-left text-sm font-medium hover:bg-muted/50"
                onClick={() => setOpenId(open ? null : t.id)}
              >
                {open ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                {t.name}
              </button>
              {open && (
                <div className="border-t px-3 pb-3 pt-2 text-sm space-y-2 text-muted-foreground">
                  <p><span className="font-medium text-foreground">Prompt:</span> {t.prompt}</p>
                  <p><span className="font-medium text-foreground">Response:</span> {t.response}</p>
                  <div className="flex flex-wrap gap-1">
                    {t.metrics.map((m) => (
                      <Badge key={m} variant="outline">
                        {m}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
