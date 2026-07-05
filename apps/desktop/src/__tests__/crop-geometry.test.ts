import { describe, it, expect } from "vitest";
import {
  clampCropRect,
  constrainCropRectToDocument,
  applyCropResizeHandle,
  applyCropMove,
  screenDeltaToRotatedCropLocalDelta,
  constrainCropAspect,
  constrainCropToSize,
  rotateHandleType,
} from "../viewport/cropGeometry";
import { fitCropRectToAspect } from "../viewport/cropAutoFit";

const RECT = { x: 10, y: 10, w: 200, h: 100 };

describe("rotateHandleType — internal rotate mapping (implementation-focused)", () => {
  it("0° rotation returns the same handle", () => {
    expect(rotateHandleType("e", 0)).toBe("e");
    expect(rotateHandleType("se", 0)).toBe("se");
    expect(rotateHandleType("nw", 0)).toBe("nw");
  });

  it("90° rotation maps east→south, south→west, west→north, north→east", () => {
    expect(rotateHandleType("e", 90)).toBe("s");
    expect(rotateHandleType("s", 90)).toBe("w");
    expect(rotateHandleType("w", 90)).toBe("n");
    expect(rotateHandleType("n", 90)).toBe("e");
  });

  it("90° rotation maps corners: se→sw, sw→nw, nw→ne, ne→se", () => {
    expect(rotateHandleType("se", 90)).toBe("sw");
    expect(rotateHandleType("sw", 90)).toBe("nw");
    expect(rotateHandleType("nw", 90)).toBe("ne");
    expect(rotateHandleType("ne", 90)).toBe("se");
  });

  it("45° rotation maps east→southeast", () => {
    expect(rotateHandleType("e", 45)).toBe("se");
    expect(rotateHandleType("w", 45)).toBe("nw");
    expect(rotateHandleType("n", 45)).toBe("ne");
    expect(rotateHandleType("s", 45)).toBe("sw");
  });

  it("180° rotation inverts all handles", () => {
    expect(rotateHandleType("e", 180)).toBe("w");
    expect(rotateHandleType("se", 180)).toBe("nw");
    expect(rotateHandleType("ne", 180)).toBe("sw");
    expect(rotateHandleType("w", 180)).toBe("e");
  });

  it("negative rotation (-90°) maps opposite to +270°", () => {
    expect(rotateHandleType("e", -90)).toBe("n");
    expect(rotateHandleType("s", -90)).toBe("e");
    expect(rotateHandleType("se", -90)).toBe("ne");
  });

  it("315° (=-45°) maps east→northeast", () => {
    expect(rotateHandleType("e", 315)).toBe("ne");
    expect(rotateHandleType("s", 315)).toBe("se");
  });

  it("returns unknown handle type unchanged (e.g. 'move', 'rotate')", () => {
    expect(rotateHandleType("move", 45)).toBe("move");
    expect(rotateHandleType("rotate", 90)).toBe("rotate");
  });

  it("all eight handles rotate consistently across 360°", () => {
    const handles = ["n", "ne", "e", "se", "s", "sw", "w", "nw"];
    // After 360°, each handle should return to itself
    for (const h of handles) {
      expect(rotateHandleType(h, 360)).toBe(h);
    }
  });

  it("30° rounds to nearest 45° increment (30 → 1 step = 45°)", () => {
    // 30/45 = 0.667 → Math.round = 1 step → e → se
    expect(rotateHandleType("e", 30)).toBe("se");
  });

  it("22° rounds to nearest 45° increment (22/45 = 0.489 → round = 0)", () => {
    // 22/45 = 0.489 → Math.round = 0 steps → unchanged
    expect(rotateHandleType("e", 22)).toBe("e");
    expect(rotateHandleType("e", 23)).toBe("se"); // 23/45 = 0.511 → 1 step
  });
});

