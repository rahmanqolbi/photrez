# Drag and Drop Risks

Hotspots:

- `apps/desktop/src/components/editor/DragController.tsx`
- `apps/desktop/src/components/editor/useTauriDragDrop.ts`
- `apps/desktop/src/components/editor/crossDocLayerOps.ts`
- `apps/desktop/src/components/editor/crossDocDropDispatch.ts`
- `apps/desktop/src/components/editor/dragTypes.ts`
- `apps/desktop/src/components/editor/DocumentTabsBar.tsx`
- `apps/desktop/src/components/editor/CanvasViewport.tsx`
- `apps/desktop/src/components/editor/LayersPanel.tsx`
- `apps/desktop/src/components/editor/LayerItem.tsx`
- `apps/desktop/src/components/editor/GlobalDragDropHost.tsx`
- `apps/desktop/src/components/editor/__tests__/crossDocDragDropWiring.test.tsx`

## Potential Production Bugs

| ID | Severity | Potential production symptom | Trigger / root cause | Guard / mitigation |
| --- | --- | --- | --- | --- |
| PBR-DND-001 | P0 | OS file drop works only on empty workspace, then no-ops after document opens | Tauri listener mounted inside a component that unmounts | Wiring test with global host mounted and active document present |
| PBR-DND-002 | P0 | Cross-doc layer drag starts but drop does nothing | HTML5 producer does not set drag controller/MIME payload or consumer validates wrong shape | Wiring test from `LayerItem.onDragStart` through drop zone |
| PBR-DND-003 | P1 | Alt move duplicates instead of moves, or deletes source unexpectedly | Copy/move modifier read at wrong event or source/target doc history not coordinated | Copy vs Alt-move tests across docs |
| PBR-DND-004 | P1 | Same-document drag creates duplicate layer unexpectedly | Same-doc cross-doc path fails to no-op or conflicts with reorder path | Same-doc guard test plus reorder coexistence test |
| PBR-DND-005 | P1 | Dropped file lands in wrong document after hover-to-switch | Hover timer switches active tab but drop target resolves stale document ID | Timer test with target doc captured and switched |
| PBR-DND-006 | P1 | Hover-to-switch continues after drag leaves tab | Timer cleanup missed on leave/drop/cancel | Timer cleanup tests with fake timers |
| PBR-DND-007 | P1 | File dropped on canvas appears at center or offscreen instead of cursor | Screen-to-document conversion or drop zone classification wrong | Canvas drop coordinate test at zoom/pan |
| PBR-DND-008 | P1 | File dropped on tab-empty/outside becomes layer instead of new document | Drop zone priority/order mismatch | Drop dispatch tests for tab, canvas, layers panel, empty, outside |
| PBR-DND-009 | P1 | Multi-file drop partially succeeds with no useful feedback | One bad file aborts entire batch or toast hides failure details | Partial success/failure test and toast assertion |
| PBR-DND-010 | P1 | Non-image or huge file crashes import/drop path | `fileToBitmap`/open path does not fail closed | Negative file tests and user-facing toast |
| PBR-DND-011 | P2 | Multi-file cascade order differs from OS selection order | Path array order or async bitmap decode reorders results | Preserve-order test with delayed decode |
| PBR-DND-012 | P2 | Drop indicators remain visible after failed drop | Drag state cleanup not called on every exit path | Cleanup test after drop error and cancel |
| PBR-DND-013 | P2 | Locked layer is draggable even though it should not be | `draggable={!locked}` missing or bypassed | LayerItem draggable tests for locked/unlocked |
| PBR-DND-014 | P3 | Drag between separate Photrez windows silently fails | MVP does not support cross-window drag | Document limitation in UI or show toast when detectable |

## Production Review Checklist

- Tauri file drop listener must be mounted in a global always-live host.
- HTML5 layer drag must coexist with pointer-based layer reorder.
- Drop target resolution must be explicit and testable.
- Timers must be cleaned on leave/drop/cancel.
- Partial failure must show a toast and preserve successful items.

