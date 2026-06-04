import { describe, it, expect } from "vitest";
import {
  clampCropRect,
  constrainCropRectToDocument,
  applyCropResizeHandle,
  applyCropMove,
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

describe("applyCropResizeHandle — Ratio mode", () => {
  it("SE corner maintains aspect ratio", () => {
    const result = applyCropResizeHandle(RECT, "se", 30, 0, {
      constraint: "ratio", aspect: { w: 16, h: 9 },
    });
    expect(result.x).toBe(10);
    expect(result.y).toBe(10);
    expect(result.w).toBe(230);
    expect(result.h).toBeCloseTo(129.375, 4);
    expect(result.w / result.h).toBeCloseTo(16 / 9, 4);
  });

  it("SE corner with Shift does free resize in Ratio mode", () => {
    const result = applyCropResizeHandle(RECT, "se", 30, 10, {
      constraint: "ratio", aspect: { w: 16, h: 9 }, shift: true,
    });
    expect(result.x).toBe(10);
    expect(result.y).toBe(10);
    expect(result.w).toBe(230);
    expect(result.h).toBe(110);
  });

  it("N edge maintains aspect ratio by centering", () => {
    const result = applyCropResizeHandle(RECT, "n", 0, 20, {
      constraint: "ratio", aspect: { w: 1, h: 1 },
    });
    expect(result.h).toBe(80);
    expect(result.w).toBe(80);
    expect(result.x).toBe(70);
    expect(result.y).toBe(30);
  });
});

describe("applyCropResizeHandle — Size mode (uses aspect ratio for constraint)", () => {
  it("SE corner maintains target aspect ratio", () => {
    const result = applyCropResizeHandle(RECT, "se", 30, 0, {
      constraint: "size", aspect: { w: 4, h: 3 },
    });
    expect(result.x).toBe(10);
    expect(result.y).toBe(10);
    expect(result.w).toBe(230);
    expect(result.h).toBeCloseTo(172.5, 4);
    expect(result.w / result.h).toBeCloseTo(4 / 3, 4);
  });

  it("SE corner with Shift does free resize in Size mode", () => {
    const result = applyCropResizeHandle(RECT, "se", 30, 10, {
      constraint: "size", aspect: { w: 4, h: 3 }, shift: true,
    });
    expect(result.x).toBe(10);
    expect(result.y).toBe(10);
    expect(result.w).toBe(230);
    expect(result.h).toBe(110);
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
