import { describe, expect, it, test } from "vitest";
import {
  BRUSH_HARD_EDGE_THRESHOLD,
  MIN_RELIABLE_BRUSH_DIAMETER_PX,
  brushAlpha,
  getBrushProfileParameters,
  getBrushProfileSupportNorm,
} from "../brushHardnessProfile";

const calibrationKnots = [
  [0, 0.661, 2.0],
  [0.1, 0.738, 2.68],
  [0.25, 0.83, 4.07],
  [0.5, 0.935, 8.23],
  [0.75, 0.99, 20.22],
  [0.9, 1.004, 51.2],
  [1, 1.006, 60.0],
] as const;

test.each(calibrationKnots)(
  "returns the Photoshop knot at hardness %f",
  (hardness, sigma, n) => {
    const parameters = getBrushProfileParameters(hardness);
    expect(parameters.sigma).toBeCloseTo(sigma, 12);
    expect(parameters.n).toBeCloseTo(n, 12);
  },
);

describe("Photoshop-calibrated brush profile", () => {
  it("interpolates sigma and n monotonically between calibration knots", () => {
    let previous = getBrushProfileParameters(0);
    for (let step = 1; step <= 100; step += 1) {
      const current = getBrushProfileParameters(step / 100);
      expect(current.sigma).toBeGreaterThanOrEqual(previous.sigma);
      expect(current.n).toBeGreaterThanOrEqual(previous.n);
      previous = current;
    }
  });

  it("matches the supplied super-Gaussian equation below the hard threshold", () => {
    expect(brushAlpha(0.5, 0)).toBeCloseTo(
      Math.exp(-Math.pow(0.5 / 0.661, 2)),
      12,
    );
    expect(brushAlpha(1, 0.5)).toBeCloseTo(
      Math.exp(-Math.pow(1 / 0.935, 8.23)),
      12,
    );
  });

  it("uses the supplied literal circle branch at and above 97%", () => {
    expect(BRUSH_HARD_EDGE_THRESHOLD).toBe(0.97);
    expect(brushAlpha(1, BRUSH_HARD_EDGE_THRESHOLD)).toBe(1);
    expect(brushAlpha(1.000001, BRUSH_HARD_EDGE_THRESHOLD)).toBe(0);
  });

  it("retains every alpha that can survive 8-bit rounding", () => {
    const support = getBrushProfileSupportNorm(0);
    expect(brushAlpha(support, 0)).toBeCloseTo(0.5 / 255, 12);
    expect(brushAlpha(support + 0.01, 0)).toBeLessThan(0.5 / 255);
  });

  it("clamps hardness at the calibrated endpoints", () => {
    expect(getBrushProfileParameters(-1)).toEqual(getBrushProfileParameters(0));
    expect(getBrushProfileParameters(2)).toEqual(getBrushProfileParameters(1));
  });

  it("declares the measured small-tip reliability boundary", () => {
    expect(MIN_RELIABLE_BRUSH_DIAMETER_PX).toBe(22);
  });
});
