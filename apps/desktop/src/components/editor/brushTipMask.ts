import {
  MIN_RELIABLE_BRUSH_DIAMETER_PX,
  brushAlpha,
  getBrushProfileSupportNorm,
} from "./brushHardnessProfile";

export type BrushFalloffCurve = "cosine" | "smoothstep" | "quadratic" | "soft";

export interface BrushTipOptions {
  size: number;
  hardness: number;
  curve?: BrushFalloffCurve;
}

export interface BrushTip {
  width: number;
  height: number;
  radius: number;
  data: Uint8ClampedArray;
}

export interface BrushPoint {
  x: number;
  y: number;
}

export interface DabInterpolationResult {
  dabs: BrushPoint[];
  carry: number;
}

export function clamp01(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(1, value));
}

export function falloff(x: number, curve: BrushFalloffCurve = "soft"): number {
  const v = clamp01(x);
  if (curve === "smoothstep") return v * v * (3 - 2 * v);
  if (curve === "quadratic") return v * v;
  if (curve === "cosine") return 0.5 - 0.5 * Math.cos(Math.PI * v);
  return Math.pow(v, 0.7);
}

export function getBrushTipOuterRadius(
  radius: number,
  hardness: number,
  curve: BrushFalloffCurve = "soft",
): number {
  if (curve === "soft") {
    if (radius * 2 < MIN_RELIABLE_BRUSH_DIAMETER_PX) return radius + 0.5;
    return radius * getBrushProfileSupportNorm(hardness);
  }
  return radius;
}

function smallRoundAlpha(distance: number, radius: number): number {
  return clamp01(radius - Math.max(distance, 0) + 0.5);
}

export function brushAlphaAtDistance(
  distance: number,
  radius: number,
  hardness: number,
  curve: BrushFalloffCurve = "soft",
): number {
  if (radius <= 0) return 0;
  const h = clamp01(hardness);

  if (curve === "soft") {
    if (radius * 2 < MIN_RELIABLE_BRUSH_DIAMETER_PX) {
      return smallRoundAlpha(distance, radius);
    }
    return brushAlpha(Math.max(distance, 0) / radius, h);
  }

  const outerRadius = getBrushTipOuterRadius(radius, h, curve);
  if (distance >= outerRadius) return 0;
  if (h >= 1) return 1;

  const coreRadius = radius * h;
  if (distance <= coreRadius) return 1;

  const featherWidth = Math.max(0.0001, outerRadius - coreRadius);
  const t = (distance - coreRadius) / featherWidth;
  const v = 1 - t;
  return falloff(v, curve);
}

export function getBrushTipCacheKey(options: BrushTipOptions): string {
  const size = Math.max(1, Math.round(options.size));
  const hardness = Math.round(clamp01(options.hardness) * 100);
  return `${size}:${hardness}:${options.curve ?? "soft"}`;
}

const brushTipCache = new Map<string, BrushTip>();

export function createBrushTip(options: BrushTipOptions): BrushTip {
  const size = Math.max(1, Math.round(options.size));
  const radius = size / 2;
  const curve = options.curve ?? "soft";
  const hardness = clamp01(options.hardness);
  const outerRadius = getBrushTipOuterRadius(radius, hardness, curve);
  const width = Math.max(size, Math.ceil(outerRadius * 2));
  const height = width;
  const data = new Uint8ClampedArray(width * height * 4);
  const center = (width - 1) / 2;

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const distance = Math.hypot(x - center, y - center);
      const alpha = brushAlphaAtDistance(distance, radius, hardness, curve);
      const idx = (y * width + x) * 4;
      data[idx] = 255;
      data[idx + 1] = 255;
      data[idx + 2] = 255;
      data[idx + 3] = Math.round(alpha * 255);
    }
  }

  return { width, height, radius, data };
}

export function getBrushTip(options: BrushTipOptions): BrushTip {
  const key = getBrushTipCacheKey(options);
  const cached = brushTipCache.get(key);
  if (cached) return cached;
  const tip = createBrushTip(options);
  brushTipCache.set(key, tip);
  return tip;
}

export function clearBrushTipCache(): void {
  brushTipCache.clear();
}

export function getEffectiveFlowMultiplier(_hardness: number): number {
  return 1;
}

export function getBrushDabSpacing(size: number, hardness: number, flow: number): number {
  // ponytail: fixed 25% × size spacing matches Photoshop default and produces
  // visible individual dabs (brush-stroke character) instead of a smooth blob.
  // Hardness already controls the soft profile inside the mask, so spacing
  // stays geometry-agnostic across the hardness range. Flow remains a stroke
  // alpha multiplier and does not change geometric spacing.
  const spacing = size * 0.25;
  return Math.max(1, Math.round(spacing));
}

export function interpolateDabs(
  from: BrushPoint,
  to: BrushPoint,
  spacing: number,
  carry: number,
): DabInterpolationResult {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const distance = Math.hypot(dx, dy);
  if (distance <= 0) return { dabs: [], carry };

  const dabs: BrushPoint[] = [];
  let next = spacing - carry;
  while (next <= distance + 0.0001) {
    const t = next / distance;
    dabs.push({ x: from.x + dx * t, y: from.y + dy * t });
    next += spacing;
  }

  return { dabs, carry: distance - (next - spacing) };
}

