import type {
  DocumentId, LayerId, DocumentModel, LayerNode,
  ViewportState, SelectionState, RenderState, BlendMode,
  Transform2D, TextureHandle, RenderLayer
} from "./types";
import { MAX_LAYERS, MAX_PIXEL_BUDGET } from "./types";

function normalizeRotation(angleDeg: number): number {
  let angle = angleDeg % 360;
  if (angle > 180) angle -= 360;
  if (angle < -180) angle += 360;
  return angle;
}

import { createLayerNode, duplicateLayerNode, createMergedLayerNode } from "./layerFactory";
import { drawLayerToContext, compositeTwoLayers, compositeAllLayers } from "./layerComposite";
import { performCropCanvas, performApplyCrop } from "./cropApply";
import { createSnapshot, restoreSnapshot } from "./snapshot";
import { performPixelSampling } from "./pixelSample";

export { drawLayerToContext };


export class DocumentEngine {
  private model: DocumentModel;
  private textureHandles: Map<LayerId, TextureHandle>;
  private dirtyLayerIds: Set<LayerId>;
  private onChangeCallback: (() => void) | null = null;
  private onVisualChangeCallback: (() => void) | null = null;

  constructor(id: DocumentId, name: string, width: number, height: number) {
    this.model = {
      id,
      name,
      width,
      height,
      layers: [],
      activeLayerId: null,
      selection: null,
      viewport: {
        panX: 0,
        panY: 0,
        zoom: 1.0,
        rotation: 0
      },
      dirty: false
    };
    this.textureHandles = new Map();
    this.dirtyLayerIds = new Set();
  }

  // ─── Accessors ───
  getModel(): Readonly<DocumentModel> {
    return this.model;
  }

  getId(): DocumentId {
    return this.model.id;
  }

  getName(): string {
    return this.model.name;
  }

  getWidth(): number {
    return this.model.width;
  }

  getHeight(): number {
    return this.model.height;
  }

  getLayers(): readonly LayerNode[] {
    return this.model.layers;
  }

  getActiveLayerId(): LayerId | null {
    return this.model.activeLayerId;
  }

  getLayer(id: LayerId): LayerNode | undefined {
    return this.model.layers.find(l => l.id === id);
  }

  getSelection(): SelectionState | null {
    return this.model.selection;
  }

  getViewport(): ViewportState {
    return this.model.viewport;
  }

  isDirty(): boolean {
    return this.model.dirty;
  }

  // ─── Layer Operations ───
  addLayer(name: string, width?: number, height?: number): LayerNode {
    if (this.model.layers.length >= MAX_LAYERS) {
      throw new Error(`Maximum layer limit of ${MAX_LAYERS} reached`);
    }

    const w = width ?? this.model.width;
    const h = height ?? this.model.height;

    if (!this.canAddLayer(w, h)) {
      throw new Error("E_RESOURCE_LIMIT: Adding this layer exceeds maximum pixel memory budget.");
    }

    const newLayer = createLayerNode(name, w, h);

    // Insert directly above active layer if selected, else at front (top) of stack
    const activeId = this.model.activeLayerId;
    const activeIndex = activeId ? this.model.layers.findIndex(l => l.id === activeId) : -1;
    if (activeIndex !== -1) {
      this.model.layers = [
        ...this.model.layers.slice(0, activeIndex),
        newLayer,
        ...this.model.layers.slice(activeIndex)
      ];
    } else {
      this.model.layers = [newLayer, ...this.model.layers];
    }
    this.model.activeLayerId = newLayer.id;
    this.model.dirty = true;
    this.markLayerDirty(newLayer.id);
    this.notifyChange();

    return newLayer;
  }

  duplicateLayer(id: LayerId): LayerNode {
    if (this.model.layers.length >= MAX_LAYERS) {
      throw new Error(`Maximum layer limit of ${MAX_LAYERS} reached`);
    }

    const layer = this.getLayer(id);
    if (!layer) {
      throw new Error(`Layer with ID ${id} not found`);
    }

    if (!this.canAddLayer(layer.width, layer.height)) {
      throw new Error("E_RESOURCE_LIMIT: Duplicating this layer exceeds maximum pixel memory budget.");
    }

    const duplicated = duplicateLayerNode(layer);

    const index = this.model.layers.findIndex(l => l.id === id);
    if (index !== -1) {
      const updated = [...this.model.layers];
      updated.splice(index, 0, duplicated);
      this.model.layers = updated;
    } else {
      this.model.layers = [duplicated, ...this.model.layers];
    }

    this.model.activeLayerId = duplicated.id;
    this.model.dirty = true;
    this.markLayerDirty(duplicated.id);
    this.notifyChange();

    return duplicated;
  }

