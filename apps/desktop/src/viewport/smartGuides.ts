export interface SnapRect {
  x: number;
  y: number;
  w: number;
  h: number;
  snapThreshold?: number;
  snapPriority?: number;
}

export interface SnapLine {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  color?: string;
}

export interface SnapResult {
  dx: number;
  dy: number;
  lines: SnapLine[];
}

const X_KEYS = ["left", "right", "cx"] as const;
const Y_KEYS = ["top", "bottom", "cy"] as const;

function buildAxis(rect: SnapRect) {
  return {
    left: rect.x,
    right: rect.x + rect.w,
    cx: rect.x + rect.w / 2,
    top: rect.y,
    bottom: rect.y + rect.h,
    cy: rect.y + rect.h / 2,
  };
}

export function computeSnapAdjustment(
  moving: SnapRect,
  targets: SnapRect[],
  threshold = 5,
  zoom = 1,
): SnapResult {
  const me = buildAxis(moving);
  // scale thresholds by 1/zoom so screen-space catch zone is constant
  const factor = zoom !== 0 ? 1 / zoom : 1;
  let bestDx = 0;
  let bestDxDist = Infinity;
  let bestDxLineY1 = moving.y;
  let bestDxLineY2 = moving.y + moving.h;
  let bestDxHitX: number | null = null;
  let bestDxPriority = -1;

  let bestDy = 0;
  let bestDyDist = Infinity;
  let bestDyLineX1 = moving.x;
  let bestDyLineX2 = moving.x + moving.w;
  let bestDyHitY: number | null = null;
  let bestDyPriority = -1;

  for (const t of targets) {
    const te = buildAxis(t);
      for (const mk of X_KEYS) {
        for (const tk of X_KEYS) {
          const tThreshold = (t.snapThreshold ?? threshold) * factor;
          const tPriority = t.snapPriority ?? 1;
          const d = te[tk] - me[mk];
          const dist = Math.abs(d);
          if (dist < tThreshold && (tPriority > bestDxPriority || (tPriority === bestDxPriority && dist < bestDxDist))) {
            bestDxDist = dist;
            bestDxPriority = tPriority;
            bestDx = d;
            bestDxHitX = te[tk];
            const rawY1 = Math.min(moving.y, t.y) - 10;
            const rawY2 = Math.max(moving.y + moving.h, t.y + t.h) + 10;
            bestDxLineY1 = Number.isFinite(rawY1) ? rawY1 : moving.y - 10000;
            bestDxLineY2 = Number.isFinite(rawY2) ? rawY2 : moving.y + moving.h + 10000;
          }
        }
      }
      for (const mk of Y_KEYS) {
        for (const tk of Y_KEYS) {
          const tThreshold = (t.snapThreshold ?? threshold) * factor;
          const tPriority = t.snapPriority ?? 1;
          const d = te[tk] - me[mk];
          const dist = Math.abs(d);
          if (dist < tThreshold && (tPriority > bestDyPriority || (tPriority === bestDyPriority && dist < bestDyDist))) {
            bestDyDist = dist;
            bestDyPriority = tPriority;
            bestDy = d;
            bestDyHitY = te[tk];
            const rawX1 = Math.min(moving.x, t.x) - 10;
            const rawX2 = Math.max(moving.x + moving.w, t.x + t.w) + 10;
            bestDyLineX1 = Number.isFinite(rawX1) ? rawX1 : moving.x - 10000;
            bestDyLineX2 = Number.isFinite(rawX2) ? rawX2 : moving.x + moving.w + 10000;
          }
        }
      }
  }

  const lines: SnapLine[] = [];
  if (bestDxHitX !== null) {
    lines.push({
      x1: bestDxHitX,
      y1: bestDxLineY1,
      x2: bestDxHitX,
      y2: bestDxLineY2,
    });
  }
  if (bestDyHitY !== null) {
    lines.push({
      x1: bestDyLineX1,
      y1: bestDyHitY,
      x2: bestDyLineX2,
      y2: bestDyHitY,
    });
  }

  return { dx: bestDx, dy: bestDy, lines };
}

export function computeSnapLines(
  moving: SnapRect,
  targets: SnapRect[],
  threshold = 5,
  zoom = 1,
): SnapLine[] {
  return computeSnapAdjustment(moving, targets, threshold, zoom).lines;
}
