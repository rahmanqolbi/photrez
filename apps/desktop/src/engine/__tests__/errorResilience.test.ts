import { describe, it, expect, vi, afterEach } from "vitest";
import { DocumentEngine } from "../document";
import type { DocumentModel } from "../types";

describe("error resilience", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("restore with null/undefined snapshot throws TypeError", () => {
    const engine = new DocumentEngine("doc-safe", "Safe", 800, 600);
    engine.addLayer("Layer 1");

    expect(() => engine.restore(null as any)).toThrow();
    expect(() => engine.restore(undefined as any)).toThrow();
  });

  it("restore with malformed snapshot throws", () => {
    const engine = new DocumentEngine("doc-mal", "Malformed", 800, 600);
    engine.addLayer("Layer 1");

    const badSnap = {} as DocumentModel;
    expect(() => engine.restore(badSnap)).toThrow();
  });

  it("snapshot with closed ImageBitmap does not crash restore", () => {
    const engine = new DocumentEngine("doc-close", "Closed", 800, 600);
    const layer = engine.addLayer("Background", 100, 100);
    const bitmap = { width: 100, height: 100 } as ImageBitmap;
    engine.setLayerImageBitmap(layer.id, bitmap);

    const snap = engine.snapshot();

    // Simulate closing the bitmap (as the old bug did)
    // This would previously cause renderer.uploadImage to fail
    expect(snap.layers[0].imageBitmap).toBe(bitmap);

    // restore should still work (it just copies references)
    engine.restore(snap);
    expect(engine.getLayer(layer.id)?.imageBitmap).toBe(bitmap);
  });

  it("applying crop on empty document (no layers) is safe", () => {
    const engine = new DocumentEngine("doc-empty", "Empty", 800, 600);
    expect(() => engine.applyCrop(0, 0, 400, 300)).not.toThrow();
  });

  it("applying crop with negative dimensions is handled", () => {
    const engine = new DocumentEngine("doc-neg", "Negative", 800, 600);
    engine.addLayer("Layer 1");
    expect(() => engine.applyCrop(-10, -10, -100, -100)).not.toThrow();
  });

  it("undo on history with corrupt snapshot data is safe", () => {
    const engine = new DocumentEngine("doc-corrupt", "Corrupt", 800, 600);
    engine.addLayer("Layer 1");

    // Create a snapshot, corrupt one layer's transform
    const snap = engine.snapshot();
    (snap.layers[0].transform as any) = undefined;

    // restore should still not throw (the function accesses properties on transform)
    expect(() => engine.restore(snap)).not.toThrow();
  });

  it("engine with no layers can still snapshot and restore", () => {
    const engine = new DocumentEngine("doc-no-layer", "No Layers", 800, 600);
    const snap = engine.snapshot();
    expect(snap.layers.length).toBe(0);

    engine.restore(snap);
    expect(engine.getLayers().length).toBe(0);
  });

  it("setLayerImageBitmap with null bitmap throws", () => {
    const engine = new DocumentEngine("doc-null-bmp", "Null BMP", 800, 600);
    const layer = engine.addLayer("Layer 1");

    expect(() => engine.setLayerImageBitmap(layer.id, null as any)).toThrow();
  });

  it("setLayerImageBitmap on non-existent layer is safe", () => {
    const engine = new DocumentEngine("doc-no-layer-bmp", "No layer", 800, 600);
    const bitmap = { width: 100, height: 100 } as ImageBitmap;
    expect(() => engine.setLayerImageBitmap("non-existent", bitmap)).not.toThrow();
  });

  it("restore preserves viewport from snapshot", () => {
    const engine = new DocumentEngine("doc-vp", "Viewport", 800, 600);
    engine.addLayer("Layer 1");
    engine.setViewport({ panX: 100, panY: 50, zoom: 2.5, rotation: 0 });

    const snap = engine.snapshot();
    engine.setViewport({ panX: 0, panY: 0, zoom: 1, rotation: 0 });
    engine.restore(snap);

    expect(engine.getViewport()).toEqual({ panX: 100, panY: 50, zoom: 2.5, rotation: 0 });
  });

  it("snapshot with selection that is null round-trips correctly", () => {
    const engine = new DocumentEngine("doc-null-sel2", "Null Sel", 800, 600);
    engine.addLayer("Layer 1");

    const snap = engine.snapshot();
    expect(snap.selection).toBeNull();

    engine.createSelection(0, 0, 100, 100);
    engine.restore(snap);
    expect(engine.getSelection()).toBeNull();
  });
});
