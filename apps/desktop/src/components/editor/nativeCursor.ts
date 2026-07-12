// nativeCursor.ts — Tauri native cursor API for canvas pointer-drag.
//
// CSS `cursor: copy` shows a browser-synthesized plus at top-right, but
// the custom Rust command `set_native_cursor` uses Win32 SetCursor with
// the OCR_COPY system cursor (arrow + dashed document box + folded corner
// + plus at bottom-right) — the SAME cursor shown during HTML5 drag-drop
// with dropEffect="copy".
//
// This module is extracted from DragController.tsx because importing
// @tauri-apps/api at module level triggers SolidJS SSR guards in bun's
// test runner. By isolating the import here in a separate module, we
// keep DragController.tsx clean and avoid test interference.

import { invoke } from "@tauri-apps/api/core";

// Tauri 2 exposes the IPC bridge via window.__TAURI_INTERNALS__.
// This synchronous check avoids calling invoke() (which
// can throw) until we know the runtime is available.
function isTauriRuntime(): boolean {
  return typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;
}

/** Set the webview-level cursor to a native OS icon via the custom
 *  Rust `set_native_cursor` command.
 *  For `"copy"` this shows the true drag-drop copy cursor
 *  (arrow + dashed box + plus at bottom-right) instead of the
 *  browser-synthesized CSS `cursor: copy` (arrow + plain plus).
 *  Call with `null` to restore the default.
 *  No-op outside Tauri runtime. */
export function setDragNativeCursor(effect: "copy" | "move" | null): void {
  if (!isTauriRuntime()) return;
  invoke("set_native_cursor", { icon: effect ?? "default" }).catch(() => {});
}

/** True when we're running in Tauri and the native cursor API is
 *  available. Used by canvas cursor effects to decide between
 *  native OS cursor (Tauri) vs CSS cursor fallback. */
export function isTauriAvailable(): boolean {
  return isTauriRuntime();
}
