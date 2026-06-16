import { createSignal, For, Show, onMount, onCleanup } from "solid-js";
import { Portal } from "solid-js/web";

export type ToastSeverity = "info" | "warn" | "error";

interface ToastItem {
  id: number;
  message: string;
  severity: ToastSeverity;
}

const [toasts, setToasts] = createSignal<ToastItem[]>([]);
let nextId = 1;
let dismissTimers = new Map<number, ReturnType<typeof setTimeout>>();

const DURATIONS: Record<ToastSeverity, number> = {
  info: 3500,
  warn: 3500,
  error: 5000,
};

export function showToast(message: string, severity: ToastSeverity = "info") {
  const id = nextId++;
  setToasts((prev) => {
    const next = [...prev, { id, message, severity }];
    return next.length > 3 ? next.slice(-3) : next;
  });
  const timer = setTimeout(() => dismissToast(id), DURATIONS[severity]);
  dismissTimers.set(id, timer);
}

function dismissToast(id: number) {
  const timer = dismissTimers.get(id);
  if (timer !== undefined) {
    clearTimeout(timer);
    dismissTimers.delete(id);
  }
  setToasts((prev) => prev.filter((t) => t.id !== id));
}

export function resetToasts() {
  for (const timer of dismissTimers.values()) {
    clearTimeout(timer);
  }
  dismissTimers.clear();
  setToasts([]);
  nextId = 1;
}

export function ToastHost() {
  return (
    <Portal>
      <div
        class="pointer-events-none fixed top-6 right-6 z-50 flex flex-col gap-2"
        aria-live="polite"
      >
        <For each={toasts()}>
          {(t) => (
            <div
              role={t.severity === "error" ? "alert" : "status"}
              class={`
                pointer-events-auto rounded border px-4 py-2 text-[12.5px] shadow-lg
                ${t.severity === "error" ? "border-editor-accent bg-editor-panel text-editor-text" : ""}
                ${t.severity === "warn" ? "border-yellow-500 bg-editor-panel text-editor-text" : ""}
                ${t.severity === "info" ? "border-editor-divider bg-editor-panel text-editor-text" : ""}
              `}
            >
              {t.message}
            </div>
          )}
        </For>
      </div>
    </Portal>
  );
}
