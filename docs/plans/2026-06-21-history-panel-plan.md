# History Panel Implementation Plan

## Goal
Implement the History Panel UI to display a chronological list of actions, highlight the active state, style redo states as disabled/grayed-out, and support time travel when a history state is clicked.

---

## Tasks

### Task 1: Extend `CommandHistory` and Write Unit Tests
Extend `CommandHistory` in `apps/desktop/src/engine/history.ts` to accept transition labels, store them in the snapshot entries, and expose stack accessors.

**Files:**
- Modify: `apps/desktop/src/engine/history.ts`
- Modify: `apps/desktop/src/engine/__tests__/history.test.ts` (or add a new test file)

**Step 1: Write/Update tests**
Create unit tests to verify:
1. Pushing snapshots with a label.
2. Default label fallback (`"Unknown Operation"`) when no label is provided.
3. `getHistoryStack()` returns the correct chronological sequence of labels and flags (e.g. `isRedo: true/false`).
4. Traversal size calculations and active index mapping.

**Step 2: Implement updates in `history.ts`**
- Modify `SnapshotEntry` to include `label?: string`.
- Update `commit(snapshot: DocumentModel, label?: string)` to store `label`.
- Add public methods:
```typescript
export interface HistoryItem {
  label: string;
  isRedo: boolean;
}

getHistoryStack(currentLabel = "Current State"): HistoryItem[] {
  const items: HistoryItem[] = [];
  
  // 1. Initial/Open state placeholder (base state)
  items.push({ label: "Open", isRedo: false });
  
  // 2. Undo stack items (past actions)
  for (const entry of this.undoStack) {
    items.push({
      label: entry.label || "Unknown Operation",
      isRedo: false,
    });
  }
  
  // 3. Redo stack items (future actions, in reverse stack order)
  for (let i = this.redoStack.length - 1; i >= 0; i--) {
    items.push({
      label: this.redoStack[i].label || "Unknown Operation",
      isRedo: true,
    });
  }
  
  return items;
}
```

---

### Task 2: Connect History to `EditorContext` and `setupWorkspaceSync`
Expose the history items and active state index to SolidJS frontend signals.

**Files:**
- Modify: `apps/desktop/src/components/editor/EditorContext.tsx`
- Modify: `apps/desktop/src/components/editor/workspaceSync.ts`

**Steps:**
1. Update `EditorContextValue` interface in `EditorContext.tsx`:
```typescript
export interface HistoryItem {
  label: string;
  isRedo: boolean;
}

// In EditorContextValue:
historyItems: Accessor<HistoryItem[]>;
activeHistoryIndex: Accessor<number>;
navigateHistory: (index: number) => void;
historyCollapsed: Accessor<boolean>;
setHistoryCollapsed: Setter<boolean>;
```
2. Implement signals in `EditorProvider`:
```typescript
const [historyItems, setHistoryItems] = createSignal<HistoryItem[]>([]);
const [activeHistoryIndex, setActiveHistoryIndex] = createSignal(0);
const [historyCollapsed, setHistoryCollapsed] = createSignal(true); // Defaults to collapsed
```
3. Expose time travel navigation `navigateHistory(index: number)` in `EditorProvider`:
```typescript
const navigateHistory = (index: number) => {
  const engine = props.workspace.getActiveEngine();
  const history = props.workspace.getActiveHistory();
  if (!engine || !history) return;

  const activeIndex = history.getUndoCount(); // Equals index of active state (undo count + 1 for open state placeholder)
  const diff = index - activeIndex;

  if (diff === 0) return;

  if (diff < 0) {
    // Navigate backward (undo)
    const steps = -diff;
    let lastSnap = null;
    for (let i = 0; i < steps; i++) {
      const snap = history.undo(engine.snapshot());
      if (snap) lastSnap = snap;
    }
    if (lastSnap) engine.restore(lastSnap);
  } else {
    // Navigate forward (redo)
    const steps = diff;
    let lastSnap = null;
    for (let i = 0; i < steps; i++) {
      const snap = history.redo(engine.snapshot());
      if (snap) lastSnap = snap;
    }
    if (lastSnap) engine.restore(lastSnap);
  }

  // Upload textures and redraw
  for (const layer of engine.getLayers()) {
    if (layer.imageBitmap) props.renderer.uploadImage(layer.id, layer.imageBitmap);
  }
  props.scheduler.requestRender();
  props.workspace.notifyVisualChange(); // Triggers workspace change to sync states
};
```
4. Update `setupWorkspaceSync` to sync the state:
```typescript
// In SyncStateParams:
setHistoryItems: (items: HistoryItem[]) => void;
setActiveHistoryIndex: (index: number) => void;

// In syncState():
const history = params.workspace.getActiveHistory();
if (history) {
  params.setHistoryItems(history.getHistoryStack());
  params.setActiveHistoryIndex(history.getUndoCount());
} else {
  params.setHistoryItems([]);
  params.setActiveHistoryIndex(0);
}
```

