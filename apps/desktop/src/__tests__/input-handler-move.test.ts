import { describe, it, expect, vi } from "vitest";
import { handlePointerDown, handlePointerMove, handlePointerUp } from "../viewport/input-handler";

function createMockEngine() {
  return {
    snapshot: vi.fn(() => ({})),
    moveLayer: vi.fn(),
    getLayer: vi.fn((_id: string) => ({
      id: "layer-1",
      transform: { x: 100, y: 50, scaleX: 1, scaleY: 1, rotation: 0, flipH: false, flipV: false },
      locked: false,
      width: 200,
      height: 150,
    })),
  };
}

function createContext(overrides: Record<string, any> = {}) {
  return {
    fgColor: "#000000",
    bgColor: "#FFFFFF",
    brushSize: 20,
    brushHardness: 0.5,
    brushOpacity: 1,
    paintSettings: { size: 20, hardness: 0.5, opacity: 1, flow: 1, smoothing: 0 },
    isAltPressed: false,
    isDragging: false,
    dragStart: { x: 0, y: 0 },
    dragCurrent: { x: 0, y: 0 },
    selectedLayerId: "layer-1",
    strokePoints: [],
    dragTool: null,
    setFgColor: vi.fn(),
    setBgColor: vi.fn(),
    onPaintStroke: undefined,
    onCropCreated: undefined,
    onSelectionCreated: undefined,
    onComputeSnap: undefined,
    onHoverHandle: undefined,
    onSnapLines: vi.fn(),
    ...overrides,
  };
}

describe("input-handler: move tool", () => {
  it("pointerDown sets isDragging=true even when no layer selected", () => {
    const engine = createMockEngine();
    const history = { commit: vi.fn() };
    const context = createContext({ selectedLayerId: null });
    handlePointerDown("move", 150, 80, engine as any, history as any, vi.fn(), context);
    expect(context.isDragging).toBe(true);
  });

  it("pointerDown with move tool and unlocked layer offsets dragStart by layer transform", () => {
    const engine = createMockEngine();
    const history = { commit: vi.fn() };
    const context = createContext();
    handlePointerDown("move", 150, 80, engine as any, history as any, vi.fn(), context);
    expect(context.dragStart).toEqual({ x: 50, y: 30 });
  });

  it("pointerDown with locked layer keeps raw dragStart", () => {
    const engine = createMockEngine();
    const history = { commit: vi.fn() };
    engine.getLayer = vi.fn(() => ({
      id: "layer-1",
      transform: { x: 100, y: 50, scaleX: 1, scaleY: 1, rotation: 0, flipH: false, flipV: false },
      locked: true,
      width: 200,
      height: 150,
    }));
    const context = createContext();
    handlePointerDown("move", 150, 80, engine as any, history as any, vi.fn(), context);
    expect(context.dragStart).toEqual({ x: 150, y: 80 });
  });

  it("pointerDown stashes pending history snapshot WITHOUT committing (deferred until pointerup)", () => {
    const engine = createMockEngine();
    const history = { commit: vi.fn() };
    const context = createContext();
    handlePointerDown("move", 150, 80, engine as any, history as any, vi.fn(), context);
    // Regression 2026-06-18: pointerDown must NOT commit. A click without
    // drag should produce zero history entries. Commit is deferred to
    // pointerUp which checks if the layer actually moved.
    expect(history.commit).not.toHaveBeenCalled();
    expect((context as any).pendingHistorySnapshot).not.toBeNull();
    expect((context as any).pendingOriginalLayerPos).toEqual({ x: 100, y: 50 });
  });

  it("pointerMove with move tool calls engine.moveLayer with offset", () => {
    const engine = createMockEngine();
    const context = createContext({
      isDragging: true,
      dragStart: { x: 50, y: 30 },
      selectedLayerId: "layer-1",
    });
    handlePointerMove("move", 200, 100, engine as any, vi.fn(), context);
    expect(engine.moveLayer).toHaveBeenCalledWith("layer-1", 150, 70);
  });

  it("pointerMove does nothing when not dragging", () => {
    const engine = createMockEngine();
    const context = createContext({ isDragging: false });
    handlePointerMove("move", 100, 100, engine as any, vi.fn(), context);
    expect(engine.moveLayer).not.toHaveBeenCalled();
  });

  it("pointerMove updates dragCurrent", () => {
    const engine = createMockEngine();
    const context = createContext({ isDragging: true });
    handlePointerMove("move", 300, 200, engine as any, vi.fn(), context);
    expect(context.dragCurrent).toEqual({ x: 300, y: 200 });
  });

  it("pointerUp clears snap lines for move tool", () => {
    const onSnapLines = vi.fn();
    const context = createContext({ isDragging: true, onSnapLines });
    handlePointerUp("move", 100, 100, {} as any, {} as any, vi.fn(), context);
    expect(onSnapLines).toHaveBeenCalledWith([]);
    expect(context.isDragging).toBe(false);
  });

  it("pointerUp without drag is no-op", () => {
    const onSnapLines = vi.fn();
    const context = createContext({ isDragging: false, onSnapLines });
    handlePointerUp("move", 100, 100, {} as any, {} as any, vi.fn(), context);
    expect(onSnapLines).not.toHaveBeenCalled();
  });

  it("non-move tools do not trigger moveLayer", () => {
    const engine = createMockEngine();
    const history = { commit: vi.fn() };
    const context = createContext();
    handlePointerDown("brush", 150, 80, engine as any, history as any, vi.fn(), context);
    expect(engine.moveLayer).not.toHaveBeenCalled();
  });

  it("handlePointerUp uses dragTool from pointerdown even when called with different tool", () => {
    const context = createContext({ isDragging: false });
    const requestRender = vi.fn();
    const onSnapLines = vi.fn();
    context.onSnapLines = onSnapLines;

    // Start a brush drag — sets dragTool to "brush"
    handlePointerDown("brush", 50, 50, {} as any, {} as any, requestRender, context);
    expect(context.dragTool).toBe("brush");

    // Call handlePointerUp with "move" (simulating tool switch mid-drag)
    // Internally uses context.dragTool === "brush", so it should not trigger move cleanup
    handlePointerUp("move", 55, 55, {} as any, {} as any, requestRender, context);

    // The brush tool branch in handlePointerUp does not call onSnapLines
    expect(onSnapLines).not.toHaveBeenCalled();

    // dragTool should still be set (cleared by caller, not by handlePointerUp)
    expect(context.dragTool).toBe("brush");
  });

  it("handlePointerMove uses dragTool from pointerdown even when called with different tool", () => {
    const context = createContext({ isDragging: false });
    const requestRender = vi.fn();

    // Start a brush drag
    handlePointerDown("brush", 50, 50, {} as any, {} as any, requestRender, context);
    expect(context.dragTool).toBe("brush");
    expect(context.isDragging).toBe(true);

    // Move with "move" tool param — internally uses dragTool "brush"
    const engine = createMockEngine();
    handlePointerMove("move", 60, 60, engine as any, requestRender, context);

    // Should NOT call engine.moveLayer because brush branch doesn't move layers
    expect(engine.moveLayer).not.toHaveBeenCalled();
  });
});

