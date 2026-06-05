import { useToast } from "@/hooks/use-toast";
import { Toast, ToastDescription, ToastTitle } from "@/components/ui/toast";
import { cn } from "@/lib/utils";

export function Toaster() {
  const { toasts } = useToast();
  return (
    <div className="fixed bottom-4 right-4 z-[100] flex max-h-screen w-full max-w-[420px] flex-col gap-2">
      {toasts
        .filter((t) => t.open)
        .map((t) => (
          <Toast
            key={t.id}
            className={cn(t.variant === "destructive" && "border-destructive bg-destructive text-destructive-foreground")}
          >
            <div className="grid gap-1">
              {t.title && <ToastTitle>{t.title}</ToastTitle>}
              {t.description && <ToastDescription>{t.description}</ToastDescription>}
            </div>
          </Toast>
        ))}
    </div>
  );
}
