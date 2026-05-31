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

export function computeSnapLines(moving: SnapRect, targets: SnapRect[], threshold = 5): SnapLine[] {
  const lines: SnapLine[] = [];
  const me = {
    left: moving.x,
    right: moving.x + moving.w,
    cx: moving.x + moving.w / 2,
    top: moving.y,
    bottom: moving.y + moving.h,
    cy: moving.y + moving.h / 2,
  };
  for (const t of targets) {
    const te = {
      left: t.x,
      right: t.x + t.w,
      cx: t.x + t.w / 2,
      top: t.y,
      bottom: t.y + t.h,
      cy: t.y + t.h / 2,
    };
    // Vertical snap lines
    for (const mk of ["left", "right", "cx"] as const) {
      for (const tk of ["left", "right", "cx"] as const) {
        if (Math.abs(me[mk] - te[tk]) < threshold) {
          const sx = te[tk];
          lines.push({
            x1: sx,
            y1: Math.min(moving.y, t.y) - 10,
            x2: sx,
            y2: Math.max(moving.y + moving.h, t.y + t.h) + 10,
          });
        }
      }
    }
    // Horizontal snap lines
    for (const mk of ["top", "bottom", "cy"] as const) {
      for (const tk of ["top", "bottom", "cy"] as const) {
        if (Math.abs(me[mk] - te[tk]) < threshold) {
          const sy = te[tk];
          lines.push({
            x1: Math.min(moving.x, t.x) - 10,
            y1: sy,
            x2: Math.max(moving.x + moving.w, t.x + t.w) + 10,
            y2: sy,
          });
        }
      }
    }
  }
  return lines;
}
