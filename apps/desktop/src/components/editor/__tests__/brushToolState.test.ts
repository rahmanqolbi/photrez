import { describe, expect, it } from "vitest";
import {
  clampPaintSize,
  clampPaintPercent,
  clampPaintSettings,
  getActivePaintToolSettings,
  adjustPaintSize,
  getPaintToolBlockReason,
  type PaintToolState,
} from "../brushToolState";

const state: PaintToolState = {
  brushSize: 20,
  brushHardness: 0.8,
  brushOpacity: 1,
  brushFlow: 1,
  brushSmoothing: 0,
  eraserSize: 32,
  eraserHardness: 1,
  eraserOpacity: 1,
  eraserFlow: 1,
  eraserSmoothing: 0,
};

describe("brushToolState", () => {
  it("clamps paint size to the MVP bounds", () => {
    expect(clampPaintSize(-4)).toBe(1);
    expect(clampPaintSize(24.4)).toBe(24);
    expect(clampPaintSize(900)).toBe(500);
  });

  it("clamps percentage settings to 0..1", () => {
    expect(clampPaintPercent(-1)).toBe(0);
    expect(clampPaintPercent(0.55)).toBe(0.55);
    expect(clampPaintPercent(2)).toBe(1);
  });

  it("selects separate settings for brush and eraser", () => {
    expect(getActivePaintToolSettings("brush", state)).toEqual({
      size: 20,
      hardness: 0.8,
      opacity: 1,
      flow: 1,
      smoothing: 0,
    });
    expect(getActivePaintToolSettings("eraser", state)).toEqual({
      size: 32,
      hardness: 1,
      opacity: 1,
      flow: 1,
      smoothing: 0,
    });
  });

  it("adjusts active size without changing inactive tool settings", () => {
    expect(adjustPaintSize("brush", state, -5)).toEqual({
      brushSize: 15,
      eraserSize: 32,
    });
    expect(adjustPaintSize("eraser", state, 10)).toEqual({
      brushSize: 20,
      eraserSize: 42,
    });
  });

  it("reports why painting is blocked", () => {
    expect(getPaintToolBlockReason(null, false)).toBe("No editable layer selected");
    expect(getPaintToolBlockReason({ locked: true, visible: true, lockTransparency: false }, false)).toBe("Layer locked");
    expect(getPaintToolBlockReason({ locked: false, visible: false, lockTransparency: false }, false)).toBe("Layer hidden");
    expect(getPaintToolBlockReason({ locked: false, visible: true, lockTransparency: true }, true)).toBe("Transparent pixels protected");
    expect(getPaintToolBlockReason({ locked: false, visible: true, lockTransparency: true }, false)).toBeNull();
  });
});
