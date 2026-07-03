import { describe, it, expect } from "vitest";
import { rgbToHex, interpolateLinePoints } from "../pointerUtils";

describe("rgbToHex", () => {
  it("converts basic RGB values", () => {
    expect(rgbToHex(255, 0, 0)).toBe("#ff0000");
    expect(rgbToHex(0, 255, 0)).toBe("#00ff00");
    expect(rgbToHex(0, 0, 255)).toBe("#0000ff");
    expect(rgbToHex(0, 0, 0)).toBe("#000000");
    expect(rgbToHex(255, 255, 255)).toBe("#ffffff");
  });

  it("clamps values below 0 to 0", () => {
    expect(rgbToHex(-10, -50, 0)).toBe("#000000");
  });

  it("clamps values above 255 to 255", () => {
    expect(rgbToHex(300, 999, 0)).toBe("#ffff00");
  });

  it("rounds fractional values", () => {
    expect(rgbToHex(127.5, 0, 0)).toBe("#800000");
    expect(rgbToHex(127.4, 0, 0)).toBe("#7f0000");
  });

  it("pads single-digit hex", () => {
    expect(rgbToHex(15, 10, 1)).toBe("#0f0a01");
  });
});

describe("interpolateLinePoints", () => {
  it("returns at least two points when start equals end", () => {
    const pts = interpolateLinePoints({ x: 5, y: 5 }, { x: 5, y: 5 });
    expect(pts).toHaveLength(2);
    expect(pts[0]).toEqual({ x: 5, y: 5 });
    expect(pts[1]).toEqual({ x: 5, y: 5 });
  });

  it("interpolates a horizontal line", () => {
    const pts = interpolateLinePoints({ x: 0, y: 0 }, { x: 3, y: 0 });
    expect(pts[0]).toEqual({ x: 0, y: 0 });
    expect(pts[1]).toEqual({ x: 1, y: 0 });
    expect(pts[2]).toEqual({ x: 2, y: 0 });
    expect(pts[3]).toEqual({ x: 3, y: 0 });
    expect(pts).toHaveLength(4);
  });

  it("interpolates a vertical line", () => {
    const pts = interpolateLinePoints({ x: 0, y: 0 }, { x: 0, y: 3 });
    expect(pts).toHaveLength(4);
    expect(pts[3]).toEqual({ x: 0, y: 3 });
  });

  it("interpolates a diagonal (Pythagorean distance 5 → 6 points)", () => {
    const pts = interpolateLinePoints({ x: 0, y: 0 }, { x: 3, y: 4 });
    expect(pts).toHaveLength(6);
    expect(pts[0]).toEqual({ x: 0, y: 0 });
    expect(pts[5]).toEqual({ x: 3, y: 4 });
  });
});
