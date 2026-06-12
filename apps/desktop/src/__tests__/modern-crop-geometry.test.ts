import { describe, expect, it } from "vitest";
import {
  getProjectedCanvasSize,
  clampFrameToProjectedBounds,
  getDefaultModernCropFrame,
  getModernCropFrameScreenCenter,
  getModernCropImagePivot,
  getModernCropApplyRotation,
  getModernCropFrameScreenRect,
  modernScreenDeltaToImageOffsetDelta,
  modernFrameToCropRect,
  resizeModernFrameFromCenter,
  resizeModernFrameOneSided,
  screenPointToModernDocumentPoint,
} from "../viewport/modernCropGeometry";

const f = (w: number, h: number, x = 0, y = 0) => ({ x, y, w, h });

describe("modern crop geometry", () => {
  it("computes projected canvas size", () => {
    expect(getProjectedCanvasSize({ docWidth: 1600, docHeight: 900, zoom: 0.5 })).toEqual({ w: 800, h: 450 });
    expect(getProjectedCanvasSize({ docWidth: 1600, docHeight: 900, zoom: 1 })).toEqual({ w: 1600, h: 900 });
    expect(getProjectedCanvasSize({ docWidth: 1600, docHeight: 900, zoom: 2, scale: 2 })).toEqual({ w: 6400, h: 3600 });
  });

  it("enforces minimum frame size but does not cap at projected bounds", () => {
    expect(clampFrameToProjectedBounds(f(500, 300), { w: 400, h: 300 })).toEqual({ x: 0, y: 0, w: 500, h: 300 });
    expect(clampFrameToProjectedBounds(f(200, 100), { w: 400, h: 300 })).toEqual({ x: 0, y: 0, w: 200, h: 100 });
    expect(clampFrameToProjectedBounds(f(10, 10), { w: 400, h: 300 })).toEqual({ x: 0, y: 0, w: 24, h: 24 });
  });

  it("centers the frame in viewport coordinates", () => {
    expect(getModernCropFrameScreenRect(f(400, 300, 400, 250), 1200, 800))
      .toEqual({ x: 400, y: 250, w: 400, h: 300 });
  });

  it("computes the modern image pivot from the rendered cropbox center", () => {
    const pivot = getModernCropImagePivot({
      frame: f(400, 240, 400, 260),
      viewport: { width: 1200, height: 760, panX: 75, panY: -30, zoom: 2 },
      transform: { offsetX: 25, offsetY: 10, rotation: 30, scale: 1.5 },
    });

    expect(getModernCropFrameScreenCenter(f(400, 240, 400, 260), 1200, 760))
      .toEqual({ x: 600, y: 380 });
    expect(pivot.screen).toEqual({ x: 600, y: 380 });
    expect(pivot.document.x).toBeCloseTo((600 - 75 - 25) / 3);
    expect(pivot.document.y).toBeCloseTo((380 - -30 - 10) / 3);
  });

  it("converts Modern preview rotation to the crop engine rotation convention", () => {
    expect(getModernCropApplyRotation(90)).toBe(-90);
    expect(getModernCropApplyRotation(-45)).toBe(45);
    expect(getModernCropApplyRotation(0)).toBe(0);
  });

  it("keeps the cropbox center pinned when inverting a rotated modern transform", () => {
    const frame = f(400, 240);
    const viewport = { width: 1200, height: 760, panX: 75, panY: -30, zoom: 2 };
    const transform = { offsetX: 25, offsetY: 10, rotation: 37, scale: 1.5 };
    const pivot = getModernCropImagePivot({ frame, viewport, transform });

    const documentPoint = screenPointToModernDocumentPoint(
      pivot.screen,
      viewport,
      transform,
      frame,
    );

    expect(documentPoint.x).toBeCloseTo(pivot.document.x);
    expect(documentPoint.y).toBeCloseTo(pivot.document.y);
  });

  it("maps centered screen frame to document crop rect with pan and zoom", () => {
    const rect = modernFrameToCropRect({
      frame: f(400, 300, 400, 250),
      viewport: { width: 1200, height: 800, panX: 100, panY: 50, zoom: 2 },
      transform: { offsetX: 0, offsetY: 0, rotation: 0, scale: 1 },
    });

    expect(rect.x).toBeCloseTo(150);
    expect(rect.y).toBeCloseTo(100);
    expect(rect.w).toBeCloseTo(200);
    expect(rect.h).toBeCloseTo(150);
  });

  it("includes image offset when mapping to document crop rect", () => {
    const rect = modernFrameToCropRect({
      frame: f(400, 300, 400, 250),
      viewport: { width: 1200, height: 800, panX: 100, panY: 50, zoom: 2 },
      transform: { offsetX: 40, offsetY: -20, rotation: 0, scale: 1 },
    });

    expect(rect.x).toBeCloseTo(130);
    expect(rect.y).toBeCloseTo(110);
  });

  it("fits the default frame inside the smaller of viewport and projected canvas", () => {
    // projected canvas: 1600*0.5=800, 900*0.5=450; viewport: 1000x700
    // maxW = min(1000, 800) = 800, maxH = min(700, 450) = 450
    const frame = getDefaultModernCropFrame({
      viewportWidth: 1000,
      viewportHeight: 700,
      docWidth: 1600,
      docHeight: 900,
      zoom: 0.5,
      aspect: { w: 1, h: 1 },
    });

    expect(frame.w).toBeCloseTo(frame.h);
    expect(frame.w).toBeLessThanOrEqual(800);
    expect(frame.h).toBeLessThanOrEqual(450);
    expect(frame).toEqual({ x: 275, y: 125, w: 450, h: 450 });
  });

  it("defaults to projected canvas size when smaller than viewport", () => {
    // projected: 1600*0.7=1120, 900*0.7=630; viewport: 1200x800
    expect(getDefaultModernCropFrame({
      viewportWidth: 1200,
      viewportHeight: 800,
      docWidth: 1600,
      docHeight: 900,
      zoom: 0.7,
      aspect: null,
    })).toEqual({ x: 40, y: 85, w: 1120, h: 630 });
  });

  it("frame size tracks projected canvas bounds, clamped by viewport", () => {
    // zoom 0.5: projected 800x450 < viewport 1200x800 → frame = 800x450
    const frame1 = getDefaultModernCropFrame({
      viewportWidth: 1200, viewportHeight: 800,
      docWidth: 1600, docHeight: 900, zoom: 0.5,
    });
    // zoom 2.0: projected 3200x1800 > viewport 1200x800 → frame = 1200x800
    const frame2 = getDefaultModernCropFrame({
      viewportWidth: 1200, viewportHeight: 800,
      docWidth: 1600, docHeight: 900, zoom: 2.0,
    });
    expect(frame1).toEqual({ x: 200, y: 175, w: 800, h: 450 });
    expect(frame2).toEqual({ x: 0, y: 0, w: 1200, h: 800 });
  });

  it("allows center resize beyond projected canvas bounds", () => {
    const result = resizeModernFrameFromCenter({
      frame: f(300, 300),
      handle: "e",
      deltaX: 200,
      deltaY: 0,
      viewportWidth: 2000,
      viewportHeight: 2000,
      projectedWidth: 400,
      projectedHeight: 300,
    });
    expect(result.w).toBeGreaterThan(400);
    expect(result.h).toBe(300);
  });

  it("allows one-sided resize beyond projected canvas bounds", () => {
    const { frame } = resizeModernFrameOneSided({
      frame: f(300, 300),
      handle: "e",
      deltaX: 200,
      deltaY: 0,
      viewportWidth: 2000,
      viewportHeight: 2000,
      projectedWidth: 400,
      projectedHeight: 300,
    });
    expect(frame.w).toBeGreaterThan(400);
    expect(frame.h).toBe(300);
  });

  it("resizes the modern frame from center", () => {
    expect(resizeModernFrameFromCenter({
      frame: f(400, 300),
      handle: "e",
      deltaX: 20,
      deltaY: 0,
      viewportWidth: 1200,
      viewportHeight: 800,
    })).toEqual({ x: -20, y: 0, w: 440, h: 300 });
  });

  it("applies ratio constraint in ratio crop mode", () => {
    expect(resizeModernFrameFromCenter({
      frame: f(400, 300),
      handle: "e",
      deltaX: 40,
      deltaY: 0,
      viewportWidth: 1200,
      viewportHeight: 800,
      aspect: { w: 16, h: 9 },
      cropMode: "ratio",
    })).toEqual({ x: -40, y: 15, w: 480, h: 270 });
  });

  it("applies size mode constraint using target aspect", () => {
    expect(resizeModernFrameFromCenter({
      frame: f(400, 300),
      handle: "se",
      deltaX: 40,
      deltaY: 30,
      viewportWidth: 1200,
      viewportHeight: 800,
      aspect: { w: 4, h: 3 },
      cropMode: "size",
    })).toEqual({ x: -40, y: -30, w: 480, h: 360 });
  });

  it("keeps center fixed during free resize by doubling delta", () => {
    const frame = f(400, 300);
    const result = resizeModernFrameFromCenter({
      frame,
      handle: "e",
      deltaX: 30,
      deltaY: 0,
      viewportWidth: 1200,
      viewportHeight: 800,
    });
    expect(result.w).toBe(460);
    expect(result.h).toBe(300);
  });

  it("keeps center fixed during south resize", () => {
    const frame = f(400, 300);
    const result = resizeModernFrameFromCenter({
      frame,
      handle: "s",
      deltaX: 0,
      deltaY: 20,
      viewportWidth: 1200,
      viewportHeight: 800,
    });
    expect(result.w).toBe(400);
    expect(result.h).toBe(340);
  });

  it("keeps center fixed during corner resize", () => {
    const frame = f(400, 300);
    const result = resizeModernFrameFromCenter({
      frame,
      handle: "se",
      deltaX: 30,
      deltaY: 20,
      viewportWidth: 1200,
      viewportHeight: 800,
    });
    expect(result.w).toBe(460);
    expect(result.h).toBe(340);
  });

  it("size mode SE corner from center: projection-based ratio preserves monotonicity across axis flips", () => {
  // Simulate alternating axis dominance that causes |dw| >= |dh| / |dh| > |dw| flips.
  // With projection fix, each move increases width monotonically.
  let frame = f(400, 300);
  const moves = [
    { dx: 5, dy: 4 },   // |dw| >= |dh| → width-driven path (buggy)
    { dx: 4, dy: 5 },   // |dh| > |dw| → height-driven path (buggy: jumps)
    { dx: 5, dy: 4 },
    { dx: 4, dy: 5 },
    { dx: 5, dy: 4 },
  ];
  const widths: number[] = [400];
  for (const m of moves) {
    frame = resizeModernFrameFromCenter({
      frame,
      handle: "se",
      deltaX: m.dx,
      deltaY: m.dy,
      viewportWidth: 1200,
      viewportHeight: 800,
      aspect: { w: 16, h: 9 },
      cropMode: "size",
    });
    expect(frame.w / frame.h).toBeCloseTo(16 / 9, 6);
    widths.push(frame.w);
  }
  // Each move should increase width (absolute monotonic)
  for (let i = 1; i < widths.length; i++) {
    expect(widths[i]).toBeGreaterThan(widths[i - 1]);
  }
  // Per-move DELTA should also be stable (no 50%+ jumps from axis flip)
  for (let i = 2; i < widths.length; i++) {
    const prevDelta = widths[i - 1] - widths[i - 2];
    const currDelta = widths[i] - widths[i - 1];
    const ratio = Math.max(prevDelta, currDelta) / Math.min(prevDelta, currDelta);
    expect(ratio).toBeLessThan(2.5); // no axis flip should cause >2.5x delta swing
  }
});

it("maps a rotated modern frame to the visual crop size, not its document-space AABB", () => {
    const rect = modernFrameToCropRect({
      frame: f(400, 200, 300, 300),
      viewport: { width: 1000, height: 800, panX: 0, panY: 0, zoom: 1 },
      transform: { offsetX: 0, offsetY: 0, rotation: 45, scale: 1 },
    });

    expect(rect.w).toBeCloseTo(400);
    expect(rect.h).toBeCloseTo(200);
    expect(rect.x + rect.w / 2).toBeCloseTo(500);
    expect(rect.y + rect.h / 2).toBeCloseTo(400);
  });

  it("converts screen drag deltas into image offset deltas under rotation", () => {
    const delta = modernScreenDeltaToImageOffsetDelta({ x: 10, y: 0 }, 90);

    expect(delta.x).toBeCloseTo(0);
    expect(delta.y).toBeCloseTo(-10);
  });
});

