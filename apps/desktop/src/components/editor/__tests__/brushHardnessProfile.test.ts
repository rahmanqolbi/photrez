import { describe, expect, it, test } from "vitest";
import {
  BRUSH_CURSOR_ALPHA_CONTOUR,
  BRUSH_HARD_EDGE_THRESHOLD,
  MIN_RELIABLE_BRUSH_DIAMETER_PX,
  brushAlpha,
  getBrushCursorRadiusScale,
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
  "returns the calibration knot at hardness %f",
  (hardness, sigma, n) => {
    const parameters = getBrushProfileParameters(hardness);
    expect(parameters.sigma).toBeCloseTo(sigma, 12);
    expect(parameters.n).toBeCloseTo(n, 12);
  },
);

describe("reference-calibrated brush profile", () => {
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

  it("maps the paint cursor to the calibrated 20% alpha contour", () => {
    expect(BRUSH_CURSOR_ALPHA_CONTOUR).toBe(0.2);
    expect(getBrushCursorRadiusScale(0)).toBeCloseTo(
      0.661 * Math.pow(-Math.log(0.2), 1 / 2),
      12,
    );
    expect(getBrushCursorRadiusScale(0.5)).toBeCloseTo(
      0.935 * Math.pow(-Math.log(0.2), 1 / 8.23),
      12,
    );
  });

  it("clamps cursor hardness and restores nominal radius at the hard edge", () => {
    expect(getBrushCursorRadiusScale(-1)).toBe(getBrushCursorRadiusScale(0));
    expect(getBrushCursorRadiusScale(BRUSH_HARD_EDGE_THRESHOLD)).toBe(1);
    expect(getBrushCursorRadiusScale(2)).toBe(1);
  });

  it("grows the cursor contour monotonically with hardness", () => {
    let previous = getBrushCursorRadiusScale(0);
    for (let step = 1; step <= 100; step += 1) {
      const current = getBrushCursorRadiusScale(step / 100);
      expect(current).toBeGreaterThanOrEqual(previous);
      previous = current;
    }
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

  // ── Edge case tests ──

  it("clampHardness handles NaN and Infinity (non-finite → 0)", () => {
    expect(getBrushProfileParameters(NaN).sigma).toBeCloseTo(0.661, 12);
    expect(getBrushProfileParameters(Infinity).sigma).toBeCloseTo(0.661, 12);  // !Number.isFinite → 0
    expect(getBrushProfileParameters(-Infinity).sigma).toBeCloseTo(0.661, 12);
  });

  it("interpolates exactly at calibration knot points", () => {
    for (const [hardness, sigma, n] of calibrationKnots) {
      const params = getBrushProfileParameters(hardness);
      expect(params.sigma).toBeCloseTo(sigma, 12);
      expect(params.n).toBeCloseTo(n, 12);
    }
  });

  it("brushAlpha returns 0 for rNorm > 1 at hard edge (>=0.97)", () => {
    expect(brushAlpha(1.0001, 1)).toBe(0);
    expect(brushAlpha(1.0001, 0.97)).toBe(0);
  });

  it("brushAlpha returns 1 for rNorm <= 1 at hard edge", () => {
    expect(brushAlpha(1, 1)).toBe(1);
    expect(brushAlpha(0.5, 1)).toBe(1);
    expect(brushAlpha(0, 1)).toBe(1);
  });

  it("brushAlpha with negative rNorm treated as 0", () => {
    const a = brushAlpha(-1, 0.5);
    // rNorm = 0 → sigma*n = 0.935, Math.exp(0) = 1
    expect(a).toBe(1);
  });

  it("brushAlpha handles NaN hardness gracefully", () => {
    const a = brushAlpha(0.5, NaN);
    expect(Number.isFinite(a)).toBe(true);
    expect(a).toBeGreaterThan(0);
  });

  it("getBrushCursorRadiusScale handles NaN hardness", () => {
    const scale = getBrushCursorRadiusScale(NaN);
    expect(Number.isFinite(scale)).toBe(true);
    expect(scale).toBeGreaterThan(0);
  });

  it("getBrushProfileSupportNorm handles NaN hardness", () => {
    const norm = getBrushProfileSupportNorm(NaN);
    expect(Number.isFinite(norm)).toBe(true);
    expect(norm).toBeGreaterThanOrEqual(1);
  });

  it("getBrushProfileSupportNorm returns 1 at hard edge", () => {
    expect(getBrushProfileSupportNorm(0.97)).toBe(1);
    expect(getBrushProfileSupportNorm(1)).toBe(1);
  });

  it("brushAlpha monotonically decreases as rNorm increases", () => {
    let prev = brushAlpha(0, 0.3);
    for (let r = 0.1; r <= 3; r += 0.1) {
      const current = brushAlpha(r, 0.3);
      expect(current).toBeLessThanOrEqual(prev + 1e-10);
      prev = current;
    }
  });

  it("getBrushCursorRadiusScale increases monotonically with hardness", () => {
    let prev = getBrushCursorRadiusScale(0);
    for (let step = 1; step <= 100; step += 1) {
      const current = getBrushCursorRadiusScale(step / 100);
      expect(current).toBeGreaterThanOrEqual(prev - 1e-10);
      prev = current;
    }
  });
});
