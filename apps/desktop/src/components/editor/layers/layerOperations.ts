import type { DocumentEngine } from "@/engine/document";
import type { CommandHistory } from "@/engine/history";
import type { WebGL2Backend } from "@/renderer/webgl2";
import { compositeAllLayers } from "@/engine/layerComposite";
import { applyBasicAdjustmentToColor } from "@/engine/layerAdjustments";

export function mergeActiveLayerDown(
  engine: DocumentEngine,
  history: CommandHistory,
  renderer: WebGL2Backend,
  activeId: string,
) {
  const beforeLayers = engine.getLayers();
  const activeIndex = beforeLayers.findIndex((layer) => layer.id === activeId);
  const bottomLayer = activeIndex >= 0 ? beforeLayers[activeIndex + 1] : null;

  if (!bottomLayer) {
    return false;
  }

  history.commit(engine.snapshot(), "Merge Down");
  engine.mergeDown(activeId);
  renderer.destroyTexture(activeId);
  renderer.destroyTexture(bottomLayer.id);

  const mergedLayer = engine.getLayer(engine.getActiveLayerId() || "");
  if (mergedLayer?.imageBitmap) {
    renderer.uploadImage(mergedLayer.id, mergedLayer.imageBitmap);
  }

  return true;
}

export function flattenAllLayers(
  engine: DocumentEngine,
  history: CommandHistory,
  renderer: WebGL2Backend,
) {
  const oldLayerIds = engine.getLayers().map((layer) => layer.id);
  if (oldLayerIds.length <= 1) {
    return false;
  }

  history.commit(engine.snapshot(), "Flatten Image");
  engine.flattenLayers();

  for (const id of oldLayerIds) {
    renderer.destroyTexture(id);
  }

  const flattenedLayer = engine.getLayer(engine.getActiveLayerId() || "");
  if (flattenedLayer?.imageBitmap) {
    renderer.uploadImage(flattenedLayer.id, flattenedLayer.imageBitmap);
  }

  return true;
}

export function stampVisibleLayers(
  engine: DocumentEngine,
  history: CommandHistory,
  renderer: WebGL2Backend,
) {
  const layers = engine.getLayers();
  const visibleLayers = layers.filter((l) => l.visible);
  if (visibleLayers.length === 0) return false;

  history.commit(engine.snapshot(), "Stamp Visible");

  const w = engine.getWidth();
  const h = engine.getHeight();
  const composite = compositeAllLayers(visibleLayers, w, h);
  if (!composite) {
    return false;
  }

  const newLayer = engine.addLayer("Stamp Visible", w, h);
  engine.setLayerImageBitmap(newLayer.id, composite);
  renderer.uploadImage(newLayer.id, composite);

  return true;
}

/**
 * Fill the active layer with a solid color (Alt+Del / Ctrl+Del).
 * Replaces the entire layer content with an opaque `color` bitmap. Skips
 * locked layers and layers with no active id. Commits history BEFORE mutation
 * so the fill is undoable/redoable, then uploads the new bitmap to the renderer.
 */
export function fillActiveLayerWithColor(
  engine: DocumentEngine,
  history: CommandHistory,
  renderer: WebGL2Backend,
  color: string,
): boolean {
  const activeId = engine.getActiveLayerId();
  if (!activeId) return false;

  const layer = engine.getLayer(activeId);
  if (!layer || layer.locked) return false;

  // A solid fill is a uniform color — apply the layer adjustment to the color
  // directly (O(1)) instead of baking every pixel on the CPU. This matches the
  // shader's applyAdjustment on the fill and then drops the adjustment param.
  const fillColor = layer.basicAdjustment
    ? applyBasicAdjustmentToColor(color, layer.basicAdjustment)
    : color;

  const w = layer.width;
  const h = layer.height;

  let bitmap: ImageBitmap | null = null;
  try {
    if (typeof OffscreenCanvas !== "undefined") {
      const offscreen = new OffscreenCanvas(w, h);
      const ctx = offscreen.getContext("2d");
      if (ctx) {
        ctx.fillStyle = fillColor;
        ctx.fillRect(0, 0, w, h);
        bitmap = offscreen.transferToImageBitmap();
      }
    }
  } catch (err) {
    console.error("Failed to fill layer with color:", err);
    return false;
  }
  if (!bitmap) return false;

  // Capture the pre-bake state so the fill's undo checkpoint restores to the
  // adjustment-still-applied state (not pre-adjustment) — keeping the
  // adjustment independently undoable from the fill.
  const preFillSnapshot = engine.snapshot();

  if (layer.basicAdjustment) engine.clearBasicAdjustments(activeId);

  // Commit pre-action snapshot BEFORE mutating so the fill is undoable/redoable.
  history.commit(preFillSnapshot, "Fill Layer");
  engine.setLayerImageBitmap(activeId, bitmap);
  renderer.uploadImage(activeId, bitmap);
  return true;
}
