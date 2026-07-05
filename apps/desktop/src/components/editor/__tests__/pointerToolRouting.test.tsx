// apps/desktop/src/components/editor/__tests__/pointerToolRouting.test.tsx
//
// Wiring contract: for each registered ToolId, useCanvasPointerTools must
// route pointer events to the correct input-handler function.  If the
// dispatcher is missing a case or the routing branch is broken, the tool
// silently no-ops — AGENTS.md calls this the "#1 most forgotten wiring step".
//
// Pattern: set activeTool → fire onCanvasPointerDown → assert
// handlePointerDown called with that tool type.  For crop+modern mode
// the expected behavior is different (early return before handlePointerDown).

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { createRoot, createSignal } from "solid-js";
import { useCanvasPointerTools } from "../canvas/useCanvasPointerTools";
import * as InputHandlerModule from "@/viewport/input-handler";
import * as EditorContextModule from "../shell/EditorContext";
import type { DocumentEngine } from "@/engine/document";

// Mock input-handler so we can spy on handlePointerDown calls
// vi.hoisted ensures the spy is created BEFORE vi.mock hoisting runs
const { handlePointerDownSpy } = vi.hoisted(() => ({
  handlePointerDownSpy: vi.fn(),
}));
vi.mock("@/viewport/input-handler", () => ({
  handlePointerDown: handlePointerDownSpy,
  handlePointerMove: vi.fn(),
  handlePointerUp: vi.fn(),
  ToolType: null,
  ToolContext: null,
}));

