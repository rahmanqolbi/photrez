import { describe, it, expect } from "vitest";

function computeEdgeScroll(
  clientX: number,
  clientY: number,
  rect: DOMRect,
  edgeZonePx: number,
  maxSpeed: number,
  dt: number,
): { panX: number; panY: number } | null {
  const cx = clientX - rect.left;
  const cy = clientY - rect.top;
  const midX = rect.width / 2;
  const midY = rect.height / 2;
  const dirX = cx < midX ? 1 : -1;
  const dirY = cy < midY ? 1 : -1;
  const distX = cx < midX ? cx : rect.width - cx;
  const distY = cy < midY ? cy : rect.height - cy;

  if (distX >= edgeZonePx && distY >= edgeZonePx) return null;

  const tX = Math.min(1, Math.max(0, (edgeZonePx - distX) / edgeZonePx));
  const tY = Math.min(1, Math.max(0, (edgeZonePx - distY) / edgeZonePx));
  return {
    panX: dirX * tX * maxSpeed * dt,
    panY: dirY * tY * maxSpeed * dt,
  };
}

describe("computeEdgeScroll", () => {
  const rect = {
    left: 0, top: 0, width: 800, height: 600,
    right: 800, bottom: 600,
    x: 0, y: 0,
    toJSON() { return {}; },
  } as DOMRect;

  const EDGE_ZONE = 40;
  const MAX_SPEED = 200;
  const DT = 1 / 60; // ~16ms per frame

  it("returns null when pointer is far from all edges", () => {
    const result = computeEdgeScroll(400, 300, rect, EDGE_ZONE, MAX_SPEED, DT);
    expect(result).toBeNull();
  });

  it("scrolls left when pointer is near left edge", () => {
    const result = computeEdgeScroll(10, 300, rect, EDGE_ZONE, MAX_SPEED, DT);
    expect(result).not.toBeNull();
    expect(result!.panX).toBeGreaterThan(0);  // dirX = +1 → pan.x increases → scrolls left
    expect(result!.panY).toBeCloseTo(0, 6);
  });

  it("scrolls right when pointer is near right edge", () => {
    const result = computeEdgeScroll(795, 300, rect, EDGE_ZONE, MAX_SPEED, DT);
    expect(result).not.toBeNull();
    expect(result!.panX).toBeLessThan(0);  // dirX = -1 → pan.x decreases → scrolls right
    expect(result!.panY).toBeCloseTo(0, 6);
  });

  it("scrolls up when pointer is near top edge", () => {
    const result = computeEdgeScroll(400, 10, rect, EDGE_ZONE, MAX_SPEED, DT);
    expect(result).not.toBeNull();
    expect(result!.panY).toBeGreaterThan(0);  // dirY = +1 → pan.y increases → scrolls up
    expect(result!.panX).toBeCloseTo(0, 6);
  });

  it("scroll speed is proportional to edge proximity", () => {
    const nearEdge = computeEdgeScroll(5, 300, rect, EDGE_ZONE, MAX_SPEED, DT);
    const midZone = computeEdgeScroll(25, 300, rect, EDGE_ZONE, MAX_SPEED, DT);
    expect(nearEdge).not.toBeNull();
    expect(midZone).not.toBeNull();
    expect(Math.abs(nearEdge!.panX)).toBeGreaterThan(Math.abs(midZone!.panX));
  });

  it("scrolls both axes simultaneously when pointer is in corner", () => {
    const result = computeEdgeScroll(10, 10, rect, EDGE_ZONE, MAX_SPEED, DT);
    expect(result).not.toBeNull();
    expect(result!.panX).toBeGreaterThan(0);
    expect(result!.panY).toBeGreaterThan(0);
  });

  it("produces identical result regardless of zoom (screen-space scroll)", () => {
    const r1 = computeEdgeScroll(10, 300, rect, EDGE_ZONE, MAX_SPEED, DT);
    const r2 = computeEdgeScroll(10, 300, rect, EDGE_ZONE, MAX_SPEED, DT);
    expect(r1).toEqual(r2);
  });

  it("exact edge (dist=0) produces max speed", () => {
    const result = computeEdgeScroll(0, 300, rect, EDGE_ZONE, MAX_SPEED, DT);
    expect(result).not.toBeNull();
    expect(result!.panX).toBeCloseTo(MAX_SPEED * DT, 6);
  });

  it("at exact right edge (dist=0) scrolls right (negative)", () => {
    const result = computeEdgeScroll(800, 300, rect, EDGE_ZONE, MAX_SPEED, DT);
    expect(result).not.toBeNull();
    expect(result!.panX).toBeLessThan(0);
  });
});
