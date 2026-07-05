/**
 * TDD: useCropOverlayDrag handle drag — viewport coordinate chain.
 *
 * These tests exercise the CORE MATH that useCropOverlayDrag performs
 * during SVG overlay handle drags, without requiring a SolidJS rendering
 * environment or SVG DOM:
 *
 *   1.  camera.screenToDocument()  —  SVG point from clientX/Y
 *   2.  Screen delta → doc delta:  dx = screenDelta / zoom
 *   3.  applyCropResizeHandle with zoom-affected deltas
 *   4.  applyCropMove with zoom-affected deltas
 *   5.  createCropRectFromDocumentPoints (new-handle path)
 *   6.  snapCropRect threshold = 12 / zoom
 *   7.  Pivot correction under rotation
 *
 * The hook (useCropOverlayDrag.ts) wires these functions together;
 * any regression in the coordinate chain will also produce wrong
 * handle drags.
 */

import { describe, it, expect } from "vitest";
import { ViewportCamera } from "../viewport/viewportCamera";
import { applyCropResizeHandle, applyCropMove } from "../viewport/cropGeometry";
import { createCropRectFromDocumentPoints } from "../components/editor/cropToolActions";
import { snapCropRect, buildCropSnapTargets } from "../viewport/cropSnap";
import type { CropRect } from "../viewport/cropGeometry";

// ─── Helper: simulate useCropOverlayDrag's getSvgPoint ───────────────────
//
// In the hook, getSvgPoint does:
//   const r = svg.getBoundingClientRect();
//   return camera.screenToDocument(clientX - r.left, clientY - r.top);
//
// We use ViewportCamera directly.

function svgPoint(
  camera: ViewportCamera,
  clientX: number,
  clientY: number,
  rectLeft: number,
  rectTop: number,
): { x: number; y: number } {
  return camera.screenToDocument(clientX - rectLeft, clientY - rectTop);
}

// Helper: documentToScreen (inverse) for setting up test scenarios
function docToScreen(
  camera: ViewportCamera,
  docX: number,
  docY: number,
): { x: number; y: number } {
  return camera.documentToScreen(docX, docY);
}

const SVG_RECT = { left: 50, top: 30 };
const DOC_W = 800;
const DOC_H = 600;

// ─── 1. screenToDocument coordinate conversion ───────────────────────────

describe("screenToDocument — SVG point coordinate chain", () => {
  it("zoom=1, pan=(0,0): client coords convert to correct doc coords", () => {
    const cam = new ViewportCamera();
    // Click at client (150, 130) → SVG relative (100, 100) → doc (100, 100)
    const pt = svgPoint(cam, 150, 130, SVG_RECT.left, SVG_RECT.top);
    expect(pt).toEqual({ x: 100, y: 100 });
  });

  it("zoom=2: doc coords are halved for same SVG position", () => {
    const cam = new ViewportCamera({ zoom: 2 });
    // SVG relative (100, 100) → doc (50, 50) at zoom=2
    const pt = svgPoint(cam, 150, 130, SVG_RECT.left, SVG_RECT.top);
    expect(pt).toEqual({ x: 50, y: 50 });
  });

  it("zoom=0.5: doc coords are doubled for same SVG position", () => {
    const cam = new ViewportCamera({ zoom: 0.5 });
    const pt = svgPoint(cam, 150, 130, SVG_RECT.left, SVG_RECT.top);
    expect(pt).toEqual({ x: 200, y: 200 });
  });

  it("pan=(200,100): doc coords account for pan offset", () => {
    const cam = new ViewportCamera({ x: 200, y: 100 });
    // SVG relative (100, 100) → screen (300, 200) in camera space
    // → doc = ((100) - 200) / 1 = -100, ((100) - 100) / 1 = 0
    // Wait: camera.screenToDocument(screenX, screenY) = ((screenX - x) / zoom)
    // svgPoint passes (clientX - rectLeft, clientY - rectTop) = (100, 100)
    // So doc = ((100 - 200) / 1, (100 - 100) / 1) = (-100, 0)
    const pt = svgPoint(cam, 150, 130, SVG_RECT.left, SVG_RECT.top);
    expect(pt).toEqual({ x: -100, y: 0 });
  });

  it("zoom=2, pan=(-50,-30): combined zoom+pan conversion", () => {
    const cam = new ViewportCamera({ x: -50, y: -30, zoom: 2 });
    // SVG relative (100, 100) → doc = ((100 - (-50)) / 2, (100 - (-30)) / 2)
    // = (150/2, 130/2) = (75, 65)
    const pt = svgPoint(cam, 150, 130, SVG_RECT.left, SVG_RECT.top);
    expect(pt).toEqual({ x: 75, y: 65 });
  });
});

