import { describe, it, expect } from "vitest";
import { computeSnapLines } from "../viewport/smartGuides";

describe("computeSnapLines", () => {
  it("returns snap lines when edges align within threshold", () => {
    const moving = { x: 100, y: 100, w: 50, h: 50 };
    const targets = [{ x: 200, y: 100, w: 50, h: 50 }];
    const lines = computeSnapLines(moving, targets, 5);
    expect(lines.length).toBeGreaterThan(0);
  });

  it("returns no snap lines when far apart", () => {
    const moving = { x: 0, y: 0, w: 50, h: 50 };
    const targets = [{ x: 500, y: 500, w: 50, h: 50 }];
    const lines = computeSnapLines(moving, targets, 5);
    expect(lines.length).toBe(0);
  });

  it("detects center alignment snap", () => {
    const moving = { x: 75, y: 100, w: 50, h: 50 }; // cx = 100
    const targets = [{ x: 75, y: 200, w: 50, h: 50 }]; // cx = 100
    const lines = computeSnapLines(moving, targets, 5);
    expect(lines.length).toBeGreaterThan(0);
  });

  it("detects left edge alignment snap", () => {
    const moving = { x: 100, y: 100, w: 50, h: 50 }; // left = 100
    const targets = [{ x: 100, y: 200, w: 50, h: 50 }]; // left = 100
    const lines = computeSnapLines(moving, targets, 5);
    expect(lines.length).toBeGreaterThan(0);
  });

  it("detects top edge alignment snap", () => {
    const moving = { x: 100, y: 100, w: 50, h: 50 }; // top = 100
    const targets = [{ x: 200, y: 100, w: 50, h: 50 }]; // top = 100
    const lines = computeSnapLines(moving, targets, 5);
    expect(lines.length).toBeGreaterThan(0);
  });

  it("detects bottom edge alignment snap", () => {
    const moving = { x: 100, y: 100, w: 50, h: 50 }; // bottom = 150
    const targets = [{ x: 200, y: 150, w: 50, h: 50 }]; // bottom = 200, top = 150
    const lines = computeSnapLines(moving, targets, 5);
    expect(lines.length).toBeGreaterThan(0);
  });

  it("detects right edge alignment snap", () => {
    const moving = { x: 100, y: 100, w: 50, h: 50 }; // right = 150
    const targets = [{ x: 150, y: 200, w: 50, h: 50 }]; // right = 200, left = 150
    const lines = computeSnapLines(moving, targets, 5);
    expect(lines.length).toBeGreaterThan(0);
  });

  it("returns empty for multiple targets when none align", () => {
    const moving = { x: 0, y: 0, w: 50, h: 50 };
    const targets = [
      { x: 500, y: 500, w: 50, h: 50 },
      { x: 600, y: 600, w: 50, h: 50 },
    ];
    const lines = computeSnapLines(moving, targets, 5);
    expect(lines.length).toBe(0);
  });

  it("detects vertical line extending across moving and target bounds", () => {
    const moving = { x: 98, y: 100, w: 50, h: 50 }; // left = 98, close to target left 100
    const targets = [{ x: 100, y: 200, w: 50, h: 50 }];
    const lines = computeSnapLines(moving, targets, 5);
    expect(lines.length).toBeGreaterThan(0);
    const line = lines[0];
    expect(line.x1).toBe(line.x2);
    expect(line.y1).toBeLessThan(line.y2);
  });

  it("detects horizontal line extending across moving and target bounds", () => {
    const moving = { x: 100, y: 98, w: 50, h: 50 }; // top = 98, close to target top 100
    const targets = [{ x: 200, y: 100, w: 50, h: 50 }];
    const lines = computeSnapLines(moving, targets, 5);
    expect(lines.length).toBeGreaterThan(0);
    const line = lines[0];
    expect(line.y1).toBe(line.y2);
    expect(line.x1).toBeLessThan(line.x2);
  });

  it("respects custom threshold", () => {
    const moving = { x: 95, y: 100, w: 50, h: 50 }; // left = 95, distance to 100 is 5
    const targets = [{ x: 100, y: 200, w: 50, h: 50 }];
    const lines = computeSnapLines(moving, targets, 3);
    expect(lines.length).toBe(0);
  });
});
