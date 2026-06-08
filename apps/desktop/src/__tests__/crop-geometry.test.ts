import { describe, it, expect } from "vitest";
import {
  clampCropRect,
  constrainCropRectToDocument,
  applyCropResizeHandle,
  applyCropMove,
  screenDeltaToRotatedCropLocalDelta,
  constrainCropAspect,
  constrainCropToSize,
} from "../viewport/cropGeometry";

const RECT = { x: 10, y: 10, w: 200, h: 100 };

describe("constrainCropRectToDocument", () => {
  it("allows coordinates outside document boundaries", () => {
    const result = constrainCropRectToDocument({ x: -50, y: -30, w: 200, h: 100 }, 500, 500);
    expect(result).toEqual({ x: -50, y: -30, w: 200, h: 100 });
  });

  it("does not slide rect inward when right/bottom would overflow", () => {
    const result = constrainCropRectToDocument({ x: 400, y: 450, w: 200, h: 100 }, 500, 500);
    expect(result).toEqual({ x: 400, y: 450, w: 200, h: 100 });
  });

  it("passes through rect already inside bounds", () => {
    const result = constrainCropRectToDocument({ x: 50, y: 50, w: 200, h: 100 }, 500, 500);
    expect(result).toEqual({ x: 50, y: 50, w: 200, h: 100 });
  });

  it("enforces minimum size of 1x1", () => {
    const result = constrainCropRectToDocument({ x: 10, y: 10, w: -50, h: 0 }, 500, 500);
    expect(result).toEqual({ x: 10, y: 10, w: 1, h: 1 });
  });

  it("clampCropRect alias matches constrainCropRectToDocument", () => {
    const rect = { x: 10, y: 20, w: 300, h: 200 };
    expect(clampCropRect(rect, 500, 500)).toEqual(constrainCropRectToDocument(rect, 500, 500));
  });
});

describe("applyCropResizeHandle — Free mode", () => {
  it("SE corner does free resize (dx→w, dy→h) by default in Free mode", () => {
    const result = applyCropResizeHandle(RECT, "se", 30, 0);
    expect(result.x).toBe(10);
    expect(result.y).toBe(10);
    expect(result.w).toBe(230);
    expect(result.h).toBe(100);
  });

  it("SE corner with Shift lock does proportional resize", () => {
    const result = applyCropResizeHandle(RECT, "se", 30, 0, { shift: true });
    expect(result.x).toBe(10);
    expect(result.y).toBe(10);
    expect(result.w).toBeCloseTo(220, 4);
    expect(result.h).toBeCloseTo(110, 4);
  });

  it("S edge only changes height", () => {
    const result = applyCropResizeHandle(RECT, "s", 0, 20);
    expect(result.x).toBe(10);
    expect(result.y).toBe(10);
    expect(result.w).toBe(200);
    expect(result.h).toBe(120);
  });

  it("NW corner with Alt resizes from center", () => {
    const result = applyCropResizeHandle(RECT, "nw", 10, 10, { alt: true });
    expect(result.x).toBe(20);
    expect(result.y).toBe(20);
    expect(result.w).toBe(180);
    expect(result.h).toBe(80);
  });

  it("NW corner Shift+Alt: proportional from center", () => {
    const result = applyCropResizeHandle(RECT, "nw", 10, 10, { shift: true, alt: true });
    expect(result.w).toBeCloseTo(173.33, 2);
    expect(result.h).toBeCloseTo(86.67, 2);
  });
});

describe("screenDeltaToRotatedCropLocalDelta", () => {
  it("keeps resize deltas unchanged when crop rotation is zero", () => {
    expect(screenDeltaToRotatedCropLocalDelta(12, -8, 0)).toEqual({ dx: 12, dy: -8 });
  });

  it("maps screen downward drag to local rightward resize at 90 degrees", () => {
    const result = screenDeltaToRotatedCropLocalDelta(0, 20, 90);
    expect(result.dx).toBeCloseTo(20, 6);
    expect(result.dy).toBeCloseTo(0, 6);
  });

  it("maps screen rightward drag to local downward resize at -90 degrees", () => {
    const result = screenDeltaToRotatedCropLocalDelta(20, 0, -90);
    expect(result.dx).toBeCloseTo(0, 6);
    expect(result.dy).toBeCloseTo(20, 6);
  });

  it("prevents rotated classic east-handle resize from stretching the wrong axis", () => {
    const local = screenDeltaToRotatedCropLocalDelta(0, 20, 90);
    const result = applyCropResizeHandle(RECT, "e", local.dx, local.dy);
    expect(result.w).toBe(220);
    expect(result.h).toBe(100);
  });
});

