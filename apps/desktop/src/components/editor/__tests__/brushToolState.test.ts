import { describe, expect, it } from "vitest";
import {
  clampPaintSize,
  clampPaintPercent,
  clampPaintSettings,
  getActivePaintToolSettings,
  adjustPaintSize,
  getPaintToolBlockReason,
  sizeSliderToPaintSize,
  paintSizeToSizeSlider,
  BRUSH_PRESETS,
  applyPaintPreset,
  MAX_PAINT_SIZE,
  MAX_LINEAR_SIZE,
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
    expect(clampPaintSize(900)).toBe(900);
    expect(clampPaintSize(3000)).toBe(MAX_PAINT_SIZE);
  });

  it("sizeSliderToPaintSize mapping is correct", () => {
    expect(sizeSliderToPaintSize(0)).toBe(1);
    expect(sizeSliderToPaintSize(75)).toBe(MAX_LINEAR_SIZE);
    expect(sizeSliderToPaintSize(100)).toBe(MAX_PAINT_SIZE);
  });

  it("sizeSliderToPaintSize returns linear growth in 0-75 range", () => {
    expect(sizeSliderToPaintSize(0)).toBe(1);
    expect(sizeSliderToPaintSize(37)).toBeCloseTo(250, -1);
    expect(sizeSliderToPaintSize(75)).toBe(MAX_LINEAR_SIZE);
  });

  it("sizeSliderToPaintSize returns accelerated growth in 75-100 range", () => {
    // At slider 75+12.5=87.5, the eased value should be between 500 and 2000
    const at87 = sizeSliderToPaintSize(87);
    expect(at87).toBeGreaterThan(MAX_LINEAR_SIZE);
    expect(at87).toBeLessThan(MAX_PAINT_SIZE);
    expect(sizeSliderToPaintSize(100)).toBe(MAX_PAINT_SIZE);
  });

  it("sizeSliderToPaintSize clamps out-of-range values", () => {
    expect(sizeSliderToPaintSize(-10)).toBe(1);
    expect(sizeSliderToPaintSize(150)).toBe(MAX_PAINT_SIZE);
  });

  it("paintSizeToSizeSlider inverts sizeSliderToPaintSize", () => {
    for (const slider of [0, 10, 25, 50, 75, 80, 90, 100]) {
      const size = sizeSliderToPaintSize(slider);
      const back = paintSizeToSizeSlider(size);
      expect(back).toBe(slider);
    }
  });

  it("paintSizeToSizeSlider clamps out-of-range values", () => {
    expect(paintSizeToSizeSlider(-5)).toBe(0);
    expect(paintSizeToSizeSlider(9999)).toBe(100);
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

  it("uses editor-like preset defaults for soft round versus large soft", () => {
    const softRound = BRUSH_PRESETS.find((preset) => preset.id === "soft-round");
    const largeSoft = BRUSH_PRESETS.find((preset) => preset.id === "large-soft");

    expect(softRound).toMatchObject({
      hardness: 0.15,
      opacity: 1,
      flow: 1,
      tool: "both",
    });
    expect(largeSoft).toMatchObject({
      hardness: 0,
      opacity: 0.85,
      flow: 0.65,
      tool: "both",
    });
  });

  it("applies the soft round preset as a fuller main brush", () => {
    const softRound = BRUSH_PRESETS.find((preset) => preset.id === "soft-round");
    expect(softRound).toBeDefined();

    const changes = applyPaintPreset(softRound!, "brush", state);

    expect(changes).toMatchObject({
      brushHardness: 0.15,
      brushOpacity: 1,
      brushFlow: 1,
    });
  });

  it("uses an MVP-ready soft eraser preset", () => {
    const softEraser = BRUSH_PRESETS.find((preset) => preset.id === "soft-eraser");

    expect(softEraser).toMatchObject({
      hardness: 0.15,
      opacity: 1,
      flow: 0.85,
      tool: "eraser",
    });
  });

  it("applies the soft eraser preset to eraser settings", () => {
    const softEraser = BRUSH_PRESETS.find((preset) => preset.id === "soft-eraser");
    expect(softEraser).toBeDefined();

    const changes = applyPaintPreset(softEraser!, "eraser", state);

    expect(changes).toMatchObject({
      eraserHardness: 0.15,
      eraserOpacity: 1,
      eraserFlow: 0.85,
    });
  });
});
