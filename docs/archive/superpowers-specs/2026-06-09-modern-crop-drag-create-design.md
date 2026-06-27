# Modern Crop Drag-to-Create — Design Spec

## Overview
Add drag-to-create crop frame in Modern Crop mode. When no frame exists (e.g., after Escape dismiss), dragging on the canvas creates a new crop frame sized proportionally to the drag distance, with aspect ratio determined by the drag direction (Free mode), the option bar setting (Ratio mode), or the target size (Size mode).

## UX Contract

### States
- **No frame** (after Escape/new tool entry): Canvas click → default full-canvas frame. Canvas drag → custom frame.
- **Frame exists**: No change from current behavior (drag moves/resizes/rotates the frame).

### Interaction Flow
1. User presses `pointerdown` on canvas (Modern mode, no frame)
2. System records start position and evaluates crop mode
3. User moves pointer:
   - **< 5px threshold**: No action yet
   - **>= 5px threshold**: Create frame proportional to drag distance
4. User releases:
   - **If never exceeded threshold**: Create default full-canvas frame (click behavior)
   - **If exceeded threshold**: Frame already created — no further action

### Mode-Specific Behavior
| Mode | Drag determines | Frame size |
|---|---|---|
| **Free** | Aspect ratio + size proportional | Proportional to drag |
| **Free + Shift** | Square (1:1), size proportional | Proportional to drag |
| **Ratio** | Size only (aspect from `cropAspect`) | Proportional to drag |
| **Size** | Nothing (use target size directly) | From option bar target (existing) |

### Sizing Formula (Free & Ratio modes)
```
dragW = max(abs(clientX - startX), 1)       // screen px
dragH = max(abs(clientY - startY), 1)
dragAspect = max(dragW, dragH) / min(dragW, dragH)  // always >= 1

// Clamp aspect to reasonable bounds
dragAspect = clamp(dragAspect, 0.1, 10)

// Proportional scale relative to viewport
scale = max(dragW / viewportWidth, dragH / viewportHeight)
frameW = clamp(viewportWidth * scale * 0.6, MIN_CROP_SIZE, maxSize)

if (dragW >= dragH) {
  // Wider than tall → width drives
  frameH = max(frameW / dragAspect, MIN_CROP_SIZE)
} else {
  // Taller than wide → height drives (recalc width)
  frameH = frameW
  frameW = max(frameH * dragAspect, MIN_CROP_SIZE)
}

// For Ratio mode: same as above but aspect from cropAspect instead of dragAspect
// For Shift: aspect = 1 (square)
```
Where:
- `* 0.6` makes a full viewport-width drag produce ~60% viewport frame (not cramped, not maxed out)
- `maxSize` = projected canvas bounds (existing `clampFrameToProjectedBounds`)
- `MIN_CROP_SIZE` = 100px
- In Ratio mode: `dragAspect` replaced by `cropAspect.w / cropAspect.h`

### Shift Modifier
- **Shift during drag (Free mode)**: Square frame (1:1 aspect), regardless of drag direction
- **Shift during drag (Ratio/Size mode)**: No effect — option bar values take precedence

### Edge Cases
| Scenario | Behavior |
|---|---|
| Tool switch mid-drag | Clean up tracking (`interactiveState.dragTool = null`, reset local variable) |
| Cancel/lostcapture mid-drag | Clean up tracking |
| Drag < 5px (screen) | Treat as click → default full-canvas frame |
| Drag = purely horizontal | `dragH = 1` guard prevents divide-by-zero; aspect = `viewportW / 1` clamped to 10:1 |
| Drag = purely vertical | `dragW = 1` guard; aspect = `1 / viewportH` clamped to 1:10 |
| Frame already exists | No effect (existing pointer handlers run) |
| Frame created then pointer leaves canvas | Frame stays visible; further pointermove on canvas = resize as usual |
| `isPendingCropClick` collision | New modern drag uses SEPARATE tracking variable (not `isPendingCropClick`) |
| Extreme aspect ratio | Clamped to 1:10 / 10:1 |

## Implementation

### Files Changed
1. **`useCanvasPointerTools.ts`** — Main logic:
   - Remove immediate default frame creation in `onCanvasPointerDown` for modern mode with no frame
   - Add local tracking variable for drag-to-create state
   - Add pointermove detection to create frame on threshold exceed
   - Add pointerup fallback to create default frame on click
   - Handle shift key for square constrain
2. **`__tests__/CanvasViewport.test.tsx`** — New tests:
   - Drag creates frame with matching aspect ratio
   - Drag below threshold creates default frame (click behavior)
   - Shift+drag creates square frame
   - Cancel mid-drag cleans up
   - Ratio mode: drag ignores aspect, uses option bar value

### No Changes Needed
- `ModernCropOverlay.tsx` — Already re-renders reactively on frame change
- `modernCropGeometry.ts` — `getDefaultModernCropFrame` already accepts optional aspect
- Input handler — Canvas pointer events already flow through `useCanvasPointerTools.ts`

## Risks
- None identified — limited to one file + tests, follows existing drag-to-create pattern from Classic mode

## Test Plan
| Test | Type |
|---|---|
| Drag in Free mode creates frame with matching aspect | Integration |
| Drag below threshold creates default frame on pointerup | Integration |
| Shift+drag creates square (1:1) frame | Integration |
| Cancel/cleanup during drag | Integration |
| Ratio mode drag uses option bar aspect | Integration |
| Size mode drag uses target size | Integration |
| Escape dismiss + drag creates custom frame | E2E |
