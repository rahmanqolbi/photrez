# History Panel Design Specification

## Overview
The History Panel provides a vertical list of document states in chronological order. It allows the user to see the list of past actions, identify which actions are in the active undo path versus the inactive redo path, and click any item to perform time travel (navigating back or forward to that specific state).

## 1. UI Representation & Layout
The History Panel will be built as a compact, docked panel matching the **"Soft & Snappy"** aesthetic defined in `GEMINI.md`:
- **Location**: Mounted inside the pre-existing `Layers | History` tab surface in `LayersPanel.tsx`. The tabs own only the mutually exclusive Layers/History content region; Navigator remains a persistent canvas utility beneath both tabs.
- **Visuals**:
  - An edge-to-edge dock list using structural row dividers, without a rounded full-height card or nested panel padding.
  - Standard spacing and dividers (`border-editor-divider`) consistent with the Layers surface.
  - Small, high-density typography (`text-[11.5px]`).
- **Items styling**:
  - **Original State**: The first item in the list, representing the document at its initial opened/created state. Always labeled "Open" or "New Document".
  - **Active State (Normal)**: Highlights the current state with a subtle full-row background, a Photon Amber icon, and `aria-current="step"`; it does not use a decorative side stripe.
  - **Future/Redo State (Grayed out)**: Items in the redo stack are displayed with reduced opacity (`opacity-45`), representing actions that have been undone but can still be redone.
  - **Icons**: A compact icon (e.g. `lucide` history, undo, paint brush, etc.) next to each entry to distinguish action categories.

## 2. Operation Labels (Metadata)
To display meaningful labels in the list, `CommandHistory.commit()` will accept an optional `label` parameter:
```typescript
interface SnapshotEntry {
  snapshot: DocumentModel;
  timestamp: number;
  lastPaintCoords: { x: number; y: number } | null;
  label?: string; // Human-readable name of the transition/action
}
```

### Transition Labels Table
We will supply appropriate labels for the main actions in Photrez:

| Action / Caller site | Label |
| --- | --- |
| Brush / Eraser commit | `"Brush Stroke"` / `"Eraser"` |
| Add Layer | `"New Layer"` |
| Duplicate Layer | `"Duplicate Layer"` |
| Delete Layer | `"Delete Layer"` |
| Reorder Layer | `"Reorder Layer"` |
| Rename Layer | `"Rename Layer"` |
| Flip H/V | `"Flip Layer"` |
| Move Layer (canvas drag) | `"Move Layer"` |
| Transform Layer (options input) | `"Transform Layer"` |
| Align Layer | `"Align Layer"` |
| Reset Transform | `"Reset Layer Transform"` |
| Merge Layer Down | `"Merge Down"` |
| Flatten Image | `"Flatten Image"` |
| Resize Canvas | `"Resize Canvas"` |
| Crop Image | `"Crop Canvas"` |
| Cut Selection | `"Cut"` |
| Paste Selection | `"Paste"` |
| Delete Selection | `"Delete Pixels"` |
| Workspace drop layer | `"Drag Layer"` |

*Note: Calls to `commit` without a label (e.g., from older tests) will fall back to `"Unknown Operation"`, ensuring 100% backward compatibility.*

## 3. History State & Time Travel Navigation
The History list will be generated chronologically.

### Chronological List Generation Formula
Given:
- `undoStack`: array of entries `[U_0, U_1, ..., U_{n-1}]`
- `redoStack`: array of entries `[R_0, R_1, ..., R_{m-1}]`

The list items sequences from oldest to newest is:
1. **Original State** (Label: `"Open"` or `"New Document"`, active if `undoStack.length === 0`).
2. **Undo Stack Items** (Labels: `U_0.label`, `U_1.label`, ..., `U_{n-1}.label`).
3. **Redo Stack Items** in reverse-chronological array order (Labels: `R_{m-1}.label`, `R_{m-2}.label`, ..., `R_0.label`).

The total list length is always `undoStack.length + redoStack.length + 1`.
The active item index is exactly `undoStack.length`.

### Time-Travel Logic
When a user clicks on the item at index `k` in the UI list (where `k` is 0-indexed):
1. Resolve target document session's `engine` and `history`.
2. Compute step difference: `diff = k - history.getUndoCount()`.
3. If `diff < 0`: Call `history.undo(engine.snapshot())` exactly `-diff` times. Restore each popped snapshot in the engine.
4. If `diff > 0`: Call `history.redo(engine.snapshot())` exactly `diff` times. Restore each popped snapshot in the engine.
5. If `diff === 0`: Do nothing.
6. After traversal: Upload all layer bitmaps to the WebGL renderer, request a render, and trigger workspace change notification (`workspace.notifyChange()`) to update the UI signals and redraw the viewport.

## 4. Verification and Test Gates
- **Unit Tests**: Add tests in `history.test.ts` verifying label assignment, backward-compatible defaults, `getHistoryStack()` outputs, and index calculation.
- **Contract/State Tests**: Add tests in `EditorContext.test.tsx` verifying that history actions propagate reactive updates to the UI.
- **Wiring Tests**: Test the click-to-time-travel handler in `HistoryPanel.test.tsx` using simulated cursor clicks and verify that the correct number of undo/redo commands are executed on the engine.

## 5. Final Integration Decision
- The pre-existing `Layers | History` tab structure is a locked production contract and remains in place.
- History has one implementation inside the History tab; no second collapsible History section is added below Navigator.
- The status-bar action reopens the right dock and selects the History tab.
- Navigator is a persistent canvas instrument outside the mutually exclusive tab-content region.
- When `Open` is the only state, quiet inline copy explains that edits will appear in the list.
- Photon Amber marks the selected tab; the History list itself remains restrained and row-oriented.
- Multi-step traversal carries each intermediate snapshot into the next undo/redo call before restoring the final target, preserving the redo chain exactly.
- A mounted regression test asserts that both tabs remain present and that selecting History swaps the dock content without removing the Layers surface.
