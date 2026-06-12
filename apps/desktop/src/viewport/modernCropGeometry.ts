import { applyCropResizeHandle } from "./cropGeometry";

export interface ModernCropFrame {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface ModernCropImageTransform {
  offsetX: number;
  offsetY: number;
  rotation: number;
  scale: number;
}

export interface ModernCropViewport {
  width: number;
  height: number;
  panX: number;
  panY: number;
  zoom: number;
}

export function getProjectedCanvasSize(params: {
  docWidth: number;
  docHeight: number;
  zoom: number;
  scale?: number;
}): { w: number; h: number } {
  const s = params.scale ?? 1;
  return {
    w: params.docWidth * params.zoom * s,
    h: params.docHeight * params.zoom * s,
  };
}

export function getModernCropFrameScreenRect(
  frame: ModernCropFrame,
  _viewportWidth?: number,
  _viewportHeight?: number,
) {
  return {
    x: frame.x,
    y: frame.y,
    w: frame.w,
    h: frame.h,
  };
}

export function getModernCropFrameScreenCenter(
  frame: ModernCropFrame,
  _viewportWidth?: number,
  _viewportHeight?: number,
) {
  return {
    x: frame.x + frame.w / 2,
    y: frame.y + frame.h / 2,
  };
}

export function getModernCropApplyRotation(rotation: number): number {
  return rotation === 0 ? 0 : -rotation;
}

export function getModernCropImagePivot(params: {
  frame: ModernCropFrame;
  viewport: ModernCropViewport;
  transform: ModernCropImageTransform;
}) {
  const screen = getModernCropFrameScreenCenter(
    params.frame,
    params.viewport.width,
    params.viewport.height,
  );
  const scale = params.viewport.zoom * params.transform.scale;
  return {
    screen,
    document: {
      x: (screen.x - params.viewport.panX - params.transform.offsetX) / scale,
      y: (screen.y - params.viewport.panY - params.transform.offsetY) / scale,
    },
  };
}

export function clampFrameToProjectedBounds(
  frame: ModernCropFrame,
  _projected: { w: number; h: number },
  minSize?: number,
): ModernCropFrame {
  const min = minSize ?? 24;
  return {
    x: frame.x,
    y: frame.y,
    w: Math.max(min, frame.w),
    h: Math.max(min, frame.h),
  };
}

export function getDefaultModernCropFrame(params: {
  viewportWidth: number;
  viewportHeight: number;
  docWidth: number;
  docHeight: number;
  zoom: number;
  scale?: number;
  aspect?: { w: number; h: number } | null;
}): ModernCropFrame {
  const projected = getProjectedCanvasSize({
    docWidth: params.docWidth,
    docHeight: params.docHeight,
    zoom: params.zoom,
    scale: params.scale,
  });

  const maxW = Math.min(params.viewportWidth, projected.w);
  const maxH = Math.min(params.viewportHeight, projected.h);
  const aspect = params.aspect && params.aspect.w > 0 && params.aspect.h > 0
    ? params.aspect.w / params.aspect.h
    : maxW / maxH;

  let w = maxW;
  let h = w / aspect;
  if (h > maxH) {
    h = maxH;
    w = h * aspect;
  }

  return { w: Math.max(1, w), h: Math.max(1, h), x: (params.viewportWidth - w) / 2, y: (params.viewportHeight - h) / 2 };
}

/** Re-center an existing frame in the viewport. */
export function centerModernCropFrame(frame: ModernCropFrame, viewportWidth: number, viewportHeight: number): ModernCropFrame {
  return { ...frame, x: (viewportWidth - frame.w) / 2, y: (viewportHeight - frame.h) / 2 };
}

export function resizeModernFrameFromCenter(params: {
  frame: ModernCropFrame;
  handle: string;
  deltaX: number;
  deltaY: number;
  viewportWidth: number;
  viewportHeight: number;
  projectedWidth?: number;
  projectedHeight?: number;
  minSize?: number;
  aspect?: { w: number; h: number } | null;
  cropMode?: "free" | "ratio" | "size";
}): ModernCropFrame {
  const minSize = params.minSize ?? 24;
  let w = params.frame.w;
  let h = params.frame.h;

  if (params.handle.includes("e")) w += params.deltaX * 2;
  if (params.handle.includes("w")) w -= params.deltaX * 2;
  if (params.handle.includes("s")) h += params.deltaY * 2;
  if (params.handle.includes("n")) h -= params.deltaY * 2;

  const useAspect = params.cropMode === "size" || params.cropMode === "ratio"
    ? params.aspect && params.aspect.w > 0 && params.aspect.h > 0
      ? params.aspect.w / params.aspect.h
      : null
    : null;
  if (useAspect) {
    if (params.handle === "n" || params.handle === "s") {
      w = h * useAspect;
    } else if (params.handle === "e" || params.handle === "w") {
      h = w / useAspect;
    } else {
      // Corner: diagonal projection for smooth monotonic resize
      const hx = params.handle === "se" || params.handle === "ne" ? 1 : -1;
      const hy = params.handle === "se" || params.handle === "sw" ? 1 : -1;
      const projected = (params.deltaX * hx + params.deltaY * hy) * 2;
      const sumWH = params.frame.w + params.frame.h;
      const minFactor = Math.max(1 / params.frame.w, useAspect / params.frame.w);
      const factor = Math.max(minFactor, 1 + projected / sumWH);
      w = params.frame.w * factor;
      h = w / useAspect;
    }
  }

  const finalW = Math.max(minSize, Math.abs(w));
  const finalH = Math.max(minSize, Math.abs(h));
  return {
    w: finalW,
    h: finalH,
    x: params.frame.x + (params.frame.w - finalW) / 2,
    y: params.frame.y + (params.frame.h - finalH) / 2,
  };
}

export function resizeModernFrameOneSided(params: {
  frame: ModernCropFrame;
  handle: string;
  deltaX: number;
  deltaY: number;
  viewportWidth: number;
  viewportHeight: number;
  projectedWidth?: number;
  projectedHeight?: number;
  minSize?: number;
  aspect?: { w: number; h: number } | null;
  cropMode?: "free" | "ratio" | "size";
  shift?: boolean;
  alt?: boolean;
}): { frame: ModernCropFrame; compensation: { x: number; y: number } } {
  const minSize = params.minSize ?? 24;
  const fw = params.frame.w;
  const fh = params.frame.h;

  const isCorner = ["nw", "ne", "se", "sw"].includes(params.handle);
  const effDx = params.alt ? params.deltaX * 2 : params.deltaX;
  const effDy = params.alt ? params.deltaY * 2 : params.deltaY;
  let dw = 0;
  let dh = 0;

  if (params.handle.includes("e")) dw += effDx;
  if (params.handle.includes("w")) dw -= effDx;
  if (params.handle.includes("s")) dh += effDy;
  if (params.handle.includes("n")) dh -= effDy;

  if (isCorner && params.shift) {
    const startRect = { x: -fw / 2, y: -fh / 2, w: fw, h: fh };
    const resized = applyCropResizeHandle(
      startRect,
      params.handle,
      params.deltaX,
      params.deltaY,
      {
        constraint: "free",
        aspect: null,
        shift: params.cropMode === "free",
        alt: params.alt,
      },
    );
    const newW = Math.max(minSize, resized.w);
    const newH = Math.max(minSize, resized.h);
    const resultCenterX = resized.x + resized.w / 2;
    const resultCenterY = resized.y + resized.h / 2;
    return {
      frame: {
        x: params.frame.x + (fw - newW) / 2,
        y: params.frame.y + (fh - newH) / 2,
        w: newW,
        h: newH,
      },
      compensation: {
        x: params.alt ? 0 : -resultCenterX || 0,
        y: params.alt ? 0 : -resultCenterY || 0,
      },
    };
  }

  const useAspect = (params.cropMode === "size" || params.cropMode === "ratio")
    && !params.shift
    && params.aspect && params.aspect.w > 0 && params.aspect.h > 0
    ? params.aspect.w / params.aspect.h
    : null;

  let newW: number;
  let newH: number;

  if (useAspect) {
    if (params.handle === "n" || params.handle === "s") {
      newH = Math.max(minSize, fh + dh);
      newW = newH * useAspect;
    } else if (params.handle === "e" || params.handle === "w") {
      newW = Math.max(minSize, fw + dw);
      newH = newW / useAspect;
    } else {
      // Corner: diagonal projection for smooth monotonic resize
      const hx = params.handle === "se" || params.handle === "ne" ? 1 : -1;
      const hy = params.handle === "se" || params.handle === "sw" ? 1 : -1;
      const projected = effDx * hx + effDy * hy;
      const sumWH = fw + fh;
      const minFactor = Math.max(1 / fw, useAspect / fw);
      const factor = Math.max(minFactor, 1 + projected / sumWH);
      newW = Math.max(minSize, fw * factor);
      newH = newW / useAspect;
    }
  } else {
    newW = Math.max(minSize, fw + dw);
    newH = Math.max(minSize, fh + dh);
  }

  const actualDw = newW - fw;
  const actualDh = newH - fh;

  return {
    frame: {
      x: params.frame.x + (fw - newW) / 2,
      y: params.frame.y + (fh - newH) / 2,
      w: newW,
      h: newH,
    },
    compensation: {
      x: params.alt ? 0 : (params.handle.includes("w") ? actualDw : -actualDw) / 2 || 0,
      y: params.alt ? 0 : (params.handle.includes("n") ? actualDh : -actualDh) / 2 || 0,
    },
  };
}

export function screenPointToModernDocumentPoint(
  screen: { x: number; y: number },
  viewport: ModernCropViewport,
  transform: ModernCropImageTransform,
  frame?: ModernCropFrame,
) {
  const scale = viewport.zoom * transform.scale;
  const pivot = frame
    ? getModernCropImagePivot({ frame, viewport, transform }).screen
    : { x: viewport.width / 2, y: viewport.height / 2 };
  const pivotDocument = {
    x: (pivot.x - viewport.panX - transform.offsetX) / scale,
    y: (pivot.y - viewport.panY - transform.offsetY) / scale,
  };

  if (transform.rotation === 0 && transform.scale === 1) {
    return {
      x: (screen.x - viewport.panX - transform.offsetX) / viewport.zoom,
      y: (screen.y - viewport.panY - transform.offsetY) / viewport.zoom,
    };
  }

  const rad = (-transform.rotation * Math.PI) / 180;
  const translatedX = screen.x - pivot.x;
  const translatedY = screen.y - pivot.y;
  const rotatedX = translatedX * Math.cos(rad) - translatedY * Math.sin(rad);
  const rotatedY = translatedX * Math.sin(rad) + translatedY * Math.cos(rad);

  return {
    x: pivotDocument.x + rotatedX / scale,
    y: pivotDocument.y + rotatedY / scale,
  };
}

export function modernScreenDeltaToImageOffsetDelta(
  delta: { x: number; y: number },
  rotation: number,
) {
  const rad = (-rotation * Math.PI) / 180;
  return {
    x: delta.x * Math.cos(rad) - delta.y * Math.sin(rad),
    y: delta.x * Math.sin(rad) + delta.y * Math.cos(rad),
  };
}

export function modernFrameToCropRect(params: {
  frame: ModernCropFrame;
  viewport: ModernCropViewport;
  transform: ModernCropImageTransform;
}) {
  const pivot = getModernCropImagePivot(params).document;
  const scale = params.viewport.zoom * params.transform.scale;
  const width = params.frame.w / scale;
  const height = params.frame.h / scale;

  return {
    x: pivot.x - width / 2,
    y: pivot.y - height / 2,
    w: width,
    h: height,
  };
}
