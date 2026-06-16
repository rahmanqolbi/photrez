# Cross-Document Drag & Drop — Design Spec

**Status:** DRAFT (pending user review)
**Date:** 2026-06-16
**Author:** Brainstorming session (AI-assisted)
**Spec version:** 1.0

---

## 1. Goal

Implement two related drag-drop features for Photrez that significantly improve the user workflow:

1. **In-app layer drag** — drag a layer from one document's Layers panel to another document. Default = **Copy**, Alt+drag = **Move**.
2. **External file drop** — drag image files from the operating system (File Explorer / Finder) into Photrez. Behavior is **context-sensitive** based on drop zone: new layer in target document, or new document(s).

Both features share infrastructure (visual feedback, error handling, toast system) but use different technical mechanisms (HTML5 Drag and Drop for in-app, Tauri 2 `onDragDropEvent` for OS files).

---

## 2. Background & Motivation

Photrez is a multi-document desktop image editor (Tauri 2 + SolidJS). Users currently must:
- Use **File → Open** or Ctrl+O to bring external images in (one dialog at a time)
- **Duplicate** layers within a doc, then **switch tabs** to move between docs (manual, no cross-doc layer transfer)
- Use OS copy/paste or file manager to move assets between projects

This friction breaks the creative flow. Adding native drag-drop:
- Aligns Photrez with Photoshop/Affinity/Krita/Figma UX conventions (industry standard)
- Enables fast asset composition across projects
- Eliminates the dialog round-trip for file import
- Makes layer reuse between docs natural (the common "import logo to all variants" workflow)

**Out of scope (deferred):**
- Multi-select layer drag (single layer only for MVP — see Q5)
- Drag layer from canvas (only from Layers panel — see Q7)
- Cross-platform drag from Photrez to other apps (out, drop from OS to Photrez only)
- Smart guides / snapping during drag-drop (defer to existing snap system)
- Drag preview thumbnails for very large layers (defer until performance issue reported)

---

## 3. UX Decisions (locked, brainstormed)

| # | Decision | Value | Rationale |
|---|---|---|---|
| Q1 | Cross-doc layer drag default | **Copy**, Alt = Move | Photoshop/Affinity/Krita convention: copy by default between docs (source unchanged). Alt = move. |
| Q2 | Drop zones (layer drag) | Tab (after hover) + Canvas + Layers panel | Maximum flexibility. Tab enables drop to inactive doc; canvas/panel enable drop to active doc. |
| Q2 | Drop zones (file drag) | + Tab empty area / + button / outside = **new doc** | User said: "kalau dragnya ke area kosong tab atau tombol tambah tab atau diluar document maka membuka document baru" |
| Q2a | Hover-to-switch timer | **500ms** with visual countdown | Standard UX delay (balance responsiveness vs accidental). Visual countdown gives feedback. |
| Q3 | Drop position (x/y on canvas) | **Cursor** if dropped on Canvas; **Doc center** if dropped on Tab or Layers panel | User said "landing di cursor saja". For drops NOT on canvas (tab/panel), use doc center since cursor is not on canvas. |
| Q4 | File drop behavior | **Context-sensitive** by drop zone | Empty workspace → N new docs; inside doc → N new layers; outside → N new docs. |
| Q5 | Multi-select layer drag | **Single layer only** for MVP | Simpler. Multi-select drag adds complexity (group handling, ordering preservation) without blocking core feature. |
| Q6 | Multi-file cascade | **+24px per layer** | Photoshop/Affinity convention. Provides visual feedback that multiple files were dropped. |
| Q7 | Integration strategy | **Coexist** (pointer events for reorder + HTML5 for cross-doc) | Existing pointer-based reorder is preserved (no regression risk). HTML5 drag handles cross-doc with richer `dataTransfer` payload. |
| Q8 | History | **Per-doc** (Approach A, not atomic across docs) | Photoshop/Figma convention. Simpler. Trade-off: move (Alt) is 2 undo entries (1 per doc). User accepted. |

### Drop Zone Matrix (final)

| Drop Zone | Layer Drag | File Drag |
|---|---|---|
| **Tab (specific doc, hover 500ms)** | Switch to doc + add as layer (doc center) | Switch to doc + add as layer (doc center) |
| **Tab empty area** (between tabs / after last) | Invalid (no-op) | New doc (each file) |
| **+ tab button** | Invalid (no-op) | New doc (each file) |
| **Canvas** (active doc viewport) | Add as layer (cursor pos) | Add as layer (cursor pos) |
| **Layers panel** (active doc) | Add as layer (doc center) | Add as layer (doc center) |
| **Outside** (tool rail, status bar, inspector) | Invalid (no-op) | New doc (each file) |
| **Empty workspace** (no active doc) | Invalid (no-op) | N new docs (existing behavior preserved) |

**Z-order:** in all "add as layer" cases, the new layer is inserted at the **top of the layer list** (highest z-order, visible on top of existing layers). The "center" in the matrix above refers only to x/y position on canvas, not z-order.

---

## 4. Architecture

### 4.1 Layer overview

