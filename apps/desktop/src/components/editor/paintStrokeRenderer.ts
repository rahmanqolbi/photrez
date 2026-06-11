import type { PaintToolSettings } from "./brushToolState";

export interface StrokePoint {
  x: number;
  y: number;
}

export interface RgbaColor {
  r: number;
  g: number;
  b: number;
  a: number;
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

interface Bounds {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
}

function getStrokeBounds(points: StrokePoint[], radius: number, canvasWidth: number, canvasHeight: number): Bounds | null {
  if (points.length === 0) return null;
  let minX = points[0].x;
  let minY = points[0].y;
  let maxX = points[0].x;
  let maxY = points[0].y;
  for (const point of points) {
    minX = Math.min(minX, point.x);
    minY = Math.min(minY, point.y);
    maxX = Math.max(maxX, point.x);
    maxY = Math.max(maxY, point.y);
  }
  return {
    minX: Math.max(0, Math.floor(minX - radius - 1)),
    minY: Math.max(0, Math.floor(minY - radius - 1)),
    maxX: Math.min(canvasWidth, Math.ceil(maxX + radius + 1)),
    maxY: Math.min(canvasHeight, Math.ceil(maxY + radius + 1)),
  };
}

function distanceToStrokePath(px: number, py: number, points: StrokePoint[]): number {
  if (points.length === 1) return Math.hypot(px - points[0].x, py - points[0].y);
  let minDistance = Number.POSITIVE_INFINITY;
  for (let i = 1; i < points.length; i += 1) {
    const prev = points[i - 1];
    const next = points[i];
    minDistance = Math.min(minDistance, distanceToSegment(px, py, prev.x, prev.y, next.x, next.y));
  }
  return minDistance;
}

function renderSoftStrokeToImageData(
  ctx: CanvasRenderingContext2D,
  points: StrokePoint[],
  settings: PaintToolSettings,
  color: string,
  isEraser: boolean,
): void {
  const canvas = ctx.canvas;
  const radius = settings.size / 2;
  const bounds = getStrokeBounds(points, radius, canvas.width, canvas.height);
  if (!bounds || bounds.maxX <= bounds.minX || bounds.maxY <= bounds.minY) return;

  const imageData = ctx.getImageData(bounds.minX, bounds.minY, bounds.maxX - bounds.minX, bounds.maxY - bounds.minY);
  const data = imageData.data;
  const paint = parsePaintColor(color);
  const strokeAlpha = Math.max(0, Math.min(1, settings.opacity * settings.flow * paint.a));

  for (let y = 0; y < imageData.height; y += 1) {
    for (let x = 0; x < imageData.width; x += 1) {
      const docX = bounds.minX + x + 0.5;
      const docY = bounds.minY + y + 0.5;
      const distance = distanceToStrokePath(docX, docY, points);
      const alpha = brushAlphaAtDistance(distance, radius, settings.hardness) * strokeAlpha;
      if (alpha <= 0) continue;

      const idx = (y * imageData.width + x) * 4;
      if (isEraser) {
        data[idx + 3] = Math.round(data[idx + 3] * (1 - alpha));
        continue;
      }

      const dstA = data[idx + 3] / 255;
      const outA = alpha + dstA * (1 - alpha);
      if (outA <= 0) {
        data[idx] = 0;
        data[idx + 1] = 0;
        data[idx + 2] = 0;
        data[idx + 3] = 0;
        continue;
      }

      data[idx] = Math.round((paint.r * alpha + data[idx] * dstA * (1 - alpha)) / outA);
      data[idx + 1] = Math.round((paint.g * alpha + data[idx + 1] * dstA * (1 - alpha)) / outA);
      data[idx + 2] = Math.round((paint.b * alpha + data[idx + 2] * dstA * (1 - alpha)) / outA);
      data[idx + 3] = Math.round(outA * 255);
    }
  }

  ctx.putImageData(imageData, bounds.minX, bounds.minY);
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
    renderSoftStrokeToImageData(ctx, points, settings, color, isEraser);
  }

  ctx.restore();
}


