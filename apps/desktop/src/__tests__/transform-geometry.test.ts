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
  it("resizes from SE handle along handle-axis projection", () => {
    const start = { ...BASE_TRANSFORM, scaleX: 1, scaleY: 1, x: 100, y: 100 };
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
    const result = applyResizeHandle(start, LAYER_W, LAYER_H, "se", 50, 0, false, true);
    expect(result.scaleX).toBeCloseTo(1.3333, 4);
    expect(result.scaleY).toBeCloseTo(1.3333, 4);
    expect(result.x).toBeCloseTo(66.6667, 4);
    expect(result.y).toBeCloseTo(83.3333, 4);
  });

  it("ignores 45° NE/SW gesture on SE handle", () => {
    const start = { ...BASE_TRANSFORM, scaleX: 1, scaleY: 1, x: 100, y: 100 };
    const result = applyResizeHandle(start, LAYER_W, LAYER_H, "se", 20, -20, false, false);
    expect(result.scaleX).toBeCloseTo(1, 4);
    expect(result.scaleY).toBeCloseTo(1, 4);
    expect(result.x).toBeCloseTo(100, 4);
    expect(result.y).toBeCloseTo(100, 4);
  });

  it.each([
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
});
