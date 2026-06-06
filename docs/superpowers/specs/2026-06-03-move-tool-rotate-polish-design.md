# Move Tool Rotate Layer Polish — Design Spec

## Overview

Polish rotate layer interaction di Move Tool agar terasa lebih presisi dan mengikuti referensi internal `aplikasi-cetak-massal`. Saat ini rotate zone sudah ada tapi UX-nya lemah: cursor masih `crosshair` generic, hit area kurang nyaman, dan feedback kurang jelas.

## Problem

1. Cursor rotate masih `crosshair` — tidak informatif arah rotasi.
2. Hit zone rotate (ring transparan di corner) terlalu kecil dan tidak terasa.
3. Tidak ada visual feedback arah rotasi saat hover/drag.
4. Referensi `aplikasi-cetak-massal` punya cursor dinamis yang lebih baik.

## Design Decisions

### 1. Dynamic Rotate Cursor

- Ganti cursor `crosshair` saat hover `rotate` dengan dynamic SVG data-URI cursor.
- Cursor mengikuti posisi mouse terhadap center layer (angle-based).
- Pola cursor dari referensi `aplikasi-cetak-massal/src/renderer/src/components/studio/utils/cursorRotate.ts`: SVG path yang di-rotate sesuai angle, cached per derajat (max 360 entries).
- Port ke `apps/desktop/src/viewport/cursorRotate.ts`.
- Fungsi: `getRotateCursorByPos(pos, rect)` → cursor string berdasarkan angle center-to-mouse.
- Fungsi: `getRotateCursorForHandle(corner, rotation, sx, sy)` → cursor statis berdasarkan corner + rotation aktif.
- Hotspot di titik kursor yang sesuai.

### 2. Cursor Resolver Integration

- `apps/desktop/src/viewport/cursorResolver.ts`: ganti branch `rotate` dari `return "crosshair"` ke dynamic rotate cursor.
- Input tambahan: `hoverPos?: {x:number; y:number}` dan `layerBoundingBox?: {x:number; y:number; w:number; h:number}`.
- Saat `hoverHandle === "rotate"` dan `hoverPos` + `layerBoundingBox` ada → panggil `getRotateCursorByPos(hoverPos, layerBoundingBox)`.
- Jika tidak ada `hoverPos`, fallback ke static `getRotateCursorForHandle`.

### 3. Hit Zone Sizing

- Pertahankan model ring transparan saat ini di `SelectionTransformOverlay.tsx`.
- Hit zone sudah 24/zoom (`ROTATE_OUTER`), cukup nyaman.
- Tidak perlu perubahan ukuran — fokus ke cursor.

### 4. HUD Angle Feedback

- Sudah ada di `TransformHud.tsx` mode `rotate`.
- Tidak perlu perubahan.

### 5. Shift Snap 15°

- Sudah ada di `applyRotationDrag`.
- Tidak perlu perubahan.

### 6. Locked Layer Guard

- Sudah ada di `getLayer()` → `if (!layer.visible || layer.locked) return null`.
- Tidak perlu perubahan.

## Files Changed

| File | Change |
|------|--------|
| `apps/desktop/src/viewport/cursorRotate.ts` | NEW — dynamic rotate cursor utilities, ported from `aplikasi-cetak-massal` |
| `apps/desktop/src/viewport/cursorResolver.ts` | MODIFY — import `getRotateCursorByPos`, add `hoverPos`/`layerBoundingBox` to context, return dynamic cursor for rotate |
| `apps/desktop/src/components/editor/SelectionTransformOverlay.tsx` | MODIFY — pass `hoverPos` and `layerBoundingBox` via props or EditorContext |
| `apps/desktop/src/components/editor/CanvasViewport.tsx` | MODIFY — pass `hoverPos` and `layerBoundingBox` to cursor context |
| `apps/desktop/src/__tests__/cursor-rotate.test.ts` | NEW — test dynamic cursor functions |

## Out of Scope

- Rotate canvas/view tool
- Pivot point draggable
- Skew/perspective
- Dedicated rotate handle (knob)
- Angle input improvements beyond existing

## References

- `aplikasi-cetak-massal/src/renderer/src/components/studio/utils/cursorRotate.ts` — cursor rotate utilities
- `aplikasi-cetak-massal/src/renderer/src/components/studio/components/canvas/EditorCanvas.tsx` — cursor integration pattern
- External reference: transform object rotation interaction
