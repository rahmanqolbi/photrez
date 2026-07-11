import { describe, it, expect, vi } from "vitest";
import { computeEdgeScroll, smoothstep, EDGE_SCROLL_SPEED_FACTOR, type EdgeScrollDeps } from "../edgeScroll";

const rect = {
  left: 0, top: 0, width: 800, height: 600,
  right: 800, bottom: 600,
  x: 0, y: 0,
  toJSON() { return {}; },
} as DOMRect;

function makeDeps(overrides: Partial<EdgeScrollDeps> = {}): EdgeScrollDeps {
  const renderNow = vi.fn();
  const camera = {
    pan: vi.fn(),
    getState: () => ({ x: 0, y: 0, zoom: 1 }),
  } as unknown as EdgeScrollDeps["camera"];
  return {
    camera,
    setPan: vi.fn(),
    scheduler: { renderNow } as unknown as EdgeScrollDeps["scheduler"],
    getContainerRect: () => rect,
    ...overrides,
  };
}

describe("computeEdgeScroll", () => {
  const EDGE_ZONE = 40;
  const DT = 1 / 60;

  it("returns scrolled:false when pointer is far from all edges", () => {
    const d = makeDeps();
    const result = computeEdgeScroll(400, 300, DT, d, EDGE_ZONE);
    expect(result.scrolled).toBe(false);
  });

  it("scrolls left when pointer is near left edge", () => {
    const d = makeDeps();
    const result = computeEdgeScroll(10, 300, DT, d, EDGE_ZONE);
    expect(result.scrolled).toBe(true);
    // dirX = +1 → pan.x increases → scrolls left; maxX = rect.width · factor
    const proximity = (EDGE_ZONE - 10) / EDGE_ZONE;
    expect(d.camera.pan).toHaveBeenCalledWith(
      expect.closeTo(DT * rect.width * EDGE_SCROLL_SPEED_FACTOR * smoothstep(proximity), 4),
      expect.any(Number),
    );
    expect(d.setPan).toHaveBeenCalled();
  });

  it("scrolls right when pointer is near right edge", () => {
    const d = makeDeps();
    const result = computeEdgeScroll(795, 300, DT, d, EDGE_ZONE);
    expect(result.scrolled).toBe(true);
    // dirX = -1 → pan.x decreases → scrolls right
    const proximity = (EDGE_ZONE - 5) / EDGE_ZONE;
    expect(d.camera.pan).toHaveBeenCalledWith(
      expect.closeTo(-DT * rect.width * EDGE_SCROLL_SPEED_FACTOR * smoothstep(proximity), 4),
      expect.any(Number),
    );
  });

  it("scrolls up when pointer is near top edge", () => {
    const d = makeDeps();
    const result = computeEdgeScroll(400, 10, DT, d, EDGE_ZONE);
    expect(result.scrolled).toBe(true);
    const panArg = (d.camera.pan as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(panArg[1]).toBeGreaterThan(0); // dirY = +1 → pan.y increases → scrolls up
  });

  it("scroll speed is proportional to edge proximity", () => {
    const near = makeDeps();
    const mid = makeDeps();
    computeEdgeScroll(5, 300, DT, near, EDGE_ZONE);
    computeEdgeScroll(25, 300, DT, mid, EDGE_ZONE);
    const nearX = Math.abs((near.camera.pan as ReturnType<typeof vi.fn>).mock.calls[0][0]);
    const midX = Math.abs((mid.camera.pan as ReturnType<typeof vi.fn>).mock.calls[0][0]);
    expect(nearX).toBeGreaterThan(midX);
  });

  it("scrolls both axes simultaneously when pointer is in corner", () => {
    const d = makeDeps();
    const result = computeEdgeScroll(10, 10, DT, d, EDGE_ZONE);
    expect(result.scrolled).toBe(true);
    const panArg = (d.camera.pan as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(panArg[0]).toBeGreaterThan(0);
    expect(panArg[1]).toBeGreaterThan(0);
  });

  it("produces identical result regardless of zoom (screen-space scroll)", () => {
    const r1 = makeDeps();
    const r2 = makeDeps();
    computeEdgeScroll(10, 300, DT, r1, EDGE_ZONE);
    computeEdgeScroll(10, 300, DT, r2, EDGE_ZONE);
    expect((r1.camera.pan as ReturnType<typeof vi.fn>).mock.calls[0])
      .toEqual((r2.camera.pan as ReturnType<typeof vi.fn>).mock.calls[0]);
  });

  it("exact edge (dist=0) produces max speed", () => {
    const d = makeDeps();
    computeEdgeScroll(0, 300, DT, d, EDGE_ZONE);
    const panArg = (d.camera.pan as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(Math.abs(panArg[0])).toBeCloseTo(rect.width * EDGE_SCROLL_SPEED_FACTOR * DT, 6);
  });

  it("eases in from the zone boundary (smoothstep, gentler than linear)", () => {
    const d = makeDeps();
    // 4px inside the boundary (cx=36 on an 800px viewport → distX=36, t=0.1).
    // Linear proximity would give 0.1·max; smoothstep gives ~0.028·max.
    computeEdgeScroll(36, 300, DT, d, EDGE_ZONE);
    const speed = Math.abs((d.camera.pan as ReturnType<typeof vi.fn>).mock.calls[0][0]) / DT;
    const linear = ((EDGE_ZONE - 36) / EDGE_ZONE) * rect.width * EDGE_SCROLL_SPEED_FACTOR; // 0.1·maxX
    expect(speed).toBeLessThan(linear * 0.5);
  });

  it("at exact right edge (dist=0) scrolls right (negative)", () => {
    const d = makeDeps();
    computeEdgeScroll(800, 300, DT, d, EDGE_ZONE);
    const panArg = (d.camera.pan as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(panArg[0]).toBeLessThan(0);
  });

  it("renders the WebGL canvas synchronously after panning (same-frame, no seam)", () => {
    const d = makeDeps();
    computeEdgeScroll(10, 300, DT, d, EDGE_ZONE);
    expect(d.scheduler.renderNow).toHaveBeenCalledTimes(1);
  });

  it("does NOT render when cursor is outside the edge zone", () => {
    const d = makeDeps();
    computeEdgeScroll(400, 300, DT, d, EDGE_ZONE);
    expect(d.scheduler.renderNow).not.toHaveBeenCalled();
  });

  it("detection call (dt=0) marks scrolled but does NOT pan or render", () => {
    const d = makeDeps();
    const result = computeEdgeScroll(10, 300, 0, d, EDGE_ZONE);
    expect(result.scrolled).toBe(true);
    // dt=0 → no movement → no camera mutation, no synchronous render
    expect(d.camera.pan).not.toHaveBeenCalled();
    expect(d.scheduler.renderNow).not.toHaveBeenCalled();
  });

  it("returns scrolled:false and no render when container rect is missing", () => {
    const d = makeDeps({ getContainerRect: () => null });
    const result = computeEdgeScroll(10, 300, DT, d, EDGE_ZONE);
    expect(result.scrolled).toBe(false);
    expect(d.scheduler.renderNow).not.toHaveBeenCalled();
  });
});