export function stampBrushTip(
  mask: Uint8ClampedArray,
  maskWidth: number,
  maskHeight: number,
  tip: BrushTip,
  centerX: number,
  centerY: number,
  alphaScale: number,
): void {
  // ponytail: pre-multiplied source-over accumulation per dab so multiple
  // dabs on the same pixel accumulate toward saturation as
  //   1 - (1 - alpha)^N
  // matching Photoshop / Krita / Procreate. Opacity and flow act as the
  // per-dab alpha cap, so flow=50% + ~10 passes reaches ~99% at the mask
  // center. Replaces the previous max-within-stroke semantics which made
  // brush strokes stop accumulating after the first pass.
  const scale = clamp01(alphaScale);
  const cx = (tip.width - 1) / 2;
  const cy = (tip.height - 1) / 2;

  const minX = Math.max(0, Math.floor(centerX - cx));
  const maxX = Math.min(maskWidth - 1, Math.ceil(centerX + cx));
  const minY = Math.max(0, Math.floor(centerY - cy));
  const maxY = Math.min(maskHeight - 1, Math.ceil(centerY + cy));

  for (let y = minY; y <= maxY; y += 1) {
    const ty = y - centerY + cy;
    const y0 = Math.floor(ty);
    const y1 = y0 + 1;
    const wy = ty - y0;

    const y0In = y0 >= 0 && y0 < tip.height;
    const y1In = y1 >= 0 && y1 < tip.height;
    const y0Offset = y0 * tip.width;
    const y1Offset = y1 * tip.width;

    const rowIdx = y * maskWidth;

    for (let x = minX; x <= maxX; x += 1) {
      const tx = x - centerX + cx;
      const x0 = Math.floor(tx);
      const x1 = x0 + 1;
      const wx = tx - x0;

      const x0In = x0 >= 0 && x0 < tip.width;
      const x1In = x1 >= 0 && x1 < tip.width;

      const a00 = (y0In && x0In) ? tip.data[(y0Offset + x0) * 4 + 3] : 0;
      const a10 = (y0In && x1In) ? tip.data[(y0Offset + x1) * 4 + 3] : 0;
      const a01 = (y1In && x0In) ? tip.data[(y1Offset + x0) * 4 + 3] : 0;
      const a11 = (y1In && x1In) ? tip.data[(y1Offset + x1) * 4 + 3] : 0;

      const a0 = a00 * (1 - wx) + a10 * wx;
      const a1 = a01 * (1 - wx) + a11 * wx;
      const interpolatedAlpha = a0 * (1 - wy) + a1 * wy;

      if (interpolatedAlpha <= 0) continue;

      const scaled = Math.round(interpolatedAlpha * scale);
      if (scaled <= 0) continue;

      const idx = rowIdx + x;
      const cur = mask[idx];
      if (cur >= 255) continue;
      mask[idx] = cur + Math.round((255 - cur) * scaled / 255);
    }
  }
}

export interface RgbaColor {
  r: number;
  g: number;
  b: number;
  a: number;
}

export function parsePaintColor(color: string): RgbaColor {
  const rgba = color.match(/rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)(?:\s*,\s*([\d.]+))?\s*\)/);
  if (rgba) {
    return {
      r: Math.max(0, Math.min(255, Number(rgba[1]))),
      g: Math.max(0, Math.min(255, Number(rgba[2]))),
      b: Math.max(0, Math.min(255, Number(rgba[3]))),
      a: rgba[4] === undefined ? 1 : Math.max(0, Math.min(1, Number(rgba[4]))),
    };
  }

  const hex = color.replace("#", "");
  if (/^[0-9a-fA-F]{6}$/.test(hex)) {
    return {
      r: parseInt(hex.slice(0, 2), 16),
      g: parseInt(hex.slice(2, 4), 16),
      b: parseInt(hex.slice(4, 6), 16),
      a: 1,
    };
  }
  if (/^[0-9a-fA-F]{3}$/.test(hex)) {
    return {
      r: parseInt(hex[0] + hex[0], 16),
      g: parseInt(hex[1] + hex[1], 16),
      b: parseInt(hex[2] + hex[2], 16),
      a: 1,
    };
  }
  return { r: 0, g: 0, b: 0, a: 1 };
}

export function compositeMaskToImageData(
  imageData: ImageData,
  mask: Uint8ClampedArray,
  color: string,
  isEraser: boolean,
): void {
  const data = imageData.data;
  const paint = parsePaintColor(color);
  const strokeAlpha = Math.max(0, Math.min(1, paint.a));

  for (let i = 0; i < data.length; i += 4) {
    const maskAlpha = mask[i / 4] / 255;
    if (maskAlpha <= 0) continue;

    const alpha = maskAlpha * strokeAlpha;

    if (isEraser) {
      data[i + 3] = Math.round(data[i + 3] * (1 - alpha));
      continue;
    }

    const dstA = data[i + 3] / 255;
    const outA = alpha + dstA * (1 - alpha);
    if (outA <= 0) {
      data[i] = 0;
      data[i + 1] = 0;
      data[i + 2] = 0;
      data[i + 3] = 0;
      continue;
    }

    data[i] = Math.round((paint.r * alpha + data[i] * dstA * (1 - alpha)) / outA);
    data[i + 1] = Math.round((paint.g * alpha + data[i + 1] * dstA * (1 - alpha)) / outA);
    data[i + 2] = Math.round((paint.b * alpha + data[i + 2] * dstA * (1 - alpha)) / outA);
    data[i + 3] = Math.round(outA * 255);
  }
}

export function paintMaskToContext(
  ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D,
  mask: Uint8ClampedArray,
  width: number,
  height: number,
  color: string,
  isEraser: boolean,
): void {
  const imageData = ctx.getImageData(0, 0, width, height);
  compositeMaskToImageData(imageData, mask, color, isEraser);
  ctx.putImageData(imageData, 0, 0);
}
