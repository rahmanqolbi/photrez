# Layer, Workspace, and History Review

## Likely Rejections

| ID | Rating | Finding | Evidence | Expected remediation |
| --- | --- | --- | --- | --- |
| FRR-LAYER-001 | Reject | History correctness depends on each mutation caller remembering to commit | Project rules require `history.commit()` before mutation; many paths are UI/controller-level. | Wrap mutations in command objects or engine transaction APIs that enforce commit ordering. |
| FRR-LAYER-002 | Must Fix | Layer operations span engine, UI panel, drag reorder, keyboard shortcuts, and cross-doc ops | Hotspots include `document.ts`, `LayersPanel.tsx`, `layerOperations.ts`, `useLayerActions.ts`, drag hooks. | Define layer command service with one API for all entry paths. |
| FRR-LAYER-003 | Must Fix | Cross-document operations use ad hoc engine facades | `crossDocLayerOps.ts` declares `EngineFacade` with `any` methods and casts real engines to `any`. | Replace facade with typed adapter or narrow interface matching real `DocumentEngine`. |
| FRR-LAYER-004 | Must Fix | Copy/move between documents is not atomic | History is per-doc by design, but reviewers would ask for explicit failure semantics when target succeeds and source delete fails. | Document transaction model and add compensating behavior or explicit non-atomic tests. |
| FRR-LAYER-005 | Should Fix | Layer ownership rules are duplicated in UI and engine paths | Lock/visibility/protection behavior can diverge across panel, keyboard, pointer, drag/drop. | Centralize editability checks in engine/service and test all entry paths. |
| FRR-LAYER-006 | Should Fix | Workspace async actions can target stale active document | Open/export/drop paths often read active document state near action time. | Capture target document IDs at action start; add switch-tab-during-async tests. |
| FRR-LAYER-007 | Should Fix | Snapshot-based history may not scale for large documents | Current history is snapshot-based with max 50; brush/crop can be bitmap-heavy. | Add memory profiling or dirty-rect command history plan before large-canvas release. |

## Merge Bar

- Every layer mutation goes through an auditable command/transaction path.
- Cross-doc move/copy has explicit non-atomic semantics and tests.
- No production layer operation uses `any` to call real engine APIs.

