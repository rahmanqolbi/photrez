# Crop and Resize Risks

Hotspots:

- `apps/desktop/src/components/editor/CropOverlay.tsx`
- `apps/desktop/src/components/editor/ModernCropOverlay.tsx`
- `apps/desktop/src/components/editor/CropOptionBar.tsx`
- `apps/desktop/src/components/editor/cropToolActions.ts`
- `apps/desktop/src/components/editor/cropState.ts`
- `apps/desktop/src/components/editor/modernCropState.ts`
- `apps/desktop/src/viewport/cropGeometry.ts`
- `apps/desktop/src/viewport/modernCropGeometry.ts`
- `apps/desktop/src/engine/cropApply.ts`
- `apps/desktop/src/components/editor/ResizeCanvasModal.tsx`

## Potential Production Bugs

| ID | Severity | Potential production symptom | Trigger / root cause | Guard / mitigation |
| --- | --- | --- | --- | --- |
| PBR-CROP-001 | P0 | Applied crop output does not match preview | Modern visual frame conversion to engine crop rect diverges | WYSIWYG crop apply tests for rotation, pan, zoom, and expansion |
| PBR-CROP-002 | P0 | Cropping with negative x/y corrupts output or loses fill | Canvas expansion path mishandles negative crop rects | Engine crop tests for negative offsets with transparent and fill BG |
| PBR-CROP-003 | P1 | Crop frame drifts after scroll, Space+drag pan, or fit-to-screen | Frame position stored in viewport space but update path misses viewport mutation | Viewport-aware frame tests across scroll/pan/fit |
| PBR-CROP-004 | P1 | Modern and Classic crop use different Shift/Alt behavior | Modifier semantics duplicated across geometry modules | Modifier parity test for Classic and Modern |
| PBR-CROP-005 | P1 | Arrow-key crop nudge commits too many undo entries | Key repeat guard missing for crop mini undo/global history | Nudge repeat test with crop undo stack |
| PBR-CROP-006 | P1 | Crop undo fires twice | Multiple global keydown listeners process Ctrl+Z | `defaultPrevented` guard test for AppTitleBar and canvas keyboard |
| PBR-CROP-007 | P1 | Crop apply leaves WebGL texture stale or clipped to old canvas | Engine dimensions change without renderer resize/upload | Post-crop render state and texture upload regression |
| PBR-CROP-008 | P1 | Resize canvas modal creates invalid or huge canvas | UI validation differs from engine bounds/memory limits | Modal validation tests plus memory budget gate |
| PBR-CROP-009 | P2 | Ratio/Size reset jumps frame to top-left | Auto-fit helper forgets current viewport center | Centering regression test for reset/free/swap |
| PBR-CROP-010 | P2 | Physical unit conversion gives unexpected dimensions | px/cm/mm/in conversion assumes wrong PPI or rounds inconsistently | Unit conversion tests for all units at 96 PPI |
| PBR-CROP-011 | P2 | Delete Cropped Pixels toggle behaves opposite of label | Apply path and UI label drift between destructive/non-destructive modes | Toggle contract test with pixel and layer transform assertions |
| PBR-CROP-012 | P2 | Fill background preview differs from baked output | Preview overlay and engine fill use different color/alpha parsing | Fill preview vs output pixel test |
| PBR-CROP-013 | P2 | Double-click apply triggers while user intended drag/create | Event order conflict between click, double-click, and pointer drag threshold | Interaction test around threshold and double-click |
| PBR-CROP-014 | P3 | Crop mode indicator/status stale after cancel or tool switch | Local crop state not reset from central state | Tool switch and cancel state tests |

## Production Review Checklist

- Verify Modern and Classic modes separately.
- Verify crop apply at zoom not equal to 1 and after pan.
- Verify negative crop rect expansion.
- Verify renderer resize/texture upload after crop.
- Verify crop undo stack and global undo do not both consume the same key event.

