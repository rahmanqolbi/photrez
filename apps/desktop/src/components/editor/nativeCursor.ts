// nativeCursor.ts — Tauri native cursor API for canvas pointer-drag.
//
// CSS `cursor: copy` shows a browser-synthesized plus at top-right, but
// Tauri's setCursorIcon('copy') maps to the OS-native OCR_COPY cursor
// (arrow + dashed document box + folded corner + plus at bottom-right) —
// the SAME cursor shown during HTML5 drag-drop with dropEffect="copy".
//
// This module is extracted from DragController.tsx because importing
// @tauri-apps/api at module level triggers SolidJS SSR guards in bun's
// test runner. By isolating the import here in a separate module, we
// keep DragController.tsx clean and avoid test interference.

import { getCurrentWebviewWindow } from "@tauri-apps/api/webviewWindow";

// Tauri 2 exposes the IPC bridge via window.__TAURI_INTERNALS__.
// This synchronous check avoids calling getCurrentWebviewWindow() (which
// can throw) until we know the runtime is available.
function isTauriRuntime(): boolean {
  return typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;
}

/** Set the webview-level cursor to a native OS icon via Tauri.
 *  For `"copy"` this should show the true drag-drop copy cursor
 *  (arrow + dashed box + plus at bottom-right) — the SAME one the
 *  HTML5 drag system shows — instead of the browser-synthesized
 *  CSS `cursor: copy` (arrow + plain plus at top-right).
 *  Call with `null` to restore the platform default.
 *  No-op outside Tauri runtime.
 *
 *  Uses getCurrentWebviewWindow() (not getCurrentWindow()) because
 *  in Tauri 2 the webview window handle may route cursor commands
 *  differently than the plain window handle. */
export function setDragNativeCursor(effect: "copy" | "move" | null): void {
  if (!isTauriRuntime()) return;
  getCurrentWebviewWindow().setCursorIcon(effect ?? "default").catch(() => {});
}

/** True when we're running in Tauri and the native cursor API is
 *  available. Used by canvas cursor effects to decide between
 *  native OS cursor (Tauri) vs CSS cursor fallback. */
export function isTauriAvailable(): boolean {
  return isTauriRuntime();
}
