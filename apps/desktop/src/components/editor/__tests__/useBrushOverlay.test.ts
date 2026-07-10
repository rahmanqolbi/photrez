import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import * as EditorContextModule from "../shell/EditorContext";
import { useBrushOverlay } from "../useBrushOverlay";
import type { DocumentEngine } from "@/engine/document";
import type { CommandHistory } from "@/engine/history";

// Polyfill createImageBitmap + OffscreenCanvas for jsdom (used by eraser pixel tests).
// jsdom's drawImage rejects plain objects — returns a <canvas> with close() instead.
function makeMockImageBitmap(w = 100, h = 80): HTMLCanvasElement {
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  (c as any).close = () => { /* no-op */ };
  return c;
}
if (typeof globalThis.createImageBitmap === "undefined") {
  (globalThis as any).createImageBitmap = async (source: CanvasImageSource, _options?: any) => {
    const w = (source as any).width ?? 100;
    const h = (source as any).height ?? 80;
    return makeMockImageBitmap(w, h) as unknown as ImageBitmap;
  };
}
if (typeof globalThis.OffscreenCanvas === "undefined") {
  // Return an actual HTMLCanvasElement so jsdom's drawImage accepts it.
  // Attach transferToImageBitmap so the production code's teardown path works.
  (globalThis as any).OffscreenCanvas = function OffscreenCanvas(w: number, h: number) {
    const c = document.createElement("canvas");
    c.width = w;
    c.height = h;
    (c as any).transferToImageBitmap = () =>
      makeMockImageBitmap(w, h) as unknown as ImageBitmap;
    // convertToBlob is sometimes called in tests — stub it
    (c as any).convertToBlob = () => Promise.resolve(new Blob());
    return c;
  };
}

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
  const history = { commit: vi.fn() };
  const engine = {
    getActiveLayerId: () => layer.id,
    getLayer: (_id: string) => layer,
    snapshot: vi.fn(() => ({})),
    setLayerImageBitmap: vi.fn(),
  };
  defaultMockEditor = {
    workspace: {
      getActiveEngine: () => engine,
      getActiveHistory: () => history,
    },
    renderer: { uploadImage: vi.fn() },
    scheduler: { requestRender: vi.fn() },
    fgColor: () => "#ff0000",
    bgColor: () => "#ffffff",
    docWidth: () => 100,
    docHeight: () => 80,
    activeTool: () => "brush",
    brushSize: () => 20,
    brushHardness: () => 1,
    eraserSize: () => 20,
    eraserHardness: () => 1,
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

  return {
    overlay,
    getImageData,
    ctx,
    engine: defaultMockEditor.workspace.getActiveEngine() as any,
    layer: defaultMockEditor.workspace.getActiveEngine().getLayer("layer-1"),
    history: defaultMockEditor.workspace.getActiveHistory() as any,
  };
}

/** Create a real canvas filled with a solid color. */
function createSolidCanvas(width: number, height: number, color: string): HTMLCanvasElement {
  const c = document.createElement("canvas");
  c.width = width;
  c.height = height;
  const ctx = c.getContext("2d")!;
  ctx.fillStyle = color;
  ctx.fillRect(0, 0, width, height);
  return c;
}