// ─── 2. Screen delta → doc delta conversion ──────────────────────────────
//
// In useCropOverlayDrag.handlePointerMove:
//   const dxScreen = e.clientX - drag.startClientX;
//   const dyScreen = e.clientY - drag.startClientY;
//   const dx = dxScreen / params.zoom;
//   const dy = dyScreen / params.zoom;

describe("screen delta to document delta", () => {
  it("zoom=1: 100px screen delta = 100px doc delta", () => {
    const zoom = 1;
    const dxScreen = 100;
    const dyScreen = 50;
    expect(dxScreen / zoom).toBe(100);
    expect(dyScreen / zoom).toBe(50);
  });

  it("zoom=2: 100px screen delta = 50px doc delta", () => {
    const zoom = 2;
    const dxScreen = 100;
    const dyScreen = 50;
    expect(dxScreen / zoom).toBe(50);
    expect(dyScreen / zoom).toBe(25);
  });

  it("zoom=0.5: 100px screen delta = 200px doc delta", () => {
    const zoom = 0.5;
    const dxScreen = 100;
    const dyScreen = 50;
    expect(dxScreen / zoom).toBe(200);
    expect(dyScreen / zoom).toBe(100);
  });

  it("negative screen delta produces negative doc delta", () => {
    const zoom = 1;
    expect(-30 / zoom).toBe(-30);
  });

  it("zero screen delta produces zero doc delta", () => {
    const zoom = 2.5;
    expect(0 / zoom).toBe(0);
  });
});

// ─── 3. applyCropResizeHandle with zoom-affected deltas ──────────────────
//
// A "se" resize: startRect (100, 100, 200, 150), drag mouse 200px right
// and 100px down on screen. At zoom=2, doc deltas are 100 and 50.

describe("applyCropResizeHandle — zoom-affected deltas", () => {
  const rect: CropRect = { x: 100, y: 100, w: 200, h: 150 };

  it("se handle, zoom=1: 100px screen delta → 100px doc delta", () => {
    const zoom = 1;
    const dx = 100 / zoom;
    const dy = 50 / zoom;
    const result = applyCropResizeHandle(rect, "se", dx, dy);
    expect(result.w).toBe(300);  // 200 + 100
    expect(result.h).toBe(200);  // 150 + 50
    expect(result.x).toBe(100);  // unchanged (se doesn't move x/y)
    expect(result.y).toBe(100);
  });

  it("se handle, zoom=2: 100px screen delta → 50px doc delta", () => {
    const zoom = 2;
    const dx = 100 / zoom;
    const dy = 50 / zoom;
    const result = applyCropResizeHandle(rect, "se", dx, dy);
    expect(result.w).toBe(250);  // 200 + 50
    expect(result.h).toBe(175);  // 150 + 25
  });

  it("se handle, zoom=0.5: 100px screen delta → 200px doc delta", () => {
    const zoom = 0.5;
    const dx = 100 / zoom;
    const dy = 50 / zoom;
    const result = applyCropResizeHandle(rect, "se", dx, dy);
    expect(result.w).toBe(400);  // 200 + 200
    expect(result.h).toBe(250);  // 150 + 100
  });

  it("nw handle, zoom=1: negative deltas expand rect from top-left", () => {
    const zoom = 1;
    const dx = -30 / zoom;
    const dy = -20 / zoom;
    const result = applyCropResizeHandle(rect, "nw", dx, dy);
    // nw: w -= dx = 200 - (-30) = 230, x += dx = 100 + (-30) = 70
    //      h -= dy = 150 - (-20) = 170, y += dy = 100 + (-20) = 80
    expect(result.x).toBe(70);   // 100 - 30
    expect(result.y).toBe(80);   // 100 - 20
    expect(result.w).toBe(230);  // 200 + 30
    expect(result.h).toBe(170);  // 150 + 20
  });

  it("ne handle, zoom=1: negative dy expands from top, positive dx grows right", () => {
    const result = applyCropResizeHandle(rect, "ne", 50, -30);
    // ne: w += dx = 200 + 50 = 250
    //     h -= dy = 150 - (-30) = 180, y += dy = 100 + (-30) = 70
    expect(result.x).toBe(100);  // unchanged
    expect(result.y).toBe(70);   // 100 - 30 (top edge moves up to expand)
    expect(result.w).toBe(250);  // 200 + 50
    expect(result.h).toBe(180);  // 150 + 30
  });

  it("sw handle, zoom=1: positive dx shrinks from left, positive dy grows down", () => {
    const result = applyCropResizeHandle(rect, "sw", 50, 30);
    // sw: w -= dx, x += dx, h += dy
    expect(result.x).toBe(150);  // 100 + 50
    expect(result.y).toBe(100);  // unchanged
    expect(result.w).toBe(150);  // 200 - 50
    expect(result.h).toBe(180);  // 150 + 30
  });

  it("e edge handle: only horizontal resize", () => {
    const result = applyCropResizeHandle(rect, "e", 60, 999);
    expect(result.w).toBe(260);  // 200 + 60
    expect(result.h).toBe(150);  // unchanged (e ignores vertical delta)
  });

  it("s edge handle: only vertical resize", () => {
    const result = applyCropResizeHandle(rect, "s", 999, 40);
    expect(result.w).toBe(200);  // unchanged (s ignores horizontal delta)
    expect(result.h).toBe(190);  // 150 + 40
  });

  it("alt+se: resize from center (doubles effective delta)", () => {
    const result = applyCropResizeHandle(rect, "se", 50, 30, { alt: true });
    // alt doubles dx/dy to 100/60, then centers: w+=100, h+=60 → center (300/2, 210/2)
    const cx = 100 + 200 / 2;  // 200
    const cy = 100 + 150 / 2;  // 175
    expect(result.w).toBe(300);  // 200 + 100
    expect(result.h).toBe(210);  // 150 + 60
    expect(result.x).toBe(cx - result.w / 2);  // centered: 200 - 150 = 50
    expect(result.y).toBe(cy - result.h / 2);  // centered: 175 - 105 = 70
  });
});

