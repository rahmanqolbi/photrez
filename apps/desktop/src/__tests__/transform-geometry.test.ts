import { describe, it, expect } from "vitest";
import {
  getLayerCenter,
  getLayerCorners,
  getLayerAabb,
  pointToLayerLocal,
  detectHandle,
  getNearestRotateCorner,
  applyResizeHandle,
  applyRotationDrag,
  normalizeRotation,
  getCursorForHandle,
  documentToLayerLocal,
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

  it("returns rotated corners for 90-degree rotation (CW)", () => {
    const c = getLayerCorners(makeLayer({ rotation: 90 }).transform, LAYER_W, LAYER_H);
    // After 90° CW around center (200, 150):
    // TL(100,100) -> (250, 50)
    expect(c[0].x).toBeCloseTo(250);
    expect(c[0].y).toBeCloseTo(50);
    // TR(300,100) -> (250, 250)
    expect(c[1].x).toBeCloseTo(250);
    expect(c[1].y).toBeCloseTo(250);
    // BR(300,200) -> (150, 250)
    expect(c[2].x).toBeCloseTo(150);
    expect(c[2].y).toBeCloseTo(250);
    // BL(100,200) -> (150, 50)
    expect(c[3].x).toBeCloseTo(150);
    expect(c[3].y).toBeCloseTo(50);
  });

  it("returns rotated corners for -90-degree rotation (CCW)", () => {
    const c = getLayerCorners(makeLayer({ rotation: -90 }).transform, LAYER_W, LAYER_H);
    // TL(100,100) rel=(-100,-50), cos(-90)=0 sin(-90)=-1
    // x'=-100*0-(-50)*(-1)=-50, y'=-100*(-1)+(-50)*0=100
    // Absolute: (150, 250)
    expect(c[0].x).toBeCloseTo(150);
    expect(c[0].y).toBeCloseTo(250);
    // TR(300,100) rel=(100,-50): x'=-50, y'=-100 → (150, 50)
    expect(c[1].x).toBeCloseTo(150);
    expect(c[1].y).toBeCloseTo(50);
    // BR(300,200) rel=(100,50): x'=50, y'=-100 → (250, 50)
    expect(c[2].x).toBeCloseTo(250);
    expect(c[2].y).toBeCloseTo(50);
    // BL(100,200) rel=(-100,50): x'=50, y'=100 → (250, 250)
    expect(c[3].x).toBeCloseTo(250);
    expect(c[3].y).toBeCloseTo(250);
  });

  it("45° CW rotation moves TL corner toward top-center", () => {
    const c = getLayerCorners(makeLayer({ rotation: 45 }).transform, LAYER_W, LAYER_H);
    // TL(100,100) rel=(-100,-50), cos45=sin45=0.707
    // x'=-100*0.707-(-50)*0.707=-35.35, y'=-100*0.707+(-50)*0.707=-106.05
    // Absolute: (164.65, 43.95)
    expect(c[0].x).toBeCloseTo(164.65, 1);
    expect(c[0].y).toBeCloseTo(43.95, 1);
  });

  it("180° rotation mirrors corners through center", () => {
    const c = getLayerCorners(makeLayer({ rotation: 180 }).transform, LAYER_W, LAYER_H);
    // 180° CW: (x,y) -> (2*cx - x, 2*cy - y)
    expect(c[0].x).toBeCloseTo(300);
    expect(c[0].y).toBeCloseTo(200);
    expect(c[1].x).toBeCloseTo(100);
    expect(c[1].y).toBeCloseTo(200);
    expect(c[2].x).toBeCloseTo(100);
    expect(c[2].y).toBeCloseTo(100);
    expect(c[3].x).toBeCloseTo(300);
    expect(c[3].y).toBeCloseTo(100);
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
    const local = pointToLayerLocal({ x: 250, y: 150 }, makeLayer({ rotation: 90 }).transform, LAYER_W, LAYER_H);
    expect(local.x).toBeCloseTo(200);
    expect(local.y).toBeCloseTo(100);
  });

  it("round-trips through getLayerCorners for 45° rotation", () => {
    const rot = 45;
    const transform = makeLayer({ rotation: rot }).transform;
    const corners = getLayerCorners(transform, LAYER_W, LAYER_H);
    // Each corner should un-rotate back to its original position
    const originalCorners = [
      { x: 100, y: 100 },
      { x: 300, y: 100 },
      { x: 300, y: 200 },
      { x: 100, y: 200 },
    ];
    for (let i = 0; i < 4; i++) {
      const local = pointToLayerLocal(corners[i], transform, LAYER_W, LAYER_H);
      expect(local.x).toBeCloseTo(originalCorners[i].x, 3);
      expect(local.y).toBeCloseTo(originalCorners[i].y, 3);
    }
  });

  it("un-rotates point for -90° rotation (CCW)", () => {
    // Layer rotated -90° CCW. BR(300,200) -> (250, 50)
    // Click at (250, 50) should un-rotate to BR(300, 200)
    const local = pointToLayerLocal({ x: 250, y: 50 }, makeLayer({ rotation: -90 }).transform, LAYER_W, LAYER_H);
    expect(local.x).toBeCloseTo(300);
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

  it("returns 'move' inside core even within expanded bounds (not rotate)", () => {
    const h = detectHandle({ x: 200, y: 150 }, makeLayer().transform, LAYER_W, LAYER_H, zoom);
    expect(h).toBe("move");
  });

  it("does not return 'rotate' for points inside core even if within expanded bounds", () => {
    const h = detectHandle({ x: 150, y: 120 }, makeLayer().transform, LAYER_W, LAYER_H, zoom);
    expect(h).toBe("move");
  });

  describe("with rotation", () => {
    it("returns 'ne' near NE corner of 45° CW rotated layer", () => {
      // 45° CW: NE(300,100) rel=(100,-50)
      // rotatePoint rel=(100,-50) by +45: x=106.07, y=35.355
      // Abs: (306.07, 185.36)
      const h = detectHandle({ x: 306, y: 185 }, makeLayer({ rotation: 45 }).transform, LAYER_W, LAYER_H, zoom);
      expect(h).toBe("ne");
    });

    it("returns 'nw' near NW corner of -90° CCW rotated layer", () => {
      // -90° CCW: TL(100,100) rel=(-100,-50), cos=0 sin=-1
      // x' = -100*0 - (-50)*(-1) = -50, y' = -100*(-1) + (-50)*0 = 100
      // Abs: (150, 250)
      const h = detectHandle({ x: 150, y: 250 }, makeLayer({ rotation: -90 }).transform, LAYER_W, LAYER_H, zoom);
      expect(h).toBe("nw");
    });

    it("returns 'se' near SE corner of 30° CW rotated layer", () => {
      // 30° CW: SE(300,200) rel=(100,50), cos30=0.866 sin30=0.5
      // x'=100*0.866-50*0.5=61.6, y'=100*0.5+50*0.866=93.3
      // Abs: (261.6, 243.3)
      const h = detectHandle({ x: 262, y: 243 }, makeLayer({ rotation: 30 }).transform, LAYER_W, LAYER_H, zoom);
      expect(h).toBe("se");
    });

    it("returns 'w' near left edge of 90° CW rotated layer", () => {
      // 90° CW: left-edge center(100,150) rel=(-100,0)
      // x'=-100*0-0*1=0, y'=-100*1+0*0=-100
      // Abs: (200, 50). Local after un-rotate: (100, 150) -> distance 0 from 'w'
      const h = detectHandle({ x: 200, y: 50 }, makeLayer({ rotation: 90 }).transform, LAYER_W, LAYER_H, zoom);
      expect(h).toBe("w");
    });

    it("returns 'move' inside rotated layer at center", () => {
      const h = detectHandle({ x: 200, y: 150 }, makeLayer({ rotation: 45 }).transform, LAYER_W, LAYER_H, zoom);
      expect(h).toBe("move");
    });

    it("returns null outside rotated layer", () => {
      const h = detectHandle({ x: 200, y: 600 }, makeLayer({ rotation: 45 }).transform, LAYER_W, LAYER_H, zoom);
      expect(h).toBeNull();
    });
  });
});

describe("getNearestRotateCorner", () => {
  it("returns nw for top-left local", () => {
    expect(getNearestRotateCorner({ x: 80, y: 80 }, makeLayer().transform, LAYER_W, LAYER_H)).toBe("nw");
  });

  it("returns ne for top-right local", () => {
    expect(getNearestRotateCorner({ x: 330, y: 80 }, makeLayer().transform, LAYER_W, LAYER_H)).toBe("ne");
  });

  it("returns se for bottom-right local", () => {
    expect(getNearestRotateCorner({ x: 330, y: 230 }, makeLayer().transform, LAYER_W, LAYER_H)).toBe("se");
  });

  it("returns sw for bottom-left local", () => {
    expect(getNearestRotateCorner({ x: 80, y: 230 }, makeLayer().transform, LAYER_W, LAYER_H)).toBe("sw");
  });

  it("returns ne at the top of a 90° CW rotated layer (original right edge)", () => {
    // 90° CW: original TR(300,100) -> (250, 250). Click at (250, 248) -> unrotate to (299, 99) -> ne
    const result = getNearestRotateCorner({ x: 250, y: 248 }, makeLayer({ rotation: 90 }).transform, LAYER_W, LAYER_H);
    expect(result).toBe("ne");
  });

  it("returns nw at the left of a 90° CW rotated layer (original top)", () => {
    // 90° CW: original TL(100,100) -> (250, 50). Click at (248, 50) -> unrotate to (101, 101) -> nw
    const result = getNearestRotateCorner({ x: 248, y: 50 }, makeLayer({ rotation: 90 }).transform, LAYER_W, LAYER_H);
    expect(result).toBe("nw");
  });
});

describe("normalizeRotation", () => {
  it("normalizes 0 to 0", () => {
    expect(normalizeRotation(0)).toBe(0);
  });

  it("normalizes 180 to 180", () => {
    expect(normalizeRotation(180)).toBe(180);
  });

  it("normalizes 360 to 0", () => {
    expect(normalizeRotation(360)).toBe(0);
  });

  it("normalizes 270 to -90", () => {
    expect(normalizeRotation(270)).toBe(-90);
  });

  it("normalizes -270 to 90", () => {
    expect(normalizeRotation(-270)).toBe(90);
  });

  it("normalizes 450 to 90", () => {
    expect(normalizeRotation(450)).toBe(90);
  });

  it("normalizes -450 to -90", () => {
    expect(normalizeRotation(-450)).toBe(-90);
  });
});

describe("applyRotationDrag", () => {
  it("normalizes result to [-180, 180]", () => {
    const center = { x: 200, y: 150 };
    const start = { x: 200, y: 50 };
    const result = applyRotationDrag(center, start, { x: 100, y: 150 }, 170, false);
    expect(result).toBeGreaterThanOrEqual(-180);
    expect(result).toBeLessThanOrEqual(180);
  });

  it("snaps to 15-degree increments with shift", () => {
    const center = { x: 200, y: 150 };
    const start = { x: 200, y: 50 };
    const result = applyRotationDrag(center, start, { x: 100, y: 150 }, 0, true);
    expect(Math.round(result / 15) * 15).toBe(result);
  });
});

describe("applyResizeHandle", () => {
  it("resizes proportionally from SE handle (non-rotated: diagonal projection)", () => {
    const start = { ...BASE_TRANSFORM, scaleX: 1, scaleY: 1, x: 100, y: 100 };
    const result = applyResizeHandle(start, LAYER_W, LAYER_H, "se", 50, 0, false, false);
    // visual-diagonal: diag=(200,100), diagLen=223.607, projected=44.721, factor=1.2, vw=240, vh=120
    expect(result.scaleX).toBeCloseTo(1.2, 4);
    expect(result.scaleY).toBeCloseTo(1.2, 4);
    expect(result.x).toBeCloseTo(100, 4);
    expect(result.y).toBeCloseTo(100, 4);
  });

  it("allows free scaling with Shift", () => {
    const start = { ...BASE_TRANSFORM, scaleX: 1, scaleY: 1, x: 100, y: 100 };
    const result = applyResizeHandle(start, LAYER_W, LAYER_H, "se", 50, 0, true, false);
    expect(result.scaleX).toBeCloseTo(1.25);
    expect(result.scaleY).toBe(1);
  });

  it("scales from center with Alt (non-rotated: diagonal projection + center)", () => {
    const start = { ...BASE_TRANSFORM, scaleX: 1, scaleY: 1, x: 100, y: 100 };
    const result = applyResizeHandle(start, LAYER_W, LAYER_H, "se", 50, 0, false, true);
    // Alt doubles projected: projected=44.721*2=89.442, factor=1.4, vw=280, vh=140
    // center: dw=80, dh=40 → vx=100-40=60, vy=100-20=80
    expect(result.scaleX).toBeCloseTo(1.4, 4);
    expect(result.scaleY).toBeCloseTo(1.4, 4);
    expect(result.x).toBeCloseTo(60, 4);
    expect(result.y).toBeCloseTo(80, 4);
  });

  it("partially projects diagonal drag on SE handle (visual-diagonal projection)", () => {
    const start = { ...BASE_TRANSFORM, scaleX: 1, scaleY: 1, x: 100, y: 100 };
    const result = applyResizeHandle(start, LAYER_W, LAYER_H, "se", 20, -20, false, false);
    // visual-diagonal: diag=(200,100), diagLen=223.607, projected=8.944, factor=1.04
    expect(result.scaleX).toBeCloseTo(1.04, 4);
    expect(result.scaleY).toBeCloseTo(1.04, 4);
    expect(result.x).toBeCloseTo(100, 4);
    expect(result.y).toBeCloseTo(100, 4);
  });

  it.each([
    // handle  dx   dy  expected-sx/sy  expected-x    expected-y      notes
    ["se",  20, -20, 1.04,            100,           100,            "visual-diagonal projects onto SE diagonal"],
    ["ne",  20,  20, 1.04,            100,            96,             "visual-diagonal projects onto NE diagonal"],
    ["sw", -20, -20, 1.04,             92,           100,            "visual-diagonal projects onto SW diagonal"],
    ["nw", -20,  20, 1.04,             92,            96,             "visual-diagonal projects onto NW diagonal"],
  ])("visual-diagonal projection for %s corner resize", (handle, dx, dy, sf, ex, ey) => {
    const start = { ...BASE_TRANSFORM, scaleX: 1, scaleY: 1, x: 100, y: 100 };
    const result = applyResizeHandle(start, LAYER_W, LAYER_H, handle, dx, dy, false, false);
    // visual-diagonal projection: each drag has a non-zero projection onto the handle diagonal
    expect(result.scaleX).toBeCloseTo(sf, 4);
    expect(result.scaleY).toBeCloseTo(sf, 4);
    expect(result.x).toBeCloseTo(ex, 4);
    expect(result.y).toBeCloseTo(ey, 4);
  });

  describe("with layer rotation", () => {
    it("converts screen dx/dy to local coords for 45° rotated layer", () => {
      const start = { ...BASE_TRANSFORM, scaleX: 1, scaleY: 1, x: 100, y: 100, rotation: 45 };
      // rad = -45*DEG; dx=35.355, dy=-35.355
      // scaleX=1+35.355/200=1.17678, scaleY=1-35.355/100=0.64645
      const result = applyResizeHandle(start, LAYER_W, LAYER_H, "se", 50, 0, true, false);
      expect(result.scaleX).toBeCloseTo(1.1768, 4);
      expect(result.scaleY).toBeCloseTo(0.6464, 4);
    });

    it("applies opposite rotation for -45° layer", () => {
      const start = { ...BASE_TRANSFORM, scaleX: 1, scaleY: 1, x: 100, y: 100, rotation: -45 };
      // rad = 45*DEG; dx=35.355, dy=35.355
      const result = applyResizeHandle(start, LAYER_W, LAYER_H, "se", 50, 0, true, false);
      expect(result.scaleX).toBeCloseTo(1.1768, 4);
      expect(result.scaleY).toBeCloseTo(1.3536, 4);
    });

    // ── Visual anchor must NOT drift when resizing rotated layers ──
    // Before fix: vx/vy were kept at the unrotated top-left, so as the
    // unrotated bounding box grew, its rotated visual top-left (the
    // anchor) shifted in screen space. The dragged handle would not
    // track the cursor.
    //
    // Layer geometry: 200x100 at (100,100) rotated 45° CW.
    //   Center = (200, 150)
    //   Local corners (before rotation): NW(100,100) NE(300,100) SE(300,200) SW(100,200)
    //   Visual corners (after 45° CW rotation):
    //     NW: (164.64, 43.93)  ← ANCHOR for SE handle
    //     NE: (306.07, 185.36)
    //     SE: (235.36, 256.07)  ← HANDLE
    //     SW: (93.93, 114.64)
    it("tracks cursor on SE handle dragged down (45° rotation, free)", () => {
      const start = { ...BASE_TRANSFORM, scaleX: 1, scaleY: 1, x: 100, y: 100, rotation: 45 };
      const result = applyResizeHandle(start, LAYER_W, LAYER_H, "se", 0, 20, true, false);
      const corners = getLayerCorners(result, LAYER_W, LAYER_H);
      // Anchor (visual NW) must stay fixed at (164.64, 43.93)
      expect(corners[0].x).toBeCloseTo(164.6447, 2);
      expect(corners[0].y).toBeCloseTo(43.9339, 2);
      // Dragged handle (visual SE) must move down by exactly 20px
      // from (235.36, 256.07) to (235.36, 276.07)
      expect(corners[2].x).toBeCloseTo(235.3553, 2);
      expect(corners[2].y).toBeCloseTo(276.0669, 2);
    });

    it("tracks cursor on SE handle dragged right (45° rotation, free)", () => {
      const start = { ...BASE_TRANSFORM, scaleX: 1, scaleY: 1, x: 100, y: 100, rotation: 45 };
      const result = applyResizeHandle(start, LAYER_W, LAYER_H, "se", 20, 0, true, false);
      const corners = getLayerCorners(result, LAYER_W, LAYER_H);
      // Anchor (visual NW) stays fixed
      expect(corners[0].x).toBeCloseTo(164.6447, 2);
      expect(corners[0].y).toBeCloseTo(43.9339, 2);
      // Dragged handle (visual SE) moves 20px right
      // from (235.36, 256.07) to (255.36, 256.07)
      expect(corners[2].x).toBeCloseTo(255.3553, 2);
      expect(corners[2].y).toBeCloseTo(256.0669, 2);
    });

    it("dominant-axis proportional: dragging left on SE shrinks (45° rotated)", () => {
      // Regression test for "drag ke kiri tetap membesar" (dragging left still grows).
      // With the OLD distance-ratio approach, the handle barely moved.
      // With the dominant-axis approach + center rotation, dragging left
      // 10px on the SE corner of a 45°-rotated layer should shrink the layer
      // and keep the visual anchor fixed.
      const start = { ...BASE_TRANSFORM, scaleX: 1, scaleY: 1, x: 100, y: 100, rotation: 45 };
      const result = applyResizeHandle(start, LAYER_W, LAYER_H, "se", -10, 0, false, false);
      // Both dimensions must have shrunk (scale < 1 in both axes, with sign preserved).
      expect(result.scaleX).toBeLessThan(1);
      expect(result.scaleY).toBeLessThan(1);
      // Visual anchor (NW corner after 45° rotation) should remain fixed.
      const corners = getLayerCorners(result, LAYER_W, LAYER_H);
      expect(corners[0].x).toBeCloseTo(164.6447, 2);
      expect(corners[0].y).toBeCloseTo(43.9339, 2);
    });

    it("tracks cursor at exact 90° rotation (free)", () => {
      // At 90° rotation, the visual SE corner is at the BOTTOM-LEFT of the
      // screen. Dragging screen-right shrinks the local y-axis (the visual
      // vertical extent of the rotated layer).
      const start = { ...BASE_TRANSFORM, scaleX: 1, scaleY: 1, x: 100, y: 100, rotation: 90 };
      // Center (200,150). After 90° CW: NW(250,50) NE(250,250) SE(150,250) SW(150,50)
      const result = applyResizeHandle(start, LAYER_W, LAYER_H, "se", 20, 0, true, false);
      const corners = getLayerCorners(result, LAYER_W, LAYER_H);
      // Anchor (visual NW = top-right of screen) must stay at (250, 50)
      expect(corners[0].x).toBeCloseTo(250, 2);
      expect(corners[0].y).toBeCloseTo(50, 2);
      // Dragged handle (visual SE = bottom-left) moves 20px right
      expect(corners[2].x).toBeCloseTo(170, 2);
      expect(corners[2].y).toBeCloseTo(250, 2);
    });
  });

  // ── Proportional (aspect-keeping) resize on rotated layers ──
  // Validates visual-diagonal projection + center-rotation correction:
  //   1. The visual anchor (opposite corner) must NOT drift.
  //   2. Both axes must scale equally (same factor).
  describe("proportional resize on rotated layers", () => {
    const L45 = { ...BASE_TRANSFORM, scaleX: 1, scaleY: 1, x: 100, y: 100, rotation: 45 };
    // Visual corners at 45°: NW(164.64, 43.93), SE(235.36, 256.07)

    it("SE +10px right on 45° grows proportionally, anchor fixed", () => {
      const result = applyResizeHandle(L45, LAYER_W, LAYER_H, "se", 10, 0, false, false);
      // projected=3.1623, factor=1.014142, vw=202.828, vh=101.414
      expect(result.scaleX).toBeCloseTo(1.01414, 4);
      expect(result.scaleY).toBeCloseTo(1.01414, 4);
      const c = getLayerCorners(result, LAYER_W, LAYER_H);
      // Anchor (NW) must stay fixed at original position
      expect(c[0].x).toBeCloseTo(164.645, 2);
      expect(c[0].y).toBeCloseTo(43.934, 2);
      // SE visual moves +1px x, +3px y (along the diagonal unit * projected)
      const oldSE = getLayerCorners(L45, LAYER_W, LAYER_H)[2];
      expect(c[2].x - oldSE.x).toBeCloseTo(1, 2);
      expect(c[2].y - oldSE.y).toBeCloseTo(3, 2);
    });

    it("SE -10px left on 45° shrinks proportionally, anchor fixed", () => {
      const result = applyResizeHandle(L45, LAYER_W, LAYER_H, "se", -10, 0, false, false);
      // projected=-3.1623, factor=0.985858, vw=197.172, vh=98.586
      expect(result.scaleX).toBeCloseTo(0.98586, 4);
      expect(result.scaleY).toBeCloseTo(0.98586, 4);
      const c = getLayerCorners(result, LAYER_W, LAYER_H);
      expect(c[0].x).toBeCloseTo(164.645, 2);
      expect(c[0].y).toBeCloseTo(43.934, 2);
      const oldSE = getLayerCorners(L45, LAYER_W, LAYER_H)[2];
      expect(c[2].x - oldSE.x).toBeCloseTo(-1, 2);
      expect(c[2].y - oldSE.y).toBeCloseTo(-3, 2);
    });

    it("SE diagonal drag (10,10) on 45° tracks along visual diagonal", () => {
      const result = applyResizeHandle(L45, LAYER_W, LAYER_H, "se", 10, 10, false, false);
      // projected=12.649, factor=1.05657, vw=211.314, vh=105.657
      expect(result.scaleX).toBeCloseTo(1.05657, 4);
      expect(result.scaleY).toBeCloseTo(1.05657, 4);
      const c = getLayerCorners(result, LAYER_W, LAYER_H);
      expect(c[0].x).toBeCloseTo(164.645, 2);
      expect(c[0].y).toBeCloseTo(43.934, 2);
      const oldSE = getLayerCorners(L45, LAYER_W, LAYER_H)[2];
      expect(c[2].x - oldSE.x).toBeCloseTo(4, 2);
      expect(c[2].y - oldSE.y).toBeCloseTo(12, 2);
    });

    it("all 4 corners on 45° produce equal scaleX/scaleY in each result", () => {
      const se = applyResizeHandle(L45, LAYER_W, LAYER_H, "se", 8, 0, false, false);
      const ne = applyResizeHandle(L45, LAYER_W, LAYER_H, "ne", 8, 0, false, false);
      const sw = applyResizeHandle(L45, LAYER_W, LAYER_H, "sw", 8, 0, false, false);
      const nw = applyResizeHandle(L45, LAYER_W, LAYER_H, "nw", 8, 0, false, false);
      for (const r of [se, ne, sw, nw]) {
        expect(r.scaleX).toBeCloseTo(r.scaleY, 6);
      }
    });

    it("SE proportional on 90° rotated layer", () => {
      const L90 = { ...BASE_TRANSFORM, scaleX: 1, scaleY: 1, x: 100, y: 100, rotation: 90 };
      const result = applyResizeHandle(L90, LAYER_W, LAYER_H, "se", 10, 0, false, false);
      // projected=-4.472, factor=0.98, vw=196, vh=98
      expect(result.scaleX).toBeCloseTo(0.98, 4);
      expect(result.scaleY).toBeCloseTo(0.98, 4);
      const c = getLayerCorners(result, LAYER_W, LAYER_H);
      // 90° visual: NW(250,50), SE(150,250)
      expect(c[0].x).toBeCloseTo(250, 2);
      expect(c[0].y).toBeCloseTo(50, 2);
      expect(c[2].x).toBeCloseTo(152, 2);
      expect(c[2].y).toBeCloseTo(246, 2);
    });

    it("proportional contract: both axes scale identically", () => {
      const result = applyResizeHandle(L45, LAYER_W, LAYER_H, "se", 7, -3, false, false);
      const fx = result.scaleX / L45.scaleX;
      const fy = result.scaleY / L45.scaleY;
      expect(fx).toBeCloseTo(fy, 10);
    });

    it("clamps minimum size for extreme negative drag", () => {
      const start = { ...BASE_TRANSFORM, scaleX: 1, scaleY: 1, x: 100, y: 100 };
      const result = applyResizeHandle(start, LAYER_W, LAYER_H, "se", -5000, 0, false, false);
      // minFactor = max(1/200, 1/100) = 0.01
      expect(result.scaleX).toBeCloseTo(0.01, 4);
      expect(result.scaleY).toBeCloseTo(0.01, 4);
    });

    it("preserves flip sign in proportional resize", () => {
      const flipped = { ...BASE_TRANSFORM, scaleX: -1, scaleY: 1, x: 100, y: 100 };
      const result = applyResizeHandle(flipped, LAYER_W, LAYER_H, "se", 50, 0, false, false);
      expect(result.scaleX).toBeLessThan(0);  // flip sign preserved
      expect(result.scaleY).toBeGreaterThan(0);
      // absolute factor same for both axes
      expect(Math.abs(result.scaleX)).toBeCloseTo(result.scaleY, 4);
    });

    it("non-corner handles do NOT keep aspect ratio", () => {
      const start = { ...BASE_TRANSFORM, scaleX: 1, scaleY: 1, x: 100, y: 100 };
      const eResult = applyResizeHandle(start, LAYER_W, LAYER_H, "e", 50, 0, false, false);
      expect(eResult.scaleX).toBeCloseTo(1.25, 4);
      expect(eResult.scaleY).toBe(1);
      // positive dy = drag DOWN in Y-down coords; "n" handle shrinks from top
      const nResult = applyResizeHandle(start, LAYER_W, LAYER_H, "n", 0, 20, false, false);
      expect(nResult.scaleX).toBe(1);
      expect(nResult.scaleY).toBeCloseTo(0.8, 4);
    });
  });

  // ── Resize edge cases ──
  describe("resize edge cases", () => {
    it("edge handles on rotated layer do independent axis (not proportional)", () => {
      const start = { ...BASE_TRANSFORM, scaleX: 1, scaleY: 1, x: 100, y: 100, rotation: 45 };
      // E handle: drag right 50px in screen space
      const eResult = applyResizeHandle(start, LAYER_W, LAYER_H, "e", 50, 0, false, false);
      // localDx = 50*cos(45°) = 35.355, vw = 200 + 35.355 = 235.355
      expect(eResult.scaleX).toBeCloseTo(1.17678, 4);
      expect(eResult.scaleY).toBe(1); // Y unchanged for E handle
      // N handle: drag down 20px → shrinks from top
      const nResult = applyResizeHandle(start, LAYER_W, LAYER_H, "n", 0, 20, false, false);
      // localDy = 20*cos(45°) = 14.142, vh = 100 - 14.142 = 85.858
      expect(nResult.scaleY).toBeLessThan(1);
      expect(nResult.scaleX).toBe(1); // X unchanged for N handle
      // Both must have independent scaleX/scaleY (not equal)
      const wResult = applyResizeHandle(start, LAYER_W, LAYER_H, "w", 50, 0, false, false);
      expect(wResult.scaleX).not.toBeCloseTo(wResult.scaleY, 4);
    });

    it("both axes flipped (scaleX=-1, scaleY=-1) preserves negative signs", () => {
      const start = { ...BASE_TRANSFORM, scaleX: -1, scaleY: -1, x: 100, y: 100 };
      // Shift-held (free resize) on SE handle, drag right 50px
      const result = applyResizeHandle(start, LAYER_W, LAYER_H, "se", 50, 0, true, false);
      // Non-proportional (shift held): scaleX gets the full delta, scaleY unchanged
      expect(result.scaleX).toBeLessThan(0); // sign preserved
      expect(result.scaleY).toBeLessThan(0); // sign preserved
      // Proportional (no shift) preserves both signs equally
      const propResult = applyResizeHandle(start, LAYER_W, LAYER_H, "se", 50, 0, false, false);
      expect(propResult.scaleX).toBeLessThan(0);
      expect(propResult.scaleY).toBeLessThan(0);
      // Both negative → product positive (no visual flip ambiguity)
      expect(propResult.scaleX * propResult.scaleY).toBeGreaterThan(0);
    });

    it("extreme positive drag produces reasonable factor (no overflow)", () => {
      const start = { ...BASE_TRANSFORM, scaleX: 1, scaleY: 1, x: 100, y: 100 };
      // Drag 5000px right on SE handle
      const result = applyResizeHandle(start, LAYER_W, LAYER_H, "se", 5000, 0, false, false);
      // projected = 5000*200/223.607 = 4472, factor = (223.607+4472)/223.607 ≈ 21
      // scaleX = scaleY = 21 (large but reasonable — user wants huge)
      expect(result.scaleX).toBeCloseTo(21, 4);
      expect(result.scaleY).toBeCloseTo(21, 4);
      expect(result.scaleX).toBeGreaterThan(0);
      expect(Number.isFinite(result.scaleX)).toBe(true);
      expect(Number.isFinite(result.x)).toBe(true);
    });
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

  // ── Rotation direction debug ──────────────────────────────────
  // Simulate the full chain: screen coords → onScreenToDoc → applyRotationDrag

  const L = { x: 48, y: 0 }; // canvas rect left/top (tool rail offset)

  /** Convert client coords to document coords (mirrors CanvasViewport onScreenToDoc) */
  function clientToDoc(
    cx: number, cy: number,
    pan: { x: number; y: number },
    zoom: number,
  ) {
    return {
      x: (cx - L.x - pan.x) / zoom,
      y: (cy - L.y - pan.y) / zoom,
    };
  }

  const CENTER = { x: 200, y: 200 };
  const PAN_ZERO = { x: 0, y: 0 };
  const PAN_100 = { x: 100, y: 50 };
  const ZOOM = 1;

  it("clockwise drag → positive delta (no pan)", () => {
    // User clicks at upper-right of center (12 → 3 o'clock = CW)
    const startClient = { x: 250, y: 50 };  // right of center (3 o'clock)
    const currClient  = { x: 250, y: 350 }; // below center (6 o'clock = clockwise)

    const startDoc = clientToDoc(startClient.x, startClient.y, PAN_ZERO, ZOOM);
    const currDoc  = clientToDoc(currClient.x,  currClient.y,  PAN_ZERO, ZOOM);

    const result = applyRotationDrag(CENTER, startDoc, currDoc, 0, false);
    // Clockwise in Y-down → positive delta
    expect(result).toBeGreaterThan(0);
    console.log("[DEBUG] CW no-pan: startDoc=", startDoc, "currDoc=", currDoc, "result=", result);
  });

  it("counter-clockwise drag → negative delta (no pan)", () => {
    const startClient = { x: 250, y: 350 }; // below center (6 o'clock)
    const currClient  = { x: 250, y: 50 };  // above center (12 o'clock = CCW)

    const startDoc = clientToDoc(startClient.x, startClient.y, PAN_ZERO, ZOOM);
    const currDoc  = clientToDoc(currClient.x,  currClient.y,  PAN_ZERO, ZOOM);

    const result = applyRotationDrag(CENTER, startDoc, currDoc, 0, false);
    expect(result).toBeLessThan(0);
    console.log("[DEBUG] CCW no-pan: startDoc=", startDoc, "currDoc=", currDoc, "result=", result);
  });

  it("clockwise drag → positive delta WITH pan offset", () => {
    // Same gesture but viewport is panned right 100px, down 50px
    const startClient = { x: 350, y: 100 }; // 3 o'clock, but shifted by pan
    const currClient  = { x: 350, y: 400 }; // 6 o'clock, shifted by pan

    const startDoc = clientToDoc(startClient.x, startClient.y, PAN_100, ZOOM);
    const currDoc  = clientToDoc(currClient.x,  currClient.y,  PAN_100, ZOOM);

    const result = applyRotationDrag(CENTER, startDoc, currDoc, 0, false);
    expect(result).toBeGreaterThan(0);
    console.log("[DEBUG] CW +pan: startDoc=", startDoc, "currDoc=", currDoc, "result=", result);
  });

  it("counter-clockwise drag → negative delta WITH pan offset", () => {
    const startClient = { x: 350, y: 400 };
    const currClient  = { x: 350, y: 100 };

    const startDoc = clientToDoc(startClient.x, startClient.y, PAN_100, ZOOM);
    const currDoc  = clientToDoc(currClient.x,  currClient.y,  PAN_100, ZOOM);

    const result = applyRotationDrag(CENTER, startDoc, currDoc, 0, false);
    expect(result).toBeLessThan(0);
    console.log("[DEBUG] CCW +pan: startDoc=", startDoc, "currDoc=", currDoc, "result=", result);
  });

  it("direction preserved with existing rotation (normalized)", () => {
    const startClient = { x: 250, y: 50 };
    const currClient  = { x: 250, y: 350 };
    const startDoc = clientToDoc(startClient.x, startClient.y, PAN_ZERO, ZOOM);
    const currDoc  = clientToDoc(currClient.x,  currClient.y,  PAN_ZERO, ZOOM);
    const result = applyRotationDrag(CENTER, startDoc, currDoc, 45, false);
    // 178° CW added to 45 ≡ -136.5° normalized (visually correct)
    expect(normalizeRotation(result)).toBeCloseTo(-136.5278, 3);
  });

  it("direction preserved with existing negative rotation (normalized)", () => {
    const startClient = { x: 250, y: 350 };
    const currClient  = { x: 250, y: 50 };
    const startDoc = clientToDoc(startClient.x, startClient.y, PAN_ZERO, ZOOM);
    const currDoc  = clientToDoc(currClient.x,  currClient.y,  PAN_ZERO, ZOOM);
    const result = applyRotationDrag(CENTER, startDoc, currDoc, -30, false);
    expect(normalizeRotation(result)).toBeCloseTo(151.5278, 3);
  });

  it("zero-delta click: no movement → rotation = startRotation", () => {
    // start === current → delta = 0
    const center = { x: 200, y: 150 };
    const start = { x: 250, y: 50 };
    const result = applyRotationDrag(center, start, start, 0, false);
    expect(result).toBe(0);
  });

  it("zero-delta click with existing rotation preserves startRotation", () => {
    const center = { x: 200, y: 150 };
    const start = { x: 250, y: 50 };
    // start === current → delta 0, result = 45
    const result = applyRotationDrag(center, start, start, 45, false);
    expect(result).toBe(45);
  });

  it("180° rotation from right to left through center gives ±180°", () => {
    const center = { x: 200, y: 150 };
    // Start at 3 o'clock (right of center), end at 9 o'clock (left of center)
    const start = { x: 300, y: 150 };
    const end   = { x: 100, y: 150 };
    const result = applyRotationDrag(center, start, end, 0, false);
    // Full 180° spin → ±180°
    expect(Math.abs(normalizeRotation(result))).toBeCloseTo(180, 4);
  });

  // ── Simulate the OLD bug (no pan compensation) ────────────────
  it("OLD BUG: clientX/zoom without pan REVERSES direction when panned far", () => {
    // When viewport is panned significantly (300px right), the OLD
    // conversion that ignores pan produces coordinates that can put
    // the mouse on the wrong side of the layer center, reversing the
    // computed delta direction.
    const BIG_PAN = { x: 300, y: 0 };
    const startClient = { x: 500, y: 200 }; // doc: (152, 200) → left of center
    const currClient  = { x: 500, y: 300 }; // doc: (152, 300) → farther left + down

    // OLD CODE: clientX/ZOOM, no pan compensation
    const oldStart = { x: startClient.x / ZOOM, y: startClient.y / ZOOM };   // (500, 200)
    const oldCurr  = { x: currClient.x  / ZOOM, y: currClient.y  / ZOOM };   // (500, 300)
    const oldResult = applyRotationDrag(CENTER, oldStart, oldCurr, 0, false); // +18°

    // CORRECT CODE: with pan compensation
    const corrStart = clientToDoc(startClient.x, startClient.y, BIG_PAN, ZOOM); // (152, 200)
    const corrCurr  = clientToDoc(currClient.x,  currClient.y,  BIG_PAN, ZOOM); // (152, 300)
    const corrResult = applyRotationDrag(CENTER, corrStart, corrCurr, 0, false); // -64°

    console.log("[DEBUG] OLD no-pan result=", oldResult, "CORRECT+pan result=", corrResult);
    // Opposite signs = direction reversed
    expect(Math.sign(oldResult)).not.toBe(Math.sign(corrResult));
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
  it("all 8 handles have distinct cursors at 0°", () => {
    const cursors = [
      getCursorForHandle("n", 0, 1, 1),
      getCursorForHandle("ne", 0, 1, 1),
      getCursorForHandle("e", 0, 1, 1),
      getCursorForHandle("se", 0, 1, 1),
      getCursorForHandle("s", 0, 1, 1),
      getCursorForHandle("sw", 0, 1, 1),
      getCursorForHandle("w", 0, 1, 1),
      getCursorForHandle("nw", 0, 1, 1),
    ];
    // 4 cursor types cycle through 8 directions (each type appears twice for opposite handles)
    expect(new Set(cursors).size).toBe(4);
  });
  it("cursor rotates CW with positive rotation", () => {
    const c0 = getCursorForHandle("e", 0, 1, 1);
    const c45 = getCursorForHandle("e", 45, 1, 1);
    const c90 = getCursorForHandle("e", 90, 1, 1);
    expect(c0).toBe("ew-resize");
    expect(c45).toBe("nwse-resize");
    expect(c90).toBe("ns-resize");
  });
  it("cursor rotates CCW with negative rotation", () => {
    const c0 = getCursorForHandle("e", 0, 1, 1);
    const cN45 = getCursorForHandle("e", -45, 1, 1);
    const cN90 = getCursorForHandle("e", -90, 1, 1);
    expect(c0).toBe("ew-resize");
    expect(cN45).toBe("nesw-resize");
    expect(cN90).toBe("ns-resize");
  });
  it("handles flipX sign (scaleX*scaleY < 0)", () => {
    const c = getCursorForHandle("e", 0, -1, 1);
    // flipX makes visual rotation mirrored
    expect(typeof c).toBe("string");
  });
});

describe("documentToLayerLocal", () => {
  const IDENTITY: Transform2D = { x: 0, y: 0, scaleX: 1, scaleY: 1, rotation: 0, flipH: false, flipV: false };

  it("returns same coords when layer has no offset/scale/rotation", () => {
    const result = documentToLayerLocal(50, 30, IDENTITY, 200, 100);
    // center=(100,50), rel=(-50,-20), no rot/scale → local = (-50 + 100, -20 + 50) = (50, 30)
    expect(result.x).toBeCloseTo(50);
    expect(result.y).toBeCloseTo(30);
  });

  it("maps document point that falls at layer center to layer center", () => {
    // layer center at (100,100) with w=200,h=100 → center = (200, 150)
    // doc point at center (200,150) → rel=(0,0) → local center (100,50)
    const result = documentToLayerLocal(200, 150, BASE_TRANSFORM, LAYER_W, LAYER_H);
    expect(result.x).toBeCloseTo(100);
    expect(result.y).toBeCloseTo(50);
  });

  it("accounts for layer scale", () => {
    const result = documentToLayerLocal(300, 125, { x: 100, y: 50, scaleX: 2, scaleY: 1, rotation: 0, flipH: false, flipV: false }, 200, 100);
    // center=(300,100), rel=(0,25), un-scale: x=0/2=0, y=25/1=25 → local = (0+100, 25+50) = (100, 75)
    expect(result.x).toBeCloseTo(100);
    expect(result.y).toBeCloseTo(75);
  });

  it("accounts for layer rotation", () => {
    // Rotated 90° CW: center=(200,100)
    // doc point at center + (100,0) → rel=(100,0)
    // un-rotate 90°: rot = (-100*sin(-90)=0, -100*cos(-90)...)
    // cos(-90)=0, sin(-90)=-1 → (100*0 - 0*(-1), 100*(-1) + 0*0) = (0, -100)
    // local = (0 + 100, -100 + 50) = (100, -50)
    const result = documentToLayerLocal(300, 100, { x: 100, y: 50, scaleX: 1, scaleY: 1, rotation: 90, flipH: false, flipV: false }, 200, 100);
    expect(result.x).toBeCloseTo(100);
    expect(result.y).toBeCloseTo(-50);
  });

  it("accounts for flipH", () => {
    // scaleX = -1, flipH = true
    // layer center at (100 + 200/2, 50 + 100/2) = (200, 100)
    // doc at (200, 100) → local center (100, 50)
    const result = documentToLayerLocal(200, 100, { x: 100, y: 50, scaleX: -1, scaleY: 1, rotation: 0, flipH: true, flipV: false }, 200, 100);
    expect(result.x).toBeCloseTo(100);
    expect(result.y).toBeCloseTo(50);
  });

  it("Alt+proportional SE 45° rotated: center-anchored with visual-diagonal projection + rotation correction", () => {
    // 100×100 square at (100,100), rotation=45°, SE handle, screenDy=10, altKey=true
    // At 45° rotation the visual diagonal from NW→SE is vertical, so dy projects fully
    // Result: scaleX=scaleY (proportional), rotation preserved, Alt centers (x,y change)
    const start = { x: 100, y: 100, scaleX: 1, scaleY: 1, rotation: 45, flipH: false, flipV: false };
    const result = applyResizeHandle(start, 100, 100, "se", 0, 10, false, true);
    expect(result.scaleX).toBeCloseTo(result.scaleY, 5);
    expect(result.rotation).toBe(45);
    expect(result.scaleX).toBeGreaterThan(1);
    expect(result.scaleY).toBeGreaterThan(1);
    // Alt centers: x and y must differ from original (100,100)
    expect(result.x).not.toBe(100);
    expect(result.y).not.toBe(100);
  });

  it("flipV proportional: scaleY=-1 sign preserved after resize (SE)", () => {
    // scaleY=-1, flipV=true → negative scaleY must stay negative after proportional resize
    const start = { x: 100, y: 100, scaleX: 1, scaleY: -1, rotation: 0, flipH: false, flipV: true };
    const result = applyResizeHandle(start, 100, 100, "se", 10, 10, false, false);
    expect(result.scaleY).toBeLessThan(0);
    expect(Math.abs(result.scaleY)).toBeCloseTo(Math.abs(result.scaleX), 5);
    expect(result.flipV).toBe(true);
  });
});
