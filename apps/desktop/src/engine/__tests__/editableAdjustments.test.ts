import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { DocumentEngine } from "../document";
import { duplicateLayerNode } from "../layerFactory";
import { performApplyCrop } from "../cropApply";
import { createSnapshot, restoreSnapshot } from "../snapshot";

function setupOffscreenCanvasMock() {
  const MockConstructor = function (this: any, w: number, h: number) {
    this.width = w;
    this.height = h;
    this.getContext = vi.fn((type: string) => {
      if (type === "2d") {
        return {
          drawImage: vi.fn(),
          clearRect: vi.fn(),
          save: vi.fn(),
          restore: vi.fn(),
          translate: vi.fn(),
          rotate: vi.fn(),
          scale: vi.fn(),
          putImageData: vi.fn(),
          getImageData: vi.fn(() => ({
            data: new Uint8ClampedArray(w * h * 4),
          })),
        };
      }
      return null;
    });
    this.transferToImageBitmap = vi.fn(() => {
      return {
        width: this.width,
        height: this.height,
        close: vi.fn(),
      } as unknown as ImageBitmap;
    });
  };

  vi.stubGlobal("OffscreenCanvas", MockConstructor as unknown as typeof OffscreenCanvas);
}

describe("Editable Basic Adjustments", () => {
  beforeEach(() => {
    setupOffscreenCanvasMock();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it("applyBasicAdjustment caches baseImageBitmap and basicAdjustment on first adjustment", () => {
    const engine = new DocumentEngine("doc-1", "Test Doc", 100, 100);
    const layer = engine.addLayer("Layer 1");
    const initialBitmap = { width: 100, height: 100, close: vi.fn() } as unknown as ImageBitmap;
    engine.setLayerImageBitmap(layer.id, initialBitmap);

    // Initial state: no adjustments
    expect(layer.baseImageBitmap).toBeNull();
    expect(layer.basicAdjustment).toBeUndefined();

    // First adjustment
    const adj1 = { brightness: 10, contrast: 20, saturation: -30 };
    engine.applyBasicAdjustment(layer.id, adj1);

    expect(layer.baseImageBitmap).toBe(initialBitmap);
    expect(layer.basicAdjustment).toEqual(adj1);
    expect(layer.imageBitmap).not.toBe(initialBitmap);
  });

  it("subsequent applyBasicAdjustment calls run relative to the saved baseImageBitmap", () => {
    const engine = new DocumentEngine("doc-1", "Test Doc", 100, 100);
    const layer = engine.addLayer("Layer 1");
    const initialBitmap = { width: 100, height: 100, close: vi.fn() } as unknown as ImageBitmap;
    engine.setLayerImageBitmap(layer.id, initialBitmap);

    // First adjustment
    const adj1 = { brightness: 10, contrast: 20, saturation: -30 };
    engine.applyBasicAdjustment(layer.id, adj1);

    const firstResultBitmap = layer.imageBitmap;

    // Second adjustment
    const adj2 = { brightness: -10, contrast: 0, saturation: 50 };
    engine.applyBasicAdjustment(layer.id, adj2);

    // Should have updated basicAdjustment, kept baseImageBitmap the same, and closed the intermediate bitmap
    expect(layer.baseImageBitmap).toBe(initialBitmap);
    expect(layer.basicAdjustment).toEqual(adj2);
    expect(layer.imageBitmap).not.toBe(firstResultBitmap);
  });

  it("clearBasicAdjustments restores the base bitmap and resets adjustments", () => {
    const engine = new DocumentEngine("doc-1", "Test Doc", 100, 100);
    const layer = engine.addLayer("Layer 1");
    const initialBitmap = { width: 100, height: 100, close: vi.fn() } as unknown as ImageBitmap;
    engine.setLayerImageBitmap(layer.id, initialBitmap);

    // Apply adjustment
    const adj = { brightness: 10, contrast: 20, saturation: -30 };
    engine.applyBasicAdjustment(layer.id, adj);

    // Clear adjustment
    engine.clearBasicAdjustments(layer.id);

    expect(layer.imageBitmap).toBe(initialBitmap);
    expect(layer.baseImageBitmap).toBeNull();
    expect(layer.basicAdjustment).toBeUndefined();
    expect(layer.hasAdjustments).toBe(false);
  });

  it("setLayerImageBitmap bakes basicAdjustment by clearing baseImageBitmap and basicAdjustment", () => {
    const engine = new DocumentEngine("doc-1", "Test Doc", 100, 100);
    const layer = engine.addLayer("Layer 1");
    const initialBitmap = { width: 100, height: 100, close: vi.fn() } as unknown as ImageBitmap;
    engine.setLayerImageBitmap(layer.id, initialBitmap);

    // Apply adjustment
    const adj = { brightness: 10, contrast: 20, saturation: -30 };
    engine.applyBasicAdjustment(layer.id, adj);

    // Destructive overwrite
    const newBitmap = { width: 100, height: 100, close: vi.fn() } as unknown as ImageBitmap;
    engine.setLayerImageBitmap(layer.id, newBitmap);

    expect(layer.imageBitmap).toBe(newBitmap);
    expect(layer.baseImageBitmap).toBeNull();
    expect(layer.basicAdjustment).toBeUndefined();
  });

  it("duplicateLayerNode deep-copies basicAdjustment and clones baseImageBitmap", () => {
    const initialBitmap = { width: 100, height: 100, close: vi.fn() } as unknown as ImageBitmap;
    const baseBitmap = { width: 100, height: 100, close: vi.fn() } as unknown as ImageBitmap;
    const layer = {
      id: "layer-1",
      name: "Original",
      type: "raster" as const,
      visible: true,
      opacity: 1.0,
      locked: false,
      blendMode: "normal" as const,
      transform: { x: 0, y: 0, scaleX: 1, scaleY: 1, rotation: 0, flipH: false, flipV: false },
      width: 100,
      height: 100,
      imageBitmap: initialBitmap,
      baseImageBitmap: baseBitmap,
      basicAdjustment: { brightness: 10, contrast: 20, saturation: -30 },
      hasAdjustments: true,
    };

    const duplicate = duplicateLayerNode(layer);

    expect(duplicate.name).toBe("Original copy");
    expect(duplicate.basicAdjustment).toEqual(layer.basicAdjustment);
    expect(duplicate.basicAdjustment).not.toBe(layer.basicAdjustment); // deep copy
    expect(duplicate.baseImageBitmap).not.toBeNull();
    expect(duplicate.baseImageBitmap).not.toBe(layer.baseImageBitmap); // cloned
  });

  it("performApplyCrop with deleteCropped=true bakes adjustments by clearing baseImageBitmap and basicAdjustment", () => {
    const initialBitmap = { width: 100, height: 100, close: vi.fn() } as unknown as ImageBitmap;
    const baseBitmap = { width: 100, height: 100, close: vi.fn() } as unknown as ImageBitmap;
    const layers = [
      {
        id: "layer-1",
        name: "Original",
        type: "raster" as const,
        visible: true,
        opacity: 1.0,
        locked: false,
        blendMode: "normal" as const,
        transform: { x: 0, y: 0, scaleX: 1, scaleY: 1, rotation: 0, flipH: false, flipV: false },
        width: 100,
        height: 100,
        imageBitmap: initialBitmap,
        baseImageBitmap: baseBitmap,
        basicAdjustment: { brightness: 10, contrast: 20, saturation: -30 },
        hasAdjustments: true,
      },
    ];

    performApplyCrop(layers, 10, 10, 80, 80, { deleteCroppedPixels: true });

    const croppedLayer = layers[0];
    expect(croppedLayer.baseImageBitmap).toBeNull();
    expect(croppedLayer.basicAdjustment).toBeUndefined();
    expect(croppedLayer.hasAdjustments).toBe(false);
  });

  it("createSnapshot and restoreSnapshot preserve baseImageBitmap and basicAdjustment references", () => {
    const engine = new DocumentEngine("doc-1", "Test Doc", 100, 100);
    const layer = engine.addLayer("Layer 1");
    const initialBitmap = { width: 100, height: 100, close: vi.fn() } as unknown as ImageBitmap;
    engine.setLayerImageBitmap(layer.id, initialBitmap);

    // Apply adjustment
    const adj = { brightness: 10, contrast: 20, saturation: -30 };
    engine.applyBasicAdjustment(layer.id, adj);

    // Create snapshot
    const snapshot = createSnapshot(engine.snapshot());
    expect(snapshot.layers[0].basicAdjustment).toEqual(adj);
    expect(snapshot.layers[0].baseImageBitmap).toBe(initialBitmap);

    // Mutate original
    const newAdj = { brightness: 40, contrast: 50, saturation: 60 };
    engine.applyBasicAdjustment(layer.id, newAdj);

    // Restore snapshot
    const restored = restoreSnapshot(snapshot);
    expect(restored.layers[0].basicAdjustment).toEqual(adj);
    expect(restored.layers[0].baseImageBitmap).toBe(initialBitmap);
  });

  // --- Edge Case Tests ---

  it("Edge Case: applyBasicAdjustment immediately returns on locked layers", () => {
    const engine = new DocumentEngine("doc-1", "Test Doc", 100, 100);
    const layer = engine.addLayer("Layer 1");
    const initialBitmap = { width: 100, height: 100, close: vi.fn() } as unknown as ImageBitmap;
    engine.setLayerImageBitmap(layer.id, initialBitmap);
    engine.setLayerLocked(layer.id, true);

    const adj = { brightness: 10, contrast: 20, saturation: -30 };
    engine.applyBasicAdjustment(layer.id, adj);

    expect(layer.baseImageBitmap).toBeNull();
    expect(layer.basicAdjustment).toBeUndefined();
    expect(layer.imageBitmap).toBe(initialBitmap);
  });

  it("Edge Case: applyBasicAdjustment immediately returns on empty layers (null bitmap)", () => {
    const engine = new DocumentEngine("doc-1", "Test Doc", 100, 100);
    const layer = engine.addLayer("Layer 1");

    expect(layer.imageBitmap).toBeNull();

    const adj = { brightness: 10, contrast: 20, saturation: -30 };
    engine.applyBasicAdjustment(layer.id, adj);

    expect(layer.baseImageBitmap).toBeUndefined();
    expect(layer.basicAdjustment).toBeUndefined();
  });

  it("Edge Case: adjusting values back to zero resets hasAdjustments but retains baseImageBitmap", () => {
    const engine = new DocumentEngine("doc-1", "Test Doc", 100, 100);
    const layer = engine.addLayer("Layer 1");
    const initialBitmap = { width: 100, height: 100, close: vi.fn() } as unknown as ImageBitmap;
    engine.setLayerImageBitmap(layer.id, initialBitmap);

    // Adjust to non-zero
    engine.applyBasicAdjustment(layer.id, { brightness: 10, contrast: 20, saturation: -30 });
    expect(layer.hasAdjustments).toBe(true);
    expect(layer.baseImageBitmap).toBe(initialBitmap);

    // Adjust back to all zeros
    engine.applyBasicAdjustment(layer.id, { brightness: 0, contrast: 0, saturation: 0 });
    expect(layer.hasAdjustments).toBe(false);
    expect(layer.baseImageBitmap).toBe(initialBitmap); // still in the editing session
  });

  it("Edge Case: non-destructive crop does NOT bake adjustments", () => {
    const initialBitmap = { width: 100, height: 100, close: vi.fn() } as unknown as ImageBitmap;
    const baseBitmap = { width: 100, height: 100, close: vi.fn() } as unknown as ImageBitmap;
    const layers = [
      {
        id: "layer-1",
        name: "Original",
        type: "raster" as const,
        visible: true,
        opacity: 1.0,
        locked: false,
        blendMode: "normal" as const,
        transform: { x: 0, y: 0, scaleX: 1, scaleY: 1, rotation: 0, flipH: false, flipV: false },
        width: 100,
        height: 100,
        imageBitmap: initialBitmap,
        baseImageBitmap: baseBitmap,
        basicAdjustment: { brightness: 10, contrast: 20, saturation: -30 },
        hasAdjustments: true,
      },
    ];

    performApplyCrop(layers, 10, 10, 80, 80, { deleteCroppedPixels: false });

    const croppedLayer = layers[0];
    expect(croppedLayer.baseImageBitmap).toBe(baseBitmap);
    expect(croppedLayer.basicAdjustment).toEqual({ brightness: 10, contrast: 20, saturation: -30 });
    expect(croppedLayer.hasAdjustments).toBe(true);
  });
});
