import { describe, expect, it } from "vitest";
import { MAX_HISTORY_DEPTH, MAX_PIXEL_BUDGET } from "../types";
import {
  estimateDirtyRegionBytes,
  estimatePaintHistoryBudget,
  estimateRgbaBytes,
  RGBA_BYTES_PER_PIXEL,
} from "../paintHistoryBudget";

describe("paint history memory budget estimates", () => {
  it("estimates raw RGBA layer bytes deterministically", () => {
    expect(estimateRgbaBytes(4096, 4096)).toBe(4096 * 4096 * RGBA_BYTES_PER_PIXEL);
    expect(estimateRgbaBytes(472, 709)).toBe(472 * 709 * RGBA_BYTES_PER_PIXEL);
  });

  it("shows full-layer paint snapshot history exceeding the default memory budget on large layers", () => {
    const estimate = estimatePaintHistoryBudget({
      layerWidth: 4096,
      layerHeight: 4096,
      dirtyRegion: { x: 128, y: 128, width: 256, height: 256 },
    });

    expect(estimate.historyDepth).toBe(MAX_HISTORY_DEPTH);
    expect(estimate.fullLayerSnapshotBytes).toBe(4096 * 4096 * RGBA_BYTES_PER_PIXEL * MAX_HISTORY_DEPTH);
    expect(estimate.fullLayerSnapshotBytes).toBeGreaterThan(MAX_PIXEL_BUDGET);
    expect(estimate.snapshotExceedsBudget).toBe(true);
  });

  it("quantifies the dirty-region undo/redo proposal against the same large-layer scenario", () => {
    const estimate = estimatePaintHistoryBudget({
      layerWidth: 4096,
      layerHeight: 4096,
      dirtyRegion: { x: 128, y: 128, width: 256, height: 256 },
    });

    expect(estimate.dirtyRegionPixelBytes).toBe(256 * 256 * RGBA_BYTES_PER_PIXEL);
    expect(estimate.dirtyRegionUndoRedoBytes).toBe(256 * 256 * RGBA_BYTES_PER_PIXEL * MAX_HISTORY_DEPTH * 2);
    expect(estimate.dirtyRegionExceedsBudget).toBe(false);
    expect(estimate.dirtyToSnapshotRatio).toBeCloseTo(0.0078125, 6);
  });

  it("clamps dirty regions to the layer bounds", () => {
    const bytes = estimateDirtyRegionBytes(
      { x: -10, y: -10, width: 30, height: 35 },
      100,
      100,
    );

    expect(bytes).toBe(20 * 25 * RGBA_BYTES_PER_PIXEL);
  });

  it("treats invalid dimensions as zero-cost estimates", () => {
    const estimate = estimatePaintHistoryBudget({
      layerWidth: Number.NaN,
      layerHeight: 4096,
      historyDepth: -1,
      dirtyRegion: { x: 0, y: 0, width: Number.POSITIVE_INFINITY, height: 10 },
    });

    expect(estimate.layerPixelBytes).toBe(0);
    expect(estimate.historyDepth).toBe(0);
    expect(estimate.fullLayerSnapshotBytes).toBe(0);
    expect(estimate.dirtyRegionUndoRedoBytes).toBe(0);
  });
});