  mergeDown(id: LayerId): void {
    const index = this.model.layers.findIndex(l => l.id === id);
    if (index === -1 || index >= this.model.layers.length - 1) {
      return;
    }

    const top = this.model.layers[index];
    const bottom = this.model.layers[index + 1];

    const mergedW = this.model.width;
    const mergedH = this.model.height;

    const mergedBitmap = compositeTwoLayers(top, bottom, mergedW, mergedH);

    const mergedLayer = createMergedLayerNode(
      `${top.name} + ${bottom.name}`,
      mergedW,
      mergedH,
      mergedBitmap,
      bottom.locked || top.locked,
      bottom.blendMode
    );

    // Clean up WebGL textures for merged layers
    this.dirtyLayerIds.delete(top.id);
    this.textureHandles.delete(top.id);
    this.dirtyLayerIds.delete(bottom.id);
    this.textureHandles.delete(bottom.id);

    const updated = [...this.model.layers];
    updated.splice(index, 2, mergedLayer);
    this.model.layers = updated;

    this.model.activeLayerId = mergedLayer.id;
    this.model.dirty = true;
    this.markLayerDirty(mergedLayer.id);
    this.notifyChange();
  }

  flattenLayers(): void {
    if (this.model.layers.length <= 1) return;

    const mergedW = this.model.width;
    const mergedH = this.model.height;

    const mergedBitmap = compositeAllLayers(this.model.layers, mergedW, mergedH);

    const flattenedLayer = createMergedLayerNode(
      "Background",
      mergedW,
      mergedH,
      mergedBitmap,
      false,
      "normal"
    );

    for (const layer of this.model.layers) {
      this.dirtyLayerIds.delete(layer.id);
      this.textureHandles.delete(layer.id);
    }

    this.model.layers = [flattenedLayer];
    this.model.activeLayerId = flattenedLayer.id;
    this.model.dirty = true;
    this.markLayerDirty(flattenedLayer.id);
    this.notifyChange();
  }

  deleteLayer(id: LayerId): void {
    if (this.model.layers.length <= 1) {
      return; // prevent deleting the last layer
    }

    const index = this.model.layers.findIndex(l => l.id === id);
    if (index !== -1) {
      this.model.layers = this.model.layers.filter(l => l.id !== id);
      this.dirtyLayerIds.delete(id);
      this.textureHandles.delete(id);

      // Select another layer
      if (this.model.activeLayerId === id) {
        const nextActiveIndex = Math.min(index, this.model.layers.length - 1);
        this.model.activeLayerId = this.model.layers[nextActiveIndex].id;
      }

      this.model.dirty = true;
      this.notifyChange();
    }
  }

  reorderLayer(fromIndex: number, toIndex: number): void {
    if (fromIndex < 0 || fromIndex >= this.model.layers.length ||
        toIndex < 0 || toIndex >= this.model.layers.length) {
      return;
    }

    const updated = [...this.model.layers];
    const [moved] = updated.splice(fromIndex, 1);
    updated.splice(toIndex, 0, moved);

    this.model.layers = updated;
    this.model.dirty = true;
    this.notifyChange();
  }

  setActiveLayer(id: LayerId | null): void {
    if (id === null || this.model.layers.some(l => l.id === id)) {
      this.model.activeLayerId = id;
      this.notifyChange();
    }
  }

  // ─── Layer Properties ───
  setLayerOpacity(id: LayerId, opacity: number): void {
    const layer = this.getLayer(id);
    if (layer && !layer.locked) {
      layer.opacity = Math.max(0.0, Math.min(1.0, opacity));
      this.model.dirty = true;
      this.notifyChange();
    }
  }

  setLayerVisibility(id: LayerId, visible: boolean): void {
    const layer = this.getLayer(id);
    if (layer) {
      layer.visible = visible;
      this.model.dirty = true;
      this.notifyChange();
    }
  }

  setLayerLocked(id: LayerId, locked: boolean): void {
    const layer = this.getLayer(id);
    if (layer) {
      layer.locked = locked;
      this.model.dirty = true;
      this.notifyChange();
    }
  }

  setLayerLockTransparency(id: LayerId, locked: boolean): void {
    const layer = this.getLayer(id);
    if (layer) {
      layer.lockTransparency = locked;
      this.model.dirty = true;
      this.notifyChange();
    }
  }

  setLayerLockPosition(id: LayerId, locked: boolean): void {
    const layer = this.getLayer(id);
    if (layer) {
      layer.lockPosition = locked;
      this.model.dirty = true;
      this.notifyChange();
    }
  }

