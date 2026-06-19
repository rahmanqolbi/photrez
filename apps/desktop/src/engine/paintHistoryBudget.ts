import { MAX_HISTORY_DEPTH, MAX_PIXEL_BUDGET, type Rect } from "./types";

export const RGBA_BYTES_PER_PIXEL = 4;

export interface PaintHistoryBudgetInput {
  layerWidth: number;
  layerHeight: number;
  historyDepth?: number;
  dirtyRegion?: Rect;
  memoryBudgetBytes?: number;
}

export interface PaintHistoryBudgetEstimate {
  layerPixelBytes: number;
  historyDepth: number;
  fullLayerSnapshotBytes: number;
  dirtyRegionPixelBytes: number;
  dirtyRegionUndoRedoBytes: number;
  dirtyToSnapshotRatio: number;
  snapshotExceedsBudget: boolean;
  dirtyRegionExceedsBudget: boolean;
}

function finiteNonNegativeInteger(value: number): number {
  if (!Number.isFinite(value) || value <= 0) {
    return 0;
  }
  return Math.floor(value);
}

export function estimateRgbaBytes(width: number, height: number): number {
  return finiteNonNegativeInteger(width) * finiteNonNegativeInteger(height) * RGBA_BYTES_PER_PIXEL;
}

export function estimateDirtyRegionBytes(region: Rect, layerWidth: number, layerHeight: number): number {
  const x1 = Math.max(0, Math.floor(region.x));
  const y1 = Math.max(0, Math.floor(region.y));
  const x2 = Math.min(finiteNonNegativeInteger(layerWidth), Math.ceil(region.x + region.width));
  const y2 = Math.min(finiteNonNegativeInteger(layerHeight), Math.ceil(region.y + region.height));
  return estimateRgbaBytes(Math.max(0, x2 - x1), Math.max(0, y2 - y1));
}

export function estimatePaintHistoryBudget(input: PaintHistoryBudgetInput): PaintHistoryBudgetEstimate {
  const historyDepth = finiteNonNegativeInteger(input.historyDepth ?? MAX_HISTORY_DEPTH);
  const memoryBudgetBytes = finiteNonNegativeInteger(input.memoryBudgetBytes ?? MAX_PIXEL_BUDGET);
  const layerPixelBytes = estimateRgbaBytes(input.layerWidth, input.layerHeight);
  const dirtyRegionPixelBytes = input.dirtyRegion
    ? estimateDirtyRegionBytes(input.dirtyRegion, input.layerWidth, input.layerHeight)
    : layerPixelBytes;
  const fullLayerSnapshotBytes = layerPixelBytes * historyDepth;
  const dirtyRegionUndoRedoBytes = dirtyRegionPixelBytes * historyDepth * 2;

  return {
    layerPixelBytes,
    historyDepth,
    fullLayerSnapshotBytes,
    dirtyRegionPixelBytes,
    dirtyRegionUndoRedoBytes,
    dirtyToSnapshotRatio: fullLayerSnapshotBytes === 0 ? 0 : dirtyRegionUndoRedoBytes / fullLayerSnapshotBytes,
    snapshotExceedsBudget: fullLayerSnapshotBytes > memoryBudgetBytes,
    dirtyRegionExceedsBudget: dirtyRegionUndoRedoBytes > memoryBudgetBytes,
  };
}
