import { describe, it, expect, beforeEach, vi } from "vitest";
import { addLayerFromCrossDoc, computeCascadePosition, CASCADE_OFFSET_PX } from "../crossDocLayerOps";
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
  const layerArr: any[] = Array.from({ length: layerCount }, (_, i) => ({
    id: `layer-${i}`,
    name: `Layer${i}`,
    width: 200,
    height: 150,
    transform: { x: 0, y: 0, rotation: 0, scaleX: 1, scaleY: 1 },
    opacity: 1,
  }));
  let newLayerCounter = 0;
  return {
    id,
    width,
    height,
    getLayer: vi.fn((lid: string) =>
      layerArr.find((l) => l.id === lid) ?? null
    ),
    getLayers: vi.fn(() => layerArr),
    getLayerCount: vi.fn(() => layerArr.length),
    addLayer: vi.fn((name: string) => {
      const newLayer = {
        id: `new-${++newLayerCounter}`,
        name: typeof name === "string" ? name : "Imported",
        width: 200,
        height: 150,
        transform: { x: 0, y: 0, rotation: 0, scaleX: 1, scaleY: 1 },
        opacity: 1,
      };
      layerArr.push(newLayer);
      return newLayer;
    }),
    moveLayer: vi.fn((lid: string, x: number, y: number) => {
      const l = layerArr.find((layer) => layer.id === lid);
      if (l) l.transform = { ...l.transform, x, y };
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
    sourceEngine.getLayer.mockReturnValue(null);
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
    // moveLayer called with the cursor position
    const moveArgs = targetEngine.moveLayer.mock.calls[0];
    expect(moveArgs[1]).toBe(333);
    expect(moveArgs[2]).toBe(444);
  });

  it("uses cursor pos when target is tab (Photoshop-like: user aims the landing position)", () => {
    const sourceEngine = makeEngine({ id: "doc-A" });
    const targetEngine = makeEngine({ id: "doc-B", width: 800, height: 600 });
    const ws = makeWorkspace({ "doc-A": sourceEngine, "doc-B": targetEngine });
    addLayerFromCrossDoc(basePayload, { type: "tab", docId: "doc-B" }, { x: 123, y: 456 }, ws as any);
    const moveArgs = targetEngine.moveLayer.mock.calls[0];
    expect(moveArgs[1]).toBe(123);
    expect(moveArgs[2]).toBe(456);
  });

  it("uses doc center when target is layers-panel", () => {
    const sourceEngine = makeEngine({ id: "doc-A" });
    const targetEngine = makeEngine({ id: "doc-B", width: 1000, height: 800 });
    const ws = makeWorkspace({ "doc-A": sourceEngine, "doc-B": targetEngine });
    addLayerFromCrossDoc(basePayload, { type: "layers-panel" }, { x: 0, y: 0 }, ws as any);
    const moveArgs = targetEngine.moveLayer.mock.calls[0];
    expect(moveArgs[1]).toBe(400);
    expect(moveArgs[2]).toBe(325);
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
