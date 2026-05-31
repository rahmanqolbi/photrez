import { describe, it, expect } from 'vitest';
import type { ViewportState } from '../engine/types';
import {
  clampZoom,
  zoomAtPoint,
  zoomToCenter,
  calculateFitScreen,
  screenToDocument,
  documentToScreen,
  getViewportTransformCSS,
  MIN_ZOOM,
  MAX_ZOOM,
} from '../viewport/viewportUtils';

describe('clampZoom', () => {
  it('clamps zoom below minimum to MIN_ZOOM', () => {
    expect(clampZoom(0.001, MIN_ZOOM, MAX_ZOOM)).toBe(MIN_ZOOM);
  });

  it('clamps zoom above maximum to MAX_ZOOM', () => {
    expect(clampZoom(200, MIN_ZOOM, MAX_ZOOM)).toBe(MAX_ZOOM);
  });

  it('returns zoom unchanged when within range', () => {
    expect(clampZoom(1.0, MIN_ZOOM, MAX_ZOOM)).toBe(1.0);
    expect(clampZoom(50, MIN_ZOOM, MAX_ZOOM)).toBe(50);
  });
});

describe('zoomAtPoint', () => {
  const baseViewport: ViewportState = { panX: 0, panY: 0, zoom: 1.0, rotation: 0 };

  it('zooms toward cursor position', () => {
    const result = zoomAtPoint(baseViewport, 100, 100, 2.0, MIN_ZOOM, MAX_ZOOM);
    expect(result.zoom).toBe(2.0);
    expect(result.panX).toBe(-100);
    expect(result.panY).toBe(-100);
  });

  it('clamps to max zoom', () => {
    const result = zoomAtPoint(baseViewport, 100, 100, 200, MIN_ZOOM, MAX_ZOOM);
    expect(result.zoom).toBe(MAX_ZOOM);
  });

  it('clamps to min zoom', () => {
    const result = zoomAtPoint(baseViewport, 100, 100, 0.001, MIN_ZOOM, MAX_ZOOM);
    expect(result.zoom).toBe(MIN_ZOOM);
  });
});

describe('zoomToCenter', () => {
  const baseViewport: ViewportState = { panX: 0, panY: 0, zoom: 1.0, rotation: 0 };

  it('zooms toward container center', () => {
    const result = zoomToCenter(baseViewport, 800, 600, 2.0, MIN_ZOOM, MAX_ZOOM);
    expect(result.zoom).toBe(2.0);
    expect(result.panX).toBe(-400);
    expect(result.panY).toBe(-300);
  });
});

describe('calculateFitScreen', () => {
  it('centers document with padding', () => {
    const result = calculateFitScreen(1200, 800, 800, 600, 80);
    expect(result.zoom).toBeLessThanOrEqual(1.0);
    expect(result.zoom).toBeGreaterThan(0);
    expect(result.panX).toBeGreaterThanOrEqual(0);
    expect(result.panY).toBeGreaterThanOrEqual(0);
  });

  it('does not zoom beyond 100%', () => {
    const result = calculateFitScreen(800, 600, 1600, 1200, 80);
    expect(result.zoom).toBeLessThanOrEqual(1.0);
  });

  it('handles zero-dimension document gracefully', () => {
    const result = calculateFitScreen(800, 600, 0, 0, 80);
    expect(result.zoom).toBe(1.0);
    expect(result.panX).toBe(0);
    expect(result.panY).toBe(0);
  });
});

describe('screenToDocument', () => {
  it('converts screen coords to document coords', () => {
    const canvasRect = new DOMRect(100, 50, 800, 600);
    const viewport: ViewportState = { panX: 50, panY: 30, zoom: 1.5, rotation: 0 };
    const result = screenToDocument(500, 300, canvasRect, viewport);
    expect(result.x).toBe((500 - 100 - 50) / 1.5);
    expect(result.y).toBe((300 - 50 - 30) / 1.5);
  });
});

describe('documentToScreen', () => {
  it('converts document coords to screen coords', () => {
    const canvasRect = new DOMRect(100, 50, 800, 600);
    const viewport: ViewportState = { panX: 50, panY: 30, zoom: 1.5, rotation: 0 };
    const result = documentToScreen(200, 100, canvasRect, viewport);
    expect(result.x).toBe(200 * 1.5 + 50 + 100);
    expect(result.y).toBe(100 * 1.5 + 30 + 50);
  });
});

describe('getViewportTransformCSS', () => {
  it('returns correct CSS string', () => {
    const viewport: ViewportState = { panX: 100, panY: 200, zoom: 2.0, rotation: 0 };
    const result = getViewportTransformCSS(viewport);
    expect(result).toBe('translate3d(100px, 200px, 0) scale(2)');
  });

  it('handles zero values', () => {
    const viewport: ViewportState = { panX: 0, panY: 0, zoom: 1.0, rotation: 0 };
    const result = getViewportTransformCSS(viewport);
    expect(result).toBe('translate3d(0px, 0px, 0) scale(1)');
  });
});
