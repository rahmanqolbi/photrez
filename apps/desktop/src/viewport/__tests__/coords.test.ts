import { describe, it, expect } from "vitest";
import { screenToDocument, documentToScreen } from "../coords";
import { ViewportCamera } from "../viewportCamera";

describe("screenToDocument coordinate conversion", () => {
  const canvasRect = new DOMRect(50, 30, 1200, 800);
  const ORIGIN = { panX: 0, panY: 0, zoom: 1, rotation: 0 };

  it("converts correctly with default zoom=1, no pan", () => {
    // Point at screen (350, 230) → canvas-relative (300, 200) → doc (300, 200)
    const result = screenToDocument(350, 230, canvasRect, ORIGIN);
    expect(result.x).toBe(300);
    expect(result.y).toBe(200);
  });

  it("converts correctly with zoom=2, no pan", () => {
    // Point at screen (350, 230) → canvas-relative (300, 200) → doc (150, 100)
    const result = screenToDocument(350, 230, canvasRect, {
      panX: 0, panY: 0, zoom: 2, rotation: 0,
    });
    expect(result.x).toBe(150);
    expect(result.y).toBe(100);
  });

  it("converts correctly with zoom=0.5, no pan", () => {
    // Point at screen (350, 230) → canvas-relative (300, 200) → doc (600, 400)
    const result = screenToDocument(350, 230, canvasRect, {
      panX: 0, panY: 0, zoom: 0.5, rotation: 0,
    });
    expect(result.x).toBe(600);
    expect(result.y).toBe(400);
  });

  it("converts correctly with zoom=1, pan=(200, 100)", () => {
    // Point at screen (550, 330) → canvas-relative (500, 300) → (500-200, 300-100) = (300, 200)
    const result = screenToDocument(550, 330, canvasRect, {
      panX: 200, panY: 100, zoom: 1, rotation: 0,
    });
    expect(result.x).toBe(300);
    expect(result.y).toBe(200);
  });

  it("converts correctly with zoom=2, pan=(-200, -100)", () => {
    // Point at screen (150, 130) → canvas-relative (100, 100) → (100+200, 100+100)/2 = (150, 100)
    const result = screenToDocument(150, 130, canvasRect, {
      panX: -200, panY: -100, zoom: 2, rotation: 0,
    });
    expect(result.x).toBe(150);
    expect(result.y).toBe(100);
  });

  it("converts correctly with zoom=4, pan=(100, 50)", () => {
    // Point at screen (250, 170) → canvas-relative (200, 140) → (200-100, 140-50)/4 = (25, 22.5)
    const result = screenToDocument(250, 170, canvasRect, {
      panX: 100, panY: 50, zoom: 4, rotation: 0,
    });
    expect(result.x).toBe(25);
    expect(result.y).toBe(22.5);
  });

  it("converts correctly with zoom=0.25, pan=(300, 150)", () => {
    // Canvas-relative (200, 140) → (200-300, 140-150)/0.25 = (-400, -40)
    const result = screenToDocument(250, 170, canvasRect, {
      panX: 300, panY: 150, zoom: 0.25, rotation: 0,
    });
    expect(result.x).toBe(-400);
    expect(result.y).toBe(-40);
  });

  it("produces negative doc coords with negative zoom (no guard in screenToDocument)", () => {
    // Note: getDocCoords() in useCanvasPointerTools guards against z <= 0,
    // but the standalone screenToDocument does not. This test documents
    // the unprotected behavior.
    const result = screenToDocument(350, 230, canvasRect, {
      panX: 0, panY: 0, zoom: -1, rotation: 0,
    });
    // (300-0)/(-1) = -300
    expect(result.x).toBe(-300);
    expect(result.y).toBe(-200);
  });

  it("produces Infinity with zoom=0 (no guard)", () => {
    // getDocCoords() guards against z <= 0, but screenToDocument doesn't.
    // This documents that zoom=0 causes division by zero.
    const result = screenToDocument(350, 230, canvasRect, {
      panX: 0, panY: 0, zoom: 0, rotation: 0,
    });
    expect(Number.isFinite(result.x)).toBe(false);
    expect(Number.isFinite(result.y)).toBe(false);
  });
});

