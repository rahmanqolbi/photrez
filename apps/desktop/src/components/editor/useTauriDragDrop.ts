import { onMount, onCleanup } from "solid-js";
import { getCurrentWebview } from "@tauri-apps/api/webview";

export interface TauriDragDropCallbacks {
  onOver?: (position: { x: number; y: number }) => void;
  onDrop: (paths: string[], position: { x: number; y: number }) => void;
  onLeave?: () => void;
}

export function useTauriDragDrop(callbacks: TauriDragDropCallbacks) {
  let unlisten: (() => void) | null = null;

  onMount(async () => {
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
      console.error("useTauriDragDrop: failed to subscribe to Tauri drag-drop events:", err);
    }
  });

  onCleanup(() => {
    if (unlisten) unlisten();
  });
}
