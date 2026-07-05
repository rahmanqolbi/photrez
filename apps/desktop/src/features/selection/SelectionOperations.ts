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

  static hasClipboard(): boolean {
    return SelectionOperations.clipboard !== null;
  }

  static getSelectionBounds(engine: DocumentEngine): SelectionState | null {
    const sel = engine.getSelection();
    if (!sel) return null;
    return { ...sel, angle: 0 };
  }

  /**
   * Copy pixels from the active layer within the selection bounds.
   *
   * Clamps source coordinates to the layer bounds so selections extending
   * beyond the canvas do not crash.  Also auto-trims fully-transparent
   * rows/columns from the edges so that empty areas of the selection are
   * not included in the clipboard.
   *
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

    const layer = engine.getLayer(activeId);
    if (!layer) return null;

    const layerW = layer.width;
    const layerH = layer.height;

    let w: number, h: number, sx: number, sy: number;

    if (sel.inverted) {
      // Inverted selection: copy the full layer, then clear the excluded rect
      sx = 0;
      sy = 0;
      w = layerW;
      h = layerH;
    } else {
      // Clamp source rect to layer bounds to avoid Canvas drawImage crash
      // when the selection extends beyond the canvas.
      sx = Math.max(0, Math.round(sel.x));
      sy = Math.max(0, Math.round(sel.y));
      const se = Math.min(layerW, Math.round(sel.x + sel.width));
      const sb = Math.min(layerH, Math.round(sel.y + sel.height));
      w = Math.max(0, se - sx);
      h = Math.max(0, sb - sy);
    }

    if (w === 0 || h === 0) return null;

    const offscreen = new OffscreenCanvas(w, h);
    const ctx = offscreen.getContext("2d");
    if (!ctx) return null;

    try {
      if (sel.inverted) {
        ctx.drawImage(bitmap, 0, 0);
        ctx.clearRect(Math.round(sel.x), Math.round(sel.y), Math.round(sel.width), Math.round(sel.height));
      } else {
        ctx.drawImage(
          bitmap,
          sx, sy, w, h,
          0, 0, w, h,
        );
      }
      const data = ctx.getImageData(0, 0, w, h);
      // Auto-trim transparent pixels so empty areas are not included.
      // Skip for inverted selections: the excluded region may touch the
      // layer edge, causing trimTransparent to cut off visible content.
      const trimmed = sel.inverted ? data : SelectionOperations.trimTransparent(data);
      SelectionOperations.clipboard = trimmed;
      return trimmed;
    } catch (err) {
      console.error("copySelection failed:", err);
      return null;
    }
  }

  /**
   * Remove fully-transparent rows/columns from the edges of ImageData.
   * If every pixel is transparent, returns the original data unchanged.
   */
  private static trimTransparent(imageData: ImageData): ImageData {
    const { width, height, data: pixels } = imageData;

    // Find bounding box of non-transparent pixels
    let top = height;
    let bottom = 0;
    let left = width;
    let right = 0;

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        if (pixels[(y * width + x) * 4 + 3] > 0) {
          if (y < top) top = y;
          if (y > bottom) bottom = y;
          if (x < left) left = x;
          if (x > right) right = x;
        }
      }
    }

    // Fully transparent — nothing to trim
    if (top > bottom) {
      return imageData;
    }

    const trimmedW = right - left + 1;
    const trimmedH = bottom - top + 1;

    // Already minimal — no trimming needed
    if (trimmedW === width && trimmedH === height) {
      return imageData;
    }

    // Extract the trimmed region into a new buffer
    const trimmedData = new Uint8ClampedArray(trimmedW * trimmedH * 4);
    for (let y = 0; y < trimmedH; y++) {
      for (let x = 0; x < trimmedW; x++) {
        const srcIdx = ((top + y) * width + (left + x)) * 4;
        const dstIdx = (y * trimmedW + x) * 4;
        trimmedData[dstIdx] = pixels[srcIdx];
        trimmedData[dstIdx + 1] = pixels[srcIdx + 1];
        trimmedData[dstIdx + 2] = pixels[srcIdx + 2];
        trimmedData[dstIdx + 3] = pixels[srcIdx + 3];
      }
    }

    return {
      data: trimmedData,
      width: trimmedW,
      height: trimmedH,
      colorSpace: "srgb",
    } as ImageData;
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

    // Copy the entire layer bitmap, then clear either the selected rectangle
    // or, for an inverted selection, the four bands outside the excluded rect.
    ctx.drawImage(bitmap, 0, 0);
    if (sel.inverted) {
      const left = Math.max(0, Math.min(layerW, sx));
      const top = Math.max(0, Math.min(layerH, sy));
      const right = Math.max(0, Math.min(layerW, sx + w));
      const bottom = Math.max(0, Math.min(layerH, sy + h));
      ctx.clearRect(0, 0, layerW, top);
      ctx.clearRect(0, bottom, layerW, layerH - bottom);
      ctx.clearRect(0, top, left, bottom - top);
      ctx.clearRect(right, top, layerW - right, bottom - top);
    } else {
      ctx.clearRect(sx, sy, w, h);
    }

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
