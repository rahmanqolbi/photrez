import type { ViewportCamera } from "@/viewport/viewportCamera";
import type { RenderScheduler } from "@/renderer/scheduler";

export interface EdgeScrollDeps {
  camera: ViewportCamera;
  setPan: (p: { x: number; y: number }) => void;
  scheduler: RenderScheduler;
  getContainerRect: () => DOMRect | null;
}

// Smoothstep ease-in/out: 0 at the zone boundary, 1 at the exact edge,
// with zero derivative at both ends. Gives a gentle ramp-in (no sudden jump
// to a constant speed when the cursor crosses into the zone) — the feel
// used for edge auto-scroll.
export const smoothstep = (t: number): number => {
  const c = Math.min(1, Math.max(0, t));
  return c * c * (3 - 2 * c);
};

// viewport-relative max speed — `factor` × the axis length per
// second at the very edge. Per-axis so width/height cross in the same time,
// and it stays comfortable on any screen size (no sluggish 4K, no twitchy
// laptop). 0.7× is calm enough for a precision image editor (a 1×
// feel would overshoot); tune freely.
export const EDGE_SCROLL_SPEED_FACTOR = 0.45;

/**
 * Pans the camera when the cursor is within `edgeZonePx` of a viewport edge.
 *
 * `dt` is the frame delta in seconds — pass 0 for a detection-only call
 * (no actual scroll, but the cursor position is still evaluated). The camera
 * pans by a distance proportional to edge proximity so the scroll eases in
 * from the zone boundary and reaches `factor × axis length` per second at
 * the exact edge (`EDGE_SCROLL_SPEED_FACTOR`). Speed is screen-space, so the
 * visual rate is constant regardless of zoom.
 *
 * Returns `{ scrolled: true }` while the cursor is inside the edge zone
 * (scrolling is active) and `{ scrolled: false }` otherwise.
 *
 * On a real scroll it pans the camera, syncs the reactive `pan()` signal, and
 * repaints the WebGL canvas *synchronously* via `scheduler.renderNow()`. This
 * keeps the WebGL content on the same frame as the CSS-transformed overlays
 * (artboard border, brush preview, selection marquee) — a deferred
 * `requestRender()` would paint the overlays one frame ahead of the WebGL
 * content and leave a flickering 1px seam at the canvas edge during scroll.
 */
export function computeEdgeScroll(
  clientX: number,
  clientY: number,
  dt: number,
  deps: EdgeScrollDeps,
  edgeZonePx = 40,
): { scrolled: boolean } {
  const rect = deps.getContainerRect();
  if (!rect) return { scrolled: false };
  const cx = clientX - rect.left;
  const cy = clientY - rect.top;
  const midX = rect.width / 2;
  const midY = rect.height / 2;
  const dirX = cx < midX ? 1 : -1;
  const dirY = cy < midY ? 1 : -1;
  const distX = cx < midX ? cx : rect.width - cx;
  const distY = cy < midY ? cy : rect.height - cy;
  if (distX >= edgeZonePx && distY >= edgeZonePx) {
    return { scrolled: false };
  }
  const tX = smoothstep((edgeZonePx - distX) / edgeZonePx);
  const tY = smoothstep((edgeZonePx - distY) / edgeZonePx);
  // per-axis viewport-relative max speed (factor × axis length/sec)
  const maxX = rect.width * EDGE_SCROLL_SPEED_FACTOR;
  const maxY = rect.height * EDGE_SCROLL_SPEED_FACTOR;
  const sX = dirX * tX * maxX * dt;
  const sY = dirY * tY * maxY * dt;
  // Only mutate + repaint when there is actual movement. The dt=0 detection
  // call (and any zero-crossing edge case) just reports the zone without
  // touching state or firing a render.
  if (sX !== 0 || sY !== 0) {
    deps.camera.pan(sX, sY);
    const ms = deps.camera.getState();
    deps.setPan({ x: ms.x, y: ms.y });
    // synchronous render keeps WebGL aligned with the reactive
    // overlay in the same frame (no 1-frame seam at the edge).
    deps.scheduler.renderNow();
  }
  return { scrolled: true };
}
