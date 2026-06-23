import { describe, expect, it, vi } from "vitest";
import {
  brushAlphaAtDistance,
  clearBrushTipCache,
  createBrushTip,
  falloff,
  getBrushDabSpacing,
  getBrushTipOuterRadius,
  getBrushTipCacheKey,
  getBrushTip,
  interpolateDabs,
  stampBrushTip,
  stampTerminalBrushTip,
  compositeMaskToImageData,
  paintMaskToContext,
  paintTransientBrushTipToContext,
  getEffectiveFlowMultiplier,
  type BrushTip,
} from "../brushTipMask";

describe("brushTipMask falloff", () => {
  it("uses cosine falloff by default", () => {
    expect(falloff(0, "cosine")).toBe(0);
    expect(falloff(0.5, "cosine")).toBeCloseTo(0.5, 5);
    expect(falloff(1, "cosine")).toBe(1);
  });

  it("feathers the full radius at hardness 0", () => {
    const radius = 50;
    expect(brushAlphaAtDistance(0, radius, 0, "cosine")).toBe(1);
    expect(brushAlphaAtDistance(25, radius, 0, "cosine")).toBeCloseTo(0.5, 5);
    expect(brushAlphaAtDistance(49, radius, 0, "cosine")).toBeGreaterThan(0);
    expect(brushAlphaAtDistance(50, radius, 0, "cosine")).toBe(0);
  });

  it("keeps diameter fixed while hardness sharpens the falloff", () => {
    const radius = 50;
    expect(brushAlphaAtDistance(25, radius, 0, "cosine")).toBeCloseTo(0.5, 5);
    expect(brushAlphaAtDistance(25, radius, 0.5, "cosine")).toBe(1);
    expect(brushAlphaAtDistance(37.5, radius, 0.5, "cosine")).toBeCloseTo(0.5, 5);
    expect(brushAlphaAtDistance(40, radius, 0.8, "cosine")).toBe(1);
    expect(brushAlphaAtDistance(45, radius, 0.8, "cosine")).toBeCloseTo(0.5, 5);

    for (const hardness of [0, 0.5, 0.8, 1]) {
      expect(brushAlphaAtDistance(49, radius, hardness, "cosine")).toBeGreaterThan(0);
      expect(brushAlphaAtDistance(50, radius, hardness, "cosine")).toBe(0);
      expect(brushAlphaAtDistance(51, radius, hardness, "cosine")).toBe(0);
    }
  });

  it("creates a tip with center alpha and zero outer edge", () => {
    const tip = createBrushTip({ size: 21, hardness: 0, curve: "cosine" });
    const center = tip.diameter / 2;
    const centerAlpha = tip.data[center * tip.width + center];
    const corner = tip.data[tip.data.length - 1];
    expect(tip.width).toBe(24);
    expect(tip.height).toBe(24);
    expect(centerAlpha).toBeGreaterThan(0.98);
    expect(corner).toBe(0);
  });

  it("rounds cache keys to stable values", () => {
    expect(getBrushTipCacheKey({ size: 20.2, hardness: 0.333, curve: "cosine" })).toBe("20:33:cosine");
  });
});

describe("reference-calibrated soft round raster", () => {
  it("keeps hardness-0 alpha outside the nominal radius", () => {
    const radius = 50;
    expect(brushAlphaAtDistance(radius, radius, 0, "soft")).toBeGreaterThan(0.09);
    expect(brushAlphaAtDistance(radius * 1.4, radius, 0, "soft")).toBeGreaterThan(0.01);
  });

  it("allocates soft support beyond size without changing nominal radius", () => {
    const tip = createBrushTip({ size: 100, hardness: 0, curve: "soft" });
    expect(tip.radius).toBe(50);
    expect(tip.width).toBeGreaterThan(100);
    expect(tip.height).toBe(tip.width);
  });

  it("uses a one-pixel antialiased boundary below 22 render pixels", () => {
    const tip = createBrushTip({ size: 21, hardness: 0, curve: "soft" });
    const center = tip.diameter / 2;
    const centerAlpha = tip.data[center * tip.width + center];
    const boundaryAlpha = tip.data[center * tip.width + center + 10];

    expect(centerAlpha).toBe(1);
    expect(boundaryAlpha).toBeGreaterThan(0);
    expect(boundaryAlpha).toBeLessThan(1);
  });

  it("reuses cached data until size or hardness changes", () => {
    clearBrushTipCache();
    const first = getBrushTip({ size: 100, hardness: 0.5, curve: "soft" });
    expect(getBrushTip({ size: 100, hardness: 0.5, curve: "soft" })).toBe(first);
    expect(getBrushTip({ size: 101, hardness: 0.5, curve: "soft" })).not.toBe(first);
    expect(getBrushTip({ size: 100, hardness: 0.6, curve: "soft" })).not.toBe(first);
  });
});

