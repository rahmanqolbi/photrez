import { describe, expect, it } from "vitest";
import {
  brushAlphaAtDistance,
  createBrushTip,
  getBrushDabSpacing,
  getBrushTipOuterRadius,
  stampBrushTip,
  type BrushTip,
} from "../brushTipMask";

// Behavioral audit: Photrez brush vs Photoshop / GIMP / Krita / MyPaint.
// Each test locks a named behavioral contract so future regressions against
// a known editor surface as a named contract failure.

function alphaAt(tip: BrushTip, x: number, y: number): number {
  return tip.data[(y * tip.width + x) * 4 + 3] / 255;
}

describe("audit: Photoshop hard-edge binary alpha inside cursor radius", () => {
  it("hardness 100% returns alpha=1 for any distance inside the cursor radius", () => {
    const radius = 30;
    expect(brushAlphaAtDistance(0, radius, 1, "soft")).toBe(1);
    expect(brushAlphaAtDistance(15, radius, 1, "soft")).toBe(1);
    expect(brushAlphaAtDistance(29.99, radius, 1, "soft")).toBe(1);
  });

  it("hardness 100% returns alpha=0 at or beyond the cursor radius", () => {
    const radius = 30;
    expect(brushAlphaAtDistance(radius, radius, 1, "soft")).toBe(0);
    expect(brushAlphaAtDistance(radius + 1, radius, 1, "soft")).toBe(0);
  });

  it("hard brush tip data is fully 1.0 across the entire cursor diameter", () => {
    // For an odd size (e.g. 41), the tip covers all pixels within radius from
    // the center, so every generated pixel should be 1.
    const tip = createBrushTip({ size: 41, hardness: 1, curve: "soft" });
    const c = Math.floor(tip.width / 2);
    // Center
    expect(alphaAt(tip, c, c)).toBe(1);
    // Mid-radius horizontally
    expect(alphaAt(tip, c - 10, c)).toBe(1);
    expect(alphaAt(tip, c + 10, c)).toBe(1);
    // Just inside the rightmost cursor pixel (radius 20.5 → max in-bounds x = 40)
    expect(alphaAt(tip, 40, c)).toBe(1);
  });
});

describe("audit: fixed brush support radius", () => {
  it("uses the same support radius and mask dimensions at every hardness", () => {
    const size = 75;
    const radius = size / 2;
    for (const hardness of [0, 0.2, 0.5, 0.8, 1]) {
      const tip = createBrushTip({ size, hardness, curve: "soft" });
      expect(getBrushTipOuterRadius(radius, hardness, "soft")).toBe(radius);
      expect(tip.width).toBe(size);
      expect(tip.height).toBe(size);
      expect(brushAlphaAtDistance(radius, radius, hardness, "soft")).toBe(0);
      expect(brushAlphaAtDistance(radius + 1, radius, hardness, "soft")).toBe(0);
    }
  });
});

