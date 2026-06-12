# Design Document: Brush & Eraser UX Improvements

This document outlines the design for introducing professional image editor UX behaviors to the Brush and Eraser tools in Photrez, specifically supporting the Alt-Hold Eyedropper, Shift-Click Straight Lines, and Shift-Drag Axis Locking.

## Problem Statement
Currently, Photrez lacks key interactive modifiers for its painting tools that exist in industry-standard software (Photoshop, Affinity Photo):
1. Drawing straight lines (Shift + Click) to connect paint dab endpoints is unsupported.
2. Constraining brush/eraser strokes to horizontal/vertical axes (Shift + Drag) is unsupported.
3. Quickly sampling colors from the canvas (Alt-Hold) requires switching tools manually (`I` -> click -> `B`), which disrupts the painting workflow.

## Proposed Changes

### 1. Alt-Hold Eyedropper
When the Alt key is held down and the active tool is Brush or Eraser, we intercept pointer inputs to act as the Eyedropper.
* **State & Keyboard Trigger**: Re-use `isAltPressed` tracked by [useCanvasKeyboard.ts](file:///d:/Project/image-studio/apps/desktop/src/components/editor/useCanvasKeyboard.ts).
* **Pointer Interception**: In `onCanvasPointerDown` and `onCanvasPointerMove` inside [useCanvasPointerTools.ts](file:///d:/Project/image-studio/apps/desktop/src/components/editor/useCanvasPointerTools.ts):
  * If `isAltPressed()` is true and the tool is `brush` or `eraser`:
    * Retrieve document-space coordinates of the pointer.
    * Call `engine.samplePixel(x, y)` to get the RGBA color buffer.
    * Convert the RGBA buffer to a hex string.
    * Call `setFgColor(hex)` to update the foreground color.
    * Prevent starting or continuing a paint stroke (early return).
* **Cursor Styling**: Modify [cursorResolver.ts](file:///d:/Project/image-studio/apps/desktop/src/viewport/cursorResolver.ts) to return the `"copy"` (eyedropper symbol) cursor when Alt is pressed and Brush/Eraser is active.
* **Cursor Overlay**: In [BrushCursorOverlay.tsx](file:///d:/Project/image-studio/apps/desktop/src/components/editor/BrushCursorOverlay.tsx), hide the circular brush outline when `isAltPressed` is true.

### 2. Shift-Click Straight Lines
Connect the last painted point with the new click point with a straight line when holding Shift.
* **Persistent Last Painted Coordinates**: Store `lastPaintCoords: { x: number, y: number } | null` in the editor state.
  * Update `lastPaintCoords` whenever a paint stroke is committed (at the end of `commitBrushStroke` in [useBrushOverlay.ts](file:///d:/Project/image-studio/apps/desktop/src/components/editor/useBrushOverlay.ts)) or when single clicks stamp paint.
  * Clear `lastPaintCoords` to `null` if the active tool changes.
* **Shift + Pointer Down Connection**:
  * In `onCanvasPointerDown`: if `e.shiftKey` is true and `lastPaintCoords` is set:
    * Interpolate points in a straight line from `lastPaintCoords` to the clicked point.
    * Populate `interactiveState.strokePoints` with the interpolated points so the paint session starts with the completed line.
    * Set `dragStart` to the current clicked point.
  * If Shift is not held, start the stroke at the clicked point as usual and update `lastPaintCoords`.

### 3. Shift-Drag Axis Locking
Constrain brush drag directions to horizontal or vertical axes when Shift is held.
* **Lock State**: Introduce `axisLock: "horizontal" | "vertical" | null` inside the active drag context.
* **Constraint Logic**: In `onCanvasPointerMove`:
  * If `e.shiftKey` is true:
    * If `axisLock` is `null` and the pointer has moved > 5px from `dragStart`:
      * If `Math.abs(dx) > Math.abs(dy)` -> `axisLock = "horizontal"`.
      * If `Math.abs(dy) > Math.abs(dx)` -> `axisLock = "vertical"`.
    * Apply constraint:
      * If `axisLock === "horizontal"`, override the point's Y coordinate: `y = dragStart.y`.
      * If `axisLock === "vertical"`, override the point's X coordinate: `x = dragStart.x`.
  * If `e.shiftKey` is false, clear `axisLock` to `null` to allow free-form drawing again.

## Verification Plan

### Automated Tests
* Unit test coverage in `brushToolState.test.ts` or a new `brushUx.test.ts` to assert:
  * Eyedropper sampling behavior under `isAltPressed = true` for Brush/Eraser tool down/move events.
  * Straight line point generation on Shift-Click.
  * X/Y coordinate locking on Shift-Drag.

### Manual Verification
* Run `pnpm tauri dev`, select Brush, click once, hold Shift, click elsewhere, and verify a clean straight line connects them.
* Hold Shift and drag to verify horizontal/vertical constraint.
* Hold Alt to verify color picker cursor appears, and clicking samples colors to the Foreground swatch.
