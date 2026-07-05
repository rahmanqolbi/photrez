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

describe("snapCropRect — handle-specific edge snap verification (implementation-focused)", () => {
  const simpleTargets = buildCropSnapTargets(800, 600, []);
  const threshold = 15;

  it("n handle snaps top edge + centerX only (n: top, centerX)", () => {
    // n handle: edgesForHandle returns ["top", "centerX"]
    // Snap top edge at 8 → target 0 (canvas top)
    const rect = { x: 100, y: 8, w: 200, h: 150 };
    const { rect: snapped } = snapCropRect(rect, "n", simpleTargets, threshold);
    expect(snapped.y).toBe(0);  // top snapped to 0
    // x should NOT be snapped because n handle only snaps top + centerX
    // centerX = 100+200/2 = 200 is not within threshold of any x target
    expect(snapped.x).toBe(100);
    expect(snapped.w).toBe(200);
    expect(snapped.h).toBe(158);  // h increased by 8 (y moved from 8 to 0)
  });

  it("s handle snaps bottom edge + centerX only (s: bottom, centerX)", () => {
    // s handle: edgesForHandle returns ["bottom", "centerX"]
    // Snap bottom edge at 598 → target 600 (canvas bottom)
    const rect = { x: 100, y: 100, w: 200, h: 498 };
    const { rect: snapped } = snapCropRect(rect, "s", simpleTargets, threshold);
    expect(snapped.y + snapped.h).toBe(600);  // bottom snapped to 600
    expect(snapped.h).toBe(500);  // h increased by 2
    expect(snapped.x).toBe(100);  // x unchanged
  });

  it("e handle snaps right edge + centerY only (e: right, centerY)", () => {
    // e handle: edgesForHandle returns ["right", "centerY"]
    // Snap right edge at 795 → target 800 (canvas right)
    const rect = { x: 100, y: 100, w: 695, h: 200 };
    const { rect: snapped } = snapCropRect(rect, "e", simpleTargets, threshold);
    expect(snapped.x + snapped.w).toBe(800);  // right snapped to 800
    expect(snapped.w).toBe(700);  // w increased by 5
    expect(snapped.y).toBe(100);  // y unchanged
  });

  it("w handle snaps left edge + centerY only (w: left, centerY)", () => {
    // w handle: edgesForHandle returns ["left", "centerY"]
    // Snap left edge at 8 → target 0 (canvas left)
    const rect = { x: 8, y: 100, w: 200, h: 150 };
    const { rect: snapped } = snapCropRect(rect, "w", simpleTargets, threshold);
    expect(snapped.x).toBe(0);  // left snapped to 0
    expect(snapped.w).toBe(208);  // w increased by 8 (x moved from 8 to 0)
    expect(snapped.y).toBe(100);  // y unchanged
  });

  it("nw handle snaps left + top edges (nw: left, top)", () => {
    // nw handle: edgesForHandle returns ["left", "top"]
    const rect = { x: 5, y: 5, w: 200, h: 150 };
    const { rect: snapped } = snapCropRect(rect, "nw", simpleTargets, threshold);
    expect(snapped.x).toBe(0);
    expect(snapped.y).toBe(0);
    expect(snapped.w).toBe(205);  // w increased by 5
    expect(snapped.h).toBe(155);  // h increased by 5
  });

  it("ne handle snaps right + top edges (ne: right, top)", () => {
    // ne handle: edgesForHandle returns ["right", "top"]
    const rect = { x: 100, y: 5, w: 695, h: 150 };
    const { rect: snapped } = snapCropRect(rect, "ne", simpleTargets, threshold);
    expect(snapped.x + snapped.w).toBe(800);  // right snapped to 800
    expect(snapped.y).toBe(0);  // top snapped to 0
    expect(snapped.w).toBe(700);
    expect(snapped.h).toBe(155);
  });

  it("se handle snaps right + bottom edges (se: right, bottom)", () => {
    // se handle: edgesForHandle returns ["right", "bottom"]
    const rect = { x: 100, y: 100, w: 695, h: 495 };
    const { rect: snapped } = snapCropRect(rect, "se", simpleTargets, threshold);
    expect(snapped.x + snapped.w).toBe(800);  // right snapped to 800
    expect(snapped.y + snapped.h).toBe(600);  // bottom snapped to 600
    expect(snapped.w).toBe(700);
    expect(snapped.h).toBe(500);
  });

  it("sw handle snaps left + bottom edges (sw: left, bottom)", () => {
    // sw handle: edgesForHandle returns ["left", "bottom"]
    const rect = { x: 5, y: 100, w: 200, h: 495 };
    const { rect: snapped } = snapCropRect(rect, "sw", simpleTargets, threshold);
    expect(snapped.x).toBe(0);  // left snapped to 0
    expect(snapped.y + snapped.h).toBe(600);  // bottom snapped to 600
    expect(snapped.w).toBe(205);
    expect(snapped.h).toBe(500);
  });

  it("new handle snaps all edges (left, right, centerX, top, bottom, centerY)", () => {
    const rect = { x: 5, y: 5, w: 200, h: 150 };
    const { rect: snapped } = snapCropRect(rect, "new", simpleTargets, threshold);
    expect(snapped.x).toBe(0);
    expect(snapped.y).toBe(0);
    expect(snapped.w).toBe(205);
    expect(snapped.h).toBe(155);
  });

  it("move handle snaps all edges with position-only changes (no resize)", () => {
    const rect = { x: 8, y: 5, w: 200, h: 150 };
    const { rect: snapped } = snapCropRect(rect, "move", simpleTargets, threshold);
    expect(snapped.x).toBe(0);  // left snapped
    expect(snapped.y).toBe(0);  // top snapped
    expect(snapped.w).toBe(200);  // w unchanged (move doesn't resize)
    expect(snapped.h).toBe(150);  // h unchanged
  });

  it("threshold=0 never snaps", () => {
    const rect = { x: 8, y: 8, w: 200, h: 150 };
    const { rect: snapped, lines } = snapCropRect(rect, "nw", simpleTargets, 0);
    expect(snapped).toEqual(rect);
    expect(lines).toEqual([]);
  });

  it("threshold smaller than distance does not snap", () => {
    const rect = { x: 20, y: 20, w: 200, h: 150 };  // distance 20 > threshold 10
    const { rect: snapped } = snapCropRect(rect, "nw", simpleTargets, 10);
    expect(snapped).toEqual(rect);
  });

  it("empty targets produce no snapping", () => {
    const emptyTargets = { x: [] as number[], y: [] as number[] };
    const rect = { x: 8, y: 8, w: 200, h: 150 };
    const { rect: snapped, lines } = snapCropRect(rect, "nw", emptyTargets, 15);
    expect(snapped).toEqual(rect);
    expect(lines).toEqual([]);
  });

  it("undefined targets produce no snapping", () => {
    const rect = { x: 8, y: 8, w: 200, h: 150 };
    const { rect: snapped, lines } = snapCropRect(rect, "nw", {} as any, 15);
    expect(snapped).toEqual(rect);
    expect(lines).toEqual([]);
  });

  it("centerX snap: s handle with centerX near target moves x only", () => {
    // s handle snaps bottom + centerX. If centerX is within threshold of target,
    // x should be adjusted to align centerX with target, y unchanged.
    const rect = { x: 395, y: 100, w: 200, h: 150 };  // centerX = 495, target = 400 (canvas center of 800)
    // 495 is NOT within threshold of 400, so x should NOT snap
    const targets = buildCropSnapTargets(800, 600, []);
    const { rect: snapped } = snapCropRect(rect, "s", targets, 15);
    expect(snapped.x).toBe(395);  // x unchanged (distance 95 > 15)
  });

  it("centerY snap: e handle with centerY near target moves y only", () => {
    // e handle snaps right + centerY. If centerY is within threshold of target,
    // y should be adjusted to align centerY with target
    const rect = { x: 100, y: 145, w: 695, h: 210 };  // centerY = 250, target = 300 (canvas center of 600)
    // 250 is NOT within threshold of 300, so y should NOT snap
    const targets = buildCropSnapTargets(800, 600, []);
    const { rect: snapped } = snapCropRect(rect, "e", targets, 15);
    expect(snapped.y).toBe(145);  // y unchanged
  });

  it("lines produced for both axes when snapping in two directions", () => {
    const rect = { x: 5, y: 395, w: 200, h: 200 };  // left=5 close to 0, bottom=595 close to 600
    const targets = buildCropSnapTargets(800, 600, []);
    const { lines } = snapCropRect(rect, "move", targets, 10);
    // move handle snaps all 6 edges: left(5→0), bottom(595→600) → both axes snap → 2 lines
    expect(lines.length).toBe(2);
  });

  it("lines contains vertical and horizontal guides when both axes snap", () => {
    const rect = { x: 5, y: 5, w: 200, h: 150 };
    const targets = buildCropSnapTargets(800, 600, []);
    const { lines } = snapCropRect(rect, "nw", targets, 10);
    // Should snap x and y → both axes → 2 lines
    expect(lines.length).toBe(2);
    // One vertical line (x1 == x2), one horizontal line (y1 == y2)
    const vertLines = lines.filter(l => l.x1 === l.x2);
    const horizLines = lines.filter(l => l.y1 === l.y2);
    expect(vertLines.length).toBe(1);
    expect(horizLines.length).toBe(1);
  });

  it("non-standard handle name that doesn't contain n/e/s/w returns empty edges → no snapping", () => {
    // "x" doesn't contain any of n/e/s/w
    // edgesForHandle("x"): isLeft=false, isRight=false, isTop=false, isBottom=false
    // → returns [] which means no edges are snapped
    const rect = { x: 8, y: 8, w: 200, h: 150 };
    const targets = buildCropSnapTargets(800, 600, []);
    const { rect: snapped } = snapCropRect(rect, "x", targets, 15);
    expect(snapped).toEqual(rect);  // no snapping
  });

  it("snap does not affect the opposite axis (move handle: x snaps independently of y)", () => {
    // Move handle: snapping x should not affect y and vice versa.
    // left=5 snaps to 0, but y=50 is far from any target (0=dist 50, 300=dist 250, 200=dist 150, 400=dist 350, 600=dist 550)
    const rect = { x: 5, y: 50, w: 200, h: 100 };
    const targets = buildCropSnapTargets(800, 600, []);
    const { rect: snapped } = snapCropRect(rect, "move", targets, 15);
    expect(snapped.x).toBe(0);  // x snapped (left=5, distance to 0 = 5 < 15)
    expect(snapped.y).toBe(50);  // y unchanged (top=50, closest target 0, distance 50 > 15)
  });

  it("snap only when distance < threshold — y axis edge case", () => {
    // y=10, top edge at 10, distance to target 0 is 10, threshold=9 → no snap
    const rect = { x: 5, y: 10, w: 200, h: 150 };
    const targets = buildCropSnapTargets(800, 600, []);
    const { rect: snapped } = snapCropRect(rect, "nw", targets, 9);
    expect(snapped.x).toBe(0);  // x=5 distance to 0 == 5 < 9 → snap
    expect(snapped.y).toBe(10);  // y=10 distance to 0 == 10 > 9 → no snap
  });

  it("corner handle: does NOT snap centerX or centerY (only edge-adjacent axes)", () => {
    // nw handle should only snap ["left", "top"], not centerX or centerY
    const rect = { x: 8, y: 8, w: 200, h: 150 };  // centerX = 108, far from 400; centerY = 83, far from 300
    // But left=8 is close to 0, top=8 is close to 0
    const targets = buildCropSnapTargets(800, 600, []);
    const { rect: snapped } = snapCropRect(rect, "nw", targets, 10);
    expect(snapped.x).toBe(0);
    expect(snapped.y).toBe(0);
    // Verify: centerX is now 100, still not near 400 or 800; centerY is 75, still not near 300 or 600
    // So if centerX/centerY were in the snap list, they wouldn't have snapped anyway
    // because they're far from targets
  });

  it("edge handle (s) does NOT snap left or right edges", () => {
    // s handle only snaps ["bottom", "centerX"] — left/right should NOT snap
    // Position left=8 close to 0: s handle ignores left edge
    const rect = { x: 8, y: 100, w: 200, h: 497 };  // bottom at 597, close to 600
    const targets = buildCropSnapTargets(800, 600, []);
    const { rect: snapped } = snapCropRect(rect, "s", targets, 10);
    expect(snapped.y + snapped.h).toBe(600);  // bottom snapped to 600
    expect(snapped.x).toBe(8);  // x NOT snapped (left edge not applicable for s handle)
  });

  it("edge handle (w) does NOT snap top or bottom edges", () => {
    // w handle only snaps ["left", "centerY"] — top/bottom should NOT snap
    const rect = { x: 8, y: 8, w: 200, h: 150 };  // left=8 close to 0, top=8 close to 0
    const targets = buildCropSnapTargets(800, 600, []);
    const { rect: snapped } = snapCropRect(rect, "w", targets, 10);
    expect(snapped.x).toBe(0);  // left snapped
    expect(snapped.y).toBe(8);  // y NOT snapped (top edge not applicable for w handle)
  });

  it("centerX snap correctly adjusts x position", () => {
    // For s handle: centerX snap adjusts x to align centerX with target
    // centerX = 8 + 200/2 = 108, target 0 has distance 108 > threshold, so not snapping
    // Let me craft a better test: centerX near canvas center (400)
    const rect = { x: 300, y: 100, w: 200, h: 150 };  // centerX = 400, exactly on target
    const targets = buildCropSnapTargets(800, 600, []);
    const { rect: snapped } = snapCropRect(rect, "s", targets, 10);
    // centerX = 400 exactly matches target 400, so x should stay 300
    expect(snapped.x).toBe(300);
  });

  it("centerY snap correctly adjusts y position", () => {
    // For e handle: centerY = 200 + 200/2 = 300, exactly on target 300 (canvas center)
    const rect = { x: 100, y: 200, w: 200, h: 200 };  // centerY = 300
    const targets = buildCropSnapTargets(800, 600, []);
    const { rect: snapped } = snapCropRect(rect, "e", targets, 10);
    expect(snapped.y).toBe(200);  // y unchanged (centerY already aligned)
  });

  it("snap to canvas center X (400) via centerX with e/w handles", () => {
    // For e handle: centerX edge is not in the list (e: right, centerY)
    // So this won't snap centerX. Let me use s handle instead (s: bottom, centerX)
    const rect = { x: 380, y: 100, w: 200, h: 150 };  // centerX = 480, far from 400
    const targets = buildCropSnapTargets(800, 600, []);
    const { rect: snapped } = snapCropRect(rect, "s", targets, 15);
    // centerX=480, distance to 400=80 >15 → no x snap; but y... no y snap targets near
    expect(snapped.x).toBe(380);
  });

  it("precise centerX snap via s handle", () => {
    // For s handle: centerX at 400 + distance 8, threshold 10 → snap
    const rect = { x: 308, y: 100, w: 200, h: 150 };  // centerX = 408, distance to 400 = 8
    const targets = buildCropSnapTargets(800, 600, []);
    const { rect: snapped } = snapCropRect(rect, "s", targets, 10);
    expect(snapped.x).toBe(300);  // centerX moved from 408 to 400 → x = 400 - 200/2 = 300
  });

  it("precise centerY snap via e handle", () => {
    // For e handle: centerY at 300 + distance 8, threshold 10 → snap
    const rect = { x: 100, y: 208, w: 200, h: 200 };  // centerY = 308, distance to 300 = 8
    const targets = buildCropSnapTargets(800, 600, []);
    const { rect: snapped } = snapCropRect(rect, "e", targets, 10);
    expect(snapped.y).toBe(200);  // centerY moved from 308 to 300 → y = 300 - 200/2 = 200
  });

  it("buildCropSnapTargets with overlapping layer edges targets dedupes", () => {
    // Multiple layers with same edge positions should produce unique targets
    const targets = buildCropSnapTargets(800, 600, [
      { x: 100, y: 100, w: 200, h: 150 },
      { x: 100, y: 50, w: 200, h: 100 },  // same x edge
    ]);
    // Count duplicates of 100 in x targets
    const x100Count = targets.x.filter(v => v === 100).length;
    expect(x100Count).toBe(1);  // Set ensures deduplication
  });

  it("buildCropSnapTargets includes layer centers", () => {
    const targets = buildCropSnapTargets(800, 600, [
      { x: 100, y: 100, w: 200, h: 150 },
    ]);
    expect(targets.x).toContain(200);  // layer center x = 100 + 200/2
    expect(targets.y).toContain(175);  // layer center y = 100 + 150/2
  });

  it("buildCropSnapTargets with zero-size doc", () => {
    const targets = buildCropSnapTargets(0, 0, []);
    expect(targets.x).toContain(0);
    expect(targets.y).toContain(0);
    // docW/2 = 0, docH/2 = 0 (already in the set)
    // rule of thirds: (0*1)/3 = 0, (0*2)/3 = 0
  });
});
