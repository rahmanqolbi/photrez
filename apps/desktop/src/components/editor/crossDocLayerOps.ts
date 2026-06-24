import type { LayerDragPayload, DropTarget } from "./dragTypes";
import { showToast } from "./Toast";
import type { BlendMode, DocumentModel, LayerNode, Transform2D } from "@/engine/types";
import { MAX_LAYERS } from "@/engine/types";
import { readFileBytes } from "@/tauri/native";
import { WorkspaceManager, type DocumentSession } from "@/engine/workspace";

export const CASCADE_OFFSET_PX = 24;

export interface Point {
  x: number;
  y: number;
}

export interface EngineFacade {
  getWidth(): number;
  getHeight(): number;
  getLayer(id: string): LayerNode | undefined;
  getLayers(): readonly LayerNode[];
  addLayer(name: string, width?: number, height?: number): LayerNode;
  moveLayer(id: string, x: number, y: number): void;
  transformLayer(id: string, transform: Partial<Transform2D>): void;
  setLayerOpacity(id: string, opacity: number): void;
  setLayerBlendMode(id: string, mode: BlendMode): void;
  setLayerVisibility(id: string, visible: boolean): void;
  setLayerLocked(id: string, locked: boolean): void;
  setLayerImageBitmap(id: string, bitmap: ImageBitmap): void;
  reorderLayer(fromIndex: number, toIndex: number): void;
  deleteLayer(id: string): void;
  snapshot(): DocumentModel;
}

export interface HistoryFacade {
  commit(snapshot: DocumentModel, label?: string): void;
}

export interface WorkspaceFacade {
  getEngine(docId: string): EngineFacade | null;
  getHistory(docId: string): HistoryFacade | null;
  getActiveDocumentId(): string | null;
  isFull(): boolean;
  addDocument(session: DocumentSession): void;
}

export interface CreatedLayer {
  docId: string;
  layerId: string;
  bitmap: ImageBitmap;
}

