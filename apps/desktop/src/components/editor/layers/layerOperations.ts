import type { DocumentEngine } from "@/engine/document";
import type { CommandHistory } from "@/engine/history";
import type { WebGL2Backend } from "@/renderer/webgl2";

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
