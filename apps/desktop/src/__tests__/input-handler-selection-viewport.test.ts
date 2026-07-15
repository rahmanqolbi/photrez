import { describe, it, expect, vi } from "vitest";
import { handlePointerDown, handlePointerMove, handlePointerUp } from "../viewport/input-handler";
import { createMockEngine, createMockHistory, createToolContext } from "./test-builders";

/**
 * Helper: simulate the coordinate conversion that getDocCoords() performs.
 * (clientX - rectLeft - panX) / zoom
 * getDocCoords guard: !Number.isFinite(z) || z <= 0 → return {0, 0}
 */
function simulateGetDocCoords(
  clientX: number,
  clientY: number,
  rectLeft: number,
  rectTop: number,
  panX: number,
  panY: number,
  zoom: number,
): { x: number; y: number } {
  if (!Number.isFinite(zoom) || zoom <= 0) return { x: 0, y: 0 };
  return {
    x: (clientX - rectLeft - panX) / zoom,
    y: (clientY - rectTop - panY) / zoom,
  };
}

const CANVAS_RECT = { left: 50, top: 30 };

describe("selection tool coordinate chain — viewport integration", () => {
  /**
   * These tests simulate the full chain that occurs in the app:
   *
   * PointerEvent (clientX, clientY)
   *   → getDocCoords() using pan()/zoom() signals
   *   → handlePointerDown/Move/Up("selection", docX, docY, ...)
   *   → engine.createSelection(x, y, w, h)
   *
   * By varying pan and zoom, we verify the selection rect is positioned
   * correctly in document space regardless of viewport state.
   */

  it("default zoom=1, pan=(0,0): draw selection rect at correct doc pos", () => {
    const engine = createMockEngine(["createSelection", "clearSelection", "snapshot"]);
    const ctx = createToolContext({ selectedLayerId: null, onSelectionCreated: vi.fn() });

    // Click at screen (150, 80) → canvas-relative (100, 50) → doc (100, 50)
    const start = simulateGetDocCoords(150, 80, CANVAS_RECT.left, CANVAS_RECT.top, 0, 0, 1);
    handlePointerDown("selection", start.x, start.y, engine, createMockHistory(), vi.fn(), ctx);

    // Drag to screen (300, 230) → canvas-relative (250, 200) → doc (250, 200)
    const end = simulateGetDocCoords(300, 230, CANVAS_RECT.left, CANVAS_RECT.top, 0, 0, 1);
    handlePointerMove("selection", end.x, end.y, engine, vi.fn(), ctx);
    handlePointerUp("selection", end.x, end.y, engine, createMockHistory(), vi.fn(), ctx);

    // Rect from (100,50) to (250,200) → x=100, y=50, w=150, h=150
    expect(engine.createSelection).toHaveBeenCalledWith(100, 50, 150, 150);
  });

  it("zoom=2, pan=(0,0): 100px screen drag = 50px doc drag", () => {
    const engine = createMockEngine(["createSelection", "clearSelection", "snapshot"]);
    const ctx = createToolContext({ selectedLayerId: null, onSelectionCreated: vi.fn() });

    // Click at screen (150, 80) → doc (50, 25)
    const start = simulateGetDocCoords(150, 80, CANVAS_RECT.left, CANVAS_RECT.top, 0, 0, 2);
    handlePointerDown("selection", start.x, start.y, engine, createMockHistory(), vi.fn(), ctx);

    // Drag to screen (250, 130) → doc (100, 50)
    const end = simulateGetDocCoords(250, 130, CANVAS_RECT.left, CANVAS_RECT.top, 0, 0, 2);
    handlePointerMove("selection", end.x, end.y, engine, vi.fn(), ctx);
    handlePointerUp("selection", end.x, end.y, engine, createMockHistory(), vi.fn(), ctx);

    // Rect from (50,25) to (100,50) → x=50, y=25, w=50, h=25
    expect(engine.createSelection).toHaveBeenCalledWith(50, 25, 50, 25);
  });

  it("zoom=1, pan=(200, 100): pan offset subtracted correctly", () => {
    const engine = createMockEngine(["createSelection", "clearSelection", "snapshot"]);
    const ctx = createToolContext({ selectedLayerId: null, onSelectionCreated: vi.fn() });

    // Click at screen (250, 130) → canvas-relative (200, 100) → doc (0, 0)
    const start = simulateGetDocCoords(250, 130, CANVAS_RECT.left, CANVAS_RECT.top, 200, 100, 1);
    handlePointerDown("selection", start.x, start.y, engine, createMockHistory(), vi.fn(), ctx);

    // Drag to screen (450, 230) → canvas-relative (400, 200) → doc (200, 100)
    const end = simulateGetDocCoords(450, 230, CANVAS_RECT.left, CANVAS_RECT.top, 200, 100, 1);
    handlePointerMove("selection", end.x, end.y, engine, vi.fn(), ctx);
    handlePointerUp("selection", end.x, end.y, engine, createMockHistory(), vi.fn(), ctx);

    // Rect from (0,0) to (200,100) → x=0, y=0, w=200, h=100
    expect(engine.createSelection).toHaveBeenCalledWith(0, 0, 200, 100);
  });

  it("zoom=2, pan=(-200, -100): negative pan + zoom", () => {
    const engine = createMockEngine(["createSelection", "clearSelection", "snapshot"]);
    const ctx = createToolContext({ selectedLayerId: null, onSelectionCreated: vi.fn() });

    // Click at screen (50, 30) → canvas-relative (0, 0) → doc (100, 50)
    const start = simulateGetDocCoords(50, 30, CANVAS_RECT.left, CANVAS_RECT.top, -200, -100, 2);
    handlePointerDown("selection", start.x, start.y, engine, createMockHistory(), vi.fn(), ctx);

    // Drag to screen (150, 130) → canvas-relative (100, 100) → doc (150, 100)
    const end = simulateGetDocCoords(150, 130, CANVAS_RECT.left, CANVAS_RECT.top, -200, -100, 2);
    handlePointerMove("selection", end.x, end.y, engine, vi.fn(), ctx);
    handlePointerUp("selection", end.x, end.y, engine, createMockHistory(), vi.fn(), ctx);

    // Rect from (100,50) to (150,100) → x=100, y=50, w=50, h=50
    expect(engine.createSelection).toHaveBeenCalledWith(100, 50, 50, 50);
  });

  it("zoom=4, pan=(100, 50): extreme zoom + large pan", () => {
    const engine = createMockEngine(["createSelection", "clearSelection", "snapshot"]);
    const ctx = createToolContext({ selectedLayerId: null, onSelectionCreated: vi.fn() });

    // Click at screen (150, 80) → canvas-relative (100, 50) → doc (0, 0)
    const start = simulateGetDocCoords(150, 80, CANVAS_RECT.left, CANVAS_RECT.top, 100, 50, 4);
    handlePointerDown("selection", start.x, start.y, engine, createMockHistory(), vi.fn(), ctx);

    // Drag to screen (550, 280) → canvas-relative (500, 250) → doc (100, 50)
    const end = simulateGetDocCoords(550, 280, CANVAS_RECT.left, CANVAS_RECT.top, 100, 50, 4);
    handlePointerMove("selection", end.x, end.y, engine, vi.fn(), ctx);
    handlePointerUp("selection", end.x, end.y, engine, createMockHistory(), vi.fn(), ctx);

    // Rect from (0,0) to (100,50) → x=0, y=0, w=100, h=50
    expect(engine.createSelection).toHaveBeenCalledWith(0, 0, 100, 50);
  });
});

