export type BasicAdjustment = {
  brightness: number;
  contrast: number;
  saturation: number;
};

const clampChannel = (value: number): number => {
  if (value < 0) return 0;
  if (value > 255) return 255;
  return Math.round(value);
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

export function applyBasicAdjustmentToPixels(
  pixels: Uint8ClampedArray,
  adjustment: BasicAdjustment,
): Uint8ClampedArray {
  const next = new Uint8ClampedArray(pixels);
  const normalized = normalizeBasicAdjustment(adjustment);
  const brightness = normalized.brightness * 2.55;
  const contrastFactor = (259 * (normalized.contrast + 255)) / (255 * (259 - normalized.contrast));
  const saturationFactor = 1 + normalized.saturation / 100;

  for (let i = 0; i < next.length; i += 4) {
    let r = contrastFactor * (next[i] - 128) + 128 + brightness;
    let g = contrastFactor * (next[i + 1] - 128) + 128 + brightness;
    let b = contrastFactor * (next[i + 2] - 128) + 128 + brightness;

    const luminance = r * 0.2126 + g * 0.7152 + b * 0.0722;
    r = luminance + (r - luminance) * saturationFactor;
    g = luminance + (g - luminance) * saturationFactor;
    b = luminance + (b - luminance) * saturationFactor;

    next[i] = clampChannel(r);
    next[i + 1] = clampChannel(g);
    next[i + 2] = clampChannel(b);
  }

  return next;
}