---

### Task 3: Annotate `history.commit()` calls with Labels
Add specific labels to all active `commit()` sites.

**Files:**
- Add labels to:
  - `apps/desktop/src/components/editor/useLayerActions.ts` (Add: `"New Layer"`, Duplicate: `"Duplicate Layer"`, Delete: `"Delete Layer"`, Toggle visibility: `"Toggle Visibility"`, Lock: `"Toggle Lock"`, Move up/down: `"Reorder Layer"`)
  - `apps/desktop/src/components/editor/LayersPanel.tsx` (Drag reorder: `"Reorder Layer"`, Rename: `"Rename Layer"`)
  - `apps/desktop/src/components/editor/MoveOptionBar.tsx` (Flip, Align, Reset, input changes)
  - `apps/desktop/src/components/editor/SelectionOptionBar.tsx` (Cut, Paste, Delete selection)
  - `apps/desktop/src/components/editor/ResizeCanvasModal.tsx` (Resize: `"Resize Canvas"`)
  - `apps/desktop/src/components/editor/cropToolActions.ts` (Crop: `"Crop Canvas"`)
  - `apps/desktop/src/components/editor/crossDocLayerOps.ts` (Cross doc: `"Drag Layer"`)
  - `apps/desktop/src/components/editor/paintCommitCommand.ts` (Paint: `"Brush Stroke"` or `"Eraser"`)
  - `apps/desktop/src/components/editor/useCanvasLayerDrag.ts` (Canvas move: `"Move Layer"`)

---

### Task 4: Create the `<HistoryPanel>` Component
Create a reusable, compact UI component displaying the list of operations.

**Files:**
- Create: `apps/desktop/src/components/editor/HistoryPanel.tsx`
- Create: `apps/desktop/src/components/editor/__tests__/HistoryPanel.test.tsx`

**Key styling details:**
- Render in a scrollable container with inset shadow.
- Map history items:
  - Active item is index `activeHistoryIndex()`. Highlight with Photon Amber accent bar on the left + subtle active background.
  - Items after the active index have `isRedo: true`. Style with `opacity-40` (looks like future actions that can be redone).
  - Clicking any item calls `navigateHistory(index)`.

---

### Task 5: Mount `<HistoryPanel>` in the RightDock / LayersPanel
Mount it at the bottom of the layer rail, stacked with the Navigator.

**Files:**
- Modify: `apps/desktop/src/components/editor/LayersPanel.tsx`
- Modify: `apps/desktop/src/components/editor/BottomStatusBar.tsx`

**Steps:**
1. Import `HistoryPanel` inside `LayersPanel.tsx`.
2. Add collapsible header section for History Panel matching the Navigator header style.
3. Wire the "History" button in `BottomStatusBar.tsx` to toggle `historyCollapsed()` state (and make sure RightDock is open).

---

### Task 6: Testing & Verification
1. Verify focused unit tests: `history.test.ts` and `HistoryPanel.test.tsx`.
2. Ensure the complete Vitest frontend suite is fully passing.
3. Verify type-checks and production Vite builds.
4. Verify Rust workspace tests.
