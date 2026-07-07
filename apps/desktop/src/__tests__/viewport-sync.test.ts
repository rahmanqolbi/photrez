/**
 * Viewport Sync Contract Tests
 *
 * Three sources of truth for viewport state must stay consistent:
 *   1. ViewportCamera instance (camera.getState())
 *   2. SolidJS signals (zoom(), pan())
 *   3. Engine viewport (engine.getViewport())
 *
 * Sync paths:
 *   - setViewportState({x, y, zoom})       → updates ALL THREE   (EditorContext)
 *   - syncFromCamera()                     → updates signals +   (EditorContext,
 *                                              engine from camera  animation callbacks)
 *   - syncViewport()                       → updates camera +    (workspaceSync,
 *                                              signals from engine engine onChange)
 *   - Direct setZoom/setPan (during pan)   → updates signals     (intentional
 *                                              ONLY               desync — no
 *                                                               camera or engine)
 *
 * This test verifies the contract that after each sync path, all three
 * sources converge to the same values.
 */

import { describe, it, expect, beforeEach } from "vitest";
import { DocumentEngine } from "../engine/document";
import { ViewportCamera } from "../viewport/viewportCamera";

// ─── Helpers ───

function createEngine() {
  const engine = new DocumentEngine("test-viewport", "Viewport Sync Test", 800, 600);
  engine.addLayer("Layer 1", 100, 100);
  return engine;
}

/** Read all three sources of truth and return as a plain object for comparison. */
function readViewportState(
  camera: ViewportCamera,
  zoom: () => number,
  pan: () => { x: number; y: number },
  engine: DocumentEngine,
) {
  const cam = camera.getState();
  const vp = engine.getViewport();
  return {
    camera: { x: cam.x, y: cam.y, zoom: cam.zoom },
    signals: { x: pan().x, y: pan().y, zoom: zoom() },
    engine: { x: vp.panX, y: vp.panY, zoom: vp.zoom },
  };
}

function assertAllMatch(
  state: ReturnType<typeof readViewportState>,
  label: string,
) {
  expect(state.camera, `${label}: camera`).toEqual(state.signals);
  expect(state.camera, `${label}: camera vs engine`).toEqual(state.engine);
}

/** Simulate setViewportState from EditorContext — updates all three sources. */
function setViewportState(
  camera: ViewportCamera,
  setZoom: (z: number) => void,
  setPan: (p: { x: number; y: number }) => void,
  engine: DocumentEngine,
  next: { x: number; y: number; zoom: number },
) {
  camera.setState(next);
  const clamped = camera.getState();
  setZoom(clamped.zoom);
  setPan({ x: clamped.x, y: clamped.y });
  engine.setViewport({ panX: clamped.x, panY: clamped.y, zoom: clamped.zoom });
}

/** Simulate syncFromCamera from EditorContext — reads camera and propagates to signals + engine. */
function syncFromCamera(
  camera: ViewportCamera,
  setZoom: (z: number) => void,
  setPan: (p: { x: number; y: number }) => void,
  engine: DocumentEngine,
) {
  const state = camera.getState();
  setZoom(state.zoom);
  setPan({ x: state.x, y: state.y });
  engine.setViewport({ panX: state.x, panY: state.y, zoom: state.zoom });
}

// ─── Tests ───

describe("viewport sync — initial state", () => {
  it("camera, signals, and engine all start at default values", () => {
    const engine = createEngine();
    const camera = new ViewportCamera();
    let zoomVal = 1;
    let panVal = { x: 0, y: 0 };
    const setZoom = (z: number) => { zoomVal = z; };
    const setPan = (p: { x: number; y: number }) => { panVal = p; };
    const zoom = () => zoomVal;
    const pan = () => panVal;

    // Default values after startup (before any sync)
    const state = readViewportState(camera, zoom, pan, engine);
    assertAllMatch(state, "initial state");
    expect(state.camera).toEqual({ x: 0, y: 0, zoom: 1 });
  });
});