  setLayerLockRotation(id: LayerId, locked: boolean): void {
    const layer = this.getLayer(id);
    if (layer) {
      layer.lockRotation = locked;
      this.model.dirty = true;
      this.notifyChange();
    }
  }

  setLayerName(id: LayerId, name: string): void {
    const layer = this.getLayer(id);
    if (layer) {
      layer.name = name;
      this.model.dirty = true;
      this.notifyChange();
    }
  }

  setLayerBlendMode(id: LayerId, mode: BlendMode): void {
    const layer = this.getLayer(id);
    if (layer && !layer.locked) {
      layer.blendMode = mode;
      this.model.dirty = true;
      this.notifyChange();
    }
  }

  // ─── Layer Transform ───
  moveLayer(id: LayerId, x: number, y: number): void {
    const layer = this.getLayer(id);
    if (layer && !layer.locked && !layer.lockPosition) {
      layer.transform.x = x;
      layer.transform.y = y;
      this.model.dirty = true;
      this.notifyChange();
    }
  }

  transformLayer(id: LayerId, transform: Partial<Transform2D>): void {
    const layer = this.getLayer(id);
    if (layer && !layer.locked) {
      const updatedTransform = { ...layer.transform };

      // Apply positional changes only if position lock is false
      if (!layer.lockPosition) {
        if (transform.x !== undefined) updatedTransform.x = transform.x;
        if (transform.y !== undefined) updatedTransform.y = transform.y;
      }

      // Apply rotational changes only if rotation lock is false
      if (!layer.lockRotation) {
        if (transform.rotation !== undefined) updatedTransform.rotation = transform.rotation;
      }

      // Scale, flips, etc. are always applied (or add more locks if needed in the future)
      if (transform.scaleX !== undefined) updatedTransform.scaleX = transform.scaleX;
      if (transform.scaleY !== undefined) updatedTransform.scaleY = transform.scaleY;
      if (transform.flipH !== undefined) updatedTransform.flipH = transform.flipH;
      if (transform.flipV !== undefined) updatedTransform.flipV = transform.flipV;

      layer.transform = updatedTransform;
      this.model.dirty = true;
      this.notifyChange();
    }
  }

  flipLayer(id: LayerId, axis: "h" | "v"): void {
    const layer = this.getLayer(id);
    if (layer && !layer.locked) {
      if (axis === "h") {
        layer.transform.flipH = !layer.transform.flipH;
      } else {
        layer.transform.flipV = !layer.transform.flipV;
      }
      this.model.dirty = true;
      this.notifyChange();
    }
  }

  // ─── Selection ───
  createSelection(x: number, y: number, w: number, h: number): void {
    this.model.selection = { x, y, width: w, height: h };
    this.notifyChange();
  }

  clearSelection(): void {
    this.model.selection = null;
    this.notifyChange();
  }

  selectAll(): void {
    this.model.selection = {
      x: 0,
      y: 0,
      width: this.model.width,
      height: this.model.height
    };
    this.notifyChange();
  }

  // ─── Viewport ───
  setViewport(viewport: Partial<ViewportState>): void {
    this.model.viewport = {
      ...this.model.viewport,
      ...viewport
    };
    this.notifyChange();
  }

  pan(dx: number, dy: number): void {
    this.model.viewport.panX += dx;
    this.model.viewport.panY += dy;
    this.notifyChange();
  }

  zoom(factor: number, anchorX?: number, anchorY?: number): void {
    const currentZoom = this.model.viewport.zoom;
    const nextZoom = Math.max(0.01, Math.min(100.0, currentZoom * factor));

    if (anchorX !== undefined && anchorY !== undefined) {
      // Zoom centered at anchor point
      this.model.viewport.panX = anchorX - (anchorX - this.model.viewport.panX) * (nextZoom / currentZoom);
      this.model.viewport.panY = anchorY - (anchorY - this.model.viewport.panY) * (nextZoom / currentZoom);
    }

    this.model.viewport.zoom = nextZoom;
    this.notifyChange();
  }

  fitToScreen(containerWidth: number, containerHeight: number): void {
    const padding = 80;
    const fitZoom = Math.min(
      (containerWidth - padding) / this.model.width,
      (containerHeight - padding) / this.model.height,
      10.0
    );

    this.model.viewport.zoom = Math.max(0.05, fitZoom);
    this.model.viewport.panX = (containerWidth - this.model.width * this.model.viewport.zoom) / 2;
    this.model.viewport.panY = (containerHeight - this.model.height * this.model.viewport.zoom) / 2;
    this.notifyChange();
  }

