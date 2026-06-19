import type { LayerNode } from "@/engine/types";
import { documentToLayerLocal } from "@/viewport/transformGeometry";

export interface PaintPoint {
  x: number;
  y: number;
}

export function mapPaintPointToLayerLocal(point: PaintPoint, layer: LayerNode): PaintPoint {
  return documentToLayerLocal(point.x, point.y, layer.transform, layer.width, layer.height);
}

export function mapPaintStrokeToLayerLocal(points: readonly PaintPoint[], layer: LayerNode): PaintPoint[] {
  return points.map((point) => mapPaintPointToLayerLocal(point, layer));
}
