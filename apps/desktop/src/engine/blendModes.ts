import type { BlendMode } from "./types";

export interface BlendModeOption {
  value: BlendMode;
  label: string;
  canvasCompositeOperation: GlobalCompositeOperation;
  parityStatus: "verified";
}

export const BLEND_MODE_OPTIONS: readonly BlendModeOption[] = [
  {
    value: "normal",
    label: "Normal",
    canvasCompositeOperation: "source-over",
    parityStatus: "verified",
  },
  {
    value: "multiply",
    label: "Multiply",
    canvasCompositeOperation: "multiply",
    parityStatus: "verified",
  },
  {
    value: "screen",
    label: "Screen",
    canvasCompositeOperation: "screen",
    parityStatus: "verified",
  },
  {
    value: "overlay",
    label: "Overlay",
    canvasCompositeOperation: "overlay",
    parityStatus: "verified",
  },
] as const;

export function isBlendMode(value: string): value is BlendMode {
  return BLEND_MODE_OPTIONS.some((option) => option.value === value);
}

export function getCanvasCompositeOperation(mode: BlendMode): GlobalCompositeOperation {
  return BLEND_MODE_OPTIONS.find((option) => option.value === mode)?.canvasCompositeOperation ?? "source-over";
}