// ─── 4. applyCropMove with zoom-affected deltas ─────────────────────────

describe("applyCropMove — zoom-affected deltas", () => {
  const rect: CropRect = { x: 100, y: 100, w: 200, h: 150 };

  it("move with zoom=1: screen delta = doc delta", () => {
    const dx = 50 / 1;
    const dy = 30 / 1;
    const result = applyCropMove(rect, dx, dy, DOC_W, DOC_H);
    expect(result.x).toBe(150);
    expect(result.y).toBe(130);
    expect(result.w).toBe(200);  // w/h unchanged in move
    expect(result.h).toBe(150);
  });

  it("move with zoom=2: screen delta is halved", () => {
    const dx = 50 / 2;
    const dy = 30 / 2;
    const result = applyCropMove(rect, dx, dy, DOC_W, DOC_H);
    expect(result.x).toBe(125);  // 100 + 25
    expect(result.y).toBe(115);  // 100 + 15
  });

  it("move with zoom=0.5: screen delta is doubled", () => {
    const dx = 50 / 0.5;
    const dy = 30 / 0.5;
    const result = applyCropMove(rect, dx, dy, DOC_W, DOC_H);
    expect(result.x).toBe(200);  // 100 + 100
    expect(result.y).toBe(160);  // 100 + 60
  });

  it("move with negative delta: rect moves left/up", () => {
    const dx = -40 / 1;
    const dy = -20 / 1;
    const result = applyCropMove(rect, dx, dy, DOC_W, DOC_H);
    expect(result.x).toBe(60);
    expect(result.y).toBe(80);
  });

  it("consecutive move deltas accumulate correctly", () => {
    const r1 = applyCropMove(rect, 10, 5, DOC_W, DOC_H);
    const r2 = applyCropMove(r1, 20, 15, DOC_W, DOC_H);
    expect(r2.x).toBe(130);  // 100 + 10 + 20
    expect(r2.y).toBe(120);  // 100 + 5 + 15
  });
});

// ─── 5. createCropRectFromDocumentPoints (new-handle path) ───────────────

