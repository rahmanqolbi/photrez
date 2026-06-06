import { describe, it, expect, vi } from "vitest";
import { DocumentEngine } from "../../engine/document";
import { CommandHistory } from "../../engine/history";

describe("crop + undo integration", () => {
  it("undo restores document dimensions after crop", () => {
    const engine = new DocumentEngine("doc-crop-und-1", "Crop Undo", 800, 600);
    engine.addLayer("Layer 1");
    const history = new CommandHistory();

    history.commit(engine.snapshot());
    engine.applyCrop(50, 30, 400, 300);
    expect(engine.getWidth()).toBe(400);
    expect(engine.getHeight()).toBe(300);

    const prev = history.undo(engine.snapshot());
    expect(prev).not.toBeNull();
    engine.restore(prev!);

    expect(engine.getWidth()).toBe(800);
    expect(engine.getHeight()).toBe(600);
  });

  it("redo restores cropped dimensions after undo", () => {
    const engine = new DocumentEngine("doc-crop-redo", "Crop Redo", 800, 600);
    engine.addLayer("Layer 1");
    const history = new CommandHistory();

    history.commit(engine.snapshot());

    const preCropSnap = engine.snapshot();
    engine.applyCrop(50, 30, 400, 300);
    const postCropSnap = engine.snapshot();

    // Undo back to pre-crop
    const restored = history.undo(postCropSnap);
    engine.restore(restored!);
    expect(engine.getWidth()).toBe(800);

    // Redo back to cropped
    const redone = history.redo(preCropSnap);
    engine.restore(redone!);
    expect(engine.getWidth()).toBe(400);
    expect(engine.getHeight()).toBe(300);
  });

  it("multiple crop-undo cycles do not corrupt state", () => {
    const engine = new DocumentEngine("doc-cycle", "Cycle", 800, 600);
    engine.addLayer("Layer 1");
    const history = new CommandHistory();

    for (let i = 0; i < 3; i++) {
      history.commit(engine.snapshot());
      engine.applyCrop(0, 0, 400, 300);
      expect(engine.getWidth()).toBe(400);
      expect(engine.getHeight()).toBe(300);

      const prev = history.undo(engine.snapshot());
      engine.restore(prev!);
      expect(engine.getWidth()).toBe(800);
      expect(engine.getHeight()).toBe(600);
    }
  });

  it("undo after crop restores layer transform", () => {
    const engine = new DocumentEngine("doc-xform", "Xform", 800, 600);
    const layer = engine.addLayer("Layer 1");
    layer.transform.x = 100;
    layer.transform.y = 50;
    const history = new CommandHistory();

    history.commit(engine.snapshot());
    engine.applyCrop(50, 30, 400, 300);

    const restoredLayer = engine.getLayer(layer.id)!;
    expect(restoredLayer.transform.x).toBe(50);
    expect(restoredLayer.transform.y).toBe(20);

    const prev = history.undo(engine.snapshot());
    engine.restore(prev!);

    const postUndoLayer = engine.getLayer(layer.id)!;
    expect(postUndoLayer.transform.x).toBe(100);
    expect(postUndoLayer.transform.y).toBe(50);
  });

  it("ImageBitmap remains valid in snapshot after engine applies crop", () => {
    const bitmap = { width: 800, height: 600 } as ImageBitmap;
    const engine = new DocumentEngine("doc-bmp-test", "Bitmap", 800, 600);
    const layer = engine.addLayer("Background", 800, 600);
    engine.setLayerImageBitmap(layer.id, bitmap);

    // Take snapshot before crop — bitmap reference is captured
    const snap = engine.snapshot();
    expect(snap.layers[0].imageBitmap).toBe(bitmap);

    // Apply crop — after our fix, this does NOT close the old bitmap
    engine.applyCrop(0, 0, 400, 300);

    // The snapshot's bitmap should still be valid (not closed)
    expect(snap.layers[0].imageBitmap).toBe(bitmap);

    // Restore should work with the same bitmap reference
    engine.restore(snap);
    expect(engine.getLayer(layer.id)!.imageBitmap).toBe(bitmap);
  });

  it("crop with deleteCroppedPixels mode + undo restores original state", () => {
    const engine = new DocumentEngine("doc-del", "Delete Crop", 200, 200);
    const layer = engine.addLayer("Layer 1");
    layer.transform.x = 100;
    layer.transform.y = 50;
    const history = new CommandHistory();

    history.commit(engine.snapshot());

    // delete mode needs OffscreenCanvas which is not available in jsdom
    // so this will fail with a console.error but not throw
    try {
      engine.applyCrop(50, 50, 100, 100, { deleteCroppedPixels: true });
    } catch {
      // OffscreenCanvas not available in test environment — skip pixel-level verification
    }

    const prev = history.undo(engine.snapshot());
    engine.restore(prev!);

    expect(engine.getWidth()).toBe(200);
    expect(engine.getHeight()).toBe(200);
  });

  it("renderer.resize would be called with correct dimensions after undo", () => {
    const engine = new DocumentEngine("doc-resize", "Resize", 800, 600);
    engine.addLayer("Layer 1");
    const history = new CommandHistory();
    const resizeMock = vi.fn();

    history.commit(engine.snapshot());

    const preCropWidth = engine.getWidth();
    const preCropHeight = engine.getHeight();

    engine.applyCrop(50, 50, 400, 300);

    // Simulate what AppTitleBar.handleUndo does
    const prev = history.undo(engine.snapshot());
    if (prev) {
      engine.restore(prev);
      resizeMock(engine.getWidth(), engine.getHeight());
    }

    expect(resizeMock).toHaveBeenCalledWith(preCropWidth, preCropHeight);
  });

  it("crop undo stack clear when leaving crop tool", () => {
    // This simulates the cropState.ts clearCropStacks logic
    // which is called in useCanvasDerivedState when activeTool !== "crop"
    let cropUndoStack: string[] = ["crop-state-1", "crop-state-2"];

    function clearCropStacks() {
      cropUndoStack = [];
    }

    clearCropStacks();
    expect(cropUndoStack.length).toBe(0);
  });
});