describe("fitCropRectToAspect — auto-fit logic (implementation-focused)", () => {
  const DOC = { w: 1600, h: 1200 };

  it("fits 16:9 into 1600x1200: width-constrained (h = 900)", () => {
    const result = fitCropRectToAspect({ w: 16, h: 9 }, DOC.w, DOC.h, 0);
    expect(result.w).toBe(1600);
    expect(result.h).toBe(900);
    expect(result.x).toBe(0);
    expect(result.y).toBeCloseTo(150, 1);
  });

  it("fits 3:4 into 1600x1200: height-constrained (w = 900)", () => {
    const result = fitCropRectToAspect({ w: 3, h: 4 }, DOC.w, DOC.h, 0);
    expect(result.w).toBe(900);
    expect(result.h).toBe(1200);
    expect(result.x).toBeCloseTo(350, 1);
    expect(result.y).toBe(0);
  });

  it("exact match (4:3) fills entire canvas", () => {
    const result = fitCropRectToAspect({ w: 4, h: 3 }, 800, 600, 0);
    expect(result).toEqual({ x: 0, y: 0, w: 800, h: 600 });
  });

  it("square (1:1) into 1600x1200: height-constrained, w=h=1200", () => {
    const result = fitCropRectToAspect({ w: 1, h: 1 }, DOC.w, DOC.h, 0);
    expect(result.w).toBe(1200);
    expect(result.h).toBe(1200);
    expect(result.x).toBeCloseTo(200, 1);
    expect(result.y).toBe(0);
  });

  it("extreme aspect 100:1 into 1600x1200: very wide, height-limited", () => {
    const result = fitCropRectToAspect({ w: 100, h: 1 }, DOC.w, DOC.h, 0);
    // 1200*100 = 120000 > 1600, so width-constrained: w=1600, h=16
    expect(result.w).toBe(1600);
    expect(result.h).toBe(16);
    expect(result.x).toBe(0);
    expect(result.y).toBeCloseTo(592, 1);
  });

  it("extreme aspect 1:100 into 1600x1200: very tall, height-limited", () => {
    const result = fitCropRectToAspect({ w: 1, h: 100 }, DOC.w, DOC.h, 0);
    // 1600*100 = 160000 > 1200, so height-constrained: h=1200, w=12
    expect(result.w).toBe(12);
    expect(result.h).toBe(1200);
    expect(result.x).toBeCloseTo(794, 1);
    expect(result.y).toBe(0);
  });

  it("handles rotation by reducing fit area (45° rotation shrinks available space)", () => {
    // At 45°, the inscribed axis-aligned rect inside rotated canvas is smaller
    const result = fitCropRectToAspect({ w: 1, h: 1 }, 200, 200, 45);
    // With 45° rotation, the crop box must fit within the rotated canvas
    expect(result.w).toBeGreaterThan(0);
    expect(result.h).toBeGreaterThan(0);
    expect(result.w).toBeCloseTo(result.h); // should be square
    // The max square at 45° in 200x200 is ~141x141
    expect(result.w).toBeLessThan(150);
    expect(result.w).toBeGreaterThan(100);
  });

  it("90° rotation inverts aspect ratio but final rect is same as unrotated for 1:1", () => {
    const result = fitCropRectToAspect({ w: 1, h: 1 }, 200, 200, 90);
    // 90° rotation still produces same result since it's a square
    expect(result.w).toBeCloseTo(result.h);
    expect(result.w).toBe(200);
    expect(result.h).toBe(200);
  });

  it("produces finite values for extreme rotation angles", () => {
    const result = fitCropRectToAspect({ w: 1, h: 1 }, 1000, 800, 89.999);
    expect(Number.isFinite(result.w)).toBe(true);
    expect(Number.isFinite(result.h)).toBe(true);
    expect(result.w).toBeGreaterThan(1);
    expect(result.h).toBeGreaterThan(1);
  });

  it("tiny canvas (1x1) doesn't produce NaN", () => {
    const result = fitCropRectToAspect({ w: 3, h: 4 }, 1, 1, 0);
    expect(Number.isFinite(result.w)).toBe(true);
    expect(Number.isFinite(result.h)).toBe(true);
    expect(result.w).toBeGreaterThanOrEqual(0);
    expect(result.h).toBeGreaterThanOrEqual(0);
  });

  it("zero aspect ratio fills entire canvas (effectively free)", () => {
    // aspect 0/1 = 0, which means w = 0 * h = 0 in some paths
    const result = fitCropRectToAspect({ w: 0, h: 1 }, 500, 300, 0);
    expect(Number.isFinite(result.w)).toBe(true);
    expect(Number.isFinite(result.h)).toBe(true);
  });
});

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

