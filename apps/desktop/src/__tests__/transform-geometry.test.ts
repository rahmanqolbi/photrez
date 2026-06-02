import { describe, it, expect } from "vitest";
import {
  getLayerCenter,
  getLayerCorners,
  getLayerAabb,
  pointToLayerLocal,
  detectHandle,
  applyResizeHandle,
  applyRotationDrag,
  getCursorForHandle,
} from "../viewport/transformGeometry";
import type { Transform2D } from "../engine/types";

const BASE_TRANSFORM: Transform2D = { x: 100, y: 100, scaleX: 1, scaleY: 1, rotation: 0, flipH: false, flipV: false };
const LAYER_W = 200;
const LAYER_H = 100;

function makeLayer(overrides: Partial<Transform2D> = {}) {
  return { transform: { ...BASE_TRANSFORM, ...overrides }, width: LAYER_W, height: LAYER_H } as const;
}

describe("getLayerCenter", () => {
  it("returns center of unrotated layer", () => {
    const c = getLayerCenter(makeLayer().transform, LAYER_W, LAYER_H);
    expect(c.x).toBe(200);
    expect(c.y).toBe(150);
  });
});

describe("getLayerCorners", () => {
  it("returns 4 corners for unrotated layer", () => {
    const c = getLayerCorners(makeLayer().transform, LAYER_W, LAYER_H);
    expect(c).toHaveLength(4);
    expect(c[0]).toEqual({ x: 100, y: 100 });
    expect(c[1]).toEqual({ x: 300, y: 100 });
    expect(c[2]).toEqual({ x: 300, y: 200 });
    expect(c[3]).toEqual({ x: 100, y: 200 });
  });

  it("returns rotated corners for 90-degree rotation", () => {
    const c = getLayerCorners(makeLayer({ rotation: 90 }).transform, LAYER_W, LAYER_H);
    // After 90° CW around center (200, 150):
    // TL(100,100) -> (150, 250)
    expect(c[0].x).toBeCloseTo(150);
    expect(c[0].y).toBeCloseTo(250);
    // TR(300,100) -> (150, 50)
    expect(c[1].x).toBeCloseTo(150);
    expect(c[1].y).toBeCloseTo(50);
    // BR(300,200) -> (250, 50)
    expect(c[2].x).toBeCloseTo(250);
    expect(c[2].y).toBeCloseTo(50);
    // BL(100,200) -> (250, 250)
    expect(c[3].x).toBeCloseTo(250);
    expect(c[3].y).toBeCloseTo(250);
  });

  it("handles flipped layer", () => {
    const c = getLayerCorners(makeLayer({ flipH: true, flipV: false }).transform, LAYER_W, LAYER_H);
    expect(c[0].x).toBe(100);
    expect(c[0].y).toBe(100);
  });
});

describe("getLayerAabb", () => {
  it("returns unrotated width/height", () => {
    const aabb = getLayerAabb(makeLayer().transform, LAYER_W, LAYER_H);
    expect(aabb.width).toBe(200);
    expect(aabb.height).toBe(100);
    expect(aabb.x).toBe(100);
    expect(aabb.y).toBe(100);
  });

  it("expands for 45-degree rotation", () => {
    const aabb = getLayerAabb(makeLayer({ rotation: 45 }).transform, LAYER_W, LAYER_H);
    expect(aabb.width).toBeGreaterThan(200);
    expect(aabb.height).toBeGreaterThan(100);
  });
});

describe("pointToLayerLocal", () => {
  it("returns same point for unrotated layer", () => {
    const local = pointToLayerLocal({ x: 150, y: 150 }, makeLayer().transform, LAYER_W, LAYER_H);
    expect(local.x).toBe(150);
    expect(local.y).toBe(150);
  });

  it("un-rotates point for 90-degree layer", () => {
    // Global point that is right of center -> should be below center in local
    const local = pointToLayerLocal({ x: 250, y: 150 }, makeLayer({ rotation: 90 }).transform, LAYER_W, LAYER_H);
    // (250,150) - center(200,150) = (50,0), after 90° CW inverse -> (0,50) -> local(200, 200)
    expect(local.x).toBeCloseTo(200);
    expect(local.y).toBeCloseTo(200);
  });
});

describe("detectHandle", () => {
  const zoom = 1;

  it("returns 'move' when inside unrotated layer", () => {
    const h = detectHandle({ x: 200, y: 150 }, makeLayer().transform, LAYER_W, LAYER_H, zoom);
    expect(h).toBe("move");
  });

  it("returns 'se' when near bottom-right corner", () => {
    const h = detectHandle({ x: 298, y: 198 }, makeLayer().transform, LAYER_W, LAYER_H, zoom);
    expect(h).toBe("se");
  });

  it("returns 'rotate' when outside corner zone", () => {
    const h = detectHandle({ x: 330, y: 130 }, makeLayer().transform, LAYER_W, LAYER_H, zoom);
    expect(h).toBe("rotate");
  });

  it("returns null when far outside", () => {
    const h = detectHandle({ x: 500, y: 500 }, makeLayer().transform, LAYER_W, LAYER_H, zoom);
    expect(h).toBeNull();
  });
});

describe("applyResizeHandle", () => {
  it("resizes from SE handle preserving aspect ratio by default", () => {
    const start = { ...BASE_TRANSFORM, scaleX: 1, scaleY: 1, x: 100, y: 100 };
    const result = applyResizeHandle(start, LAYER_W, LAYER_H, "se", 50, 0, false, false);
    expect(result.scaleX).toBeCloseTo(1.25);
    expect(result.scaleY).toBeCloseTo(1.25);
  });

  it("allows free scaling with Shift", () => {
    const start = { ...BASE_TRANSFORM, scaleX: 1, scaleY: 1, x: 100, y: 100 };
    const result = applyResizeHandle(start, LAYER_W, LAYER_H, "se", 50, 0, true, false);
    expect(result.scaleX).toBeCloseTo(1.25);
    expect(result.scaleY).toBe(1);
  });

  it("scales from center with Alt", () => {
    const start = { ...BASE_TRANSFORM, scaleX: 1, scaleY: 1, x: 100, y: 100 };
    const result = applyResizeHandle(start, LAYER_W, LAYER_H, "se", 50, 0, false, true);
    expect(result.scaleX).toBeCloseTo(1.5);
    expect(result.x).toBeCloseTo(50);
  });
});

describe("applyRotationDrag", () => {
  it("returns computed rotation", () => {
    const rot = applyRotationDrag({ x: 200, y: 150 }, { x: 200, y: 150 }, { x: 250, y: 150 }, 0);
    expect(rot).toBe(0);
  });

  it("snaps to 15 degrees with Shift", () => {
    const rot = applyRotationDrag({ x: 200, y: 150 }, { x: 250, y: 50 }, { x: 350, y: 150 }, 0, true);
    expect(rot).toBeCloseTo(60);
  });
});

describe("getCursorForHandle", () => {
  it("returns ew-resize for e handle at 0°", () => {
    expect(getCursorForHandle("e", 0, 1, 1)).toBe("ew-resize");
  });
  it("returns ns-resize for n handle at 0°", () => {
    expect(getCursorForHandle("n", 0, 1, 1)).toBe("ns-resize");
  });
  it("rotates with layer at 45°", () => {
    const c = getCursorForHandle("e", 45, 1, 1);
    expect(c).toBe("nwse-resize");
  });
});
