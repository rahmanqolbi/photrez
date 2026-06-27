# Selection, Move, and Transform Risks

Hotspots:

- `apps/desktop/src/components/editor/CanvasViewport.tsx`
- `apps/desktop/src/components/editor/SelectionTransformOverlay.tsx`
- `apps/desktop/src/components/editor/useSelectionTransformDrag.ts`
- `apps/desktop/src/components/editor/useCanvasPointerTools.ts`
- `apps/desktop/src/viewport/input-handler.ts`
- `apps/desktop/src/viewport/transformGeometry.ts`
- `apps/desktop/src/viewport/layerHitTest.ts`
- `apps/desktop/src/viewport/smartGuides.ts`
- `apps/desktop/src/components/editor/MoveOptionBar.tsx`
- `apps/desktop/src/components/editor/SelectionOptionBar.tsx`
- `apps/desktop/src/components/editor/TransformOptionBar.tsx`

## Potential Production Bugs

| ID | Severity | Potential production symptom | Trigger / root cause | Guard / mitigation |
| --- | --- | --- | --- | --- |
| PBR-MOVE-001 | P0 | Move tool works through overlay but not direct canvas click, or vice versa | Two drag paths diverge: overlay path vs canvas input handler path | Tests for both overlay and canvas path |
| PBR-MOVE-002 | P0 | Transform box separates from rendered layer after zoom, pan, fit, or HiDPI | Overlay reads stale viewport state or wrong coordinate source | Browser geometry test across fit, keyboard zoom, Space+drag pan |
| PBR-MOVE-003 | P0 | User moves/resizes wrong layer after selection changes mid-drag | Drag state does not store original `layerId` or ignores layer changes | Mid-drag selection-change cancellation test |
| PBR-MOVE-004 | P1 | Pasteboard click does not deselect layer on WebGL canvas or SVG overlay | Target classification misses full-viewport canvas or overlay root | Pasteboard policy tests for canvas, overlay, and container |
| PBR-MOVE-005 | P1 | Auto-select fails when no transform overlay is rendered | Handler requires `[data-overlay-svg]` even when no layer is selected | Auto-select test with no selected layer |
| PBR-MOVE-006 | P1 | Cursor drops to default/move during active resize/rotate drag | Child hit-zone cursor overrides active drag cursor | Regression test on inner hit zones during pointer capture |
| PBR-MOVE-007 | P1 | Snap lines or HUD remain after pointerup/tool switch | Snap/HUD/drag states cleaned independently and one path misses cleanup | Pointerup, pointercancel, tool-switch cleanup tests |
| PBR-MOVE-008 | P1 | Alt disables snap in one move path but center-resizes in another unexpectedly | Alt semantics are context-dependent and handled per path | Modifier matrix tests for move, resize, brush, eyedropper |
| PBR-MOVE-009 | P1 | Keyboard nudge creates too many undo steps or none | Repeat keydown handling misses `!e.repeat` commit guard | Nudge repeat test: one history entry per burst |
| PBR-MOVE-010 | P1 | Flipped/rotated layer hit-test selects wrong layer | Geometry uses AABB or non-visual transform inconsistently | Hit-test tests for rotated/flipped/overlapping layers |
| PBR-MOVE-011 | P2 | Smart guide priority feels wrong near canvas center/edge | Priority rules not consistently applied between axes | Snap priority tests for canvas edge/center/layer lines |
| PBR-MOVE-012 | P2 | Selection cut/copy/paste/delete modifies locked or hidden target | Selection operations skip layer editability guard | Selection operation tests with locked/hidden/protected layer |
| PBR-MOVE-013 | P2 | In-memory clipboard paste creates layer with wrong bounds/offset | Selection bounds converted incorrectly after transform/zoom | Copy/paste pixel and transform tests |
| PBR-MOVE-014 | P3 | Rotation readout or cursor angle disagrees with actual transform | Rotation normalization differs across HUD, cursor, engine | Shared rotation normalization test |

## Production Review Checklist

- Test both canvas and overlay pointer paths.
- Verify Move after fit, zoom, pan, and HiDPI.
- Verify selected layer, active layer, and transform session target are the same during drag.
- Verify cursor styles on root and child hit zones.
- Verify undo/redo after drag, resize, rotate, flip, nudge, cut, paste, and delete.