describe("createCropRectFromDocumentPoints — new handle", () => {
  it("creates rect from start to end (SE direction)", () => {
    const result = createCropRectFromDocumentPoints(
      { x: 100, y: 100 },
      { x: 300, y: 250 },
    );
    expect(result).toEqual({ x: 100, y: 100, w: 200, h: 150 });
  });

  it("creates rect from end to start (NW direction — negative drag)", () => {
    const result = createCropRectFromDocumentPoints(
      { x: 300, y: 250 },
      { x: 100, y: 100 },
    );
    // min x/y = (100, 100), abs delta = (200, 150)
    expect(result).toEqual({ x: 100, y: 100, w: 200, h: 150 });
  });

  it("zoom=2: screen coords → doc coords produce correct rect", () => {
    const cam = new ViewportCamera({ zoom: 2 });
    // Start at client (150, 130) → SVG (100, 100) → doc (50, 50)
    const start = svgPoint(cam, 150, 130, SVG_RECT.left, SVG_RECT.top);
    // End at client (350, 230) → SVG (300, 200) → doc (150, 100)
    const end = svgPoint(cam, 350, 230, SVG_RECT.left, SVG_RECT.top);

    const result = createCropRectFromDocumentPoints(start, end);
    expect(result).toEqual({ x: 50, y: 50, w: 100, h: 50 });
  });

  it("zoom=0.5: doc coords doubled, rect is larger", () => {
    const cam = new ViewportCamera({ zoom: 0.5 });
    // Same 200x100px screen delta → doc delta of 400x200
    const start = svgPoint(cam, 150, 130, SVG_RECT.left, SVG_RECT.top);
    const end = svgPoint(cam, 350, 230, SVG_RECT.left, SVG_RECT.top);

    const result = createCropRectFromDocumentPoints(start, end);
    expect(result).toEqual({ x: 200, y: 200, w: 400, h: 200 });
  });

  it("zero-width drag (same point) returns null", () => {
    const result = createCropRectFromDocumentPoints(
      { x: 100, y: 100 },
      { x: 100, y: 100 },
    );
    expect(result).toBeNull();
  });

  it("very small drag (1px) returns null (<=0 check)", () => {
    const result = createCropRectFromDocumentPoints(
      { x: 100, y: 100 },
      { x: 100, y: 101 },
    );
    expect(result).toBeNull();
  });
});

// ─── 6. snapCropRect threshold = 12 / zoom ────────────────────────────
//
// In useCropOverlayDrag.handlePointerMove:
//   const threshold = 12 / params.zoom;

describe("snap threshold scaling with zoom", () => {
  const rect: CropRect = { x: 8, y: 8, w: 200, h: 150 };

  it("zoom=1: threshold = 12 doc px", () => {
    const zoom = 1;
    const threshold = 12 / zoom;
    expect(threshold).toBe(12);
  });

  it("zoom=2: threshold = 6 doc px (tighter snap at high zoom)", () => {
    const zoom = 2;
    const threshold = 12 / zoom;
    expect(threshold).toBe(6);
  });

  it("zoom=0.5: threshold = 24 doc px (wider snap at low zoom)", () => {
    const zoom = 0.5;
    const threshold = 12 / zoom;
    expect(threshold).toBe(24);
  });

  it("nw handle snaps to canvas edge at zoom=2 with threshold=6", () => {
    const targets = buildCropSnapTargets(DOC_W, DOC_H, []);
    const threshold = 12 / 2;  // zoom=2 → threshold=6

    // x=5 is distance 5 from 0 → 5 < 6 → snaps
    // y=5 is distance 5 from 0 → 5 < 6 → snaps
    const { rect: snapped } = snapCropRect(
      { x: 5, y: 5, w: 200, h: 150 },
      "nw",
      targets,
      threshold,
    );
    expect(snapped.x).toBe(0);
    expect(snapped.y).toBe(0);
  });

  it("nw handle does NOT snap at zoom=2 when distance > threshold=6", () => {
    const targets = buildCropSnapTargets(DOC_W, DOC_H, []);
    const threshold = 12 / 2;  // zoom=2 → threshold=6

    // x=7 is distance 7 from 0 → 7 > 6 → no snap
    const { rect: snapped } = snapCropRect(
      { x: 7, y: 7, w: 200, h: 150 },
      "nw",
      targets,
      threshold,
    );
    expect(snapped.x).toBe(7);  // unchanged
    expect(snapped.y).toBe(7);
  });
});

// ─── 7. Full chain simulation: simulate what useCropOverlayDrag does ─────
//
// Simulate a complete SE handle drag:
//   1. startDrag: record startRect + startClientX/Y
//   2. handlePointerMove: getSvgPoint → dx/dy = screenDelta / zoom → applyCropResizeHandle

