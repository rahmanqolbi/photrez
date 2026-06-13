import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { ViewportCamera, MIN_ZOOM, MAX_ZOOM } from "../viewport/viewportCamera";
import { easeOutCubic, linear } from "../viewport/easing";

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
});
