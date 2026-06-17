# Selection, Move, and Transform Review

## Likely Rejections

| ID | Rating | Finding | Evidence | Expected remediation |
| --- | --- | --- | --- | --- |
| FRR-MOVE-001 | Reject | Move/transform behavior has two major runtime paths | `CONVENTIONS.md` documents canvas path vs overlay path; history shows regressions when they diverged. | Extract shared command/state machine used by both paths. |
| FRR-MOVE-002 | Must Fix | `CanvasViewport.tsx` owns too much of Move/Selection orchestration | The component is 1142 lines and imports hit testing, snap, drag/drop, crop, brush, renderer, overlays. | Split Move/Selection/Drop/Crop orchestration into separate controllers. |
| FRR-MOVE-003 | Must Fix | Cursor and pointer capture behavior has high regression history | Multiple history entries fixed cursor override, pasteboard deselect, pointer capture, stale overlays. | Keep browser geometry E2E as required; add pointer capture helper abstraction. |
| FRR-MOVE-004 | Must Fix | Tests for lower-level input handlers use many `as any` mocks | `input-handler-move.test.ts` and `input-handler-selection.test.ts` have the highest `as any` counts. | Replace with typed fake engine/history builders. |
| FRR-MOVE-005 | Should Fix | Snapping, HUD, and transform session cleanup are separate transient states | Docs state cleaning one does not clean the others. | Use a single drag/session state object per interaction. |
| FRR-MOVE-006 | Should Fix | Active layer, selected layer, and transform session target are related but separate | Past bug history includes active/selected desync. | Encode relationships in one selection model or add invariant checks in dev. |

## Merge Bar

- Pointer interactions should have one source of truth per gesture.
- Tests must include both overlay and canvas path.
- No `as any` in core tool unit tests for engine/history contracts.

