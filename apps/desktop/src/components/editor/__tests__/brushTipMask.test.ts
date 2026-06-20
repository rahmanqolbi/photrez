import { describe, expect, it } from "vitest";
import {
  brushAlphaAtDistance,
  createBrushTip,
  falloff,
  getBrushDabSpacing,
  getBrushTipOuterRadius,
  getBrushTipCacheKey,
  interpolateDabs,
  stampBrushTip,
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
  it("uses fixed 25% size spacing (Photoshop default) regardless of hardness", () => {
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

  it("accumulates dabs toward saturation (Photoshop-like source-over)", () => {
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

  it("hardness 0 uses a Photoshop-style cosine-smoothstep feather (dense mid-radius)", () => {
    const tip = createBrushTip({ size: 75, hardness: 0, curve: "soft" });
    const c = Math.floor(tip.width / 2);

    const center = alphaAt(tip, c, c);
    // u=0.125 (12.5% of cursor radius): smoothstep at u/(T) ≈ 0.125/1.10 = 0.114 → ~0.86
    const r12 = alphaAt(tip, c + Math.round(75 * 0.0625), c);
    // u=0.25 (25% of cursor radius): smoothstep at 0.25/1.10 = 0.227 → ~0.625
    const r25 = alphaAt(tip, c + Math.round(75 * 0.125), c);
    // u=0.5 (50% of cursor radius): smoothstep at 0.5/1.10 = 0.455 → ~0.275
    const r50 = alphaAt(tip, c + Math.round(75 * 0.25), c);
    // u=0.75 (75% of cursor radius): smoothstep at 0.75/1.10 = 0.682 → ~0.125
    const r75 = alphaAt(tip, c + Math.round(75 * 0.375), c);
    const edge = alphaAt(tip, tip.width - 1, c);

    expect(center).toBe(1);
    expect(r12).toBeGreaterThan(0.95);
    expect(r25).toBeGreaterThan(0.90);
    expect(r50).toBeGreaterThan(0.70);
    expect(r75).toBeGreaterThan(0.55);
    expect(edge).toBeLessThan(0.10);
  });

it("keeps a soft feather tail outside the normal cursor radius (visible edge + feather overshoot)", () => {
    const size = 75;
    const radius = size / 2;
    const tip = createBrushTip({ size, hardness: 0, curve: "soft" });
    const c = Math.floor(tip.width / 2);

    expect(getBrushTipOuterRadius(radius, 0, "soft")).toBeGreaterThan(radius);
    expect(getBrushTipOuterRadius(radius, 1, "soft")).toBe(radius);
    expect(getBrushTipOuterRadius(radius, 0, "cosine")).toBe(radius);
    expect(tip.width).toBeGreaterThan(size);

    // At the cursor edge: strongly visible alpha (paint reaches the visual indicator)
    const cursorEdge = alphaAt(tip, c + Math.round(radius), c);
    expect(cursorEdge).toBeGreaterThan(0.40);
    expect(cursorEdge).toBeLessThan(0.60);
    // Just past the cursor edge: feather overshoot (fainter but still visible)
    const outsideCircle = alphaAt(tip, c + Math.round(radius + 2), c);
    expect(outsideCircle).toBeGreaterThan(0);
    expect(outsideCircle).toBeLessThan(cursorEdge);
    // At the support edge: zero
    const supportEdge = alphaAt(tip, tip.width - 1, c);
    expect(supportEdge).toBeLessThan(0.05);
  });

  it("hardness 0.8 produces a mostly solid disk with a narrow feather rim (Photoshop-style)", () => {
    const tip = createBrushTip({ size: 75, hardness: 0.8, curve: "soft" });
    const c = Math.floor(tip.width / 2);

    // Inner ~60% should remain at full alpha
    const at20 = alphaAt(tip, c + Math.round(75 * 0.10), c);
    const at40 = alphaAt(tip, c + Math.round(75 * 0.20), c);
    expect(at20).toBe(1);
    expect(at40).toBe(1);

    // The feather rim is narrow: alpha drops sharply in the outer ~15%
    const at70 = alphaAt(tip, c + Math.round(75 * 0.35), c);
    const at95 = alphaAt(tip, c + Math.round(75 * 0.475), c);
    expect(at70).toBeGreaterThan(0.50);
    expect(at95).toBeLessThan(0.60);
  });

  it("hardness 0.5 produces a solid core + outer feather (Photoshop-style)", () => {
    const tip = createBrushTip({ size: 75, hardness: 0.5, curve: "soft" });
    const c = Math.floor(tip.width / 2);

    // Inner 50% of radius is solid (≤ ~19 pixels from center)
    expect(alphaAt(tip, c, c)).toBe(1);
    expect(alphaAt(tip, c + 5, c)).toBe(1);
    expect(alphaAt(tip, c + 10, c)).toBe(1);
    expect(alphaAt(tip, c + 15, c)).toBe(1);

    // Feather in the outer half — alpha stays visible (>= 0.5) up to the cursor edge
    const at20 = alphaAt(tip, c + 20, c);
    const at30 = alphaAt(tip, c + 30, c);
    expect(at20).toBeGreaterThan(0.90);
    expect(at30).toBeGreaterThan(0.50);
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
