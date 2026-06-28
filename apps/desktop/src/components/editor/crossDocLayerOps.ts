import type { LayerDragPayload, DropTarget } from "./dragTypes";
import { showToast } from "./Toast";
import type { BlendMode, DocumentModel, LayerNode, Transform2D } from "@/engine/types";
import { MAX_LAYERS } from "@/engine/types";
import { decodeImageBytes, UnsupportedImageError, ImageTooLargeError } from "@/engine/imageDecode";
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
  return await decodeImageBytes(bytes);
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
  // own layer panel. When the drop handler provides insertAt +
  // insertPosition (tracked during dragover), honour that exact
  // landing position. Otherwise fall back to "move source to end of
  // its own stack" so the drop is never silently lost.
  if (payload.sourceDocId === targetDocId) {
    const sourceIdx = sourceEngine.getLayers().findIndex((l) => l.id === payload.layerId);
    if (sourceIdx < 0) return { newLayerId: null };
    const sourceHistory = ws.getHistory(payload.sourceDocId);
    if (sourceHistory) sourceHistory.commit(sourceEngine.snapshot(), "Reorder Layer");

    const layers = sourceEngine.getLayers();
    // ponytail: derive the final reorderLayer target from the
    // dragover-tracked (insertAt, insertPosition) hint. The naive
    // `splice+insert` math is sensitive to whether the source sits
    // before, at, or after the insertion point — get it wrong and
    // the drop silently no-ops or lands in the wrong row.
    let targetIdx: number;
    if (target && target.type === "layers-panel" && typeof target.insertAt === "number") {
      const insertAt = target.insertAt;
      const position = target.insertPosition === "below" ? "below" : "above";
      if (sourceIdx < insertAt) {
        // Source is above the insertion point. After splice, every
        // row at-or-after sourceIdx shifts down by one, so the row
        // that was at insertAt is now at insertAt-1.
        targetIdx = position === "below" ? insertAt : insertAt - 1;
      } else if (sourceIdx > insertAt) {
        // Source is below the insertion point — no shift.
        targetIdx = position === "below" ? insertAt + 1 : insertAt;
      } else {
        // sourceIdx === insertAt — drop on the source's own row.
        targetIdx = position === "below" ? sourceIdx + 1 : sourceIdx;
      }
    } else {
      targetIdx = layers.length - 1;
    }
    // Clamp to a valid range after the math.
    targetIdx = Math.min(Math.max(0, targetIdx), layers.length - 1);
    if (targetIdx === sourceIdx) {
      // Drop on source's own row with no movement — no-op.
      return { newLayerId: payload.layerId };
    }
    sourceEngine.reorderLayer(sourceIdx, targetIdx);
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
      // Clone the bitmap so source and target don't share a reference.
      // Without this, deleteLayer on the source (move) or a subsequent
      // adjustment (copy) would close the bitmap the target now holds.
      try {
        const canvas = new OffscreenCanvas(sourceLayer.width, sourceLayer.height);
        const ctx = canvas.getContext("2d");
        if (ctx) {
          ctx.drawImage(sourceLayer.imageBitmap, 0, 0);
          targetEngine.setLayerImageBitmap(newId, canvas.transferToImageBitmap());
        } else {
          targetEngine.setLayerImageBitmap(newId, sourceLayer.imageBitmap);
        }
      } catch {
        // OffscreenCanvas unavailable (node test env) — fall back to sharing
        targetEngine.setLayerImageBitmap(newId, sourceLayer.imageBitmap);
      }
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

  const decoded: Array<{ name: string; pos: Point; bitmap: ImageBitmap }> = [];
  // ponytail: on any failure path, every bitmap we've already decoded must
  // be `.close()`d to release the GPU buffer — otherwise a partial batch
  // failure (file #3 corrupt out of 5) leaks ImageBitmap #1 and #2.
  const freeDecoded = () => {
    for (const { bitmap } of decoded) bitmap.close();
  };
  for (let i = 0; i < paths.length; i++) {
    const path = paths[i];
    const pos = computeCascadePosition(basePos, i);
    const name = path.split(/[\\/]/).pop() ?? "Imported";
    try {
      const bitmap = await fileToBitmap(path);
      decoded.push({ name, pos, bitmap });
    } catch (err) {
      freeDecoded();
      if (err instanceof ImageTooLargeError) {
        showToast(`${name}: ${err.message}`, "error");
      } else if (err instanceof UnsupportedImageError) {
        showToast(`${name}: ${err.message}`, "error");
      } else {
        showToast(`Failed to load ${name}: ${err}`, "error");
      }
      return [];
    }
  }

  const targetHistory = ws.getHistory(targetDocId);
  if (targetHistory) targetHistory.commit(targetEngine.snapshot());

  const created: CreatedLayer[] = [];
  try {
    for (const { name, pos, bitmap } of decoded) {
      const added = targetEngine.addLayer(name, bitmap.width, bitmap.height);
      const newId = added.id;
      if (!newId) {
        bitmap.close();
        continue;
      }
      targetEngine.moveLayer(newId, pos.x, pos.y);
      targetEngine.setLayerImageBitmap(newId, bitmap);
      created.push({ docId: targetDocId, layerId: newId, bitmap });
    }
  } catch (err) {
    // ponytail: engine refused to add (MAX_LAYERS / memory budget).
    // Layers we successfully created keep their bitmaps (engine owns
    // them now via setLayerImageBitmap); leftover bitmaps in `decoded`
    // that the engine never accepted are still ours to free.
    for (let i = created.length; i < decoded.length; i++) {
      decoded[i].bitmap.close();
    }
    showToast(`Failed to add layer: ${err}`, "error");
    return created;
  }
  return created;
}

