import * as React from "react";

type ToastProps = {
  title?: string;
  description?: string;
  variant?: "default" | "destructive";
};

type ToastState = ToastProps & { id: string; open: boolean };

const listeners: Array<(toasts: ToastState[]) => void> = [];
let memoryToasts: ToastState[] = [];

function emit() {
  listeners.forEach((l) => l(memoryToasts));
}

export function toast(props: ToastProps) {
  const id = String(Date.now());
  memoryToasts = [{ ...props, id, open: true }, ...memoryToasts].slice(0, 5);
  emit();
  setTimeout(() => {
    memoryToasts = memoryToasts.map((t) => (t.id === id ? { ...t, open: false } : t));
    emit();
  }, 4000);
}

export function useToast() {
  const [toasts, setToasts] = React.useState<ToastState[]>(memoryToasts);
  React.useEffect(() => {
    listeners.push(setToasts);
    return () => {
      const i = listeners.indexOf(setToasts);
      if (i >= 0) listeners.splice(i, 1);
    };
  }, []);
  return { toasts, toast };
}
