import { describe, expect, it, vi } from "vitest";
import { renderPaintStrokeToContext, type StrokePoint } from "../paintStrokeRenderer";

interface RenderStrokeOptions {
  width?: number;
  height?: number;
  size: number;
  hardness: number;
  opacity?: number;
  flow?: number;
  points: StrokePoint[];
  isEraser?: boolean;
  initialAlpha?: number;
}

function createImageDataMock(width: number, height: number, alpha = 0): ImageData {
  const data = new Uint8ClampedArray(width * height * 4);
  for (let i = 3; i < data.length; i += 4) data[i] = alpha;
  return { width, height, data, colorSpace: "srgb" } as ImageData;
}

function renderStroke({
  width = 260,
  height = 220,
  size,
  hardness,
  opacity = 1,
  flow = 1,
  points,
  isEraser = false,
  initialAlpha = isEraser ? 255 : 0,
}: RenderStrokeOptions): ImageData {
  const source = createImageDataMock(width, height, initialAlpha);
  const ctx = {
    save: vi.fn(),
    restore: vi.fn(),
    globalCompositeOperation: "",
    globalAlpha: 1,
    canvas: { width, height },
    getImageData: vi.fn(() => source),
    putImageData: vi.fn(),
  } as unknown as CanvasRenderingContext2D;

  renderPaintStrokeToContext(
    ctx,
    points,
    { size, hardness, opacity, flow, smoothing: 0 },
    "#f05a16",
    isEraser,
  );

  return (ctx.putImageData as unknown as ReturnType<typeof vi.fn>).mock.calls[0][0] as ImageData;
}

function alphaAt(imageData: ImageData, x: number, y: number): number {
  return imageData.data[(y * imageData.width + x) * 4 + 3];
}

describe("automated Brush/Eraser visual regression", () => {
  it("keeps a large hard-edge dab solid inside with a fractional antialiased boundary", () => {
    const imageData = renderStroke({
      size: 100,
      hardness: 1,
      points: [{ x: 120, y: 110 }],
    });

    for (let y = 106; y <= 114; y += 1) {
      for (let x = 116; x <= 124; x += 1) {
        expect(alphaAt(imageData, x, y)).toBe(255);
      }
    }

    const diagonalBoundary = alphaAt(imageData, 155, 145);
    expect(diagonalBoundary).toBeGreaterThan(0);
    expect(diagonalBoundary).toBeLessThan(255);
    expect(alphaAt(imageData, 173, 110)).toBe(0);
  });

  it("keeps the hard-edge stroke centerline connected across fixed dab spacing", () => {
    const imageData = renderStroke({
      width: 320,
      height: 200,
      size: 100,
      hardness: 1,
      points: [
        { x: 70, y: 100 },
        { x: 250, y: 100 },
      ],
    });

    for (let x = 70; x <= 250; x += 5) {
      expect(alphaAt(imageData, x, 100)).toBe(255);
    }
  });

  it("renders low-hardness soft-tail alpha beyond the nominal cursor radius", () => {
    const imageData = renderStroke({
      size: 100,
      hardness: 0,
      points: [{ x: 120, y: 110 }],
    });

    expect(alphaAt(imageData, 120, 110)).toBe(255);
    expect(alphaAt(imageData, 190, 110)).toBeGreaterThan(0);
    expect(alphaAt(imageData, 210, 110)).toBe(0);
  });

  it("preserves fractional coverage for subpixel hard-edge placement", () => {
    const imageData = renderStroke({
      size: 100,
      hardness: 1,
      points: [{ x: 120.35, y: 110.6 }],
    });

    const edgeSamples = [
      alphaAt(imageData, 155, 146),
      alphaAt(imageData, 156, 145),
      alphaAt(imageData, 155, 145),
      alphaAt(imageData, 156, 146),
    ];

    expect(edgeSamples.some((alpha) => alpha > 0 && alpha < 255)).toBe(true);
    expect(new Set(edgeSamples).size).toBeGreaterThan(1);
  });

  it("keeps Brush and Eraser geometry equivalent for the same stroke mask", () => {
    const points = [
      { x: 70, y: 100 },
      { x: 190, y: 100 },
    ];
    const brush = renderStroke({ size: 80, hardness: 0.97, points });
    const eraser = renderStroke({ size: 80, hardness: 0.97, points, isEraser: true });

    for (const [x, y] of [
      [70, 100],
      [130, 100],
      [190, 100],
      [98, 128],
      [162, 128],
    ]) {
      expect(alphaAt(brush, x, y) + alphaAt(eraser, x, y)).toBeGreaterThanOrEqual(254);
      expect(alphaAt(brush, x, y) + alphaAt(eraser, x, y)).toBeLessThanOrEqual(256);
    }
  });
});
