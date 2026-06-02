import type { Transform2D } from "../engine/types";

export interface Point { x: number; y: number; }

const DEG = Math.PI / 180;
const HANDLE_HIT = 16;
const ROTATE_THRESHOLD = 250;

function rotatePoint(point: Point, center: Point, deg: number): Point {
  // Negative: positive deg = CW rotation (Photoshop convention)
  const rad = -deg * DEG;
  const cos = Math.cos(rad);
  const sin = Math.sin(rad);
  const dx = point.x - center.x;
  const dy = point.y - center.y;
  return {
    x: center.x + dx * cos - dy * sin,
    y: center.y + dx * sin + dy * cos,
  };
}

export function getLayerCenter(transform: Transform2D, w: number, h: number): Point {
  const effW = w * Math.abs(transform.scaleX);
  const effH = h * Math.abs(transform.scaleY);
  return { x: transform.x + effW / 2, y: transform.y + effH / 2 };
}

export function getLayerCorners(transform: Transform2D, w: number, h: number): Point[] {
  const effW = w * Math.abs(transform.scaleX);
  const effH = h * Math.abs(transform.scaleY);

  const sxSign = Math.sign(transform.scaleX) * (transform.flipH ? -1 : 1);
  const sySign = Math.sign(transform.scaleY) * (transform.flipV ? -1 : 1);

  const effectiveW = sxSign < 0 ? -effW : effW;
  const effectiveH = sySign < 0 ? -effH : effH;

  const rawCorners: Point[] = [
    { x: transform.x, y: transform.y },
    { x: transform.x + effectiveW, y: transform.y },
    { x: transform.x + effectiveW, y: transform.y + effectiveH },
    { x: transform.x, y: transform.y + effectiveH },
  ];

  const center = getLayerCenter(transform, w, h);
  const rot = transform.rotation;
  if (rot === 0) return rawCorners;

  return rawCorners.map((c) => rotatePoint(c, center, rot));
}

export function getLayerAabb(transform: Transform2D, w: number, h: number) {
  const corners = getLayerCorners(transform, w, h);
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const c of corners) {
    if (c.x < minX) minX = c.x;
    if (c.y < minY) minY = c.y;
    if (c.x > maxX) maxX = c.x;
    if (c.y > maxY) maxY = c.y;
  }
  return { x: minX, y: minY, width: maxX - minX, height: maxY - minY };
}

export function pointToLayerLocal(point: Point, transform: Transform2D, w: number, h: number): Point {
  const center = getLayerCenter(transform, w, h);
  return rotatePoint(point, center, -transform.rotation);
}

export function detectHandle(
  point: Point,
  transform: Transform2D,
  w: number,
  h: number,
  zoom: number
): string | null {
  const center = getLayerCenter(transform, w, h);
  const local = rotatePoint(point, center, -transform.rotation);

  const sxSign = Math.sign(transform.scaleX) * (transform.flipH ? -1 : 1);
  const sySign = Math.sign(transform.scaleY) * (transform.flipV ? -1 : 1);
  const effW = w * Math.abs(transform.scaleX);
  const effH = h * Math.abs(transform.scaleY);
  const effectiveX = sxSign < 0 ? transform.x + effW : transform.x;
  const effectiveY = sySign < 0 ? transform.y + effH : transform.y;

  const handleHit = HANDLE_HIT / zoom;
  const rotateThresh = ROTATE_THRESHOLD / zoom;

  const corners: Array<{ id: string; x: number; y: number }> = [
    { id: "nw", x: effectiveX, y: effectiveY },
    { id: "ne", x: effectiveX + effW, y: effectiveY },
    { id: "se", x: effectiveX + effW, y: effectiveY + effH },
    { id: "sw", x: effectiveX, y: effectiveY + effH },
  ];

  for (const c of corners) {
    if (Math.hypot(local.x - c.x, local.y - c.y) <= handleHit) return c.id;
  }

  const sides: Array<{ id: string; x: number; y: number }> = [
    { id: "n", x: effectiveX + effW / 2, y: effectiveY },
    { id: "e", x: effectiveX + effW, y: effectiveY + effH / 2 },
    { id: "s", x: effectiveX + effW / 2, y: effectiveY + effH },
    { id: "w", x: effectiveX, y: effectiveY + effH / 2 },
  ];

  for (const s of sides) {
    if (Math.hypot(local.x - s.x, local.y - s.y) <= handleHit) return s.id;
  }

  const insideCore =
    local.x >= effectiveX &&
    local.x <= effectiveX + effW &&
    local.y >= effectiveY &&
    local.y <= effectiveY + effH;

  if (insideCore) return "move";

  const expanded = {
    x: effectiveX - rotateThresh,
    y: effectiveY - rotateThresh,
    w: effW + rotateThresh * 2,
    h: effH + rotateThresh * 2,
  };
  if (
    local.x >= expanded.x &&
    local.x <= expanded.x + expanded.w &&
    local.y >= expanded.y &&
    local.y <= expanded.y + expanded.h
  ) {
    return "rotate";
  }

  return null;
}

