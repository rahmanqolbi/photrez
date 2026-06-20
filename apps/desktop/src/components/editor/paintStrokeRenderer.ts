import type { PaintToolSettings } from "./brushToolState";
import {
  getBrushDabSpacing,
  getBrushTip,
  interpolateDabs,
  stampBrushTip,
  compositeMaskToImageData,
  parsePaintColor,
  type RgbaColor,
  getEffectiveFlowMultiplier,
} from "./brushTipMask";

export interface StrokePoint {
  x: number;
  y: number;
}

export function colorToRgbString(color: string): string {
  const rgbaMatch = color.match(/rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/);
  if (rgbaMatch) {
    return `${rgbaMatch[1]},${rgbaMatch[2]},${rgbaMatch[3]}`;
  }
  const hex = color.replace("#", "");
  if (/^[0-9a-fA-F]{6}$/.test(hex)) {
    return `${parseInt(hex.slice(0, 2), 16)},${parseInt(hex.slice(2, 4), 16)},${parseInt(hex.slice(4, 6), 16)}`;
  }
  if (/^[0-9a-fA-F]{3}$/.test(hex)) {
    const r = parseInt(hex[0] + hex[0], 16);
    const g = parseInt(hex[1] + hex[1], 16);
    const b = parseInt(hex[2] + hex[2], 16);
    return `${r},${g},${b}`;
  }
  return "0,0,0";
}

export function getDabSpacing(size: number): number {
  return Math.max(1, Math.min(20, Math.round(size * 0.15)));
}

export function buildStrokeDabs(points: StrokePoint[], size: number): StrokePoint[] {
  if (points.length <= 1) return points.slice();

  const spacing = getDabSpacing(size);
  const dabs: StrokePoint[] = [points[0]];

  for (let i = 1; i < points.length; i += 1) {
    const prev = points[i - 1];
    const next = points[i];
    const dx = next.x - prev.x;
    const dy = next.y - prev.y;
    const distance = Math.hypot(dx, dy);
    const steps = Math.max(1, Math.ceil(distance / spacing));

    for (let step = 1; step <= steps; step += 1) {
      const t = step / steps;
      dabs.push({
        x: prev.x + dx * t,
        y: prev.y + dy * t,
      });
    }
  }

  return dabs;
}


function renderSoftStrokeWithTipMask(
  ctx: CanvasRenderingContext2D,
  points: StrokePoint[],
  settings: PaintToolSettings,
  color: string,
  isEraser: boolean,
): void {
  const canvas = ctx.canvas;
  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const mask = new Uint8ClampedArray(canvas.width * canvas.height);
  const tip = getBrushTip({ size: settings.size, hardness: settings.hardness, curve: "soft" });
  const alphaScale = settings.opacity * settings.flow * getEffectiveFlowMultiplier(settings.hardness);
  const spacing = getBrushDabSpacing(settings.size, settings.hardness, settings.flow);

  // Always stamp the first point
  stampBrushTip(mask, canvas.width, canvas.height, tip, points[0].x, points[0].y, alphaScale);

  if (points.length > 1) {
    let carry = 0;
    for (let i = 1; i < points.length; i += 1) {
      const result = interpolateDabs(points[i - 1], points[i], spacing, carry);
      carry = result.carry;
      for (const dab of result.dabs) {
        stampBrushTip(mask, canvas.width, canvas.height, tip, dab.x, dab.y, alphaScale);
      }
    }
  }

  compositeMaskToImageData(imageData, mask, color, isEraser);
  ctx.putImageData(imageData, 0, 0);
}

export function renderPaintStrokeToContext(
  ctx: CanvasRenderingContext2D,
  points: StrokePoint[],
  settings: PaintToolSettings,
  color: string,
  isEraser: boolean,
): void {
  if (points.length === 0) return;

  ctx.save();
  ctx.globalCompositeOperation = isEraser ? "destination-out" : "source-over";
  // ponytail: route every hardness through the mask engine. The previous
  // ctx.lineCap=round shortcut for hardness>=1 produced browser-dependent
  // AA and skipped the brush-tip pipeline entirely. brushAlphaAtDistance
  // already returns 1 inside radius / 0 outside for hardness=1, so the
  // mask path gives a hard edge with deterministic subpixel AA.
  renderSoftStrokeWithTipMask(ctx, points, settings, color, isEraser);

  ctx.restore();
}


