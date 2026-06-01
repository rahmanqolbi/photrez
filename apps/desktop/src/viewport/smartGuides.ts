export interface SnapRect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface SnapLine {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
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
): SnapResult {
  const me = buildAxis(moving);
  let bestDx = 0;
  let bestDxDist = Infinity;
  let bestDxLineY1 = moving.y;
  let bestDxLineY2 = moving.y + moving.h;
  let bestDxHitX: number | null = null;

  let bestDy = 0;
  let bestDyDist = Infinity;
  let bestDyLineX1 = moving.x;
  let bestDyLineX2 = moving.x + moving.w;
  let bestDyHitY: number | null = null;

  for (const t of targets) {
    const te = buildAxis(t);
    for (const mk of X_KEYS) {
      for (const tk of X_KEYS) {
        const d = te[tk] - me[mk];
        const dist = Math.abs(d);
        if (dist < threshold && dist < bestDxDist) {
          bestDxDist = dist;
          bestDx = d;
          bestDxHitX = te[tk];
          bestDxLineY1 = Math.min(moving.y, t.y) - 10;
          bestDxLineY2 = Math.max(moving.y + moving.h, t.y + t.h) + 10;
        }
      }
    }
    for (const mk of Y_KEYS) {
      for (const tk of Y_KEYS) {
        const d = te[tk] - me[mk];
        const dist = Math.abs(d);
        if (dist < threshold && dist < bestDyDist) {
          bestDyDist = dist;
          bestDy = d;
          bestDyHitY = te[tk];
          bestDyLineX1 = Math.min(moving.x, t.x) - 10;
          bestDyLineX2 = Math.max(moving.x + moving.w, t.x + t.w) + 10;
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
): SnapLine[] {
  return computeSnapAdjustment(moving, targets, threshold).lines;
}
