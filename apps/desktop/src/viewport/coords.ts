import type { ViewportState } from "../engine/types";

export const MIN_ZOOM = 0.01;

/**
 * Convert screen coordinates (client bounds relative to canvas rect)
 * to relative document coordinate space.
 */
export function screenToDocument(
  clientX: number,
  clientY: number,
  canvasRect: DOMRect,
  viewport: ViewportState
): { x: number; y: number } {
  const canvasX = clientX - canvasRect.left;
  const canvasY = clientY - canvasRect.top;

  const docX = (canvasX - viewport.panX) / viewport.zoom;
  const docY = (canvasY - viewport.panY) / viewport.zoom;

  return { x: docX, y: docY };
}

/**
 * Convert relative document coordinates back to viewport screen coordinate space.
 */
export function documentToScreen(
  docX: number,
  docY: number,
  canvasRect: DOMRect,
  viewport: ViewportState
): { x: number; y: number } {
  const screenX = docX * viewport.zoom + viewport.panX + canvasRect.left;
  const screenY = docY * viewport.zoom + viewport.panY + canvasRect.top;

  return { x: screenX, y: screenY };
}

/**
 * Compute zoom and translation required to fit document inside client size.
 */
export function computeFitZoom(
  docWidth: number,
  docHeight: number,
  containerWidth: number,
  containerHeight: number,
  padding: number = 80
): { zoom: number; panX: number; panY: number } {
  if (docWidth === 0 || docHeight === 0) {
    return { zoom: 1.0, panX: 0, panY: 0 };
  }

  const fitZoom = Math.min(
    (containerWidth - padding) / docWidth,
    (containerHeight - padding) / docHeight,
    1.0 // Don't scale beyond 100%
  );

  const finalZoom = Math.max(MIN_ZOOM, fitZoom);
  const panX = (containerWidth - docWidth * finalZoom) / 2;
  const panY = (containerHeight - docHeight * finalZoom) / 2;

  return { zoom: finalZoom, panX, panY };
}
