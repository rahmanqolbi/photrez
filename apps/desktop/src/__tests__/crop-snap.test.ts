import { describe, it, expect } from "vitest";
import { buildCropSnapTargets, snapCropRect } from "../viewport/cropSnap";

describe("buildCropSnapTargets", () => {
  it("includes canvas edges, centers, and visible layer edges", () => {
    const targets = buildCropSnapTargets(800, 600, [
      { x: 100, y: 50, w: 200, h: 150 },
    ]);
    expect(targets.x).toContain(0);
    expect(targets.x).toContain(800);
    expect(targets.x).toContain(400);
    expect(targets.x).toContain(100);
    expect(targets.x).toContain(300);
    expect(targets.y).toContain(0);
    expect(targets.y).toContain(600);
    expect(targets.y).toContain(200);
  });

  it("includes rule-of-thirds snap targets", () => {
    const targets = buildCropSnapTargets(900, 600, []);
    expect(targets.x).toContain(300);
    expect(targets.x).toContain(600);
    expect(targets.y).toContain(200);
    expect(targets.y).toContain(400);
  });
});

describe("snapCropRect", () => {
  const canvasOnly = buildCropSnapTargets(1000, 800, []);

  it("snaps move drag to canvas left edge", () => {
    const rect = { x: 8, y: 100, w: 200, h: 150 };
    const { rect: snapped, lines } = snapCropRect(rect, "move", canvasOnly, 12);
    expect(snapped.x).toBe(0);
    expect(lines.length).toBeGreaterThan(0);
  });

  it("snaps nw handle to nearby layer edge", () => {
    const targets = buildCropSnapTargets(1000, 800, [
      { x: 50, y: 50, w: 200, h: 200 },
    ]);
    const rect = { x: 52, y: 48, w: 120, h: 120 };
    const { rect: snapped } = snapCropRect(rect, "nw", targets, 12);
    expect(snapped.x).toBe(50);
    expect(snapped.y).toBe(50);
  });

  it("snaps se handle right/bottom edges to canvas", () => {
    const rect = { x: 700, y: 500, w: 290, h: 290 };
    const { rect: snapped } = snapCropRect(rect, "se", canvasOnly, 12);
    expect(snapped.x + snapped.w).toBe(1000);
    expect(snapped.y + snapped.h).toBe(800);
  });

  it("does not snap when beyond threshold", () => {
    const rect = { x: 100, y: 100, w: 200, h: 150 };
    const { rect: snapped, lines } = snapCropRect(rect, "move", canvasOnly, 5);
    expect(snapped).toEqual(rect);
    expect(lines).toEqual([]);
  });

  it("snaps during drag-create (handle 'new') to canvas edges", () => {
    const rect = { x: 8, y: 100, w: 200, h: 150 };
    const { rect: snapped } = snapCropRect(rect, "new", canvasOnly, 12);
    expect(snapped.x).toBe(0);
    expect(snapped.y).toBe(100);
  });

  it("snaps to rule-of-thirds targets during drag-create", () => {
    const targets = buildCropSnapTargets(900, 600, []);
    const rect = { x: 297, y: 198, w: 100, h: 100 };
    const { rect: snapped, lines } = snapCropRect(rect, "new", targets, 12);
    // Left edge at 297 should snap to 300 (1/3 of 900)
    expect(snapped.x).toBe(300);
    // Top edge at 198 should snap to 200 (1/3 of 600)
    expect(snapped.y).toBe(200);
    // Lines should reference guide-edge variable for crop snap
    expect(lines.length).toBeGreaterThan(0);
    expect(lines[0].color).toBe("var(--guide-edge)");
  });
});
