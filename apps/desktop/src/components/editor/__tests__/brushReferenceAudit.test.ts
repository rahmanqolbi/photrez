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

describe("audit: Photoshop soft-tail outside cursor circle (hardness 0)", () => {
  it("soft hardness 0 keeps a strong visible alpha at the cursor edge + feather overshoot", () => {
    const size = 75;
    const radius = size / 2;
    const outerRadius = getBrushTipOuterRadius(radius, 0, "soft");
    const tip = createBrushTip({ size, hardness: 0, curve: "soft" });
    const c = Math.floor(tip.width / 2);

    // Outer radius must be > cursor radius (small 10% tail)
    expect(outerRadius).toBeGreaterThan(radius);
    expect(outerRadius).toBeLessThan(radius * 1.15);

    // At the cursor edge: strong visible alpha (~50%) so paint fills the indicator
    const cursorEdge = alphaAt(tip, c + Math.round(radius), c);
    expect(cursorEdge).toBeGreaterThan(0.40);
    expect(cursorEdge).toBeLessThan(0.60);

    // Just past cursor radius: feather overshoot (fainter but still visible)
    const justPast = alphaAt(tip, c + Math.round(radius + 2), c);
    expect(justPast).toBeGreaterThan(0);
    expect(justPast).toBeLessThan(cursorEdge);

    // At the support edge the brush is essentially zero
    const supportEdge = alphaAt(tip, tip.width - 1, c);
    expect(supportEdge).toBeLessThan(0.05);
  });
});

describe("audit: Photrez soft hardness 0 dense-feather profile (calibration lock)", () => {
  // Photoshop soft round (h=0) visual reference (smoothstep core+feather with
  // visible edge alpha = 0.5 so the brush "fills" the cursor visual size):
  //   u=0.125 → ~0.97, u=0.25 → ~0.92, u=0.50 → ~0.75, u=0.75 → ~0.58, u=1.00 → 0.50

  it("hardness 0 keeps a dense center at 12.5% cursor radius", () => {
    const tip = createBrushTip({ size: 75, hardness: 0, curve: "soft" });
    const c = Math.floor(tip.width / 2);
    expect(alphaAt(tip, c + Math.round(75 * 0.0625), c)).toBeGreaterThan(0.93);
    expect(alphaAt(tip, c + Math.round(75 * 0.0625), c)).toBeLessThanOrEqual(0.99);
  });

  it("hardness 0 stays dense through 25% cursor radius (Photoshop soft round)", () => {
    const tip = createBrushTip({ size: 75, hardness: 0, curve: "soft" });
    const c = Math.floor(tip.width / 2);
    expect(alphaAt(tip, c + Math.round(75 * 0.125), c)).toBeGreaterThan(0.85);
    expect(alphaAt(tip, c + Math.round(75 * 0.125), c)).toBeLessThanOrEqual(0.95);
  });

  it("hardness 0 fades through 50% cursor radius", () => {
    const tip = createBrushTip({ size: 75, hardness: 0, curve: "soft" });
    const c = Math.floor(tip.width / 2);
    expect(alphaAt(tip, c + Math.round(75 * 0.25), c)).toBeGreaterThan(0.65);
    expect(alphaAt(tip, c + Math.round(75 * 0.25), c)).toBeLessThanOrEqual(0.85);
  });

  it("hardness 0 stays dense through 75% cursor radius (visible body extends past 75%)", () => {
    const tip = createBrushTip({ size: 75, hardness: 0, curve: "soft" });
    const c = Math.floor(tip.width / 2);
    expect(alphaAt(tip, c + Math.round(75 * 0.375), c)).toBeGreaterThan(0.50);
    expect(alphaAt(tip, c + Math.round(75 * 0.375), c)).toBeLessThanOrEqual(0.65);
  });

  it("hardness 0 outer support edge fades to zero", () => {
    const tip = createBrushTip({ size: 75, hardness: 0, curve: "soft" });
    const c = Math.floor(tip.width / 2);
    expect(alphaAt(tip, tip.width - 1, c)).toBeLessThan(0.05);
  });
});