describe("applyCropResizeHandle — Ratio mode", () => {
  it("SE corner maintains aspect ratio (horizontal drag)", () => {
    const result = applyCropResizeHandle(RECT, "se", 30, 0, {
      constraint: "ratio", aspect: { w: 16, h: 9 },
    });
    // Diagonal projection: projected = 30*1 + 0*1 = 30
    // sumWH = 300, factor = 1 + 30/300 = 1.1
    // w = 200*1.1 = 220, h = 220/(16/9) = 123.75
    expect(result.x).toBeCloseTo(10, 6);
    expect(result.y).toBeCloseTo(10, 6);
    expect(result.w).toBeCloseTo(220, 6);
    expect(result.h).toBeCloseTo(123.75, 4);
    expect(result.w / result.h).toBeCloseTo(16 / 9, 6);
  });

  it("SE corner with Shift does free resize in Ratio mode", () => {
    const result = applyCropResizeHandle(RECT, "se", 30, 10, {
      constraint: "ratio", aspect: { w: 16, h: 9 }, shift: true,
    });
    expect(result.x).toBeCloseTo(10, 6);
    expect(result.y).toBeCloseTo(10, 6);
    expect(result.w).toBeCloseTo(230, 6);
    expect(result.h).toBeCloseTo(110, 6);
  });

  it("NE corner reverse diagonal drag — dy dominates dx direction flip", () => {
    // Drag NE corner down-right (against NE = up-right direction)
    // effDx=5, effDy=40. NE: hx=1, hy=-1
    // projected = 5*1 + 40*(-1) = -35
    // sumWH = 300, minFactor = max(1/200, 16/9/200) = max(0.005, 0.00889) = 0.00889
    // factor = max(0.00889, 1 - 35/300) = max(0.00889, 0.8833) = 0.8833
    // w = 200*0.8833 = 176.67, h = 176.67/(16/9) = 99.37
    // NE includes "n" → y = rect.y + oldH - h = 10 + 100 - 99.37 = 10.63
    const result = applyCropResizeHandle(RECT, "ne", 5, 40, {
      constraint: "ratio", aspect: { w: 16, h: 9 },
    });
    expect(result.w).toBeCloseTo(176.67, 2);
    expect(result.h).toBeCloseTo(99.37, 2);
    expect(result.w / result.h).toBeCloseTo(16 / 9, 6);
    expect(result.y).toBeCloseTo(10.625, 4);
    expect(result.x).toBeCloseTo(10, 6);
  });

  it("NE corner reverse diagonal: pure vertical drag ignores axis crossing", () => {
    // Drag NE corner straight down (effDx=0, effDy=40). NE: hx=1, hy=-1
    // projected = 0*1 + 40*(-1) = -40
    // factor = max(0.00889, 1 - 40/300) = max(0.00889, 0.8667) = 0.8667
    // w = 200*0.8667 = 173.33, h = 173.33/(16/9) = 97.5
    // When dx oscillates between -1 and +1, projected stays ≈ -39 to -41
    // factor stays ≈ 0.87 with < 0.3% variation → no jitter
    const result = applyCropResizeHandle(RECT, "ne", 0, 40, {
      constraint: "ratio", aspect: { w: 16, h: 9 },
    });
    expect(result.w).toBeCloseTo(173.33, 2);
    expect(result.h).toBeCloseTo(97.5, 2);
    expect(result.w / result.h).toBeCloseTo(16 / 9, 6);
  });

  it("NW corner reverse diagonal drag — both axes negative projected", () => {
    // Drag NW corner down-right (against NW = up-left direction)
    // effDx=30, effDy=20. NW: hx=-1, hy=-1
    // projected = 30*(-1) + 20*(-1) = -50
    // factor = max(0.00889, 1 - 50/300) = max(0.00889, 0.8333) = 0.8333
    // w = 200*0.8333 = 166.67, h = 166.67/(16/9) = 93.75
    // NW includes "w" → x = 10 + 200 - 166.67 = 43.33
    // NW includes "n" → y = 10 + 100 - 93.75 = 16.25
    const result = applyCropResizeHandle(RECT, "nw", 30, 20, {
      constraint: "ratio", aspect: { w: 16, h: 9 },
    });
    expect(result.w).toBeCloseTo(166.67, 2);
    expect(result.h).toBeCloseTo(93.75, 2);
    expect(result.w / result.h).toBeCloseTo(16 / 9, 6);
    expect(result.x).toBeCloseTo(43.33, 2);
    expect(result.y).toBeCloseTo(16.25, 2);
  });

  it("SW corner reverse diagonal drag — moves opposite both handle axes", () => {
    // Drag SW corner up-right (against SW = down-left direction)
    // effDx=25, effDy=-15. SW: hx=-1, hy=1
    // projected = 25*(-1) + (-15)*1 = -40
    // factor = max(0.00889, 1 - 40/300) = max(0.00889, 0.8667) = 0.8667
    // w = 200*0.8667 = 173.33, h = 173.33/(16/9) = 97.5
    // SW includes "w" → x = 10 + 200 - 173.33 = 36.67
    // No "n" → y stays at 10
    const result = applyCropResizeHandle(RECT, "sw", 25, -15, {
      constraint: "ratio", aspect: { w: 16, h: 9 },
    });
    expect(result.w).toBeCloseTo(173.33, 2);
    expect(result.h).toBeCloseTo(97.5, 2);
    expect(result.w / result.h).toBeCloseTo(16 / 9, 6);
    expect(result.x).toBeCloseTo(36.67, 2);
    expect(result.y).toBeCloseTo(10, 6);
  });

  it("all four corners in ratio mode maintain target ratio", () => {
    const rect = { x: 100, y: 100, w: 400, h: 300 };
    const ratio = { w: 4, h: 3 };
    const deltas = [{ dx: 40, dy: 30 }, { dx: -20, dy: 10 }, { dx: 10, dy: -15 }, { dx: -30, dy: -20 }];
    for (const handle of ["se", "ne", "nw", "sw"]) {
      const result = applyCropResizeHandle(rect, handle, deltas[0].dx, deltas[0].dy, {
        constraint: "ratio", aspect: ratio,
      });
      expect(result.w / result.h).toBeCloseTo(4 / 3, 6);
    }
  });

  it("E edge maintains aspect ratio by centering", () => {
    const result = applyCropResizeHandle(RECT, "e", 20, 0, {
      constraint: "ratio", aspect: { w: 16, h: 9 },
    });
    // Edge handles use their own aspect logic (unchanged by corner fix)
    expect(result.w).toBeCloseTo(220, 6);
    expect(result.h).toBeCloseTo(123.75, 4);
    expect(result.x).toBeCloseTo(10, 6);
    expect(result.y).toBeCloseTo(-1.875, 4);
  });

  it("N edge maintains aspect ratio by centering", () => {
    const result = applyCropResizeHandle(RECT, "n", 0, 20, {
      constraint: "ratio", aspect: { w: 1, h: 1 },
    });
    expect(result.h).toBeCloseTo(80, 6);
    expect(result.w).toBeCloseTo(80, 6);
    expect(result.x).toBeCloseTo(70, 6);
    expect(result.y).toBeCloseTo(30, 6);
  });
});

