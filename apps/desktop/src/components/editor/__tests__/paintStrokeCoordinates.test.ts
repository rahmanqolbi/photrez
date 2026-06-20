import { describe, expect, it } from "vitest";
import type { LayerNode, Transform2D } from "@/engine/types";
import { getBrushTip, stampBrushTip } from "../brushTipMask";
import {
  mapPaintPointToLayerLocal,
  mapPaintStrokeToLayerLocal,
} from "../paintStrokeCoordinates";

function makeLayer(transform: Transform2D, width = 20, height = 10): LayerNode {
  return {
    id: "paint-layer",
    name: "Paint Layer",
    type: "raster",
    visible: true,
    opacity: 1,
    locked: false,
    blendMode: "normal",
    transform,
    width,
    height,
    imageBitmap: null,
  };
}

function localToDocument(local: { x: number; y: number }, layer: LayerNode) {
  const { transform, width, height } = layer;
  const center = {
    x: transform.x + (width * Math.abs(transform.scaleX)) / 2,
    y: transform.y + (height * Math.abs(transform.scaleY)) / 2,
  };
  const flipX = transform.flipH ? -1 : 1;
  const flipY = transform.flipV ? -1 : 1;
  const rel = {
    x: (local.x - width / 2) * transform.scaleX * flipX,
    y: (local.y - height / 2) * transform.scaleY * flipY,
  };
  const rad = transform.rotation * Math.PI / 180;
  return {
    x: center.x + rel.x * Math.cos(rad) - rel.y * Math.sin(rad),
    y: center.y + rel.x * Math.sin(rad) + rel.y * Math.cos(rad),
  };
}

describe("paint stroke coordinate mapping", () => {
  it("maps transformed document points to the intended layer-local paint pixels", () => {
    const layer = makeLayer({
      x: 100,
      y: 50,
      scaleX: 2,
      scaleY: 1,
      rotation: 90,
      flipH: false,
      flipV: false,
    });
    const targetLocal = { x: 12, y: 5 };
    const docPoint = localToDocument(targetLocal, layer);

    const local = mapPaintPointToLayerLocal(docPoint, layer);

    expect(local.x).toBeCloseTo(targetLocal.x);
    expect(local.y).toBeCloseTo(targetLocal.y);
  });

  it("accounts for flipped layer texture coordinates before painting", () => {
    const layer = makeLayer({
      x: 0,
      y: 0,
      scaleX: 1,
      scaleY: 1,
      rotation: 0,
      flipH: true,
      flipV: false,
    }, 10, 10);
    const targetLocal = { x: 2, y: 5 };
    const docPoint = localToDocument(targetLocal, layer);

    const local = mapPaintPointToLayerLocal(docPoint, layer);

    expect(local.x).toBeCloseTo(targetLocal.x);
    expect(local.y).toBeCloseTo(targetLocal.y);
  });

  it("stamps the brush mask at the mapped local pixel for transformed layers", () => {
    const layer = makeLayer({
      x: 100,
      y: 50,
      scaleX: 2,
      scaleY: 1,
      rotation: 90,
      flipH: false,
      flipV: false,
    });
    const targetLocal = { x: 12, y: 5 };
    const [local] = mapPaintStrokeToLayerLocal([localToDocument(targetLocal, layer)], layer);
    const mask = new Uint8ClampedArray(layer.width * layer.height);
    const tip = getBrushTip({ size: 3, hardness: 1, curve: "soft" });

    stampBrushTip(mask, layer.width, layer.height, tip, local.x, local.y, 1);

    expect(mask[targetLocal.y * layer.width + targetLocal.x]).toBeGreaterThan(0);
    expect(mask[0]).toBe(0);
  });
});
