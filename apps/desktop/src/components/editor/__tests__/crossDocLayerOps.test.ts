import { describe, it, expect, beforeEach, vi } from "vitest";
import { addLayerFromCrossDoc, computeCascadePosition, CASCADE_OFFSET_PX } from "../crossDocLayerOps";
import type { BlendMode, LayerNode } from "@/engine/types";
import type { LayerDragPayload } from "../dragTypes";
import { resetToasts } from "../Toast";

const mockShowToast = vi.fn();

vi.mock(import("../Toast"), async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    showToast: (msg: string, severity: "info" | "warn" | "error" = "info") =>
      mockShowToast(msg, severity),
  };
});

const basePayload: LayerDragPayload = {
  version: 1,
  sourceDocId: "doc-A",
  layerId: "layer-1",
  sourceName: "Background",
  isAltPressed: false,
};

function makeEngine(opts: { id: string; layerCount?: number; width?: number; height?: number } = { id: "doc-A" }) {
  const id = opts.id;
  const width = opts.width ?? 800;
  const height = opts.height ?? 600;
  const layerCount = opts.layerCount ?? 3;
  const layerArr: LayerNode[] = Array.from({ length: layerCount }, (_, i) => ({
    id: `layer-${i}`,
    name: `Layer${i}`,
    type: "raster" as const,
    visible: true,
    locked: false,
    blendMode: "normal" as BlendMode,
    width: 200,
    height: 150,
    transform: { x: 0, y: 0, rotation: 0, scaleX: 1, scaleY: 1, flipH: false, flipV: false },
    opacity: 1,
    imageBitmap: null,
  }));
  let newLayerCounter = 0;
  return {
    id,
    width,
    height,
    getWidth: vi.fn(() => width),
    getHeight: vi.fn(() => height),
    getLayer: vi.fn((lid: string) =>
      layerArr.find((l) => l.id === lid)
    ),
    getLayers: vi.fn(() => layerArr),
    getLayerCount: vi.fn(() => layerArr.length),
    addLayer: vi.fn((name: string, layerWidth = 200, layerHeight = 150) => {
      const newLayer = {
        id: `new-${++newLayerCounter}`,
        name: typeof name === "string" ? name : "Imported",
        type: "raster" as const,
        visible: true,
        locked: false,
        blendMode: "normal" as BlendMode,
        width: layerWidth,
        height: layerHeight,
        transform: { x: 0, y: 0, rotation: 0, scaleX: 1, scaleY: 1, flipH: false, flipV: false },
        opacity: 1,
        imageBitmap: null,
      };
      layerArr.push(newLayer);
      return newLayer;
    }),
    moveLayer: vi.fn((lid: string, x: number, y: number) => {
      const l = layerArr.find((layer) => layer.id === lid);
      if (l) l.transform = { ...l.transform, x, y };
    }),
    transformLayer: vi.fn((lid: string, transform) => {
      const l = layerArr.find((layer) => layer.id === lid);
      if (l) l.transform = { ...l.transform, ...transform };
    }),
    setLayerOpacity: vi.fn((lid: string, opacity: number) => {
      const l = layerArr.find((layer) => layer.id === lid);
      if (l) l.opacity = opacity;
    }),
    setLayerBlendMode: vi.fn((lid: string, blendMode: BlendMode) => {
      const l = layerArr.find((layer) => layer.id === lid);
      if (l) l.blendMode = blendMode;
    }),
    setLayerVisibility: vi.fn((lid: string, visible: boolean) => {
      const l = layerArr.find((layer) => layer.id === lid);
      if (l) l.visible = visible;
    }),
    setLayerLocked: vi.fn((lid: string, locked: boolean) => {
      const l = layerArr.find((layer) => layer.id === lid);
      if (l) l.locked = locked;
    }),
    setLayerImageBitmap: vi.fn((lid: string, imageBitmap: ImageBitmap) => {
      const l = layerArr.find((layer) => layer.id === lid);
      if (l) l.imageBitmap = imageBitmap;
    }),
    deleteLayer: vi.fn((lid: string) => {
      const idx = layerArr.findIndex((l) => l.id === lid);
      if (idx >= 0) layerArr.splice(idx, 1);
    }),
    snapshot: vi.fn(() => ({})),
  };
}

