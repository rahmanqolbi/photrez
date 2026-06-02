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

describe("flip semantics", () => {
  it("getLayerCorners same rect regardless of flipH", () => {
    const base = getLayerCorners(makeLayer().transform, LAYER_W, LAYER_H);
    const flipped = getLayerCorners(makeLayer({ flipH: true }).transform, LAYER_W, LAYER_H);
    for (let i = 0; i < 4; i++) {
      expect(flipped[i].x).toBe(base[i].x);
      expect(flipped[i].y).toBe(base[i].y);
    }
  });

  it("getLayerAabb same rect regardless of flipH", () => {
    const base = getLayerAabb(makeLayer().transform, LAYER_W, LAYER_H);
    const flipped = getLayerAabb(makeLayer({ flipH: true }).transform, LAYER_W, LAYER_H);
    expect(flipped.x).toBe(base.x);
    expect(flipped.y).toBe(base.y);
    expect(flipped.width).toBe(base.width);
    expect(flipped.height).toBe(base.height);
  });

  it("applyResizeHandle returns positive scaleX even when flipH is true", () => {
    const start = { ...BASE_TRANSFORM, scaleX: 1, scaleY: 1, x: 100, y: 100, flipH: true };
    const result = applyResizeHandle(start, LAYER_W, LAYER_H, "se", 50, 0, false, false);
    expect(result.scaleX).toBeGreaterThan(0);
    expect(result.flipH).toBe(true);
  });

  it("applyResizeHandle preserves flipH boolean", () => {
    const start = { ...BASE_TRANSFORM, scaleX: 1, scaleY: 1, x: 100, y: 100, flipH: true };
    const result = applyResizeHandle(start, LAYER_W, LAYER_H, "se", 50, 0, true, false);
    expect(result.flipH).toBe(true);
    expect(result.scaleX).toBeGreaterThan(0);
  });
});

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
  it("resizes from SE handle along handle-axis projection", () => {
    const start = { ...BASE_TRANSFORM, scaleX: 1, scaleY: 1, x: 100, y: 100 };
    // dx=50, dy=0 → projected onto SE handle axis (1,1) = 50
    // sumWH = 200+100 = 300 → factor = 1 + 50/300 ≈ 1.1667
    const result = applyResizeHandle(start, LAYER_W, LAYER_H, "se", 50, 0, false, false);
    expect(result.scaleX).toBeCloseTo(1.1667, 4);
    expect(result.scaleY).toBeCloseTo(1.1667, 4);
    expect(result.x).toBeCloseTo(100, 4);
    expect(result.y).toBeCloseTo(100, 4);
  });

  it("allows free scaling with Shift", () => {
    const start = { ...BASE_TRANSFORM, scaleX: 1, scaleY: 1, x: 100, y: 100 };
    const result = applyResizeHandle(start, LAYER_W, LAYER_H, "se", 50, 0, true, false);
    expect(result.scaleX).toBeCloseTo(1.25);
    expect(result.scaleY).toBe(1);
  });

  it("scales from center with Alt using handle-axis projection", () => {
    const start = { ...BASE_TRANSFORM, scaleX: 1, scaleY: 1, x: 100, y: 100 };
    // alt doubles dx to 100 → projected onto (1,1) = 100
    // sumWH = 300 → factor = 1 + 100/300 = 1.3333
    const result = applyResizeHandle(start, LAYER_W, LAYER_H, "se", 50, 0, false, true);
    expect(result.scaleX).toBeCloseTo(1.3333, 4);
    expect(result.scaleY).toBeCloseTo(1.3333, 4);
    expect(result.x).toBeCloseTo(66.6667, 4);
    expect(result.y).toBeCloseTo(83.3333, 4);
  });

  it("ignores 45° NE/SW gesture on SE handle (regression: photoshop-style handle-axis)", () => {
    // User drags at 45° across the handle (e.g. NE/SW direction on SE handle)
    // → no size change because movement is perpendicular to SE handle axis (1,1)
    const start = { ...BASE_TRANSFORM, scaleX: 1, scaleY: 1, x: 100, y: 100 };
    const result = applyResizeHandle(start, LAYER_W, LAYER_H, "se", 20, -20, false, false);
    expect(result.scaleX).toBeCloseTo(1, 4);
    expect(result.scaleY).toBeCloseTo(1, 4);
    expect(result.x).toBeCloseTo(100, 4);
    expect(result.y).toBeCloseTo(100, 4);
  });

  it.each([
    // Handle-axis perpendicular: SE=(1,1) → perp (1,-1); NE=(1,-1) → perp (1,1);
    // SW=(-1,1) → perp (-1,-1); NW=(-1,-1) → perp (-1,1)
    ["se", 20, -20, 100, 100],
    ["ne", 20, 20, 100, 100],
    ["sw", -20, -20, 100, 100],
    ["nw", -20, 20, 100, 100],
  ])("ignores perpendicular drag for proportional %s corner resize", (handle, dx, dy, ex, ey) => {
    const start = { ...BASE_TRANSFORM, scaleX: 1, scaleY: 1, x: 100, y: 100 };
    const result = applyResizeHandle(start, LAYER_W, LAYER_H, handle, dx, dy, false, false);
    expect(result.scaleX).toBeCloseTo(1, 4);
    expect(result.scaleY).toBeCloseTo(1, 4);
    expect(result.x).toBeCloseTo(ex, 4);
    expect(result.y).toBeCloseTo(ey, 4);
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