describe("input-handler: move tool — deferred history commit (regression 2026-06-18)", () => {
  /**
   * User report: "saat memindahkan layer atau operasi lainnya kadang kayak
   * ke save dihistory kadang tidak". Root cause was pointerDown unconditionally
   * pushing engine.snapshot() to the undo stack even when the user clicked
   * a layer without dragging it. The ghost entries made undo appear to skip
   * with no visual change. The fix defers commit to pointerUp and only commits
   * if layer.transform actually changed.
   */

  function setupMoveDragSequence(
    initialX = 100,
    initialY = 50,
    locked = false,
  ) {
    let currentX = initialX;
    let currentY = initialY;
    const engine = {
      snapshot: vi.fn(() => ({ snap: Date.now() })),
      moveLayer: vi.fn((_id: string, x: number, y: number) => {
        currentX = x;
        currentY = y;
      }),
      getLayer: vi.fn(() => ({
        id: "layer-1",
        transform: {
          x: currentX,
          y: currentY,
          scaleX: 1,
          scaleY: 1,
          rotation: 0,
          flipH: false,
          flipV: false,
        },
        locked,
        width: 200,
        height: 150,
      })),
    };
    const history = { commit: vi.fn() };
    const context = createContext();
    return { engine, history, context, getCurrentX: () => currentX, getCurrentY: () => currentY };
  }

  it("click without drag: pointerDown → pointerUp at same coords → zero history entries", () => {
    const { engine, history, context } = setupMoveDragSequence();
    handlePointerDown("move", 150, 80, engine as any, history as any, vi.fn(), context);
    handlePointerUp("move", 150, 80, engine as any, history as any, vi.fn(), context);
    expect(history.commit).not.toHaveBeenCalled();
  });

  it("click without drag (pointerdown only): no history entry produced", () => {
    const { engine, history, context } = setupMoveDragSequence();
    handlePointerDown("move", 150, 80, engine as any, history as any, vi.fn(), context);
    expect(history.commit).not.toHaveBeenCalled();
  });

  it("drag with actual movement: exactly ONE history entry", () => {
    const { engine, history, context } = setupMoveDragSequence();
    handlePointerDown("move", 150, 80, engine as any, history as any, vi.fn(), context);
    handlePointerMove("move", 200, 130, engine as any, vi.fn(), context);
    handlePointerUp("move", 200, 130, engine as any, history as any, vi.fn(), context);
    expect(history.commit).toHaveBeenCalledTimes(1);
  });

  it("drag with actual movement: commits the PRE-drag snapshot (captured at pointerdown)", () => {
    const { engine, history, context } = setupMoveDragSequence();
    handlePointerDown("move", 150, 80, engine as any, history as any, vi.fn(), context);
    // engine.snapshot was called once during pointerdown to stash.
    const stashedSnapshot = (engine.snapshot as any).mock.results[0].value;
    handlePointerMove("move", 200, 130, engine as any, vi.fn(), context);
    handlePointerUp("move", 200, 130, engine as any, history as any, vi.fn(), context);
    expect(history.commit).toHaveBeenCalledWith(stashedSnapshot);
  });

  it("drag back to original position: no history entry (layer.transform unchanged)", () => {
    const { engine, history, context } = setupMoveDragSequence(100, 50);
    handlePointerDown("move", 150, 80, engine as any, history as any, vi.fn(), context);
    // Move away, then back. After pointermove(150, 80), newX = 150 - 50 = 100, newY = 80 - 30 = 50.
    handlePointerMove("move", 250, 130, engine as any, vi.fn(), context);
    handlePointerMove("move", 150, 80, engine as any, vi.fn(), context);
    handlePointerUp("move", 150, 80, engine as any, history as any, vi.fn(), context);
    // Layer is back at original (100, 50) — no commit.
    expect(history.commit).not.toHaveBeenCalled();
  });

  it("locked layer: pointerDown stashes nothing, pointerUp commits nothing", () => {
    const { engine, history, context } = setupMoveDragSequence(100, 50, true);
    handlePointerDown("move", 150, 80, engine as any, history as any, vi.fn(), context);
    expect((context as any).pendingHistorySnapshot).toBeNull();
    handlePointerUp("move", 200, 130, engine as any, history as any, vi.fn(), context);
    expect(history.commit).not.toHaveBeenCalled();
  });

  it("no selected layer: pointerDown stashes nothing, pointerUp commits nothing", () => {
    const { engine, history, context: ctx } = setupMoveDragSequence();
    const context = { ...ctx, selectedLayerId: null };
    handlePointerDown("move", 150, 80, engine as any, history as any, vi.fn(), context);
    expect((context as any).pendingHistorySnapshot).toBeFalsy();
    handlePointerUp("move", 200, 130, engine as any, history as any, vi.fn(), context);
    expect(history.commit).not.toHaveBeenCalled();
  });

  it("three consecutive clicks without drag: zero history entries (no ghost spam)", () => {
    const { engine, history, context } = setupMoveDragSequence();
    for (let i = 0; i < 3; i++) {
      handlePointerDown("move", 150, 80, engine as any, history as any, vi.fn(), context);
      handlePointerUp("move", 150, 80, engine as any, history as any, vi.fn(), context);
    }
    expect(history.commit).not.toHaveBeenCalled();
  });

  it("three consecutive drags: exactly THREE history entries", () => {
    const { engine, history, context } = setupMoveDragSequence();
    for (let i = 0; i < 3; i++) {
      handlePointerDown("move", 150, 80, engine as any, history as any, vi.fn(), context);
      handlePointerMove("move", 150 + (i + 1) * 10, 80, engine as any, vi.fn(), context);
      handlePointerUp("move", 150 + (i + 1) * 10, 80, engine as any, history as any, vi.fn(), context);
    }
    expect(history.commit).toHaveBeenCalledTimes(3);
  });

  it("pending state is cleared after pointerUp (no leak into next gesture)", () => {
    const { engine, history, context } = setupMoveDragSequence();
    handlePointerDown("move", 150, 80, engine as any, history as any, vi.fn(), context);
    handlePointerMove("move", 200, 130, engine as any, vi.fn(), context);
    handlePointerUp("move", 200, 130, engine as any, history as any, vi.fn(), context);
    expect((context as any).pendingHistorySnapshot).toBeNull();
    expect((context as any).pendingOriginalLayerPos).toBeNull();
  });

  it("pending state defensively cleared at next pointerDown even after stale leak", () => {
    const { engine, history, context } = setupMoveDragSequence();
    // Simulate a stale pending state from a crashed gesture.
    (context as any).pendingHistorySnapshot = { stale: true };
    (context as any).pendingOriginalLayerPos = { x: 999, y: 999 };

    // A new pointerdown for a locked layer must clear the stale snapshot
    // so pointerUp doesn't commit it by accident.
    const lockedEngine = setupMoveDragSequence(100, 50, true).engine;
    handlePointerDown("move", 150, 80, lockedEngine as any, history as any, vi.fn(), context);

    expect((context as any).pendingHistorySnapshot).toBeNull();
    expect((context as any).pendingOriginalLayerPos).toBeNull();
  });
});

