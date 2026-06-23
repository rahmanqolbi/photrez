import { describe, expect, it } from "vitest";
import { brushAlpha, getBrushProfileSupportNorm } from "../brushHardnessProfile";
import {
  clearBrushTipCache,
  getCachedBrushTip,
  rasterizeBrushTip,
} from "../brushTipMask";

describe("Float32 brush-tip rasterizer", () => {
  it.each([0.97, 1])(
    "uses fractional pixel coverage at the calibrated hard edge (hardness %s)",
    (hardness) => {
      const tip = rasterizeBrushTip(100, hardness);
      const center = tip.diameter / 2;
      const interior = tip.data[(center + 34) * tip.diameter + center + 34];
      const boundary = tip.data[(center + 35) * tip.diameter + center + 35];
      const exterior = tip.data[(center + 36) * tip.diameter + center + 36];

      expect(interior).toBe(1);
      expect(boundary).toBeGreaterThan(0);
      expect(boundary).toBeLessThan(1);
      expect(exterior).toBe(0);
    },
  );

  it("allocates exact calibrated support plus a two-pixel AA margin", () => {
    const brushDiameter = 100;
    const R_nominal = brushDiameter / 2;
    const expectedDiameter = Math.ceil(R_nominal * getBrushProfileSupportNorm(0)) * 2 + 2;

    const tip = rasterizeBrushTip(brushDiameter, 0);

    expect(tip.data).toBeInstanceOf(Float32Array);
    expect(tip.diameter).toBe(expectedDiameter);
    expect(tip.R_nominal).toBe(R_nominal);
    expect(tip.data).toHaveLength(expectedDiameter * expectedDiameter);
  });

  it("samples texels at pixel centers around diameter/2", () => {
    const tip = rasterizeBrushTip(100, 0);
    const center = tip.diameter / 2;
    const x = center;
    const y = center;
    const rNorm = Math.hypot(0.5, 0.5) / tip.R_nominal;

    expect(tip.data[y * tip.diameter + x]).toBeCloseTo(brushAlpha(rNorm, 0), 7);
  });

  it("retains float alpha beyond the nominal radius", () => {
    const tip = rasterizeBrushTip(100, 0);
    const center = tip.diameter / 2;
    const x = center + 70;
    const y = center;
    const rNorm = Math.hypot(70.5, 0.5) / tip.R_nominal;

    expect(tip.data[y * tip.diameter + x]).toBeCloseTo(brushAlpha(rNorm, 0), 7);
    expect(tip.data[y * tip.diameter + x]).toBeGreaterThan(0);
  });

  it("uses a simple one-pixel antialiased circle below 22px", () => {
    const tip = rasterizeBrushTip(21, 0);
    const expectedDiameter = Math.ceil(21 / 2) * 2 + 2;
    const center = tip.diameter / 2;

    expect(tip.diameter).toBe(expectedDiameter);
    expect(tip.data[center * tip.diameter + center]).toBe(1);
    expect(tip.data[center * tip.diameter + center + 10]).toBeGreaterThan(0);
    expect(tip.data[center * tip.diameter + center + 10]).toBeLessThan(1);
    expect(tip.data[center * tip.diameter + center + 12]).toBe(0);
  });

  it("invalidates cache only when diameter or hardness changes", () => {
    clearBrushTipCache();
    const first = getCachedBrushTip(100, 0.5);

    expect(getCachedBrushTip(100, 0.5)).toBe(first);
    expect(getCachedBrushTip(101, 0.5)).not.toBe(first);
    expect(getCachedBrushTip(100, 0.6)).not.toBe(first);
    expect(getCachedBrushTip(100.1, 0.5)).not.toBe(first);
    expect(getCachedBrushTip(100, 0.501)).not.toBe(first);
  });

  it("preserves a fractional nominal diameter", () => {
    const tip = rasterizeBrushTip(25.5, 0.5);

    expect(tip.R_nominal).toBe(12.75);
    expect(tip.diameter).toBe(
      Math.ceil(12.75 * getBrushProfileSupportNorm(0.5)) * 2 + 2,
    );
  });

});
