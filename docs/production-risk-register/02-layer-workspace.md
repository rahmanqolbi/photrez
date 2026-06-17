# Layer and Workspace Risks

Hotspots:

- `apps/desktop/src/engine/document.ts`
- `apps/desktop/src/engine/workspace.ts`
- `apps/desktop/src/components/editor/LayersPanel.tsx`
- `apps/desktop/src/components/editor/LayerItem.tsx`
- `apps/desktop/src/components/editor/layerOperations.ts`
- `apps/desktop/src/components/editor/useLayerActions.ts`
- `apps/desktop/src/components/editor/useLayerDragReorder.ts`
- `apps/desktop/src/components/editor/workspaceSync.ts`

## Potential Production Bugs

| ID | Severity | Potential production symptom | Trigger / root cause | Guard / mitigation |
| --- | --- | --- | --- | --- |
| PBR-LAYER-001 | P0 | Deleting a layer leaves transform overlay pointing to a deleted ID | Delete fallback updates engine active layer but misses selected-layer signal | Engine-signal contract for delete and undo after delete |
| PBR-LAYER-002 | P0 | Layer reorder appears reversed or drops into wrong index | Confusion between top-first UI stack and internal array index | Reorder test with visible top/middle/bottom labels |
| PBR-LAYER-003 | P1 | Duplicate/merge/flatten loses pixels, alpha, transform, lock, or blend state | Deep clone/composite path omits a field | Snapshot comparison tests for every LayerNode field |
| PBR-LAYER-004 | P1 | User can modify locked layer through shortcut or drag even though panel blocks it | Guard only implemented in one entry path | Matrix guard test: button, keyboard, pointer, drag/drop |
| PBR-LAYER-005 | P1 | Hidden layers can still be hit-tested or auto-selected on canvas | Hit-test path ignores visibility or opacity edge cases | `hitTestLayers` tests for hidden/transparent/transformed layers |
| PBR-LAYER-006 | P1 | Memory grows until large document freezes app | Bitmap/layer addition bypasses `MAX_PIXEL_BUDGET` or texture cleanup | Add-layer/import tests near budget limit plus manual memory gate |
| PBR-LAYER-007 | P1 | Active document tab changes but layer panel still mutates previous document | Workspace sync or event handler captures stale engine/history | Multi-doc test: switch tabs, mutate layer, assert only active doc changes |
| PBR-LAYER-008 | P2 | Contextual layer creation inserts at unexpected stack position | "Insert above active" conflicts with top-first order | Unit and UI test for insert position |
| PBR-LAYER-009 | P2 | Row thumbnails do not update after paint/crop/transform | Dirty flags or thumbnail render not invalidated | Thumbnail update test after bitmap mutation |
| PBR-LAYER-010 | P2 | Opacity input accepts invalid values or displays rounded value inconsistently | UI clamp differs from engine clamp | Clamp tests for 0, 1, negative, >1, NaN |
| PBR-LAYER-011 | P2 | Blend mode is stored but preview/export differ | MVP supports Normal only but UI/state imply more | Keep UI contract explicit, add parity test when new modes ship |
| PBR-LAYER-012 | P3 | Rename loses focus/input on rapid tab switch | Local edit state not committed/cancelled on unmount | Rename interaction test with document switch |

## Production Review Checklist

- Top-first layer order is documented in every reorder/hit-test change.
- Locked, hidden, and protected states are enforced in all entry paths.
- Multi-document actions always target an explicit document ID.
- Bitmap-owning operations verify memory budget and texture cleanup.
- Every destructive operation has undo/redo coverage.

