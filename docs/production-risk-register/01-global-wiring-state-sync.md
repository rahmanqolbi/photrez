# Global Wiring and State Sync Risks

Hotspots:

- `apps/desktop/src/components/editor/EditorContext.tsx`
- `apps/desktop/src/components/editor/editorState.ts`
- `apps/desktop/src/components/editor/useCanvasPointerTools.ts`
- `apps/desktop/src/components/editor/useCanvasKeyboard.ts`
- `apps/desktop/src/components/editor/workspaceSync.ts`
- `apps/desktop/src/components/editor/__tests__/engine-signal-contract.test.tsx`
- `apps/desktop/src/components/editor/__tests__/CanvasViewport.test.tsx`

## Potential Production Bugs

| ID | Severity | Potential production symptom | Trigger / root cause | Guard / mitigation |
| --- | --- | --- | --- | --- |
| PBR-GLOBAL-001 | P0 | A new or existing tool appears active but canvas clicks do nothing | Tool type added to UI but not routed in `useCanvasPointerTools` | CanvasViewport pointer chain test: `pointerdown -> pointermove -> pointerup` mutates engine |
| PBR-GLOBAL-002 | P1 | Keyboard shortcut works in one mode but silently fails in another | `useCanvasKeyboard` and `AppTitleBar` both handle window keydown without `defaultPrevented` discipline | Shortcut conflict test with modal/tool active |
| PBR-GLOBAL-003 | P0 | Undo/redo skips a user action or restores a half-old state | Mutating path calls `history.commit()` after mutation or not at all | Undo/redo test for every state-mutating command/tool action |
| PBR-GLOBAL-004 | P0 | Layers panel, transform overlay, and engine point to different active layers | `activeLayerId`, `selectedLayerId`, and engine active layer are synced inconsistently | Engine-signal contract test for add/delete/undo/switch document |
| PBR-GLOBAL-005 | P1 | Cursor, transform box, or drag session leaks after switching tools | Transient state not cleared in the active tool cleanup effect | Tool A -> Tool B -> Tool A round-trip test with per-signal assertions |
| PBR-GLOBAL-006 | P1 | A global event fires twice after navigating UI or reopening a modal | `onMount` listener has no matching `onCleanup()` or cleanup closes over stale handler | Mount/unmount test and code search for listener setup |
| PBR-GLOBAL-007 | P1 | App mutates the wrong document after async open/export/drop finishes | Async action reads active document at completion time instead of target document captured at start | Test async action while switching tabs mid-flight |
| PBR-GLOBAL-008 | P1 | Drag gets stuck, selection remains in edit mode, or paint stroke never commits | `pointercancel` / `lostpointercapture` not routed to cleanup | Pointer cancel and lost capture regression tests |
| PBR-GLOBAL-009 | P1 | Locked/hidden/protected layers mutate through one UI path but not another | Guard exists in button path but not canvas/shortcut/drag path | Matrix test across UI button, keyboard, pointer, and drop path |
| PBR-GLOBAL-010 | P2 | Status bar shows stale layer/tool/memory info | Signal updates happen in engine but derived state or status read is stale | State contract test for status-driving signals |
| PBR-GLOBAL-011 | P2 | Tool option bar controls show stale values after undo/switch document | Option bar owns local state that is not reset from engine/source signal | Option bar render test after undo and document switch |
| PBR-GLOBAL-012 | P2 | Solid effect loops or misses updates | Signal accessor used without `()` or mutable object updated in place | Type review plus regression around affected signal |

## Production Review Checklist

- Every user event path has a wiring test from its real mounted host.
- Every engine mutation has an engine-signal contract test.
- Every tool-specific transient signal has a tool switch cleanup assertion.
- Keyboard listeners respect `defaultPrevented`.
- Async handlers capture target document IDs explicitly.
- All listener-creating effects have `onCleanup()`.

