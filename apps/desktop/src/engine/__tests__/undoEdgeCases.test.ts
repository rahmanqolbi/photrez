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

  // ────────────────────────────────────────────────────────────────────
  // MOVE TOOL UNDO/REDO TESTS
  // ────────────────────────────────────────────────────────────────────

  describe("move tool undo/redo — transform-only operations", () => {
    const get = (engine: DocumentEngine, layerId: string) => engine.getLayer(layerId)!;

    it("move layer then undo restores original position", () => {
      const engine = new DocumentEngine("doc-move", "Move", 800, 600);
      const layer = engine.addLayer("Layer 1");
      const history = new CommandHistory();

      history.commit(engine.snapshot(), "Move Layer");
      engine.moveLayer(layer.id, 100, 200);
      expect(engine.getLayer(layer.id)!.transform.x).toBe(100);

      const prev = history.undo(engine.snapshot());
      engine.restore(prev!);
      expect(get(engine, layer.id).transform.x).toBe(0);
      expect(get(engine, layer.id).transform.y).toBe(0);
    });

    it("move layer then undo then redo restores moved position", () => {
      const engine = new DocumentEngine("doc-move-redo", "Move Redo", 800, 600);
      const layer = engine.addLayer("Layer 1");
      const history = new CommandHistory();

      const preMoveSnap = engine.snapshot();
      history.commit(preMoveSnap, "Move Layer");
      engine.moveLayer(layer.id, 50, -30);
      const postMoveSnap = engine.snapshot();

      const undone = history.undo(postMoveSnap);
      engine.restore(undone!);
      expect(get(engine, layer.id).transform.x).toBe(0);
      expect(get(engine, layer.id).transform.y).toBe(0);

      const redone = history.redo(preMoveSnap);
      engine.restore(redone!);
      expect(get(engine, layer.id).transform.x).toBe(50);
      expect(get(engine, layer.id).transform.y).toBe(-30);
    });

    it("resize then undo restores original scale", () => {
      const engine = new DocumentEngine("doc-resize", "Resize", 800, 600);
      const layer = engine.addLayer("Layer 1");
      const history = new CommandHistory();

      history.commit(engine.snapshot(), "Resize Layer");
      engine.transformLayer(layer.id, { scaleX: 2, scaleY: 1.5 });
      expect(engine.getLayer(layer.id)!.transform.scaleX).toBe(2);

      const prev = history.undo(engine.snapshot());
      engine.restore(prev!);
      expect(get(engine, layer.id).transform.scaleX).toBe(1);
      expect(get(engine, layer.id).transform.scaleY).toBe(1);
    });

    it("rotate then undo restores original rotation", () => {
      const engine = new DocumentEngine("doc-rot", "Rotate", 800, 600);
      const layer = engine.addLayer("Layer 1");
      const history = new CommandHistory();

      history.commit(engine.snapshot(), "Rotate Layer");
      engine.transformLayer(layer.id, { rotation: 45 });
      expect(engine.getLayer(layer.id)!.transform.rotation).toBe(45);

      const prev = history.undo(engine.snapshot());
      engine.restore(prev!);
      expect(get(engine, layer.id).transform.rotation).toBe(0);
    });

    it("multi-property transform then undo restores all original values", () => {
      const engine = new DocumentEngine("doc-multi-xform", "Multi Xform", 800, 600);
      const layer = engine.addLayer("Layer 1");
      const ref = engine.getLayer(layer.id)!;
      ref.transform.x = 10;
      ref.transform.y = 20;
      ref.transform.scaleX = 1.5;
      const history = new CommandHistory();

      history.commit(engine.snapshot(), "Transform Layer");
      engine.transformLayer(layer.id, {
        x: 100, y: 200, scaleX: 2, scaleY: 0.5, rotation: 90,
      });

      const prev = history.undo(engine.snapshot());
      engine.restore(prev!);

      const restored = get(engine, layer.id);
      expect(restored.transform.x).toBe(10);
      expect(restored.transform.y).toBe(20);
      expect(restored.transform.scaleX).toBe(1.5);
      expect(restored.transform.scaleY).toBe(1);
      expect(restored.transform.rotation).toBe(0);
    });
  });

  // ────────────────────────────────────────────────────────────────────
  // SELECTION TOOL UNDO/REDO TESTS
  // ────────────────────────────────────────────────────────────────────

  describe("selection tool undo/redo", () => {
    it("create selection then undo deselects", () => {
      const engine = new DocumentEngine("doc-sel-create", "Sel Create", 800, 600);
      engine.addLayer("Layer 1");
      const history = new CommandHistory();

      history.commit(engine.snapshot());
      engine.createSelection(10, 20, 100, 200);

      expect(engine.getSelection()).toEqual({ x: 10, y: 20, width: 100, height: 200, angle: 0 });

      const prev = history.undo(engine.snapshot());
      engine.restore(prev!);
      expect(engine.getSelection()).toBeNull();
    });

    it("move selection then undo restores original position", () => {
      const engine = new DocumentEngine("doc-sel-move", "Sel Move", 800, 600);
      engine.addLayer("Layer 1");
      engine.createSelection(50, 50, 100, 100);
      const history = new CommandHistory();

      // Simulate selection move: commit before move, update after
      history.commit(engine.snapshot(), "Move Selection");
      engine.createSelection(150, 80, 100, 100);

      expect(engine.getSelection()!.x).toBe(150);
      expect(engine.getSelection()!.y).toBe(80);

      const prev = history.undo(engine.snapshot());
      engine.restore(prev!);
      expect(engine.getSelection()!.x).toBe(50);
      expect(engine.getSelection()!.y).toBe(50);
    });

    it("rotate selection then undo restores original angle", () => {
      const engine = new DocumentEngine("doc-sel-rot", "Sel Rot", 800, 600);
      engine.addLayer("Layer 1");
      engine.createSelection(0, 0, 200, 100, 0);
      const history = new CommandHistory();

      history.commit(engine.snapshot(), "Rotate Selection");
      engine.createSelection(0, 0, 200, 100, 45);

      expect(engine.getSelection()!.angle).toBe(45);

      const prev = history.undo(engine.snapshot());
      engine.restore(prev!);
      expect(engine.getSelection()!.angle).toBe(0);
    });

    it("select all + clear then undo restores select-all", () => {
      const engine = new DocumentEngine("doc-sel-all", "Sel All", 800, 600);
      engine.addLayer("Layer 1");
      engine.selectAll();
      const history = new CommandHistory();

      history.commit(engine.snapshot());
      engine.clearSelection();
      expect(engine.getSelection()).toBeNull();

      const prev = history.undo(engine.snapshot());
      engine.restore(prev!);
      expect(engine.getSelection()).toEqual({ x: 0, y: 0, width: 800, height: 600, angle: 0 });
    });
  });

  // ────────────────────────────────────────────────────────────────────
  // CROP TOOL UNDO/REDO TESTS
  // ────────────────────────────────────────────────────────────────────

  describe("crop tool undo/redo", () => {
    const get = (engine: DocumentEngine, layerId: string) => engine.getLayer(layerId)!;

    it("applyCrop then undo restores document dimensions and layer transforms", () => {
      const engine = new DocumentEngine("doc-crop-undo", "Crop Undo", 800, 600);
      const layer = engine.addLayer("Layer 1");
      engine.getLayer(layer.id)!.transform.x = 100;
      engine.getLayer(layer.id)!.transform.y = 50;
      const history = new CommandHistory();

      history.commit(engine.snapshot(), "Crop Canvas");
      engine.applyCrop(50, 30, 400, 300);
      expect(engine.getWidth()).toBe(400);
      expect(engine.getHeight()).toBe(300);

      const prev = history.undo(engine.snapshot());
      engine.restore(prev!);

      expect(engine.getWidth()).toBe(800);
      expect(engine.getHeight()).toBe(600);
      expect(get(engine, layer.id).transform.x).toBe(100);
      expect(get(engine, layer.id).transform.y).toBe(50);
    });

    it("crop + undo + redo round-trips correctly", () => {
      const engine = new DocumentEngine("doc-crop-round", "Crop Round", 800, 600);
      engine.addLayer("Layer 1");
      const history = new CommandHistory();

      history.commit(engine.snapshot(), "Crop Canvas");
      const preCropSnap = engine.snapshot();
      engine.applyCrop(50, 50, 400, 300);
      expect(engine.getWidth()).toBe(400);

      const undone = history.undo(engine.snapshot());
      engine.restore(undone!);
      expect(engine.getWidth()).toBe(800);

      const redone = history.redo(preCropSnap);
      engine.restore(redone!);
      expect(engine.getWidth()).toBe(400);
    });

    it("multiple crop-undo cycles do not corrupt layer transforms", () => {
      const engine = new DocumentEngine("doc-cycle-xform", "Cycle Xform", 800, 600);
      const layer = engine.addLayer("Layer 1");
      engine.getLayer(layer.id)!.transform.x = 100;
      engine.getLayer(layer.id)!.transform.y = 50;
      const history = new CommandHistory();

      for (let i = 0; i < 3; i++) {
        history.commit(engine.snapshot());
        engine.applyCrop(10, 10, 400, 300);
        expect(engine.getWidth()).toBe(400);

        const prev = history.undo(engine.snapshot());
        engine.restore(prev!);
        expect(engine.getWidth()).toBe(800);
        expect(get(engine, layer.id).transform.x).toBe(100);
        expect(get(engine, layer.id).transform.y).toBe(50);
      }
    });
  });

  // ────────────────────────────────────────────────────────────────────
  // MULTI-CYCLE UNDO/REDO TESTS
  // ────────────────────────────────────────────────────────────────────

  describe("multi-cycle undo/redo across tools", () => {
    const g = (engine: DocumentEngine, layerId: string) => engine.getLayer(layerId)!;

    it("3 operations → undo all → redo all, verifying each step", () => {
      const engine = new DocumentEngine("doc-multi-cycle", "Multi Cycle", 800, 600);
      const layer = engine.addLayer("Layer 1");
      const history = new CommandHistory();

      // Commit initial state BEFORE any ops (this is the pattern used
      // in production: history is committed BEFORE each mutation)
      const initialState = engine.snapshot();
      history.commit(initialState);

      // Op 1: move to (100, 0)
      engine.moveLayer(layer.id, 100, 0);
      expect(engine.getLayer(layer.id)!.transform.x).toBe(100);
      const afterMove = engine.snapshot();
      history.commit(afterMove, "Move");

      // Op 2: resize
      engine.transformLayer(layer.id, { scaleX: 2, scaleY: 1.5 });
      expect(engine.getLayer(layer.id)!.transform.scaleX).toBe(2);
      const afterResize = engine.snapshot();
      history.commit(afterResize, "Resize");

      // Op 3: rotate + move more
      engine.transformLayer(layer.id, { rotation: 90, x: 200, y: 150 });
      expect(engine.getLayer(layer.id)!.transform.x).toBe(200);
      expect(engine.getLayer(layer.id)!.transform.y).toBe(150);
      expect(engine.getLayer(layer.id)!.transform.rotation).toBe(90);
      const afterRotate = engine.snapshot();
      history.commit(afterRotate, "Rotate+Move");

      // undoStack = [initialState, afterMove, afterResize, afterRotate]
      // current state = afterRotate (x=200, scaleX=2, rotation=90)

      // Undo 1: returns afterRotate (same state as current — no-op visually)
      let u = history.undo(engine.snapshot());
      engine.restore(u!);
      expect(g(engine, layer.id).transform.x).toBe(200);
      expect(g(engine, layer.id).transform.y).toBe(150);
      expect(g(engine, layer.id).transform.scaleX).toBe(2);
      expect(g(engine, layer.id).transform.rotation).toBe(90);

      // Undo 2: returns afterResize
      u = history.undo(engine.snapshot());
      engine.restore(u!);
      expect(g(engine, layer.id).transform.x).toBe(100);
      expect(g(engine, layer.id).transform.y).toBe(0);
      expect(g(engine, layer.id).transform.scaleX).toBe(2);
      expect(g(engine, layer.id).transform.rotation).toBe(0);

      // Undo 3: returns afterMove
      u = history.undo(engine.snapshot());
      engine.restore(u!);
      expect(g(engine, layer.id).transform.x).toBe(100);
      expect(g(engine, layer.id).transform.y).toBe(0);
      expect(g(engine, layer.id).transform.scaleX).toBe(1);
      expect(g(engine, layer.id).transform.rotation).toBe(0);

      // Undo 4: returns initialState
      u = history.undo(engine.snapshot());
      engine.restore(u!);
      expect(g(engine, layer.id).transform.x).toBe(0);
      expect(g(engine, layer.id).transform.y).toBe(0);
      expect(g(engine, layer.id).transform.scaleX).toBe(1);
      expect(g(engine, layer.id).transform.rotation).toBe(0);

      // ── Redo all 4 ──
      let r = history.redo(engine.snapshot());
      engine.restore(r!);
      expect(g(engine, layer.id).transform.x).toBe(100);
      expect(g(engine, layer.id).transform.y).toBe(0);
      expect(g(engine, layer.id).transform.scaleX).toBe(1);

      r = history.redo(engine.snapshot());
      engine.restore(r!);
      expect(g(engine, layer.id).transform.x).toBe(100);
      expect(g(engine, layer.id).transform.scaleX).toBe(2);

      r = history.redo(engine.snapshot());
      engine.restore(r!);
      expect(g(engine, layer.id).transform.x).toBe(200);
      expect(g(engine, layer.id).transform.y).toBe(150);
      expect(g(engine, layer.id).transform.scaleX).toBe(2);
      expect(g(engine, layer.id).transform.rotation).toBe(90);

      r = history.redo(engine.snapshot());
      engine.restore(r!);
      expect(g(engine, layer.id).transform.x).toBe(200);
      expect(g(engine, layer.id).transform.y).toBe(150);
      expect(g(engine, layer.id).transform.scaleX).toBe(2);
      expect(g(engine, layer.id).transform.rotation).toBe(90);
    });
  });

  // ────────────────────────────────────────────────────────────────────
  // RENDER STATE INTEGRITY AFTER UNDO
  // ────────────────────────────────────────────────────────────────────

  describe("render state integrity after undo", () => {
    it("getRenderState reflects restored transform after undo", () => {
      const engine = new DocumentEngine("doc-render-undo", "Render Undo", 800, 600);
      const layer = engine.addLayer("Layer 1");
      layer.transform.x = 50;
      layer.transform.y = 30;
      const history = new CommandHistory();

      history.commit(engine.snapshot());
      engine.moveLayer(layer.id, 200, 100);

      const prev = history.undo(engine.snapshot());
      engine.restore(prev!);

      const state = engine.getRenderState();
      expect(state.layers[0].transform.x).toBe(50);
      expect(state.layers[0].transform.y).toBe(30);
    });

    it("getRenderState reflects restored document size after crop undo", () => {
      const engine = new DocumentEngine("doc-render-size", "Render Size", 800, 600);
      engine.addLayer("Layer 1");
      const history = new CommandHistory();

      history.commit(engine.snapshot());
      engine.applyCrop(0, 0, 400, 300);
      expect(engine.getWidth()).toBe(400);

      const prev = history.undo(engine.snapshot());
      engine.restore(prev!);

      const state = engine.getRenderState();
      expect(state.documentSize.width).toBe(800);
      expect(state.documentSize.height).toBe(600);
    });

    it("getRenderState reflects restored selection after selection undo", () => {
      const engine = new DocumentEngine("doc-render-sel", "Render Sel", 800, 600);
      engine.addLayer("Layer 1");
      engine.createSelection(10, 20, 100, 200);
      const history = new CommandHistory();

      history.commit(engine.snapshot());
      engine.clearSelection();
      expect(engine.getSelection()).toBeNull();

      const prev = history.undo(engine.snapshot());
      engine.restore(prev!);

      const state = engine.getRenderState();
      expect(state.selection).toEqual({ x: 10, y: 20, width: 100, height: 200, angle: 0 });
    });
  });

  // ────────────────────────────────────────────────────────────────────
  // CANCEL TRANSFORM SESSION TESTS
  // ────────────────────────────────────────────────────────────────────

  describe("cancel transform session — engine.restore() called directly", () => {
    const g = (engine: DocumentEngine, id: string) => engine.getLayer(id)!;

    it("cancel after move restores original position and verifies dirtyLayerIds are set", () => {
      const engine = new DocumentEngine("doc-cancel-move", "Cancel Move", 800, 600);
      const layer = engine.addLayer("Layer 1");
      const originalSnapshot = engine.snapshot();

      engine.moveLayer(layer.id, 150, 75);
      engine.restore(originalSnapshot);

      expect(g(engine, layer.id).transform.x).toBe(0);
      expect(g(engine, layer.id).transform.y).toBe(0);
      expect(engine.getDirtyLayerIds()).toContain(layer.id);
    });

    it("cancel after resize restores original scale and marks layers dirty", () => {
      const engine = new DocumentEngine("doc-cancel-resize", "Cancel Resize", 800, 600);
      const layer = engine.addLayer("Layer 1");
      g(engine, layer.id).transform.scaleX = 1;
      g(engine, layer.id).transform.scaleY = 1;

      const originalSnapshot = engine.snapshot();
      engine.transformLayer(layer.id, { scaleX: 2.5, scaleY: 1.8 });
      engine.restore(originalSnapshot);

      expect(g(engine, layer.id).transform.scaleX).toBe(1);
      expect(g(engine, layer.id).transform.scaleY).toBe(1);
      expect(engine.getDirtyLayerIds()).toContain(layer.id);
    });

    it("cancel after resize+rotate restores all original properties", () => {
      const engine = new DocumentEngine("doc-cancel-combo", "Cancel Combo", 800, 600);
      const layer = engine.addLayer("Layer 1");
      const ref = g(engine, layer.id);
      ref.transform.x = 10;
      ref.transform.y = 20;
      ref.transform.scaleX = 1.5;
      ref.transform.rotation = 15;

      const originalSnapshot = engine.snapshot();
      engine.transformLayer(layer.id, {
        x: 200, y: 300, scaleX: 3, scaleY: 2, rotation: 90,
      });
      engine.restore(originalSnapshot);

      const restored = g(engine, layer.id);
      expect(restored.transform.x).toBe(10);
      expect(restored.transform.y).toBe(20);
      expect(restored.transform.scaleX).toBe(1.5);
      expect(restored.transform.scaleY).toBe(1);
      expect(restored.transform.rotation).toBe(15);
      expect(engine.getDirtyLayerIds()).toContain(layer.id);
    });

    it("restore does not close any imageBitmap references", () => {
      const bitmap = { width: 100, height: 100, close: vi.fn() } as unknown as ImageBitmap;
      const engine = new DocumentEngine("doc-cancel-bmp", "Cancel BMP", 800, 600);
      const layer = engine.addLayer("Layer 1", 100, 100);
      engine.setLayerImageBitmap(layer.id, bitmap);

      const newBitmap = { width: 100, height: 100, close: vi.fn() } as unknown as ImageBitmap;
      const originalSnapshot = engine.snapshot();
      engine.setLayerImageBitmap(layer.id, newBitmap);
      engine.restore(originalSnapshot);

      expect(bitmap.close).not.toHaveBeenCalled();
      expect(newBitmap.close).not.toHaveBeenCalled();
      expect(g(engine, layer.id).imageBitmap).toBe(bitmap);
      expect(engine.getDirtyLayerIds()).toContain(layer.id);
    });
  });

  // ────────────────────────────────────────────────────────────────────
  // INTERLEAVED TOOL OPERATIONS UNDO/REDO
  // ────────────────────────────────────────────────────────────────────

  describe("interleaved tool operations undo/redo", () => {
    const g = (engine: DocumentEngine, id: string) => engine.getLayer(id)!;

    it("move → crop → selection → undo twice → redo twice maintains correctness", () => {
      const engine = new DocumentEngine("doc-interleave", "Interleave", 800, 600);
      const layer = engine.addLayer("Layer 1");
      g(engine, layer.id).transform.x = 50;
      const history = new CommandHistory();

      // Initial state committed
      history.commit(engine.snapshot());

      // Op 1: Move layer
      engine.moveLayer(layer.id, 150, 0);
      history.commit(engine.snapshot(), "Move");

      // Op 2: Crop canvas
      engine.applyCrop(10, 10, 600, 400);
      history.commit(engine.snapshot(), "Crop");

      // Op 3: Create selection
      engine.createSelection(50, 50, 100, 100);
      history.commit(engine.snapshot(), "Select");

      // undoStack = [initial, afterMove, afterCrop, afterSelect]
      // current = afterSelect (w=600, layer.x=140, selection at 50,50,100,100)

      expect(engine.getWidth()).toBe(600);
      expect(engine.getLayer(layer.id)!.transform.x).toBe(140);
      expect(engine.getSelection()).toEqual({ x: 50, y: 50, width: 100, height: 100, angle: 0 });

      // Undo 1: returns afterSelect (same state — no-op)
      let u = history.undo(engine.snapshot());
      engine.restore(u!);
      expect(engine.getWidth()).toBe(600);
      expect(g(engine, layer.id).transform.x).toBe(140);
      expect(engine.getSelection()).toEqual({ x: 50, y: 50, width: 100, height: 100, angle: 0 });

      // Undo 2: returns afterCrop (no selection)
      u = history.undo(engine.snapshot());
      engine.restore(u!);
      expect(engine.getWidth()).toBe(600);
      expect(g(engine, layer.id).transform.x).toBe(140);
      expect(engine.getSelection()).toBeNull();

      // Undo 3: returns afterMove (no crop, width=800)
      u = history.undo(engine.snapshot());
      engine.restore(u!);
      expect(engine.getWidth()).toBe(800);
      expect(g(engine, layer.id).transform.x).toBe(150);

      // Undo 4: returns initial
      u = history.undo(engine.snapshot());
      engine.restore(u!);
      expect(engine.getWidth()).toBe(800);
      expect(g(engine, layer.id).transform.x).toBe(50);

      // ── Redo all 4 ──
      let r = history.redo(engine.snapshot());
      engine.restore(r!);
      expect(engine.getWidth()).toBe(800);
      expect(g(engine, layer.id).transform.x).toBe(150);

      r = history.redo(engine.snapshot());
      engine.restore(r!);
      expect(engine.getWidth()).toBe(600);
      expect(g(engine, layer.id).transform.x).toBe(140);
      expect(engine.getSelection()).toBeNull();

      r = history.redo(engine.snapshot());
      engine.restore(r!);
      expect(engine.getWidth()).toBe(600);
      expect(g(engine, layer.id).transform.x).toBe(140);
      expect(engine.getSelection()).toEqual({ x: 50, y: 50, width: 100, height: 100, angle: 0 });
    });
  });

  // ────────────────────────────────────────────────────────────────────
  // DIRTY LAYER IDS AFTER RESTORE
  // ────────────────────────────────────────────────────────────────────

  describe("dirtyLayerIds after engine.restore()", () => {
    it("restore marks all existing layers as dirty", () => {
      const engine = new DocumentEngine("doc-dirty-restore", "Dirty Restore", 800, 600);
      const l1 = engine.addLayer("Layer 1");
      const l2 = engine.addLayer("Layer 2");
      const history = new CommandHistory();

      const snap = engine.snapshot();
      engine.addLayer("Layer 3");

      // Clear dirty flags
      engine.clearDirty();
      expect(engine.getDirtyLayerIds()).toHaveLength(0);

      // Restore: should mark all restored layers as dirty
      engine.restore(snap);
      const dirtyIds = engine.getDirtyLayerIds();
      expect(dirtyIds).toContain(l1.id);
      expect(dirtyIds).toContain(l2.id);
      expect(dirtyIds).not.toContain(engine.getLayers().find(l => l.name === "Layer 3")?.id);
    });

    it("restore after crop marks all post-crop layers as dirty", () => {
      const engine = new DocumentEngine("doc-dirty-crop", "Dirty Crop", 800, 600);
      engine.addLayer("Layer 1");
      const history = new CommandHistory();

      const snap = engine.snapshot();
      engine.applyCrop(50, 50, 400, 300);
      engine.clearDirty();

      engine.restore(snap);
      const dirtyIds = engine.getDirtyLayerIds();
      for (const layer of engine.getLayers()) {
        expect(dirtyIds).toContain(layer.id);
      }
    });

    it("restore after deleteLayer marks remaining layers as dirty", () => {
      const engine = new DocumentEngine("doc-dirty-delete", "Dirty Delete", 800, 600);
      engine.addLayer("Layer 1");
      const l2 = engine.addLayer("Layer 2");
      const history = new CommandHistory();

      const snap = engine.snapshot();
      engine.deleteLayer(l2.id);
      engine.clearDirty();

      engine.restore(snap);
      const dirtyIds = engine.getDirtyLayerIds();
      for (const layer of engine.getLayers()) {
        expect(dirtyIds).toContain(layer.id);
      }
    });

    it("restore after reorderLayer marks all layers as dirty", () => {
      const engine = new DocumentEngine("doc-dirty-reorder", "Dirty Reorder", 800, 600);
      engine.addLayer("A");
      engine.addLayer("B");
      engine.addLayer("C");
      const history = new CommandHistory();

      const snap = engine.snapshot();
      engine.reorderLayer(0, 2);
      engine.clearDirty();

      engine.restore(snap);
      const dirtyIds = engine.getDirtyLayerIds();
      for (const layer of engine.getLayers()) {
        expect(dirtyIds).toContain(layer.id);
      }
    });

    it("restore clears dirty flags for layers no longer in the model", () => {
      const engine = new DocumentEngine("doc-dirty-removed", "Dirty Removed", 800, 600);
      const l1 = engine.addLayer("Layer 1");
      const snap = engine.snapshot();

      // Clear dirty and add a layer
      engine.clearDirty();
      engine.addLayer("Layer 2");

      // Manually mark the deleted layer's ID as dirty (simulating an edge case)
      engine.markLayerDirty("non-existent-id" as string);

      engine.restore(snap);
      const dirtyIds = engine.getDirtyLayerIds();
      // Non-existent layer should NOT be in dirtyIds
      expect(dirtyIds).not.toContain("non-existent-id");
      // But existing layer should be
      expect(dirtyIds).toContain(l1.id);
    });
  });
});