describe("documentToScreen coordinate conversion", () => {
  const canvasRect = new DOMRect(50, 30, 1200, 800);

  it("converts correctly with default zoom=1, no pan", () => {
    const result = documentToScreen(300, 200, canvasRect, {
      panX: 0, panY: 0, zoom: 1, rotation: 0,
    });
    expect(result.x).toBe(350); // 300*1 + 0 + 50
    expect(result.y).toBe(230); // 200*1 + 0 + 30
  });

  it("converts correctly with zoom=2, pan=(200, 100)", () => {
    const result = documentToScreen(300, 200, canvasRect, {
      panX: 200, panY: 100, zoom: 2, rotation: 0,
    });
    // 300*2 + 200 + 50 = 850, 200*2 + 100 + 30 = 530
    expect(result.x).toBe(850);
    expect(result.y).toBe(530);
  });
});

describe("screenToDocument round-trip with documentToScreen", () => {
  const canvasRect = new DOMRect(50, 30, 1200, 800);

  const scenarios = [
    { panX: 0, panY: 0, zoom: 1 },
    { panX: 200, panY: 100, zoom: 2 },
    { panX: -200, panY: -100, zoom: 2 },
    { panX: 100, panY: 50, zoom: 4 },
    { panX: 300, panY: 150, zoom: 0.25 },
    { panX: -50, panY: 50, zoom: 1.5 },
  ];

  for (const vp of scenarios) {
    it(`round-trips with pan=(${vp.panX}, ${vp.panY}), zoom=${vp.zoom}`, () => {
      const viewport = { ...vp, rotation: 0 };
      const testPoints = [
        { clientX: 100, clientY: 80 },
        { clientX: 400, clientY: 300 },
        { clientX: 800, clientY: 500 },
        { clientX: 600, clientY: 400 },
        { clientX: 50, clientY: 30 },  // top-left of canvas
        { clientX: 1250, clientY: 830 }, // bottom-right of canvas
      ];

      for (const pt of testPoints) {
        const doc = screenToDocument(pt.clientX, pt.clientY, canvasRect, viewport);
        const screen = documentToScreen(doc.x, doc.y, canvasRect, viewport);
        expect(screen.x).toBeCloseTo(pt.clientX, 10);
        expect(screen.y).toBeCloseTo(pt.clientY, 10);
      }
    });
  }
});

describe("screenToDocument equivalency with ViewportCamera.screenToDocument", () => {
  // Test that the standalone screenToDocument function produces the same
  // results as the ViewportCamera method across different pan/zoom states.
  // This mirrors the existing test in viewportCamera.test.ts but adds
  // more scenarios and edge cases.

  it("produces identical results across zoom levels and pan offsets", () => {
    const camera = new ViewportCamera();
    const canvasRect = new DOMRect(50, 30, 1200, 800);

    const scenarios = [
      { x: 0, y: 0, zoom: 1.0 },
      { x: 100, y: 200, zoom: 0.5 },
      { x: -50, y: -100, zoom: 2.0 },
      { x: 300, y: 150, zoom: 0.25 },
      { x: -200, y: -100, zoom: 4.0 },
      { x: 50, y: -30, zoom: 1.5 },
    ];

    for (const state of scenarios) {
      camera.setState(state);

      const testPoints = [
        { clientX: 100, clientY: 100 },
        { clientX: 400, clientY: 300 },
        { clientX: 800, clientY: 500 },
        { clientX: 600, clientY: 400 },
        { clientX: 1250, clientY: 830 },
        { clientX: 55, clientY: 35 },
      ];

      for (const pt of testPoints) {
        const coordsResult = screenToDocument(
          pt.clientX,
          pt.clientY,
          canvasRect,
          { panX: state.x, panY: state.y, zoom: state.zoom, rotation: 0 },
        );

        const cameraResult = camera.screenToDocument(
          pt.clientX - canvasRect.left,
          pt.clientY - canvasRect.top,
        );

        expect(coordsResult.x).toBeCloseTo(cameraResult.x, 10);
        expect(coordsResult.y).toBeCloseTo(cameraResult.y, 10);
      }
    }
  });
});