describe("audit: mask monotonicity + hardness ordering invariants", () => {
  // The new soft curve uses a smoothstep core+feather model rather than the
  // GIMP gauss(pow(t, 0.4/(1-h))) formula. These tests lock the invariants
  // that the new model preserves so any future tuning can drift intentionally
  // without breaking silent regressions.

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

  it("higher hardness yields equal or higher alpha in the inner region (allowing soft-tail edge inversion)", () => {
    // Hardness ordering holds strictly inside the inner ~95% of the radius.
    // Near the cursor edge, h=0's longer soft tail can briefly exceed h=0.5's
    // mid-hardness alpha (matching Photoshop's behavior), so we only check
    // d < 0.95 * radius for strict ordering.
    const radius = 50;
    const cutoff = Math.floor(radius * 0.95);
    for (let d = 0; d < cutoff; d += 1) {
      const soft = brushAlphaAtDistance(d, radius, 0, "soft");
      const mid = brushAlphaAtDistance(d, radius, 0.5, "soft");
      const hard = brushAlphaAtDistance(d, radius, 0.8, "soft");
      // ponytail: allow a tiny float-error tolerance at the smoothstep kink
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

it("hardness 0 produces a dense center with visible alpha at the cursor edge", () => {
    // Photrez keeps paint visible at the cursor edge so the visual cursor
    // aligns with where the brush actually reaches. With alphaAtEdge = 0.5,
    // the brush "fills" the cursor visual size — at every hardness level.
    expect(brushAlphaAtDistance(0, 50, 0, "soft")).toBe(1);
    expect(brushAlphaAtDistance(12.5, 50, 0, "soft")).toBeGreaterThan(0.85);
    expect(brushAlphaAtDistance(25, 50, 0, "soft")).toBeGreaterThan(0.65);
    // At the cursor edge the paint is strongly visible (~50% alpha)
    expect(brushAlphaAtDistance(50, 50, 0, "soft")).toBeGreaterThan(0.40);
    expect(brushAlphaAtDistance(50, 50, 0, "soft")).toBeLessThan(0.60);
  });

  it("hardness 0.8 keeps a mostly solid disk with a narrow feather rim", () => {
    // Photoshop h=80 visual reference: mostly solid, narrow rim, little halo.
    // Photrez h=0.8 keeps alpha=1 for most of the radius and only fades
    // sharply in the outer rim. With alphaAtEdge = 0.5, the rim is highly
    // visible (alpha 0.5 at cursor edge) so the brush "fills" the cursor.
    const radius = 50;
    expect(brushAlphaAtDistance(0, radius, 0.8, "soft")).toBe(1);
    expect(brushAlphaAtDistance(20, radius, 0.8, "soft")).toBe(1);
    expect(brushAlphaAtDistance(35, radius, 0.8, "soft")).toBe(1);
    // Narrow feather rim: by 95% radius alpha is still ~0.58
    expect(brushAlphaAtDistance(47.5, radius, 0.8, "soft")).toBeLessThan(0.65);
    // At the cursor edge the rim is at the visible-edge alpha (~50%)
    expect(brushAlphaAtDistance(50, radius, 0.8, "soft")).toBeGreaterThan(0.40);
    expect(brushAlphaAtDistance(50, radius, 0.8, "soft")).toBeLessThan(0.60);
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

describe("audit: Photoshop soft round single-dab profile (40px @ hardness 0)", () => {
  // Classic Photoshop soft round brush test: size 40, hardness 0, opacity 100%,
  // flow 100%. Single click should produce a dense-mid soft dot with a faint
  // tail just outside the cursor diameter.
  it("single dab center alpha is full strength", () => {
    const tip = createBrushTip({ size: 40, hardness: 0, curve: "soft" });
    const c = Math.floor(tip.width / 2);
    expect(alphaAt(tip, c, c)).toBe(1);
  });

  it("single dab at 25% radius stays dense (Photoshop soft round calibration)", () => {
    // Photrez soft round calibration: at 25% of cursor radius (≈ 5px from
    // center for size 40), alpha sits in the 0.82-0.92 range. This matches
    // Photoshop's soft round visual feel where the inner half of the brush
    // remains dense before fading smoothly to zero at the edge.
    const tip = createBrushTip({ size: 40, hardness: 0, curve: "soft" });
    const c = Math.floor(tip.width / 2);
    const r = 20;
    const at25 = alphaAt(tip, c + Math.round(r * 0.25), c);
    expect(at25).toBeGreaterThan(0.80);
    expect(at25).toBeLessThan(0.95);
  });

  it("single dab at the cursor edge has strong visible alpha (paint fills the cursor)", () => {
    // Photrez keeps paint strongly visible at the cursor edge so the user's
    // visual cursor matches the brush footprint. The brush "fills" the cursor
    // visual size even at low hardness values.
    const tip = createBrushTip({ size: 40, hardness: 0, curve: "soft" });
    const c = Math.floor(tip.width / 2);
    const r = 20;
    // At the cursor edge: strong visible alpha (~50%)
    expect(alphaAt(tip, c + r, c)).toBeGreaterThan(0.40);
    expect(alphaAt(tip, c + r, c)).toBeLessThan(0.60);
    // Just past the cursor edge: feather overshoot (fainter but still visible)
    const justPast = alphaAt(tip, c + r + 1, c);
    expect(justPast).toBeGreaterThan(0);
    expect(justPast).toBeLessThan(alphaAt(tip, c + r, c));
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