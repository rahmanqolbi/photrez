import { describe, it, expect, vi } from "vitest";
import { DocumentEngine } from "../document";
import { CommandHistory } from "../history";
import { WorkspaceManager, type DocumentSession } from "../workspace";

describe("undo edge cases", () => {
  it("brush stroke then undo restores original bitmap reference", () => {
    const engine = new DocumentEngine("doc-brush", "Brush", 800, 600);
    const layer = engine.addLayer("Background", 100, 100);
    const originalBitmap = { width: 100, height: 100 } as ImageBitmap;
    engine.setLayerImageBitmap(layer.id, originalBitmap);

    const history = new CommandHistory();
    history.commit(engine.snapshot());

    // Simulate brush: replace bitmap with new one
    const newBitmap = { width: 100, height: 100 } as ImageBitmap;
    engine.setLayerImageBitmap(layer.id, newBitmap);
    expect(engine.getLayer(layer.id)!.imageBitmap).toBe(newBitmap);

    // Undo: should restore original bitmap
    const prev = history.undo(engine.snapshot());
    engine.restore(prev!);
    expect(engine.getLayer(layer.id)!.imageBitmap).toBe(originalBitmap);
  });

  it("multi-layer: crop offsets all layers, undo restores all", () => {
    const engine = new DocumentEngine("doc-multi", "Multi", 800, 600);
    const bg = engine.addLayer("Background");
    const overlay = engine.addLayer("Overlay");
    overlay.transform.x = 200;
    overlay.transform.y = 150;

    const history = new CommandHistory();
    history.commit(engine.snapshot());

    engine.applyCrop(50, 30, 400, 300);

    expect(bg.transform.x).toBe(-50);
    expect(bg.transform.y).toBe(-30);

    const prev = history.undo(engine.snapshot());
    engine.restore(prev!);

    const bgAfter = engine.getLayers().find(l => l.id === bg.id)!;
    const overlayAfter = engine.getLayers().find(l => l.id === overlay.id)!;
    expect(bgAfter.transform.x).toBe(0);
    expect(bgAfter.transform.y).toBe(0);
    expect(overlayAfter.transform.x).toBe(200);
    expect(overlayAfter.transform.y).toBe(150);
  });

  it("multi-layer: bitmap references preserved through crop undo", () => {
    const engine = new DocumentEngine("doc-multi-bmp", "Multi BMP", 400, 400);
    const bg = engine.addLayer("Background", 400, 400);
    const fg = engine.addLayer("Foreground", 100, 100);
    fg.transform.x = 50;
    fg.transform.y = 50;

    const bgBitmap = { width: 400, height: 400 } as ImageBitmap;
    const fgBitmap = { width: 100, height: 100 } as ImageBitmap;
    engine.setLayerImageBitmap(bg.id, bgBitmap);
    engine.setLayerImageBitmap(fg.id, fgBitmap);

    const history = new CommandHistory();
    history.commit(engine.snapshot());

    engine.applyCrop(50, 50, 200, 200);

    const prev = history.undo(engine.snapshot());
    engine.restore(prev!);

    expect(engine.getLayer(bg.id)!.imageBitmap).toBe(bgBitmap);
    expect(engine.getLayer(fg.id)!.imageBitmap).toBe(fgBitmap);
  });

  it("snapshot -> applyCrop -> snapshot -> undo -> undo", () => {
    const engine = new DocumentEngine("doc-stack", "Stack", 800, 600);
    const layer = engine.addLayer("Layer 1");
    const history = new CommandHistory();

    // State 0: initial
    history.commit(engine.snapshot());

    // State 1: after first crop
    engine.applyCrop(0, 0, 600, 400);
    history.commit(engine.snapshot());

    // State 2: after second crop (current)
    engine.applyCrop(0, 0, 300, 200);

    // Undo once: back to state 1 (600x400)
    const u1 = history.undo(engine.snapshot());
    engine.restore(u1!);
    expect(engine.getWidth()).toBe(600);
    expect(engine.getHeight()).toBe(400);

    // Undo twice: back to state 0 (800x600)
    const u2 = history.undo(engine.snapshot());
    engine.restore(u2!);
    expect(engine.getWidth()).toBe(800);
    expect(engine.getHeight()).toBe(600);
  });

  it("workspace multi-document undo isolation", () => {
    const ws = new WorkspaceManager();
    const doc1 = WorkspaceManager.createBlankDocument("doc-a", "Doc A", 800, 600);
    const doc2 = WorkspaceManager.createBlankDocument("doc-b", "Doc B", 400, 300);
    ws.addDocument(doc1);
    ws.addDocument(doc2);

    ws.switchDocument("doc-a");
    const h1 = ws.getActiveHistory()!;
    const e1 = ws.getActiveEngine()!;

    h1.commit(e1.snapshot());
    e1.applyCrop(0, 0, 400, 200);
    expect(e1.getWidth()).toBe(400);

    // Switch to doc B (undo stack is isolated)
    ws.switchDocument("doc-b");
    const e2 = ws.getActiveEngine()!;
    expect(e2.getWidth()).toBe(400); // original size, unchanged
    expect(e2.getHeight()).toBe(300);

    // Switch back to doc A
    ws.switchDocument("doc-a");
    const h1again = ws.getActiveHistory()!;
    const e1again = ws.getActiveEngine()!;
    expect(e1again.getWidth()).toBe(400); // still cropped

    // Undo doc A independently
    const prev = h1again.undo(e1again.snapshot());
    e1again.restore(prev!);
    expect(e1again.getWidth()).toBe(800); // restored

    // Doc B should still be at original size
    ws.switchDocument("doc-b");
    expect(ws.getActiveEngine()!.getWidth()).toBe(400);
  });

  it("layer delete + undo restores layer with properties", () => {
    const engine = new DocumentEngine("doc-del-restore", "Delete Restore", 800, 600);
    const l1 = engine.addLayer("Layer 1");
    const l2 = engine.addLayer("Layer 2");
    l2.opacity = 0.5;
    l2.transform.x = 100;

    const history = new CommandHistory();
    history.commit(engine.snapshot());

    engine.deleteLayer(l2.id);
    expect(engine.getLayers().length).toBe(1);

    const prev = history.undo(engine.snapshot());
    engine.restore(prev!);
    expect(engine.getLayers().length).toBe(2);

    const restoredLayer = engine.getLayers().find(l => l.id === l2.id);
    expect(restoredLayer).not.toBeUndefined();
    expect(restoredLayer!.opacity).toBe(0.5);
    expect(restoredLayer!.transform.x).toBe(100);
  });

  it("layer reorder + undo restores original order", () => {
    const engine = new DocumentEngine("doc-reorder", "Reorder", 800, 600);
    engine.addLayer("Bottom");
    engine.addLayer("Middle");
    engine.addLayer("Top");
    // Initial order: Top (idx 2), Middle (idx 1), Bottom (idx 0)

    const history = new CommandHistory();
    history.commit(engine.snapshot());

    engine.reorderLayer(2, 0); // Move Top to bottom (index 0)
    expect(engine.getLayers().map(l => l.name)).toEqual(["Bottom", "Top", "Middle"]);

    const prev = history.undo(engine.snapshot());
    engine.restore(prev!);
    expect(engine.getLayers().map(l => l.name)).toEqual(["Top", "Middle", "Bottom"]);
  });
});
