export type PaintTool = "brush" | "eraser";

export interface PaintToolSettings {
  size: number;
  hardness: number;
  opacity: number;
  flow: number;
  smoothing: number;
}

export interface PaintToolState {
  brushSize: number;
  brushHardness: number;
  brushOpacity: number;
  brushFlow: number;
  brushSmoothing: number;
  eraserSize: number;
  eraserHardness: number;
  eraserOpacity: number;
  eraserFlow: number;
  eraserSmoothing: number;
}

export interface PaintEditableLayer {
  locked?: boolean;
  visible?: boolean;
  lockTransparency?: boolean;
}

export const MIN_PAINT_SIZE = 1;
export const MAX_PAINT_SIZE = 2000;
export const PAINT_SIZE_STEP = 5;
export const PAINT_SIZE_STEP_HARDNESS = 0.1;

export const MIN_SMOOTHING = 0;
export const MAX_SMOOTHING = 100;

export const SLIDER_SIZE_MAX = 100;
export const SLIDER_SIZE_THRESHOLD = 75;
export const MAX_LINEAR_SIZE = 500;

export function sizeSliderToPaintSize(sliderValue: number): number {
  const clamped = Math.max(0, Math.min(SLIDER_SIZE_MAX, sliderValue));
  if (clamped <= SLIDER_SIZE_THRESHOLD) {
    const t = clamped / SLIDER_SIZE_THRESHOLD;
    return Math.round(MIN_PAINT_SIZE + (MAX_LINEAR_SIZE - MIN_PAINT_SIZE) * t);
  }
  const t = (clamped - SLIDER_SIZE_THRESHOLD) / (SLIDER_SIZE_MAX - SLIDER_SIZE_THRESHOLD);
  const eased = t * t;
  return Math.round(MAX_LINEAR_SIZE + (MAX_PAINT_SIZE - MAX_LINEAR_SIZE) * eased);
}

export function paintSizeToSizeSlider(size: number): number {
  const clamped = Math.max(MIN_PAINT_SIZE, Math.min(MAX_PAINT_SIZE, size));
  if (clamped <= MAX_LINEAR_SIZE) {
    return Math.round(((clamped - MIN_PAINT_SIZE) / (MAX_LINEAR_SIZE - MIN_PAINT_SIZE)) * SLIDER_SIZE_THRESHOLD);
  }
  const t = Math.sqrt((clamped - MAX_LINEAR_SIZE) / (MAX_PAINT_SIZE - MAX_LINEAR_SIZE));
  return Math.round(SLIDER_SIZE_THRESHOLD + t * (SLIDER_SIZE_MAX - SLIDER_SIZE_THRESHOLD));
}

export function clampPaintSize(value: number): number {
  if (!Number.isFinite(value)) return MIN_PAINT_SIZE;
  return Math.max(MIN_PAINT_SIZE, Math.min(MAX_PAINT_SIZE, Math.round(value)));
}

export function clampPaintPercent(value: number): number {
  if (!Number.isFinite(value)) return 1;
  return Math.max(0, Math.min(1, value));
}

export function clampPaintSmoothing(value: number): number {
  if (!Number.isFinite(value)) return MIN_SMOOTHING;
  return Math.max(MIN_SMOOTHING, Math.min(MAX_SMOOTHING, Math.round(value)));
}

export function clampPaintSettings(settings: PaintToolSettings): PaintToolSettings {
  return {
    size: clampPaintSize(settings.size),
    hardness: clampPaintPercent(settings.hardness),
    opacity: clampPaintPercent(settings.opacity),
    flow: clampPaintPercent(settings.flow),
    smoothing: clampPaintSmoothing(settings.smoothing),
  };
}

export function getActivePaintToolSettings(tool: string, state: PaintToolState): PaintToolSettings {
  if (tool === "eraser") {
    return clampPaintSettings({
      size: state.eraserSize,
      hardness: state.eraserHardness,
      opacity: state.eraserOpacity,
      flow: state.eraserFlow,
      smoothing: state.eraserSmoothing,
    });
  }

  return clampPaintSettings({
    size: state.brushSize,
    hardness: state.brushHardness,
    opacity: state.brushOpacity,
    flow: state.brushFlow,
    smoothing: state.brushSmoothing,
  });
}

export function adjustPaintSize(
  tool: string,
  state: PaintToolState,
  delta: number,
): Pick<PaintToolState, "brushSize" | "eraserSize"> {
  return {
    brushSize: tool === "brush" ? clampPaintSize(state.brushSize + delta) : state.brushSize,
    eraserSize: tool === "eraser" ? clampPaintSize(state.eraserSize + delta) : state.eraserSize,
  };
}

export function adjustPaintHardness(
  tool: string,
  state: PaintToolState,
  delta: number,
): Pick<PaintToolState, "brushHardness" | "eraserHardness"> {
  return {
    brushHardness: tool === "brush" ? clampPaintPercent(state.brushHardness + delta) : state.brushHardness,
    eraserHardness: tool === "eraser" ? clampPaintPercent(state.eraserHardness + delta) : state.eraserHardness,
  };
}

export interface BrushPreset {
  id: string;
  name: string;
  size: number;
  hardness: number;
  opacity: number;
  flow: number;
  smoothing: number;
  tool: "brush" | "eraser" | "both";
}

export const BRUSH_PRESETS: BrushPreset[] = [
  { id: "hard-round",     name: "Hard Round",   size: 20,  hardness: 1.0, opacity: 1.0, flow: 1.0, smoothing: 0,  tool: "both" },
  { id: "soft-round",     name: "Soft Round",   size: 40,  hardness: 0.15, opacity: 1.0, flow: 1.0, smoothing: 0,  tool: "both" },
  { id: "detail",         name: "Detail",        size: 5,   hardness: 0.8, opacity: 1.0, flow: 1.0, smoothing: 10, tool: "both" },
  { id: "large-soft",     name: "Large Soft",    size: 100, hardness: 0.0, opacity: 0.85, flow: 0.65, smoothing: 0,  tool: "both" },
  { id: "hard-eraser",    name: "Hard Eraser",   size: 30,  hardness: 1.0, opacity: 1.0, flow: 1.0, smoothing: 0,  tool: "eraser" },
  { id: "soft-eraser",    name: "Soft Eraser",   size: 50,  hardness: 0.0, opacity: 1.0, flow: 0.55, smoothing: 0,  tool: "eraser" },
];

export function applyPaintPreset(
  preset: BrushPreset,
  targetTool: PaintTool,
  state: PaintToolState,
): Partial<PaintToolState> {
  const result: Partial<PaintToolState> = {};
  const isBrush = targetTool === "brush";
  result[isBrush ? "brushSize" : "eraserSize"] = preset.size;
  result[isBrush ? "brushHardness" : "eraserHardness"] = preset.hardness;
  result[isBrush ? "brushOpacity" : "eraserOpacity"] = preset.opacity;
  result[isBrush ? "brushFlow" : "eraserFlow"] = preset.flow;
  result[isBrush ? "brushSmoothing" : "eraserSmoothing"] = preset.smoothing;
  return result;
}

export function getPaintToolBlockReason(
  layer: PaintEditableLayer | null | undefined,
  isEraser: boolean,
): string | null {
  if (!layer) return "No editable layer selected";
  if (layer.locked) return "Layer locked";
  if (!layer.visible) return "Layer hidden";
  if (isEraser && layer.lockTransparency) return "Transparent pixels protected";
  return null;
}
