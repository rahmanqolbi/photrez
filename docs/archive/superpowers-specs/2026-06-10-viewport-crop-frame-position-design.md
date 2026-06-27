# Viewport-Aware Crop Frame Position (Modern Mode)

## Problem

In Modern crop mode, the crop frame is always centered in the viewport. When the user pans, scrolls, or zooms, only the image moves — the frame stays pinned to viewport center. This feels disconnected: the user expects the frame to be part of the viewport scene, moving together with everything else during viewport actions.

## Design

### Change

Add `{x, y}` (screen-space position) to `ModernCropFrame`. Viewport actions modify these coordinates so the frame follows the viewport. Crop interactions (resize, move, rotate) are **unaffected** — they continue operating relative to the frame center.

### Interface

```ts
interface ModernCropFrame {
  x: number;  // screen-space top-left X (default: centered)
  y: number;  // screen-space top-left Y
  w: number;
  h: number;
}
```

### Behavior by Action

| Action | Effect on frame |
|---|---|
| Scroll wheel (pan) | `frame.x += dx, frame.y += dy` |
| Shift+scroll (horizontal pan) | `frame.x += dx` |
| Space+drag (pan) | `frame.x += dx, frame.y += dy` |
| Ctrl+scroll (zoom) | Scale `frame.x, frame.y` around zoom anchor |
| Fit to screen / Reset | Restore `frame.x, frame.y` to centered position |
| Cancel (Escape) | Restore centered position |
| Drag-create new frame | Start at centered position |
| Resize, Move, Rotate | Unchanged — operate relative to frame center |

### Files Changed

| File | Change |
|---|---|
| `modernCropGeometry.ts` | `ModernCropFrame` gains `x, y`. `getModernCropFrameScreenRect` uses stored coords (fallback to centered). `getDefaultModernCropFrame` returns centered coords. All resize functions unchanged |
| `modernCropState.ts` | State stores `x, y`. `resetModernCrop` clears to null. Undo/redo restores position |
| `CanvasViewport.tsx` | Pass `modernCropFrame().x/y` to overlay. Viewport action handlers update frame position |
| `useCanvasPointerTools.ts` | Pan handler (Space+drag) shifts frame position. `commitDragCreateFrame` sets centered pos |
| `useCanvasKeyboard.ts` | Fit-to-screen / zoom shortcuts update frame position |
| `ModernCropOverlay.tsx` | Uses `screenRect()` as-is (already derived from geometry) |
| Tests | Update `ModernCropFrame` constructors to include `x, y`. Update snapshots |

### Non-Goals

- Zoom does not change frame screen size (frame.w/h stay in screen pixels, only image scales)
- Scroll wheel in crop mode becomes pan (not zoom). Zoom via Ctrl+scroll unchanged
- No change to Classic mode
- No change to resize/move/rotate UX
