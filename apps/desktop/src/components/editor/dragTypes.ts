export const LAYER_DRAG_MIME = "application/x-photrez-layer";

export interface LayerDragPayload {
  version: 1;
  sourceDocId: string;
  layerId: string;
  sourceName: string;
  isAltPressed: boolean;
}

export type DropTarget =
  | { type: "tab"; docId: string }
  | { type: "tab-empty" }
  | { type: "tab-plus" }
  | { type: "canvas" }
  | { type: "layers-panel" }
  | { type: "outside" }
  | null;

export function isLayerDragPayload(value: unknown): value is LayerDragPayload {
  if (typeof value !== "object" || value === null) return false;
  const v = value as Record<string, unknown>;
  return (
    v.version === 1 &&
    typeof v.sourceDocId === "string" &&
    typeof v.layerId === "string" &&
    typeof v.sourceName === "string" &&
    typeof v.isAltPressed === "boolean"
  );
}
