import { useDragController } from "./DragController";

/**
 * Temporary debug overlay. Shows the live dragController state in the top-left
 * corner so we can diagnose why visual feedback isn't reaching the tab during
 * cross-doc drag. Remove this once the feature is confirmed working in real app.
 */
export function DragDebug() {
  const drag = useDragController();
  return (
    <div
      data-drag-debug
      style={{
        position: "fixed",
        top: "50px",
        left: "10px",
        "z-index": "9999",
        background: "rgba(0,0,0,0.85)",
        color: "#fff",
        padding: "8px 10px",
        "font-size": "11px",
        "font-family": "ui-monospace, monospace",
        "pointer-events": "none",
        "border-radius": "4px",
        "min-width": "180px",
      }}
    >
      <div>dragKind: <b>{String(drag.state().dragKind)}</b></div>
      <div>dropTarget: <b>{drag.state().dropTarget ? drag.state().dropTarget!.type : "null"}</b></div>
      <div>hoverTabId: <b>{String(drag.state().hoverTabId)}</b></div>
      <div>payload: <b>{drag.state().payload?.sourceName ?? "—"}</b></div>
    </div>
  );
}
