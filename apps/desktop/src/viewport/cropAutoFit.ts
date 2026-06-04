import type { CropRect } from "./cropGeometry";

export function fitCropRectToAspect(rect: CropRect, aspect: { w: number; h: number }): CropRect {
  const ratio = aspect.w / aspect.h;
  const currentRatio = rect.w / rect.h;
  if (Math.abs(currentRatio - ratio) > 0.001) {
    const newH = rect.w / ratio;
    return {
      x: rect.x,
      y: rect.y - (newH - rect.h) / 2,
      w: rect.w,
      h: newH
    };
  }
  return rect;
}
