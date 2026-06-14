import { SelectionState } from "./SelectionTypes";
import { DocumentEngine } from "../../engine/document";

/**
 * Selection pixel operations (cut/copy/paste/delete) for the active layer.
 *
 * Selection state is read from `engine.getSelection()`. The clipboard is
 * a module-level in-memory buffer shared across the app — for MVP we do not
 * integrate with the system clipboard.
 */
export class SelectionOperations {
  private static clipboard: ImageData | null = null;

  static getSelectionBounds(engine: DocumentEngine): SelectionState | null {
    const sel = engine.getSelection();
    if (!sel) return null;
    return { ...sel, angle: 0 };
  }

  /**
   * Copy pixels from the active layer within the selection bounds.
   * Returns the ImageData (also stored in module-level clipboard) or null
   * if no selection or no active layer.
   */
  static copySelection(engine: DocumentEngine): ImageData | null {
    const sel = engine.getSelection();
    if (!sel) return null;
    const activeId = engine.getActiveLayerId();
    if (!activeId) return null;

    const bitmap = engine.getLayerImageBitmap(activeId);
    if (!bitmap) return null;

    const w = Math.max(0, Math.round(sel.width));
    const h = Math.max(0, Math.round(sel.height));
    if (w === 0 || h === 0) return null;

    const sx = Math.round(sel.x);
    const sy = Math.round(sel.y);

    const offscreen = new OffscreenCanvas(w, h);
    const ctx = offscreen.getContext("2d");
    if (!ctx) return null;

    try {
      ctx.drawImage(
        bitmap,
        sx, sy, w, h,
        0, 0, w, h,
      );
      const data = ctx.getImageData(0, 0, w, h);
      SelectionOperations.clipboard = data;
      return data;
    } catch (err) {
      console.error("copySelection failed:", err);
      return null;
    }
  }

  /**
   * Cut = copy + clear selection pixels + clear selection state.
   */
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
    if (copied) {
      SelectionOperations.fillSelectionWithTransparent(engine);
    }
    engine.clearSelection();
    return copied;
  }

  /**
   * Delete = clear pixels in selection (set transparent) + clear selection state.
   * Does NOT copy to clipboard.
   */
  static deleteSelection(engine: DocumentEngine): void {
    const sel = engine.getSelection();
    if (!sel) {
      throw new Error("no selection");
    }
    const activeId = engine.getActiveLayerId();
    if (!activeId) {
      throw new Error("no active layer");
    }
    SelectionOperations.fillSelectionWithTransparent(engine);
    engine.clearSelection();
  }

  /**
   * Paste the in-memory clipboard as a new layer.
   * If no clipboard, no-op.
   */
  static pasteSelection(engine: DocumentEngine, data: ImageData | null = null): void {
    const payload = data ?? SelectionOperations.clipboard;
    if (!payload) return;
    const layer = engine.addLayer("Pasted Layer", payload.width, payload.height);

    const w = payload.width;
    const h = payload.height;
    const offscreen = new OffscreenCanvas(w, h);
    const ctx = offscreen.getContext("2d");
    if (!ctx) return;
    ctx.putImageData(payload, 0, 0);
    const bitmap = offscreen.transferToImageBitmap();
    engine.setLayerImageBitmap(layer.id, bitmap);
  }

  /**
   * Helper: fill selection bounds with transparent pixels on the active layer.
   *
   * Operates in the layer's own bitmap space (not document space). This is
   * correct when the layer has an identity transform — the selection in
   * document space then coincides with the selection in layer space, which
   * is the MVP case (layers in MVP do not carry non-identity transforms
   * that affect pixel sampling). If we later add transformed layers we
   * will need to inverse-transform the selection rect into layer space.
   */
  private static fillSelectionWithTransparent(engine: DocumentEngine): void {
    const sel = engine.getSelection();
    if (!sel) return;
    const activeId = engine.getActiveLayerId();
    if (!activeId) return;

    const layer = engine.getLayer(activeId);
    if (!layer) return;
    const bitmap = layer.imageBitmap;
    if (!bitmap) return;

    const w = Math.max(0, Math.round(sel.width));
    const h = Math.max(0, Math.round(sel.height));
    if (w === 0 || h === 0) return;

    const sx = Math.round(sel.x);
    const sy = Math.round(sel.y);

    // Use the layer's own bitmap size — the layer is the unit of truth.
    const layerW = layer.width;
    const layerH = layer.height;

    const offscreen = new OffscreenCanvas(layerW, layerH);
    const ctx = offscreen.getContext("2d");
    if (!ctx) return;

    // Copy the entire layer bitmap, then clear the selection rectangle.
    ctx.drawImage(bitmap, 0, 0);
    ctx.clearRect(sx, sy, w, h);

    const newBitmap = offscreen.transferToImageBitmap();
    engine.setLayerImageBitmap(layer.id, newBitmap);
  }

  /**
   * Test-only: clear the in-memory clipboard.
   */
  static __resetClipboard(): void {
    SelectionOperations.clipboard = null;
  }
}
