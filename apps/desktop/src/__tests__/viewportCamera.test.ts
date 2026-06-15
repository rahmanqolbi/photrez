import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { ViewportCamera, MIN_ZOOM, MAX_ZOOM } from "../viewport/viewportCamera";
import { easeOutCubic, linear } from "../viewport/easing";
import { screenToDocument } from "../viewport/coords";

describe("ViewportCamera", () => {
  let camera: ViewportCamera;

  beforeEach(() => {
    camera = new ViewportCamera();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("initializes with default values", () => {
    const state = camera.getState();
    expect(state.x).toBe(0);
    expect(state.y).toBe(0);
    expect(state.zoom).toBe(1.0);
  });

  it("can set and get state", () => {
    camera.setState({ x: 100, y: 200, zoom: 2.0 });
    const state = camera.getState();
    expect(state.x).toBe(100);
    expect(state.y).toBe(200);
    expect(state.zoom).toBe(2.0);
  });

  it("clamps zoom to limits in setState", () => {
    camera.setState({ x: 0, y: 0, zoom: MIN_ZOOM - 0.005 });
    expect(camera.getState().zoom).toBe(MIN_ZOOM);

    camera.setState({ x: 0, y: 0, zoom: MAX_ZOOM + 10 });
    expect(camera.getState().zoom).toBe(MAX_ZOOM);
  });

  it("pans correctly", () => {
    camera.pan(50, -30);
    expect(camera.getState()).toEqual({ x: 50, y: -30, zoom: 1.0 });
  });

  it("converts screen to document and back correctly", () => {
    camera.setState({ x: 100, y: 200, zoom: 2.5 });

    // screenToDocument: (screen - pan) / zoom
    // (350 - 100) / 2.5 = 100
    // (700 - 200) / 2.5 = 200
    const doc = camera.screenToDocument(350, 700);
    expect(doc.x).toBeCloseTo(100);
    expect(doc.y).toBeCloseTo(200);

    const screen = camera.documentToScreen(100, 200);
    expect(screen.x).toBeCloseTo(350);
    expect(screen.y).toBeCloseTo(700);
  });

  it("round-trips document and screen coordinates after pan and zoom", () => {
    camera.setState({ x: 86, y: 124, zoom: 0.6 });

    const screen = camera.documentToScreen(472, 709);
    const doc = camera.screenToDocument(screen.x, screen.y);

    expect(doc.x).toBeCloseTo(472, 4);
    expect(doc.y).toBeCloseTo(709, 4);
  });

  it("zoomToPoint keeps anchor point stable", () => {
    camera.setState({ x: 50, y: 50, zoom: 1.0 });

    const screenX = 200;
    const screenY = 150;

    // Document coordinate under pointer before zoom
    const docBefore = camera.screenToDocument(screenX, screenY);

    camera.zoomToPoint(1.5, screenX, screenY);

    // Document coordinate under pointer after zoom must be identical
    const docAfter = camera.screenToDocument(screenX, screenY);

    expect(docAfter.x).toBeCloseTo(docBefore.x);
    expect(docAfter.y).toBeCloseTo(docBefore.y);
    expect(camera.getState().zoom).toBe(1.5);
  });

  it("getViewProjectionMatrix returns correct ortho matrix", () => {
    camera.setState({ x: 100, y: 50, zoom: 2.0 });

    const matrix = camera.getViewProjectionMatrix(800, 600);
    expect(matrix).toHaveLength(16);

    // m[0] = 2 * zoom / w = 4 / 800 = 0.005
    expect(matrix[0]).toBeCloseTo(0.005);
    // m[5] = -2 * zoom / h = -4 / 600 = -0.0066666
    expect(matrix[5]).toBeCloseTo(-0.0066666);
    // m[10] = 1
    expect(matrix[10]).toBe(1);
    // m[12] = -1 + 2 * x / w = -1 + 200 / 800 = -0.75
    expect(matrix[12]).toBeCloseTo(-0.75);
    // m[13] = 1 - 2 * y / h = 1 - 100 / 600 = 0.833333
    expect(matrix[13]).toBeCloseTo(0.833333);
  });

  it("interpolates animation values smoothly", () => {
    camera.setState({ x: 0, y: 0, zoom: 1.0 });

    const target = { x: 100, y: 200, zoom: 2.0 };
    const start = performance.now();

    const startCallback = vi.fn();
    const endCallback = vi.fn();
    camera.onAnimationStart = startCallback;
    camera.onAnimationEnd = endCallback;

    camera.animateTo(target, 200, linear);

    expect(camera.isAnimating()).toBe(true);
    expect(startCallback).toHaveBeenCalledTimes(1);

    // Tick at 50% time
    vi.advanceTimersByTime(100);
    camera.tick(start + 100);

    expect(camera.getState().x).toBeCloseTo(50);
    expect(camera.getState().y).toBeCloseTo(100);
    expect(camera.getState().zoom).toBeCloseTo(1.5);
    expect(camera.isAnimating()).toBe(true);

    // Tick at 100% time
    vi.advanceTimersByTime(100);
    camera.tick(start + 200);

    expect(camera.getState().x).toBe(100);
    expect(camera.getState().y).toBe(200);
    expect(camera.getState().zoom).toBe(2.0);
    expect(camera.isAnimating()).toBe(false);
    expect(endCallback).toHaveBeenCalledTimes(1);
  });

  it("animateZoomToPoint zoom targets point correctly", () => {
    camera.setState({ x: 50, y: 50, zoom: 1.0 });

    const screenX = 200;
    const screenY = 150;
    const docBefore = camera.screenToDocument(screenX, screenY);

    camera.animateZoomToPoint(2.0, screenX, screenY, 150, easeOutCubic);

    const start = performance.now();
    // Complete animation immediately
    vi.advanceTimersByTime(150);
    camera.tick(start + 150);

    expect(camera.isAnimating()).toBe(false);
    expect(camera.getState().zoom).toBe(2.0);

    const docAfter = camera.screenToDocument(screenX, screenY);
    expect(docAfter.x).toBeCloseTo(docBefore.x);
    expect(docAfter.y).toBeCloseTo(docBefore.y);
  });

  it("setImageTransform stores state retrievable via getImageTransform", () => {
    camera.setImageTransform({
      offsetX: 10,
      offsetY: 20,
      rotation: 30,
      scale: 1.5,
      pivotScreen: { x: 100, y: 200 },
      pivotDocument: { x: 50, y: 60 },
    });

    const t = camera.getImageTransform();
    expect(t.offsetX).toBe(10);
    expect(t.offsetY).toBe(20);
    expect(t.rotation).toBe(30);
    expect(t.scale).toBe(1.5);
    expect(t.pivotScreen).toEqual({ x: 100, y: 200 });
    expect(t.pivotDocument).toEqual({ x: 50, y: 60 });
  });

  it("getImageTransform returns a copy (mutating result does not affect camera)", () => {
    camera.setImageTransform({ offsetX: 5 });
    const t = camera.getImageTransform();
    t.offsetX = 999;
    expect(camera.getImageTransform().offsetX).toBe(5);
  });

  it("setImageTransform defaults unspecified fields to identity", () => {
    camera.setImageTransform({ offsetX: 10 });

    const t = camera.getImageTransform();
    expect(t.offsetX).toBe(10);
    expect(t.offsetY).toBe(0);
    expect(t.rotation).toBe(0);
    expect(t.scale).toBe(1.0);
    expect(t.pivotScreen).toBeNull();
    expect(t.pivotDocument).toBeNull();
  });

  it("resetImageTransform returns state to identity (default)", () => {
    camera.setImageTransform({
      offsetX: 10,
      offsetY: 20,
      rotation: 30,
      scale: 1.5,
      pivotScreen: { x: 100, y: 200 },
      pivotDocument: { x: 50, y: 60 },
    });
    camera.resetImageTransform();

    const t = camera.getImageTransform();
    expect(t.offsetX).toBe(0);
    expect(t.offsetY).toBe(0);
    expect(t.rotation).toBe(0);
    expect(t.scale).toBe(1.0);
    expect(t.pivotScreen).toBeNull();
    expect(t.pivotDocument).toBeNull();
  });

  it("getViewProjectionMatrix with identity image transform matches camera-only matrix", () => {
    camera.setState({ x: 100, y: 50, zoom: 2.0 });

    const m1 = camera.getViewProjectionMatrix(800, 600);

    camera.setImageTransform({});
    const m2 = camera.getViewProjectionMatrix(800, 600);

    expect(m2).toEqual(m1);
  });

  it("getViewProjectionMatrix with null pivots matches camera-only matrix", () => {
    camera.setState({ x: 100, y: 50, zoom: 2.0 });

    const m1 = camera.getViewProjectionMatrix(800, 600);

    camera.setImageTransform({
      offsetX: 0,
      offsetY: 0,
      rotation: 0,
      scale: 1.0,
      pivotScreen: null,
      pivotDocument: null,
    });
    const m2 = camera.getViewProjectionMatrix(800, 600);

    expect(m2).toEqual(m1);
  });

  it("getViewProjectionMatrix with image transform offset shifts matrix translation by offset in screen pixels", () => {
    camera.setState({ x: 0, y: 0, zoom: 1.0 });

    const m1 = camera.getViewProjectionMatrix(800, 600);
    expect(m1[12]).toBeCloseTo(-1, 5);

    camera.setImageTransform({
      offsetX: 50,
      offsetY: 0,
      pivotScreen: null,
      pivotDocument: null,
    });
    const m2 = camera.getViewProjectionMatrix(800, 600);

    expect(m2[12]).toBeCloseTo(-0.875, 5);
    expect(m2[13]).toBeCloseTo(m1[13], 5);
  });

  it("getViewProjectionMatrix with image transform scale + pivot: pivot maps to NDC center, scaled point maps correctly", () => {
    camera.setState({ x: 0, y: 0, zoom: 1.0 });
    camera.setImageTransform({
      offsetX: 0,
      offsetY: 0,
      rotation: 0,
      scale: 2.0,
      pivotScreen: { x: 500, y: 500 },
      pivotDocument: { x: 500, y: 500 },
    });

    const m = camera.getViewProjectionMatrix(1000, 1000);

    expect(m[0]).toBeCloseTo(0.004, 5);
    expect(m[1]).toBeCloseTo(0, 5);
    expect(m[4]).toBeCloseTo(0, 5);
    expect(m[5]).toBeCloseTo(-0.004, 5);
    expect(m[12]).toBeCloseTo(-2, 5);
    expect(m[13]).toBeCloseTo(2, 5);

    // Pivot maps to NDC origin
    expect(m[0] * 500 + m[4] * 500 + m[12]).toBeCloseTo(0, 5);
    expect(m[1] * 500 + m[5] * 500 + m[13]).toBeCloseTo(0, 5);

    // Doc (700, 500): 200 right of pivot
    // After scale=2: (400, 0) from pivot, +pivot_screen (500,500) = (900, 500)
    // NDC: (900*2/1000 - 1, -500*2/1000 + 1) = (0.8, 0)
    expect(m[0] * 700 + m[4] * 500 + m[12]).toBeCloseTo(0.8, 5);
    expect(m[1] * 700 + m[5] * 500 + m[13]).toBeCloseTo(0, 5);
  });
});

describe("coords.screenToDocument vs camera.screenToDocument equivalency", () => {
  it("produces identical results across zoom levels and pan offsets", () => {
    const camera = new ViewportCamera();
    const canvasRect = new DOMRect(50, 30, 1200, 800);

    const scenarios = [
      { x: 0, y: 0, zoom: 1.0 },
      { x: 100, y: 200, zoom: 0.5 },
      { x: -50, y: -100, zoom: 2.0 },
      { x: 300, y: 150, zoom: 0.25 },
    ];

    for (const state of scenarios) {
      camera.setState(state);

      // Test points across the viewport
      const testPoints = [
        { clientX: 100, clientY: 100 },
        { clientX: 400, clientY: 300 },
        { clientX: 800, clientY: 500 },
        { clientX: 600, clientY: 400 },
      ];

      for (const pt of testPoints) {
        const coordsResult = screenToDocument(
          pt.clientX,
          pt.clientY,
          canvasRect,
          { panX: state.x, panY: state.y, zoom: state.zoom, rotation: 0 }
        );

        const cameraResult = camera.screenToDocument(
          pt.clientX - canvasRect.left,
          pt.clientY - canvasRect.top
        );

        expect(coordsResult.x).toBeCloseTo(cameraResult.x, 10);
        expect(coordsResult.y).toBeCloseTo(cameraResult.y, 10);
      }
    }
  });
});