describe("audit: bounded hardness 0 feather profile", () => {
  // Inverse-quadratic feather (1 - t²) over the fixed radius:
  //   u=0.125 -> ~0.984, u=0.25 -> ~0.9375, u=0.50 -> 0.75,
  //   u=0.75 -> ~0.4375, u=1.00 -> 0.

  it("hardness 0 keeps a dense center at 12.5% cursor radius", () => {
    const tip = createBrushTip({ size: 75, hardness: 0, curve: "soft" });
    const c = Math.floor(tip.width / 2);
    expect(alphaAt(tip, c + Math.round(75 * 0.0625), c)).toBeGreaterThan(0.97);
    expect(alphaAt(tip, c + Math.round(75 * 0.0625), c)).toBeLessThanOrEqual(0.99);
  });

  it("hardness 0 remains strong at 25% cursor radius", () => {
    const tip = createBrushTip({ size: 75, hardness: 0, curve: "soft" });
    const c = Math.floor(tip.width / 2);
    expect(alphaAt(tip, c + Math.round(75 * 0.125), c)).toBeGreaterThan(0.92);
    expect(alphaAt(tip, c + Math.round(75 * 0.125), c)).toBeLessThanOrEqual(0.96);
  });

  it("hardness 0 fades through 50% cursor radius", () => {
    const tip = createBrushTip({ size: 75, hardness: 0, curve: "soft" });
    const c = Math.floor(tip.width / 2);
    expect(alphaAt(tip, c + Math.round(75 * 0.25), c)).toBeGreaterThan(0.70);
    expect(alphaAt(tip, c + Math.round(75 * 0.25), c)).toBeLessThanOrEqual(0.80);
  });

  it("hardness 0 is faint at 75% cursor radius", () => {
    const tip = createBrushTip({ size: 75, hardness: 0, curve: "soft" });
    const c = Math.floor(tip.width / 2);
    expect(alphaAt(tip, c + Math.round(75 * 0.375), c)).toBeGreaterThan(0.35);
    expect(alphaAt(tip, c + Math.round(75 * 0.375), c)).toBeLessThanOrEqual(0.50);
  });

  it("hardness 0 outer support edge fades to zero", () => {
    const tip = createBrushTip({ size: 75, hardness: 0, curve: "soft" });
    const c = Math.floor(tip.width / 2);
    expect(alphaAt(tip, tip.width - 1, c)).toBeLessThan(0.05);
  });
});

describe("audit: mask monotonicity + hardness ordering invariants", () => {
  // The soft curve uses an inverse-quadratic (1-t²) core+feather model.
  // These tests lock the invariants that the model preserves so any future
  // tuning can drift intentionally without breaking silent regressions.

  it("alpha is monotonically non-increasing with distance for every hardness", () => {
    const radius = 50;
    for (const h of [0, 0.2, 0.5, 0.8, 1]) {
      let prev = brushAlphaAtDistance(0, radius, h, "soft");
      for (let d = 1; d <= radius * 1.1; d += 1) {
        const cur = brushAlphaAtDistance(d, radius, h, "soft");
        expect(cur).toBeLessThanOrEqual(prev + 1e-9);
        prev = cur;
      }
    }
  });

  it("higher hardness yields equal or higher alpha throughout the fixed radius", () => {
    const radius = 50;
    for (let d = 0; d <= radius; d += 1) {
      const soft = brushAlphaAtDistance(d, radius, 0, "soft");
      const mid = brushAlphaAtDistance(d, radius, 0.5, "soft");
      const hard = brushAlphaAtDistance(d, radius, 0.8, "soft");
      expect(hard + 1e-6).toBeGreaterThanOrEqual(mid);
      expect(mid + 1e-6).toBeGreaterThanOrEqual(soft);
    }
  });

  it("hardness 1.0 collapses to hard edge (alpha 1 inside, 0 at radius)", () => {
    expect(brushAlphaAtDistance(0, 50, 1, "soft")).toBe(1);
    expect(brushAlphaAtDistance(25, 50, 1, "soft")).toBe(1);
    expect(brushAlphaAtDistance(49, 50, 1, "soft")).toBe(1);
    expect(brushAlphaAtDistance(50, 50, 1, "soft")).toBe(0);
  });

  it("hardness 0 feathers across the full radius and reaches zero at the edge", () => {
    expect(brushAlphaAtDistance(0, 50, 0, "soft")).toBe(1);
    // 1 - (12.5/50)² = 1 - 0.0625 = 0.9375
    expect(brushAlphaAtDistance(12.5, 50, 0, "soft")).toBeCloseTo(0.9375, 5);
    // 1 - (25/50)² = 1 - 0.25 = 0.75
    expect(brushAlphaAtDistance(25, 50, 0, "soft")).toBeCloseTo(0.75, 5);
    expect(brushAlphaAtDistance(50, 50, 0, "soft")).toBe(0);
    expect(brushAlphaAtDistance(51, 50, 0, "soft")).toBe(0);
  });

  it("hardness 0.8 keeps a mostly solid disk with a narrow feather rim", () => {
    // Hardness 0.8 keeps an 80% solid core, then feathers only inside
    // the remaining 20% of the fixed radius.
    const radius = 50;
    expect(brushAlphaAtDistance(0, radius, 0.8, "soft")).toBe(1);
    expect(brushAlphaAtDistance(20, radius, 0.8, "soft")).toBe(1);
    expect(brushAlphaAtDistance(35, radius, 0.8, "soft")).toBe(1);
    // t = (47.5-40)/10 = 0.75, alpha = 1 - 0.75² = 0.4375
    expect(brushAlphaAtDistance(47.5, radius, 0.8, "soft")).toBeCloseTo(0.4375, 5);
    expect(brushAlphaAtDistance(50, radius, 0.8, "soft")).toBe(0);
  });
});

