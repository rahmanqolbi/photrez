import type { LayerDragPayload, DropTarget } from "./dragTypes";
import { showToast } from "./Toast";
import { MAX_LAYERS } from "@/engine/types";

export const CASCADE_OFFSET_PX = 24;

export interface Point {
  x: number;
  y: number;
}

export interface EngineFacade {
  id: string;
  width: number;
  height: number;
  getLayer(id: string): any | null;
  getLayers(): readonly any[];
  addLayer(layer: any): any;
  moveLayer(id: string, x: number, y: number): void;
  deleteLayer(id: string): void;
  snapshot(): unknown;
}

export interface HistoryFacade {
  commit(snapshot: unknown): void;
}

export interface WorkspaceFacade {
  getEngine(docId: string): EngineFacade | null;
  getHistory(docId: string): HistoryFacade | null;
  getActiveDocumentId(): string | null;
  isFull(): boolean;
}

export function computeCascadePosition(base: Point, index: number): Point {
  return {
    x: base.x + index * CASCADE_OFFSET_PX,
    y: base.y + index * CASCADE_OFFSET_PX,
  };
}

function resolveTargetDocId(target: DropTarget, ws: WorkspaceFacade): string | null {
  if (target && target.type === "tab" && target.docId) return target.docId;
  return ws.getActiveDocumentId();
}

export function addLayerFromCrossDoc(
  payload: LayerDragPayload,
  target: DropTarget,
  cursorPos: Point,
  ws: WorkspaceFacade
): void {
  const targetDocId = resolveTargetDocId(target, ws);
  if (!targetDocId) return;

  if (payload.sourceDocId === targetDocId) return;

  const sourceEngine = ws.getEngine(payload.sourceDocId);
  if (!sourceEngine) {
    showToast("Source document was closed. Drop cancelled.", "error");
    return;
  }
  const sourceLayer = sourceEngine.getLayer(payload.layerId);
  if (!sourceLayer) {
    showToast("Layer was deleted. Drop cancelled.", "error");
    return;
  }

  const targetEngine = ws.getEngine(targetDocId);
  if (!targetEngine) return;
  if (targetEngine.getLayers().length >= MAX_LAYERS) {
    showToast("Target document reached max 100 layers", "error");
    return;
  }

  const targetPos: Point = target && target.type === "canvas"
    ? cursorPos
    : {
        x: Math.max(0, (targetEngine.width - sourceLayer.width) / 2),
        y: Math.max(0, (targetEngine.height - sourceLayer.height) / 2),
      };

  const cloned = {
    ...sourceLayer,
    id: `layer-${crypto.randomUUID()}`,
    transform: { ...sourceLayer.transform, x: targetPos.x, y: targetPos.y },
  };

  const targetHistory = ws.getHistory(targetDocId);
  if (targetHistory) targetHistory.commit(targetEngine.snapshot());

  // Real engine API: addLayer(name, width?, height?) returns LayerNode,
  // then moveLayer(id, x, y) to set position. The mock in unit tests
  // accepts any args so both work.
  const added = targetEngine.addLayer(sourceLayer.name ?? "Imported");
  const newId = (added as any)?.id;
  if (newId && typeof targetEngine.moveLayer === "function") {
    targetEngine.moveLayer(newId, targetPos.x, targetPos.y);
  }

  if (payload.isAltPressed) {
    const sourceHistory = ws.getHistory(payload.sourceDocId);
    if (sourceHistory) sourceHistory.commit(sourceEngine.snapshot());
    sourceEngine.deleteLayer(payload.layerId);
  }
}

export function addFilesAsLayers(
  paths: string[],
  target: DropTarget,
  basePos: Point,
  ws: WorkspaceFacade
): void {
  const targetDocId = target && target.type === "tab" && target.docId
    ? target.docId
    : ws.getActiveDocumentId();
  if (!targetDocId) return;
  const targetEngine = ws.getEngine(targetDocId);
  if (!targetEngine) return;
  if (targetEngine.getLayers().length + paths.length > MAX_LAYERS) {
    showToast(`Adding ${paths.length} files would exceed max 100 layers`, "error");
    return;
  }

  const targetHistory = ws.getHistory(targetDocId);
  if (targetHistory) targetHistory.commit(targetEngine.snapshot());

  paths.forEach((path, i) => {
    const pos = computeCascadePosition(basePos, i);
    const name = path.split(/[\\/]/).pop() ?? "Imported";
    // Real engine API: addLayer(name, width?, height?) returns LayerNode,
    // then moveLayer(id, x, y) to set position. The mock in tests accepts
    // any args so both work.
    const added = targetEngine.addLayer(name);
    const newId = (added as any)?.id;
    if (newId && typeof targetEngine.moveLayer === "function") {
      targetEngine.moveLayer(newId, pos.x, pos.y);
    }
  });
}

export function createNewDocsFromFiles(
  paths: string[],
  ws: WorkspaceFacade
): void {
  if (ws.isFull()) {
    showToast("Workspace full — close a document first (max 16)", "error");
    return;
  }
  // Dispatcher only — UI layer is responsible for the actual
  // Tauri file read + workspace.addDocument() call per path.
}
