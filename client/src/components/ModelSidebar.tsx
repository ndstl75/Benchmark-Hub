import { cn } from "@/lib/utils";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import type { Model } from "@/hooks/useBenchmark";

type Props = {
  models: Model[];
  selectedId: number | null;
  onSelect: (id: number) => void;
};

export function ModelSidebar({ models, selectedId, onSelect }: Props) {
  return (
    <aside className="flex w-64 shrink-0 flex-col border-r bg-card">
      <div className="border-b p-4">
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Models</h2>
      </div>
      <ScrollArea className="flex-1">
        <ul className="p-2 space-y-1">
          {models.map((m) => (
            <li key={m.id}>
              <button
                type="button"
                onClick={() => onSelect(m.id)}
                className={cn(
                  "w-full rounded-md px-3 py-2 text-left text-sm transition-colors hover:bg-muted",
                  selectedId === m.id && "bg-primary/10 ring-1 ring-primary",
                )}
              >
                <div className="font-medium truncate">{m.name}</div>
                <div className="mt-1 flex gap-1 flex-wrap">
                  <Badge variant="outline" className="text-[10px] px-1 py-0">
                    {m.provider}
                  </Badge>
                  {m.isCustom && (
                    <Badge variant="secondary" className="text-[10px] px-1 py-0">
                      custom
                    </Badge>
                  )}
                </div>
              </button>
            </li>
          ))}
        </ul>
      </ScrollArea>
    </aside>
  );
}
