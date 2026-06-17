# Crop and Resize Review

## Likely Rejections

| ID | Rating | Finding | Evidence | Expected remediation |
| --- | --- | --- | --- | --- |
| FRR-CROP-001 | Reject | Crop behavior is too complex for one UI surface without stronger state isolation | `CropOptionBar.tsx` is 895 lines; `ModernCropOverlay.tsx` is 541; crop logic is spread across viewport, engine, option bar, overlay, and state files. | Define crop state machine/controller with a typed event model. |
| FRR-CROP-002 | Must Fix | Modern Crop has two rendering paths behind a feature flag | `CanvasViewport.tsx` has GPU-camera path and CSS fallback path for Modern Crop. | Either remove fallback or make both paths first-class with parity tests. |
| FRR-CROP-003 | Must Fix | Keyboard and undo behavior overlaps with global handlers | History has prior double-fire Ctrl+Z bug; crop has mini undo stack plus global history. | Centralize command routing for crop mode. |
| FRR-CROP-004 | Must Fix | Preview/apply parity is high risk | Modern visual frame, image transform, engine crop rect, fill, negative expansion, and renderer upload must agree. | Keep WYSIWYG apply tests as release blockers and add visual pixel tests. |
| FRR-CROP-005 | Should Fix | Unit conversion and ratio/size UI are embedded in option bar | Physical units, recents, presets, and frame auto-fit live close to UI controls. | Move domain logic into pure modules and keep UI thin. |
| FRR-CROP-006 | Should Fix | Crop code has many historically fixed geometry regressions | AI_HISTORY shows repeated Modern Crop compensation/resize/position fixes. | Add invariant tests around pivot, anchor, compensation, and viewport center. |

## Merge Bar

- Crop interactions should be modeled as explicit states and events.
- Global keyboard conflicts must be impossible by design, not just guarded ad hoc.
- Preview/apply parity must be verified at zoom, pan, rotation, fill, and expansion cases.

