import { describe, expect, it } from "vitest";
import {
  BLEND_MODE_OPTIONS,
  getCanvasCompositeOperation,
  isBlendMode,
} from "../blendModes";
import type { BlendMode } from "../types";

describe("blend mode parity registry", () => {
  it("only exposes blend modes covered by the engine BlendMode contract", () => {
    const values = BLEND_MODE_OPTIONS.map((option) => option.value);

    expect(values).toEqual(["normal", "multiply", "screen", "overlay"]);
  });

  it("maps every exposed mode to an explicit Canvas2D export operation", () => {
    const operations: Record<BlendMode, GlobalCompositeOperation> = {
      normal: "source-over",
      multiply: "multiply",
      screen: "screen",
      overlay: "overlay",
    };

    for (const option of BLEND_MODE_OPTIONS) {
      expect(getCanvasCompositeOperation(option.value)).toBe(operations[option.value]);
    }
  });

  it("rejects modes that are implemented in shaders but not approved for UI/export parity", () => {
    expect(isBlendMode("darken")).toBe(false);
    expect(isBlendMode("color-dodge")).toBe(false);
    expect(isBlendMode("difference")).toBe(false);
  });
});
