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
  | {
      type: "layers-panel";
      // ponytail: insertion-position hint for in-panel layer reorder.
      // `insertAt` is the layer index in the panel's current stack where
      // the dropped layer should land. `insertPosition` distinguishes
      // "before" (drop above the row) vs "after" (drop below). When
      // absent the drop handler falls back to "move to end".
      insertAt?: number;
      insertPosition?: "above" | "below";
    }
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