export function applyResizeHandle(
  transform: Transform2D,
  layerW: number,
  layerH: number,
  handle: string,
  screenDx: number,
  screenDy: number,
  shiftKey: boolean,
  altKey: boolean
): Transform2D {
  const rad = -transform.rotation * DEG;
  const cos = Math.cos(rad);
  const sin = Math.sin(rad);
  const dx = screenDx * cos - screenDy * sin;
  const dy = screenDx * sin + screenDy * cos;

  const sxSign = Math.sign(transform.scaleX) * (transform.flipH ? -1 : 1);
  const sySign = Math.sign(transform.scaleY) * (transform.flipV ? -1 : 1);

  const absSX = Math.abs(transform.scaleX);
  const absSY = Math.abs(transform.scaleY);

  let vw = layerW * absSX;
  let vh = layerH * absSY;
  let vx = sxSign < 0 ? transform.x + vw : transform.x;
  let vy = sySign < 0 ? transform.y + vh : transform.y;

  let localDx = altKey ? dx * 2 : dx;
  let localDy = altKey ? dy * 2 : dy;

  if (handle.includes("e")) vw = Math.max(1, vw + localDx);
  if (handle.includes("w")) {
    const dw = Math.min(vw - 1, -localDx);
    vx -= dw;
    vw += dw;
  }
  if (handle.includes("s")) vh = Math.max(1, vh + localDy);
  if (handle.includes("n")) {
    const dh = Math.min(vh - 1, -localDy);
    vy -= dh;
    vh += dh;
  }

  const corner = ["nw", "ne", "se", "sw"].includes(handle);
  const shouldKeepAspect = corner && !shiftKey;

  if (shouldKeepAspect && vw > 0 && vh > 0) {
    const aspect = (layerW * absSX) / (layerH * absSY);
    if (Math.abs(localDx) > Math.abs(localDy)) {
      const oldVH = vh;
      vh = vw / aspect;
      if (handle.includes("n")) vy -= vh - oldVH;
    } else {
      const oldVW = vw;
      vw = vh * aspect;
      if (handle.includes("w")) vx -= vw - oldVW;
    }
  }

  if (altKey) {
    vx = (sxSign < 0 ? transform.x + layerW * absSX : transform.x) - (vw - layerW * absSX) / 2;
    vy = (sySign < 0 ? transform.y + layerH * absSY : transform.y) - (vh - layerH * absSY) / 2;
  }

  const newCenterX = vx + vw / 2;
  const newCenterY = vy + vh / 2;

  const newSX = sxSign * (Math.abs(transform.scaleX) * (vw / (layerW * absSX)));
  const newSY = sySign * (Math.abs(transform.scaleY) * (vh / (layerH * absSY)));

  return {
    ...transform,
    scaleX: newSX,
    scaleY: newSY,
    x: newCenterX - (newSX * layerW) / 2,
    y: newCenterY - (newSY * layerH) / 2,
  };
}

export function applyRotationDrag(
  center: Point,
  startPoint: Point,
  currentPoint: Point,
  startRotation: number,
  shiftKey = false
): number {
  const startAngle = Math.atan2(startPoint.y - center.y, startPoint.x - center.x);
  const currentAngle = Math.atan2(currentPoint.y - center.y, currentPoint.x - center.x);
  let delta = ((currentAngle - startAngle) * 180) / Math.PI;
  let result = startRotation + delta;
  if (shiftKey) {
    result = Math.round(result / 15) * 15;
  }
  return result;
}

const HANDLE_BASE_ANGLES: Record<string, number> = {
  e: 0, se: 45, s: 90, sw: 135, w: 180, nw: 225, n: 270, ne: 315,
};

const RESIZE_CURSORS = [
  "ew-resize",
  "nwse-resize",
  "ns-resize",
  "nesw-resize",
  "ew-resize",
  "nwse-resize",
  "ns-resize",
  "nesw-resize",
];

export function getCursorForHandle(
  handle: string,
  rotation: number,
  scaleX: number,
  scaleY: number
): string {
  const baseAngle = HANDLE_BASE_ANGLES[handle] ?? 0;
  const visualRotation = scaleX * scaleY < 0 ? -rotation : rotation;
  const totalAngle = (((baseAngle + visualRotation) % 360) + 360) % 360;
  const index = Math.round(totalAngle / 45) % 8;
  return RESIZE_CURSORS[index];
}