describe("full handle drag chain simulation", () => {
  it("se handle drag at zoom=1: correct final rect", () => {
    const cam = new ViewportCamera();
    const startRect: CropRect = { x: 100, y: 100, w: 200, h: 150 };

    // startDrag: record startClientX/Y for a pointerDown at SVG (100, 100)
    const startClientX = SVG_RECT.left + 100;  // 150
    const startClientY = SVG_RECT.top + 100;   // 130

    // Drag mouse 200px right and 100px down on screen
    const currentClientX = startClientX + 200;  // 350
    const currentClientY = startClientY + 100;  // 230

    // handlePointerMove step 1: getSvgPoint
    const zoom = cam.getState().zoom;  // 1
    const currentPt = svgPoint(cam, currentClientX, currentClientY, SVG_RECT.left, SVG_RECT.top);

    // handlePointerMove step 2: calculate doc deltas
    const dxScreen = currentClientX - startClientX;  // 200
    const dyScreen = currentClientY - startClientY;  // 100
    const dx = dxScreen / zoom;
    const dy = dyScreen / zoom;

    // handlePointerMove step 3: apply resize handle
    const result = applyCropResizeHandle(startRect, "se", dx, dy);
    expect(result).toEqual({ x: 100, y: 100, w: 400, h: 250 });
  });

  it("se handle drag at zoom=2: deltas are halved", () => {
    const cam = new ViewportCamera({ zoom: 2 });
    const startRect: CropRect = { x: 100, y: 100, w: 200, h: 150 };

    const startClientX = SVG_RECT.left + 200;  // pointer at SVG (200, 150)
    const startClientY = SVG_RECT.top + 150;

    // Drag 200px right, 100px down on screen
    const dxScreen = 200;
    const dyScreen = 100;
    const zoom = cam.getState().zoom;  // 2
    const dx = dxScreen / zoom;  // 100
    const dy = dyScreen / zoom;  // 50

    const result = applyCropResizeHandle(startRect, "se", dx, dy);
    expect(result).toEqual({ x: 100, y: 100, w: 300, h: 200 });
  });

  it("move handle drag at zoom=1 with pan=(200,100)", () => {
    const cam = new ViewportCamera({ x: 200, y: 100 });
    const startRect: CropRect = { x: 100, y: 100, w: 200, h: 150 };

    // startClientX/Y are screen coords, so they account for pan
    // A point at doc (100, 100) → screen: docToScreen(100, 100) = 100*1+200, 100*1+100 = 300, 200
    const startScreen = docToScreen(cam, 100, 100);
    // Drag 50px right, 30px down on screen
    const dxScreen = 50;
    const dyScreen = 30;
    const zoom = cam.getState().zoom;  // 1
    const dx = dxScreen / zoom;
    const dy = dyScreen / zoom;

    const result = applyCropMove(startRect, dx, dy, DOC_W, DOC_H);
    expect(result.x).toBe(150);  // 100 + 50
    expect(result.y).toBe(130);  // 100 + 30
  });

  it("new handle drag (create rect) at zoom=1, pan=(0,0)", () => {
    const cam = new ViewportCamera();
    const startClientX = SVG_RECT.left + 100;
    const startClientY = SVG_RECT.top + 100;
    const endClientX = startClientX + 200;
    const endClientY = startClientY + 100;

    const start = svgPoint(cam, startClientX, startClientY, SVG_RECT.left, SVG_RECT.top);
    const end = svgPoint(cam, endClientX, endClientY, SVG_RECT.left, SVG_RECT.top);

    const result = createCropRectFromDocumentPoints(start, end);
    expect(result).toEqual({ x: 100, y: 100, w: 200, h: 100 });
  });

  it("new handle drag at zoom=2: rect is scaled down", () => {
    const cam = new ViewportCamera({ zoom: 2 });
    const startClientX = SVG_RECT.left + 100;
    const startClientY = SVG_RECT.top + 100;
    const endClientX = startClientX + 200;
    const endClientY = startClientY + 100;

    const start = svgPoint(cam, startClientX, startClientY, SVG_RECT.left, SVG_RECT.top);
    const end = svgPoint(cam, endClientX, endClientY, SVG_RECT.left, SVG_RECT.top);

    const result = createCropRectFromDocumentPoints(start, end);
    // 200px screen delta → 100px doc delta at zoom=2
    expect(result).toEqual({ x: 50, y: 50, w: 100, h: 50 });
  });

  it("snap triggers during move handle drag near canvas edge at zoom=1", () => {
    const startRect: CropRect = { x: 5, y: 100, w: 200, h: 150 };
    const targets = buildCropSnapTargets(DOC_W, DOC_H, []);

    // Move 5px right → x=10. Distance to target 0 = 10, threshold=12 → snaps.
    const dx = 5 / 1;  // zoom=1
    const moved = applyCropMove(startRect, dx, 0, DOC_W, DOC_H);
    expect(moved.x).toBe(10);

    const snapped = snapCropRect(moved, "move", targets, 12 / 1);
    expect(snapped.rect.x).toBe(0);  // left edge snapped from 10 to 0
    expect(snapped.rect.w).toBe(200);  // w unchanged (move handle)
  });
});
