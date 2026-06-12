import type { CropRect } from "./cropGeometry";

export function fitCropRectToAspect(
  aspect: { w: number; h: number },
  docWidth: number,
  docHeight: number,
  rotation: number
): CropRect {
  const cw = docWidth;
  const ch = docHeight;
  const cx = cw / 2;
  const cy = ch / 2;
  const ratio = aspect.w / aspect.h;

  if (Math.abs(rotation % 180) < 0.01) {
    let w = cw;
    let h = ch;

    if (cw / ch > ratio) {
      w = ch * ratio;
    } else {
      h = cw / ratio;
    }

    return { x: (cw - w) / 2, y: (ch - h) / 2, w, h };
  }

  const rad = (Math.abs(rotation) * Math.PI) / 180;
  const cos = Math.cos(rad);
  const sin = Math.sin(rad);

  const factorX = Math.abs(cos - sin / ratio);
  const factorY = Math.abs(sin + cos / ratio);

  const hwMaxX = cw / 2 / factorX;
  const hwMaxY = ch / 2 / factorY;

  const hw = Math.min(hwMaxX, hwMaxY);
  const w = hw * 2;
  const h = w / ratio;

  return {
    x: cx - w / 2,
    y: cy - h / 2,
    w: w,
    h: h
  };
}
