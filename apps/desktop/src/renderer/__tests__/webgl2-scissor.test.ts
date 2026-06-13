import { describe, expect, it } from "vitest";
import { projectDocumentScissor } from "../webgl2";

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