describe("input-handler: selection-move — deferred history commit (regression 2026-06-18)", () => {
  /**
   * Same regression class as move-tool but for the selection-move path
   * (clicking inside an existing selection to drag it).
   */

  function createSelectionContext(overrides: Record<string, any> = {}) {
    return createContext({
      selectionBounds: { x: 100, y: 100, width: 200, height: 150 },
      onSelectionMoved: vi.fn(),
      ...overrides,
    });
  }

  it("click inside selection without drag: zero history entries", () => {
    const engine = createMockEngine();
    const history = { commit: vi.fn() };
    const context = createSelectionContext();
    // Click inside selection at (150, 150)
    handlePointerDown("selection", 150, 150, engine as any, history as any, vi.fn(), context);
    handlePointerUp("selection", 150, 150, engine as any, history as any, vi.fn(), context);
    expect(history.commit).not.toHaveBeenCalled();
  });

  it("click + drag inside selection: exactly ONE history entry", () => {
    const engine = createMockEngine();
    const history = { commit: vi.fn() };
    const context = createSelectionContext();
    handlePointerDown("selection", 150, 150, engine as any, history as any, vi.fn(), context);
    handlePointerUp("selection", 300, 250, engine as any, history as any, vi.fn(), context);
    expect(history.commit).toHaveBeenCalledTimes(1);
  });

  it("pointerDown inside selection stashes snapshot but does NOT commit", () => {
    const engine = createMockEngine();
    const history = { commit: vi.fn() };
    const context = createSelectionContext();
    handlePointerDown("selection", 150, 150, engine as any, history as any, vi.fn(), context);
    expect(history.commit).not.toHaveBeenCalled();
    expect((context as any).pendingHistorySnapshot).not.toBeNull();
    expect((context as any).pendingOriginalSelectionPos).toEqual({ x: 100, y: 100 });
  });

  it("drag back to original selection position: no commit", () => {
    const engine = createMockEngine();
    const history = { commit: vi.fn() };
    const context = createSelectionContext();
    handlePointerDown("selection", 150, 150, engine as any, history as any, vi.fn(), context);
    // Drag selection by 100, then drag back to original (150, 150)
    handlePointerUp("selection", 150, 150, engine as any, history as any, vi.fn(), context);
    expect(history.commit).not.toHaveBeenCalled();
  });

  it("click OUTSIDE selection: stashes nothing (draw mode, not move)", () => {
    const engine = createMockEngine();
    const history = { commit: vi.fn() };
    const context = createSelectionContext();
    // Click at (50, 50) which is outside the (100, 100, 200, 150) bounds
    handlePointerDown("selection", 50, 50, engine as any, history as any, vi.fn(), context);
    expect((context as any).pendingHistorySnapshot).toBeNull();
    expect((context as any).pendingOriginalSelectionPos).toBeNull();
    expect(history.commit).not.toHaveBeenCalled();
  });

  it("pending state cleared after pointerUp (selection)", () => {
    const engine = createMockEngine();
    const history = { commit: vi.fn() };
    const context = createSelectionContext();
    handlePointerDown("selection", 150, 150, engine as any, history as any, vi.fn(), context);
    handlePointerUp("selection", 300, 250, engine as any, history as any, vi.fn(), context);
    expect((context as any).pendingHistorySnapshot).toBeNull();
    expect((context as any).pendingOriginalSelectionPos).toBeNull();
  });
});
