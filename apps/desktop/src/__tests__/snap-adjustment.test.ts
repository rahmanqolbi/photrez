import { describe, it, expect } from "vitest";
import { computeSnapAdjustment } from "../viewport/smartGuides";

describe("computeSnapAdjustment", () => {
  it("returns zero delta and no lines when no target is within threshold", () => {
    const moving = { x: 0, y: 0, w: 50, h: 50 };
    const targets = [{ x: 500, y: 500, w: 50, h: 50 }];
    const result = computeSnapAdjustment(moving, targets, 5);
    expect(result.dx).toBe(0);
    expect(result.dy).toBe(0);
    expect(result.lines).toEqual([]);
  });

  it("snaps moving left edge to target left edge", () => {
    const moving = { x: 98, y: 100, w: 50, h: 50 };
    const targets = [{ x: 100, y: 200, w: 50, h: 50 }];
    const result = computeSnapAdjustment(moving, targets, 5);
    expect(result.dx).toBe(2);
    expect(result.dy).toBe(0);
    expect(result.lines.length).toBe(1);
    expect(result.lines[0].x1).toBe(100);
    expect(result.lines[0].x2).toBe(100);
  });

  it("snaps moving center to target center", () => {
    const moving = { x: 75, y: 100, w: 50, h: 50 };
    const targets = [{ x: 75, y: 200, w: 50, h: 50 }];
    const result = computeSnapAdjustment(moving, targets, 5);
    expect(result.dx).toBe(0);
    expect(result.dy).toBe(0);
    expect(result.lines.length).toBeGreaterThan(0);
  });

  it("snaps moving center to canvas horizontal center (synthetic vertical line)", () => {
    // doc width 1000, moving 200x200 centered at x=498 (200 + 100 - 2)
    // vertical center line: x=500 spanning full height
    const moving = { x: 298, y: 0, w: 200, h: 200 };
    const targets = [
      { x: 500, y: -Infinity, w: 0, h: Infinity },
    ];
    const result = computeSnapAdjustment(moving, targets, 5);
    expect(result.dx).toBe(2);
    expect(result.dy).toBe(0);
    expect(result.lines.length).toBe(1);
    expect(result.lines[0].x1).toBe(500);
  });

  it("snaps moving top edge to target top edge", () => {
    const moving = { x: 100, y: 98, w: 50, h: 50 };
    const targets = [{ x: 200, y: 100, w: 50, h: 50 }];
    const result = computeSnapAdjustment(moving, targets, 5);
    expect(result.dx).toBe(0);
    expect(result.dy).toBe(2);
    expect(result.lines.length).toBe(1);
    expect(result.lines[0].y1).toBe(100);
    expect(result.lines[0].y2).toBe(100);
  });

  it("picks the nearest target when multiple are within threshold (X axis)", () => {
    // left = 0, distance 2
    // left 2, distance 2
    // left 4, distance 4
    const moving = { x: 0, y: 0, w: 50, h: 50 };
    const targets = [
      { x: 2, y: 200, w: 50, h: 50 },
      { x: 4, y: 200, w: 50, h: 50 },
    ];
    const result = computeSnapAdjustment(moving, targets, 5);
    expect(result.dx).toBe(2);
    expect(result.lines.length).toBe(1);
    expect(result.lines[0].x1).toBe(2);
  });

  it("emits at most one line per axis (0, 1, or 2 total)", () => {
    const moving = { x: 98, y: 98, w: 50, h: 50 };
    const targets = [{ x: 100, y: 100, w: 50, h: 50 }];
    const result = computeSnapAdjustment(moving, targets, 5);
    expect(result.lines.length).toBeLessThanOrEqual(2);
  });

  it("respects custom threshold (no snap when distance >= threshold)", () => {
    const moving = { x: 95, y: 100, w: 50, h: 50 };
    const targets = [{ x: 100, y: 200, w: 50, h: 50 }];
    const result = computeSnapAdjustment(moving, targets, 3);
    expect(result.dx).toBe(0);
    expect(result.dy).toBe(0);
    expect(result.lines).toEqual([]);
  });

  it("uses default threshold of 5 when none provided", () => {
    // left = 96, distance to 100 is 4
    const moving = { x: 96, y: 0, w: 50, h: 50 };
    const targets = [{ x: 100, y: 0, w: 50, h: 50 }];
    const result = computeSnapAdjustment(moving, targets);
    expect(result.dx).toBe(4);
    expect(result.lines.length).toBeGreaterThanOrEqual(1);
    expect(result.lines[0].x1).toBe(100);
  });

  it("emits a vertical guide for a horizontal-axis snap and vice versa", () => {
    const xOnly = computeSnapAdjustment(
      { x: 98, y: 0, w: 50, h: 50 },
      [{ x: 100, y: 200, w: 50, h: 50 }],
      5,
    );
    expect(xOnly.lines.length).toBeGreaterThan(0);
    expect(xOnly.lines[0].x1).toBe(xOnly.lines[0].x2);

    const yOnly = computeSnapAdjustment(
      { x: 0, y: 98, w: 50, h: 50 },
      [{ x: 200, y: 100, w: 50, h: 50 }],
      5,
    );
    expect(yOnly.lines.length).toBeGreaterThan(0);
    expect(yOnly.lines[0].y1).toBe(yOnly.lines[0].y2);
  });
});