export interface CreatedDoc {
  docId: string;
  backgroundLayerId: string;
  bitmap: ImageBitmap;
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

async function fileToBitmap(path: string): Promise<ImageBitmap> {
  const bytes = await readFileBytes(path);
  const blobBytes = new ArrayBuffer(bytes.byteLength);
  new Uint8Array(blobBytes).set(bytes);
  return await createImageBitmap(new Blob([blobBytes]));
}

export function addLayerFromCrossDoc(
  payload: LayerDragPayload,
  target: DropTarget,
  cursorPos: Point,
  ws: WorkspaceFacade
): { newLayerId: string | null } {
  const targetDocId = resolveTargetDocId(target, ws);
  if (!targetDocId) return { newLayerId: null };

  const sourceEngine = ws.getEngine(payload.sourceDocId);
  if (!sourceEngine) {
    showToast("Source document was closed. Drop cancelled.", "error");
    return { newLayerId: null };
  }

  // ponytail: same-doc drop means the user is reordering within their
  // own layer panel. The pointer-based system (useLayerDragReorder)
  // handles fine-grained insertion position; HTML5 drag cannot track
  // that position because the dragController DropTarget type has no
  // index field. Fall back to "move source to end of its own stack"
  // so the drop is never silently lost.
  if (payload.sourceDocId === targetDocId) {
    const sourceIdx = sourceEngine.getLayers().findIndex((l) => l.id === payload.layerId);
    if (sourceIdx < 0) return { newLayerId: null };
    const sourceHistory = ws.getHistory(payload.sourceDocId);
    if (sourceHistory) sourceHistory.commit(sourceEngine.snapshot(), "Reorder Layer");
    // Move to end of stack — the user's intent is "this layer should
    // be in this panel", and appending is the safe default.
    sourceEngine.reorderLayer(sourceIdx, sourceEngine.getLayers().length - 1);
    return { newLayerId: payload.layerId };
  }

  const sourceLayer = sourceEngine.getLayer(payload.layerId);
  if (!sourceLayer) {
    showToast("Layer was deleted. Drop cancelled.", "error");
    return { newLayerId: null };
  }
  if (payload.isAltPressed && sourceEngine.getLayers().length <= 1) {
    showToast("Cannot move the last layer from a document. Drop cancelled.", "error");
    return { newLayerId: null };
  }

  const targetEngine = ws.getEngine(targetDocId);
  if (!targetEngine) return { newLayerId: null };
  if (targetEngine.getLayers().length >= MAX_LAYERS) {
    showToast("Target document reached max 100 layers", "error");
    return { newLayerId: null };
  }

  // Drop position: use cursor position for canvas + tab drops (the user
  // explicitly aimed there). For other targets (e.g. layers-panel) where
  // the cursor is outside the canvas, fall back to doc-center.
  const targetPos: Point =
    target && (target.type === "canvas" || target.type === "tab")
      ? cursorPos
      : (() => {
          const tw = targetEngine.getWidth();
          const th = targetEngine.getHeight();
          return {
            x: Math.max(0, (tw - sourceLayer.width) / 2),
            y: Math.max(0, (th - sourceLayer.height) / 2),
          };
        })();

  const targetHistory = ws.getHistory(targetDocId);
  if (targetHistory) targetHistory.commit(targetEngine.snapshot(), "Drag Layer");

  const added = targetEngine.addLayer(sourceLayer.name, sourceLayer.width, sourceLayer.height);
  const newId = added.id;
  if (newId) {
    targetEngine.transformLayer(newId, { ...sourceLayer.transform, x: targetPos.x, y: targetPos.y });
    targetEngine.setLayerOpacity(newId, sourceLayer.opacity);
    targetEngine.setLayerBlendMode(newId, sourceLayer.blendMode);
    targetEngine.setLayerVisibility(newId, sourceLayer.visible);
    targetEngine.setLayerLocked(newId, sourceLayer.locked);
    if (sourceLayer.imageBitmap) {
      targetEngine.setLayerImageBitmap(newId, sourceLayer.imageBitmap);
    }
  }

  if (payload.isAltPressed) {
    const sourceHistory = ws.getHistory(payload.sourceDocId);
    if (sourceHistory) sourceHistory.commit(sourceEngine.snapshot());
    sourceEngine.deleteLayer(payload.layerId);
  }
  return { newLayerId: newId ?? null };
}

export async function addFilesAsLayers(
  paths: string[],
  target: DropTarget,
  basePos: Point,
  ws: WorkspaceFacade
): Promise<CreatedLayer[]> {
  const targetDocId = target && target.type === "tab" && target.docId
    ? target.docId
    : ws.getActiveDocumentId();
  if (!targetDocId) return [];
  const targetEngine = ws.getEngine(targetDocId);
  if (!targetEngine) return [];
  if (targetEngine.getLayers().length + paths.length > MAX_LAYERS) {
    showToast(`Adding ${paths.length} files would exceed max 100 layers`, "error");
    return [];
  }

  const created: CreatedLayer[] = [];
  const decoded: Array<{ name: string; pos: Point; bitmap: ImageBitmap }> = [];
  for (let i = 0; i < paths.length; i++) {
    const path = paths[i];
    const pos = computeCascadePosition(basePos, i);
    const name = path.split(/[\\/]/).pop() ?? "Imported";
    try {
      const bitmap = await fileToBitmap(path);
      decoded.push({ name, pos, bitmap });
    } catch (err) {
      showToast(`Failed to load ${name}: ${err}`, "error");
      return [];
    }
  }

  const targetHistory = ws.getHistory(targetDocId);
  if (targetHistory) targetHistory.commit(targetEngine.snapshot());

  for (const { name, pos, bitmap } of decoded) {
    const added = targetEngine.addLayer(name);
    const newId = added.id;
    if (!newId) continue;
    targetEngine.moveLayer(newId, pos.x, pos.y);
    targetEngine.setLayerImageBitmap(newId, bitmap);
    created.push({ docId: targetDocId, layerId: newId, bitmap });
  }
  return created;
}

export async function createNewDocsFromFiles(
  paths: string[],
  ws: WorkspaceFacade
): Promise<CreatedDoc[]> {
  if (ws.isFull()) {
    showToast("Workspace full — close a document first (max 16)", "error");
    return [];
  }
  const created: CreatedDoc[] = [];
  for (const path of paths) {
    if (ws.isFull()) break;
    const name = path.split(/[\\/]/).pop() || "Image";
    try {
      const bitmap = await fileToBitmap(path);
      const id = `doc-${crypto.randomUUID()}`;
      const session = WorkspaceManager.createDocumentFromImage(id, name, bitmap);
      ws.addDocument(session);
      const bgLayerId = session.engine.getLayers()[0].id;
      created.push({ docId: id, backgroundLayerId: bgLayerId, bitmap });
    } catch (err) {
      showToast(`Failed to load ${name}: ${err}`, "error");
    }
  }
  return created;
}