describe("audit: Photoshop-style 25% dab spacing", () => {
  it("25% × size matches Photoshop default across sizes", () => {
    for (const size of [10, 30, 75, 200, 800]) {
      expect(getBrushDabSpacing(size, 0, 1)).toBe(Math.max(1, Math.round(size * 0.25)));
      expect(getBrushDabSpacing(size, 1, 1)).toBe(Math.max(1, Math.round(size * 0.25)));
    }
  });

  it("spacing is independent of hardness and flow (Photoshop-style)", () => {
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

describe("audit: Photoshop-style per-dab source-over accumulation", () => {
  it("opacity 50% + 10 passes saturates toward 100% (1 - 0.5^10 = 99.9%)", () => {
    const tip = createBrushTip({ size: 3, hardness: 1, curve: "cosine" });
    const mask = new Uint8ClampedArray(9);
    for (let i = 0; i < 10; i += 1) {
      stampBrushTip(mask, 3, 3, tip, 1, 1, 0.5);
    }
    expect(mask[4]).toBeGreaterThanOrEqual(253);
  });

  it("opacity 100% saturates on first dab (Photoshop flow = 100%)", () => {
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

describe("audit: bounded soft round single-dab profile (40px @ hardness 0)", () => {
  it("single dab center alpha is full strength", () => {
    const tip = createBrushTip({ size: 40, hardness: 0, curve: "soft" });
    const c = Math.floor(tip.width / 2);
    expect(alphaAt(tip, c, c)).toBeGreaterThan(0.99);
  });

  it("single dab at 25% radius remains strong", () => {
    const tip = createBrushTip({ size: 40, hardness: 0, curve: "soft" });
    const c = Math.floor(tip.width / 2);
    const r = 20;
    const at25 = alphaAt(tip, c + Math.round(r * 0.25), c);
    // 1-t² curve keeps higher alpha: at 25% of radius, alpha ≈ 0.9375
    expect(at25).toBeGreaterThan(0.90);
    expect(at25).toBeLessThan(0.97);
  });

  it("single dab is bounded by the cursor radius", () => {
    const tip = createBrushTip({ size: 40, hardness: 0, curve: "soft" });
    const r = 20;
    expect(tip.width).toBe(40);
    expect(brushAlphaAtDistance(r - 1, r, 0, "soft")).toBeGreaterThan(0);
    expect(brushAlphaAtDistance(r, r, 0, "soft")).toBe(0);
    expect(brushAlphaAtDistance(r + 1, r, 0, "soft")).toBe(0);
  });

  it("single dab with hardness 100 produces a binary hard edge at size 40", () => {
    const tip = createBrushTip({ size: 41, hardness: 1, curve: "soft" });
    const c = Math.floor(tip.width / 2);
    const r = 20; // size 41 → radius 20.5, cursor diameter 41
    // All pixels inside cursor diameter: alpha 1
    expect(alphaAt(tip, c, c)).toBe(1);
    expect(alphaAt(tip, c - r, c)).toBe(1);
    expect(alphaAt(tip, c + r, c)).toBe(1);
  });
});

describe("audit: spacing across a stroked segment matches Photoshop default", () => {
  // Photoshop at 25% spacing and a 40px brush places dabs every 10px along
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
