import { describe, expect, it } from "vitest";
import {
  brushAlphaAtDistance,
  createBrushTip,
  falloff,
  getBrushDabSpacing,
  getBrushTipCacheKey,
  interpolateDabs,
  stampBrushTipMaxAlpha,
  compositeMaskToImageData,
  paintMaskToContext,
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

  it("keeps a solid center at the hardness radius", () => {
    const radius = 50;
    // Under Math.pow(0.5, 1.6), hardRadius is 50 * 0.3298 = 16.49
    expect(brushAlphaAtDistance(16.4, radius, 0.5, "cosine")).toBe(1);
    expect(brushAlphaAtDistance(16.5, radius, 0.5, "cosine")).toBeLessThan(1);
    expect(brushAlphaAtDistance(37.5, radius, 0.5, "cosine")).toBeCloseTo(0.3059, 4);
    expect(brushAlphaAtDistance(50, radius, 0.5, "cosine")).toBe(0);
  });

  it("creates a tip with center alpha and zero outer edge", () => {
    const tip = createBrushTip({ size: 21, hardness: 0, curve: "cosine" });
    const center = (10 * tip.width + 10) * 4 + 3;
    const corner = (20 * tip.width + 20) * 4 + 3;
    expect(tip.width).toBe(21);
    expect(tip.height).toBe(21);
    expect(tip.data[center]).toBe(255);
    expect(tip.data[corner]).toBe(0);
  });

  it("rounds cache keys to stable values", () => {
    expect(getBrushTipCacheKey({ size: 20.2, hardness: 0.333, curve: "cosine" })).toBe("20:33:cosine");
  });
});