describe("applyCropResizeHandle — Size mode (uses aspect ratio for constraint)", () => {
  it("SE corner maintains target aspect ratio", () => {
    const result = applyCropResizeHandle(RECT, "se", 30, 0, {
      constraint: "size", aspect: { w: 4, h: 3 },
    });
    // Diagonal projection: projected = 30*1 + 0*1 = 30
    // sumWH = 300, factor = 1 + 30/300 = 1.1
    // w = 200*1.1 = 220, h = 220/(4/3) = 165
    expect(result.x).toBeCloseTo(10, 6);
    expect(result.y).toBeCloseTo(10, 6);
    expect(result.w).toBeCloseTo(220, 6);
    expect(result.h).toBeCloseTo(165, 6);
    expect(result.w / result.h).toBeCloseTo(4 / 3, 6);
  });

  it("SE corner with Shift does free resize in Size mode", () => {
    const result = applyCropResizeHandle(RECT, "se", 30, 10, {
      constraint: "size", aspect: { w: 4, h: 3 }, shift: true,
    });
    expect(result.x).toBeCloseTo(10, 6);
    expect(result.y).toBeCloseTo(10, 6);
    expect(result.w).toBeCloseTo(230, 6);
    expect(result.h).toBeCloseTo(110, 6);
  });
});

describe("applyCropMove", () => {
  it("moves rect by delta", () => {
    const result = applyCropMove(RECT, 50, 30, 500, 500);
    expect(result).toEqual({ x: 60, y: 40, w: 200, h: 100 });
  });

  it("does not clamp left edge", () => {
    const result = applyCropMove(RECT, -50, 0, 500, 500);
    expect(result.x).toBe(-40);
  });

  it("does not clamp right edge", () => {
    const result = applyCropMove(RECT, 400, 0, 500, 500);
    expect(result.x).toBe(410);
  });
});