```
┌─────────────────────────────────────────────────────────────┐
│  TAURI 2 SHELL                                              │
│  - dragDropEnabled: true (default)                           │
│  - Emits drag-drop events via getCurrentWebview()           │
└─────────────────────────────────────────────────────────────┘
                          ↕ Tauri IPC events
┌─────────────────────────────────────────────────────────────┐
│  FRONTEND (SolidJS)                                         │
│                                                              │
│  ┌──────────────────────────────────────────┐               │
│  │  EditorContext (extended)                │               │
│  │  + useTauriDragDrop() hook (NEW)         │ ← OS files    │
│  │  + DragController context (NEW)          │ ← in-app drag │
│  │  + showToast() helper (NEW)              │               │
│  └──────────────────────────────────────────┘               │
│                          ↕                                    │
│  ┌──────────────────────────────────────────┐               │
│  │  crossDocLayerOps.ts (NEW, pure)         │               │
│  │  - addLayerFromCrossDoc()                │               │
│  │  - addFilesAsLayers()                    │               │
│  │  - createNewDocsFromFiles()              │               │
│  └──────────────────────────────────────────┘               │
│                          ↕                                    │
│  ┌──────────────────────────────────────────┐               │
│  │  Existing components (MODIFIED)          │               │
│  │  - LayerItem.tsx        (draggable=true) │               │
│  │  - DocumentTabsBar.tsx  (drop + hover)   │               │
│  │  - CanvasViewport.tsx   (drop zone)      │               │
│  │  - LayersPanel.tsx      (drop zone)      │               │
│  │  - EmptyWorkspace.tsx   (use Tauri API)  │               │
│  │  - EditorShell.tsx      (ToastHost)      │               │
│  └──────────────────────────────────────────┘               │
│                                                              │
│  ┌──────────────────────────────────────────┐               │
│  │  Toast.tsx (NEW)                         │               │
│  │  - <ToastHost> renders 3-stack toasts    │               │
│  │  - showToast(msg, severity) API          │               │
│  └──────────────────────────────────────────┘               │
└─────────────────────────────────────────────────────────────┘
                          ↕ invoke()
┌─────────────────────────────────────────────────────────────┐
│  EXISTING IPC COMMANDS (no changes)                         │
│  - open_images(paths[]) → returns image bitmaps              │
│  - add_layer(name) → returns new layer                      │
│  - delete_layer(id) → removes layer                         │
│  - undo / redo → per-doc history                            │
│  - switch_document(id) → active document                    │
└─────────────────────────────────────────────────────────────┘
```

### 4.2 Key Architectural Decisions

1. **No new IPC commands.** All cross-doc logic stays in the frontend. We compose existing primitives: `open_images` for file decode, `add_layer` for layer creation, `delete_layer` for source removal (Alt+Move), `switch_document` for tab activation. This minimizes Rust changes and IPC surface area.

2. **Tauri 2 `onDragDropEvent` for OS files.** The `EmptyWorkspace.tsx` HTML5 `dataTransfer.files` path is replaced with Tauri API. This is required on Windows where Tauri intercepts OS file drops by default (`dragDropEnabled: true`). The Tauri API also gives us window-relative drop position (`event.payload.position`) since `wry@0.25.0`.

3. **HTML5 Drag and Drop for in-app layer drag.** Tauri does not intercept in-app drag operations. We use the standard `draggable=true` + `dragstart`/`dragover`/`drop` event model with a custom MIME type `application/x-photrez-layer` carrying a JSON payload.

4. **`DragController` context** holds all transient drag state. Components subscribe via a `useDragController()` hook. Avoids prop drilling through 4+ components.

5. **Per-doc history** (existing pattern). Cross-doc move (Alt+drag) creates 2 history entries (1 in source for delete, 1 in target for add). Copy creates 1 entry (target only). Matches Photoshop/Figma behavior.

6. **No Rust changes** to `photrez-core` or new `#[tauri::command]`. Frontend orchestrates everything via existing IPC.

### 4.3 Component Reuse vs. New

| Concern | Reuse | New |
|---|---|---|
| Document state (multi-doc) | `WorkspaceManager` (existing) | — |
| Layer operations | `engine.addLayer`, `engine.deleteLayer` (existing) | — |
| File decode | `open_images` IPC (existing) | — |
| History snapshots | `history.commit()` (existing) | — |
| Drag state coordination | — | `DragController` context |
| Cross-doc pure logic | — | `crossDocLayerOps.ts` |
| OS file drop listener | — | `useTauriDragDrop` hook |
| Error UX | — | `Toast` component + `showToast()` helper |
| Visual feedback styles | `index.css` design tokens (existing) | drop indicator CSS |

---

## 5. Drag Payload & State Model

### 5.1 In-app layer drag (HTML5 dataTransfer)

