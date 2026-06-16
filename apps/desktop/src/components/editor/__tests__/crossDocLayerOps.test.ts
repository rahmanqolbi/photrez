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
  return {
    id,
    width,
    height,
    getLayer: vi.fn((lid: string) =>
      lid === "layer-1"
        ? { id: "layer-1", name: "Background", width: 200, height: 150, transform: { x: 0, y: 0, rotation: 0, scaleX: 1, scaleY: 1 }, opacity: 1 }
        : null
    ),
    getLayerCount: vi.fn(() => layerCount),
    addLayer: vi.fn(),
    deleteLayer: vi.fn(),
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
    const added = targetEngine.addLayer.mock.calls[0][0];
    expect(added.transform.x).toBe(333);
    expect(added.transform.y).toBe(444);
  });

  it("uses doc center when target is tab", () => {
    const sourceEngine = makeEngine({ id: "doc-A" });
    const targetEngine = makeEngine({ id: "doc-B", width: 800, height: 600 });
    const ws = makeWorkspace({ "doc-A": sourceEngine, "doc-B": targetEngine });
    addLayerFromCrossDoc(basePayload, { type: "tab", docId: "doc-B" }, { x: 0, y: 0 }, ws as any);
    const added = targetEngine.addLayer.mock.calls[0][0];
    expect(added.transform.x).toBe(300);
    expect(added.transform.y).toBe(225);
  });

  it("uses doc center when target is layers-panel", () => {
    const sourceEngine = makeEngine({ id: "doc-A" });
    const targetEngine = makeEngine({ id: "doc-B", width: 1000, height: 800 });
    const ws = makeWorkspace({ "doc-A": sourceEngine, "doc-B": targetEngine });
    addLayerFromCrossDoc(basePayload, { type: "layers-panel" }, { x: 0, y: 0 }, ws as any);
    const added = targetEngine.addLayer.mock.calls[0][0];
    expect(added.transform.x).toBe(400);
    expect(added.transform.y).toBe(325);
  });
});