describe("constrainCropAspect", () => {
  it("adjusts width to match 1:1", () => {
    const result = constrainCropAspect(RECT, { w: 1, h: 1 });
    expect(result.w).toBe(100);
    expect(result.h).toBe(100);
    expect(result.x).toBe(60);
    expect(result.y).toBe(10);
  });

  it("adjusts height to match 16:9", () => {
    const wide = { x: 10, y: 10, w: 160, h: 100 };
    const result = constrainCropAspect(wide, { w: 16, h: 9 });
    expect(result.w).toBe(160);
    expect(result.h).toBe(90);
    expect(result.y).toBe(15);
  });
});

describe("constrainCropToSize", () => {
  it("scales to exact target size", () => {
    const result = constrainCropToSize(RECT, 100, 50);
    expect(result).toEqual({ x: 0, y: 0, w: 100, h: 50 });
  });
});

describe("applyCropResizeHandle — Ratio mode: reverse diagonal drag stability (regression)", () => {
  const RATIO = { w: 16, h: 9 };

  it("SE corner: drag toward opposite diagonal (up-left) shrinks smoothly", () => {
    let rect = { x: 100, y: 100, w: 400, h: 225 };
    // Simulate a series of pointermoves dragging SE corner up-left
    const moves = [{ dx: -10, dy: -8 }, { dx: -15, dy: -12 }, { dx: -5, dy: -4 }, { dx: -3, dy: -2 }];
    for (const m of moves) {
      rect = applyCropResizeHandle(rect, "se", m.dx, m.dy, {
        constraint: "ratio", aspect: RATIO,
      });
      expect(rect.w / rect.h).toBeCloseTo(16 / 9, 6);
      expect(rect.w).toBeGreaterThanOrEqual(1);
      expect(rect.h).toBeGreaterThanOrEqual(1);
    }
    expect(rect.w).toBeLessThan(380);
    expect(rect.h).toBeLessThan(215);
  });

  it("NE corner: drag toward opposite diagonal (down-right) shrinks smoothly", () => {
    let rect = { x: 100, y: 100, w: 400, h: 225 };
    // NE: hx=1, hy=-1, so projected = dx - dy
    // Use large dy to dominate projected and shrink clearly
    const moves = [{ dx: 50, dy: 150 }, { dx: 80, dy: 200 }, { dx: 30, dy: 100 }];
    for (const m of moves) {
      rect = applyCropResizeHandle(rect, "ne", m.dx, m.dy, {
        constraint: "ratio", aspect: RATIO,
      });
      expect(rect.w / rect.h).toBeCloseTo(16 / 9, 6);
      expect(rect.w).toBeGreaterThanOrEqual(1);
      expect(rect.h).toBeGreaterThanOrEqual(1);
    }
    expect(rect.w).toBeLessThan(250);
  });

  it("NW corner: drag toward opposite diagonal (down-right) shrinks smoothly", () => {
    let rect = { x: 100, y: 100, w: 400, h: 225 };
    const moves = [{ dx: 10, dy: 8 }, { dx: 15, dy: 12 }, { dx: 5, dy: 4 }, { dx: 3, dy: 2 }];
    for (const m of moves) {
      rect = applyCropResizeHandle(rect, "nw", m.dx, m.dy, {
        constraint: "ratio", aspect: RATIO,
      });
      expect(rect.w / rect.h).toBeCloseTo(16 / 9, 6);
      expect(rect.w).toBeGreaterThanOrEqual(1);
      expect(rect.h).toBeGreaterThanOrEqual(1);
    }
    expect(rect.w).toBeLessThan(380);
  });

  it("SW corner: drag toward opposite diagonal (up-right) shrinks smoothly", () => {
    let rect = { x: 100, y: 100, w: 400, h: 225 };
    const moves = [{ dx: 8, dy: -6 }, { dx: 12, dy: -10 }, { dx: 5, dy: -4 }, { dx: 3, dy: -2 }];
    for (const m of moves) {
      rect = applyCropResizeHandle(rect, "sw", m.dx, m.dy, {
        constraint: "ratio", aspect: RATIO,
      });
      expect(rect.w / rect.h).toBeCloseTo(16 / 9, 6);
      expect(rect.w).toBeGreaterThanOrEqual(1);
      expect(rect.h).toBeGreaterThanOrEqual(1);
    }
    expect(rect.w).toBeLessThan(380);
  });

  it("axis crossing stability: dx oscillates while dy is consistently negative on SE", () => {
    let rect = { x: 100, y: 100, w: 400, h: 225 };
    // User drags SE corner up-left; dx wiggles left/right but net is up
    const moves = [
      { dx: -5, dy: -15 },
      { dx: 2, dy: -12 },   // dx crosses zero (rightward wiggle)
      { dx: -3, dy: -14 },   // back to leftward
      { dx: 1, dy: -13 },    // rightward wiggle again
      { dx: -4, dy: -15 },   // leftward again
      { dx: 0, dy: -10 },    // pure vertical
    ];
    const widths: number[] = [];
    for (const m of moves) {
      rect = applyCropResizeHandle(rect, "se", m.dx, m.dy, {
        constraint: "ratio", aspect: RATIO,
      });
      expect(rect.w / rect.h).toBeCloseTo(16 / 9, 6);
      widths.push(rect.w);
    }
    // Width should decrease monotonically despite dx oscillations
    for (let i = 1; i < widths.length; i++) {
      expect(widths[i]).toBeLessThan(widths[i - 1]);
    }
  });

  it("axis crossing stability: dy oscillates while dx is consistently positive on SE", () => {
    let rect = { x: 100, y: 100, w: 400, h: 225 };
    // User drags SE corner rightward; dy wiggles up/down but net is right
    const moves = [
      { dx: 15, dy: -5 },
      { dx: 12, dy: 3 },    // dy crosses zero (downward wiggle)
      { dx: 14, dy: -2 },   // back to up
      { dx: 13, dy: 4 },    // downward wiggle again
      { dx: 15, dy: -3 },   // back to up
    ];
    const widths: number[] = [];
    for (const m of moves) {
      rect = applyCropResizeHandle(rect, "se", m.dx, m.dy, {
        constraint: "ratio", aspect: RATIO,
      });
      expect(rect.w / rect.h).toBeCloseTo(16 / 9, 6);
      widths.push(rect.w);
    }
    // Width should increase monotonically despite dy oscillations
    for (let i = 1; i < widths.length; i++) {
      expect(widths[i]).toBeGreaterThan(widths[i - 1]);
    }
  });

  it("min-size clamping during extreme reverse drag on NW", () => {
    let rect = { x: 200, y: 200, w: 400, h: 225 };
    // Massive drag against NW direction (down-right) to push to minimum
    // With 16:9 aspect ratio, minimum rect saturates at w = 16/9 ≈ 1.777, h = 1
    const moves = [
      { dx: 300, dy: 200 },
      { dx: 500, dy: 300 },
      { dx: 1000, dy: 500 },
    ];
    for (const m of moves) {
      rect = applyCropResizeHandle(rect, "nw", m.dx, m.dy, {
        constraint: "ratio", aspect: RATIO,
      });
      expect(rect.w / rect.h).toBeCloseTo(16 / 9, 6);
      expect(rect.w).toBeGreaterThanOrEqual(1);
      expect(rect.h).toBeGreaterThanOrEqual(1);
    }
    // Minimum rect at 16:9: w >= targetRatio so h = w/targetRatio >= 1
    expect(rect.w).toBeCloseTo(16 / 9, 6);
    expect(rect.h).toBeCloseTo(1, 6);
  });

  it("min-size clamping during extreme reverse drag on SE", () => {
    let rect = { x: 100, y: 100, w: 400, h: 225 };
    const moves = [
      { dx: -300, dy: -200 },
      { dx: -500, dy: -300 },
      { dx: -1000, dy: -500 },
    ];
    for (const m of moves) {
      rect = applyCropResizeHandle(rect, "se", m.dx, m.dy, {
        constraint: "ratio", aspect: RATIO,
      });
      expect(rect.w / rect.h).toBeCloseTo(16 / 9, 6);
      expect(rect.w).toBeGreaterThanOrEqual(1);
      expect(rect.h).toBeGreaterThanOrEqual(1);
    }
    expect(rect.w).toBeCloseTo(16 / 9, 6);
    expect(rect.h).toBeCloseTo(1, 6);
  });

  it("Size mode corner reverse drag on SE: maintains target ratio under shrinkage", () => {
    let rect = { x: 100, y: 100, w: 400, h: 300 };
    const moves = [
      { dx: -40, dy: -30 },
      { dx: -60, dy: -45 },
      { dx: -20, dy: -15 },
    ];
    for (const m of moves) {
      rect = applyCropResizeHandle(rect, "se", m.dx, m.dy, {
        constraint: "size", aspect: { w: 4, h: 3 },
      });
      expect(rect.w / rect.h).toBeCloseTo(4 / 3, 6);
      expect(rect.w).toBeGreaterThanOrEqual(1);
      expect(rect.h).toBeGreaterThanOrEqual(1);
    }
    expect(rect.w).toBeLessThan(320);
  });
});