describe("applyCropResizeHandle — edge cases", () => {
  it("extreme aspect ratio (100:1) maintains ratio", () => {
    const rect = { x: 100, y: 100, w: 800, h: 8 };
    const result = applyCropResizeHandle(rect, "se", 40, 0, {
      constraint: "ratio", aspect: { w: 100, h: 1 },
    });
    expect(result.w / result.h).toBeCloseTo(100, 5);
  });

  it("extreme aspect ratio (1:100) maintains ratio", () => {
    const rect = { x: 100, y: 100, w: 8, h: 800 };
    const result = applyCropResizeHandle(rect, "se", 0, 40, {
      constraint: "ratio", aspect: { w: 1, h: 100 },
    });
    expect(result.w / result.h).toBeCloseTo(1 / 100, 5);
  });

  it("zero delta returns same rect", () => {
    const result = applyCropResizeHandle(RECT, "se", 0, 0);
    expect(result).toEqual(RECT);
  });

  it("all eight handles with zero delta return same rect", () => {
    for (const handle of ["e", "w", "n", "s", "ne", "nw", "se", "sw"]) {
      const result = applyCropResizeHandle(RECT, handle, 0, 0);
      expect(result).toEqual(RECT);
    }
  });

  it("size mode with zero-size target uses aspect", () => {
    const result = applyCropResizeHandle(RECT, "se", 30, 0, {
      constraint: "size", aspect: { w: 4, h: 3 },
    });
    expect(result.w / result.h).toBeCloseTo(4 / 3, 6);
  });

  it("shift in free mode = proportional (square aspect)", () => {
    const result = applyCropResizeHandle(RECT, "se", 30, 10, {
      shift: true,
    });
    // In free mode: shift+corner should preserve the current aspect ratio
    expect(result.w / result.h).toBeCloseTo(200 / 100, 4);
  });

  it("shift in ratio mode = free resize (temporarily break ratio)", () => {
    const result = applyCropResizeHandle(RECT, "se", 30, 10, {
      constraint: "ratio", aspect: { w: 16, h: 9 }, shift: true,
    });
    // shift=true in ratio mode should do FREEE resize (not proportional)
    // Free: w += 30, h += 10
    expect(result.w).toBeCloseTo(230, 6);
    expect(result.h).toBeCloseTo(110, 6);
    expect(result.w / result.h).not.toBeCloseTo(200 / 100, 4);
  });

  it("alt + shift in ratio mode: center-out free resize", () => {
    const result = applyCropResizeHandle(RECT, "nw", 10, 10, {
      constraint: "ratio", aspect: { w: 16, h: 9 }, alt: true, shift: true,
    });
    expect(result.w).toBeCloseTo(180, 2);
    expect(result.h).toBeCloseTo(80, 2);
  });

  it("prevents degenerate rect sizes below 1", () => {
    // Drag SE corner far up-left to try to create negative size
    const result = applyCropResizeHandle(
      { x: 100, y: 100, w: 200, h: 150 },
      "se", -500, -400,
    );
    expect(result.w).toBeGreaterThanOrEqual(1);
    expect(result.h).toBeGreaterThanOrEqual(1);
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

  it("zero delta returns same rect", () => {
    const result = applyCropMove(RECT, 0, 0, 500, 500);
    expect(result).toEqual(RECT);
  });

  it("extreme delta still returns valid rect", () => {
    const result = applyCropMove(RECT, 10000, -5000, 500, 500);
    expect(Number.isFinite(result.x)).toBe(true);
    expect(Number.isFinite(result.y)).toBe(true);
    expect(result.w).toBe(200);
    expect(result.h).toBe(100);
  });

  it("does not clamp above canvas bounds", () => {
    const result = applyCropMove(RECT, 10000, 0, 500, 500);
    expect(result.x).toBeGreaterThan(500);
  });

  it("does not clamp below canvas bounds", () => {
    const result = applyCropMove(RECT, -10000, 0, 500, 500);
    expect(result.x).toBeLessThan(0);
  });
});

describe("constrainCropRectToDocument — edge cases", () => {
  it("negative width/height gets clamped to 1", () => {
    const result = constrainCropRectToDocument({ x: 10, y: 10, w: -50, h: -30 }, 500, 500);
    expect(result.w).toBe(1);
    expect(result.h).toBe(1);
  });

  it("zero width/height gets clamped to 1", () => {
    const result = constrainCropRectToDocument({ x: 10, y: 10, w: 0, h: 0 }, 500, 500);
    expect(result.w).toBe(1);
    expect(result.h).toBe(1);
  });

  it("NaN coordinates produce NaN in result (caller must sanitize before engine)", () => {
    // constrainCropRectToDocument only enforces minimum width/height >= 1.
    // NaN x/y propagate through Math.min/Math.max unchanged.
    const result = constrainCropRectToDocument({ x: NaN, y: NaN, w: 100, h: 100 }, 500, 500);
    expect(Number.isNaN(result.x)).toBe(true);
    expect(Number.isNaN(result.y)).toBe(true);
    expect(result.w).toBe(100);
    expect(result.h).toBe(100);
  });
  
  it("Infinity values produce Infinity in result (caller must sanitize before engine)", () => {
    // NaN/Infinity aren't sanitized by constrainCropRectToDocument.
    // The caller (cropToolActions.applyCropPreview) rounds to integers via
    // Math.round before passing to engine.applyCrop, which handles them.
    const result = constrainCropRectToDocument({ x: Infinity, y: -Infinity, w: 100, h: 100 }, 500, 500);
    expect(result.x).toBe(Infinity);
    expect(result.y).toBe(-Infinity);
    expect(result.w).toBe(100);
    expect(result.h).toBe(100);
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

  it("exact aspect ratio returns same rect unchanged", () => {
    const rect = { x: 100, y: 50, w: 200, h: 100 };
    const result = constrainCropAspect(rect, { w: 2, h: 1 });
    expect(result).toEqual(rect);
  });

  it("extreme aspect 100:1: width clamped, tiny height", () => {
    const rect = { x: 0, y: 0, w: 2000, h: 1000 };
    // rect aspect = 2:1, target aspect = 100:1
    // Since rect is "taller" than target, height is reduced: newH = w / ratio = 2000/100 = 20
    const result = constrainCropAspect(rect, { w: 100, h: 1 });
    expect(result.w / result.h).toBeCloseTo(100, 5);
    expect(result.w).toBe(2000);
    expect(result.h).toBe(20);
    expect(result.y).toBeCloseTo(490, 1);  // (1000 - 20) / 2
  });

  it("extreme aspect 1:100: height clamped, tiny width", () => {
    const rect = { x: 0, y: 0, w: 2000, h: 1000 };
    // rect aspect = 2:1, target aspect = 1:100 = 0.01
    // Since rect is "wider" than target, width is reduced: newW = h * ratio = 1000 * 0.01 = 10
    const result = constrainCropAspect(rect, { w: 1, h: 100 });
    expect(result.w / result.h).toBeCloseTo(0.01, 5);
    expect(result.w).toBe(10);
    expect(result.h).toBe(1000);
    expect(result.x).toBeCloseTo(995, 1);  // (2000 - 10) / 2
  });

  it("extreme aspect 1:100: height clamped, tiny width", () => {
    const rect = { x: 0, y: 0, w: 2000, h: 1000 };
    const result = constrainCropAspect(rect, { w: 1, h: 100 });
    expect(result.w / result.h).toBeCloseTo(1 / 100, 5);
    expect(result.w).toBe(10);
    expect(result.h).toBe(1000);
  });

  it("zero-width rect still produces valid result (no division by zero)", () => {
    const rect = { x: 10, y: 10, w: 0, h: 100 };
    const result = constrainCropAspect(rect, { w: 1, h: 1 });
    expect(Number.isFinite(result.w)).toBe(true);
    expect(Number.isFinite(result.h)).toBe(true);
    expect(result.w).toBeGreaterThanOrEqual(0);
  });

  it("zero-height rect still produces valid result (no division by zero)", () => {
    const rect = { x: 10, y: 10, w: 100, h: 0 };
    const result = constrainCropAspect(rect, { w: 1, h: 1 });
    expect(Number.isFinite(result.w)).toBe(true);
    expect(Number.isFinite(result.h)).toBe(true);
  });
});

describe("constrainCropToSize", () => {
  it("scales to exact target size", () => {
    const result = constrainCropToSize(RECT, 100, 50);
    expect(result).toEqual({ x: 0, y: 0, w: 100, h: 50 });
  });

  it("rect already matching target size — no-op (centers at 0,0)", () => {
    const result = constrainCropToSize({ x: 10, y: 20, w: 100, h: 50 }, 100, 50);
    expect(result.w).toBe(100);
    expect(result.h).toBe(50);
    expect(result.x).toBe(0);
    expect(result.y).toBe(0);
  });

  it("rect smaller than target — scales up to fit", () => {
    const result = constrainCropToSize({ x: 0, y: 0, w: 50, h: 30 }, 200, 200);
    // scale = min(200/50, 200/30) = min(4, 6.67) = 4
    expect(result.w).toBe(200);
    expect(result.h).toBe(120);
    expect(result.x).toBe(0);
    expect(result.y).toBeCloseTo(40, 1);
  });

  it("rect larger than target — scales down to fit", () => {
    const result = constrainCropToSize({ x: 0, y: 0, w: 1000, h: 800 }, 200, 200);
    // scale = min(200/1000, 200/800) = min(0.2, 0.25) = 0.2
    expect(result.w).toBe(200);
    expect(result.h).toBe(160);
    expect(result.x).toBe(0);
    expect(result.y).toBeCloseTo(20, 1);
  });

  it("target size 0 avoids division by zero", () => {
    const result = constrainCropToSize(RECT, 0, 0);
    // scale = min(0/200, 0/100) = 0 or NaN depending on implementation
    // Should either produce 0-dim or avoid division by zero
    expect(Number.isFinite(result.w)).toBe(true);
    expect(Number.isFinite(result.h)).toBe(true);
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
