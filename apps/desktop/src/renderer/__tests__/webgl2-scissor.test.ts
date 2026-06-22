import { describe, expect, it } from "vitest";
import { projectDocumentScissor } from "../webgl2";
import { getCheckerboardColors } from "../checkerboard";

describe("projectDocumentScissor", () => {
  it("projects the document bounds into a canvas-space scissor rectangle", () => {
    const matrix = new Float32Array(16);
    matrix[0] = 0.005;
    matrix[5] = -0.005;
    matrix[10] = 1;
    matrix[12] = -0.25;
    matrix[13] = 0;
    matrix[15] = 1;

    expect(projectDocumentScissor(matrix, 100, 80, 800, 600)).toEqual({
      x: 300,
      y: 180,
      width: 200,
      height: 120,
    });
  });

  it("clamps projected document bounds to the canvas", () => {
    const matrix = new Float32Array(16);
    matrix[0] = 2;
    matrix[5] = -2;
    matrix[10] = 1;
    matrix[12] = -1.5;
    matrix[13] = 1.5;
    matrix[15] = 1;

    expect(projectDocumentScissor(matrix, 100, 100, 800, 600)).toEqual({
      x: 0,
      y: 0,
      width: 800,
      height: 600,
    });
  });
});

describe("getCheckerboardColors", () => {
  it("returns two distinct colors (each cell of the grid must be visually different)", () => {
    // Bug regression: if both checker colors are identical or near-identical the
    // pattern is invisible. Standard editors (established image editors) use a
    // perceptual delta of at least ~0.10 luminance.
    const { color1, color2 } = getCheckerboardColors();

    const deltaR = Math.abs(color1[0] - color2[0]);
    const deltaG = Math.abs(color1[1] - color2[1]);
    const deltaB = Math.abs(color1[2] - color2[2]);

    // Each channel must differ by at least 0.10 — well above the 0.02 delta
    // previously hardcoded in webgl2.ts:381-382 which produced an invisible grid.
    expect(deltaR).toBeGreaterThanOrEqual(0.10);
    expect(deltaG).toBeGreaterThanOrEqual(0.10);
    expect(deltaB).toBeGreaterThanOrEqual(0.10);
  });

  it("returns colors in [0..1] RGBA with opaque alpha", () => {
    const { color1, color2 } = getCheckerboardColors();

    for (const c of [color1, color2]) {
      expect(c).toHaveLength(4);
      for (let i = 0; i < 3; i++) {
        expect(c[i]).toBeGreaterThanOrEqual(0);
        expect(c[i]).toBeLessThanOrEqual(1);
      }
      expect(c[3]).toBe(1.0);
    }
  });

  it("uses light tones that stand out against a dark midnight background", () => {
    // Bug regression: the doc backgroundColor is [0.05, 0.06, 0.07, 1.0]
    // (midnight). Checker cells must have a luminance delta of at least 0.15
    // from the background so the grid is visible at first glance.
    const { color1, color2 } = getCheckerboardColors();
    const bg = [0.05, 0.06, 0.07];

    for (const c of [color1, color2]) {
      const luma = 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
      const bgLuma = 0.2126 * bg[0] + 0.7152 * bg[1] + 0.0722 * bg[2];
      expect(Math.abs(luma - bgLuma)).toBeGreaterThanOrEqual(0.15);
    }
  });
});
