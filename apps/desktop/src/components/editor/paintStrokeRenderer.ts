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

export function smoothstep01(t: number): number {
  const x = Math.max(0, Math.min(1, t));
  return x * x * (3 - 2 * x);
}

export function brushAlphaAtDistance(distance: number, radius: number, hardness: number): number {
  if (radius <= 0 || distance >= radius) return 0;
  const clampedHardness = Math.max(0, Math.min(1, hardness));
  const hardRadius = radius * clampedHardness;
  if (distance <= hardRadius) return 1;
  const feather = radius - hardRadius;
  if (feather <= 0) return 1;
  return 1 - smoothstep01((distance - hardRadius) / feather);
}

export function distanceToSegment(
  px: number,
  py: number,
  ax: number,
  ay: number,
  bx: number,
  by: number,
): number {
  const dx = bx - ax;
  const dy = by - ay;
  const lenSq = dx * dx + dy * dy;
  if (lenSq === 0) return Math.hypot(px - ax, py - ay);
  const t = Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / lenSq));
  const cx = ax + dx * t;
  const cy = ay + dy * t;
  return Math.hypot(px - cx, py - cy);
}

export function renderPaintStrokeToContext(
  ctx: CanvasRenderingContext2D,
  points: StrokePoint[],
  settings: PaintToolSettings,
  color: string,
  isEraser: boolean,
): void {
  if (points.length === 0) return;

  const size = settings.size;
  const hardness = settings.hardness;

  ctx.save();
  ctx.globalCompositeOperation = isEraser ? "destination-out" : "source-over";
  ctx.globalAlpha = settings.opacity * settings.flow;

  if (hardness >= 1) {
    ctx.strokeStyle = color;
    ctx.lineWidth = size;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";

    ctx.beginPath();
    ctx.moveTo(points[0].x, points[0].y);
    for (let i = 1; i < points.length; i++) {
      ctx.lineTo(points[i].x, points[i].y);
    }
    
    if (points.length === 1) {
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.arc(points[0].x, points[0].y, size / 2, 0, Math.PI * 2);
      ctx.fill();
    } else {
      ctx.stroke();
    }
  } else {
    const offsetX = -20000;
    // Core width and shadow blur calculated to keep the center of the brush opaque
    // and make the visible diameter match the cursor diameter exactly (coreWidth + 3 * blur = size).
    const coreWidth = Math.round(size * (0.4 + 0.6 * hardness) * 100) / 100;
    const blur = Math.round(size * 0.2 * (1 - hardness) * 100) / 100;

    ctx.shadowColor = color;
    ctx.shadowBlur = blur;
    ctx.shadowOffsetX = -offsetX;
    ctx.shadowOffsetY = 0;

    ctx.strokeStyle = color;
    ctx.lineWidth = coreWidth;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";

    ctx.beginPath();
    ctx.moveTo(points[0].x + offsetX, points[0].y);
    for (let i = 1; i < points.length; i++) {
      ctx.lineTo(points[i].x + offsetX, points[i].y);
    }

    if (points.length === 1) {
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.arc(points[0].x + offsetX, points[0].y, coreWidth / 2, 0, Math.PI * 2);
      ctx.fill();
    } else {
      ctx.stroke();
    }
  }

  ctx.restore();
}


