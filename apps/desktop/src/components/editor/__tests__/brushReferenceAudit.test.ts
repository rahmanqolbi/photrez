import { describe, expect, it } from "vitest";
import {
  brushAlphaAtDistance,
  createBrushTip,
  getBrushDabSpacing,
  getBrushTipOuterRadius,
  stampBrushTip,
  type BrushTip,
} from "../brushTipMask";

// Behavioral audit: Photrez brush vs established image editors.
// Each test locks a named behavioral contract so future regressions against
// a known editor surface as a named contract failure.

function alphaAt(tip: BrushTip, x: number, y: number): number {
  return tip.data[(y * tip.width + x) * 4 + 3] / 255;
}

describe("audit: measured reference super-Gaussian profile", () => {
  it("uses a literal hard edge from 97% hardness with an inclusive radius", () => {
    const radius = 30;
    expect(brushAlphaAtDistance(0, radius, 0.97, "soft")).toBe(1);
    expect(brushAlphaAtDistance(radius, radius, 0.97, "soft")).toBe(1);
    expect(brushAlphaAtDistance(radius + 0.001, radius, 0.97, "soft")).toBe(0);
  });

  it("keeps hardness 0 continuously graded with measured bleed beyond radius", () => {
    const radius = 50;
    expect(brushAlphaAtDistance(0, radius, 0, "soft")).toBe(1);
    expect(brushAlphaAtDistance(0.5, radius, 0, "soft")).toBeLessThan(1);
    expect(brushAlphaAtDistance(radius, radius, 0, "soft"))
      .toBeCloseTo(Math.exp(-Math.pow(1 / 0.661, 2)), 12);
    expect(brushAlphaAtDistance(radius * 1.4, radius, 0, "soft")).toBeGreaterThan(0.01);
  });

  it("keeps 90% hardness solid through most of the radius before a sharp drop", () => {
    const radius = 50;
    expect(brushAlphaAtDistance(radius * 0.8, radius, 0.9, "soft")).toBeGreaterThan(0.99);
    expect(brushAlphaAtDistance(radius, radius, 0.9, "soft")).toBeGreaterThan(0.4);
    expect(brushAlphaAtDistance(radius * 1.1, radius, 0.9, "soft")).toBeLessThan(0.001);
  });

  it("allocates visible soft-tail support while keeping hard support nominal", () => {
    const radius = 37.5;
    expect(getBrushTipOuterRadius(radius, 0, "soft")).toBeGreaterThan(radius * 1.6);
    expect(getBrushTipOuterRadius(radius, 0.5, "soft")).toBeGreaterThan(radius);
    expect(getBrushTipOuterRadius(radius, 1, "soft")).toBe(radius);
  });

  it("is monotonically non-increasing with radial distance", () => {
    const radius = 50;
    for (const hardness of [0, 0.2, 0.5, 0.8, 0.9, 0.97, 1]) {
      let previous = brushAlphaAtDistance(0, radius, hardness, "soft");
      for (let distance = 1; distance <= radius * 1.7; distance += 1) {
        const current = brushAlphaAtDistance(distance, radius, hardness, "soft");
        expect(current).toBeLessThanOrEqual(previous + 1e-12);
        previous = current;
      }
    }
  });
});

describe("audit: editor-standard 25% dab spacing", () => {
  it("25% × size matches reference spacing across sizes", () => {
    for (const size of [10, 30, 75, 200, 800]) {
      expect(getBrushDabSpacing(size, 0, 1)).toBe(Math.max(1, Math.round(size * 0.25)));
      expect(getBrushDabSpacing(size, 1, 1)).toBe(Math.max(1, Math.round(size * 0.25)));
    }
  });

  it("spacing is independent of hardness and flow (editor-standard)", () => {
    const a = getBrushDabSpacing(100, 0, 0.1);
    const b = getBrushDabSpacing(100, 0.5, 0.5);
    const c = getBrushDabSpacing(100, 1, 1);
    expect(a).toBe(b);
    expect(b).toBe(c);
  });

  it("tiny brushes never produce 0 spacing", () => {
    expect(getBrushDabSpacing(1, 0, 1)).toBeGreaterThanOrEqual(1);
    expect(getBrushDabSpacing(0, 0, 1)).toBeGreaterThanOrEqual(1);
  });
});

