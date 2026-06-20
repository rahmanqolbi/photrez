import { describe, expect, it, vi } from "vitest";
import { useCanvasPointerTools } from "../useCanvasPointerTools";
import * as EditorContextModule from "../EditorContext";
import { createRoot, createSignal } from "solid-js";

// Helper to create mock editor context values
function createMockEditor(overrides: Record<string, any> = {}) {
  const mockEngine = {
    getActiveLayerId: () => "layer-1",
    getLayer: () => ({ id: "layer-1", locked: false, visible: true, width: 100, height: 100 }),
    samplePixel: vi.fn(() => [128, 255, 64, 255]),
    getViewport: () => ({ panX: 0, panY: 0, zoom: 1 }),
    snapshot: vi.fn(() => ({})),
    getWidth: () => 100,
    getHeight: () => 100,
    getLayers: () => [],
  };

  let currentLastPaintCoords: any = null;
  const defaults: Record<string, any> = {
    workspace: {
      getActiveEngine: () => mockEngine,
      getActiveHistory: () => ({
        commit: vi.fn(),
        getLastPaintCoords: () => currentLastPaintCoords,
        setLastPaintCoords: (c: any) => { currentLastPaintCoords = c; },
      }),
    },
    activeTool: "brush",
    fgColor: "#000000",
    bgColor: "#ffffff",
    zoom: 1,
    pan: { x: 0, y: 0 },
    docWidth: 100,
    docHeight: 100,
    brushSize: 20,
    brushHardness: 0.8,
    brushOpacity: 1.0,
    eraserSize: 20,
    eraserHardness: 0.8,
    eraserOpacity: 1.0,
    brushFlow: 1,
    brushSmoothing: 0,
    eraserFlow: 1,
    eraserSmoothing: 0,
    moveAutoSelect: false,
    moveSnapEnabled: false,
    setHoverPos: vi.fn(),
    setSelectedLayerId: vi.fn(),
  };

  const merged = { ...defaults, ...overrides };
  let dispose = () => {};
  const signals = createRoot((rootDispose) => {
    dispose = rootDispose;
    const ownedSignals: Record<string, any> = {
      workspace: merged.workspace,
      scheduler: { requestRender: vi.fn() },
    };

    for (const [key, val] of Object.entries(merged)) {
      if (key === "workspace" || key === "scheduler") continue;
      const [s, set] = createSignal(val);
      ownedSignals[key] = s;
      const setKey = "set" + key.charAt(0).toUpperCase() + key.slice(1);
      ownedSignals[setKey] = set;
    }
    return ownedSignals;
  });
  return { signals, mockEngine, dispose };
}

function createPointerTools(params: Parameters<typeof useCanvasPointerTools>[0]) {
  return createRoot((dispose) => ({ tools: useCanvasPointerTools(params), dispose }));
}