describe("selection tool move-selection — viewport integration", () => {
  /**
   * These tests verify that moving an existing selection works correctly
   * with various pan/zoom states. The selection exists in doc space,
   * and pointer coordinates need to be converted from screen space
   * correctly regardless of viewport state.
   */

  it("default zoom=1, pan=(0,0): move selection by correct delta", () => {
    const engine = createMockEngine(["snapshot"]);
    const onSelectionMoved = vi.fn();
    const ctx = createToolContext({
      selectionBounds: { x: 100, y: 100, width: 200, height: 150 },
      onSelectionMoved,
      onSelectionCreated: vi.fn(),
    });

    // Click inside selection at screen (200, 180) → doc (150, 150)
    const start = simulateGetDocCoords(200, 180, CANVAS_RECT.left, CANVAS_RECT.top, 0, 0, 1);
    handlePointerDown("selection", start.x, start.y, engine, createMockHistory(), vi.fn(), ctx);
    expect(ctx.dragMode).toBe("move-selection");
    // dragStart = doc - selection origin = (150 - 100, 150 - 100) = (50, 50)

    // Drag to screen (250, 230) → doc (200, 200)
    const end = simulateGetDocCoords(250, 230, CANVAS_RECT.left, CANVAS_RECT.top, 0, 0, 1);
    handlePointerMove("selection", end.x, end.y, engine, vi.fn(), ctx);
    // newX = 200 - 50 = 150, newY = 200 - 50 = 150
    expect(onSelectionMoved).toHaveBeenCalledWith(150, 150);
  });

  it("zoom=2, pan=(0,0): move selection — 100px screen = 50px doc", () => {
    const engine = createMockEngine(["snapshot"]);
    const onSelectionMoved = vi.fn();
    const ctx = createToolContext({
      selectionBounds: { x: 100, y: 100, width: 200, height: 150 },
      onSelectionMoved,
      onSelectionCreated: vi.fn(),
    });

    // Need doc coords INSIDE selection (100,100)-(300,250).
    // For zoom=2: doc (150, 150) → screen (350, 330)
    const start = simulateGetDocCoords(350, 330, CANVAS_RECT.left, CANVAS_RECT.top, 0, 0, 2);
    expect(start).toEqual({ x: 150, y: 150 });
    handlePointerDown("selection", start.x, start.y, engine, createMockHistory(), vi.fn(), ctx);
    expect(ctx.dragMode).toBe("move-selection");
    // dragStart = (150 - 100, 150 - 100) = (50, 50)

    // Drag 100px screen = 50px doc: doc (200, 200) → screen (450, 430)
    const end = simulateGetDocCoords(450, 430, CANVAS_RECT.left, CANVAS_RECT.top, 0, 0, 2);
    expect(end).toEqual({ x: 200, y: 200 });
    handlePointerMove("selection", end.x, end.y, engine, vi.fn(), ctx);
    // newX = 200 - 50 = 150, newY = 200 - 50 = 150
    expect(onSelectionMoved).toHaveBeenCalledWith(150, 150);
  });

  it("zoom=1, pan=(200,100): pan offset subtracted, move-selection works", () => {
    const engine = createMockEngine(["snapshot"]);
    const onSelectionMoved = vi.fn();
    const ctx = createToolContext({
      selectionBounds: { x: 100, y: 100, width: 200, height: 150 },
      onSelectionMoved,
      onSelectionCreated: vi.fn(),
    });

    // Click at screen (300, 230) → canvas-relative (250, 200) → doc (50, 100)
    // In doc space, (50, 100) is inside selection (100,100)-(300,250)? No!
    // (50, 100) is LEFT of selection origin (100, 100).
    // So this click would be OUTSIDE and start a DRAW, not move.
    // Let me adjust: click at screen (350, 280) → canvas-relative (300, 250)
    // → doc (100, 150). Inside selection bounds (100,100)-(300,250)? Yes!
    const start = simulateGetDocCoords(350, 280, CANVAS_RECT.left, CANVAS_RECT.top, 200, 100, 1);
    expect(start).toEqual({ x: 100, y: 150 });

    handlePointerDown("selection", start.x, start.y, engine, createMockHistory(), vi.fn(), ctx);
    expect(ctx.dragMode).toBe("move-selection");
    // dragStart = (100 - 100, 150 - 100) = (0, 50)

    // Drag to screen (450, 330) → canvas-relative (400, 300) → doc (200, 200)
    const end = simulateGetDocCoords(450, 330, CANVAS_RECT.left, CANVAS_RECT.top, 200, 100, 1);
    handlePointerMove("selection", end.x, end.y, engine, vi.fn(), ctx);
    // newX = 200 - 0 = 200, newY = 200 - 50 = 150
    expect(onSelectionMoved).toHaveBeenCalledWith(200, 150);
  });

  it("move-selection with Shift+square — zoom=2, pan=(-200, -100)", () => {
    const engine = createMockEngine(["createSelection", "clearSelection", "snapshot"]);
    const ctx = createToolContext({
      selectedLayerId: null,
      onSelectionCreated: vi.fn(),
      isShiftPressed: true,
    });

    // Click at screen (50, 30) → doc (100, 50)
    const start = simulateGetDocCoords(50, 30, CANVAS_RECT.left, CANVAS_RECT.top, -200, -100, 2);
    handlePointerDown("selection", start.x, start.y, engine, createMockHistory(), vi.fn(), ctx);

    // Drag to screen (250, 130) → doc (200, 100)
    const end = simulateGetDocCoords(250, 130, CANVAS_RECT.left, CANVAS_RECT.top, -200, -100, 2);
    handlePointerMove("selection", end.x, end.y, engine, vi.fn(), ctx);
    handlePointerUp("selection", end.x, end.y, engine, createMockHistory(), vi.fn(), ctx);

    // Rect from (100,50) to (200,100) → dx=100, dy=50, max=100 → square 100x100
    // Since isShiftPressed: w = max(100, 50) = 100, h = 100
    // x = min(100, 200) = 100, y = min(50, 100) = 50
    expect(engine.createSelection).toHaveBeenCalledWith(100, 50, 100, 100);
  });
});

