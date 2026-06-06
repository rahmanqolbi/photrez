# Comprehensive Test Plan — Undo/Redo + UI Components

## Objective

Uncover hidden bugs in undo/redo, crop, bitmap lifecycle, move tool, document tabs, and error resilience through comprehensive tests. Priority: areas with 0% coverage first.

## Phase 1 — DocumentTabsBar (0% coverage)

### Test file: `DocumentTabsBar.test.tsx`

| # | Test | What it catches |
|---|------|-----------------|
| 1.1 | Renders zero tabs when documents array empty | Empty state crash |
| 1.2 | Renders one tab with correct name | Basic render |
| 1.3 | Renders multiple tabs | List rendering |
| 1.4 | Active tab has active styling class | Visual state |
| 1.5 | Click tab calls `workspace.switchDocument()` with `cancelActiveTransformSession()` | Tab switch logic |
| 1.6 | Dirty tab shows dirty dot | Dirty state indicator |
| 1.7 | Close button calls `workspace.removeDocument()` | Close logic |
| 1.8 | New document button calls workspace.createDocument | New doc flow |
| 1.9 | Transform session cancellation on tab switch | State safety |

## Phase 2 — MoveOptionBar + Move Tool (0% coverage)

### Test file: `MoveOptionBar.test.tsx`

| # | Test | What it catches |
|---|------|-----------------|
| 2.1 | Renders "move" tool label pill | Basic render |
| 2.2 | Auto-select toggle calls `setMoveAutoSelect` | Toggle logic |
| 2.3 | Snap toggle calls `setMoveSnapEnabled` | Snap toggle |
| 2.4 | Hovered layer badge shows layer name | Hover UX |
| 2.5 | Locked layer disables all controls | Safety guard |
| 2.6 | Position X/Y field commits history + calls `transformLayer` | Transform via input |
| 2.7 | Rotation field commits history + updates transform | Rotation input |
| 2.8 | Width/height display fields are read-only | Display fields |
| 2.9 | Align buttons (6) call `handleAlign` with correct axis | Alignment |
| 2.10 | Flip H/V buttons call correct handler | Flip |
| 2.11 | Reset transform button calls `resetTransform` | Reset |
| 2.12 | No engine renders nothing | NPE resilience |

### Test file: `input-handler-move.test.ts`

| # | Test | What it catches |
|---|------|-----------------|
| 2.13 | pointerDown with move tool + selected layer sets dragStart offset | Drag init |
| 2.14 | pointerDown with move tool + locked layer is no-op | Lock guard |
| 2.15 | pointerDown with move tool + no selectedLayerId is no-op | Null safety |
| 2.16 | pointerMove after pointerDown calls engine.moveLayer() | Move execution |
| 2.17 | pointerUp clears snap lines | Cleanup |

## Phase 3 — CommandHistory + Snapshot Deep-Clone

### Test file: `commandHistory.test.ts` (expanded)

| # | Test | What it catches |
|---|------|-----------------|
| 3.1 | snapshot() creates deep clone — mutating model after snapshot does not change snapshot | Shallow copy bug |
| 3.2 | restore() does not affect previously taken snapshots | Shared state bug |
| 3.3 | Undo/redo with ImageBitmap — bitmap stays valid after restore | Closed-bitmap regression |
| 3.4 | Max depth eviction — N commits fill stack, oldest evicted | Memory leak |
| 3.5 | clear() resets both undo and redo stacks | Clear mid-session |
| 3.6 | peek() returns current state without modifying stack | Peek integrity |

## Phase 4 — Crop Apply + Undo/Redo Integration

### Test file: `cropUndoIntegration.test.ts` (new)

| # | Test | What it catches |
|---|------|-----------------|
| 4.1 | applyCrop then undo restores original dimensions | **Bug #3 regression** |
| 4.2 | applyCrop then undo then redo restores cropped dimensions | Round-trip |
| 4.3 | renderer.resize called after crop apply | **Bug #2 regression** |
| 4.4 | renderer.resize called after undo | **Bug #2 regression** |
| 4.5 | renderer.resize called after redo | **Bug #2 regression** |
| 4.6 | Crop with deleteCroppedPixels=true + undo restores pixels | Pixel integrity |
| 4.7 | Crop with rotation + undo restores rotation | Rotation state |
| 4.8 | Three crop-undu-redo cycles no corruption | Cumulative safety |
| 4.9 | Crop undo stack cleared when leaving crop tool | **Bug #1 regression** |

## Phase 5 — Error Resilience + Keyboard Shortcuts

### Test file: `AppTitleBar.test.tsx` (new)

| # | Test | What it catches |
|---|------|-----------------|
| 5.1 | Ctrl+Z calls handleUndo (via keyboard event) | Shortcut wiring |
| 5.2 | Ctrl+Shift+Z calls handleRedo | Redo shortcut |
| 5.3 | Undo when engine is null does not throw | NPE resilience |
| 5.4 | Undo when history is null does not throw | Null safety |
| 5.5 | Undo with corrupt snapshot (closed bitmap) catches error gracefully | **Bug #1 regression** |
| 5.6 | Redo when redo stack empty is safe | Boundary safety |
| 5.7 | Input guard — typing in text field does not trigger undo | Input isolation |
| 5.8 | Escape in crop tool cancels crop | Keyboard routing |

## Phase 6 — Edge Cases Integration

### Test file: `undoEdgeCases.test.ts` (new)

| # | Test | What it catches |
|---|------|-----------------|
| 6.1 | Brush stroke (setLayerImageBitmap) + undo restores original bitmap | Brush undo regression |
| 6.2 | Multi-layer: crop 1 layer untouched layer stays valid | Partial corruption |
| 6.3 | Snapshot → applyCrop → snapshot → undo → undo | Stack depth with mutation |
| 6.4 | LayersPanel delete layer then undo restores layer | Panel + undo integration |
| 6.5 | Workspace multi-document undo isolation | Cross-doc leak |

## Implementation Order

Fase 1 → Fase 2 → Fase 3 → Fase 4 → Fase 5 → Fase 6