describe("viewport sync — setViewportState (all three sources)", () => {
  it("syncs after zoom change", () => {
    const engine = createEngine();
    const camera = new ViewportCamera();
    let zoomVal = 1;
    let panVal = { x: 0, y: 0 };
    const setZoom = (z: number) => { zoomVal = z; };
    const setPan = (p: { x: number; y: number }) => { panVal = p; };
    const zoom = () => zoomVal;
    const pan = () => panVal;

    // Zoom to 2x center
    setViewportState(camera, setZoom, setPan, engine, { x: 100, y: 50, zoom: 2 });
    let state = readViewportState(camera, zoom, pan, engine);
    assertAllMatch(state, "zoom to 2x");
    expect(state.camera.zoom).toBe(2);
    expect(state.camera.x).toBe(100);
    expect(state.camera.y).toBe(50);
  });

  it("syncs after pan change", () => {
    const engine = createEngine();
    const camera = new ViewportCamera();
    let zoomVal = 1;
    let panVal = { x: 0, y: 0 };
    const setZoom = (z: number) => { zoomVal = z; };
    const setPan = (p: { x: number; y: number }) => { panVal = p; };
    const zoom = () => zoomVal;
    const pan = () => panVal;

    // Pan to new position
    setViewportState(camera, setZoom, setPan, engine, { x: -200, y: 150, zoom: 1.5 });
    let state = readViewportState(camera, zoom, pan, engine);
    assertAllMatch(state, "pan to (-200, 150) @ 1.5x");
    expect(state.camera.x).toBe(-200);
    expect(state.camera.y).toBe(150);
    expect(state.camera.zoom).toBe(1.5);
  });

  it("syncs after fit-to-screen values", () => {
    const engine = createEngine();
    const camera = new ViewportCamera();
    let zoomVal = 1;
    let panVal = { x: 0, y: 0 };
    const setZoom = (z: number) => { zoomVal = z; };
    const setPan = (p: { x: number; y: number }) => { panVal = p; };
    const zoom = () => zoomVal;
    const pan = () => panVal;

    // Fit 800x600 document into 1024x768 viewport
    const fitZoom = Math.min((1024 - 80) / 800, (768 - 80) / 600, 10);
    const fitPanX = (1024 - 800 * fitZoom) / 2;
    const fitPanY = (768 - 600 * fitZoom) / 2;

    setViewportState(camera, setZoom, setPan, engine, {
      x: fitPanX,
      y: fitPanY,
      zoom: fitZoom,
    });
    const state = readViewportState(camera, zoom, pan, engine);
    assertAllMatch(state, "fit-to-screen");
    expect(state.camera.zoom).toBeCloseTo(1.18, 1);
    expect(state.camera.x).toBeGreaterThan(0);
    expect(state.camera.y).toBeGreaterThan(0);
  });

  it("syncs after multiple successive viewport changes", () => {
    const engine = createEngine();
    const camera = new ViewportCamera();
    let zoomVal = 1;
    let panVal = { x: 0, y: 0 };
    const setZoom = (z: number) => { zoomVal = z; };
    const setPan = (p: { x: number; y: number }) => { panVal = p; };
    const zoom = () => zoomVal;
    const pan = () => panVal;

    // Sequence: zoom in → pan → zoom out
    setViewportState(camera, setZoom, setPan, engine, { x: 0, y: 0, zoom: 2 });
    assertAllMatch(readViewportState(camera, zoom, pan, engine), "after zoom in");

    setViewportState(camera, setZoom, setPan, engine, { x: 100, y: -50, zoom: 2 });
    assertAllMatch(readViewportState(camera, zoom, pan, engine), "after pan");

    setViewportState(camera, setZoom, setPan, engine, { x: 50, y: 25, zoom: 0.5 });
    assertAllMatch(readViewportState(camera, zoom, pan, engine), "after zoom out");

    const final = readViewportState(camera, zoom, pan, engine);
    expect(final.camera).toEqual({ x: 50, y: 25, zoom: 0.5 });
  });
});

