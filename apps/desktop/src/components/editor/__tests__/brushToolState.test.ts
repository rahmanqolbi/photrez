import { describe, expect, it } from "vitest";
import {
  clampPaintSize,
  clampPaintPercent,
  clampPaintSettings,
  clampPaintSmoothing,
  getActivePaintToolSettings,
  adjustPaintSize,
  adjustPaintHardness,
  getPaintToolBlockReason,
  resolveEraserFill,
  paintSizeStep,
  sizeSliderToPaintSize,
  paintSizeToSizeSlider,
  BRUSH_PRESETS,
  applyPaintPreset,
  MIN_PAINT_SIZE,
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

  it("fills Background layer erase with the background swatch (not transparent)", () => {
    const bg = resolveEraserFill({ isBackground: true }, true, "#224466");
    expect(bg.isEraser).toBe(false);
    expect(bg.color).toBe("#224466");
  });

  it("keeps erase-to-transparent for non-background layers", () => {
    const normal = resolveEraserFill({ isBackground: false }, true, "#224466");
    expect(normal.isEraser).toBe(true);
    expect(normal.color).toBe("rgba(0,0,0,1)");
  });

  it("keeps erase-to-transparent when layer is undefined", () => {
    const none = resolveEraserFill(undefined, true, "#224466");
    expect(none.isEraser).toBe(true);
    expect(none.color).toBe("rgba(0,0,0,1)");
  });

  it("passes brush strokes through untouched", () => {
    const brush = resolveEraserFill({ isBackground: true }, false, "#224466");
    expect(brush.isEraser).toBe(false);
    expect(brush.color).toBe("rgba(0,0,0,1)");
  });
});

describe("paintSizeStep (proportional brush/eraser size step)", () => {
  it("scales with current size (~10%)", () => {
    expect(paintSizeStep(20)).toBe(2);
    expect(paintSizeStep(100)).toBe(10);
    expect(paintSizeStep(300)).toBe(30);
  });

  it("never drops below 1px", () => {
    expect(paintSizeStep(5)).toBe(1);
    expect(paintSizeStep(1)).toBe(1);
    expect(paintSizeStep(0)).toBe(1);
  });

  it("rounds to the nearest pixel", () => {
    expect(paintSizeStep(55)).toBe(6); // 5.5 -> 6
    expect(paintSizeStep(45)).toBe(5); // 4.5 -> 5 (round half up)
  });
});

describe("brush presets and clamping", () => {
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

  // ── Edge case tests ──

  it("clampPaintPercent handles NaN and Infinity", () => {
    expect(clampPaintPercent(NaN)).toBe(1);
    expect(clampPaintPercent(Infinity)).toBe(1);
    expect(clampPaintPercent(-Infinity)).toBe(1);  // !Number.isFinite → 1
  });

  it("clampPaintSize handles NaN and Infinity", () => {
    expect(clampPaintSize(NaN)).toBe(MIN_PAINT_SIZE);
    expect(clampPaintSize(Infinity)).toBe(MIN_PAINT_SIZE);  // !Number.isFinite → MIN
    expect(clampPaintSize(-Infinity)).toBe(MIN_PAINT_SIZE);
  });

  it("clampPaintSmoothing clamps to 0..100", () => {
    expect(clampPaintSmoothing(-10)).toBe(0);
    expect(clampPaintSmoothing(50)).toBe(50);
    expect(clampPaintSmoothing(150)).toBe(100);
  });

  it("clampPaintSmoothing handles NaN and Infinity", () => {
    expect(clampPaintSmoothing(NaN)).toBe(0);
    expect(clampPaintSmoothing(Infinity)).toBe(0);  // !Number.isFinite → 0
    expect(clampPaintSmoothing(-Infinity)).toBe(0);
  });

  it("clampPaintSettings clamps all fields", () => {
    const clamped = clampPaintSettings({
      size: 9999,
      hardness: -1,
      opacity: 2,
      flow: NaN,
      smoothing: Infinity,
    });
    expect(clamped.size).toBe(MAX_PAINT_SIZE);
    expect(clamped.hardness).toBe(0);
    expect(clamped.opacity).toBe(1);
    expect(clamped.flow).toBe(1);  // NaN → 1
    expect(clamped.smoothing).toBe(0);  // Infinity not finite → 0
  });

  it("adjustPaintHardness increments brush hardness without affecting eraser", () => {
    const result = adjustPaintHardness("brush", state, 0.1);
    expect(result.brushHardness).toBeCloseTo(0.9, 6);
    expect(result.eraserHardness).toBe(1);
  });

  it("adjustPaintHardness increments eraser hardness without affecting brush", () => {
    const result = adjustPaintHardness("eraser", state, -0.2);
    expect(result.eraserHardness).toBeCloseTo(0.8, 6);
    expect(result.brushHardness).toBe(0.8);
  });

  it("adjustPaintHardness clamps hardness to 0..1", () => {
    const result = adjustPaintHardness("brush", state, -5);
    expect(result.brushHardness).toBe(0);
    const result2 = adjustPaintHardness("brush", state, 5);
    expect(result2.brushHardness).toBe(1);
  });

  it("clampPaintSettings rounds brush size to nearest integer", () => {
    const clamped = clampPaintSettings({
      size: 25.7, hardness: 1, opacity: 1, flow: 1, smoothing: 0,
    });
    expect(clamped.size).toBe(26);
  });

  it("clampPaintSettings rounds smoothing to nearest integer", () => {
    const clamped = clampPaintSettings({
      size: 20, hardness: 1, opacity: 1, flow: 1, smoothing: 3.3,
    });
    expect(clamped.smoothing).toBe(3);
  });
});
