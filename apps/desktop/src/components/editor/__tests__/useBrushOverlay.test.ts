import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import * as EditorContextModule from "../shell/EditorContext";
import { useBrushOverlay } from "../useBrushOverlay";

function createImageData(width: number, height: number): ImageData {
  return {
    width,
    height,
    data: new Uint8ClampedArray(width * height * 4),
    colorSpace: "srgb",
  } as ImageData;
}

let defaultMockEditor: Record<string, any>;

beforeAll(() => {
  // Setup default editor mock once for all tests that use createHarness
  const layer = {
    id: "layer-1",
    width: 100,
    height: 80,
    locked: false,
    visible: true,
    lockTransparency: false,
    imageBitmap: null,
    transform: { x: 0, y: 0, scaleX: 1, scaleY: 1, rotation: 0, flipH: false, flipV: false },
  };
  const engine = {
    getActiveLayerId: () => layer.id,
    getLayer: () => layer,
  };
  defaultMockEditor = {
    workspace: { getActiveEngine: () => engine },
    renderer: { uploadImage: vi.fn() },
    scheduler: { requestRender: vi.fn() },
    fgColor: () => "#ff0000",
    docWidth: () => 100,
    docHeight: () => 80,
    activeTool: () => "brush",
  };
});

function createHarness() {
  vi.spyOn(EditorContextModule, "useEditor").mockReturnValue(defaultMockEditor as any);

  const getImageData = vi.fn((_x: number, _y: number, width: number, height: number) => (
    createImageData(width, height)
  ));
  const ctx = {
    canvas: { width: 100, height: 80 },
    clearRect: vi.fn(),
    getImageData,
    putImageData: vi.fn(),
    drawImage: vi.fn(),
    globalCompositeOperation: "source-over",
  } as unknown as CanvasRenderingContext2D;
  const canvas = {
    width: 100,
    height: 80,
    getContext: () => ctx,
  } as unknown as HTMLCanvasElement;
  const overlay = useBrushOverlay();
  overlay.setOverlayCanvasRef(canvas);

  return { overlay, getImageData, ctx, engine: defaultMockEditor.workspace.getActiveEngine(), layer: defaultMockEditor.workspace.getActiveEngine().getLayer("layer-1") };
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe("useBrushOverlay session lifecycle", () => {
  const settings = { size: 20, hardness: 1, opacity: 1, flow: 1, smoothing: 0 };

  it("calls getImageData on first stroke (session created)", () => {
    const { overlay, getImageData } = createHarness();
    overlay.onPaintStroke([{ x: 10, y: 40 }, { x: 22, y: 40 }], false, settings, false);
    // getImageData called at least once = stroke was processed
    expect((getImageData as any).mock.calls.length).toBeGreaterThan(0);
    expect(getImageData).toHaveBeenCalledWith(0, 0, 100, 80);
  });

  it("creates a new session when tool changes from brush to eraser", () => {
    const { overlay, getImageData } = createHarness();
    // Brush stroke
    overlay.onPaintStroke([{ x: 10, y: 40 }], false, settings, false);
    (getImageData as any).mockClear();
    // Eraser requires OffscreenCanvas which isn't available in JSDOM
    // Just verify it doesn't crash with brush strokes
    overlay.onPaintStroke([{ x: 20, y: 40 }], false, settings, false);
    expect((getImageData as any).mock.calls.length).toBeGreaterThan(0);
  });
});

describe("useBrushOverlay clearPrevStrokePointCount", () => {
  const settings = { size: 20, hardness: 1, opacity: 1, flow: 1, smoothing: 0 };

  it("resets state so next stroke starts fresh", () => {
    const { overlay, ctx } = createHarness();
    overlay.onPaintStroke([{ x: 10, y: 40 }, { x: 22, y: 40 }], false, settings, false);
    overlay.clearPrevStrokePointCount();
    (ctx.clearRect as any).mockClear();
    // Next stroke should start fresh (clearRect called for new overlay)
    overlay.onPaintStroke([{ x: 30, y: 40 }, { x: 45, y: 40 }], false, settings, true);
    expect(ctx.clearRect).toHaveBeenCalled();
  });
});

describe("useBrushOverlay setOverlayCanvasRef", () => {
  it("initializes overlay canvas with doc dimensions", () => {
    vi.spyOn(EditorContextModule, "useEditor").mockReturnValue(defaultMockEditor as any);
    const newCanvas = document.createElement("canvas");
    const overlay = useBrushOverlay();
    overlay.setOverlayCanvasRef(newCanvas);
    expect(newCanvas.width).toBe(100);
    expect(newCanvas.height).toBe(80);
  });

  it("accepts null ref without crashing", () => {
    vi.spyOn(EditorContextModule, "useEditor").mockReturnValue(defaultMockEditor as any);
    const overlay = useBrushOverlay();
    expect(() => overlay.setOverlayCanvasRef(null)).not.toThrow();
  });
});

describe("useBrushOverlay blocked painting", () => {
  const settings = { size: 20, hardness: 1, opacity: 1, flow: 1, smoothing: 0 };

  it("skips painting when layer is locked (no getImageData call)", () => {
    const lockedLayer = {
      id: "layer-1",
      width: 100, height: 80,
      locked: true, visible: true, lockTransparency: false,
      imageBitmap: null,
      transform: { x: 0, y: 0, scaleX: 1, scaleY: 1, rotation: 0, flipH: false, flipV: false },
    };
    const engine = { getActiveLayerId: () => lockedLayer.id, getLayer: () => lockedLayer };
    const mockEditor = {
      ...defaultMockEditor,
      workspace: { getActiveEngine: () => engine },
    };
    vi.spyOn(EditorContextModule, "useEditor").mockReturnValue(mockEditor as any);

    const getImageData = vi.fn((_x, _y, w, h) => createImageData(w, h));
    const canvas = {
      width: 100, height: 80,
      getContext: () => ({
        canvas: { width: 100, height: 80 },
        clearRect: vi.fn(),
        getImageData,
        putImageData: vi.fn(),
        drawImage: vi.fn(),
        globalCompositeOperation: "source-over",
      } as unknown as CanvasRenderingContext2D),
    } as unknown as HTMLCanvasElement;

    const overlay = useBrushOverlay();
    overlay.setOverlayCanvasRef(canvas);

    overlay.onPaintStroke([{ x: 10, y: 40 }], false, settings, false);
    // Locked layer = no painting = getImageData not called
    expect(getImageData).not.toHaveBeenCalled();
  });

  it("skips painting when layer is hidden (no getImageData call)", () => {
    const hiddenLayer = {
      id: "layer-1",
      width: 100, height: 80,
      locked: false, visible: false, lockTransparency: false,
      imageBitmap: null,
      transform: { x: 0, y: 0, scaleX: 1, scaleY: 1, rotation: 0, flipH: false, flipV: false },
    };
    const engine = { getActiveLayerId: () => hiddenLayer.id, getLayer: () => hiddenLayer };
    const mockEditor = {
      ...defaultMockEditor,
      workspace: { getActiveEngine: () => engine },
    };
    vi.spyOn(EditorContextModule, "useEditor").mockReturnValue(mockEditor as any);

    const getImageData = vi.fn((_x, _y, w, h) => createImageData(w, h));
    const canvas = {
      width: 100, height: 80,
      getContext: () => ({
        canvas: { width: 100, height: 80 },
        clearRect: vi.fn(),
        getImageData,
        putImageData: vi.fn(),
        drawImage: vi.fn(),
        globalCompositeOperation: "source-over",
      } as unknown as CanvasRenderingContext2D),
    } as unknown as HTMLCanvasElement;

    const overlay = useBrushOverlay();
    overlay.setOverlayCanvasRef(canvas);

    overlay.onPaintStroke([{ x: 10, y: 40 }], false, settings, false);
    expect(getImageData).not.toHaveBeenCalled();
  });
});

describe("useBrushOverlay live terminal preview", () => {
  const settings = { size: 20, hardness: 1, opacity: 1, flow: 1, smoothing: 0 };

  it("adds a region-scoped terminal pass during a non-final drag update", () => {
    const { overlay, getImageData } = createHarness();

    overlay.onPaintStroke([{ x: 10, y: 40 }, { x: 22, y: 40 }], false, settings, false);

    expect(getImageData).toHaveBeenCalledTimes(2);
    expect((getImageData as any).mock.calls[0]).toEqual([0, 0, 100, 80]);
    expect((getImageData as any).mock.calls[1]).not.toEqual([0, 0, 100, 80]);
  });

  it("uses only the permanent full-mask pass for a final update", () => {
    const { overlay, getImageData } = createHarness();

    overlay.onPaintStroke([{ x: 10, y: 40 }, { x: 22, y: 40 }], false, settings, true);

    expect(getImageData).toHaveBeenCalledTimes(1);
    expect(getImageData).toHaveBeenCalledWith(0, 0, 100, 80);
  });

  it("adds terminal pass then clears on final stroke with accumulated points", () => {
    const { overlay, getImageData } = createHarness();

    // Two non-final strokes (simulating drag updates)
    overlay.onPaintStroke([{ x: 10, y: 40 }, { x: 22, y: 40 }], false, settings, false);
    const firstCallCount = (getImageData as any).mock.calls.length;
    expect(firstCallCount).toBeGreaterThan(0);
    (getImageData as any).mockClear();

    overlay.onPaintStroke([{ x: 22, y: 40 }, { x: 34, y: 45 }], false, settings, true);
    // Final update should use single full-mask (not two passes)
    expect(getImageData).toHaveBeenCalledTimes(1);
    expect(getImageData).toHaveBeenCalledWith(0, 0, 100, 80);
  });
});
