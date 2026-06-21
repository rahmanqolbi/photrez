import type { DocumentEngine } from "@/engine/document";
import type { CommandHistory } from "@/engine/history";

export interface PaintBitmapUploader {
  uploadImage(layerId: string, bitmap: ImageBitmap): void;
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

  context.history.commit(context.engine.snapshot(), command.label);
  context.engine.setLayerImageBitmap(command.layerId, command.bitmap);
  context.uploader.uploadImage(command.layerId, command.bitmap);
  context.requestRender();
  return true;
}
