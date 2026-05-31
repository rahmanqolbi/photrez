import type {
  DocumentId, LayerId, DocumentModel, LayerNode,
  ViewportState, SelectionState, RenderState, BlendMode,
  Transform2D, TextureHandle, RenderLayer
} from "./types";
import { MAX_LAYERS, MAX_PIXEL_BUDGET } from "./types";

export class DocumentEngine {
  private model: DocumentModel;
  private textureHandles: Map<LayerId, TextureHandle>;
  private dirtyLayerIds: Set<LayerId>;
  private onChangeCallback: (() => void) | null = null;

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

    const newLayer: LayerNode = {
      id: `layer-${crypto.randomUUID()}`,
      name,
      type: "raster",
      visible: true,
      opacity: 1.0,
      locked: false,
      blendMode: "normal",
      transform: {
        x: 0,
        y: 0,
        scaleX: 1.0,
        scaleY: 1.0,
        rotation: 0,
        flipH: false,
        flipV: false
      },
      width: w,
      height: h,
      imageBitmap: null
    };

    // Insert at front of array (visually top of layer stack)
    this.model.layers = [newLayer, ...this.model.layers];
    this.model.activeLayerId = newLayer.id;
    this.model.dirty = true;
    this.markLayerDirty(newLayer.id);
    this.notifyChange();

    return newLayer;
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
    if (layer && !layer.locked) {
      layer.transform.x = x;
      layer.transform.y = y;
      this.model.dirty = true;
      this.notifyChange();
    }
  }

  transformLayer(id: LayerId, transform: Partial<Transform2D>): void {
    const layer = this.getLayer(id);
    if (layer && !layer.locked) {
      layer.transform = {
        ...layer.transform,
        ...transform
      };
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
      1.0
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

    // Relative offset shift for layers
    for (const layer of this.model.layers) {
      if (!layer.locked) {
        layer.transform.x -= x;
        layer.transform.y -= y;
      }
    }

    this.model.selection = null; // Reset selection on crop
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
      layer.imageBitmap = bitmap;
      layer.width = bitmap.width;
      layer.height = bitmap.height;
      this.model.dirty = true;
      this.markLayerDirty(id);
      this.notifyChange();
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
  getRenderState(canvasWidth: number, canvasHeight: number): RenderState {
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
      canvasSize: { width: canvasWidth, height: canvasHeight },
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

  private notifyChange(): void {
    if (this.onChangeCallback) {
      this.onChangeCallback();
    }
  }

  // ─── Snapshot & Restore (Undo/Redo Support) ───
  snapshot(): DocumentModel {
    // Deep clone the document model
    return {
      id: this.model.id,
      name: this.model.name,
      width: this.model.width,
      height: this.model.height,
      activeLayerId: this.model.activeLayerId,
      selection: this.model.selection ? { ...this.model.selection } : null,
      viewport: { ...this.model.viewport },
      dirty: this.model.dirty,
      layers: this.model.layers.map(l => ({
        id: l.id,
        name: l.name,
        type: l.type,
        visible: l.visible,
        opacity: l.opacity,
        locked: l.locked,
        blendMode: l.blendMode,
        transform: { ...l.transform },
        width: l.width,
        height: l.height,
        imageBitmap: l.imageBitmap // Reuse reference to immutable ImageBitmap
      }))
    };
  }

  restore(snapshot: DocumentModel): void {
    this.model = {
      id: snapshot.id,
      name: snapshot.name,
      width: snapshot.width,
      height: snapshot.height,
      activeLayerId: snapshot.activeLayerId,
      selection: snapshot.selection ? { ...snapshot.selection } : null,
      viewport: { ...snapshot.viewport },
      dirty: snapshot.dirty,
      layers: snapshot.layers.map(l => ({
        id: l.id,
        name: l.name,
        type: l.type,
        visible: l.visible,
        opacity: l.opacity,
        locked: l.locked,
        blendMode: l.blendMode,
        transform: { ...l.transform },
        width: l.width,
        height: l.height,
        imageBitmap: l.imageBitmap
      }))
    };
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
    // If coordinates are out of bounds, return fully transparent
    if (x < 0 || x >= this.model.width || y < 0 || y >= this.model.height) {
      return [0, 0, 0, 0];
    }

    // Dynamic color sampling from layers bottom-to-top (we compose them simple Normal blending for eyedropper)
    let composed: [number, number, number, number] = [0, 0, 0, 0];

    // Iterating backwards from bottom (index length-1) to top (index 0)
    for (let i = this.model.layers.length - 1; i >= 0; i--) {
      const layer = this.model.layers[i];
      if (!layer.visible || !layer.imageBitmap) continue;

      // Map document coordinates to layer relative coordinates
      const rx = Math.floor(x - layer.transform.x);
      const ry = Math.floor(y - layer.transform.y);

      if (rx >= 0 && rx < layer.width && ry >= 0 && ry < layer.height) {
        // Simple pixel fetch or mock return (since sync ImageBitmap reading requires canvas,
        // we can draw single pixel to tiny offscreen canvas or return a color swatch based on layer name or generic mock)
        // Let's implement single pixel offscreen draw for pixel-perfect sampling!
        try {
          const offscreen = new OffscreenCanvas(1, 1);
          const ctx = offscreen.getContext("2d");
          if (ctx) {
            ctx.drawImage(layer.imageBitmap, rx, ry, 1, 1, 0, 0, 1, 1);
            const imgData = ctx.getImageData(0, 0, 1, 1);
            const r = imgData.data[0];
            const g = imgData.data[1];
            const b = imgData.data[2];
            const a = (imgData.data[3] / 255) * layer.opacity;

            // Simple alpha blend composed and current layer
            const [cr, cg, cb, ca] = composed;
            const outA = a + ca * (1.0 - a);
            if (outA > 0) {
              const outR = Math.round((r * a + cr * ca * (1.0 - a)) / outA);
              const outG = Math.round((g * a + cg * ca * (1.0 - a)) / outA);
              const outB = Math.round((b * a + cb * ca * (1.0 - a)) / outA);
              composed = [outR, outG, outB, outA];
            }
          }
        } catch {
          // Fallback if canvas read fails
          composed = [225, 90, 23, 1.0]; // Photon Amber fallback
        }
      }
    }

    return composed;
  }
}
