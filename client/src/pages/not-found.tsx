import { Link } from "wouter";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-4 p-8">
      <h1 className="text-2xl font-semibold">404</h1>
      <p className="text-muted-foreground">Page not found</p>
      <Link href="/">
        <Button>Back to PhamDrugBench</Button>
      </Link>
    </div>
  );
}
