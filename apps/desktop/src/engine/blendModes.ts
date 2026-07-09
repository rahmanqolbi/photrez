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

// Single source of truth for the WebGL shader's integer blend-mode ids.
// Indexes MUST match the `blendColors()` cases in shaders.ts
// (0=normal, 1=multiply, 2=screen, 3=overlay). The Record<BlendMode, number>
// forces every union member to be present at compile time, so adding a new
// BlendMode without a shader id is a build error — this closes the parity gap
// where getBlendModeId could silently fall back to 0 (normal) for a UI mode
// that the Canvas export path still renders with its real blend.
export const BLEND_MODE_SHADER_IDS: Record<BlendMode, number> = {
  normal: 0,
  multiply: 1,
  screen: 2,
  overlay: 3,
};

export function blendModeToShaderId(mode: BlendMode): number {
  return BLEND_MODE_SHADER_IDS[mode] ?? 0;
}