describe("modern crop one-sided resize", () => {
  it("E handle: width increases, compensation shifts content left to anchor left edge", () => {
    const result = resizeModernFrameOneSided({
      frame: f(400, 300), handle: "e", deltaX: 40, deltaY: 0,
      viewportWidth: 1200, viewportHeight: 800,
    });
    expect(result.frame).toEqual({ x: 0, y: 0, w: 440, h: 300 });
    expect(result.compensation.x).toBe(-20);
    expect(result.compensation.y).toBe(0);
  });

  it("W handle: width decreases, compensation shifts content left to anchor right edge", () => {
    const result = resizeModernFrameOneSided({
      frame: f(400, 300), handle: "w", deltaX: 40, deltaY: 0,
      viewportWidth: 1200, viewportHeight: 800,
    });
    expect(result.frame).toEqual({ x: 40, y: 0, w: 360, h: 300 });
    expect(result.compensation.x).toBe(-20);
    expect(result.compensation.y).toBe(0);
  });

  it("S handle: height increases, compensation shifts content up to anchor top edge", () => {
    const result = resizeModernFrameOneSided({
      frame: f(400, 300), handle: "s", deltaX: 0, deltaY: 40,
      viewportWidth: 1200, viewportHeight: 800,
    });
    expect(result.frame).toEqual({ x: 0, y: 0, w: 400, h: 340 });
    expect(result.compensation.x).toBe(0);
    expect(result.compensation.y).toBe(-20);
  });

  it("N handle: height decreases, compensation shifts content up to anchor bottom edge", () => {
    const result = resizeModernFrameOneSided({
      frame: f(400, 300), handle: "n", deltaX: 0, deltaY: 40,
      viewportWidth: 1200, viewportHeight: 800,
    });
    expect(result.frame).toEqual({ x: 0, y: 40, w: 400, h: 260 });
    expect(result.compensation.x).toBe(0);
    expect(result.compensation.y).toBe(-20);
  });

  it("SE corner: width and height increase, compensations anchor NW corner", () => {
    const result = resizeModernFrameOneSided({
      frame: f(400, 300), handle: "se", deltaX: 40, deltaY: 30,
      viewportWidth: 1200, viewportHeight: 800,
    });
    expect(result.frame).toEqual({ x: 0, y: 0, w: 440, h: 330 });
    expect(result.compensation.x).toBe(-20);
    expect(result.compensation.y).toBe(-15);
  });

  it("NW corner: width and height decrease, compensations anchor SE corner", () => {
    const result = resizeModernFrameOneSided({
      frame: f(400, 300), handle: "nw", deltaX: 40, deltaY: 30,
      viewportWidth: 1200, viewportHeight: 800,
    });
    expect(result.frame).toEqual({ x: 40, y: 30, w: 360, h: 270 });
    expect(result.compensation.x).toBe(-20);
    expect(result.compensation.y).toBe(-15);
  });

  it("NE corner: width increases, height decreases", () => {
    const result = resizeModernFrameOneSided({
      frame: f(400, 300), handle: "ne", deltaX: 40, deltaY: 30,
      viewportWidth: 1200, viewportHeight: 800,
    });
    expect(result.frame).toEqual({ x: 0, y: 30, w: 440, h: 270 });
    expect(result.compensation.x).toBe(-20);
    expect(result.compensation.y).toBe(-15);
  });

  it("SW corner: width decreases, height increases", () => {
    const result = resizeModernFrameOneSided({
      frame: f(400, 300), handle: "sw", deltaX: 40, deltaY: 30,
      viewportWidth: 1200, viewportHeight: 800,
    });
    expect(result.frame).toEqual({ x: 40, y: 0, w: 360, h: 330 });
    expect(result.compensation.x).toBe(-20);
    expect(result.compensation.y).toBe(-15);
  });

  it("ratio mode: E handle preserves aspect, both axes grow, compensations for both", () => {
    const result = resizeModernFrameOneSided({
      frame: f(400, 300), handle: "e", deltaX: 80, deltaY: 0,
      viewportWidth: 1200, viewportHeight: 800,
      aspect: { w: 4, h: 3 }, cropMode: "ratio",
    });
    expect(result.frame).toEqual({ x: 0, y: 0, w: 480, h: 360 });
    expect(result.compensation.x).toBe(-40);
    expect(result.compensation.y).toBe(-30);
  });

  it("ratio mode: S handle height-driven, width preserves aspect", () => {
    const result = resizeModernFrameOneSided({
      frame: f(400, 300), handle: "s", deltaX: 0, deltaY: 60,
      viewportWidth: 1200, viewportHeight: 800,
      aspect: { w: 4, h: 3 }, cropMode: "ratio",
    });
    expect(result.frame).toEqual({ x: 0, y: 0, w: 480, h: 360 });
    expect(result.compensation.x).toBe(-40);
    expect(result.compensation.y).toBe(-30);
  });

  it("ratio mode: SE corner preserves aspect using diagonal projection", () => {
    const result = resizeModernFrameOneSided({
      frame: f(400, 300), handle: "se", deltaX: 40, deltaY: 20,
      viewportWidth: 1200, viewportHeight: 800,
      aspect: { w: 16, h: 9 }, cropMode: "ratio",
    });
    // Diagonal projection: projected = 1*(40*1 + 20*1) = 60
    // sumWH = 700, factor = 1 + 60/700 = 1.08571
    // w = 400 * 1.08571 = 434.29, h = 434.29/(16/9) = 244.29
    expect(result.frame.w).toBeCloseTo(434.29, 2);
    expect(result.frame.h).toBeCloseTo(244.29, 2);
    expect(result.frame.w / result.frame.h).toBeCloseTo(16 / 9, 6);
  });

  it("size mode: same as ratio with target aspect", () => {
    const result = resizeModernFrameOneSided({
      frame: f(400, 300), handle: "e", deltaX: 80, deltaY: 0,
      viewportWidth: 1200, viewportHeight: 800,
      aspect: { w: 800, h: 600 }, cropMode: "size",
    });
    expect(result.frame).toEqual({ x: 0, y: 0, w: 480, h: 360 });
    expect(result.compensation.x).toBe(-40);
    expect(result.compensation.y).toBe(-30);
  });

  it("clamps to minimum size and adjusts compensation accordingly", () => {
    const result = resizeModernFrameOneSided({
      frame: f(30, 30), handle: "nw", deltaX: 100, deltaY: 100,
      viewportWidth: 1200, viewportHeight: 800,
    });
    expect(result.frame.w).toBe(24);
    expect(result.frame.h).toBe(24);
    expect(result.compensation.x).toBe(-3);
    expect(result.compensation.y).toBe(-3);
  });

  it("E handle: content at left edge stays anchored, content at right edge shifts", () => {
    const frame = f(400, 300);
    const result = resizeModernFrameOneSided({
      frame, handle: "e", deltaX: 60, deltaY: 0,
      viewportWidth: 1200, viewportHeight: 800,
    });
    expect(result.frame.w).toBe(460);
    expect(result.compensation.x).toBe(-30);
  });

  it("W handle: content at right edge stays anchored, content at left edge shifts", () => {
    const frame = f(400, 300);
    const result = resizeModernFrameOneSided({
      frame, handle: "w", deltaX: 60, deltaY: 0,
      viewportWidth: 1200, viewportHeight: 800,
    });
    expect(result.frame.w).toBe(340);
    expect(result.compensation.x).toBe(-30);
  });

  it("N handle: content at bottom edge stays anchored, content at top edge shifts", () => {
    const frame = f(400, 300);
    const result = resizeModernFrameOneSided({
      frame, handle: "n", deltaX: 0, deltaY: 60,
      viewportWidth: 1200, viewportHeight: 800,
    });
    expect(result.frame.h).toBe(240);
    expect(result.compensation.y).toBe(-30);
  });

  it("S handle: content at top edge stays anchored, content at bottom edge shifts", () => {
    const frame = f(400, 300);
    const result = resizeModernFrameOneSided({
      frame, handle: "s", deltaX: 0, deltaY: 60,
      viewportWidth: 1200, viewportHeight: 800,
    });
    expect(result.frame.h).toBe(360);
    expect(result.compensation.y).toBe(-30);
  });

  it("zero delta produces zero compensation", () => {
    const result = resizeModernFrameOneSided({
      frame: f(400, 300), handle: "e", deltaX: 0, deltaY: 0,
      viewportWidth: 1200, viewportHeight: 800,
    });
    expect(result.frame).toEqual({ x: 0, y: 0, w: 400, h: 300 });
    expect(result.compensation).toEqual({ x: 0, y: 0 });
  });

  it("negative delta (dragging inward) produces smaller frame and matching compensation", () => {
    const result = resizeModernFrameOneSided({
      frame: f(400, 300), handle: "e", deltaX: -40, deltaY: 0,
      viewportWidth: 1200, viewportHeight: 800,
    });
    expect(result.frame.w).toBe(360);
    expect(result.compensation.x).toBe(20);
  });

  describe("center-out resize (alt)", () => {
    it("E handle + alt: grows from center, wider frame with zero compensation", () => {
      const result = resizeModernFrameOneSided({
        frame: f(400, 300), handle: "e", deltaX: 60, deltaY: 0,
        viewportWidth: 1200, viewportHeight: 800, alt: true,
      });
      expect(result.frame.w).toBe(520);
      expect(result.frame.x).toBe(-60);
      expect(result.frame.h).toBe(300);
      expect(result.compensation.x).toBe(0);
    });

    it("W handle + alt: shrinks from center, narrower frame with zero compensation", () => {
      const result = resizeModernFrameOneSided({
        frame: f(400, 300), handle: "w", deltaX: 60, deltaY: 0,
        viewportWidth: 1200, viewportHeight: 800, alt: true,
      });
      expect(result.frame.w).toBe(280);
      expect(result.frame.x).toBe(60);
      expect(result.frame.h).toBe(300);
      expect(result.compensation.x).toBe(0);
    });

    it("S handle + alt: grows from center, taller frame with zero compensation", () => {
      const result = resizeModernFrameOneSided({
        frame: f(400, 300), handle: "s", deltaX: 0, deltaY: 60,
        viewportWidth: 1200, viewportHeight: 800, alt: true,
      });
      expect(result.frame.h).toBe(420);
      expect(result.frame.y).toBe(-60);
      expect(result.frame.w).toBe(400);
      expect(result.compensation.y).toBe(0);
    });

    it("N handle + alt: shrinks from center, shorter frame with zero compensation", () => {
      const result = resizeModernFrameOneSided({
        frame: f(400, 300), handle: "n", deltaX: 0, deltaY: 60,
        viewportWidth: 1200, viewportHeight: 800, alt: true,
      });
      expect(result.frame.h).toBe(180);
      expect(result.frame.y).toBe(60);
      expect(result.frame.w).toBe(400);
      expect(result.compensation.y).toBe(0);
    });

    it("zero delta + alt: no change", () => {
      const result = resizeModernFrameOneSided({
        frame: f(400, 300), handle: "e", deltaX: 0, deltaY: 0,
        viewportWidth: 1200, viewportHeight: 800, alt: true,
      });
      expect(result.frame).toEqual({ x: 0, y: 0, w: 400, h: 300 });
      expect(result.compensation).toEqual({ x: 0, y: 0 });
    });

    it("SE corner + alt: both axes expand from center, compensation is zero", () => {
      const result = resizeModernFrameOneSided({
        frame: f(400, 300), handle: "se", deltaX: 60, deltaY: 50,
        viewportWidth: 1200, viewportHeight: 800, alt: true,
      });
      expect(result.frame.w).toBe(520);
      expect(result.frame.h).toBe(400);
      expect(result.frame.x).toBe(-60);
      expect(result.frame.y).toBe(-50);
      expect(result.compensation.x).toBe(0);
      expect(result.compensation.y).toBe(0);
    });

    it("NW corner + alt: both axes shrink from center, compensation is zero", () => {
      const result = resizeModernFrameOneSided({
        frame: f(400, 300), handle: "nw", deltaX: 60, deltaY: 50,
        viewportWidth: 1200, viewportHeight: 800, alt: true,
      });
      expect(result.frame.w).toBe(280);
      expect(result.frame.h).toBe(200);
      expect(result.frame.x).toBe(60);
      expect(result.frame.y).toBe(50);
      expect(result.compensation.x).toBe(0);
      expect(result.compensation.y).toBe(0);
    });

    it("E handle + alt + aspect constraint: frame follows aspect from center, compensation zero", () => {
      const result = resizeModernFrameOneSided({
        frame: f(400, 300), handle: "e", deltaX: 60, deltaY: 0,
        viewportWidth: 1200, viewportHeight: 800,
        aspect: { w: 16, h: 9 }, cropMode: "ratio", alt: true,
      });
      expect(result.frame.w).toBe(520);
      expect(result.frame.h).toBeCloseTo(292.5, 1);
      expect(result.frame.x).toBe(-60);
      expect(result.compensation.x).toBe(0);
      expect(result.compensation.y).toBe(0);
    });

    it("corner + shift + alt: classic center-out proportional resize", () => {
      const result = resizeModernFrameOneSided({
        frame: f(400, 300), handle: "se", deltaX: 60, deltaY: 50,
        viewportWidth: 1200, viewportHeight: 800,
        shift: true, alt: true,
      });
      expect(result.compensation.x).toBe(0);
      expect(result.compensation.y).toBe(0);
    });
  });

  describe("one-sided corner resize with aspect ratio — monotonic stability (regression)", () => {
    const opts = {
      viewportWidth: 1200, viewportHeight: 800,
      aspect: { w: 16, h: 9 }, cropMode: "ratio" as const,
    };

    it("SE corner outward: per-move delta stable (no aspect-ratio amplification)", () => {
      let frame = f(400, 300);
      // Alternating axis dominance: |dw| > |dh| then |dh| > |dw|
      // Old axis-threshold code produces deltas oscillating by ~1.777× (the aspect ratio).
      // With diagonal projection, per-move deltas remain within 1.3× of each other.
      const moves = [{ dx: 15, dy: 12 }, { dx: 12, dy: 15 }, { dx: 15, dy: 12 }, { dx: 12, dy: 15 }];
      const widths: number[] = [400];
      for (const m of moves) {
        const r = resizeModernFrameOneSided({ frame, handle: "se", deltaX: m.dx, deltaY: m.dy, ...opts });
        frame = r.frame;
        widths.push(frame.w);
      }
      for (let i = 1; i < widths.length; i++) {
        expect(widths[i]).toBeGreaterThan(widths[i - 1]);
      }
      for (let i = 2; i < widths.length; i++) {
        const prevDelta = widths[i - 1] - widths[i - 2];
        const currDelta = widths[i] - widths[i - 1];
        const ratio = Math.max(prevDelta, currDelta) / Math.min(prevDelta, currDelta);
        expect(ratio).toBeLessThan(1.3);
      }
    });

    it("SE corner inward: all moves decrease width monotonically", () => {
      let frame = f(600, 400);
      const moves = [{ dx: -20, dy: -15 }, { dx: -15, dy: -18 }, { dx: -22, dy: -14 }, { dx: -13, dy: -19 }];
      const widths: number[] = [600];
      for (const m of moves) {
        const r = resizeModernFrameOneSided({ frame, handle: "se", deltaX: m.dx, deltaY: m.dy, ...opts });
        frame = r.frame;
        widths.push(frame.w);
      }
      for (let i = 1; i < widths.length; i++) {
        expect(widths[i]).toBeLessThan(widths[i - 1]);
      }
    });

    it("NW corner outward: monotonic growth across axis flips", () => {
      let frame = f(400, 300);
      const moves = [{ dx: -20, dy: -15 }, { dx: -14, dy: -18 }, { dx: -22, dy: -16 }];
      const widths: number[] = [400];
      for (const m of moves) {
        const r = resizeModernFrameOneSided({ frame, handle: "nw", deltaX: m.dx, deltaY: m.dy, ...opts });
        frame = r.frame;
        widths.push(frame.w);
      }
      for (let i = 1; i < widths.length; i++) {
        expect(widths[i]).toBeGreaterThan(widths[i - 1]);
      }
    });

    it("NE corner outward: monotonic growth across axis flips (hy = -1)", () => {
      let frame = f(400, 300);
      const moves = [{ dx: 20, dy: -15 }, { dx: 14, dy: -18 }, { dx: 22, dy: -16 }];
      const widths: number[] = [400];
      for (const m of moves) {
        const r = resizeModernFrameOneSided({ frame, handle: "ne", deltaX: m.dx, deltaY: m.dy, ...opts });
        frame = r.frame;
        widths.push(frame.w);
      }
      for (let i = 1; i < widths.length; i++) {
        expect(widths[i]).toBeGreaterThan(widths[i - 1]);
      }
    });

    it("SW corner outward: monotonic growth across axis flips", () => {
      let frame = f(400, 300);
      const moves = [{ dx: -20, dy: 15 }, { dx: -14, dy: 18 }, { dx: -22, dy: 16 }];
      const widths: number[] = [400];
      for (const m of moves) {
        const r = resizeModernFrameOneSided({ frame, handle: "sw", deltaX: m.dx, deltaY: m.dy, ...opts });
        frame = r.frame;
        widths.push(frame.w);
      }
      for (let i = 1; i < widths.length; i++) {
        expect(widths[i]).toBeGreaterThan(widths[i - 1]);
      }
    });

    it("all four corners maintain ratio under repeated axis-flip drag", () => {
      let fSE = f(400, 300), fNE = f(400, 300), fNW = f(400, 300), fSW = f(400, 300);
      const moves = [{ dx: 10, dy: 8 }, { dx: 8, dy: 10 }, { dx: 12, dy: 9 }];
      for (const m of moves) {
        fSE = resizeModernFrameOneSided({ frame: fSE, handle: "se", deltaX: m.dx, deltaY: m.dy, ...opts }).frame;
        fNE = resizeModernFrameOneSided({ frame: fNE, handle: "ne", deltaX: m.dx, deltaY: m.dy, ...opts }).frame;
        fNW = resizeModernFrameOneSided({ frame: fNW, handle: "nw", deltaX: m.dx, deltaY: m.dy, ...opts }).frame;
        fSW = resizeModernFrameOneSided({ frame: fSW, handle: "sw", deltaX: m.dx, deltaY: m.dy, ...opts }).frame;
      }
      for (const f of [fSE, fNE, fNW, fSW]) {
        expect(f.w / f.h).toBeCloseTo(16 / 9, 6);
      }
    });
  });

  describe("centered corner resize with aspect ratio — monotonic stability (regression)", () => {
    const opts = {
      viewportWidth: 1200, viewportHeight: 800,
      aspect: { w: 16, h: 9 }, cropMode: "ratio" as const,
    };

    it("SE corner outward: per-move delta monotonic across axis flips", () => {
      let frame = f(400, 300);
      const moves = [{ dx: 5, dy: 4 }, { dx: 4, dy: 5 }, { dx: 5, dy: 4 }, { dx: 4, dy: 5 }];
      const widths: number[] = [400];
      for (const m of moves) {
        frame = resizeModernFrameFromCenter({ frame, handle: "se", deltaX: m.dx, deltaY: m.dy, ...opts });
        widths.push(frame.w);
      }
      for (let i = 1; i < widths.length; i++) {
        expect(widths[i]).toBeGreaterThan(widths[i - 1]);
      }
      for (let i = 2; i < widths.length; i++) {
        const prevDelta = widths[i - 1] - widths[i - 2];
        const currDelta = widths[i] - widths[i - 1];
        const ratio = Math.max(prevDelta, currDelta) / Math.min(prevDelta, currDelta);
        expect(ratio).toBeLessThan(2.5);
      }
    });

    it("SE corner inward: monotonic decrease", () => {
      let frame = f(500, 340);
      const moves = [{ dx: -5, dy: -4 }, { dx: -4, dy: -5 }, { dx: -5, dy: -4 }];
      const widths: number[] = [500];
      for (const m of moves) {
        frame = resizeModernFrameFromCenter({ frame, handle: "se", deltaX: m.dx, deltaY: m.dy, ...opts });
        widths.push(frame.w);
      }
      for (let i = 1; i < widths.length; i++) {
        expect(widths[i]).toBeLessThan(widths[i - 1]);
      }
    });

    it("all four corners maintain ratio under centered resize", () => {
      let fSE = f(400, 300), fNE = f(400, 300), fNW = f(400, 300), fSW = f(400, 300);
      const moves = [{ dx: 5, dy: 4 }, { dx: 4, dy: 5 }, { dx: 6, dy: 4 }];
      for (const m of moves) {
        fSE = resizeModernFrameFromCenter({ frame: fSE, handle: "se", deltaX: m.dx, deltaY: m.dy, ...opts });
        fNE = resizeModernFrameFromCenter({ frame: fNE, handle: "ne", deltaX: m.dx, deltaY: m.dy, ...opts });
        fNW = resizeModernFrameFromCenter({ frame: fNW, handle: "nw", deltaX: m.dx, deltaY: m.dy, ...opts });
        fSW = resizeModernFrameFromCenter({ frame: fSW, handle: "sw", deltaX: m.dx, deltaY: m.dy, ...opts });
      }
      for (const f of [fSE, fNE, fNW, fSW]) {
        expect(f.w / f.h).toBeCloseTo(16 / 9, 6);
      }
    });
  });

  it("compensation always opposes the centered frame expansion direction", () => {
    const handles = ["e", "w", "n", "s", "ne", "nw", "se", "sw"] as const;
    for (const handle of handles) {
      const result = resizeModernFrameOneSided({
        frame: f(400, 300), handle, deltaX: 50, deltaY: 30,
        viewportWidth: 1200, viewportHeight: 800,
      });
      if (handle.includes("w")) {
        expect(result.compensation.x).toBe((result.frame.w - 400) / 2);
      } else {
        expect(result.compensation.x).toBe(-(result.frame.w - 400) / 2 || 0);
      }
      if (handle.includes("n")) {
        expect(result.compensation.y).toBe((result.frame.h - 300) / 2);
      } else {
        expect(result.compensation.y).toBe(-(result.frame.h - 300) / 2 || 0);
      }
    }
  });

  describe("handle-to-pointer tracking (regression)", () => {
    const VW = 1200;
    const VH = 800;

    function rightEdge(f: { x: number; w: number }) { return f.x + f.w; }
    function leftEdge(f: { x: number }) { return f.x; }
    function bottomEdge(f: { y: number; h: number }) { return f.y + f.h; }
    function topEdge(f: { y: number }) { return f.y; }

    it("E handle: right edge tracks deltaX 1:1", () => {
      const frame = f(400, 300);
      const oldEdge = rightEdge(frame);
      const result = resizeModernFrameOneSided({
        frame, handle: "e", deltaX: 100, deltaY: 0,
        viewportWidth: VW, viewportHeight: VH,
      });
      expect(rightEdge(result.frame) - oldEdge).toBe(100);
    });

    it("W handle: right edge tracks -deltaX 1:1 (opposite edge moves inward)", () => {
      const frame = f(400, 300);
      const oldEdge = rightEdge(frame);
      const result = resizeModernFrameOneSided({
        frame, handle: "w", deltaX: 100, deltaY: 0,
        viewportWidth: VW, viewportHeight: VH,
      });
      expect(rightEdge(result.frame) - oldEdge).toBe(0);
    });

    it("S handle: bottom edge tracks deltaY 1:1", () => {
      const frame = f(400, 300);
      const oldEdge = bottomEdge(frame);
      const result = resizeModernFrameOneSided({
        frame, handle: "s", deltaX: 0, deltaY: 100,
        viewportWidth: VW, viewportHeight: VH,
      });
      expect(bottomEdge(result.frame) - oldEdge).toBe(100);
    });

    it("N handle: bottom edge tracks -deltaY 1:1 (opposite edge moves upward)", () => {
      const frame = f(400, 300);
      const oldEdge = bottomEdge(frame);
      const result = resizeModernFrameOneSided({
        frame, handle: "n", deltaX: 0, deltaY: 100,
        viewportWidth: VW, viewportHeight: VH,
      });
      expect(bottomEdge(result.frame) - oldEdge).toBe(0);
    });

    it("E handle: also tracks inward (negative delta) at 1:1", () => {
      const frame = f(400, 300);
      const oldEdge = rightEdge(frame);
      const result = resizeModernFrameOneSided({
        frame, handle: "e", deltaX: -75, deltaY: 0,
        viewportWidth: VW, viewportHeight: VH,
      });
      expect(rightEdge(result.frame) - oldEdge).toBe(-75);
    });

    it("SE corner: both axes track delta 1:1 independently", () => {
      const frame = f(400, 300);
      const oldR = rightEdge(frame);
      const oldB = bottomEdge(frame);
      const result = resizeModernFrameOneSided({
        frame, handle: "se", deltaX: 60, deltaY: 40,
        viewportWidth: VW, viewportHeight: VH,
      });
      expect(rightEdge(result.frame) - oldR).toBe(60);
      expect(bottomEdge(result.frame) - oldB).toBe(40);
    });

    it("NW corner: both axes track delta 1:1 (opposite edges move inward)", () => {
      const frame = f(400, 300);
      const oldR = rightEdge(frame);
      const oldB = bottomEdge(frame);
      const result = resizeModernFrameOneSided({
        frame, handle: "nw", deltaX: 60, deltaY: 40,
        viewportWidth: VW, viewportHeight: VH,
      });
      expect(rightEdge(result.frame) - oldR).toBe(0);
      expect(bottomEdge(result.frame) - oldB).toBe(0);
    });

    it("NE corner: right edge tracks deltaX, bottom edge tracks -deltaY", () => {
      const frame = f(400, 300);
      const oldR = rightEdge(frame);
      const oldB = bottomEdge(frame);
      const result = resizeModernFrameOneSided({
        frame, handle: "ne", deltaX: 60, deltaY: 40,
        viewportWidth: VW, viewportHeight: VH,
      });
      expect(rightEdge(result.frame) - oldR).toBe(60);
      expect(bottomEdge(result.frame) - oldB).toBe(0);
    });

    it("SW corner: right edge tracks -deltaX, bottom edge tracks deltaY", () => {
      const frame = f(400, 300);
      const oldR = rightEdge(frame);
      const oldB = bottomEdge(frame);
      const result = resizeModernFrameOneSided({
        frame, handle: "sw", deltaX: 60, deltaY: 40,
        viewportWidth: VW, viewportHeight: VH,
      });
      expect(rightEdge(result.frame) - oldR).toBe(0);
      expect(bottomEdge(result.frame) - oldB).toBe(40);
    });

    it("all eight handles track at 1:1 with no accumulated drift across multiple moves", () => {
      // Simulate 5 sequential pointer moves for each handle.
      // Each edge delta must equal the total mouse delta accumulated.
      const handles = ["e", "w", "n", "s", "ne", "nw", "se", "sw"] as const;
      for (const handle of handles) {
        let frame = f(400, 300);
        const moves: { dx: number; dy: number }[] = [
          { dx: 30, dy: 20 },
          { dx: -10, dy: 5 },
          { dx: 25, dy: -15 },
          { dx: -5, dy: 10 },
          { dx: 40, dy: 30 },
        ];
        const totalDx = moves.reduce((s, m) => s + m.dx, 0);
        const totalDy = moves.reduce((s, m) => s + m.dy, 0);

        const oldR = rightEdge(frame);
        const oldB = bottomEdge(frame);
        const oldL = leftEdge(frame);
        const oldT = topEdge(frame);

        for (const m of moves) {
          const r = resizeModernFrameOneSided({
            frame, handle, deltaX: m.dx, deltaY: m.dy,
            viewportWidth: VW, viewportHeight: VH,
          });
          frame = r.frame;
        }

        const re = rightEdge(frame) - oldR;
        const le = leftEdge(frame) - oldL;
        const be = bottomEdge(frame) - oldB;
        const te = topEdge(frame) - oldT;

        if (handle.includes("e")) expect(re).toBe(totalDx);
        if (handle.includes("w")) expect(re).toBe(0);
        if (handle.includes("s")) expect(be).toBe(totalDy);
        if (handle.includes("n")) expect(be).toBe(0);
      }
    });

    it("ratio mode: E handle edge tracks deltaX 1:1 (opposite edge anchored by compensation)", () => {
      const frame = f(400, 300);
      const oldEdge = rightEdge(frame);
      const result = resizeModernFrameOneSided({
        frame, handle: "e", deltaX: 80, deltaY: 0,
        viewportWidth: VW, viewportHeight: VH,
        aspect: { w: 4, h: 3 }, cropMode: "ratio",
      });
      expect(rightEdge(result.frame) - oldEdge).toBe(80);
      expect(result.frame.w / result.frame.h).toBeCloseTo(4 / 3, 6);
    });

    it("ratio mode: S handle edge tracks deltaY 1:1", () => {
      const frame = f(400, 300);
      const oldEdge = bottomEdge(frame);
      const result = resizeModernFrameOneSided({
        frame, handle: "s", deltaX: 0, deltaY: 60,
        viewportWidth: VW, viewportHeight: VH,
        aspect: { w: 4, h: 3 }, cropMode: "ratio",
      });
      expect(bottomEdge(result.frame) - oldEdge).toBe(60);
      expect(result.frame.w / result.frame.h).toBeCloseTo(4 / 3, 6);
    });
  });

  describe("edge cases — minimum size and extreme aspect ratios", () => {
    it("resize from minimum 24×24 does not produce NaN or sub-1 dimensions", () => {
      const frame = f(24, 24);
      const result = resizeModernFrameOneSided({
        frame, handle: "se", deltaX: 100, deltaY: 80,
        viewportWidth: 1200, viewportHeight: 800,
      });
      expect(result.frame.w).toBeGreaterThanOrEqual(24);
      expect(result.frame.h).toBeGreaterThanOrEqual(24);
      expect(Number.isFinite(result.frame.w)).toBe(true);
      expect(Number.isFinite(result.frame.h)).toBe(true);
    });

    it("resize from minimum 24×24 inward does not crash", () => {
      const frame = f(24, 24);
      const result = resizeModernFrameOneSided({
        frame, handle: "se", deltaX: -100, deltaY: -100,
        viewportWidth: 1200, viewportHeight: 800,
      });
      expect(result.frame.w).toBeGreaterThanOrEqual(24);
      expect(result.frame.h).toBeGreaterThanOrEqual(24);
      expect(Number.isFinite(result.frame.w)).toBe(true);
      expect(Number.isFinite(result.frame.h)).toBe(true);
    });

    it("100:1 aspect ratio: resize maintains monotonic growth", () => {
      const opts = {
        viewportWidth: 1200, viewportHeight: 800,
        aspect: { w: 100, h: 1 }, cropMode: "ratio" as const,
      };
      let frame = f(200, 2);
      const widths: number[] = [200];
      for (let i = 0; i < 5; i++) {
        const result = resizeModernFrameOneSided({
          frame, handle: "e", deltaX: 20, deltaY: 0,
          ...opts,
        });
        widths.push(result.frame.w);
        frame = result.frame;
      }
      for (let i = 1; i < widths.length; i++) {
        expect(widths[i]).toBeGreaterThan(widths[i - 1]);
      }
    });

    it("1:100 aspect ratio: resize maintains monotonic growth", () => {
      const opts = {
        viewportWidth: 1200, viewportHeight: 800,
        aspect: { w: 1, h: 100 }, cropMode: "ratio" as const,
      };
      let frame = f(2, 200);
      const heights: number[] = [200];
      for (let i = 0; i < 5; i++) {
        const result = resizeModernFrameOneSided({
          frame, handle: "s", deltaX: 0, deltaY: 20,
          ...opts,
        });
        heights.push(result.frame.h);
        frame = result.frame;
      }
      for (let i = 1; i < heights.length; i++) {
        expect(heights[i]).toBeGreaterThan(heights[i - 1]);
      }
    });

    it("free mode: extreme resize stays within document bounds (no overflow to NaN)", () => {
      const frame = f(400, 300);
      const result = resizeModernFrameOneSided({
        frame, handle: "se", deltaX: 2000, deltaY: 1500,
        viewportWidth: 1200, viewportHeight: 800,
      });
      expect(Number.isFinite(result.frame.w)).toBe(true);
      expect(Number.isFinite(result.frame.h)).toBe(true);
      expect(result.frame.w).toBeGreaterThan(frame.w);
      expect(result.frame.h).toBeGreaterThan(frame.h);
    });

    it("free mode: extreme inward resize clamps to minimum", () => {
      const frame = f(400, 300);
      const result = resizeModernFrameOneSided({
        frame, handle: "se", deltaX: -500, deltaY: -400,
        viewportWidth: 1200, viewportHeight: 800,
      });
      expect(result.frame.w).toBeGreaterThanOrEqual(24);
      expect(result.frame.h).toBeGreaterThanOrEqual(24);
    });
  });
});
