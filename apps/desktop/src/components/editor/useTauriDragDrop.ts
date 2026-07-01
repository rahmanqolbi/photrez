import { onMount, onCleanup } from "solid-js";
import { getCurrentWebview } from "@tauri-apps/api/webview";
import { isTauriRuntime } from "../../lib/desktop";
import { showToast } from "./Toast";

export interface TauriDragDropCallbacks {
  onOver?: (position: { x: number; y: number }) => void;
  onDrop: (paths: string[], position: { x: number; y: number }) => void;
  onLeave?: () => void;
}

export function useTauriDragDrop(callbacks: TauriDragDropCallbacks) {
  let unlisten: (() => void) | null = null;

  onMount(async () => {
    if (!isTauriRuntime() && import.meta.env.MODE !== "test") return;

    try {
      const webview = getCurrentWebview();
      unlisten = await webview.onDragDropEvent((event) => {
        const payload = event.payload;
        if (payload.type === "over") {
          callbacks.onOver?.(payload.position);
        } else if (payload.type === "drop") {
          callbacks.onDrop(payload.paths, payload.position);
        } else {
          callbacks.onLeave?.();
        }
      });
    } catch (err) {
      showToast(`File drag-drop failed to initialize: ${err instanceof Error ? err.message : "unknown error"}`, "error");
    }
  });

  onCleanup(() => {
    if (unlisten) unlisten();
  });
}
