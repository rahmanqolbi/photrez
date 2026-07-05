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

describe("crop tool coordinate chain — viewport integration", () => {
  /**
   * These tests simulate the full chain for crop draw:
   *
   * PointerEvent (clientX, clientY)
   *   → getDocCoords() using pan()/zoom() signals
   *   → handlePointerDown/Move/Up("crop", docX, docY, ...)
   *   → context.onCropCreated(x, y, w, h)
   *
   * The crop rect is calculated from dragStart and current doc coords:
   *   x = min(dragStart.x, docX)
   *   y = min(dragStart.y, docY)
   *   w = abs(dragStart.x - docX)
   *   h = abs(dragStart.y - docY)
   */

  it("default zoom=1, pan=(0,0): crop draw at correct doc coords", () => {
    const engine = createMockEngine();
    const history = createMockHistory();
    const onCropCreated = vi.fn();
    const ctx = createToolContext({ onCropCreated });

    // Click at screen (150, 80) → doc (100, 50)
    const start = simulateGetDocCoords(150, 80, CANVAS_RECT.left, CANVAS_RECT.top, 0, 0, 1);
    handlePointerDown("crop", start.x, start.y, engine, history, vi.fn(), ctx);

    // pointerDown should set dragStart and call onCropCreated at (100, 50, 0, 0)
    expect(ctx.dragStart).toEqual({ x: 100, y: 50 });
    expect(onCropCreated).toHaveBeenCalledWith(100, 50, 0, 0);

    // Drag to screen (300, 230) → doc (250, 200)
    const end = simulateGetDocCoords(300, 230, CANVAS_RECT.left, CANVAS_RECT.top, 0, 0, 1);
    handlePointerMove("crop", end.x, end.y, engine, vi.fn(), ctx);

    // rect should be from (100, 50) to (250, 200) → x=100, y=50, w=150, h=150
    expect(onCropCreated).toHaveBeenCalledWith(100, 50, 150, 150);
  });

  it("zoom=2: crop rect is halved in doc space", () => {
    const engine = createMockEngine();
    const history = createMockHistory();
    const onCropCreated = vi.fn();
    const ctx = createToolContext({ onCropCreated });

    // Click at screen (150, 80) → doc (50, 25)
    const start = simulateGetDocCoords(150, 80, CANVAS_RECT.left, CANVAS_RECT.top, 0, 0, 2);
    handlePointerDown("crop", start.x, start.y, engine, history, vi.fn(), ctx);

    expect(ctx.dragStart).toEqual({ x: 50, y: 25 });

    // Drag to screen (250, 130) → doc (100, 50)
    const end = simulateGetDocCoords(250, 130, CANVAS_RECT.left, CANVAS_RECT.top, 0, 0, 2);
    handlePointerMove("crop", end.x, end.y, engine, vi.fn(), ctx);

    // 100px screen delta → 50px doc delta at zoom=2
    expect(onCropCreated).toHaveBeenCalledWith(50, 25, 50, 25);
  });

  it("zoom=0.5: crop rect is doubled in doc space", () => {
    const engine = createMockEngine();
    const history = createMockHistory();
    const onCropCreated = vi.fn();
    const ctx = createToolContext({ onCropCreated });

    // Click at screen (150, 80) → doc (200, 100)
    const start = simulateGetDocCoords(150, 80, CANVAS_RECT.left, CANVAS_RECT.top, 0, 0, 0.5);
    handlePointerDown("crop", start.x, start.y, engine, history, vi.fn(), ctx);

    expect(ctx.dragStart).toEqual({ x: 200, y: 100 });

    // Drag to screen (250, 130) → doc (400, 200)
    const end = simulateGetDocCoords(250, 130, CANVAS_RECT.left, CANVAS_RECT.top, 0, 0, 0.5);
    handlePointerMove("crop", end.x, end.y, engine, vi.fn(), ctx);

    // 100px screen delta → 200px doc delta at zoom=0.5
    expect(onCropCreated).toHaveBeenCalledWith(200, 100, 200, 100);
  });

  it("zoom=1, pan=(200,100): crop accounts for pan offset", () => {
    const engine = createMockEngine();
    const history = createMockHistory();
    const onCropCreated = vi.fn();
    const ctx = createToolContext({ onCropCreated });

    // Click at screen (250, 130) → doc (0, 0)
    const start = simulateGetDocCoords(250, 130, CANVAS_RECT.left, CANVAS_RECT.top, 200, 100, 1);
    handlePointerDown("crop", start.x, start.y, engine, history, vi.fn(), ctx);

    expect(ctx.dragStart).toEqual({ x: 0, y: 0 });

    // Drag to screen (450, 230) → doc (200, 100)
    const end = simulateGetDocCoords(450, 230, CANVAS_RECT.left, CANVAS_RECT.top, 200, 100, 1);
    handlePointerMove("crop", end.x, end.y, engine, vi.fn(), ctx);

    expect(onCropCreated).toHaveBeenCalledWith(0, 0, 200, 100);
  });

  it("zoom=2, pan=(-200,-100): negative pan + zoom combined", () => {
    const engine = createMockEngine();
    const history = createMockHistory();
    const onCropCreated = vi.fn();
    const ctx = createToolContext({ onCropCreated });

    // Click at screen (50, 30) → doc (100, 50)
    const start = simulateGetDocCoords(50, 30, CANVAS_RECT.left, CANVAS_RECT.top, -200, -100, 2);
    handlePointerDown("crop", start.x, start.y, engine, history, vi.fn(), ctx);

    expect(ctx.dragStart).toEqual({ x: 100, y: 50 });

    // Drag to screen (150, 80) → doc (150, 75)
    const end = simulateGetDocCoords(150, 80, CANVAS_RECT.left, CANVAS_RECT.top, -200, -100, 2);
    handlePointerMove("crop", end.x, end.y, engine, vi.fn(), ctx);

    // 100px screen delta = 50px doc delta at zoom=2
    expect(onCropCreated).toHaveBeenCalledWith(100, 50, 50, 25);
  });

  it("pointerUp finalizes crop rect with min-size guard", () => {
    const engine = createMockEngine();
    const history = createMockHistory();
    const onCropCreated = vi.fn();
    const ctx = createToolContext({ onCropCreated });

    const start = simulateGetDocCoords(150, 80, CANVAS_RECT.left, CANVAS_RECT.top, 0, 0, 1);
    handlePointerDown("crop", start.x, start.y, engine, history, vi.fn(), ctx);
    onCropCreated.mockClear();

    const end = simulateGetDocCoords(300, 230, CANVAS_RECT.left, CANVAS_RECT.top, 0, 0, 1);
    handlePointerUp("crop", end.x, end.y, engine, history, vi.fn(), ctx);

    // pointerUp should call onCropCreated with correct final rect (w=150 > 2, h=150 > 2)
    expect(onCropCreated).toHaveBeenCalledWith(100, 50, 150, 150);
  });

  it("pointerUp with tiny rect (< 2px) does not call onCropCreated", () => {
    const engine = createMockEngine();
    const history = createMockHistory();
    const onCropCreated = vi.fn();
    const ctx = createToolContext({ onCropCreated });

    const start = simulateGetDocCoords(150, 80, CANVAS_RECT.left, CANVAS_RECT.top, 0, 0, 1);
    handlePointerDown("crop", start.x, start.y, engine, history, vi.fn(), ctx);
    onCropCreated.mockClear();

    // Move just 1px in both directions → w=1, h=1 → below 2px threshold
    const tinyEnd = simulateGetDocCoords(151, 81, CANVAS_RECT.left, CANVAS_RECT.top, 0, 0, 1);
    handlePointerUp("crop", tinyEnd.x, tinyEnd.y, engine, history, vi.fn(), ctx);

    // onCropCreated should NOT be called because w=1 <= 2 && h=1 <= 2
    expect(onCropCreated).not.toHaveBeenCalled();
  });

  it("multiple pointer moves accumulate correct crop rect", () => {
    const engine = createMockEngine();
    const history = createMockHistory();
    const onCropCreated = vi.fn();
    const ctx = createToolContext({ onCropCreated });

    const p1 = simulateGetDocCoords(150, 80, CANVAS_RECT.left, CANVAS_RECT.top, 0, 0, 1);
    handlePointerDown("crop", p1.x, p1.y, engine, history, vi.fn(), ctx);
    expect(onCropCreated).toHaveBeenLastCalledWith(100, 50, 0, 0);

    // Move to (200, 130) → doc (150, 100) → rect (100, 50, 50, 50)
    const p2 = simulateGetDocCoords(200, 130, CANVAS_RECT.left, CANVAS_RECT.top, 0, 0, 1);
    handlePointerMove("crop", p2.x, p2.y, engine, vi.fn(), ctx);
    expect(onCropCreated).toHaveBeenLastCalledWith(100, 50, 50, 50);

    // Move to (250, 180) → doc (200, 150) → rect (100, 50, 100, 100)
    const p3 = simulateGetDocCoords(250, 180, CANVAS_RECT.left, CANVAS_RECT.top, 0, 0, 1);
    handlePointerMove("crop", p3.x, p3.y, engine, vi.fn(), ctx);
    expect(onCropCreated).toHaveBeenLastCalledWith(100, 50, 100, 100);

    // Move to (350, 130) → doc (300, 100) → rect (100, 50, 200, 50)
    const p4 = simulateGetDocCoords(350, 130, CANVAS_RECT.left, CANVAS_RECT.top, 0, 0, 1);
    handlePointerMove("crop", p4.x, p4.y, engine, vi.fn(), ctx);
    expect(onCropCreated).toHaveBeenLastCalledWith(100, 50, 200, 50);

    // pointerDown (1) + 3 moves = 4 calls
    expect(onCropCreated).toHaveBeenCalledTimes(4);
  });

  it("negative drag direction: rect x/y correctly uses min of start/current", () => {
    const engine = createMockEngine();
    const history = createMockHistory();
    const onCropCreated = vi.fn();
    const ctx = createToolContext({ onCropCreated });

    // Start at doc (300, 200), drag left/up to doc (100, 50)
    const start = simulateGetDocCoords(350, 230, CANVAS_RECT.left, CANVAS_RECT.top, 0, 0, 1);
    handlePointerDown("crop", start.x, start.y, engine, history, vi.fn(), ctx);

    const end = simulateGetDocCoords(150, 80, CANVAS_RECT.left, CANVAS_RECT.top, 0, 0, 1);
    handlePointerMove("crop", end.x, end.y, engine, vi.fn(), ctx);

    // x=min(300,100)=100, y=min(200,50)=50, w=abs(300-100)=200, h=abs(200-50)=150
    expect(onCropCreated).toHaveBeenCalledWith(100, 50, 200, 150);
  });

  it("drag from right to left (negative w direction) produces positive w/h", () => {
    const engine = createMockEngine();
    const history = createMockHistory();
    const onCropCreated = vi.fn();
    const ctx = createToolContext({ onCropCreated });

    // Start at doc (100, 100), drag left to doc (50, 150)
    const start = simulateGetDocCoords(150, 130, CANVAS_RECT.left, CANVAS_RECT.top, 0, 0, 1);
    handlePointerDown("crop", start.x, start.y, engine, history, vi.fn(), ctx);

    const end = simulateGetDocCoords(100, 180, CANVAS_RECT.left, CANVAS_RECT.top, 0, 0, 1);
    handlePointerMove("crop", end.x, end.y, engine, vi.fn(), ctx);

    // x=min(100,50)=50, y=min(100,150)=100, w=abs(-50)=50, h=abs(50)=50
    expect(onCropCreated).toHaveBeenCalledWith(50, 100, 50, 50);
  });
});
