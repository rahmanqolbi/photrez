import { describe, expect, it, vi } from "vitest";
import {
  buildStrokeDabs,
  getDabSpacing,
  renderPaintStrokeToContext,
  colorToRgbString,
} from "../paintStrokeRenderer";


describe("colorToRgbString", () => {
  it("parses 6-digit hex color", () => {
    expect(colorToRgbString("#ff8800")).toBe("255,136,0");
  });

  it("parses uppercase hex color", () => {
    expect(colorToRgbString("#FF8800")).toBe("255,136,0");
  });

  it("parses mixed-case hex color", () => {
    expect(colorToRgbString("#Ff8800")).toBe("255,136,0");
  });

  it("parses 3-digit hex color", () => {
    expect(colorToRgbString("#f80")).toBe("255,136,0");
  });

  it("parses hex without hash", () => {
    expect(colorToRgbString("ff8800")).toBe("255,136,0");
  });

  it("parses rgba string", () => {
    expect(colorToRgbString("rgba(100,200,50,0.5)")).toBe("100,200,50");
  });

  it("parses rgb string", () => {
    expect(colorToRgbString("rgb(10,20,30)")).toBe("10,20,30");
  });

  it("parses rgba with extra whitespace", () => {
    expect(colorToRgbString("rgba( 100 , 200 , 50 , 0.5 )")).toBe("100,200,50");
  });

  it("returns fallback for empty string", () => {
    expect(colorToRgbString("")).toBe("0,0,0");
  });

  it("returns fallback for named color", () => {
    expect(colorToRgbString("red")).toBe("0,0,0");
  });
});

describe("getDabSpacing", () => {
  it("uses smaller spacing for small brushes and bounded spacing for large brushes", () => {
    expect(getDabSpacing(4)).toBe(1);
    expect(getDabSpacing(20)).toBe(3);
    expect(getDabSpacing(200)).toBe(20);
  });

  it("never returns less than 1", () => {
    expect(getDabSpacing(1)).toBe(1);
    expect(getDabSpacing(0)).toBe(1);
  });

  it("caps at 20 for very large brushes", () => {
    expect(getDabSpacing(500)).toBe(20);
  });
});

describe("buildStrokeDabs", () => {
  it("creates at least one dab for a single-point stroke", () => {
    expect(buildStrokeDabs([{ x: 10, y: 12 }], 20)).toEqual([{ x: 10, y: 12 }]);
  });

  it("interpolates dabs along a horizontal segment at size 20 (spacing=3)", () => {
    const dabs = buildStrokeDabs([{ x: 0, y: 0 }, { x: 12, y: 0 }], 20);
    expect(dabs.length).toBeGreaterThan(2);
    expect(dabs[0]).toEqual({ x: 0, y: 0 });
    expect(dabs.at(-1)).toEqual({ x: 12, y: 0 });
  });

  it("interpolates dabs along a diagonal segment", () => {
    const dabs = buildStrokeDabs([{ x: 0, y: 0 }, { x: 100, y: 100 }], 20);
    expect(dabs.length).toBeGreaterThan(2);
    expect(dabs[0]).toEqual({ x: 0, y: 0 });
    expect(dabs.at(-1)).toEqual({ x: 100, y: 100 });
    // Each step should advance roughly equally
    for (let i = 1; i < dabs.length; i++) {
      const dx = dabs[i].x - dabs[i - 1].x;
      const dy = dabs[i].y - dabs[i - 1].y;
      const dist = Math.hypot(dx, dy);
      expect(dist).toBeLessThanOrEqual(getDabSpacing(20) + 0.01);
    }
  });

  it("handles multiple segments with direction change", () => {
    const dabs = buildStrokeDabs([
      { x: 0, y: 0 },
      { x: 50, y: 0 },
      { x: 50, y: 50 },
    ], 20);
    expect(dabs.length).toBeGreaterThan(2);
    expect(dabs[0]).toEqual({ x: 0, y: 0 });
    expect(dabs.at(-1)).toEqual({ x: 50, y: 50 });
    // The mid-point (50,0) should be present as a dab
    expect(dabs.some(d => d.x === 50 && d.y === 0)).toBe(true);
  });

  it("produces exactly one dab for points closer than spacing", () => {
    // Distance 2 < spacing (3 for size 20)
    const dabs = buildStrokeDabs([{ x: 0, y: 0 }, { x: 1, y: 0 }], 20);
    expect(dabs.length).toBe(2);
    expect(dabs[0]).toEqual({ x: 0, y: 0 });
    expect(dabs[1]).toEqual({ x: 1, y: 0 });
  });

  it("returns empty array for empty input", () => {
    expect(buildStrokeDabs([], 20)).toEqual([]);
  });
});

