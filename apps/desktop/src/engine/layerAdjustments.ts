export type BasicAdjustment = {
  brightness: number;
  contrast: number;
  saturation: number;
};

const clampChannel = (value: number): number => {
  if (value < 0) return 0;
  if (value > 255) return 255;
  // rounds to the nearest integer, so an explicit round is redundant.
  return value;
};

const clamp01 = (value: number): number => {
  if (value < 0) return 0;
  if (value > 1) return 1;
  return value;
};

const clampPercent = (value: number): number => {
  if (value < -100) return -100;
  if (value > 100) return 100;
  return value;
};

export function normalizeBasicAdjustment(adjustment: BasicAdjustment): BasicAdjustment {
  return {
    brightness: clampPercent(adjustment.brightness),
    contrast: clampPercent(adjustment.contrast),
    saturation: clampPercent(adjustment.saturation),
  };
}

/**
 * Pure per-channel RGB adjustment in [0,1] straight-alpha space. Mirrors
 * `renderer/shaders.ts::applyAdjustment` so the CPU bake and GPU preview agree.
 */
export function applyAdjustmentToRgb(
  r: number,
  g: number,
  b: number,
  adj: BasicAdjustment,
): [number, number, number] {
  const contrastFactor = (259 * (adj.contrast + 255)) / (255 * (259 - adj.contrast));
  let cr = contrastFactor * (r - 0.5) + 0.5;
  let cg = contrastFactor * (g - 0.5) + 0.5;
  let cb = contrastFactor * (b - 0.5) + 0.5;

  const t = adj.brightness / 100;
  if (t >= 0) {
    cr = cr + (1 - cr) * t * 0.5;
    cg = cg + (1 - cg) * t * 0.5;
    cb = cb + (1 - cb) * t * 0.5;
  } else {
    const f = -t;
    cr = cr - cr * f * 0.5;
    cg = cg - cg * f * 0.5;
    cb = cb - cb * f * 0.5;
  }

  const luminance = cr * 0.2126 + cg * 0.7152 + cb * 0.0722;
  const satFactor = 1 + adj.saturation / 100;
  cr = luminance + (cr - luminance) * satFactor;
  cg = luminance + (cg - luminance) * satFactor;
  cb = luminance + (cb - luminance) * satFactor;

  return [clamp01(cr), clamp01(cg), clamp01(cb)];
}

const hexToRgb = (hex: string): [number, number, number] => {
  let h = hex.replace("#", "");
  if (h.length === 3) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2];
  const num = parseInt(h, 16);
  return [((num >> 16) & 255) / 255, ((num >> 8) & 255) / 255, (num & 255) / 255];
};

const rgbToHex = (r: number, g: number, b: number): string => {
  const toHex = (v: number): string =>
    Math.round(clamp01(v) * 255)
      .toString(16)
      .padStart(2, "0");
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
};

/** Maps a hex color string (#rgb / #rrggbb) through the same math as the pixel pass. */
export function applyBasicAdjustmentToColor(color: string, adj: BasicAdjustment): string {
  if (adj.brightness === 0 && adj.contrast === 0 && adj.saturation === 0) return color;
  const [r, g, b] = hexToRgb(color);
  const [r2, g2, b2] = applyAdjustmentToRgb(r, g, b, normalizeBasicAdjustment(adj));
  return rgbToHex(r2, g2, b2);
}

export function applyBasicAdjustmentToPixels(
  pixels: Uint8ClampedArray,
  adjustment: BasicAdjustment,
): Uint8ClampedArray {
  const next = new Uint8ClampedArray(pixels);
  const normalized = normalizeBasicAdjustment(adjustment);

  for (let i = 0; i < next.length; i += 4) {
    // Apply the same math as the GPU preview (shaders.ts::applyAdjustment).
    const [r, g, b] = applyAdjustmentToRgb(
      next[i] / 255,
      next[i + 1] / 255,
      next[i + 2] / 255,
      normalized,
    );
    next[i] = clampChannel(r * 255);
    next[i + 1] = clampChannel(g * 255);
    next[i + 2] = clampChannel(b * 255);
  }

  return next;
}

/**
 * Bakes a BasicAdjustment into a fresh ImageBitmap (CPU pixel pass). Used to
 * commit a non-destructive adjustment on release (or at export) so the layer's
 * stored pixels reflect the adjustment and subsequent paint shows raw colors.
 * The source bitmap is left untouched (undo snapshots may still reference it).
 */
export function bakeAdjustmentToBitmap(
  bitmap: ImageBitmap,
  width: number,
  height: number,
  adjustment: BasicAdjustment,
): ImageBitmap {
  const canvas = new OffscreenCanvas(width, height);
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Failed to acquire 2D context for adjustment bake");
  ctx.drawImage(bitmap, 0, 0);
  const imageData = ctx.getImageData(0, 0, width, height);
  imageData.data.set(applyBasicAdjustmentToPixels(imageData.data, adjustment));
  ctx.putImageData(imageData, 0, 0);
  return canvas.transferToImageBitmap();
}
