import { afterEach, describe, expect, it, vi } from "vitest";
import * as EditorContextModule from "../EditorContext";
import { useBrushOverlay } from "../useBrushOverlay";

function createImageData(width: number, height: number): ImageData {
  return {
    width,
    height,
    data: new Uint8ClampedArray(width * height * 4),
    colorSpace: "srgb",
  } as ImageData;
}

function createHarness() {
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
  vi.spyOn(EditorContextModule, "useEditor").mockReturnValue({
    workspace: { getActiveEngine: () => engine },
    renderer: { uploadImage: vi.fn() },
    scheduler: { requestRender: vi.fn() },
    fgColor: () => "#ff0000",
    docWidth: () => 100,
    docHeight: () => 80,
  } as any);

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

  return { overlay, getImageData };
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe("useBrushOverlay live terminal preview", () => {
  const settings = { size: 20, hardness: 1, opacity: 1, flow: 1, smoothing: 0 };

  it("adds a region-scoped terminal pass during a non-final drag update", () => {
    const { overlay, getImageData } = createHarness();

    overlay.onPaintStroke([{ x: 10, y: 40 }, { x: 22, y: 40 }], false, settings, false);

    expect(getImageData).toHaveBeenCalledTimes(2);
    expect(getImageData.mock.calls[0]).toEqual([0, 0, 100, 80]);
    expect(getImageData.mock.calls[1]).not.toEqual([0, 0, 100, 80]);
  });

  it("uses only the permanent full-mask pass for a final update", () => {
    const { overlay, getImageData } = createHarness();

    overlay.onPaintStroke([{ x: 10, y: 40 }, { x: 22, y: 40 }], false, settings, true);

    expect(getImageData).toHaveBeenCalledTimes(1);
    expect(getImageData).toHaveBeenCalledWith(0, 0, 100, 80);
  });
});