describe("renderPaintStrokeToContext", () => {
  it("does nothing for empty points", () => {
    const ctx = {
      save: vi.fn(),
      restore: vi.fn(),
      globalCompositeOperation: "",
      globalAlpha: 1,
      beginPath: vi.fn(),
      moveTo: vi.fn(),
      lineTo: vi.fn(),
      stroke: vi.fn(),
      arc: vi.fn(),
      fill: vi.fn(),
    } as unknown as CanvasRenderingContext2D;

    renderPaintStrokeToContext(ctx, [], { size: 20, hardness: 0.5, opacity: 1, flow: 1, smoothing: 0 }, "#ff0000", false);

    expect(ctx.save).not.toHaveBeenCalled();
  });

  it("sets destination-out composite for eraser", () => {
    const ctx = {
      save: vi.fn(),
      restore: vi.fn(),
      globalCompositeOperation: "",
      globalAlpha: 1,
      beginPath: vi.fn(),
      moveTo: vi.fn(),
      lineTo: vi.fn(),
      stroke: vi.fn(),
      arc: vi.fn(),
      fill: vi.fn(),
    } as unknown as CanvasRenderingContext2D;

    renderPaintStrokeToContext(ctx, [{ x: 50, y: 50 }], { size: 20, hardness: 1, opacity: 1, flow: 1, smoothing: 0 }, "rgba(0,0,0,1)", true);

    expect(ctx.save).toHaveBeenCalled();
    expect(ctx.globalCompositeOperation).toBe("destination-out");
  });

  it("reduces alpha in soft eraser path", () => {
    const mockImgData = createImageDataMock(40, 40);
    mockImgData.data.fill(0);
    for (let i = 3; i < mockImgData.data.length; i += 4) {
      mockImgData.data[i] = 200;
    }
    const ctx = {
      save: vi.fn(),
      restore: vi.fn(),
      globalCompositeOperation: "",
      globalAlpha: 1,
      canvas: { width: 40, height: 40 },
      getImageData: vi.fn((x: number, y: number, w: number, h: number) => {
        const img = createImageDataMock(w, h);
        img.data.fill(0);
        for (let i = 3; i < img.data.length; i += 4) {
          img.data[i] = 200;
        }
        return img;
      }),
      putImageData: vi.fn(),
      beginPath: vi.fn(),
      moveTo: vi.fn(),
      lineTo: vi.fn(),
      stroke: vi.fn(),
      arc: vi.fn(),
      fill: vi.fn(),
    } as unknown as CanvasRenderingContext2D;

    renderPaintStrokeToContext(ctx, [{ x: 20, y: 20 }], { size: 20, hardness: 0, opacity: 1, flow: 1, smoothing: 0 }, "rgba(0,0,0,1)", true);

    const putData = (ctx.putImageData as unknown as ReturnType<typeof vi.fn>).mock.calls[0][0] as ImageData;
    const alphas = putData.data.filter((_: number, i: number) => i % 4 === 3);
    expect(alphas.some((a: number) => a < 200)).toBe(true);
    expect(alphas.some((a: number) => a > 0)).toBe(true);
  });

  it("sets source-over composite for brush", () => {
    const ctx = {
      save: vi.fn(),
      restore: vi.fn(),
      globalCompositeOperation: "",
      globalAlpha: 1,
      beginPath: vi.fn(),
      moveTo: vi.fn(),
      lineTo: vi.fn(),
      stroke: vi.fn(),
      arc: vi.fn(),
      fill: vi.fn(),
    } as unknown as CanvasRenderingContext2D;

    renderPaintStrokeToContext(ctx, [{ x: 50, y: 50 }], { size: 20, hardness: 1, opacity: 1, flow: 1, smoothing: 0 }, "#ff0000", false);

    expect(ctx.globalCompositeOperation).toBe("source-over");
  });

  it("uses solid line when hardness is 1", () => {
    const ctx = {
      save: vi.fn(),
      restore: vi.fn(),
      globalCompositeOperation: "",
      globalAlpha: 1,
      strokeStyle: "",
      lineWidth: 0,
      beginPath: vi.fn(),
      moveTo: vi.fn(),
      lineTo: vi.fn(),
      stroke: vi.fn(),
      arc: vi.fn(),
      fill: vi.fn(),
    } as unknown as CanvasRenderingContext2D;

    renderPaintStrokeToContext(ctx, [{ x: 50, y: 50 }, { x: 100, y: 50 }], { size: 20, hardness: 1, opacity: 1, flow: 1, smoothing: 0 }, "#ff0000", false);

    expect(ctx.strokeStyle).toBe("#ff0000");
    expect(ctx.lineWidth).toBe(20);
    expect(ctx.moveTo).toHaveBeenCalledWith(50, 50);
    expect(ctx.lineTo).toHaveBeenCalledWith(100, 50);
    expect(ctx.stroke).toHaveBeenCalled();
  });

  function createImageDataMock(width: number, height: number): ImageData {
    return {
      width,
      height,
      data: new Uint8ClampedArray(width * height * 4),
      colorSpace: "srgb",
    } as ImageData;
  }

  it("renders soft brush without Canvas shadowBlur", () => {
    const imageData = createImageDataMock(80, 80);
    const ctx = {
      save: vi.fn(),
      restore: vi.fn(),
      globalCompositeOperation: "",
      globalAlpha: 1,
      canvas: { width: 80, height: 80 },
      getImageData: vi.fn(() => imageData),
      putImageData: vi.fn(),
      beginPath: vi.fn(),
      moveTo: vi.fn(),
      lineTo: vi.fn(),
      stroke: vi.fn(),
      arc: vi.fn(),
      fill: vi.fn(),
      shadowBlur: 0,
    } as unknown as CanvasRenderingContext2D;

    renderPaintStrokeToContext(
      ctx,
      [{ x: 20, y: 40 }, { x: 60, y: 40 }],
      { size: 20, hardness: 0, opacity: 1, flow: 1, smoothing: 0 },
      "#ff0000",
      false,
    );

    expect(ctx.putImageData).toHaveBeenCalledTimes(1);
    expect(ctx.stroke).not.toHaveBeenCalled();
    expect((ctx as unknown as { shadowBlur: number }).shadowBlur).toBe(0);
  });

  it("keeps hardness 0 visible across the full brush diameter", () => {
    const ctx = {
      save: vi.fn(),
      restore: vi.fn(),
      globalCompositeOperation: "",
      globalAlpha: 1,
      canvas: { width: 40, height: 40 },
      getImageData: vi.fn((x: number, y: number, w: number, h: number) => {
        return createImageDataMock(w, h);
      }),
      putImageData: vi.fn(),
      beginPath: vi.fn(),
      moveTo: vi.fn(),
      lineTo: vi.fn(),
      stroke: vi.fn(),
      arc: vi.fn(),
      fill: vi.fn(),
    } as unknown as CanvasRenderingContext2D;

    renderPaintStrokeToContext(
      ctx,
      [{ x: 20, y: 20 }],
      { size: 20, hardness: 0, opacity: 1, flow: 1, smoothing: 0 },
      "#ff0000",
      false,
    );

    const putCalls = (ctx.putImageData as unknown as ReturnType<typeof vi.fn>).mock.calls;
    const img = putCalls[0][0] as ImageData;
    const ox = putCalls[0][1] as number;
    const oy = putCalls[0][2] as number;
    const alphaAt = (cx: number, cy: number) => {
      const lx = cx - ox;
      const ly = cy - oy;
      return img.data[(ly * img.width + lx) * 4 + 3];
    };
    expect(alphaAt(20, 20)).toBeGreaterThan(100);
    expect(alphaAt(25, 20)).toBeGreaterThan(25);
    expect(alphaAt(29, 20)).toBeGreaterThan(0);
    expect(alphaAt(31, 20)).toBe(0);
  });

  it("draws a single dot using arc for 1-point stroke (hardness=1)", () => {
    const ctx = {
      save: vi.fn(),
      restore: vi.fn(),
      globalCompositeOperation: "",
      globalAlpha: 1,
      fillStyle: "",
      beginPath: vi.fn(),
      moveTo: vi.fn(),
      lineTo: vi.fn(),
      stroke: vi.fn(),
      arc: vi.fn(),
      fill: vi.fn(),
    } as unknown as CanvasRenderingContext2D;

    renderPaintStrokeToContext(ctx, [{ x: 100, y: 200 }], { size: 50, hardness: 1, opacity: 0.5, flow: 1, smoothing: 0 }, "#ff0000", false);

    expect(ctx.arc).toHaveBeenCalledWith(100, 200, 25, 0, Math.PI * 2);
    expect(ctx.fillStyle).toBe("#ff0000");
    expect(ctx.fill).toHaveBeenCalledTimes(1);
    expect(ctx.stroke).not.toHaveBeenCalled();
  });

  it("applies flow multiplier to globalAlpha", () => {
    const ctx = {
      save: vi.fn(),
      restore: vi.fn(),
      globalCompositeOperation: "",
      globalAlpha: 1,
      beginPath: vi.fn(),
      moveTo: vi.fn(),
      lineTo: vi.fn(),
      stroke: vi.fn(),
      arc: vi.fn(),
      fill: vi.fn(),
    } as unknown as CanvasRenderingContext2D;

    renderPaintStrokeToContext(
      ctx,
      [{ x: 50, y: 50 }],
      { size: 20, hardness: 1, opacity: 1, flow: 0.5, smoothing: 0 },
      "#ff0000",
      false,
    );

    expect(ctx.globalAlpha).toBe(0.5);
  });

  it("does not accumulate alpha where one stroke path overlaps itself", () => {
    const ctx = {
      save: vi.fn(),
      restore: vi.fn(),
      globalCompositeOperation: "",
      globalAlpha: 1,
      canvas: { width: 80, height: 80 },
      getImageData: vi.fn((x: number, y: number, w: number, h: number) => {
        return createImageDataMock(w, h);
      }),
      putImageData: vi.fn(),
      beginPath: vi.fn(),
      moveTo: vi.fn(),
      lineTo: vi.fn(),
      stroke: vi.fn(),
      arc: vi.fn(),
      fill: vi.fn(),
    } as unknown as CanvasRenderingContext2D;

    renderPaintStrokeToContext(
      ctx,
      [
        { x: 20, y: 40 },
        { x: 60, y: 40 },
        { x: 20, y: 40 },
        { x: 60, y: 40 },
      ],
      { size: 20, hardness: 0, opacity: 0.5, flow: 1, smoothing: 0 },
      "#ff0000",
      false,
    );

    const putCalls = (ctx.putImageData as unknown as ReturnType<typeof vi.fn>).mock.calls;
    const img = putCalls[0][0] as ImageData;
    const ox = putCalls[0][1] as number;
    const oy = putCalls[0][2] as number;
    const alphaAt = (cx: number, cy: number) => {
      const lx = cx - ox;
      const ly = cy - oy;
      if (lx < 0 || lx >= img.width || ly < 0 || ly >= img.height) return 0;
      return img.data[(ly * img.width + lx) * 4 + 3];
    };
    expect(alphaAt(40, 40)).toBeLessThanOrEqual(110);
    expect(alphaAt(40, 40)).toBeGreaterThan(60);
  });

  it("renders soft brush using full canvas in one-shot compatibility path", () => {
    const imageData = createImageDataMock(500, 500);
    const ctx = {
      save: vi.fn(),
      restore: vi.fn(),
      globalCompositeOperation: "",
      globalAlpha: 1,
      canvas: { width: 500, height: 500 },
      getImageData: vi.fn(() => imageData),
      putImageData: vi.fn(),
      beginPath: vi.fn(),
      moveTo: vi.fn(),
      lineTo: vi.fn(),
      stroke: vi.fn(),
      arc: vi.fn(),
      fill: vi.fn(),
    } as unknown as CanvasRenderingContext2D;

    renderPaintStrokeToContext(
      ctx,
      [{ x: 50, y: 50 }],
      { size: 20, hardness: 0, opacity: 1, flow: 1, smoothing: 0 },
      "#ff0000",
      false,
    );

    expect(ctx.getImageData).toHaveBeenCalledWith(0, 0, 500, 500);
    expect(ctx.putImageData).toHaveBeenCalledWith(imageData, 0, 0);
  });

  it("renders soft brush through brush tip mask without distance-field path scan", () => {
    const imageData = {
      width: 40,
      height: 40,
      data: new Uint8ClampedArray(40 * 40 * 4),
      colorSpace: "srgb",
    } as ImageData;
    const ctx = {
      save: vi.fn(),
      restore: vi.fn(),
      globalCompositeOperation: "",
      globalAlpha: 1,
      canvas: { width: 40, height: 40 },
      getImageData: vi.fn(() => imageData),
      putImageData: vi.fn(),
      beginPath: vi.fn(),
      moveTo: vi.fn(),
      lineTo: vi.fn(),
      stroke: vi.fn(),
      arc: vi.fn(),
      fill: vi.fn(),
    } as unknown as CanvasRenderingContext2D;

    renderPaintStrokeToContext(
      ctx,
      [{ x: 20, y: 20 }],
      { size: 21, hardness: 0, opacity: 1, flow: 1, smoothing: 0 },
      "#ff6600",
      false,
    );

    const written = (ctx.putImageData as unknown as ReturnType<typeof vi.fn>).mock.calls[0][0] as ImageData;
    const idx = (20 * written.width + 20) * 4;
    expect(written.data[idx]).toBe(255);
    expect(written.data[idx + 1]).toBe(102);
    expect(written.data[idx + 2]).toBe(0);
    expect(written.data[idx + 3]).toBe(207);
    expect(ctx.stroke).not.toHaveBeenCalled();
  });

  it("restores context after drawing", () => {
    const ctx = {
      save: vi.fn(),
      restore: vi.fn(),
      globalCompositeOperation: "",
      globalAlpha: 1,
      beginPath: vi.fn(),
      moveTo: vi.fn(),
      lineTo: vi.fn(),
      stroke: vi.fn(),
      arc: vi.fn(),
      fill: vi.fn(),
    } as unknown as CanvasRenderingContext2D;

    renderPaintStrokeToContext(ctx, [{ x: 50, y: 50 }], { size: 20, hardness: 1, opacity: 1, flow: 1, smoothing: 0 }, "#ff0000", false);

    expect(ctx.save).toHaveBeenCalled();
    expect(ctx.restore).toHaveBeenCalled();
  });

  it("stamps the first point in a multi-point soft stroke", () => {
    const imageData = createImageDataMock(80, 80);
    const ctx = {
      save: vi.fn(),
      restore: vi.fn(),
      globalCompositeOperation: "",
      globalAlpha: 1,
      canvas: { width: 80, height: 80 },
      getImageData: vi.fn(() => imageData),
      putImageData: vi.fn(),
      beginPath: vi.fn(),
      moveTo: vi.fn(),
      lineTo: vi.fn(),
      stroke: vi.fn(),
      arc: vi.fn(),
      fill: vi.fn(),
    } as unknown as CanvasRenderingContext2D;

    renderPaintStrokeToContext(
      ctx,
      [{ x: 20, y: 40 }, { x: 60, y: 40 }],
      { size: 20, hardness: 0, opacity: 1, flow: 1, smoothing: 0 },
      "#ff0000",
      false,
    );

    const putCalls = (ctx.putImageData as unknown as ReturnType<typeof vi.fn>).mock.calls;
    const img = putCalls[0][0] as ImageData;
    const ox = putCalls[0][1] as number;
    const oy = putCalls[0][2] as number;
    const alphaAt = (cx: number, cy: number) => {
      const lx = cx - ox;
      const ly = cy - oy;
      return img.data[(ly * img.width + lx) * 4 + 3];
    };
    expect(alphaAt(20, 40)).toBeGreaterThan(100);
  });
});
