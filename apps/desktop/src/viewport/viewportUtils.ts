import type { ViewportState } from '../engine/types';

export const MIN_ZOOM = 0.01;
export const MAX_ZOOM = 100;
export const ZOOM_FACTOR = 1.25;

export function clampZoom(zoom: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, zoom));
}

export function zoomAtPoint(
  viewport: ViewportState,
  cursorX: number,
  cursorY: number,
  factor: number,
  minZoom: number,
  maxZoom: number
): ViewportState {
  const newZoom = clampZoom(viewport.zoom * factor, minZoom, maxZoom);
  const zoomRatio = newZoom / viewport.zoom;

  return {
    panX: cursorX - (cursorX - viewport.panX) * zoomRatio,
    panY: cursorY - (cursorY - viewport.panY) * zoomRatio,
    zoom: newZoom,
    rotation: viewport.rotation,
  };
}

export function zoomToCenter(
  viewport: ViewportState,
  containerW: number,
  containerH: number,
  factor: number,
  minZoom: number,
  maxZoom: number
): ViewportState {
  const centerX = containerW / 2;
  const centerY = containerH / 2;
  return zoomAtPoint(viewport, centerX, centerY, factor, minZoom, maxZoom);
}

export function calculateFitScreen(
  containerW: number,
  containerH: number,
  docW: number,
  docH: number,
  padding: number
): { zoom: number; panX: number; panY: number } {
  if (docW === 0 || docH === 0) {
    return { zoom: 1.0, panX: 0, panY: 0 };
  }

  const fitZoom = Math.min(
    (containerW - padding) / docW,
    (containerH - padding) / docH,
    1.0
  );

  const finalZoom = Math.max(0.01, fitZoom);
  const panX = (containerW - docW * finalZoom) / 2;
  const panY = (containerH - docH * finalZoom) / 2;

  return { zoom: finalZoom, panX, panY };
}

export function screenToDocument(
  clientX: number,
  clientY: number,
  canvasRect: DOMRect,
  viewport: ViewportState
): { x: number; y: number } {
  const canvasX = clientX - canvasRect.left;
  const canvasY = clientY - canvasRect.top;

  return {
    x: (canvasX - viewport.panX) / viewport.zoom,
    y: (canvasY - viewport.panY) / viewport.zoom,
  };
}

export function documentToScreen(
  docX: number,
  docY: number,
  canvasRect: DOMRect,
  viewport: ViewportState
): { x: number; y: number } {
  return {
    x: docX * viewport.zoom + viewport.panX + canvasRect.left,
    y: docY * viewport.zoom + viewport.panY + canvasRect.top,
  };
}

export function getViewportTransformCSS(viewport: ViewportState): string {
  return `translate3d(${viewport.panX}px, ${viewport.panY}px, 0) scale(${viewport.zoom})`;
}
