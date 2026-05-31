import type { ViewportState } from '../engine/types';
import { MIN_ZOOM } from './coords';

export { MIN_ZOOM };
export { screenToDocument } from './coords';
export { documentToScreen } from './coords';

/** Maximum allowed zoom level. */
export const MAX_ZOOM = 100;

/** Default multiplier for zoom-in/zoom-out operations. */
export const ZOOM_FACTOR = 1.25;

/**
 * Clamp a zoom value between min and max bounds.
 * @param zoom - The raw zoom value.
 * @param min - Minimum allowed zoom.
 * @param max - Maximum allowed zoom.
 * @returns The clamped zoom value.
 */
export function clampZoom(zoom: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, zoom));
}

/**
 * Zoom toward a specific point on screen, adjusting pan to keep the point fixed.
 * @param viewport - Current viewport state.
 * @param cursorX - X coordinate of the zoom target in screen space.
 * @param cursorY - Y coordinate of the zoom target in screen space.
 * @param factor - Zoom multiplier (>1 zooms in, <1 zooms out).
 * @param minZoom - Minimum allowed zoom level.
 * @param maxZoom - Maximum allowed zoom level.
 * @returns Updated viewport state.
 */
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

/**
 * Zoom toward the center of the container.
 * @param viewport - Current viewport state.
 * @param containerW - Width of the container element.
 * @param containerH - Height of the container element.
 * @param factor - Zoom multiplier.
 * @param minZoom - Minimum allowed zoom level.
 * @param maxZoom - Maximum allowed zoom level.
 * @returns Updated viewport state.
 */
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

/**
 * Compute zoom and pan to fit a document inside a container.
 *
 * **Note:** Parameter order is `(containerW, containerH, docW, docH, padding)`,
 * which differs from `computeFitZoom` in coords.ts
 * (which uses `(docWidth, docHeight, containerWidth, containerHeight)`).
 * @param containerW - Width of the container.
 * @param containerH - Height of the container.
 * @param docW - Width of the document.
 * @param docH - Height of the document.
 * @param padding - Padding to leave around the document.
 * @returns Zoom and pan values to center the document.
 */
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

  const finalZoom = Math.max(MIN_ZOOM, fitZoom);
  const panX = (containerW - docW * finalZoom) / 2;
  const panY = (containerH - docH * finalZoom) / 2;

  return { zoom: finalZoom, panX, panY };
}

/**
 * Convert a viewport state to a CSS transform string.
 * Includes rotation when non-zero.
 * @param viewport - Current viewport state.
 * @returns CSS transform string for use in style attributes.
 */
export function getViewportTransformCSS(viewport: ViewportState): string {
  const base = `translate3d(${viewport.panX}px, ${viewport.panY}px, 0) scale(${viewport.zoom})`;
  if (viewport.rotation !== 0) {
    return `${base} rotate(${viewport.rotation}deg)`;
  }
  return base;
}
