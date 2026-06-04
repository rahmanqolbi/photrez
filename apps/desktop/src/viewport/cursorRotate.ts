/**
 * cursorRotate.ts
 * Dynamic rotate cursor — ported from aplikasi-cetak-massal/utils/cursorRotate.ts
 * SVG data-URI cursor that rotates to follow the mouse angle relative to layer center.
 */

const CURSOR_SIZE = 24;
const HOTSPOT_X = 1;
const HOTSPOT_Y = 7;

const CURSOR_PATH =
  'M 1 7 L 10 1 L 10 5 A 16 16 0 0 1 26 21 L 30 21 L 24 30 L 18 21 L 22 21 A 12 12 0 0 0 10 9 L 10 13 Z';

function buildCursor(rotateDeg: number): string {
  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg"` +
    ` width="${CURSOR_SIZE}" height="${CURSOR_SIZE}"` +
    ` viewBox="0 0 32 32">` +
    `<g transform="rotate(${rotateDeg} 16 16)">` +
    `<path d="${CURSOR_PATH}"` +
    ` fill="white" stroke="black"` +
    ` stroke-width="1.2" stroke-linejoin="round"/>` +
    `</g></svg>`;

  return `url("data:image/svg+xml,${encodeURIComponent(svg)}") ${HOTSPOT_X} ${HOTSPOT_Y}, crosshair`;
}

const _cache = new Map<number, string>();

/**
 * Get cursor with 1-degree resolution. Cached (max 360 entries).
 */
function getCursorByAngle(angleDeg: number): string {
  const snapped = Math.round(((angleDeg % 360) + 360) % 360) % 360;
  if (!_cache.has(snapped)) _cache.set(snapped, buildCursor(snapped));
  return _cache.get(snapped)!;
}

/**
 * Dynamic rotate cursor based on mouse position relative to layer bounding box center.
 * Used when hovering the rotate zone — cursor direction follows the mouse angle.
 */
export function getRotateCursorByPos(
  pos: { x: number; y: number },
  rect: { x: number; y: number; w: number; h: number }
): string {
  const cx = rect.x + rect.w / 2;
  const cy = rect.y + rect.h / 2;
  const rad = Math.atan2(pos.y - cy, pos.x - cx);
  const angleDeg = (rad * 180) / Math.PI;
  // +45 because the cursor path is 45° tilted by default
  return getCursorByAngle(angleDeg + 45);
}

/**
 * Static rotate cursor for a specific corner handle, accounting for layer rotation.
 */
export function getRotateCursorForHandle(
  corner: string,
  activeRotation: number = 0,
  sx: number = 1,
  sy: number = 1
): string {
  const CORNER_BASE: Record<string, number> = { nw: 270, ne: 0, se: 90, sw: 180 };
  const visualRotation = sx * sy < 0 ? -activeRotation : activeRotation;
  const baseAngle = CORNER_BASE[corner] ?? 0;
  return getCursorByAngle(baseAngle + visualRotation);
}
