import { describe, expect, it } from "vitest";
import {
  applyBasicAdjustmentToColor,
  applyBasicAdjustmentToPixels,
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