describe("viewport sync — syncFromCamera (camera → signals + engine)", () => {
  it("syncs after camera.zoomToPoint", () => {
    const engine = createEngine();
    const camera = new ViewportCamera();
    let zoomVal = 1;
    let panVal = { x: 0, y: 0 };
    const setZoom = (z: number) => { zoomVal = z; };
    const setPan = (p: { x: number; y: number }) => { panVal = p; };
    const zoom = () => zoomVal;
    const pan = () => panVal;

    // Camera-only change (like mouse wheel zoom)
    camera.zoomToPoint(1.5, 400, 300);

    // Before syncFromCamera, only camera is updated
    const beforeSync = readViewportState(camera, zoom, pan, engine);
    expect(beforeSync.camera.zoom).toBeCloseTo(1.5);
    // Signals and engine still at defaults
    expect(beforeSync.signals.zoom).toBe(1);
    expect(beforeSync.engine.zoom).toBe(1);

    // After syncFromCamera, all three should match
    syncFromCamera(camera, setZoom, setPan, engine);
    const afterSync = readViewportState(camera, zoom, pan, engine);
    assertAllMatch(afterSync, "after syncFromCamera");
    expect(afterSync.camera.zoom).toBeCloseTo(1.5);
  });

  it("syncs after camera.pan", () => {
    const engine = createEngine();
    const camera = new ViewportCamera();
    let zoomVal = 1;
    let panVal = { x: 0, y: 0 };
    const setZoom = (z: number) => { zoomVal = z; };
    const setPan = (p: { x: number; y: number }) => { panVal = p; };
    const zoom = () => zoomVal;
    const pan = () => panVal;

    // Camera-only pan
    camera.pan(200, -100);

    // Before sync — only camera updated
    const beforeSync = readViewportState(camera, zoom, pan, engine);
    expect(beforeSync.camera.x).toBe(200);
    expect(beforeSync.camera.y).toBe(-100);
    expect(beforeSync.signals.x).toBe(0); // signals stale
    expect(beforeSync.engine.x).toBe(0); // engine stale

    // After sync — all match
    syncFromCamera(camera, setZoom, setPan, engine);
    const afterSync = readViewportState(camera, zoom, pan, engine);
    assertAllMatch(afterSync, "after syncFromCamera");
    expect(afterSync.camera.x).toBe(200);
    expect(afterSync.camera.y).toBe(-100);
  });

  it("syncs after camera.zoomToPoint + pan (simulated scroll-wheel gesture)", () => {
    const engine = createEngine();
    const camera = new ViewportCamera();
    let zoomVal = 1;
    let panVal = { x: 0, y: 0 };
    const setZoom = (z: number) => { zoomVal = z; };
    const setPan = (p: { x: number; y: number }) => { panVal = p; };
    const zoom = () => zoomVal;
    const pan = () => panVal;

    // Wheel zoom at center
    camera.zoomToPoint(0.8, 400, 300);
    // Then pan
    camera.pan(-50, 30);

    syncFromCamera(camera, setZoom, setPan, engine);
    const state = readViewportState(camera, zoom, pan, engine);
    assertAllMatch(state, "after wheel zoom + pan + sync");
    // After zoomToPoint(0.8, 400, 300) on defaults:
    //   newZoom = 0.8, newX = 400 - (400 / 1) * 0.8 = 80, newY = 300 - (300 / 1) * 0.8 = 60
    // After pan(-50, 30): x = 80 - 50 = 30, y = 60 + 30 = 90
    expect(state.camera.x).toBe(30);
    expect(state.camera.y).toBe(90);
    expect(state.camera.zoom).toBeCloseTo(0.8);
  });
});

describe("viewport sync — camera animation + syncFromCamera", () => {
  it("after zoom animation completes, syncFromCamera converges all three", () => {
    const engine = createEngine();
    const camera = new ViewportCamera();
    let zoomVal = 1;
    let panVal = { x: 0, y: 0 };
    const setZoom = (z: number) => { zoomVal = z; };
    const setPan = (p: { x: number; y: number }) => { panVal = p; };
    const zoom = () => zoomVal;
    const pan = () => panVal;

    const linearEasing = (t: number) => t;

    // Start zoom animation
    camera.animateZoomToPoint(2, 400, 300, 100, linearEasing);

    // Tick animation to completion
    let running = true;
    const startTime = performance.now();
    while (running) {
      running = camera.tick(startTime + 200); // well past 100ms duration
    }

    // Camera should be at final position
    const camState = camera.getState();
    expect(camState.zoom).toBeCloseTo(2);
    // After animation, syncFromCamera propagates to signals and engine
    syncFromCamera(camera, setZoom, setPan, engine);
    const afterSync = readViewportState(camera, zoom, pan, engine);
    assertAllMatch(afterSync, "after animation + syncFromCamera");
    expect(afterSync.camera.zoom).toBeCloseTo(2);
  });

  it("camera.setState cancels animation and syncFromCamera still converges", () => {
    const engine = createEngine();
    const camera = new ViewportCamera();
    let zoomVal = 1;
    let panVal = { x: 0, y: 0 };
    const setZoom = (z: number) => { zoomVal = z; };
    const setPan = (p: { x: number; y: number }) => { panVal = p; };
    const zoom = () => zoomVal;
    const pan = () => panVal;

    const linearEasing = (t: number) => t;

    // Start animation but interrupt with setState before it completes
    camera.animateZoomToPoint(2, 400, 300, 100, linearEasing);
    camera.setState({ x: -100, y: 50, zoom: 1.5 }); // cancels animation

    // setState already updated camera; syncFromCamera propagates
    syncFromCamera(camera, setZoom, setPan, engine);
    const state = readViewportState(camera, zoom, pan, engine);
    assertAllMatch(state, "after interrupted animation + syncFromCamera");
    expect(state.camera.zoom).toBe(1.5);
    expect(state.camera.x).toBe(-100);
    expect(state.camera.y).toBe(50);
  });
});

