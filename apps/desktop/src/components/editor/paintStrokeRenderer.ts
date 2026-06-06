import type { PaintToolSettings } from "./brushToolState";

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

export function renderPaintStrokeToContext(
  ctx: CanvasRenderingContext2D,
  points: StrokePoint[],
  settings: PaintToolSettings,
  color: string,
  isEraser: boolean,
): void {
  if (points.length === 0) return;

  const radius = settings.size / 2;
  const hardRadius = radius * settings.hardness;
  const dabs = buildStrokeDabs(points, settings.size);

  ctx.save();
  ctx.globalCompositeOperation = isEraser ? "destination-out" : "source-over";
  ctx.globalAlpha = settings.opacity * settings.flow;

  for (const dab of dabs) {
    if (settings.hardness >= 1) {
      ctx.fillStyle = color;
    } else {
      const gradient = ctx.createRadialGradient(
        dab.x,
        dab.y,
        Math.max(0, hardRadius),
        dab.x,
        dab.y,
        radius,
      );
      gradient.addColorStop(0, color);
      gradient.addColorStop(settings.hardness, color);
      gradient.addColorStop(1, `rgba(${colorToRgbString(color)},0)`);
      ctx.fillStyle = gradient;
    }
    ctx.beginPath();
    ctx.arc(dab.x, dab.y, radius, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.restore();
}