describe("brushTipMask dabs", () => {
  it("uses tighter spacing for soft brushes", () => {
    expect(getBrushDabSpacing(100, 0, 1)).toBeLessThan(getBrushDabSpacing(100, 1, 1));
    expect(getBrushDabSpacing(100, 0, 1)).toBeGreaterThanOrEqual(1);
  });

  it("uses dense spacing for large soft brushes", () => {
    expect(getBrushDabSpacing(75, 0, 1)).toBeLessThanOrEqual(6);
    expect(getBrushDabSpacing(75, 0, 1)).toBeGreaterThanOrEqual(1);
  });

  it("uses dense spacing for size 70 hardness 0", () => {
    expect(getBrushDabSpacing(70, 0, 1)).toBeLessThanOrEqual(4);
    expect(getBrushDabSpacing(70, 0, 1)).toBeGreaterThanOrEqual(2);
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

  it("stamps with max alpha instead of additive alpha", () => {
    const tip = createBrushTip({ size: 3, hardness: 1, curve: "cosine" });
    const mask = new Uint8ClampedArray(9);
    stampBrushTipMaxAlpha(mask, 3, 3, tip, 1, 1, 0.5);
    stampBrushTipMaxAlpha(mask, 3, 3, tip, 1, 1, 0.5);
    expect(mask[4]).toBe(128);
  });

  it("supports subpixel stamping with bilinear interpolation", () => {
    const tip = createBrushTip({ size: 3, hardness: 0, curve: "cosine" });
    
    // Stamp at integer coordinates
    const maskInteger = new Uint8ClampedArray(9);
    stampBrushTipMaxAlpha(maskInteger, 3, 3, tip, 1, 1, 1.0);
    
    // Stamp at fractional coordinates
    const maskFractional = new Uint8ClampedArray(9);
    stampBrushTipMaxAlpha(maskFractional, 3, 3, tip, 1.5, 1, 1.0);
    
    // The mask stamped at 1.5 should be different (interpolated)
    expect(maskFractional[3]).not.toEqual(maskInteger[3]);
    expect(maskFractional[4]).not.toEqual(maskInteger[4]);
    expect(maskFractional[5]).not.toEqual(maskInteger[5]);
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
    return tip.data[(y * tip.width + x) * 4 + 3] / 255;
  }

  it("hardness 0 uses a broad, soft feather instead of a narrow core", () => {
    const tip = createBrushTip({ size: 75, hardness: 0, curve: "soft" });
    const c = Math.floor(tip.width / 2);

    const center = alphaAt(tip, c, c);
    const r25 = alphaAt(tip, c + Math.round(75 * 0.125), c);
    const r50 = alphaAt(tip, c + Math.round(75 * 0.25), c);
    const r75 = alphaAt(tip, c + Math.round(75 * 0.375), c);
    const edge = alphaAt(tip, tip.width - 1, c);

    expect(center).toBeGreaterThanOrEqual(0.8);
    expect(center).toBeLessThanOrEqual(0.95);
    expect(r25).toBeGreaterThanOrEqual(0.7);
    expect(r25).toBeLessThanOrEqual(0.85);
    expect(r50).toBeGreaterThanOrEqual(0.45);
    expect(r50).toBeLessThanOrEqual(0.65);
    expect(r75).toBeGreaterThanOrEqual(0.18);
    expect(r75).toBeLessThanOrEqual(0.42);
    expect(edge).toBeLessThan(0.05);
  });

  it("applies non-linear hardness mapping and hard edge 100", () => {
    const tip0 = createBrushTip({ size: 75, hardness: 0, curve: "soft" });
    const tip20 = createBrushTip({ size: 75, hardness: 0.2, curve: "soft" });
    const tip50 = createBrushTip({ size: 75, hardness: 0.5, curve: "soft" });
    const tip80 = createBrushTip({ size: 75, hardness: 0.8, curve: "soft" });
    const tip100 = createBrushTip({ size: 75, hardness: 1.0, curve: "soft" });

    const c = Math.floor(tip0.width / 2);

    // Distance 5 (x = c + 5):
    // - 50%, 80%, 100% must be fully solid (alpha = 1)
    // - 0%, 20% are in feather (alpha < 1)
    expect(alphaAt(tip100, c + 5, c)).toBe(1);
    expect(alphaAt(tip80, c + 5, c)).toBe(1);
    expect(alphaAt(tip50, c + 5, c)).toBe(1);
    expect(alphaAt(tip20, c + 5, c)).toBeLessThan(1);
    expect(alphaAt(tip0, c + 5, c)).toBeLessThan(1);

    // Distance 20 (x = c + 20):
    // - 80% and 100% must be solid (alpha = 1)
    // - 50% is feathered (alpha < 1)
    expect(alphaAt(tip100, c + 20, c)).toBe(1);
    expect(alphaAt(tip80, c + 20, c)).toBe(1);
    expect(alphaAt(tip50, c + 20, c)).toBeLessThan(1);

    // Distance 30 (x = c + 30):
    // - 100% must be solid (alpha = 1)
    // - 80% is feathered (alpha < 1)
    expect(alphaAt(tip100, c + 30, c)).toBe(1);
    expect(alphaAt(tip80, c + 30, c)).toBeLessThan(1);

    // Near outer edge (x = 74, distance 37):
    // - 100% must remain fully solid (alpha = 1) - no feather
    // - 80% is near 0 (alpha < 0.05)
    expect(alphaAt(tip100, tip100.width - 1, c)).toBe(1);
    expect(alphaAt(tip80, tip80.width - 1, c)).toBeLessThan(0.05);
    expect(alphaAt(tip50, tip50.width - 1, c)).toBeLessThan(0.05);
    expect(alphaAt(tip20, tip20.width - 1, c)).toBeLessThan(0.05);
    expect(alphaAt(tip0, tip0.width - 1, c)).toBeLessThan(0.05);
  });
});

describe("brushTipMask effective flow multiplier", () => {
  it("calculates correct multiplier checkpoints based on hardness", () => {
    // f(0) = 0.90
    expect(getEffectiveFlowMultiplier(0)).toBeCloseTo(0.90, 4);
    // f(0.8) = 0.98
    expect(getEffectiveFlowMultiplier(0.8)).toBeCloseTo(0.98, 4);
    // f(1.0) = 1.00
    expect(getEffectiveFlowMultiplier(1.0)).toBeCloseTo(1.0, 4);
  });

  it("ensures that soft brush alphaScale is scaled down compared to hard brush", () => {
    const opacity = 1.0;
    const flow = 1.0;
    const softAlphaScale = opacity * flow * getEffectiveFlowMultiplier(0);
    const hardAlphaScale = opacity * flow * getEffectiveFlowMultiplier(1.0);
    expect(softAlphaScale).toBeCloseTo(0.90, 4);
    expect(hardAlphaScale).toBe(1.0);
    expect(softAlphaScale).toBeLessThan(hardAlphaScale);
  });
});
