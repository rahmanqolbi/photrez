import { getCurrentWindow } from "@tauri-apps/api/window";

type TauriWindowAction =
  | "minimize"
  | "toggleMaximize"
  | "close"
  | "startDragging";

declare global {
  interface Window {
    __TAURI_INTERNALS__?: unknown;
  }
}

export function isTauriRuntime() {
  return typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;
}

export async function runTauriWindowAction(action: TauriWindowAction) {
  if (!isTauriRuntime()) return;

  try {
    await getCurrentWindow()[action]();
  } catch (error) {
    console.warn(`Failed to run Tauri window action: ${action}`, error);
  }
}
