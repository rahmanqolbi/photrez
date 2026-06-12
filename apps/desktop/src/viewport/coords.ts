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