describe("viewport sync — direct signal update (panning)", () => {
  it("direct setZoom/setPan update signals without affecting camera or engine", () => {
    const engine = createEngine();
    const camera = new ViewportCamera();
    let zoomVal = 1;
    let panVal = { x: 0, y: 0 };
    const setZoom = (z: number) => { zoomVal = z; };
    const setPan = (p: { x: number; y: number }) => { panVal = p; };
    const zoom = () => zoomVal;
    const pan = () => panVal;

    // Direct signal update (used during panning — see usePanNavigation.ts)
    setZoom(1.5);
    setPan({ x: 200, y: -100 });

    // After direct signal update:
    // camera and engine are NOT updated (intentional desync)
    const state = readViewportState(camera, zoom, pan, engine);
    expect(state.signals.zoom).toBe(1.5);
    expect(state.signals.x).toBe(200);
    expect(state.signals.y).toBe(-100);
    // Camera and engine still at defaults
    expect(state.camera.zoom).toBe(1);
    expect(state.camera.x).toBe(0);
    expect(state.camera.y).toBe(0);
  });

  it("syncFromCamera after direct signal update overwrites signals with camera values", () => {
    const engine = createEngine();
    const camera = new ViewportCamera();
    let zoomVal = 1.5;  // start desynced from camera
    let panVal = { x: 200, y: -100 };
    const setZoom = (z: number) => { zoomVal = z; };
    const setPan = (p: { x: number; y: number }) => { panVal = p; };
    const zoom = () => zoomVal;
    const pan = () => panVal;

    // Camera is at defaults (0,0,1), signals at (200,-100,1.5) — desynced
    // Simulating a panning session that ended

    // After syncFromCamera, signals should be overwritten with camera values
    syncFromCamera(camera, setZoom, setPan, engine);
    const state = readViewportState(camera, zoom, pan, engine);
    assertAllMatch(state, "syncFromCamera overwrites signals");
    expect(state.signals.zoom).toBe(1);   // camera's zoom
    expect(state.signals.x).toBe(0);       // camera's x
    expect(state.signals.y).toBe(0);       // camera's y
  });
});

describe("viewport sync — setViewportState clamps extreme values", () => {
  it("clamps zoom to MIN_ZOOM (0.01)", () => {
    const engine = createEngine();
    const camera = new ViewportCamera();
    let zoomVal = 1;
    let panVal = { x: 0, y: 0 };
    const setZoom = (z: number) => { zoomVal = z; };
    const setPan = (p: { x: number; y: number }) => { panVal = p; };
    const zoom = () => zoomVal;
    const pan = () => panVal;

    setViewportState(camera, setZoom, setPan, engine, { x: 0, y: 0, zoom: -5 });
    const state = readViewportState(camera, zoom, pan, engine);
    assertAllMatch(state, "clamp min zoom");
    expect(state.camera.zoom).toBe(0.01);
  });

  it("clamps zoom to MAX_ZOOM (100)", () => {
    const engine = createEngine();
    const camera = new ViewportCamera();
    let zoomVal = 1;
    let panVal = { x: 0, y: 0 };
    const setZoom = (z: number) => { zoomVal = z; };
    const setPan = (p: { x: number; y: number }) => { panVal = p; };
    const zoom = () => zoomVal;
    const pan = () => panVal;

    setViewportState(camera, setZoom, setPan, engine, { x: 0, y: 0, zoom: 999 });
    const state = readViewportState(camera, zoom, pan, engine);
    assertAllMatch(state, "clamp max zoom");
    expect(state.camera.zoom).toBe(100);
  });
});
