import type { CropRect } from "./cropGeometry";
import type { SnapLine } from "./smartGuides";

export interface CropSnapLayerTarget {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface CropSnapTargets {
  x: number[];
  y: number[];
}

const MIN_GUIDE_EXTENT = 10000;

export function buildCropSnapTargets(
  docW: number,
  docH: number,
  layers: CropSnapLayerTarget[],
): CropSnapTargets {
  const snapTargetsX = new Set<number>([0, docW, docW / 2]);
  const snapTargetsY = new Set<number>([0, docH, docH / 2]);

  for (const layer of layers) {
    snapTargetsX.add(layer.x);
    snapTargetsX.add(layer.x + layer.w);
    snapTargetsX.add(layer.x + layer.w / 2);
    snapTargetsY.add(layer.y);
    snapTargetsY.add(layer.y + layer.h);
    snapTargetsY.add(layer.y + layer.h / 2);
  }

  return {
    x: [...snapTargetsX],
    y: [...snapTargetsY],
  };
}

type EdgeSnap = "left" | "right" | "top" | "bottom" | "centerX" | "centerY";

function edgesForHandle(handle: string): EdgeSnap[] {
  const isLeft = handle.includes("w");
  const isRight = handle.includes("e");
  const isTop = handle.includes("n");
  const isBottom = handle.includes("s");

  if (handle === "move") {
    return ["left", "right", "centerX", "top", "bottom", "centerY"];
  }
  if (handle === "n" || handle === "s") {
    return [isTop ? "top" : "bottom", "centerX"];
  }
  if (handle === "e" || handle === "w") {
    return [isLeft ? "left" : "right", "centerY"];
  }
  const edges: EdgeSnap[] = [];
  if (isLeft) edges.push("left");
  if (isRight) edges.push("right");
  if (isTop) edges.push("top");
  if (isBottom) edges.push("bottom");
  return edges;
}

function edgeValue(rect: CropRect, edge: EdgeSnap): number {
  switch (edge) {
    case "left":
      return rect.x;
    case "right":
      return rect.x + rect.w;
    case "centerX":
      return rect.x + rect.w / 2;
    case "top":
      return rect.y;
    case "bottom":
      return rect.y + rect.h;
    case "centerY":
      return rect.y + rect.h / 2;
  }
}

function applyEdgeSnap(rect: CropRect, edge: EdgeSnap, target: number, isMove: boolean): CropRect {
  if (isMove) {
    switch (edge) {
      case "left":
        return { ...rect, x: target };
      case "right":
        return { ...rect, x: target - rect.w };
      case "centerX":
        return { ...rect, x: target - rect.w / 2 };
      case "top":
        return { ...rect, y: target };
      case "bottom":
        return { ...rect, y: target - rect.h };
      case "centerY":
        return { ...rect, y: target - rect.h / 2 };
    }
  }

  switch (edge) {
    case "left":
      return { ...rect, x: target, w: rect.w + (rect.x - target) };
    case "right":
      return { ...rect, w: target - rect.x };
    case "centerX": {
      const nx = target - rect.w / 2;
      return { ...rect, x: nx };
    }
    case "top":
      return { ...rect, y: target, h: rect.h + (rect.y - target) };
    case "bottom":
      return { ...rect, h: target - rect.y };
    case "centerY": {
      const ny = target - rect.h / 2;
      return { ...rect, y: ny };
    }
  }
}

function snapAxis(
  rect: CropRect,
  edges: EdgeSnap[],
  targets: number[],
  threshold: number,
  axis: "x" | "y",
  isMove: boolean,
): { rect: CropRect; line: SnapLine | null } {
  let bestDist = threshold + 1;
  let bestEdge: EdgeSnap | null = null;
  let bestTarget = 0;

  for (const edge of edges) {
    if ((axis === "x" && (edge === "top" || edge === "bottom" || edge === "centerY")) ||
        (axis === "y" && (edge === "left" || edge === "right" || edge === "centerX"))) {
      continue;
    }
    const value = edgeValue(rect, edge);
    for (const target of targets) {
      const dist = Math.abs(value - target);
      if (dist < bestDist) {
        bestDist = dist;
        bestEdge = edge;
        bestTarget = target;
      }
    }
  }

  if (bestEdge === null) {
    return { rect, line: null };
  }

  const snapped = applyEdgeSnap(rect, bestEdge, bestTarget, isMove);
  const line: SnapLine =
    axis === "x"
      ? {
          x1: bestTarget,
          y1: -MIN_GUIDE_EXTENT,
          x2: bestTarget,
          y2: MIN_GUIDE_EXTENT,
        }
      : {
          x1: -MIN_GUIDE_EXTENT,
          y1: bestTarget,
          x2: MIN_GUIDE_EXTENT,
          y2: bestTarget,
        };

  return { rect: snapped, line };
}

/**
 * Crop snapping against canvas edges/centers and visible layer edges/centers.
 * Handle-aware so resize snaps the dragged edges, not only translation.
 */
export function snapCropRect(
  rect: CropRect,
  handle: string,
  targets: CropSnapTargets,
  threshold: number,
): { rect: CropRect; lines: SnapLine[] } {
  const edges = edgesForHandle(handle);
  const lines: SnapLine[] = [];
  const isMove = handle === "move";

  const xSnap = snapAxis(rect, edges, targets.x, threshold, "x", isMove);
  rect = xSnap.rect;
  if (xSnap.line) lines.push(xSnap.line);

  const ySnap = snapAxis(rect, edges, targets.y, threshold, "y", isMove);
  rect = ySnap.rect;
  if (ySnap.line) lines.push(ySnap.line);

  return { rect, lines };
}