**MIME type:** `application/x-photrez-layer` (custom, won't conflict with browser defaults or text/uri-list)

**Payload schema** (`apps/desktop/src/components/editor/dragTypes.ts`):

```typescript
export const LAYER_DRAG_MIME = "application/x-photrez-layer";

export interface LayerDragPayload {
  version: 1;                  // schema version (future-proofing)
  sourceDocId: string;         // source document ID
  layerId: string;             // source layer ID
  sourceName: string;          // for drag ghost / debug
  isAltPressed: boolean;       // captured at dragstart, immutable during drag
}
```

**On `dragstart` in `LayerItem.tsx`:**

```typescript
function onDragStart(e: DragEvent) {
  if (props.layer.locked) { e.preventDefault(); return; }  // abort drag
  const payload: LayerDragPayload = {
    version: 1,
    sourceDocId: props.activeDocumentId,
    layerId: props.layer.id,
    sourceName: props.layer.name,
    isAltPressed: e.altKey,
  };
  e.dataTransfer.setData(LAYER_DRAG_MIME, JSON.stringify(payload));
  e.dataTransfer.effectAllowed = e.altKey ? "move" : "copy";

  // Custom drag image (HTML5 setDragImage) — show layer thumbnail
  if (dragGhostRef) {
    e.dataTransfer.setDragImage(dragGhostRef, 20, 20);
  }
}

function onDragEnd(e: DragEvent) {
  dragController.endDrag();
}
```

**On `drop` in target zone:**

```typescript
const raw = e.dataTransfer.getData(LAYER_DRAG_MIME);
if (!raw) return;  // not a Photrez layer drag
const payload: LayerDragPayload = JSON.parse(raw);
// ... validate, route to handler
```

### 5.2 OS file drag (Tauri 2)

**API** (since Tauri 2.x, `wry@0.25.0+`):

```typescript
import { getCurrentWebview } from "@tauri-apps/api/webview";

const unlisten = await getCurrentWebview().onDragDropEvent((event) => {
  if (event.payload.type === "over") {
    // event.payload.position = { x: number, y: number } in window-relative coords
  } else if (event.payload.type === "drop") {
    // event.payload.paths = string[] of file system paths
    // event.payload.position = { x, y }
  } else {
    // 'leave' / 'cancelled'
  }
});

// CRITICAL: cleanup on unmount
onCleanup(() => unlisten());
```

**Note**: `dragstart` and `dragend` are NOT fired for OS file drags in browsers. We cannot use `setDragImage()` for OS files. The Tauri API is the only way to get reliable file paths across Windows/macOS/Linux.

### 5.3 DropTarget type

```typescript
export type DropTarget =
  | { type: "tab"; docId: string }
  | { type: "tab-empty" }
  | { type: "tab-plus" }
  | { type: "canvas" }
  | { type: "layers-panel" }
  | { type: "outside" }
  | null;
```

### 5.4 DragController state shape

```typescript
interface DragState {
  // Identity (only one drag at a time)
  dragKind: "layer" | "file" | null;
  payload: LayerDragPayload | null;        // for layer drag
  filePaths: string[] | null;             // for file drag
  dragStartPosition: { x: number; y: number } | null;

  // Hover state
  dropTarget: DropTarget;
  hoverTabId: string | null;              // for 500ms auto-switch
  hoverTabProgress: number;               // 0 → 1, drives CSS countdown

  // Cascade (multi-file drop)
  cascadeIndex: number;                   // which file in multi-file sequence
}

interface DragController {
  state: () => DragState;

  // Drag lifecycle
  beginLayerDrag(payload: LayerDragPayload, ghostEl: HTMLElement | null): void;
  beginFileDrag(paths: string[], position: { x: number; y: number }): void;
  endDrag(): void;

  // Hover state
  setDropTarget(target: DropTarget): void;

  // Tab auto-switch
  startTabHover(tabId: string): void;
  cancelTabHover(): void;

  // Cascade
  nextCascadeIndex(): number;
}
```

### 5.5 State transitions

| Event | setDropTarget | Other |
|---|---|---|
| `dragstart` (LayerItem) | `null` | `dragKind="layer"`, payload set |
| Tauri `over` event | (unchanged from prior) | — |
| Tauri `drop` event | — | `beginFileDrag` |
| `dragover` on Tab | `{ type: "tab", docId }` | `startTabHover(docId)` |
| `dragleave` on Tab | `null` (if leave) | `cancelTabHover()` |
| Tab timer reaches 500ms | unchanged | `workspace.switchDocument()`, `cancelTabHover()` |
| `dragover` on Canvas | `{ type: "canvas" }` | `cancelTabHover()` |
| `dragover` on LayersPanel | `{ type: "layers-panel" }` | `cancelTabHover()` |
| `dragover` on tab-empty | `{ type: "tab-empty" }` | `cancelTabHover()` |
| `dragover` on tab-plus | `{ type: "tab-plus" }` | `cancelTabHover()` |
| `dragover` on outside zones | `{ type: "outside" }` | `cancelTabHover()` |
| `drop` on any zone | (unchanged) | call handler, then `endDrag()` |
| `dragend` (HTML5) / Tauri `leave`/`cancel` | `null` | `endDrag()` |

### 5.6 Alt key capture (HTML5 limitation)

The Alt key state **must be captured at `dragstart`** — it cannot be read mid-drag from `dragover`. We store `isAltPressed` in the payload. On drop:

```typescript
const isMove = payload.isAltPressed;
const isCopy = !payload.isAltPressed;
```

**Trade-off:** if user presses/releases Alt during drag, the initial state at dragstart wins. This is standard browser behavior and matches Photoshop.

### 5.7 Validation rules (in drop handlers)

| Check | Action on fail |
|---|---|
| `payload.sourceDocId` exists in workspace | toast "Source document no longer exists", abort |
| `payload.layerId` exists in source doc | toast "Layer was deleted", abort |
| `sourceDocId === targetDocId` | silent no-op (in-doc reorder uses pointer events) |
| Target doc has `>= MAX_LAYERS` (100) — for `addLayerFromCrossDoc` | toast "Target document reached max 100 layers", abort |
| Workspace has `>= MAX_OPEN_DOCUMENTS` (16) — for `createNewDocsFromFiles` | toast "Workspace full — close a document first (max 16)", abort |
| File extension not in supported set | warn-toast "Skipped unsupported file: {filename}", skip file, continue others |
| File path returns error from `open_images` | error-toast "Failed to read file: {filename}", abort just that file |

---

## 6. Drop Zone Behavior

### 6.1 Per-zone handler dispatch

```typescript
// In each zone's onDrop handler
function handleDrop(e: DropEvent, target: DropTarget) {
  const drag = dragController.state();

  if (drag.dragKind === "layer") {
    if (target.type === "tab" || target.type === "canvas" || target.type === "layers-panel") {
      return addLayerFromCrossDoc(drag.payload, target, e.position);
    }
    return;  // invalid zone for layer drag (no-op)
  }

  if (drag.dragKind === "file") {
    if (target.type === "canvas" || target.type === "layers-panel") {
      return addFilesAsLayers(drag.filePaths, target, e.position);
    }
    if (target.type === "tab") {
      return addFilesAsLayers(drag.filePaths, target, e.position);
    }
    if (target.type === "tab-empty" || target.type === "tab-plus" || target.type === "outside") {
      return createNewDocsFromFiles(drag.filePaths);
    }
  }
}
```

### 6.2 Hover-to-switch implementation

```
User mousedown layer → dragstart fires
   ↓
User drags over Tab A (not active) → dragenter fires on Tab A
   ↓
DragController.startTabHover(docIdA) — starts 500ms timer (requestAnimationFrame)
   ↓
   ├── User leaves Tab A before 500ms → dragleave fires → cancelTabHover()
   │   (cancelAnimationFrame + reset progress to 0)
   │
   └── RAF tick reaches 500ms:
         ├── workspace.switchDocument(docIdA)  // engine call (existing)
         ├── cancelTabHover()                   // reset
         └── Tab A now has standard active styling (existing pattern)
   ↓
User releases on Tab A → drop fires on (now-active) Tab A
   → addLayerFromCrossDoc() executes with target=active doc
```

**Implementation** (in `DragController.tsx`):

```typescript
const HOVER_TAB_DURATION_MS = 500;
let hoverTabTimerId: number | null = null;

function startTabHover(tabId: string) {
  cancelTabHover();
  setHoverTabId(tabId);
  setHoverTabProgress(0);

  const startTime = performance.now();
  const tick = () => {
    const elapsed = performance.now() - startTime;
    const progress = Math.min(elapsed / HOVER_TAB_DURATION_MS, 1);
    setHoverTabProgress(progress);
    if (progress < 1) {
      hoverTabTimerId = requestAnimationFrame(tick);
    } else {
      workspace.switchDocument(tabId);
      cancelTabHover();
    }
  };
  hoverTabTimerId = requestAnimationFrame(tick);
}

function cancelTabHover() {
  if (hoverTabTimerId !== null) {
    cancelAnimationFrame(hoverTabTimerId);
    hoverTabTimerId = null;
  }
  setHoverTabId(null);
  setHoverTabProgress(0);
}
```

**Edge cases:**
- **Hover on already-active tab**: timer fires, `switchDocument` is a no-op (same doc). Visual indicator still works.
- **Source doc = target tab**: validation catches it (no-op).
- **Drag cancelled mid-timer** (dragend fires): `endDrag()` calls `cancelTabHover()`. No switch.

### 6.3 Visual feedback (drop indicators)

| State | Indicator |
|---|---|
| Source layer during drag | `opacity: 0.25` (existing pattern) |
| Hovering **valid zone** (tab/canvas/panel) | `outline: 2px solid var(--color-editor-accent)` + 8% accent fill |
| Hovering **invalid zone** (tab-empty for layer) | No indicator; `dropEffect = "none"` cursor `not-allowed` |
| Hovering **tab with active timer** | Bottom progress bar (animated 0→100% over 500ms) using `editor-accent` |
| Tab **switched** (timer completed) | Standard active tab styling (existing) |
| Hovering **canvas** | Viewport dashed border overlay (editor-accent) |
| Hovering **layers panel** | Subtle bg accent |
| **Error** during drop | Red flash on target zone (300ms) + toast |
| Multi-file drag | Drag ghost shows "N files" badge (HTML5) or inferred from Tauri paths count |

**CSS** (in `index.css`):

```css
[data-document-tab][data-drag-over="tab"] {
  outline: 2px solid var(--color-editor-accent);
  outline-offset: -2px;
  background: rgb(225 90 23 / 8%);
}
[data-document-tab][data-drag-over="tab"][data-hover-tab-progress] {
  background-image: linear-gradient(
    to right,
    var(--color-editor-accent) calc(var(--hover-progress, 0) * 100%),
    transparent calc(var(--hover-progress, 0) * 100%)
  );
  background-position: bottom;
  background-size: 100% 2px;
  background-repeat: no-repeat;
}
[data-canvas-drop-zone][data-drag-over="canvas"] {
  outline: 2px dashed var(--color-editor-accent);
  outline-offset: -4px;
}
```

### 6.4 Multi-file cascade

```typescript
const CASCADE_OFFSET_PX = 24;

function computeCascadePosition(basePos: { x: number; y: number }, index: number) {
  return {
    x: basePos.x + (index * CASCADE_OFFSET_PX),
    y: basePos.y + (index * CASCADE_OFFSET_PX),
  };
}
```

**Flow for `addFilesAsLayers(paths, target, basePos)`:**
```
For each file (i = 0..N-1):
  - Validate extension; if unsupported, warn-toast and continue
  - Call Tauri open_images IPC with file path → get bitmap
  - If bitmap decoded size > MAX_PIXEL_BUDGET, error-toast and skip this file
  - Compute base position (cursor for canvas, doc center for tab/panel)
  - Compute cascade position: (basePos.x + 24i, basePos.y + 24i)
  - Clamp to target doc bounds (layers may overlap at edges if doc is small)
  - engine.addLayer(name, bitmap, position)
  - history.commit(snapshotBefore) on target doc
```

**Note on history:** Each layer add is a separate history entry. Ctrl+Z in target removes the most recently added layer. Multi-file drop = N history entries (matches Photoshop).

### 6.5 Cross-doc layer add/move (core logic)

```typescript
// crossDocLayerOps.ts
export async function addLayerFromCrossDoc(
  payload: LayerDragPayload,
  target: DropTarget,
  cursorPos: { x: number; y: number }
): Promise<void> {
  // 1. Resolve target document
  const targetDocId = target.type === "tab" 
    ? target.docId 
    : workspace.getActiveDocumentId();
  
  // 2. Validate
  if (payload.sourceDocId === targetDocId) return;
  const sourceEngine = workspace.getEngine(payload.sourceDocId);
  if (!sourceEngine) { showToast("Source document was closed. Drop cancelled.", "error"); return; }
  const sourceLayer = sourceEngine.getLayer(payload.layerId);
  if (!sourceLayer) { showToast("Layer was deleted. Drop cancelled.", "error"); return; }
  const targetEngine = workspace.getEngine(targetDocId);
  if (targetEngine.getLayerCount() >= MAX_LAYERS) {
    showToast("Target document reached max 100 layers", "error");
    return;
  }
  
  // 3. Compute target position
  //    - Canvas drop: use cursor (converted to doc coords by caller)
  //    - Tab/Panel drop: cursor is not on canvas, use doc center
  const targetPos = target.type === "canvas"
    ? cursorPos
    : {
        x: Math.max(0, (targetEngine.width - sourceLayer.width) / 2),
        y: Math.max(0, (targetEngine.height - sourceLayer.height) / 2),
      };
  
  // 4. Clone the layer data
  const clonedLayer = deepCloneLayer(sourceLayer, { x: targetPos.x, y: targetPos.y });
  
  // 5. History commit on target
  const targetHistory = workspace.getHistory(targetDocId);
  targetHistory.commit(targetEngine.snapshot());
  targetEngine.addLayer(clonedLayer);
  
  // 6. If Alt+Move: also delete from source
  if (payload.isAltPressed) {
    const sourceHistory = workspace.getHistory(payload.sourceDocId);
    sourceHistory.commit(sourceEngine.snapshot());
    sourceEngine.deleteLayer(payload.layerId);
  }
}
```

`deepCloneLayer` reuses the existing duplication logic in `engine/document.ts` (currently used for Ctrl+J within-doc). We extend it to accept a position override for cross-doc positioning.

---

## 7. Error Handling

### 7.1 Error catalog

| Code | Trigger | Severity | Toast message |
|---|---|---|---|
| `E_DROP_SOURCE_DOC_MISSING` | Source doc closed during drag | error | "Source document was closed. Drop cancelled." |
| `E_DROP_SOURCE_LAYER_MISSING` | Layer deleted during drag | error | "Layer was deleted. Drop cancelled." |
| `E_DROP_SAME_DOC` | Drop on same doc, different zone | info | (silent no-op) |
| `E_DROP_TARGET_FULL_LAYERS` | Target doc has 100 layers | error | "Target document reached max 100 layers" |
| `E_DROP_WORKSPACE_FULL` | Workspace at 16 when creating new doc | error | "Workspace full — close a document first (max 16)" |
| `E_DROP_FILE_UNSUPPORTED` | File MIME/ext not supported | warn | "Skipped unsupported file: {filename}" |
| `E_DROP_FILE_READ_ERROR` | Tauri `open_images` fails | error | "Failed to read file: {filename}" |
| `E_DROP_FILE_TOO_LARGE` | File exceeds 256MB decoded budget | error | "File too large to load: {filename}" |
| `E_DROP_INVALID_TARGET` | Drop on locked layer context | info | (no-op, red flash on target) |

Constants: `MAX_OPEN_DOCUMENTS = 16`, `MAX_LAYERS = 100`, `MAX_PIXEL_BUDGET = 256 * 1024 * 1024` — all existing in `apps/desktop/src/engine/types.ts:105-108`.

### 7.2 Toast/Notification system (NEW)

Since Photrez doesn't have a toast system, we add a minimal one. New file: `apps/desktop/src/components/editor/Toast.tsx`.

**Public API:**
```typescript
import { showToast } from "./Toast";

showToast("message", "info" | "warn" | "error");
```

**Behavior:**
- Renders fixed top-right (24px from edges)
- Auto-dismiss: 3.5s (info/warn), 5s (error)
- Stack up to 3 toasts (FIFO eviction)
- Solid panel bg with `editor-accent` border for error
- Accessible: `role="status"` (info), `role="alert"` (error)
- SolidJS signal-based, mounted once in `EditorShell`

**Wired via `EditorContext`** — `showToast` provided through context to all children.

**Scope:** ~80 lines. Not a full notification system — just enough for drag-drop error UX. Future needs (export complete, etc.) can use this same API.

### 7.3 Error UX flow

```
Drop on target
   ↓
Validation layer (crossDocLayerOps)
   ↓
   ├── All checks pass → execute + success (silent)
   │
   └── Check fails:
         ├── severity="info" → no-op (no toast)
         ├── severity="warn" → showToast(msg, "warn") + skip this item (continue others)
         └── severity="error" → showToast(msg, "error") + abort entire drop
```

**Multi-file drop isolation:** per-file errors don't abort the batch. If file 2 of 5 fails, files 1, 3, 4, 5 still load. Toast: "Failed to read {filename2}. 4 of 5 files loaded."

---

## 8. File Manifest

### 8.1 New files

| Path | Purpose | Est. lines |
|---|---|---|
| `apps/desktop/src/components/editor/dragTypes.ts` | Shared types: `DropTarget`, `LayerDragPayload`, `LAYER_DRAG_MIME` constant | ~30 |
| `apps/desktop/src/components/editor/DragController.tsx` | SolidJS context + provider + `useDragController()` hook | ~150 |
| `apps/desktop/src/components/editor/crossDocLayerOps.ts` | Pure functions: `addLayerFromCrossDoc`, `addFilesAsLayers`, `createNewDocsFromFiles`, `computeCascadePosition`, `validateCrossDocDrop` | ~200 |
| `apps/desktop/src/components/editor/useTauriDragDrop.ts` | Tauri `onDragDropEvent` listener hook (with `onCleanup`) | ~80 |
| `apps/desktop/src/components/editor/Toast.tsx` | `ToastHost` component + `showToast()` API | ~80 |
| `apps/desktop/src/components/editor/__tests__/dragTypes.test.ts` | Schema validation, version check, JSON roundtrip | ~30 |
| `apps/desktop/src/components/editor/__tests__/DragController.test.tsx` | State transitions, timer behavior, cleanup on unmount | ~150 |
| `apps/desktop/src/components/editor/__tests__/crossDocLayerOps.test.ts` | All public methods (30+ tests) | ~400 |
| `apps/desktop/src/components/editor/__tests__/Toast.test.tsx` | Render, auto-dismiss, stack max 3 | ~80 |
| `apps/desktop/src/components/editor/__tests__/useTauriDragDrop.test.tsx` | Tauri event dispatch to handlers | ~80 |
| `apps/desktop/e2e/cross-doc-drag-drop.spec.ts` | Playwright browser tests | ~300 |

**Total new: ~1,580 lines** (production + tests)

### 8.2 Modified files

| Path | Change | Risk |
|---|---|---|
| `apps/desktop/src/components/editor/LayerItem.tsx` | Add `draggable={!locked}` + `onDragStart`/`onDragEnd` + drag ghost `<img>` | Low — additive, no logic change |
| `apps/desktop/src/components/editor/DocumentTabsBar.tsx` | Add tab-level `onDragEnter`/`onDragOver`/`onDrop` + hover-to-switch timer subscription + drop indicator attributes | Low — additive |
| `apps/desktop/src/components/editor/CanvasViewport.tsx` | Add canvas drop zone wrapper (overlay `<div>` with `onDrop`) | Low — pure addition |
| `apps/desktop/src/components/editor/LayersPanel.tsx` | Add panel-level `onDragOver`/`onDrop` (not per-layer) | Low — additive |
| `apps/desktop/src/components/editor/EmptyWorkspace.tsx` | Replace HTML5 drop with Tauri `useTauriDragDrop` subscription | Medium — changes existing file drop behavior (must verify on Windows) |
| `apps/desktop/src/components/editor/EditorContext.tsx` | Add `<DragControllerProvider>` + `showToast` + `useTauriDragDrop` mount | Low — additive provider |
| `apps/desktop/src/components/editor/EditorShell.tsx` | Mount `<ToastHost>` at root | Low — one line |
| `apps/desktop/src/index.css` | Drop indicator styles (data-attribute selectors) | Low — additive |
| `apps/desktop/src/engine/document.ts` | Extend `duplicateLayer` to accept position override (reused by cross-doc) | Low — backward-compatible signature change |
| `apps/desktop/src/components/editor/__tests__/DocumentTabsBar.test.tsx` | Append 5 drop + hover-to-switch tests | Low — additive |
| `apps/desktop/src/components/editor/__tests__/CanvasViewport.test.tsx` | Append 3 drop tests | Low — additive |
| `apps/desktop/src/components/editor/__tests__/LayersPanel.test.tsx` | Append 3 drop tests | Low — additive |
| `apps/desktop/src/components/editor/__tests__/engine-signal-contract.test.tsx` | Append 4 cross-doc contract tests | Low — additive |

### 8.3 No changes

- `apps/desktop/src-tauri/src/**` (Rust unchanged)
- `apps/desktop/src-tauri/tauri.conf.json` (default `dragDropEnabled: true` works for us)
- `crates/core/**` (no Rust core changes)
- `apps/desktop/src/components/editor/LayersPanel.tsx` reorder logic (pointer events preserved per Q7)
- `apps/desktop/src/components/editor/useCanvasPointerTools.ts` (reorder drag unchanged)
- `apps/desktop/src/engine/history.ts` (per-doc history unchanged)
- `apps/desktop/src/engine/workspace.ts` (existing `addDocument`, `removeDocument`, `switchDocument` reused as-is)

---

## 9. Testing Strategy

### 9.1 Unit tests

**`crossDocLayerOps.test.ts`** (~30 tests):
- `addLayerFromCrossDoc` — 8 cases
  - Copy (default) → target has cloned layer, source unchanged
  - Move (Alt) → target has cloned layer, source layer removed
  - Same-doc → silent no-op
  - Source doc missing → error toast, no mutation
  - Source layer missing → error toast, no mutation
  - Target full (100 layers) → error toast, no mutation
  - Position: cursor on canvas → position matches
  - Position: layers panel → top of stack (center)
  - Transform preserved (rotation, scale, opacity) across docs
- `addFilesAsLayers` — 6 cases
  - Single file at cursor → 1 layer at cursor
  - Multi-file at cursor → N layers, cascade 24px each
  - Mixed supported/unsupported → supported added, unsupported warn-toast
  - All unsupported → warn-toast, no layers created
  - File read error mid-batch → abort that file, continue others
  - Target full mid-batch → abort with toast, keep already-added
- `createNewDocsFromFiles` — 4 cases
  - Single file → 1 new doc
  - Multi-file → N new docs (FIFO add to workspace)
  - Workspace full mid-batch → error toast, keep already-created
  - All files unsupported → warn-toast, no docs created
- `computeCascadePosition` — 4 cases
  - i=0 → exact cursor pos
  - i=4 → (X+96, Y+96) with 24px offset
  - Small doc (200×200) → clamped to bounds
  - Large doc (4000×4000) → no clamping needed
- `isAltPressed` extraction — 2 cases
  - payload.isAltPressed=true → move path
  - payload.isAltPressed=false → copy path
- `validateCrossDocDrop` — 6 cases (one per error code)

**`dragTypes.test.ts`** (~5 tests):
- `LayerDragPayload` JSON roundtrip preserves all fields
- Version 1 schema serialization
- `LAYER_DRAG_MIME` constant is `"application/x-photrez-layer"`
- `DropTarget` discriminated union type guards

**`Toast.test.tsx`** (~5 tests):
- Renders info toast with `role="status"`
- Renders error toast with `role="alert"`
- Auto-dismisses after 3.5s (info)
- Stack max 3 (FIFO eviction)
- Multiple toasts in rapid succession all visible briefly

**`useTauriDragDrop.test.tsx`** (~5 tests):
- `over` event updates state with position
- `drop` event calls handler with paths + position
- `leave`/`cancel` resets state
- Cleanup unlisten on unmount (no leak)

### 9.2 Contract tests (engine↔signal sync)

Append 4 tests to `engine-signal-contract.test.tsx`:
- `addLayerFromCrossDoc` propagates new layer to target doc's `layers()` signal
- `addLayerFromCrossDoc` (Alt) propagates layer removal to source doc's `layers()` signal
- `addFilesAsLayers` updates active doc's `layers()` signal (multi-file batch, all visible)
- `createNewDocsFromFiles` updates `documents()` signal + sets `activeDocumentId` if first doc

### 9.3 Integration tests (CanvasViewport + DocumentTabsBar + LayersPanel)

**`DocumentTabsBar.test.tsx`** (+5 tests):
- `dragenter` on tab starts 500ms timer
- `dragleave` on tab before 500ms cancels timer
- Timer fires → `workspace.switchDocument` called with correct id
- Drop on tab (file) → `addFilesAsLayers` called with target doc + position
- Drop on tab-empty (file) → `createNewDocsFromFiles` called

**`CanvasViewport.test.tsx`** (+3 tests):
- Layer drag drop on canvas → `addLayerFromCrossDoc` called with cursor pos
- File drop on canvas → `addFilesAsLayers` called with cursor pos
- Multi-file drop → cascade positions verified via test spies

**`LayersPanel.test.tsx`** (+3 tests):
- Drop on layers panel (file) → `addFilesAsLayers` with topOfStack target
- Drop on locked layer (layer drag) → no-op (silent)
- Cascade position for multi-file (top of stack + offset 24px per layer)

### 9.4 E2E tests (Playwright)

New `apps/desktop/e2e/cross-doc-drag-drop.spec.ts` (~6 tests):
- Drag layer from doc A to doc B → both docs verified via pixel sampling
- Drop image file (simulated via `setInputFiles` workaround for Tauri drag) → image layer appears at cursor
- Multi-file drop → cascade visible
- Hover tab 500ms → switch happens
- Drop on tab-empty → new doc created
- Drop on invalid zone (tool rail) → no-op + toast for unsupported

### 9.5 Verification pipeline (per AGENTS.md)

```bash
# After implementation:
pnpm --filter photrez-desktop test --run
  # Expected: ~1032 tests pass (982 existing + ~50 new), all green
pnpm run build
  # Expected: tsc + Vite production build, green
pnpm --filter photrez-desktop exec playwright test
  # Expected: ~25 tests pass (19 existing + 6 new)
cargo test --workspace
  # Expected: 92 tests pass (no Rust changes)
pnpm tauri dev
  # Manual: verify all flows in real desktop app
```

---

## 10. Definition of Done

Per `AGENTS.md` (tool creation recipe) — adapted for this feature:

### Code wiring
- [ ] `LayerItem.tsx` — `draggable={!locked}` + `onDragStart` + `onDragEnd` + drag ghost element
- [ ] `DocumentTabsBar.tsx` — drop zone + hover-to-switch timer + drop indicator attributes
- [ ] `CanvasViewport.tsx` — canvas drop zone wrapper overlay
- [ ] `LayersPanel.tsx` — panel-level drop zone (not per-layer)
- [ ] `EmptyWorkspace.tsx` — Tauri `useTauriDragDrop` replaces HTML5 drop
- [ ] `EditorContext.tsx` — provides `DragController` + `showToast` + wires `useTauriDragDrop`
- [ ] `EditorShell.tsx` — mounts `<ToastHost>`
- [ ] `index.css` — drop indicator styles

### Test coverage
- [x] Unit tests: `crossDocLayerOps` (≥30), `dragTypes` (≥5), `Toast` (≥5), `useTauriDragDrop` (≥5)
- [x] Contract tests: 4 new in `engine-signal-contract.test.tsx`
- [x] Integration: `DocumentTabsBar` (+5), `CanvasViewport` (+3), `LayersPanel` (+3)
- [x] E2E: 6 new in `cross-doc-drag-drop.spec.ts`
- [x] 982 existing tests remain green

### Verification
- [x] `pnpm --filter photrez-desktop test --run` green
- [x] `pnpm run build` green
- [x] `pnpm --filter photrez-desktop exec playwright test` green
- [x] `cargo test --workspace` green (no Rust changes)
- [x] Manual QA: `pnpm tauri dev` → all flows verified

### Anti-pattern check (per AGENTS.md)
- [ ] Does feature respond to user interaction? (yes: dragstart, dragover, drop all wired)
- [ ] Does visual feedback show correctly? (yes: drop indicators + countdown)
- [ ] Does cursor change appropriately? (yes: copy/move + not-allowed for invalid)
- [ ] Does history integration work? (yes: per-doc history.commit before mutation)

---

## 11. Out of Scope (Future)

Deferred to future specs (not blocking MVP):

- **Multi-select layer drag** (Q5 deferred) — Shift+Click multi-select, then drag N layers at once
- **Drag from canvas** (when a layer is selected in Move tool) — additional source beyond Layers panel
- **Drag between Photrez windows** — single-window MVP; future multi-window support
- **Custom drag image for OS files** — Tauri limitation; not possible via standard APIs
- **Animated layer landing** — instant drop for MVP; could add subtle scale-in later
- **Drag preview for very large layers** — performance: thumbnail caching for drag ghost
- **Toast for non-drag events** (export complete, etc.) — toast system designed for it, just not wired
- **Keyboard accessibility** for drag — Tab to navigate, Enter to "drop" on focused target (future a11y pass)

---

## 12. References

- Brainstorming conversation (10 questions, 3 architectural approaches)
- `docs/AI_CONTEXT.md` (strict AI rules)
- `docs/AI_CURRENT_TASK.md` (active task tracking)
- `docs/FEATURES.md` (feature registry — to be updated post-implementation)
- `docs/ARCHITECTURE.md` (Photrez runtime reference)
- `AGENTS.md` (Definition of Done + verification pipeline)
- `docs/CONVENTIONS.md` (SolidJS patterns, drag handler recipes)
- `docs/AI_HISTORY.md §[2026-06-14] TEST OVERHAUL` (contract test pattern)
- Tauri 2 docs (Context7): `onDragDropEvent`, `dragDropEnabled`
- MDN: HTML5 Drag and Drop API, File drag and drop
- Photoshop/Affinity Photo/Krita UX conventions (cross-doc layer drag behavior)
