import { describe, it, expect } from "vitest";
import {
  clampCropRect,
  applyCropResizeHandle,
  applyCropMove,
  constrainCropAspect,
  constrainCropToSize,
} from "../viewport/cropGeometry";

const RECT = { x: 10, y: 10, w: 200, h: 100 };

describe("clampCropRect", () => {
  it("clamps negative left/top", () => {
    const result = clampCropRect({ x: -50, y: -30, w: 200, h: 100 }, 500, 500);
    expect(result).toEqual({ x: 0, y: 0, w: 150, h: 70 });
  });

  it("clamps right/bottom overflow", () => {
    const result = clampCropRect({ x: 400, y: 450, w: 200, h: 100 }, 500, 500);
    expect(result).toEqual({ x: 400, y: 450, w: 100, h: 50 });
  });

  it("passes through rect inside bounds", () => {
    const result = clampCropRect({ x: 50, y: 50, w: 200, h: 100 }, 500, 500);
    expect(result).toEqual({ x: 50, y: 50, w: 200, h: 100 });
  });
});

describe("applyCropResizeHandle", () => {
  it("SE corner increases w/h proportionally (no aspect, no shift)", () => {
    const result = applyCropResizeHandle(RECT, "se", 30, 0, null);
    expect(result.x).toBe(10);
    expect(result.y).toBe(10);
    expect(result.w).toBeCloseTo(220, 4);
    expect(result.h).toBeCloseTo(110, 4);
  });

  it("SE corner with Shift does free resize (dx→w, dy→h)", () => {
    const result = applyCropResizeHandle(RECT, "se", 30, 10, null, true);
    expect(result.x).toBe(10);
    expect(result.y).toBe(10);
    expect(result.w).toBe(230);
    expect(result.h).toBe(110);
  });

  it("S edge only changes height", () => {
    const result = applyCropResizeHandle(RECT, "s", 0, 20, null);
    expect(result.x).toBe(10);
    expect(result.y).toBe(10);
    expect(result.w).toBe(200);
    expect(result.h).toBe(120);
  });

  it("NW corner with Alt resizes from center", () => {
    const result = applyCropResizeHandle(RECT, "nw", 10, 10, null, false, true);
    expect(result.x).toBeCloseTo(23.33, 2);
    expect(result.y).toBeCloseTo(16.67, 2);
    expect(result.w).toBeCloseTo(173.33, 2);
    expect(result.h).toBeCloseTo(86.67, 2);
  });

  it("corner with aspect ratio lock maintains ratio", () => {
    const result = applyCropResizeHandle(RECT, "se", 30, 0, { w: 16, h: 9 });
    expect(result.x).toBe(10);
    expect(result.y).toBe(10);
    expect(result.w).toBeCloseTo(230, 4);
    expect(result.h).toBeCloseTo(129.375, 4);
    expect(result.w / result.h).toBeCloseTo(16 / 9, 4);
  });
});

describe("applyCropMove", () => {
  it("moves rect by delta", () => {
    const result = applyCropMove(RECT, 50, 30, 500, 500);
    expect(result).toEqual({ x: 60, y: 40, w: 200, h: 100 });
  });

  it("clamps left edge", () => {
    const result = applyCropMove(RECT, -50, 0, 500, 500);
    expect(result.x).toBe(0);
  });

  it("clamps right edge", () => {
    const result = applyCropMove(RECT, 400, 0, 500, 500);
    expect(result.x).toBe(300);
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
