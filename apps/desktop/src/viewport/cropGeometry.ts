export interface CropRect {
  x: number;
  y: number;
  w: number;
  h: number;
}

function minSize(n: number): number {
  return Math.max(1, n);
}

export function clampCropRect(rect: CropRect, docW: number, docH: number): CropRect {
  let { x, y, w, h } = rect;

  if (x < 0) {
    w = minSize(w + x);
    x = 0;
  }
  if (y < 0) {
    h = minSize(h + y);
    y = 0;
  }
  if (x + w > docW) {
    w = minSize(docW - x);
  }
  if (y + h > docH) {
    h = minSize(docH - y);
  }

  return { x, y, w, h };
}

export function applyCropResizeHandle(
  rect: CropRect,
  handle: string,
  dx: number,
  dy: number,
  aspect: { w: number; h: number } | null,
  shift?: boolean,
  alt?: boolean,
): CropRect {
  const _shift = shift ?? false;
  const _alt = alt ?? false;
  const isCorner = ["nw", "ne", "se", "sw"].includes(handle);
  const effDx = _alt ? dx * 2 : dx;
  const effDy = _alt ? dy * 2 : dy;

  let { x, y, w, h } = rect;

  if (isCorner && !_shift && aspect === null) {
    // Proportional corner — handle-axis projection, maintain current rect aspect
    const oldW = w;
    const oldH = h;
    const hx = handle === "se" || handle === "ne" ? 1 : -1;
    const hy = handle === "se" || handle === "sw" ? 1 : -1;
    const sumWH = oldW + oldH;

    if (sumWH > 0) {
      const projected = effDx * hx + effDy * hy;
      const factor = Math.max(Math.max(1 / oldW, 1 / oldH), 1 + projected / sumWH);

      w = oldW * factor;
      h = oldH * factor;

      if (handle.includes("w")) x = rect.x + oldW - w;
      if (handle.includes("n")) y = rect.y + oldH - h;
    }
  } else if (aspect) {
    // Aspect-ratio-constrained resize (any handle)
    const targetRatio = aspect.w / aspect.h;

    if (handle === "s" || handle === "n") {
      const newH = minSize(rect.h + (handle === "s" ? effDy : -effDy));
      const newW = newH * targetRatio;
      x = rect.x + (rect.w - newW) / 2;
      y = handle === "n" ? rect.y + rect.h - newH : rect.y;
      w = newW;
      h = newH;
    } else if (handle === "e" || handle === "w") {
      const newW = minSize(rect.w + (handle === "e" ? effDx : -effDx));
      const newH = newW / targetRatio;
      x = handle === "w" ? rect.x + rect.w - newW : rect.x;
      y = rect.y + (rect.h - newH) / 2;
      w = newW;
      h = newH;
    } else {
      // Corner with aspect lock — width drives, opposite corner fixed
      const oldW = rect.w;
      const oldH = rect.h;
      w = minSize(handle.includes("e") ? oldW + effDx : oldW - effDx);
      h = w / targetRatio;
      if (handle.includes("w")) x = rect.x + oldW - w;
      if (handle.includes("n")) y = rect.y + oldH - h;
    }
  } else {
    // Free resize (edges, or corners with shift)
    if (handle.includes("e")) w += effDx;
    if (handle.includes("w")) {
      w -= effDx;
      x += effDx;
    }
    if (handle.includes("s")) h += effDy;
    if (handle.includes("n")) {
      h -= effDy;
      y += effDy;
    }
  }

  // Alt: re-center to keep original center
  if (_alt) {
    const cx = rect.x + rect.w / 2;
    const cy = rect.y + rect.h / 2;
    x = cx - w / 2;
    y = cy - h / 2;
  }

  return { x, y, w: minSize(w), h: minSize(h) };
}

export function applyCropMove(
  rect: CropRect,
  dx: number,
  dy: number,
  docW: number,
  docH: number,
): CropRect {
  const x = Math.max(0, Math.min(docW - rect.w, rect.x + dx));
  const y = Math.max(0, Math.min(docH - rect.h, rect.y + dy));
  return { x, y, w: rect.w, h: rect.h };
}

export function constrainCropAspect(
  rect: CropRect,
  aspect: { w: number; h: number },
): CropRect {
  const targetRatio = aspect.w / aspect.h;
  let { x, y, w, h } = rect;

  if (w / h > targetRatio) {
    const newW = h * targetRatio;
    x += (w - newW) / 2;
    w = newW;
  } else {
    const newH = w / targetRatio;
    y += (h - newH) / 2;
    h = newH;
  }

  return { x, y, w, h };
}

export function constrainCropToSize(
  rect: CropRect,
  targetW: number,
  targetH: number,
): CropRect {
  const scale = Math.min(targetW / rect.w, targetH / rect.h);
  const w = rect.w * scale;
  const h = rect.h * scale;
  const x = (targetW - w) / 2;
  const y = (targetH - h) / 2;
  return { x, y, w, h };
}