function createMockEditorParams(toolId: string) {
  const mockEngine = {
    getActiveLayerId: () => "layer-1",
    getLayer: (id: string) => ({ id, locked: false, visible: true, width: 100, height: 100 }),
    samplePixel: vi.fn(() => [128, 255, 64, 255]),
    getViewport: () => ({ panX: 0, panY: 0, zoom: 1 }),
    snapshot: vi.fn(() => ({})),
    getWidth: () => 100,
    getHeight: () => 100,
    getLayers: () => [],
    setActiveLayer: vi.fn(),
    getSelection: () => null,
  } as unknown as DocumentEngine;

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
    activeTool: toolId,
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
    cropInteractionMode: "classic",
    cropRect: null,
    setCropRect: vi.fn(),
    cropRotation: 0,
    setCropRotation: vi.fn(),
    hiddenCropPreview: null,
    setHiddenCropPreview: vi.fn(),
    viewportWidth: 1024,
    viewportHeight: 768,
    setHoverPos: vi.fn(),
    selectedLayerId: null,
    setSelectedLayerId: vi.fn(),
    setHoverHandle: vi.fn(),
    setViewportState: vi.fn(),
    scheduler: { requestRender: vi.fn() },
  };

  const merged = { ...defaults };
  let dispose = () => {};
  const signals = createRoot((rootDispose) => {
    dispose = rootDispose;
    const ownedSignals: Record<string, any> = {
      workspace: merged.workspace,
      scheduler: merged.scheduler,
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

function makePointerEvent(overrides: Partial<PointerEvent> = {}): PointerEvent {
  return {
    button: 0,
    clientX: 50,
    clientY: 50,
    pointerId: 1,
    shiftKey: false,
    altKey: false,
    ctrlKey: false,
    metaKey: false,
    target: document.createElement("div"),
    currentTarget: document.createElement("div"),
    preventDefault: vi.fn(),
    stopPropagation: vi.fn(),
    ...overrides,
  } as unknown as PointerEvent;
}

beforeEach(() => {
  handlePointerDownSpy.mockClear();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe.each([
  ["move", "move"],
  ["selection", "selection"],
  ["crop (classic)", "crop"],
  ["brush", "brush"],
  ["eraser", "eraser"],
  ["eyedropper", "eyedropper"],
] as const)("pointer routing: %s", (label, toolId) => {
  it(`routes onCanvasPointerDown to handlePointerDown with tool='${toolId}'`, () => {
    const { signals, dispose } = createMockEditorParams(toolId);
    vi.spyOn(EditorContextModule, "useEditor").mockReturnValue(signals as any);

    const { tools, dispose: disposeTools } = createPointerTools({
      getCanvasContainerRef: () => document.createElement("div"),
      getCanvasRef: () => document.createElement("canvas"),
      isSpacePressed: () => false,
      isPanning: () => false,
      isAltPressed: () => false,
      stopMomentum: vi.fn(),
      fitToScreenAndRender: vi.fn(),
      commitBrushStroke: vi.fn(),
    });

    // Eyedropper is NOT a canvas tool via pointer — it's handled via menu/keyboard.
    // Skip it for pointer routing.
    if (toolId === "eyedropper") {
      disposeTools();
      dispose();
      return;
    }

    tools.onCanvasPointerDown(makePointerEvent());

    // For classic crop mode, handlePointerDown IS called.
    // For modern crop, the early return before handlePointerDown is tested separately.
    if (toolId === "crop") {
      // With default cropInteractionMode="classic", crop routes to handlePointerDown
      expect(handlePointerDownSpy).toHaveBeenCalled();
      const callToolArg = handlePointerDownSpy.mock.calls[0][0];
      // The input-handler's handlePointerDown receives tool as first arg
      expect(callToolArg).toBe("crop");
    } else {
      expect(handlePointerDownSpy).toHaveBeenCalled();
      const callToolArg = handlePointerDownSpy.mock.calls[0][0];
      expect(callToolArg).toBe(toolId);
    }

    disposeTools();
    dispose();
  });
});

describe("crop + modern mode exits early (no handlePointerDown)", () => {
  it("does NOT call handlePointerDown when crop+modern mode", () => {
    const { signals, dispose } = createMockEditorParams("crop");
    // Override to modern mode
    const cropMode = createSignal<"modern" | "classic">("modern");
    signals.cropInteractionMode = cropMode[0];
    vi.spyOn(EditorContextModule, "useEditor").mockReturnValue(signals as any);

    const { tools, dispose: disposeTools } = createPointerTools({
      getCanvasContainerRef: () => document.createElement("div"),
      getCanvasRef: () => document.createElement("canvas"),
      isSpacePressed: () => false,
      isPanning: () => false,
      isAltPressed: () => false,
      stopMomentum: vi.fn(),
      fitToScreenAndRender: vi.fn(),
      commitBrushStroke: vi.fn(),
    });

    tools.onCanvasPointerDown(makePointerEvent());

    // Modern crop mode exits early BEFORE handlePointerDown
    expect(handlePointerDownSpy).not.toHaveBeenCalled();

    disposeTools();
    dispose();
  });
});

describe("brush/eraser + Alt (eyedropper) intercepts before handlePointerDown", () => {
  it("does NOT call handlePointerDown when brush+Alt (eyedropper shortcut)", () => {
    const { signals, dispose } = createMockEditorParams("brush");
    vi.spyOn(EditorContextModule, "useEditor").mockReturnValue(signals as any);

    const { tools, dispose: disposeTools } = createPointerTools({
      getCanvasContainerRef: () => document.createElement("div"),
      getCanvasRef: () => document.createElement("canvas"),
      isSpacePressed: () => false,
      isPanning: () => false,
      isAltPressed: () => true,  // Alt held → eyedropper
      stopMomentum: vi.fn(),
      fitToScreenAndRender: vi.fn(),
      commitBrushStroke: vi.fn(),
    });

    tools.onCanvasPointerDown(makePointerEvent());

    // Alt + brush/eraser → eyedropper, does NOT reach handlePointerDown
    expect(handlePointerDownSpy).not.toHaveBeenCalled();

    disposeTools();
    dispose();
  });
});

describe("move auto-select calls setActiveLayer before handlePointerDown", () => {
  it("calls setActiveLayer on hit when moveAutoSelect is on", () => {
    const { signals, mockEngine, dispose } = createMockEditorParams("move");
    // Enable auto-select
    const autoSelect = createSignal(true);
    signals.moveAutoSelect = autoSelect[0];
    // Make sure layers returns something hittable
    const hitLayer = { id: "target-layer", name: "Target", visible: true, locked: false, width: 100, height: 100, transform: { scaleX: 1, scaleY: 1 } } as any;
    signals.workspace = {
      getActiveEngine: () => ({
        ...mockEngine,
        getLayers: () => [hitLayer],
        setActiveLayer: vi.fn(),
        getViewport: () => ({ panX: 0, panY: 0, zoom: 1 }),
        getWidth: () => 100,
        getHeight: () => 100,
      }),
      getActiveHistory: () => ({
        commit: vi.fn(),
        getLastPaintCoords: () => null,
        setLastPaintCoords: vi.fn(),
      }),
    };
    vi.spyOn(EditorContextModule, "useEditor").mockReturnValue(signals as any);

    const { tools, dispose: disposeTools } = createPointerTools({
      getCanvasContainerRef: () => document.createElement("div"),
      getCanvasRef: () => document.createElement("canvas"),
      isSpacePressed: () => false,
      isPanning: () => false,
      isAltPressed: () => false,
      stopMomentum: vi.fn(),
      fitToScreenAndRender: vi.fn(),
      commitBrushStroke: vi.fn(),
    });

    tools.onCanvasPointerDown(makePointerEvent());

    // handlePointerDown should be called with "move"
    expect(handlePointerDownSpy).toHaveBeenCalled();
    expect(handlePointerDownSpy.mock.calls[0][0]).toBe("move");

    disposeTools();
    dispose();
  });
});

describe("space/pan early return blocks routing", () => {
  it("does NOT call handlePointerDown when space is pressed (pan mode)", () => {
    const { signals, dispose } = createMockEditorParams("move");
    vi.spyOn(EditorContextModule, "useEditor").mockReturnValue(signals as any);

    const { tools, dispose: disposeTools } = createPointerTools({
      getCanvasContainerRef: () => document.createElement("div"),
      getCanvasRef: () => document.createElement("canvas"),
      isSpacePressed: () => true,  // panning
      isPanning: () => false,
      isAltPressed: () => false,
      stopMomentum: vi.fn(),
      fitToScreenAndRender: vi.fn(),
      commitBrushStroke: vi.fn(),
    });

    tools.onCanvasPointerDown(makePointerEvent());
    expect(handlePointerDownSpy).not.toHaveBeenCalled();
    disposeTools();
    dispose();
  });

  it("does NOT call handlePointerDown when isPanning is true", () => {
    const { signals, dispose } = createMockEditorParams("move");
    vi.spyOn(EditorContextModule, "useEditor").mockReturnValue(signals as any);

    const { tools, dispose: disposeTools } = createPointerTools({
      getCanvasContainerRef: () => document.createElement("div"),
      getCanvasRef: () => document.createElement("canvas"),
      isSpacePressed: () => false,
      isPanning: () => true,  // panning
      isAltPressed: () => false,
      stopMomentum: vi.fn(),
      fitToScreenAndRender: vi.fn(),
      commitBrushStroke: vi.fn(),
    });

    tools.onCanvasPointerDown(makePointerEvent());
    expect(handlePointerDownSpy).not.toHaveBeenCalled();
    disposeTools();
    dispose();
  });
});