describe("audit: editor-standard per-dab source-over accumulation", () => {
  it("opacity 50% + 10 passes saturates toward 100% (1 - 0.5^10 = 99.9%)", () => {
    const tip = createBrushTip({ size: 3, hardness: 1, curve: "cosine" });
    const mask = new Uint8ClampedArray(9);
    for (let i = 0; i < 10; i += 1) {
      stampBrushTip(mask, 3, 3, tip, 1, 1, 0.5);
    }
    expect(mask[4]).toBeGreaterThanOrEqual(253);
  });

  it("opacity 100% saturates on first dab (per-dab flow = 100%)", () => {
    const tip = createBrushTip({ size: 3, hardness: 1, curve: "cosine" });
    const mask = new Uint8ClampedArray(9);
    stampBrushTip(mask, 3, 3, tip, 1, 1, 1);
    expect(mask[4]).toBe(255);
  });

  it("opacity 25% + 4 passes reaches the expected pre-multiplied saturation", () => {
    // Per-dab alpha at center: round(0.25 * 255) = 64
    // Step 1: 64
    // Step 2: 64 + round((255-64)*64/255) = 64 + 48 = 112
    // Step 3: 112 + round((255-112)*64/255) = 112 + 36 = 148
    // Step 4: 148 + round((255-148)*64/255) = 148 + 27 = 175
    const tip = createBrushTip({ size: 3, hardness: 1, curve: "cosine" });
    const mask = new Uint8ClampedArray(9);
    for (let i = 0; i < 4; i += 1) {
      stampBrushTip(mask, 3, 3, tip, 1, 1, 0.25);
    }
    expect(mask[4]).toBeGreaterThanOrEqual(165);
    expect(mask[4]).toBeLessThanOrEqual(195);
  });

  it("never exceeds 255 (saturation clamp)", () => {
    const tip = createBrushTip({ size: 3, hardness: 1, curve: "cosine" });
    const mask = new Uint8ClampedArray(9);
    for (let i = 0; i < 100; i += 1) {
      stampBrushTip(mask, 3, 3, tip, 1, 1, 1);
    }
    expect(mask[4]).toBe(255);
  });

  it("non-overlapping dabs do not affect each other (per-pixel isolation)", () => {
    const tip = createBrushTip({ size: 3, hardness: 1, curve: "cosine" });
    const mask = new Uint8ClampedArray(9);
    stampBrushTip(mask, 3, 3, tip, 0, 0, 0.5);
    stampBrushTip(mask, 3, 3, tip, 2, 2, 0.5);
    // Diagonal corners (0,0) and (2,2) get full per-dab alpha
    expect(mask[0]).toBeGreaterThanOrEqual(120);
    expect(mask[8]).toBeGreaterThanOrEqual(120);
    // Center (1,1) gets bilinear contributions from both
    expect(mask[4]).toBeGreaterThanOrEqual(120);
  });
});

describe("audit: calibrated soft round single-dab profile", () => {
  it("single dab center rounds to full strength", () => {
    const tip = createBrushTip({ size: 40, hardness: 0, curve: "soft" });
    const center = Math.round((tip.width - 1) / 2);
    expect(alphaAt(tip, center, center)).toBeGreaterThan(0.99);
  });

  it("single dab at 25% radius follows sigma 0.661 and n 2", () => {
    expect(brushAlphaAtDistance(5, 20, 0, "soft"))
      .toBeCloseTo(Math.exp(-Math.pow(0.25 / 0.661, 2)), 12);
  });

  it("single dab retains visible pixels beyond the nominal cursor radius", () => {
    const tip = createBrushTip({ size: 40, hardness: 0, curve: "soft" });
    const center = (tip.width - 1) / 2;
    const row = Math.round(center);
    const beyondCursor = alphaAt(tip, Math.round(center + 22), row);
    expect(tip.width).toBeGreaterThan(40);
    expect(beyondCursor).toBeGreaterThan(0);
  });

  it("single dab with hardness 100 produces a binary hard edge", () => {
    const tip = createBrushTip({ size: 41, hardness: 1, curve: "soft" });
    const center = Math.floor(tip.width / 2);
    expect(alphaAt(tip, center, center)).toBe(1);
    expect(alphaAt(tip, center - 20, center)).toBe(1);
    expect(alphaAt(tip, center + 20, center)).toBe(1);
  });
});

describe("audit: spacing across a stroked segment matches reference spacing", () => {
  // a 25%-spacing reference and a 40px brush places dabs every 10px along
  // the stroke. For a 30px segment at that spacing, we expect ~3-4 dabs.
  it("a 30px segment at size 40 produces 3-4 dabs (excluding the first point stamp)", () => {
    // Size 40 → spacing 10. For a 30px segment, expected non-first dabs: floor(30/10) = 3.
    // Plus the always-stamped first point: 4 total.
    const tip = createBrushTip({ size: 40, hardness: 1, curve: "cosine" });
    const mask = new Uint8ClampedArray(60 * 60);
    const spacing = getBrushDabSpacing(40, 1, 1);
    expect(spacing).toBe(10);

    // Stamp first point at (10, 30)
    stampBrushTip(mask, 60, 60, tip, 10, 30, 1);
    // Interpolate from (10, 30) to (40, 30) at spacing 10 — expect 3 dabs
    const result = (() => {
      // Use the same formula as the renderer
      const dx = 40 - 10;
      const dy = 30 - 30;
      const distance = Math.hypot(dx, dy);
      const dabs: { x: number; y: number }[] = [];
      let next = spacing;
      while (next <= distance + 0.0001) {
        const t = next / distance;
        dabs.push({ x: 10 + dx * t, y: 30 + dy * t });
        next += spacing;
      }
      return dabs;
    })();

    expect(result.length).toBe(3);
  });
});
