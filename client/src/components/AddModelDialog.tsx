import { useState } from "react";
import { Plus } from "@/components/icons";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useCreateModel } from "@/hooks/useBenchmark";
import { toast } from "@/hooks/use-toast";

export function AddModelDialog() {
  const [open, setOpen] = useState(false);
  const createModel = useCreateModel();
  const [form, setForm] = useState({
    name: "",
    type: "API",
    provider: "",
    access: "Cloud",
    winRate: 0.5,
    costPer1mTokens: "N/A",
    latency: "—",
    dockerImage: "",
  });

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    try {
      await createModel.mutateAsync({
        name: form.name,
        type: form.type,
        provider: form.provider,
        access: form.access,
        winRate: Number(form.winRate),
        costPer1mTokens: form.costPer1mTokens,
        latency: form.latency,
        isCustom: true,
        dockerImage: form.dockerImage || null,
      });
      toast({ title: "Model added", description: form.name });
      setOpen(false);
      setForm({ name: "", type: "API", provider: "", access: "Cloud", winRate: 0.5, costPer1mTokens: "N/A", latency: "—", dockerImage: "" });
    } catch (err) {
      toast({ title: "Failed to add model", description: String(err), variant: "destructive" });
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline">
          <Plus className="h-4 w-4 mr-1" />
          Add model
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add custom model</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="grid gap-3">
          <div>
            <Label htmlFor="name">Name</Label>
            <Input id="name" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </div>
          <div>
            <Label htmlFor="provider">Provider</Label>
            <Input id="provider" required value={form.provider} onChange={(e) => setForm({ ...form, provider: e.target.value })} />
          </div>
          <div>
            <Label htmlFor="docker">Docker image (optional)</Label>
            <Input id="docker" placeholder="my-agent:latest" value={form.dockerImage} onChange={(e) => setForm({ ...form, dockerImage: e.target.value })} />
          </div>
          <DialogFooter>
            <Button type="submit" disabled={createModel.isPending}>
              {createModel.isPending ? "Saving…" : "Save"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
