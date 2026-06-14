import { SelectionState } from "./SelectionTypes";
import { DocumentEngine } from "../../engine/document";

export class SelectionOperations {
  static getSelectionBounds(engine: DocumentEngine): SelectionState | null {
    const sel = engine.getSelection();
    if (!sel) return null;
    return { ...sel, angle: 0 };
  }

  static deleteSelection(engine: DocumentEngine): void {
    const sel = engine.getSelection();
    if (!sel) {
      throw new Error("no selection");
    }
    const activeId = engine.getActiveLayerId();
    if (!activeId) {
      throw new Error("no active layer");
    }

    // For MVP: just clear the selection state
    // Real pixel deletion will be implemented when ImageBitmap ops are ready
    engine.clearSelection();
  }

  static copySelection(engine: DocumentEngine): ImageData | null {
    const sel = engine.getSelection();
    if (!sel) return null;
    const activeId = engine.getActiveLayerId();
    if (!activeId) return null;
    // Real pixel copy will be implemented when ImageBitmap ops are ready
    return null;
  }

  static cutSelection(engine: DocumentEngine): ImageData | null {
    const sel = engine.getSelection();
    if (!sel) {
      throw new Error("no selection");
    }
    const activeId = engine.getActiveLayerId();
    if (!activeId) {
      throw new Error("no active layer");
    }
    const copied = SelectionOperations.copySelection(engine);
    engine.clearSelection();
    return copied;
  }

  static pasteSelection(engine: DocumentEngine, data: ImageData | null): void {
    if (!data) return;
    const layer = engine.addLayer("Pasted Layer", data.width, data.height);
    // Real pixel paste will be implemented when ImageBitmap ops are ready
  }
}
