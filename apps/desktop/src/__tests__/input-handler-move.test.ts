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
    isAltPressed: false,
    isDragging: false,
    dragStart: { x: 0, y: 0 },
    dragCurrent: { x: 0, y: 0 },
    selectedLayerId: "layer-1",
    strokePoints: [],
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

  it("pointerDown commits history snapshot before unlocked move", () => {
    const engine = createMockEngine();
    const history = { commit: vi.fn() };
    const context = createContext();
    handlePointerDown("move", 150, 80, engine as any, history as any, vi.fn(), context);
    expect(history.commit).toHaveBeenCalledWith({});
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
});
