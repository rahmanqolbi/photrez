import { getLayerCorners } from "./transformGeometry";
import type { Transform2D } from "../engine/types";

export interface LayerHit {
  id: string;
}

function pointInPolygon(px: number, py: number, corners: { x: number; y: number }[]): boolean {
  let inside = false;
  const n = corners.length;
  for (let i = 0, j = n - 1; i < n; j = i++) {
    const xi = corners[i].x, yi = corners[i].y;
    const xj = corners[j].x, yj = corners[j].y;
    if ((yi > py) !== (yj > py) && px < ((xj - xi) * (py - yi)) / (yj - yi) + xi) {
      inside = !inside;
    }
  }
  return inside;
}

export interface LayerInfo {
  id: string;
  transform: Transform2D;
  width: number;
  height: number;
  visible: boolean;
  locked: boolean;
}

export function hitTestLayer(
  point: { x: number; y: number },
  layer: LayerInfo
): boolean {
  if (!layer.visible) return false;
  const corners = getLayerCorners(layer.transform, layer.width, layer.height);
  return pointInPolygon(point.x, point.y, corners);
}

export function hitTestLayers(
  point: { x: number; y: number },
  layers: LayerInfo[]
): LayerHit | null {
  for (const layer of layers) {
    if (!layer.visible) continue;
    const corners = getLayerCorners(layer.transform, layer.width, layer.height);
    if (pointInPolygon(point.x, point.y, corners)) {
      return { id: layer.id };
    }
  }
  return null;
}