function makeWorkspace(engines: Record<string, any>) {
  return {
    getEngine: vi.fn((id: string) => engines[id] ?? null),
    getHistory: vi.fn(() => ({ commit: vi.fn() })),
    getActiveDocumentId: vi.fn(() => "doc-B"),
    isFull: vi.fn(() => false),
  };
}

describe("addLayerFromCrossDoc — copy (default)", () => {
  beforeEach(() => {
    mockShowToast.mockClear();
    resetToasts();
  });

  it("adds a cloned layer to target doc", () => {
    const sourceEngine = makeEngine({ id: "doc-A" });
    const targetEngine = makeEngine({ id: "doc-B" });
    const ws = makeWorkspace({ "doc-A": sourceEngine, "doc-B": targetEngine });

    addLayerFromCrossDoc(basePayload, { type: "canvas" }, { x: 200, y: 200 }, ws as any);

    expect(targetEngine.addLayer).toHaveBeenCalledOnce();
    expect(sourceEngine.deleteLayer).not.toHaveBeenCalled();
  });
});

describe("addLayerFromCrossDoc — move (Alt+drag)", () => {
  beforeEach(() => {
    mockShowToast.mockClear();
    resetToasts();
  });

  it("adds to target AND deletes from source", () => {
    const sourceEngine = makeEngine({ id: "doc-A" });
    const targetEngine = makeEngine({ id: "doc-B" });
    const ws = makeWorkspace({ "doc-A": sourceEngine, "doc-B": targetEngine });

    addLayerFromCrossDoc({ ...basePayload, isAltPressed: true }, { type: "canvas" }, { x: 100, y: 100 }, ws as any);

    expect(targetEngine.addLayer).toHaveBeenCalledOnce();
    expect(sourceEngine.deleteLayer).toHaveBeenCalledWith("layer-1");
  });

  it("aborts Alt-move when source only has one layer", () => {
    const sourceEngine = makeEngine({ id: "doc-A", layerCount: 1 });
    const targetEngine = makeEngine({ id: "doc-B" });
    const ws = makeWorkspace({ "doc-A": sourceEngine, "doc-B": targetEngine });

    const result = addLayerFromCrossDoc(
      { ...basePayload, layerId: "layer-0", isAltPressed: true },
      { type: "canvas" },
      { x: 100, y: 100 },
      ws as any
    );

    expect(result.newLayerId).toBeNull();
    expect(targetEngine.addLayer).not.toHaveBeenCalled();
    expect(sourceEngine.deleteLayer).not.toHaveBeenCalled();
    expect(mockShowToast).toHaveBeenCalledWith(expect.stringContaining("last layer"), "error");
  });
});

describe("addLayerFromCrossDoc — validation", () => {
  beforeEach(() => {
    mockShowToast.mockClear();
    resetToasts();
  });

  it("no-op on same-doc drop", () => {
    const engine = makeEngine({ id: "doc-A" });
    const ws = makeWorkspace({ "doc-A": engine });
    addLayerFromCrossDoc(basePayload, { type: "canvas" }, { x: 0, y: 0 }, ws as any);
    expect(engine.addLayer).not.toHaveBeenCalled();
  });

  it("error toast + abort when source doc missing", () => {
    const ws = makeWorkspace({});
    addLayerFromCrossDoc(basePayload, { type: "canvas" }, { x: 0, y: 0 }, ws as any);
    expect(mockShowToast).toHaveBeenCalledWith(expect.stringContaining("closed"), "error");
  });

  it("error toast + abort when source layer missing", () => {
    const sourceEngine = makeEngine({ id: "doc-A" });
    sourceEngine.getLayer.mockReturnValue(undefined);
    const targetEngine = makeEngine({ id: "doc-B" });
    const ws = makeWorkspace({ "doc-A": sourceEngine, "doc-B": targetEngine });
    addLayerFromCrossDoc(basePayload, { type: "canvas" }, { x: 0, y: 0 }, ws as any);
    expect(mockShowToast).toHaveBeenCalledWith(expect.stringContaining("deleted"), "error");
    expect(targetEngine.addLayer).not.toHaveBeenCalled();
  });

  it("error toast + abort when target has MAX_LAYERS", () => {
    const sourceEngine = makeEngine({ id: "doc-A" });
    const targetEngine = makeEngine({ id: "doc-B", layerCount: 100 });
    const ws = makeWorkspace({ "doc-A": sourceEngine, "doc-B": targetEngine });
    addLayerFromCrossDoc(basePayload, { type: "canvas" }, { x: 0, y: 0 }, ws as any);
    expect(mockShowToast).toHaveBeenCalledWith(expect.stringContaining("100"), "error");
  });
});

