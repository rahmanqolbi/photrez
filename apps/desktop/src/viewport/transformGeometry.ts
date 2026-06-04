import type { Transform2D } from "../engine/types";

export interface Point { x: number; y: number; }

const DEG = Math.PI / 180;
const HANDLE_HIT = 16;
const ROTATE_THRESHOLD = 250;

function rotatePoint(point: Point, center: Point, deg: number): Point {
  // Positive deg = CW rotation in screen space (Y-down)
  const rad = deg * DEG;
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

  // Visual rect is always [x, y, effW, effH]; flipH/flipV only mirror texture in shader
  const rawCorners: Point[] = [
    { x: transform.x, y: transform.y },
    { x: transform.x + effW, y: transform.y },
    { x: transform.x + effW, y: transform.y + effH },
    { x: transform.x, y: transform.y + effH },
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

export function getNearestRotateCorner(
  point: Point,
  transform: Transform2D,
  w: number,
  h: number
): "nw" | "ne" | "se" | "sw" {
  const center = getLayerCenter(transform, w, h);
  const local = rotatePoint(point, center, -transform.rotation);
  const effW = w * Math.abs(transform.scaleX);
  const effH = h * Math.abs(transform.scaleY);
  const cx = transform.x + effW / 2;
  const cy = transform.y + effH / 2;

  if (local.x <= cx && local.y <= cy) return "nw";
  if (local.x > cx && local.y <= cy) return "ne";
  if (local.x > cx && local.y > cy) return "se";
  return "sw";
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

  const effW = w * Math.abs(transform.scaleX);
  const effH = h * Math.abs(transform.scaleY);
  const rX = transform.x;
  const rY = transform.y;

  const handleHit = HANDLE_HIT / zoom;
  const rotateThresh = ROTATE_THRESHOLD / zoom;

  const corners: Array<{ id: string; x: number; y: number }> = [
    { id: "nw", x: rX, y: rY },
    { id: "ne", x: rX + effW, y: rY },
    { id: "se", x: rX + effW, y: rY + effH },
    { id: "sw", x: rX, y: rY + effH },
  ];

  for (const c of corners) {
    if (Math.hypot(local.x - c.x, local.y - c.y) <= handleHit) return c.id;
  }

  const sides: Array<{ id: string; x: number; y: number }> = [
    { id: "n", x: rX + effW / 2, y: rY },
    { id: "e", x: rX + effW, y: rY + effH / 2 },
    { id: "s", x: rX + effW / 2, y: rY + effH },
    { id: "w", x: rX, y: rY + effH / 2 },
  ];

  for (const s of sides) {
    if (Math.hypot(local.x - s.x, local.y - s.y) <= handleHit) return s.id;
  }

  const insideCore =
    local.x >= rX &&
    local.x <= rX + effW &&
    local.y >= rY &&
    local.y <= rY + effH;

  if (insideCore) return "move";

  const isOutside =
    local.x < rX ||
    local.x > rX + effW ||
    local.y < rY ||
    local.y > rY + effH;

  if (isOutside) {
    const expanded = {
      x: rX - rotateThresh,
      y: rY - rotateThresh,
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

  const absSX = Math.abs(transform.scaleX);
  const absSY = Math.abs(transform.scaleY);

  let vw = layerW * absSX;
  let vh = layerH * absSY;
  let vx = transform.x;
  let vy = transform.y;

  let localDx = altKey ? dx * 2 : dx;
  let localDy = altKey ? dy * 2 : dy;

  const corner = ["nw", "ne", "se", "sw"].includes(handle);
  const shouldKeepAspect = corner && !shiftKey;

  if (shouldKeepAspect) {
    // Photoshop-style proportional corner resize:
    // project mouse delta onto the handle-axis diagonal (cursor direction at 45°).
    // Movement along the handle axis drives proportional scale;
    // movement perpendicular to the handle axis is ignored.
    const oldW = layerW * absSX;
    const oldH = layerH * absSY;

    // Handle-axis: SE=(1,1), NE=(1,-1), SW=(-1,1), NW=(-1,-1)
    const hx = handle === "se" || handle === "ne" ? 1 : -1;
    const hy = handle === "se" || handle === "sw" ? 1 : -1;
    const sumWH = oldW + oldH;

    if (sumWH > 0) {
      const projected = localDx * hx + localDy * hy;
      const minFactor = Math.max(1 / oldW, 1 / oldH);
      const factor = Math.max(minFactor, 1 + projected / sumWH);

      vw = oldW * factor;
      vh = oldH * factor;

      if (handle.includes("w")) vx = transform.x + oldW - vw;
      if (handle.includes("n")) vy = transform.y + oldH - vh;
    }
  } else {
    // Non-corner or Shift-free: independent axis delta
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
  }

  if (altKey) {
    const cx = vx + vw / 2;
    const cy = vy + vh / 2;
    vx = transform.x - (vw - layerW * absSX) / 2;
    vy = transform.y - (vh - layerH * absSY) / 2;
  }

  const newCenterX = vx + vw / 2;
  const newCenterY = vy + vh / 2;

  const newSX = Math.abs(transform.scaleX) * (vw / (layerW * absSX));
  const newSY = Math.abs(transform.scaleY) * (vh / (layerH * absSY));

  return {
    ...transform,
    scaleX: newSX,
    scaleY: newSY,
    x: vx,
    y: vy,
  };
}

export function normalizeRotation(angleDeg: number): number {
  let angle = angleDeg % 360;
  if (angle > 180) angle -= 360;
  if (angle < -180) angle += 360;
  return angle;
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
  return normalizeRotation(result);
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