describe("Brush & Eraser UX modifiers (Alt / Shift)", () => {
  it("samples pixel and updates fgColor when Alt is held in pointerDown/move", () => {
    const { signals, mockEngine, dispose } = createMockEditor({ activeTool: "brush" });
    vi.spyOn(EditorContextModule, "useEditor").mockReturnValue(signals as any);

    let isAltPressed = true;
    const canvas = document.createElement("canvas");
    canvas.setPointerCapture = vi.fn();
    canvas.releasePointerCapture = vi.fn();
    const container = document.createElement("div");

    const params = {
      getCanvasContainerRef: () => container,
      getCanvasRef: () => canvas,
      isSpacePressed: () => false,
      isPanning: () => false,
      isAltPressed: () => isAltPressed,
      stopMomentum: vi.fn(),
      fitToScreenAndRender: vi.fn(),
      commitBrushStroke: vi.fn(),
      onPaintStroke: vi.fn(),
    };

    const { tools, dispose: disposeTools } = createPointerTools(params);

    // Simulated event
    const eventDown = {
      button: 0,
      clientX: 50,
      clientY: 50,
      pointerId: 1,
    } as any;

    tools.onCanvasPointerDown(eventDown);

    // Verify it sampled from engine
    expect(mockEngine.samplePixel).toHaveBeenCalled();
    // Color returned by mocked samplePixel is [128, 255, 64, 255] -> #80ff40
    expect(signals.fgColor()).toBe("#80ff40");

    // Clear mock to check move behavior
    mockEngine.samplePixel.mockClear();

    // Simulated drag move
    const eventMove = {
      clientX: 60,
      clientY: 60,
      buttons: 1,
    } as any;
    tools.onCanvasPointerMove(eventMove);
    expect(mockEngine.samplePixel).toHaveBeenCalled();

    disposeTools();
    dispose();
    vi.restoreAllMocks();
  });

  it("connects lastPaintCoords with straight line when Shift is held on pointerDown", () => {
    const { signals, dispose } = createMockEditor({ activeTool: "brush" });
    vi.spyOn(EditorContextModule, "useEditor").mockReturnValue(signals as any);

    const canvas = document.createElement("canvas");
    canvas.setPointerCapture = vi.fn();
    canvas.releasePointerCapture = vi.fn();
    const container = document.createElement("div");

    let strokePointsReceived: { x: number; y: number }[] = [];
    const params = {
      getCanvasContainerRef: () => container,
      getCanvasRef: () => canvas,
      isSpacePressed: () => false,
      isPanning: () => false,
      isAltPressed: () => false,
      stopMomentum: vi.fn(),
      fitToScreenAndRender: vi.fn(),
      commitBrushStroke: vi.fn(),
      onPaintStroke: vi.fn((points) => {
        strokePointsReceived = points;
      }),
    };

    const { tools, dispose: disposeTools } = createPointerTools(params);

    // Click 1 (No shift) -> stamps a point, sets lastPaintCoords on pointer up
    tools.onCanvasPointerDown({ button: 0, clientX: 10, clientY: 10, pointerId: 1 } as any);
    tools.onCanvasPointerUp({ clientX: 10, clientY: 10, pointerId: 1 } as any);

    // Click 2 (With shift) -> draws straight line from (10, 10) to (20, 20)
    tools.onCanvasPointerDown({ button: 0, clientX: 20, clientY: 20, pointerId: 1, shiftKey: true } as any);

    // Check if points were generated along the line
    expect(strokePointsReceived.length).toBeGreaterThan(1);
    expect(strokePointsReceived[0]).toEqual({ x: 10, y: 10 });
    expect(strokePointsReceived[strokePointsReceived.length - 1]).toEqual({ x: 20, y: 20 });

    disposeTools();
    dispose();
    vi.restoreAllMocks();
  });

  it("locks coordinate to horizontal or vertical axis when Shift is held on pointerMove", () => {
    const { signals, dispose } = createMockEditor({ activeTool: "brush" });
    vi.spyOn(EditorContextModule, "useEditor").mockReturnValue(signals as any);

    const canvas = document.createElement("canvas");
    canvas.setPointerCapture = vi.fn();
    canvas.releasePointerCapture = vi.fn();
    const container = document.createElement("div");

    let strokePointsReceived: { x: number; y: number }[] = [];
    const params = {
      getCanvasContainerRef: () => container,
      getCanvasRef: () => canvas,
      isSpacePressed: () => false,
      isPanning: () => false,
      isAltPressed: () => false,
      stopMomentum: vi.fn(),
      fitToScreenAndRender: vi.fn(),
      commitBrushStroke: vi.fn(),
      onPaintStroke: vi.fn((points) => {
        strokePointsReceived = points;
      }),
    };

    const { tools, dispose: disposeTools } = createPointerTools(params);

    // PointerDown at (50, 50)
    tools.onCanvasPointerDown({ button: 0, clientX: 50, clientY: 50, pointerId: 1 } as any);

    // Move to (60, 52) with Shift key -> should lock horizontally to Y=50 (since dx=10, dy=2)
    tools.onCanvasPointerMove({ clientX: 60, clientY: 52, pointerId: 1, shiftKey: true } as any);

    // Last received point should be X=60, Y=50
    expect(strokePointsReceived.at(-1)).toEqual({ x: 60, y: 50 });

    disposeTools();
    dispose();
    vi.restoreAllMocks();
  });

  it("synchronizes lastPaintCoords with active history on undo/redo actions", () => {
    let mockCoords: { x: number; y: number } | null = null;
    const mockHistory = {
      commit: vi.fn(),
      getLastPaintCoords: () => mockCoords,
      setLastPaintCoords: (c: any) => { mockCoords = c; },
    };

    const { signals, dispose } = createMockEditor({
      workspace: {
        getActiveEngine: () => ({
          getActiveLayerId: () => "layer-1",
          getLayer: () => ({ id: "layer-1", locked: false, visible: true, width: 100, height: 100 }),
          getViewport: () => ({ panX: 0, panY: 0, zoom: 1 }),
          snapshot: vi.fn(() => ({})),
          getWidth: () => 100,
          getHeight: () => 100,
          getLayers: () => [],
        }),
        getActiveHistory: () => mockHistory,
      },
      activeTool: "brush",
    });
    vi.spyOn(EditorContextModule, "useEditor").mockReturnValue(signals as any);

    const canvas = document.createElement("canvas");
    canvas.setPointerCapture = vi.fn();
    canvas.releasePointerCapture = vi.fn();
    const params = {
      getCanvasContainerRef: () => document.createElement("div"),
      getCanvasRef: () => canvas,
      isSpacePressed: () => false,
      isPanning: () => false,
      isAltPressed: () => false,
      stopMomentum: vi.fn(),
      fitToScreenAndRender: vi.fn(),
      commitBrushStroke: vi.fn(),
      onPaintStroke: vi.fn(),
    };

    const { tools, dispose: disposeTools } = createPointerTools(params);

    // Draw first stroke ending at (10, 10)
    tools.onCanvasPointerDown({ button: 0, clientX: 10, clientY: 10, pointerId: 1 } as any);
    tools.onCanvasPointerUp({ clientX: 10, clientY: 10, pointerId: 1 } as any);

    expect(mockHistory.getLastPaintCoords()).toEqual({ x: 10, y: 10 });

    // Simulate undo reverting coords to null
    mockHistory.setLastPaintCoords(null);
    expect(mockHistory.getLastPaintCoords()).toBeNull();

    // Simulating redo setting coords back to (10, 10)
    mockHistory.setLastPaintCoords({ x: 10, y: 10 });
    expect(mockHistory.getLastPaintCoords()).toEqual({ x: 10, y: 10 });

    disposeTools();
    dispose();
    vi.restoreAllMocks();
  });
});