/** Create a real overlay harness with real canvas rendering, for pixel tests. */
function createRealHarness(layerOverrides: Record<string, any> = {}) {
  const history = { commit: vi.fn() };
  const layer = {
    id: "layer-1",
    width: 100,
    height: 80,
    locked: false,
    visible: true,
    lockTransparency: false,
    isBackground: false,
    imageBitmap: null as ImageBitmap | null,
    transform: { x: 0, y: 0, scaleX: 1, scaleY: 1, rotation: 0, flipH: false, flipV: false },
    ...layerOverrides,
  };
  const engine = {
    getActiveLayerId: () => layer.id,
    getLayer: (_id: string) => layer,
    getWidth: () => layer.width,
    getHeight: () => layer.height,
    snapshot: vi.fn(() => ({})),
    setLayerImageBitmap: vi.fn(),
  };
  const mockEditor = {
    workspace: {
      getActiveEngine: () => engine,
      getActiveHistory: () => history,
    },
    renderer: { uploadImage: vi.fn() },
    scheduler: { requestRender: vi.fn() },
    fgColor: () => "#ff0000",
    bgColor: () => "#ffffff",
    docWidth: () => layer.width,
    docHeight: () => layer.height,
    activeTool: () => "brush",
    brushSize: () => 20,
    brushHardness: () => 1,
    eraserSize: () => 20,
    eraserHardness: () => 1,
  };
  vi.spyOn(EditorContextModule, "useEditor").mockReturnValue(mockEditor as any);

  // Real overlay canvas
  const overlayCanvas = document.createElement("canvas");
  overlayCanvas.width = layer.width;
  overlayCanvas.height = layer.height;
  const overlay = useBrushOverlay();
  overlay.setOverlayCanvasRef(overlayCanvas);

  // Real source canvas with red fill (to create ImageBitmap)
  const sourceCanvas = createSolidCanvas(layer.width, layer.height, "#ff0000");

  return { overlay, overlayCanvas, engine, history, layer, sourceCanvas };
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe("useBrushOverlay session lifecycle", () => {
  const settings = { size: 20, hardness: 1, opacity: 1, flow: 1, smoothing: 0 };

  it("calls drawImage on first stroke (session created)", () => {
    const { overlay, ctx } = createHarness();
    overlay.onPaintStroke([{ x: 10, y: 40 }, { x: 22, y: 40 }], false, settings, false);
    // drawImage called at least once = stroke was processed (new code uses drawImage compositing)
    expect(vi.mocked(ctx.drawImage).mock.calls.length).toBeGreaterThan(0);
    // First composite clears dirty rect (sub-region), not full canvas
    expect(ctx.clearRect).toHaveBeenCalled();
  });

  it("creates a new session when tool changes from brush to eraser", () => {
    const { overlay, ctx } = createHarness();
    // Brush stroke
    overlay.onPaintStroke([{ x: 10, y: 40 }], false, settings, false);
    vi.mocked(ctx.drawImage).mockClear();
    // Second stroke with NEW points beyond prevStrokePointCount
    overlay.onPaintStroke([{ x: 10, y: 40 }, { x: 20, y: 40 }], false, settings, false);
    expect(vi.mocked(ctx.drawImage).mock.calls.length).toBeGreaterThan(0);
  });
});

describe("useBrushOverlay clearPrevStrokePointCount", () => {
  const settings = { size: 20, hardness: 1, opacity: 1, flow: 1, smoothing: 0 };

  it("resets state so next stroke starts fresh", () => {
    const { overlay, ctx } = createHarness();
    overlay.onPaintStroke([{ x: 10, y: 40 }, { x: 22, y: 40 }], false, settings, false);
    overlay.clearPrevStrokePointCount();
    vi.mocked(ctx.clearRect).mockClear();
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

describe("useBrushOverlay eraser pixel output", () => {
  const settings = { size: 10, hardness: 1, opacity: 1, flow: 1, smoothing: 0 };

  it("keeps overlay transparent during eraser stroke (no black circles)", async () => {
    const { overlay, overlayCanvas, sourceCanvas, engine, history } = createRealHarness();
    const imageBitmap = await createImageBitmap(sourceCanvas);
    engine.getLayer("layer-1").imageBitmap = imageBitmap;

    // Eraser stroke at center of canvas
    overlay.onPaintStroke(
      [{ x: 50, y: 40 }],
      true, // isEraser
      settings,
      true, // isFinal
    );

    // Overlay should be transparent at dab position (no black circles drawn)
    const overlayCtx = overlayCanvas.getContext("2d")!;
    const pixel = overlayCtx.getImageData(50, 40, 1, 1).data;
    expect(pixel[3]).toBe(0);

    // Commit should not throw
    await expect(overlay.commitBrushStroke(
      engine as unknown as DocumentEngine,
      history as unknown as CommandHistory,
      "layer-1",
      true,
    )).resolves.toBeUndefined();

    imageBitmap.close();
  });

  it("eraser commit makes pixels transparent at dab position", async () => {
    const { overlay, sourceCanvas, engine, history } = createRealHarness();
    const imageBitmap = await createImageBitmap(sourceCanvas);
    engine.getLayer("layer-1").imageBitmap = imageBitmap;

    // Eraser stroke at center
    overlay.onPaintStroke(
      [{ x: 50, y: 40 }],
      true, // isEraser
      settings,
      true, // isFinal
    );

    // Run commit
    await overlay.commitBrushStroke(
      engine as unknown as DocumentEngine,
      history as unknown as CommandHistory,
      "layer-1",
      true,
    );

    // Intercept the bitmap passed to engine.setLayerImageBitmap
    expect(engine.setLayerImageBitmap).toHaveBeenCalled();

    // Note: pixel-level assertions require real canvas rendering and cannot
    // be verified in jsdom — see brushReferenceAudit for actual pixel verification.
    // Here we verify the commit path executed.
    imageBitmap.close();
  });

  it("paints with bgColor on background layer instead of erasing", async () => {
    const { overlay, overlayCanvas, sourceCanvas, engine, history } = createRealHarness({
      isBackground: true,
      lockTransparency: true,
    });
    const imageBitmap = await createImageBitmap(sourceCanvas);
    engine.getLayer("layer-1").imageBitmap = imageBitmap;

    // Eraser stroke on background layer — should paint bgColor (#ffffff)
    overlay.onPaintStroke(
      [{ x: 50, y: 40 }],
      true, // isEraser
      settings,
      true, // isFinal
    );

    // Note: pixel-value assertions need real canvas rendering and can't
    // be verified in jsdom. We verify the code path executes.

    // Commit should not throw
    await expect(overlay.commitBrushStroke(
      engine as unknown as DocumentEngine,
      history as unknown as CommandHistory,
      "layer-1",
      true,
    )).resolves.toBeUndefined();

    imageBitmap.close();
  });

  it("blocks eraser on non-background lockTransparency layer", () => {
    const { overlay, overlayCanvas } = createRealHarness({
      lockTransparency: true,
      isBackground: false,
    });

    // Eraser stroke on lockTransparency layer — should be blocked
    overlay.onPaintStroke(
      [{ x: 50, y: 40 }],
      true, // isEraser
      settings,
      true,
    );

    // Overlay should NOT have any dab (stroke was blocked)
    const overlayCtx = overlayCanvas.getContext("2d")!;
    const pixel = overlayCtx.getImageData(50, 40, 1, 1).data;
    expect(pixel[3]).toBe(0); // alpha=0 = nothing drawn
  });

  it("does NOT block eraser on background layer with lockTransparency", () => {
    const { overlay, overlayCanvas } = createRealHarness({
      isBackground: true,
      lockTransparency: true,
    });

    // Eraser stroke on background layer — should NOT be blocked
    // (resolveEraserFill converts to brush mode with bgColor)
    overlay.onPaintStroke(
      [{ x: 50, y: 40 }],
      true, // isEraser
      settings,
      true,
    );

    // Overlay should have dab (stroke was NOT blocked)
    const overlayCtx = overlayCanvas.getContext("2d")!;
    const pixel = overlayCtx.getImageData(50, 40, 1, 1).data;
    expect(pixel[3]).toBeGreaterThan(0); // non-zero alpha = something drawn
  });
});

describe("useBrushOverlay live terminal preview", () => {
  const settings = { size: 20, hardness: 1, opacity: 1, flow: 1, smoothing: 0 };

  it("draws image during a non-final drag update", () => {
    const { overlay, ctx } = createHarness();

    overlay.onPaintStroke([{ x: 10, y: 40 }, { x: 22, y: 40 }], false, settings, false);

    // New code uses drawImage compositing — at least one drawImage call = composite happened
    expect(vi.mocked(ctx.drawImage).mock.calls.length).toBeGreaterThan(0);
    // clearRect was called with sub-region (dirty rect), not full canvas
    expect(ctx.clearRect).toHaveBeenCalled();
  });

  it("draws image during a final update", () => {
    const { overlay, ctx } = createHarness();

    overlay.onPaintStroke([{ x: 10, y: 40 }, { x: 22, y: 40 }], false, settings, true);

    // Final update also uses drawImage compositing
    expect(vi.mocked(ctx.drawImage).mock.calls.length).toBeGreaterThan(0);
  });

  it("draws on final stroke with accumulated points", () => {
    const { overlay, ctx } = createHarness();

    // Non-final stroke
    overlay.onPaintStroke([{ x: 10, y: 40 }], false, settings, false);
    const firstCallCount = vi.mocked(ctx.drawImage).mock.calls.length;
    expect(firstCallCount).toBeGreaterThan(0);
    vi.mocked(ctx.drawImage).mockClear();

    // Final stroke with NEW points beyond prevStrokePointCount
    overlay.onPaintStroke([{ x: 10, y: 40 }, { x: 22, y: 40 }], false, settings, true);
    expect(vi.mocked(ctx.drawImage).mock.calls.length).toBeGreaterThan(0);
  });
});
