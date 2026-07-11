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
  // (brightness * 2.55) shifted all pixel values equally — equivalent to a
  // legacy brightness curve which clips highlights/shadows. This
  // curve lifts shadows more than highlights (brighten) or pulls
  // highlights more than shadows (darken), preserving detail at extremes.
  const t = normalized.brightness / 100; // -1 to 1
  const contrastFactor = (259 * (normalized.contrast + 255)) / (255 * (259 - normalized.contrast));
  const saturationFactor = 1 + normalized.saturation / 100;

  for (let i = 0; i < next.length; i += 4) {
    // Apply contrast first (standard S-curve around midtone 128)
    let r = contrastFactor * (next[i] - 128) + 128;
    let g = contrastFactor * (next[i + 1] - 128) + 128;
    let b = contrastFactor * (next[i + 2] - 128) + 128;

    // Nonlinear brightness: preserves highlights when brightening,
    // preserves shadows when darkening. Scale 0.5 keeps +100/−100
    // from reaching full white/black.
    if (t >= 0) {
      r = r + (255 - r) * t * 0.5;
      g = g + (255 - g) * t * 0.5;
      b = b + (255 - b) * t * 0.5;
    } else {
      const f = -t;
      r = r - r * f * 0.5;
      g = g - g * f * 0.5;
      b = b - b * f * 0.5;
    }

    // Luminance-weighted saturation (ITU-R BT.709)
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