describe("addLayerFromCrossDoc — position", () => {
  beforeEach(() => {
    mockShowToast.mockClear();
    resetToasts();
  });

  it("uses cursor pos when target is canvas", () => {
    const sourceEngine = makeEngine({ id: "doc-A" });
    const targetEngine = makeEngine({ id: "doc-B" });
    const ws = makeWorkspace({ "doc-A": sourceEngine, "doc-B": targetEngine });
    addLayerFromCrossDoc(basePayload, { type: "canvas" }, { x: 333, y: 444 }, ws as any);
    const transform = targetEngine.transformLayer.mock.calls[0][1];
    expect(transform.x).toBe(333);
    expect(transform.y).toBe(444);
  });

  it("uses cursor pos when target is tab (Photoshop-like: user aims the landing position)", () => {
    const sourceEngine = makeEngine({ id: "doc-A" });
    const targetEngine = makeEngine({ id: "doc-B", width: 800, height: 600 });
    const ws = makeWorkspace({ "doc-A": sourceEngine, "doc-B": targetEngine });
    addLayerFromCrossDoc(basePayload, { type: "tab", docId: "doc-B" }, { x: 123, y: 456 }, ws as any);
    const transform = targetEngine.transformLayer.mock.calls[0][1];
    expect(transform.x).toBe(123);
    expect(transform.y).toBe(456);
  });

  it("uses doc center when target is layers-panel", () => {
    const sourceEngine = makeEngine({ id: "doc-A" });
    const targetEngine = makeEngine({ id: "doc-B", width: 1000, height: 800 });
    const ws = makeWorkspace({ "doc-A": sourceEngine, "doc-B": targetEngine });
    addLayerFromCrossDoc(basePayload, { type: "layers-panel" }, { x: 0, y: 0 }, ws as any);
    const transform = targetEngine.transformLayer.mock.calls[0][1];
    expect(transform.x).toBe(400);
    expect(transform.y).toBe(325);
  });
});

describe("addLayerFromCrossDoc — return value", () => {
  beforeEach(() => {
    mockShowToast.mockClear();
    resetToasts();
  });

  it("returns the new layer id on success (hook needs it to upload bitmap)", () => {
    const sourceEngine = makeEngine({ id: "doc-A" });
    const targetEngine = makeEngine({ id: "doc-B" });
    const ws = makeWorkspace({ "doc-A": sourceEngine, "doc-B": targetEngine });

    const result = addLayerFromCrossDoc(
      basePayload,
      { type: "tab", docId: "doc-B" },
      { x: 100, y: 100 },
      ws as any
    );

    expect(result.newLayerId).toBeTruthy();
    expect(result.newLayerId).toBe("new-1");
  });

  it("returns null newLayerId when source doc missing", () => {
    const ws = makeWorkspace({});
    const result = addLayerFromCrossDoc(
      basePayload,
      { type: "canvas" },
      { x: 0, y: 0 },
      ws as any
    );
    expect(result.newLayerId).toBeNull();
  });

  it("returns null newLayerId on same-doc drop", () => {
    const engine = makeEngine({ id: "doc-A" });
    const ws = makeWorkspace({ "doc-A": engine });
    const result = addLayerFromCrossDoc(
      basePayload,
      { type: "canvas" },
      { x: 0, y: 0 },
      ws as any
    );
    expect(result.newLayerId).toBeNull();
  });
});