/**
 * Add files from an HTML5 drag-drop `FileList` (OS file manager drop) as new
 * layers.  Uses the browser's native `createImageBitmap(file)` decoder instead
 * of Tauri's `readFileBytes` + `decodeImageBytes` path.
 */
export async function addFilesAsLayersFromFileDrop(
  files: File[],
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
  if (targetEngine.getLayers().length + files.length > MAX_LAYERS) {
    showToast(`Adding ${files.length} files exceeds max 100 layers`, "error");
    return [];
  }

  const decoded: Array<{ name: string; pos: Point; bitmap: ImageBitmap }> = [];
  // ponytail: on any failure path, free every bitmap we've decoded so far
  // to avoid GPU buffer leaks.
  const freeDecoded = () => {
    for (const { bitmap } of decoded) bitmap.close();
  };
  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    const pos = computeCascadePosition(basePos, i);
    try {
      // ponytail: createImageBitmap is a browser built-in — the WebView2
      // runtime decodes PNG/JPEG/WebP/etc. natively with no Tauri IPC.
      const bitmap = await createImageBitmap(file);
      decoded.push({ name: file.name, pos, bitmap });
    } catch (err) {
      freeDecoded();
      showToast(`Failed to load ${file.name}: ${err}`, "error");
      return [];
    }
  }

  const targetHistory = ws.getHistory(targetDocId);
  if (targetHistory) targetHistory.commit(targetEngine.snapshot());

  const created: CreatedLayer[] = [];
  try {
    for (const { name, pos, bitmap } of decoded) {
      const added = targetEngine.addLayer(name, bitmap.width, bitmap.height);
      const newId = added.id;
      if (!newId) {
        bitmap.close();
        continue;
      }
      targetEngine.moveLayer(newId, pos.x, pos.y);
      targetEngine.setLayerImageBitmap(newId, bitmap);
      created.push({ docId: targetDocId, layerId: newId, bitmap });
    }
  } catch (err) {
    for (let i = created.length; i < decoded.length; i++) {
      decoded[i].bitmap.close();
    }
    showToast(`Failed to add layer: ${err}`, "error");
    return created;
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
  // ponytail: same GPU-buffer leak guard as addFilesAsLayers — on any
  // failure (decode, ws.isFull mid-loop), every bitmap decoded so far
  // must be closed before we bail.
  const decodedBitmaps: ImageBitmap[] = [];
  const freeDecoded = () => {
    for (const b of decodedBitmaps) b.close();
  };
  for (const path of paths) {
    if (ws.isFull()) {
      freeDecoded();
      showToast("Workspace full — close a document first (max 16)", "error");
      return created;
    }
    const name = path.split(/[\\/]/).pop() || "Image";
    try {
      const bitmap = await fileToBitmap(path);
      decodedBitmaps.push(bitmap);
      const id = `doc-${crypto.randomUUID()}`;
      const session = WorkspaceManager.createDocumentFromImage(id, name, bitmap);
      ws.addDocument(session);
      const bgLayerId = session.engine.getLayers()[0].id;
      created.push({ docId: id, backgroundLayerId: bgLayerId, bitmap });
    } catch (err) {
      freeDecoded();
      if (err instanceof ImageTooLargeError) {
        showToast(`${name}: ${err.message}`, "error");
      } else if (err instanceof UnsupportedImageError) {
        showToast(`${name}: ${err.message}`, "error");
      } else {
        showToast(`Failed to load ${name}: ${err}`, "error");
      }
      return created;
    }
  }
  return created;
}
