import type { DocumentEngine } from "@/engine/document";
import type { CommandHistory } from "@/engine/history";
import type { DocumentModel } from "@/engine/types";
import type { DirtyRectLike } from "@/renderer/types";

export interface PaintBitmapUploader {
  uploadImage(layerId: string, bitmap: ImageBitmap, dirtyRect?: DirtyRectLike): void;
}

export interface PaintBitmapCommitContext {
  engine: DocumentEngine;
  history: CommandHistory;
  uploader: PaintBitmapUploader;
  requestRender: () => void;
}

export interface PaintBitmapCommit {
  layerId: string;
  bitmap: ImageBitmap;
  label?: string;
  // Optional pre-captured snapshot. When set, it is used as the undo
  // checkpoint instead of a fresh engine.snapshot() at commit time. Used by
  // the brush/eraser so the checkpoint restores to the pre-bake state (the
  // layer adjustment still applied as a live param) rather than the
  // post-bake state — keeping the adjustment independently undoable.
  snapshot?: DocumentModel;
  // Optional sub-rectangle of the bitmap that actually changed. When set,
  // uploader.uploadImage can perform a texSubImage2D fast path instead of a
  // full texture re-upload.
  dirtyRect?: { x: number; y: number; width: number; height: number };
}

function closeBitmap(bitmap: ImageBitmap): void {
  try {
    bitmap.close();
  } catch {
    // Some test doubles and browser implementations may not expose a live close method.
  }
}

export function commitPaintBitmap(context: PaintBitmapCommitContext, command: PaintBitmapCommit): boolean {
  if (!context.engine.getLayer(command.layerId)) {
    closeBitmap(command.bitmap);
    return false;
  }

  context.history.commit(command.snapshot ?? context.engine.snapshot(), command.label);
  context.engine.setLayerImageBitmap(command.layerId, command.bitmap);
  // Only forward dirtyRect when present — keeps the 2-arg call for plain
  // commits (no sub-rect) so existing callers/tests are unaffected.
  if (command.dirtyRect) {
    context.uploader.uploadImage(command.layerId, command.bitmap, command.dirtyRect);
  } else {
    context.uploader.uploadImage(command.layerId, command.bitmap);
  }
  context.requestRender();
  return true;
}