describe("selection tool wrap-around — screenToDocument + handler chain", () => {
  /**
   * Pure integration test: verify that screenToDocument coordinates
   * passed through handlePointerDown produce correct dragStart offsets
   * and selection positions for various viewport states.
   */

  it("round-trips correctly across multiple viewport states", () => {
    const testCases = [
      { panX: 0, panY: 0, zoom: 1, name: "default" },
      { panX: 200, panY: 100, zoom: 1, name: "panned" },
      { panX: 0, panY: 0, zoom: 2, name: "zoomed" },
      { panX: -200, panY: -100, zoom: 2, name: "negative pan + zoom" },
      { panX: 100, panY: 50, zoom: 4, name: "extreme" },
    ];

    for (const tc of testCases) {
      const engine = createMockEngine(["createSelection", "clearSelection", "snapshot"]);
      const onSelectionCreated = vi.fn();
      const ctx = createToolContext({
        selectedLayerId: null,
        onSelectionCreated,
      });

      // Click at fixed screen position, convert through viewport
      const start = simulateGetDocCoords(150, 80, CANVAS_RECT.left, CANVAS_RECT.top, tc.panX, tc.panY, tc.zoom);
      handlePointerDown("selection", start.x, start.y, engine, createMockHistory(), vi.fn(), ctx);

      // In draw mode, dragStart = doc coords (no existing selection)
      expect(ctx.dragStart).toEqual({ x: start.x, y: start.y });

      // Drag to another screen position
      const end = simulateGetDocCoords(350, 230, CANVAS_RECT.left, CANVAS_RECT.top, tc.panX, tc.panY, tc.zoom);
      handlePointerMove("selection", end.x, end.y, engine, vi.fn(), ctx);
      handlePointerUp("selection", end.x, end.y, engine, createMockHistory(), vi.fn(), ctx);

      // Rect should be from start to end in doc space
      const expectedX = Math.min(start.x, end.x);
      const expectedY = Math.min(start.y, end.y);
      const expectedW = Math.abs(end.x - start.x);
      const expectedH = Math.abs(end.y - start.y);

      if (expectedW > 2 && expectedH > 2) {
        // Draw is clamped to the document (canvas) bounds — mock canvas is 4000x4000.
        const dw = 4000, dh = 4000;
        const cx = Math.max(0, Math.min(dw, expectedX));
        const cy = Math.max(0, Math.min(dh, expectedY));
        const cw = Math.max(0, Math.min(dw, expectedX + expectedW) - cx);
        const ch = Math.max(0, Math.min(dh, expectedY + expectedH) - cy);
        expect(engine.createSelection).toHaveBeenCalledWith(cx, cy, cw, ch);
      }
    }
  });
});
