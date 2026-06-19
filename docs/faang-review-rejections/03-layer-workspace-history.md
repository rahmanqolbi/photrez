# Layer, Workspace, and History Review

## Likely Rejections

| ID | Rating | Finding | Evidence | Expected remediation |
| --- | --- | --- | --- | --- |
| FRR-LAYER-001 | Reject | History correctness depends on each mutation caller remembering to commit | Project rules require `history.commit()` before mutation; many paths are UI/controller-level. | Wrap mutations in command objects or engine transaction APIs that enforce commit ordering. |
| FRR-LAYER-002 | Must Fix | Layer operations span engine, UI panel, drag reorder, keyboard shortcuts, and cross-doc ops | Hotspots include `document.ts`, `LayersPanel.tsx`, `layerOperations.ts`, `useLayerActions.ts`, drag hooks. | Define layer command service with one API for all entry paths. |
| FRR-LAYER-003 | Mitigated | Cross-document operations use ad hoc engine facades | `crossDocLayerOps.ts` now declares a narrow typed facade matching the real `DocumentEngine` API and no longer uses production `any` casts for cross-doc engine calls. | Keep real-engine integration and wiring tests as the regression guard. |
| FRR-LAYER-004 | Mitigated | Copy/move between documents is not atomic | Alt-move now checks that the source document can delete the layer before target copy. If the source only has one layer, the operation aborts with an error toast and target history/layers remain unchanged. | Keep focused mock and real-engine tests for last-layer Alt-move abort behavior. |
| FRR-LAYER-005 | Should Fix | Layer ownership rules are duplicated in UI and engine paths | Lock/visibility/protection behavior can diverge across panel, keyboard, pointer, drag/drop. | Centralize editability checks in engine/service and test all entry paths. |
| FRR-LAYER-006 | Should Fix | Workspace async actions can target stale active document | Open/export/drop paths often read active document state near action time. | Capture target document IDs at action start; add switch-tab-during-async tests. |
| FRR-LAYER-007 | Should Fix | Snapshot-based history may not scale for large documents | Current history is snapshot-based with max 50; brush/crop can be bitmap-heavy. | Add memory profiling or dirty-rect command history plan before large-canvas release. |

## Merge Bar

- Every layer mutation goes through an auditable command/transaction path.
- Cross-doc move/copy has explicit non-atomic semantics and tests.
- No production layer operation uses `any` to call real engine APIs.

## 2026-06-18 Execution Update

- FRR-LAYER-003 mitigated: cross-document layer operations now type `getLayer`, `getLayers`, `addLayer`, transform/property setters, bitmap transfer, document dimensions, and workspace document creation against the same methods exposed by `DocumentEngine` / `WorkspaceManager`.
- Verification: `pnpm.cmd run type-check` PASS; focused cross-doc suite PASS (4 files / 43 tests); full frontend suite PASS (79 files / 1198 tests); `pnpm.cmd run build` PASS with workspace-local temp HOME after sandboxed pnpm home access failed.
- FRR-LAYER-004 mitigated for the current engine failure mode: cross-doc Alt-move aborts before target mutation when the source layer cannot be deleted because it is the source document's last layer.
- Follow-up verification after FRR-LAYER-004: focused cross-doc tests PASS (3 files / 24 tests); full frontend suite PASS (79 files / 1201 tests); `pnpm.cmd run build` PASS with workspace-local temp HOME.