describe("brushTipMask dabs", () => {
  it("uses fixed 25% size spacing (reference spacing) regardless of hardness", () => {
    expect(getBrushDabSpacing(100, 0, 1)).toBe(25);
    expect(getBrushDabSpacing(100, 1, 1)).toBe(25);
    expect(getBrushDabSpacing(100, 0.5, 1)).toBe(25);
  });

  it("never returns less than 1 even for tiny brushes", () => {
    expect(getBrushDabSpacing(1, 0, 1)).toBe(1);
    expect(getBrushDabSpacing(2, 0, 1)).toBe(1);
  });

  it("scales linearly with size (no per-harness floor)", () => {
    expect(getBrushDabSpacing(20, 0, 1)).toBe(5);
    expect(getBrushDabSpacing(40, 0, 1)).toBe(10);
    expect(getBrushDabSpacing(80, 0, 1)).toBe(20);
    expect(getBrushDabSpacing(400, 0, 1)).toBe(100);
  });

  it("does not depend on flow", () => {
    expect(getBrushDabSpacing(100, 0, 0.1)).toBe(getBrushDabSpacing(100, 0, 1));
    expect(getBrushDabSpacing(100, 1, 0.5)).toBe(getBrushDabSpacing(100, 1, 1));
  });

  it("interpolates dabs between two points", () => {
    const result = interpolateDabs({ x: 0, y: 0 }, { x: 30, y: 0 }, 10, 0);
    expect(result.dabs).toEqual([{ x: 10, y: 0 }, { x: 20, y: 0 }, { x: 30, y: 0 }]);
    expect(result.carry).toBe(0);
  });

  it("carries leftover distance to the next segment", () => {
    const result = interpolateDabs({ x: 0, y: 0 }, { x: 15, y: 0 }, 10, 0);
    expect(result.dabs).toEqual([{ x: 10, y: 0 }]);
    expect(result.carry).toBe(5);
  });

  it("stamps a non-grid terminal endpoint exactly once", () => {
    const tip = createBrushTip({ size: 3, hardness: 1, curve: "soft" });
    const mask = new Uint8ClampedArray(30 * 5);
    const start = { x: 2, y: 2 };
    const endpoint = { x: 17, y: 2 };
    stampBrushTip(mask, 30, 5, tip, start.x, start.y, 0.5);

    const spaced = interpolateDabs(start, endpoint, 10, 0);
    let lastDab = start;
    for (const dab of spaced.dabs) {
      stampBrushTip(mask, 30, 5, tip, dab.x, dab.y, 0.5);
      lastDab = dab;
    }

    expect(mask[endpoint.y * 30 + endpoint.x]).toBe(0);
    expect(stampTerminalBrushTip(mask, 30, 5, tip, endpoint, lastDab, 0.5)).toBe(true);
    const terminalAlpha = mask[endpoint.y * 30 + endpoint.x];
    expect(terminalAlpha).toBeGreaterThan(0);

    expect(stampTerminalBrushTip(mask, 30, 5, tip, endpoint, endpoint, 0.5)).toBe(false);
    expect(mask[endpoint.y * 30 + endpoint.x]).toBe(terminalAlpha);
  });

  it("composites a transient endpoint only inside its clipped tip region", () => {
    const tip = createBrushTip({ size: 20, hardness: 1, curve: "soft" });
    const getImageData = vi.fn((_x: number, _y: number, width: number, height: number) => ({
      width,
      height,
      data: new Uint8ClampedArray(width * height * 4),
      colorSpace: "srgb",
    } as ImageData));
    const putImageData = vi.fn();
    const ctx = {
      canvas: { width: 100, height: 80 },
      getImageData,
      putImageData,
    } as unknown as CanvasRenderingContext2D;

    expect(paintTransientBrushTipToContext(
      ctx,
      tip,
      { x: 92, y: 40 },
      { x: 80, y: 40 },
      1,
      "#ff0000",
      false,
    )).toBe(true);

    expect(getImageData).toHaveBeenCalledWith(81, 29, 19, 22);
    const written = putImageData.mock.calls[0][0] as ImageData;
    expect(written.data[(10 * written.width + 10) * 4 + 3]).toBeGreaterThan(0);
  });

  it("skips a transient endpoint already occupied by the last regular dab", () => {
    const tip = createBrushTip({ size: 20, hardness: 1, curve: "soft" });
    const ctx = {
      canvas: { width: 100, height: 80 },
      getImageData: vi.fn(),
      putImageData: vi.fn(),
    } as unknown as CanvasRenderingContext2D;
    const endpoint = { x: 40, y: 30 };

    expect(paintTransientBrushTipToContext(
      ctx,
      tip,
      endpoint,
      endpoint,
      0.5,
      "#ff0000",
      false,
    )).toBe(false);
    expect(ctx.getImageData).not.toHaveBeenCalled();
  });

  it("accumulates dabs toward saturation (editor-standard source-over)", () => {
    const tip = createBrushTip({ size: 3, hardness: 1, curve: "cosine" });
    const mask = new Uint8ClampedArray(9);
    stampBrushTip(mask, 3, 3, tip, 1, 1, 0.5);
    stampBrushTip(mask, 3, 3, tip, 1, 1, 0.5);
    // First stamp: 128 (center alpha scaled by 0.5).
    // Second stamp pre-multiplied accumulation: 128 + round((255-128)*128/255) = 192.
    expect(mask[4]).toBe(192);
  });

  it("saturates after enough passes at opacity 50%", () => {
    const tip = createBrushTip({ size: 3, hardness: 1, curve: "cosine" });
    const mask = new Uint8ClampedArray(9);
    for (let i = 0; i < 20; i += 1) {
      stampBrushTip(mask, 3, 3, tip, 1, 1, 0.5);
    }
    // 20 passes at alpha 0.5 → 1 - (0.5)^20 ≈ 1.0
    expect(mask[4]).toBe(255);
  });

  it("saturates with 5 passes at full opacity", () => {
    const tip = createBrushTip({ size: 3, hardness: 1, curve: "cosine" });
    const mask = new Uint8ClampedArray(9);
    stampBrushTip(mask, 3, 3, tip, 1, 1, 1.0);
    expect(mask[4]).toBe(255);
  });

  it("supports subpixel stamping with bilinear interpolation", () => {
    const tip = createBrushTip({ size: 3, hardness: 0, curve: "cosine" });

    // Stamp at integer coordinates
    const maskInteger = new Uint8ClampedArray(9);
    stampBrushTip(maskInteger, 3, 3, tip, 1, 1, 1.0);

    // Stamp at fractional coordinates
    const maskFractional = new Uint8ClampedArray(9);
    stampBrushTip(maskFractional, 3, 3, tip, 1.5, 1, 1.0);

    // The mask stamped at 1.5 should be different (interpolated)
    expect(maskFractional).not.toEqual(maskInteger);
  });

  it("incremental dabs match continuous interpolation", () => {
    const spacing = 10;
    const seg1 = interpolateDabs({ x: 0, y: 0 }, { x: 15, y: 0 }, spacing, 0);
    const seg2 = interpolateDabs({ x: 15, y: 0 }, { x: 30, y: 0 }, spacing, seg1.carry);
    const full = interpolateDabs({ x: 0, y: 0 }, { x: 30, y: 0 }, spacing, 0);
    const combinedDabs = [...seg1.dabs, ...seg2.dabs];
    expect(combinedDabs).toEqual(full.dabs);
    expect(seg2.carry).toBe(full.carry);
  });

  it("composites mask to image data for brush", () => {
    const imgData = {
      width: 2,
      height: 2,
      data: new Uint8ClampedArray(16),
      colorSpace: "srgb",
    } as ImageData;
    const mask = new Uint8ClampedArray([255, 0, 0, 128]);
    compositeMaskToImageData(imgData, mask, "rgba(255,0,0,1)", false);
    expect(imgData.data[0]).toBe(255); // Red
    expect(imgData.data[3]).toBe(255); // Opaque alpha
    expect(imgData.data[12]).toBe(255); // Red
    expect(imgData.data[15]).toBe(128); // Semi-transparent
  });

  it("composites mask to image data for eraser", () => {
    const imgData = {
      width: 2,
      height: 2,
      data: new Uint8ClampedArray([0, 0, 0, 200, 0, 0, 0, 200, 0, 0, 0, 200, 0, 0, 0, 200]),
      colorSpace: "srgb",
    } as ImageData;
    const mask = new Uint8ClampedArray([255, 0, 0, 128]);
    compositeMaskToImageData(imgData, mask, "rgba(0,0,0,1)", true);
    expect(imgData.data[3]).toBe(0); // Erased (mask 255 -> alpha = 1)
    expect(imgData.data[7]).toBe(200); // Unchanged (mask 0)
    expect(imgData.data[15]).toBe(100); // Reduced alpha (mask 128 -> alpha = 0.5 -> 200 * (1 - 0.5) = 100)
  });
});

