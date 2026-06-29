import { describe, it, expect, vi } from "vitest";
import { handlePointerDown, handlePointerMove, handlePointerUp, isPointInSelection } from "../viewport/input-handler";
import { createMockEngine, createMockHistory, createToolContext } from "./test-builders";

describe("input-handler: selection tool draw modifiers", () => {
  describe("basic drag", () => {
    it("creates selection rect from min/max corners", () => {
      const engine = createMockEngine(["createSelection", "clearSelection", "snapshot"]);
      const ctx = createToolContext({ selectedLayerId: null, onSelectionCreated: vi.fn() });
      handlePointerDown("selection", 100, 100, engine, createMockHistory(), vi.fn(), ctx);
      handlePointerMove("selection", 200, 250, engine, vi.fn(), ctx);
      handlePointerUp("selection", 200, 250, engine, createMockHistory(), vi.fn(), ctx);
      expect(engine.createSelection).toHaveBeenCalledWith(100, 100, 100, 150);
    });

    it("drag from right-bottom to left-top still creates valid rect", () => {
      const engine = createMockEngine(["createSelection", "clearSelection", "snapshot"]);
      const ctx = createToolContext({ selectedLayerId: null, onSelectionCreated: vi.fn() });
      handlePointerDown("selection", 200, 250, engine, createMockHistory(), vi.fn(), ctx);
      handlePointerMove("selection", 100, 100, engine, vi.fn(), ctx);
      handlePointerUp("selection", 100, 100, engine, createMockHistory(), vi.fn(), ctx);
      expect(engine.createSelection).toHaveBeenCalledWith(100, 100, 100, 150);
    });

    it("tiny drag clears selection instead of creating", () => {
      const engine = createMockEngine(["createSelection", "clearSelection", "snapshot"]);
      const ctx = createToolContext({ selectedLayerId: null, onSelectionCreated: vi.fn() });
      handlePointerDown("selection", 100, 100, engine, createMockHistory(), vi.fn(), ctx);
      handlePointerMove("selection", 101, 101, engine, vi.fn(), ctx);
      handlePointerUp("selection", 101, 101, engine, createMockHistory(), vi.fn(), ctx);
      expect(engine.createSelection).not.toHaveBeenCalled();
      expect(engine.clearSelection).toHaveBeenCalled();
    });
  });

  describe("Shift modifier — constrain to square", () => {
    it("Shift+drag uses max dimension for both axes (drag wider than tall)", () => {
      const engine = createMockEngine(["createSelection", "snapshot"]);
      const ctx = createToolContext({ isShiftPressed: true, selectedLayerId: null, onSelectionCreated: vi.fn() });
      handlePointerDown("selection", 100, 100, engine, createMockHistory(), vi.fn(), ctx);
      handlePointerMove("selection", 300, 200, engine, vi.fn(), ctx);
      handlePointerUp("selection", 300, 200, engine, createMockHistory(), vi.fn(), ctx);
      // dx=200, dy=100, max=200 → both axes = 200
      expect(engine.createSelection).toHaveBeenCalledWith(100, 100, 200, 200);
    });

    it("Shift+drag uses max dimension for both axes (drag taller than wide)", () => {
      const engine = createMockEngine(["createSelection", "snapshot"]);
      const ctx = createToolContext({ isShiftPressed: true, selectedLayerId: null, onSelectionCreated: vi.fn() });
      handlePointerDown("selection", 100, 100, engine, createMockHistory(), vi.fn(), ctx);
      handlePointerMove("selection", 150, 400, engine, vi.fn(), ctx);
      handlePointerUp("selection", 150, 400, engine, createMockHistory(), vi.fn(), ctx);
      // dx=50, dy=300, max=300 → both axes = 300
      expect(engine.createSelection).toHaveBeenCalledWith(100, 100, 300, 300);
    });
  });

  describe("Alt modifier — draw from center", () => {
    it("Alt+drag anchors the opposite corner as start point", () => {
      const engine = createMockEngine(["createSelection", "snapshot"]);
      const ctx = createToolContext({ isAltPressed: true, selectedLayerId: null, onSelectionCreated: vi.fn() });
      handlePointerDown("selection", 100, 100, engine, createMockHistory(), vi.fn(), ctx);
      handlePointerMove("selection", 200, 200, engine, vi.fn(), ctx);
      handlePointerUp("selection", 200, 200, engine, createMockHistory(), vi.fn(), ctx);
      // center = (100,100), current = (200,200) → rect from (0,0) to (200,200)
      expect(engine.createSelection).toHaveBeenCalledWith(0, 0, 200, 200);
    });

    it("Alt+drag with Shift constrains square from center", () => {
      const engine = createMockEngine(["createSelection", "snapshot"]);
      const ctx = createToolContext({ isAltPressed: true, isShiftPressed: true, selectedLayerId: null, onSelectionCreated: vi.fn() });
      handlePointerDown("selection", 100, 100, engine, createMockHistory(), vi.fn(), ctx);
      handlePointerMove("selection", 250, 150, engine, vi.fn(), ctx);
      handlePointerUp("selection", 250, 150, engine, createMockHistory(), vi.fn(), ctx);
      // center = (100,100), current = (250,150) → dx=150, dy=50, max=150
      // from center: anchor = center = (100,100), expanded = 150 in each dir
      // rect = (-50, -50) to (250, 250) → x=-50, y=-50, w=300, h=300
      expect(engine.createSelection).toHaveBeenCalledWith(-50, -50, 300, 300);
    });
  });

  describe("move existing selection", () => {
    it("clicking inside existing selection starts move mode", () => {
      const engine = createMockEngine(["snapshot"]);
      const ctx = createToolContext({
        selectionBounds: { x: 50, y: 50, width: 200, height: 150 },
        onSelectionCreated: vi.fn(),
      });
      handlePointerDown("selection", 100, 100, engine, createMockHistory(), vi.fn(), ctx);
      expect(ctx.dragMode).toBe("move-selection");
      expect(ctx.onSelectionCreated).not.toHaveBeenCalled();
    });

    it("clicking outside existing selection starts draw mode", () => {
      const engine = createMockEngine(["snapshot"]);
      const ctx = createToolContext({
        selectionBounds: { x: 50, y: 50, width: 200, height: 150 },
        onSelectionCreated: vi.fn(),
      });
      handlePointerDown("selection", 400, 400, engine, createMockHistory(), vi.fn(), ctx);
      expect(ctx.dragMode).toBe("draw");
      expect(ctx.onSelectionCreated).toHaveBeenCalled();
    });

    it("move-selection calls onSelectionMoved with new position", () => {
      const engine = createMockEngine(["snapshot"]);
      const ctx = createToolContext({
        selectionBounds: { x: 50, y: 50, width: 200, height: 150 },
        onSelectionMoved: vi.fn(),
        onSelectionCreated: vi.fn(),
      });
      handlePointerDown("selection", 100, 100, engine, createMockHistory(), vi.fn(), ctx);
      handlePointerMove("selection", 150, 130, engine, vi.fn(), ctx);
      // dragStart = (100 - 50, 100 - 50) = (50, 50) — offset from selection origin
      // newX = 150 - 50 = 100, newY = 130 - 50 = 80
      expect(ctx.onSelectionMoved).toHaveBeenCalledWith(100, 80);
    });

    it("move-selection on pointer up also calls onSelectionMoved", () => {
      const engine = createMockEngine(["createSelection", "snapshot"]);
      const ctx = createToolContext({
        selectionBounds: { x: 50, y: 50, width: 200, height: 150 },
        onSelectionMoved: vi.fn(),
        onSelectionCreated: vi.fn(),
      });
      handlePointerDown("selection", 100, 100, engine, createMockHistory(), vi.fn(), ctx);
      handlePointerUp("selection", 200, 200, engine, createMockHistory(), vi.fn(), ctx);
      // dragStart = (50, 50), newX = 200 - 50 = 150, newY = 200 - 50 = 150
      expect(ctx.onSelectionMoved).toHaveBeenCalledWith(150, 150);
      expect(engine.createSelection).not.toHaveBeenCalled();
    });

    it("dragMode is reset after pointer up", () => {
      const engine = createMockEngine(["snapshot"]);
      const ctx = createToolContext({
        selectionBounds: { x: 50, y: 50, width: 200, height: 150 },
        onSelectionMoved: vi.fn(),
        onSelectionCreated: vi.fn(),
      });
      handlePointerDown("selection", 100, 100, engine, createMockHistory(), vi.fn(), ctx);
      expect(ctx.dragMode).toBe("move-selection");
      handlePointerUp("selection", 150, 150, engine, createMockHistory(), vi.fn(), ctx);
      expect(ctx.dragMode).toBeNull();
    });
  });

  describe("history commits for selection edits", () => {
    it("move-selection commits history on pointerUp when selection actually moved (regression: edits not saved)", () => {
      const engine = createMockEngine(["snapshot"]);
      const ctx = createToolContext({
        selectionBounds: { x: 50, y: 50, width: 200, height: 150 },
        onSelectionCreated: vi.fn(),
      });
      const history = createMockHistory();

      handlePointerDown("selection", 100, 100, engine, history, vi.fn(), ctx);
      handlePointerMove("selection", 150, 130, engine, vi.fn(), ctx);
      handlePointerUp("selection", 150, 130, engine, history, vi.fn(), ctx);

      // Selection moved (pointer up at different doc coords than down) — must
      // commit the pre-move snapshot so undo restores prior selection rect.
      expect(history.commit).toHaveBeenCalledTimes(1);
    });

    it("move-selection click-without-drag does NOT commit history (regression 2026-06-18: ghost entries)", () => {
      const engine = createMockEngine(["snapshot"]);
      const ctx = createToolContext({
        selectionBounds: { x: 50, y: 50, width: 200, height: 150 },
        onSelectionCreated: vi.fn(),
      });
      const history = createMockHistory();

      // Click inside selection at (100, 100), release at same spot — no drag.
      handlePointerDown("selection", 100, 100, engine, history, vi.fn(), ctx);
      handlePointerUp("selection", 100, 100, engine, history, vi.fn(), ctx);

      // Previously this produced a ghost undo entry that did nothing visible.
      expect(history.commit).not.toHaveBeenCalled();
    });

    it("drawing a fresh selection does NOT commit history (regression: avoid history noise)", () => {
      const engine = createMockEngine(["snapshot"]);
      const ctx = createToolContext({ selectedLayerId: null, onSelectionCreated: vi.fn() });
      const history = createMockHistory();

      handlePointerDown("selection", 100, 100, engine, history, vi.fn(), ctx);

      // Fresh draws should not pollute the undo stack — undo should not
      // revert to "no selection" if the user hasn't moved anything yet.
      expect(history.commit).not.toHaveBeenCalled();
    });
  });
});
