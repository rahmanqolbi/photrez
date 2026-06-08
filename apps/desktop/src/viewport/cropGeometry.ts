export interface CropRect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface CropResizeOptions {
  constraint?: "free" | "ratio" | "size";
  aspect?: { w: number; h: number } | null;
  shift?: boolean;
  alt?: boolean;
}

export function screenDeltaToRotatedCropLocalDelta(
  dx: number,
  dy: number,
  rotationDeg: number,
): { dx: number; dy: number } {
  if (rotationDeg === 0) return { dx, dy };
  const rad = (-rotationDeg * Math.PI) / 180;
  const cos = Math.cos(rad);
  const sin = Math.sin(rad);
  return {
    dx: dx * cos - dy * sin,
    dy: dx * sin + dy * cos,
  };
}

function minSize(n: number): number {
  return Math.max(1, n);
}

/** Constrain the crop rect size to at least 1x1, allowing bounds to extend outside the canvas. */
export function constrainCropRectToDocument(rect: CropRect, docW: number, docH: number): CropRect {
  const w = Math.max(1, rect.w);
  const h = Math.max(1, rect.h);
  return { x: rect.x, y: rect.y, w, h };
}

/** @deprecated Use constrainCropRectToDocument — kept as alias for existing imports. */
export function clampCropRect(rect: CropRect, docW: number, docH: number): CropRect {
  return constrainCropRectToDocument(rect, docW, docH);
}

function applyFreeCornerResize(
  rect: CropRect,
  handle: string,
  effDx: number,
  effDy: number,
): CropRect {
  let { x, y, w, h } = rect;
  if (handle.includes("e")) w += effDx;
  if (handle.includes("w")) { w -= effDx; x += effDx; }
  if (handle.includes("s")) h += effDy;
  if (handle.includes("n")) { h -= effDy; y += effDy; }
  return { x, y, w: minSize(w), h: minSize(h) };
}

function applyProportionalCornerResize(
  rect: CropRect,
  handle: string,
  effDx: number,
  effDy: number,
): CropRect {
  const oldW = rect.w;
  const oldH = rect.h;
  const hx = handle === "se" || handle === "ne" ? 1 : -1;
  const hy = handle === "se" || handle === "sw" ? 1 : -1;
  const sumWH = oldW + oldH;
  let { x, y } = rect;
  let w = oldW;
  let h = oldH;

  if (sumWH > 0) {
    const projected = effDx * hx + effDy * hy;
    const factor = Math.max(Math.max(1 / oldW, 1 / oldH), 1 + projected / sumWH);
    w = oldW * factor;
    h = oldH * factor;
    if (handle.includes("w")) x = rect.x + oldW - w;
    if (handle.includes("n")) y = rect.y + oldH - h;
  }
  return { x, y, w: minSize(w), h: minSize(h) };
}

function applyAspectCornerResize(
  rect: CropRect,
  handle: string,
  effDx: number,
  effDy: number,
  targetRatio: number,
): CropRect {
  const oldW = rect.w;
  const oldH = rect.h;
  const hx = handle === "se" || handle === "ne" ? 1 : -1;
  const hy = handle === "se" || handle === "sw" ? 1 : -1;
  const sumWH = oldW + oldH;
  let { x, y } = rect;

  if (sumWH > 0) {
    const projected = effDx * hx + effDy * hy;
    // Ensure w >= 1 AND h = w/targetRatio >= 1
    const minFactor = Math.max(1 / oldW, targetRatio / oldW);
    const factor = Math.max(minFactor, 1 + projected / sumWH);
    const w = oldW * factor;
    const h = w / targetRatio;
    if (handle.includes("w")) x = rect.x + oldW - w;
    if (handle.includes("n")) y = rect.y + oldH - h;
    return { x, y, w: minSize(w), h: minSize(h) };
  }

  return { x, y, w: minSize(oldW), h: minSize(oldH) };
}

function applyCenterResize(rect: CropRect, w: number, h: number): CropRect {
  const cx = rect.x + rect.w / 2;
  const cy = rect.y + rect.h / 2;
  return { x: cx - w / 2, y: cy - h / 2, w: minSize(w), h: minSize(h) };
}

export function applyCropResizeHandle(
  rect: CropRect,
  handle: string,
  dx: number,
  dy: number,
  options?: CropResizeOptions,
): CropRect {
  const _constraint = options?.constraint ?? "free";
  const _aspect = options?.aspect ?? null;
  const _shift = options?.shift ?? false;
  const _alt = options?.alt ?? false;

  const isCorner = ["nw", "ne", "se", "sw"].includes(handle);
  const effDx = _alt ? dx * 2 : dx;
  const effDy = _alt ? dy * 2 : dy;

  let result: CropRect;

  if (isCorner) {
    if (_constraint === "free") {
      if (_shift) {
        result = applyProportionalCornerResize(rect, handle, effDx, effDy);
      } else {
        result = applyFreeCornerResize(rect, handle, effDx, effDy);
      }
    } else if (_constraint === "ratio" && _aspect) {
      const targetRatio = _aspect.w / _aspect.h;
      if (_shift) {
        result = applyFreeCornerResize(rect, handle, effDx, effDy);
      } else {
        result = applyAspectCornerResize(rect, handle, effDx, effDy, targetRatio);
      }
    } else if (_constraint === "size" && _aspect) {
      const targetRatio = _aspect.w / _aspect.h;
      if (_shift) {
        result = applyFreeCornerResize(rect, handle, effDx, effDy);
      } else {
        result = applyAspectCornerResize(rect, handle, effDx, effDy, targetRatio);
      }
    } else {
      result = applyFreeCornerResize(rect, handle, effDx, effDy);
    }
  } else {
    // Edge handles — always free resize
    if (_constraint === "ratio" && _aspect) {
      const targetRatio = _aspect.w / _aspect.h;
      if (handle === "s" || handle === "n") {
        const newH = minSize(rect.h + (handle === "s" ? effDy : -effDy));
        const newW = newH * targetRatio;
        result = {
          x: rect.x + (rect.w - newW) / 2,
          y: handle === "n" ? rect.y + rect.h - newH : rect.y,
          w: newW,
          h: newH,
        };
      } else {
        const newW = minSize(rect.w + (handle === "e" ? effDx : -effDx));
        const newH = newW / targetRatio;
        result = {
          x: handle === "w" ? rect.x + rect.w - newW : rect.x,
          y: rect.y + (rect.h - newH) / 2,
          w: newW,
          h: newH,
        };
      }
    } else {
      let { x, y, w, h } = rect;
      if (handle.includes("e")) w += effDx;
      if (handle.includes("w")) { w -= effDx; x += effDx; }
      if (handle.includes("s")) h += effDy;
      if (handle.includes("n")) { h -= effDy; y += effDy; }
      result = { x, y, w: minSize(w), h: minSize(h) };
    }
  }

  if (_alt) {
    result = applyCenterResize(rect, result.w, result.h);
  }

  return result;
}

export function applyCropMove(
  rect: CropRect,
  dx: number,
  dy: number,
  docW: number,
  docH: number,
): CropRect {
  return constrainCropRectToDocument(
    { x: rect.x + dx, y: rect.y + dy, w: rect.w, h: rect.h },
    docW,
    docH,
  );
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