  // ─── Canvas Operations ───
  cropCanvas(x: number, y: number, width: number, height: number): void {
    if (width <= 0 || height <= 0) return;

    this.model.width = width;
    this.model.height = height;

    performCropCanvas(this.model.layers, x, y);

    this.model.selection = null; // Reset selection on crop
    this.model.dirty = true;
    this.notifyChange();
  }

  applyCrop(
    x: number,
    y: number,
    width: number,
    height: number,
    options?: {
      deleteCroppedPixels?: boolean;
      targetSize?: { w: number; h: number } | null;
      rotation?: number;
    },
  ): void {
    if (width <= 0 || height <= 0) return;

    const targetSize = options?.targetSize ?? null;
    const finalW = targetSize ? targetSize.w : width;
    const finalH = targetSize ? targetSize.h : height;

    performApplyCrop(this.model.layers, x, y, width, height, options);

    this.model.width = finalW;
    this.model.height = finalH;

    this.model.selection = null;
    this.model.dirty = true;
    this.notifyChange();
  }

  resizeCanvas(width: number, height: number): void {
    if (width <= 0 || height <= 0) return;
    this.model.width = width;
    this.model.height = height;
    this.model.dirty = true;
    this.notifyChange();
  }

  // ─── Image Data ───
  setLayerImageBitmap(id: LayerId, bitmap: ImageBitmap): void {
    const layer = this.getLayer(id);
    if (layer) {
      if (layer.imageBitmap && layer.imageBitmap !== bitmap) {
        layer.imageBitmap.close();
      }
      layer.imageBitmap = bitmap;
      layer.width = bitmap.width;
      layer.height = bitmap.height;
      this.model.dirty = true;
      this.markLayerDirty(id);
      this.notifyVisualChange();
    }
  }

  // ─── Texture Handles ───
  setTextureHandle(layerId: LayerId, handle: TextureHandle): void {
    this.textureHandles.set(layerId, handle);
  }

  getTextureHandle(layerId: LayerId): TextureHandle | undefined {
    return this.textureHandles.get(layerId);
  }

  // ─── Render State ───
  getRenderState(): RenderState {
    const renderLayers: RenderLayer[] = this.model.layers.map(l => {
      const handle = this.textureHandles.get(l.id) || { id: `tex-${l.id}` };
      return {
        id: l.id,
        textureHandle: handle,
        visible: l.visible,
        opacity: l.opacity,
        blendMode: l.blendMode,
        transform: l.transform,
        width: l.width,
        height: l.height
      };
    });

    return {
      documentId: this.model.id,
      viewport: this.model.viewport,
      documentSize: { width: this.model.width, height: this.model.height },
      layers: renderLayers,
      selection: this.model.selection,
      checkerboard: true,
      backgroundColor: [0.05, 0.06, 0.07, 1.0] // Midnight dark background
    };
  }

  // ─── Dirty Tracking ───
  markLayerDirty(id: LayerId): void {
    this.dirtyLayerIds.add(id);
  }

  getDirtyLayerIds(): LayerId[] {
    return Array.from(this.dirtyLayerIds);
  }

  clearDirty(): void {
    this.dirtyLayerIds.clear();
    this.model.dirty = false;
  }

  // ─── Change Notification ───
  onChange(callback: () => void): void {
    this.onChangeCallback = callback;
  }

  onVisualChange(callback: () => void): void {
    this.onVisualChangeCallback = callback;
  }

  private notifyChange(): void {
    if (this.onChangeCallback) {
      this.onChangeCallback();
    }
  }

  private notifyVisualChange(): void {
    if (this.onVisualChangeCallback) {
      this.onVisualChangeCallback();
    }
  }

  // ─── Snapshot & Restore (Undo/Redo Support) ───
  snapshot(): DocumentModel {
    return createSnapshot(this.model);
  }

  restore(snapshot: DocumentModel): void {
    this.model = restoreSnapshot(snapshot);
    this.notifyChange();
  }

  // ─── Memory Budget ───
  calculateMemoryUsage(): number {
    let bytes = 0;
    for (const layer of this.model.layers) {
      bytes += layer.width * layer.height * 4; // RGBA8
    }
    return bytes;
  }

  canAddLayer(width: number, height: number): boolean {
    const projected = this.calculateMemoryUsage() + (width * height * 4);
    return projected <= MAX_PIXEL_BUDGET;
  }

  // ─── Pixel Sampling (Eyedropper support) ───
  samplePixel(x: number, y: number): [number, number, number, number] {
    return performPixelSampling(this.model.layers, this.model.width, this.model.height, x, y);
  }
}
