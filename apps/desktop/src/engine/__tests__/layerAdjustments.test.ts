import { describe, expect, it } from "vitest";
import { applyBasicAdjustmentToPixels, normalizeBasicAdjustment } from "../layerAdjustments";

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

    expect(Array.from(adjusted)).toEqual([36, 46, 56, 128]);
  });

  it("can desaturate a color toward luminance", () => {
    const adjusted = applyBasicAdjustmentToPixels(
      new Uint8ClampedArray([255, 0, 0, 255]),
      { brightness: 0, contrast: 0, saturation: -100 },
    );

    expect(Array.from(adjusted)).toEqual([54, 54, 54, 255]);
  });
});
