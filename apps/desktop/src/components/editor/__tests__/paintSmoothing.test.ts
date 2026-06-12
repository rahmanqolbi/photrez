import { describe, expect, it } from "vitest";
import { smoothingToWindowSize, PaintSmoother } from "../paintSmoothing";

describe("smoothingToWindowSize", () => {
  it("returns 1 for smoothing 0 (no smoothing)", () => {
    expect(smoothingToWindowSize(0)).toBe(1);
  });

  it("returns 2 for smoothing 15 (subtle range)", () => {
    expect(smoothingToWindowSize(15)).toBe(2);
  });

  it("returns 3 for smoothing 30 (upper subtle range)", () => {
    expect(smoothingToWindowSize(30)).toBe(3);
  });

  it("returns value in range for smoothing 50 (medium range)", () => {
    const result = smoothingToWindowSize(50);
    expect(result).toBeGreaterThanOrEqual(4);
    expect(result).toBeLessThanOrEqual(6);
  });

  it("returns value in range for smoothing 85 (strong range)", () => {
    const result = smoothingToWindowSize(85);
    expect(result).toBeGreaterThanOrEqual(7);
    expect(result).toBeLessThanOrEqual(10);
  });

  it("returns 10 for smoothing 100 (max)", () => {
    expect(smoothingToWindowSize(100)).toBe(10);
  });
});

describe("PaintSmoother", () => {
  it("returns identical point when buffer has only one point", () => {
    const smoother = new PaintSmoother();
    const result = smoother.addPoint(100, 200);
    expect(result.x).toBe(100);
    expect(result.y).toBe(200);
  });

  it("returns weighted average with multiple points", () => {
    const smoother = new PaintSmoother();
    smoother.addPoint(0, 0);
    smoother.addPoint(10, 10);
    const result = smoother.addPoint(20, 20);
    expect(result.x).toBeGreaterThan(10);
    expect(result.x).toBeLessThanOrEqual(20);
    expect(result.y).toBeGreaterThan(10);
    expect(result.y).toBeLessThanOrEqual(20);
  });

  it("reset clears the point buffer", () => {
    const smoother = new PaintSmoother();
    smoother.addPoint(100, 200);
    smoother.addPoint(110, 210);
    smoother.reset();
    const result = smoother.addPoint(50, 60);
    expect(result.x).toBe(50);
    expect(result.y).toBe(60);
  });

  it("converges toward latest point with repeated values", () => {
    const smoother = new PaintSmoother();
    for (let i = 0; i < 20; i++) {
      const result = smoother.addPoint(5, 5);
      expect(Math.abs(result.x - 5)).toBeLessThanOrEqual(0.1);
      expect(Math.abs(result.y - 5)).toBeLessThanOrEqual(0.1);
    }
  });
});
