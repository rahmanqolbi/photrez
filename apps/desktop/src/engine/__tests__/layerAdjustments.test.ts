import { describe, expect, it } from "vitest";
import {
  applyBasicAdjustmentToColor,
  applyBasicAdjustmentToPixels,
  inverseBasicAdjustmentToColor,
  normalizeBasicAdjustment,
} from "../layerAdjustments";

describe("basic layer adjustments", () => {
  it("clamps adjustment inputs to the supported range", () => {
    expect(normalizeBasicAdjustment({ brightness: 150, contrast: -140, saturation: 25 })).toEqual({
      brightness: 100,
      contrast: -100,
      saturation: 25,
    });
  });

  it("applies brightness while preserving alpha", () => {
    const adjusted = applyBasicAdjustmentToPixels(
      new Uint8ClampedArray([10, 20, 30, 128]),
      { brightness: 10, contrast: 0, saturation: 0 },
    );

    // Nonlinear curve: lifts shadows more, preserves highlights.
    // At t=0.1: pixel 10 → 10 + (255-10)*0.05 = 22, etc.
    expect(Array.from(adjusted)).toEqual([22, 32, 41, 128]);
  });

  it("can desaturate a color toward luminance", () => {
    const adjusted = applyBasicAdjustmentToPixels(
      new Uint8ClampedArray([255, 0, 0, 255]),
      { brightness: 0, contrast: 0, saturation: -100 },
    );

    expect(Array.from(adjusted)).toEqual([54, 54, 54, 255]);
  });
});

describe("applyBasicAdjustmentToColor", () => {
  it("returns the same color when adjustment is identity", () => {
    expect(applyBasicAdjustmentToColor("#ff0000", { brightness: 0, contrast: 0, saturation: 0 }))
      .toBe("#ff0000");
  });
  it("brightens a mid red toward white", () => {
    const out = applyBasicAdjustmentToColor("#800000", { brightness: 100, contrast: 0, saturation: 0 });
    expect(out).not.toBe("#800000");
  });
});

describe("inverseBasicAdjustmentToColor (WYSIWYG brush)", () => {
  // The shader maps layer-space → display-space; only colors inside that
  // reachable range can be reproduced exactly. Compare with a small tolerance
  // so edge (near-gamut-limit) colors aren't brittle to 8-bit rounding.
  const toInts = (h: string) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
  const close = (a: string, b: string, tol = 2) => {
    const x = toInts(a), y = toInts(b);
    return x.every((v, i) => Math.abs(v - y[i]) <= tol);
  };

  it("returns the same color when adjustment is identity", () => {
    expect(inverseBasicAdjustmentToColor("#ff0000", { brightness: 0, contrast: 0, saturation: 0 }))
      .toBe("#ff0000");
  });

  it("stores the inverse so the shader reproduces the picked color exactly (in gamut)", () => {
    const adj = { brightness: 40, contrast: 30, saturation: -50 };
    const picked = "#abcdef"; // mid color, inside the adjustment's reachable range
    const stored = inverseBasicAdjustmentToColor(picked, adj);
    // Committing `stored` then re-applying the adjustment shows `picked` again.
    expect(applyBasicAdjustmentToColor(stored, adj)).toBe(picked);
  });

  it("round-trips within gamut for contrast/saturation adjustments", () => {
    const cases: Array<[string, { brightness: number; contrast: number; saturation: number }]> = [
      ["#7f7f7f", { brightness: 0, contrast: 60, saturation: 0 }],
      ["#66ccaa", { brightness: 0, contrast: 0, saturation: -40 }],
      ["#224466", { brightness: 0, contrast: -40, saturation: 50 }],
      ["#99aabb", { brightness: 20, contrast: 10, saturation: 0 }],
    ];
    for (const [color, adj] of cases) {
      const stored = inverseBasicAdjustmentToColor(color, adj);
      expect(close(applyBasicAdjustmentToColor(stored, adj), color)).toBe(true);
    }
  });
});