describe("brushTipMask pixel profile", () => {
  function alphaAt(tip: BrushTip, x: number, y: number): number {
    return tip.data[y * tip.width + x];
  }

  it("rasterizes the calibrated hardness-0 curve through and beyond the nominal radius", () => {
    const size = 75;
    const radius = size / 2;
    const tip = createBrushTip({ size, hardness: 0, curve: "soft" });
    const center = tip.diameter / 2;
    const row = center;
    const atNominalRadius = alphaAt(tip, center + Math.floor(radius), row);
    const beyondRadius = alphaAt(tip, center + Math.floor(radius * 1.4), row);

    expect(tip.width).toBeGreaterThan(size);
    expect(atNominalRadius).toBeGreaterThan(0.08);
    expect(atNominalRadius).toBeLessThan(0.13);
    expect(beyondRadius).toBeGreaterThan(0);
    expect(beyondRadius).toBeLessThan(0.02);
  });

  it("uses dynamic support for calibrated tips and nominal support for hard tips", () => {
    const radius = 37.5;
    expect(getBrushTipOuterRadius(radius, 0, "soft")).toBeGreaterThan(radius * 1.6);
    expect(getBrushTipOuterRadius(radius, 0.5, "soft")).toBeGreaterThan(radius);
    expect(getBrushTipOuterRadius(radius, 1, "soft")).toBe(radius);
    expect(getBrushTipOuterRadius(radius, 0, "cosine")).toBe(radius);
  });

  it("keeps high hardness visually solid until its sharp calibrated shoulder", () => {
    const radius = 50;
    expect(brushAlphaAtDistance(radius * 0.8, radius, 0.9, "soft")).toBeGreaterThan(0.99);
    expect(brushAlphaAtDistance(radius, radius, 0.9, "soft")).toBeGreaterThan(0.4);
    expect(brushAlphaAtDistance(radius * 1.1, radius, 0.9, "soft")).toBeLessThan(0.001);
  });
});

describe("brushTipMask effective flow multiplier", () => {
  it("keeps opacity and flow independent from hardness", () => {
    expect(getEffectiveFlowMultiplier(0)).toBe(1);
    expect(getEffectiveFlowMultiplier(0.8)).toBe(1);
    expect(getEffectiveFlowMultiplier(1.0)).toBe(1);
  });

  it("uses the same alpha scale for soft and hard brushes at equal opacity/flow", () => {
    const opacity = 1.0;
    const flow = 1.0;
    const softAlphaScale = opacity * flow * getEffectiveFlowMultiplier(0);
    const hardAlphaScale = opacity * flow * getEffectiveFlowMultiplier(1.0);
    expect(hardAlphaScale).toBe(1.0);
    expect(softAlphaScale).toBe(hardAlphaScale);
  });
});
