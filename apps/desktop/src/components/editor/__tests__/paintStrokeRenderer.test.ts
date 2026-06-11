import { describe, expect, it, vi } from "vitest";
import {
  buildStrokeDabs,
  getDabSpacing,
  renderPaintStrokeToContext,
  colorToRgbString,
  brushAlphaAtDistance,
  distanceToSegment,
  smoothstep01,
} from "../paintStrokeRenderer";

describe("brush hardness falloff", () => {
  it("maps smoothstep from 0 to 1", () => {
    expect(smoothstep01(-1)).toBe(0);
    expect(smoothstep01(0)).toBe(0);
    expect(smoothstep01(1)).toBe(1);
    expect(smoothstep01(2)).toBe(1);
    expect(smoothstep01(0.5)).toBeCloseTo(0.5, 5);
  });

  it("feathers the entire radius when hardness is 0", () => {
    const radius = 50;
    expect(brushAlphaAtDistance(0, radius, 0)).toBe(1);
    expect(brushAlphaAtDistance(25, radius, 0)).toBeCloseTo(0.5, 5);
    expect(brushAlphaAtDistance(49, radius, 0)).toBeGreaterThan(0);
    expect(brushAlphaAtDistance(50, radius, 0)).toBe(0);
  });

  it("keeps a solid center up to the hardness radius", () => {
    const radius = 50;
    expect(brushAlphaAtDistance(24, radius, 0.5)).toBe(1);
    expect(brushAlphaAtDistance(25, radius, 0.5)).toBe(1);
    expect(brushAlphaAtDistance(37.5, radius, 0.5)).toBeCloseTo(0.5, 5);
    expect(brushAlphaAtDistance(50, radius, 0.5)).toBe(0);
  });

  it("is solid until the outer edge when hardness is 1", () => {
    const radius = 50;
    expect(brushAlphaAtDistance(0, radius, 1)).toBe(1);
    expect(brushAlphaAtDistance(49.9, radius, 1)).toBe(1);
    expect(brushAlphaAtDistance(50, radius, 1)).toBe(0);
  });
});

describe("distanceToSegment", () => {
  it("measures perpendicular distance to a horizontal segment", () => {
    expect(distanceToSegment(5, 3, 0, 0, 10, 0)).toBeCloseTo(3, 5);
  });

  it("measures distance to the nearest endpoint outside a segment", () => {
    expect(distanceToSegment(13, 4, 0, 0, 10, 0)).toBeCloseTo(5, 5);
  });

  it("handles zero-length segments as points", () => {
    expect(distanceToSegment(3, 4, 0, 0, 0, 0)).toBeCloseTo(5, 5);
  });
});

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

  it("uses shadow offset when hardness is less than 1", () => {
    const ctx = {
      save: vi.fn(),
      restore: vi.fn(),
      globalCompositeOperation: "",
      globalAlpha: 1,
      strokeStyle: "",
      lineWidth: 0,
      shadowColor: "",
      shadowBlur: 0,
      shadowOffsetX: 0,
      shadowOffsetY: 0,
      beginPath: vi.fn(),
      moveTo: vi.fn(),
      lineTo: vi.fn(),
      stroke: vi.fn(),
      arc: vi.fn(),
      fill: vi.fn(),
    } as unknown as CanvasRenderingContext2D;

    renderPaintStrokeToContext(ctx, [{ x: 50, y: 50 }, { x: 100, y: 50 }], { size: 20, hardness: 0.5, opacity: 1, flow: 1, smoothing: 0 }, "#ff0000", false);

    expect(ctx.shadowColor).toBe("#ff0000");
    expect(ctx.shadowBlur).toBe(2); // size 20 * 0.2 * 0.5 = 2
    expect(ctx.shadowOffsetX).toBe(20000);
    expect(ctx.lineWidth).toBe(14); // coreWidth = 20 * (0.4 + 0.6 * 0.5) = 14
    expect(ctx.moveTo).toHaveBeenCalledWith(-20000 + 50, 50);
    expect(ctx.lineTo).toHaveBeenCalledWith(-20000 + 100, 50);
    expect(ctx.stroke).toHaveBeenCalled();
  });

  it("sets core width and blur when hardness is 0", () => {
    const ctx = {
      save: vi.fn(),
      restore: vi.fn(),
      globalCompositeOperation: "",
      globalAlpha: 1,
      strokeStyle: "",
      lineWidth: 0,
      shadowColor: "",
      shadowBlur: 0,
      shadowOffsetX: 0,
      shadowOffsetY: 0,
      beginPath: vi.fn(),
      moveTo: vi.fn(),
      lineTo: vi.fn(),
      stroke: vi.fn(),
      arc: vi.fn(),
      fill: vi.fn(),
    } as unknown as CanvasRenderingContext2D;

    renderPaintStrokeToContext(ctx, [{ x: 50, y: 50 }, { x: 100, y: 50 }], { size: 20, hardness: 0, opacity: 1, flow: 1, smoothing: 0 }, "#00ff00", false);

    expect(ctx.shadowColor).toBe("#00ff00");
    expect(ctx.shadowBlur).toBe(4); // size 20 * 0.2 * 1 = 4
    expect(ctx.lineWidth).toBe(8); // coreWidth = 20 * 0.4 = 8
    expect(ctx.stroke).toHaveBeenCalled();
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

  it("draws a single dot using arc with offset for 1-point stroke (hardness=0.5)", () => {
    const ctx = {
      save: vi.fn(),
      restore: vi.fn(),
      globalCompositeOperation: "",
      globalAlpha: 1,
      fillStyle: "",
      shadowColor: "",
      shadowBlur: 0,
      shadowOffsetX: 0,
      shadowOffsetY: 0,
      beginPath: vi.fn(),
      moveTo: vi.fn(),
      lineTo: vi.fn(),
      stroke: vi.fn(),
      arc: vi.fn(),
      fill: vi.fn(),
    } as unknown as CanvasRenderingContext2D;

    renderPaintStrokeToContext(ctx, [{ x: 100, y: 200 }], { size: 50, hardness: 0.5, opacity: 0.5, flow: 1, smoothing: 0 }, "#ff0000", false);

    expect(ctx.arc).toHaveBeenCalledWith(-20000 + 100, 200, 17.5, 0, Math.PI * 2); // coreWidth is 50 * 0.7 = 35, radius is 17.5
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
});


