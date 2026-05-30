# Multi-Document Workspace Design

Date: 2026-05-29
Status: Approved for planning, not implemented
Scope: MVP usability recovery

## 1. Summary

Photrez needs a Photoshop/Affinity-style multi-document workspace so the app feels familiar and usable immediately after launch. The current single-document mental model makes the app feel incomplete when opened and does not support a normal workflow where users open several images side by side as separate work items.

This design adds:

- A minimal no-document empty state inside the canvas workspace.
- A persistent document tab strip above the canvas.
- Multi-file open and multi-file drag/drop.
- One independent document session per opened image.
- Backend-owned editor state for all documents.
- Active-document command routing for edit/export/undo/redo.

This is not a webapp onboarding screen. It must feel like a desktop image editor: stable chrome, visible menu/tool/panel structure, compact document tabs, and a quiet canvas-centered invitation to open images.

## 2. Product Goal

Make the first usable workflow obvious:

1. Launch Photrez.
2. See a clear prompt to open an image.
3. Open one or many image files.
4. Work on each image as a separate document tab.
5. Export the active document.

The result should be familiar to Photoshop/Affinity users without copying Adobe branding or visual identity.

## 3. Decisions Locked During Design Discussion

### 3.1 Empty State

Decision: use a minimal canvas empty state.

Behavior:

- The full editor chrome remains visible.
- The document tab strip remains visible but empty.
- The canvas area shows:
  - primary line: `Open an image to start`
  - primary action: `Open Image`
  - hint: `Drop images here or press Ctrl+O`
- No Start dashboard.
- No recent files in MVP.
- No marketing content.

Rationale:

- Feels like a desktop tool, not a webapp.
- Keeps layout stable before and after opening a file.
- Directly supports the MVP open-edit-export recovery goal.

### 3.2 Multi-Document Model

Decision: every opened image becomes a separate document tab.

Behavior:

- Opening one file creates one document tab.
- Opening multiple files creates multiple document tabs.
- Dragging multiple files into the workspace creates multiple document tabs.
- The last successfully opened image becomes the active document.
- The active document controls the canvas, layer panel, history, selected layer, export target, and edit commands.

Non-default behavior:

- Drag/drop does not place images as layers in the active document in MVP.
- `Place Image as Layer` can be added later as an explicit command.

Rationale:

- Matches Photoshop/Affinity expectations for opening multiple files.
- Avoids surprising users by mutating the current document when they intended to open another image.
- Keeps MVP recovery focused on usable document opening and editing.

### 3.3 Drag and Drop

Decision: drag/drop always opens files as new document tabs in MVP.

Behavior:

- Drop onto empty workspace: open each file as a new document tab.
- Drop onto an active canvas: still open each file as a new document tab.
- Unsupported files are rejected per file.
- Valid files still open even if some files fail.

Rationale:

- Consistent input behavior.
- Safe default.
- Clear separation from future place-as-layer workflows.

### 3.4 Close Behavior

Decision: closing dirty documents requires confirmation.

Behavior:

- If document is not dirty, tab close closes immediately.
- If document is dirty, show a desktop-style confirmation:
  - title: `Discard changes?`
  - body: `This document has changes that have not been exported.`
  - buttons: `Discard`, `Cancel`
- `Discard` closes the tab without export.
- `Cancel` keeps the tab open.
- If the active tab is closed and other tabs remain, activate the nearest tab.
- If the final tab is closed, return to the minimal empty state.

Rationale:

- Prevents accidental loss.
- Fits MVP export-only lifecycle where native project save is out of scope.

### 3.5 Export

Decision: export applies only to the active document.

Behavior:

- The existing export button/menu exports only the active document.
- Multi-tab batch export is out of MVP scope.
- `Export All Open Documents` can be a future explicit command.

Rationale:

- Matches the default Photoshop/Affinity mental model.
- Keeps export behavior predictable.

### 3.6 Per-Document State

Decision: each document owns its editor state independently.

Each open document must have independent:

- document data
- layers
- selected layer
- selection
- history undo/redo stack
- dirty flag
- source path/display name
- viewport/render invalidation state where backend-owned

Shortcut behavior:

- `Ctrl+Z` affects the active document only.
- `Ctrl+Y` affects the active document only.
- `Ctrl+O` opens new document tabs.
- Export affects the active document only.
- Brush/crop/transform/layer commands affect the active document only.

Rationale:

- Prevents cross-document state corruption.
- Matches expected editor behavior.
- Keeps Rust backend as source of truth.

### 3.7 No-Document UI

Decision: keep the editor layout stable when no document is open.

Behavior:

- Tool rail remains visible.
- Inspector remains visible.
- Toolbar/status bar remain visible.
- Inspector panels show disabled/empty states.
- Layer panel copy: `No document open`.
- Document-dependent actions are disabled.
- App does not exit when all tabs are closed.

Rationale:

- Stable desktop app feel.
- Avoids web-style onboarding layout shifts.

### 3.8 Document Tab Strip

Decision: document tab strip is always visible.

Behavior:

- Empty workspace: tab strip exists but contains no tabs.
- Open workspace: each document has a compact tab.
- No `Start` tab in MVP.
- Tab label shows filename.
- Dirty document shows a small dirty indicator.
- Close `x` is available on each tab.
- Dimensions are shown in the status bar, not in the tab.

Rationale:

- Stable layout.
- Familiar desktop editor affordance.
- Keeps tabs compact.

### 3.9 Open Document Limit

Decision: MVP supports up to 16 open documents.

Behavior:

- Maximum open document count: `16`.
- If a multi-open request exceeds the limit:
  - valid files are opened until the limit is reached.
  - remaining files are rejected.
  - user sees a summary.
- Error message:
  - `Close a document before opening more images.`

Rationale:

- Keeps memory pressure bounded.
- Protects low-end Windows devices.
- Limit can be raised later after renderer/memory behavior is proven.

### 3.10 Multi-Open Failure Behavior

Decision: use partial success.

Behavior:

- Valid files open.
- Invalid/corrupt/unsupported/over-budget files fail individually.
- A summary appears after the batch:
  - `Opened 8 images. 2 failed.`
- Details include filename and safe reason.
- No console-only failure.

Rationale:

- User should not lose all valid opens because one file is bad.
- Matches practical file workflow.

### 3.11 UI Language

Decision: MVP UI copy remains English.

Rationale:

- Existing i18n strategy locks MVP English-only.
- Photoshop/Affinity familiarity is strongest with common English editor labels.

## 4. Non-Goals

Do not add these while implementing this design:

- Native project save format.
- Recent files list.
- Start dashboard.
- Batch export all open documents.
- Place image as layer.
- Floating native document windows.
- PSD workflow.
- Print checker.
- Plugin runtime.
- AI features.
- Cloud collaboration.

## 5. UX Specification

### 5.1 Launch Without Documents

The app launches into full editor chrome:

- Menubar remains visible.
- Toolbar remains visible.
- Document tab strip is visible and empty.
- Tool rail remains visible.
- Inspector remains visible with empty/disabled content.
- Status bar remains visible.
- Canvas workspace shows the minimal empty state.

Empty state layout:

- Centered in the canvas workspace.
- Compact, not card-heavy.
- Uses desktop editor styling:
  - subtle text
  - one clear primary button
  - dashed or recessed drop target treatment is acceptable if restrained
- Does not use large hero text.
- Does not use marketing copy.
- Does not use a full-screen welcome page.

Copy:

```text
Open an image to start
Drop images here or press Ctrl+O
Open Image
```

### 5.2 Opening Images From Menu/Dialog

Triggers:

- `File > Open Image...`
- `Ctrl+O`
- Empty state `Open Image` button

Dialog requirements:

- Allows multi-select.
- Filters supported image formats.
- Supported import formats should follow `docs/33-file-format-support.md`.
- For each selected file, backend attempts to create a document session.

Result:

- If one or more files open successfully, tabs are added.
- Last successfully opened document becomes active.
- Canvas shows active document pixels.
- Layer panel reflects active document.
- Status bar reflects active document dimensions.
- If no files open successfully, remain in prior state and show error summary.

### 5.3 Drag and Drop

Drop target:

- Whole canvas workspace can accept file drops.
- Empty state communicates drop support.
- Drop feedback should be subtle and desktop-like, not oversized.

Supported behavior:

- One image file: creates one document tab.
- Multiple image files: creates one tab per valid image.
- Drop while a document is active: creates new document tabs, does not place as layer.

Rejected input:

- Folders.
- Unsupported file formats.
- Corrupt files.
- Files exceeding resource limits.
- Files beyond max open document limit.

### 5.4 Document Tab Interaction

Tab anatomy:

- Filename label.
- Dirty indicator when document has unsaved changes after last export.
- Close `x`.

Required interactions:

- Click tab: switch active document.
- Close tab:
  - clean: close immediately.
  - dirty: confirm discard/cancel.
- Overflow:
  - If many tabs are open, tab strip must remain compact.
  - MVP can use horizontal scroll or clipped tab strip with minimum tab width.
  - Do not wrap tabs to multiple rows.

Tab label rules:

- Use basename only, not full path.
- Preserve extension.
- If duplicate filenames are open, disambiguate visually without exposing long paths by default.
- Proposed duplicate label pattern:
  - `image.png`
  - `image.png (2)`
  - `image.png (3)`

### 5.5 Switching Active Documents

Switching document updates:

- active canvas pixels
- artboard dimensions
- layer panel
- selected layer
- selection overlay
- history availability
- dirty indicator
- status bar dimensions
- export target

Switching document must not:

- mutate either document.
- reset another document's history.
- lose selected layer for the previous document.
- trigger cross-document undo/redo.

### 5.6 Inspector Empty State

When no document is open:

- Properties section disabled.
- Layers tab shows `No document open`.
- History tab shows `No document open`.
- Layer add/delete/reorder buttons disabled.
- Export button disabled or shows a clear disabled affordance.

When a document is active:

- Inspector reflects active document session.
- Layer selection is per document.

### 5.7 Export Active Document

Triggers:

- Existing export button.
- Existing export menu/shortcut if present.

Behavior:

- Export dialog opens for active document only.
- Default filename uses active document display name.
- Export success clears dirty state for active document only.
- Export failure leaves dirty state unchanged.
- If no document is active, export action is disabled.

### 5.8 Closing The App Window

If no dirty documents:

- Window closes normally.

If one or more dirty documents:

- MVP minimum: confirm before app exit.
- Suggested copy:
  - title: `Discard changes?`
  - body: `You have open documents with changes that have not been exported.`
  - buttons: `Discard All`, `Cancel`

Optional future refinement:

- Per-document close review list.
- Export prompts per document.

For MVP, do not introduce native project save.

## 6. Backend Architecture

### 6.1 Current Problem

Current backend structure is effectively single-document:

- `EditorState` owns one `Mutex<Document>`.
- `EditorState` owns one `Mutex<HistoryStore>`.
- Commands implicitly mutate that single document.

This does not support Photoshop/Affinity-like multi-document editing.

### 6.2 Target Model

Replace or wrap `EditorState` with `WorkspaceState`.

Conceptual model:

```rust
pub struct WorkspaceState {
    documents: Vec<DocumentSession>,
    active_document_id: Option<String>,
    max_open_documents: usize,
}

pub struct DocumentSession {
    id: String,
    document: Document,
    history: HistoryStore,
    selected_layer_id: Option<String>,
    dirty: bool,
    source_path: Option<PathBuf>,
    display_name: String,
    created_at_ms: u64,
    last_export_path: Option<PathBuf>,
}
```

Notes:

- Exact Rust types can change during implementation.
- Avoid exposing `PathBuf` directly to frontend if not needed.
- Frontend should receive safe display metadata, not sensitive full paths unless explicitly required.

### 6.3 Ownership Boundary

Backend Rust owns:

- open document list
- active document id
- document sessions
- selected layer per document
- dirty state per document
- history per document
- pixel buffers
- import validation
- export logic
- document close rules
- max document limit

Frontend SolidJS owns only presentation/transient state:

- active tool
- panel open/closed state
- modal visibility
- pointer drag/hover state
- zoom/pan viewport state

Viewport state decision:

- MVP can keep zoom/pan in frontend because it is presentation state.
- Store zoom/pan per document id in frontend so switching tabs feels stable.
- If renderer later requires backend viewport state, add a renderer-specific command without making frontend own document truth.

### 6.4 Workspace Snapshot Returned To Frontend

Frontend needs a lightweight snapshot:

```ts
interface WorkspaceSnapshot {
  documents: DocumentTabSummary[];
  activeDocumentId: string | null;
  activeDocument: DocumentSnapshot | null;
  limits: {
    maxOpenDocuments: number;
    openDocuments: number;
  };
}

interface DocumentTabSummary {
  id: string;
  displayName: string;
  isDirty: boolean;
  width: number;
  height: number;
}

interface DocumentSnapshot {
  id: string;
  displayName: string;
  width: number;
  height: number;
  layers: Layer[];
  selectedLayerId: string | null;
  selection: SelectionRect | null;
  dirty: boolean;
}
```

Rules:

- Do not serialize pixel buffers in normal workspace snapshot.
- Keep `pixel_data` skipped in serde as currently intended.
- Renderer gets pixels through backend-renderer path, not frontend JSON payload.

### 6.5 Command Routing

Commands should be one of two classes:

1. Workspace commands:
   - open files
   - close document
   - switch document
   - get workspace state
   - set selected layer

2. Active document commands:
   - add/delete/reorder layer
   - update layer
   - move/transform/crop/resize
   - brush/eraser
   - sample pixel
   - undo/redo
   - export

Active document commands must:

- fail with `E_NOT_FOUND` or `E_VALIDATION` if no active document exists.
- mutate only the active document.
- commit only that document's history before mutation.
- mark only that document dirty.
- invalidate render only for that document.

### 6.6 Render Interaction

Renderer must render the active document.

When active document changes:

- renderer receives/upload active document layer textures.
- prior active document textures can be retained if cache design supports it, but this is optional.
- simplest MVP path can re-upload active document layers on switch.

When active document mutates:

- only active document dirty layers should be marked.
- brush/eraser must mark changed layer dirty.
- crop/resize/transform must mark affected document/layers dirty.

Renderer test failure is already listed in `docs/38-usable-mvp-recovery-plan.md`; implementation must not claim completion until render crate tests and visual smoke are green.

## 7. Proposed Command Contract Additions

Exact naming can be adjusted during implementation, but this design recommends explicit workspace commands.

### 7.1 `get_workspace_state`

Purpose:

- Return tabs, active document metadata, and active document snapshot.

Request:

```json
{}
```

Success:

```json
{
  "documents": [],
  "activeDocumentId": null,
  "activeDocument": null,
  "limits": {
    "maxOpenDocuments": 16,
    "openDocuments": 0
  }
}
```

### 7.2 `open_images`

Purpose:

- Open one or more image file paths as document tabs.

Request:

```json
{
  "paths": ["C:\\Users\\Example\\Pictures\\image.png"]
}
```

Success:

```json
{
  "workspace": {},
  "summary": {
    "opened": 1,
    "failed": 0,
    "failures": []
  }
}
```

Partial success:

```json
{
  "workspace": {},
  "summary": {
    "opened": 8,
    "failed": 2,
    "failures": [
      {
        "path": "bad-file.png",
        "code": "E_VALIDATION",
        "message": "File appears to be damaged."
      }
    ]
  }
}
```

Rules:

- Partial success still returns `ok: true` if at least one file opens.
- If no files open, return `ok: false`.
- Do not mutate existing open documents when an individual file fails.
- Do not exceed `MAX_OPEN_DOCUMENTS`.

### 7.3 `switch_document`

Purpose:

- Set active document.

Request:

```json
{
  "documentId": "doc-..."
}
```

Error:

- `E_NOT_FOUND` if the id is not open.

### 7.4 `close_document`

Purpose:

- Close a document tab.

Request:

```json
{
  "documentId": "doc-...",
  "discardChanges": false
}
```

Rules:

- If dirty and `discardChanges` is false, return `E_CONFLICT`.
- If dirty and `discardChanges` is true, close.
- If clean, close.
- Response includes updated workspace snapshot.

Error example:

```json
{
  "code": "E_CONFLICT",
  "message": "Document has changes that have not been exported.",
  "details": {
    "documentId": "doc-...",
    "requiresDiscardConfirmation": true
  }
}
```

### 7.5 `set_selected_layer`

Purpose:

- Store selected layer in backend for active document.

Request:

```json
{
  "layerId": "layer-..."
}
```

Rules:

- `layerId` can be `null` to clear selection.
- Fail if no active document.
- Fail if target layer id does not exist in active document.

### 7.6 Active Document Command Migration

Existing commands should be migrated to route through active document:

- `get_document_state` becomes compatibility alias for active document or is replaced by `get_workspace_state`.
- `add_layer`
- `delete_layer`
- `reorder_layer`
- `update_layer`
- `undo`
- `redo`
- `create_selection`
- `clear_selection`
- `select_all`
- `move_layer`
- `transform_layer`
- `crop_canvas`
- `resize_canvas`
- `draw_brush_stroke`
- `export_document`
- `sample_pixel`
- `trigger_render`

Compatibility approach:

- Keep existing names where practical to reduce frontend churn.
- Update internals to operate on active document.
- Add workspace-aware commands for new multi-document behaviors.
- Update `get_contract_info` to include all active commands.
- Update `docs/15-command-contract-spec.md` before or during implementation.

## 8. Error Handling

### 8.1 Standard Error Cases

| Scenario | Code | User message |
| --- | --- | --- |
| No active document for edit/export | `E_NOT_FOUND` | `Open an image first.` |
| Open document limit reached | `E_RESOURCE_LIMIT` | `Close a document before opening more images.` |
| Unsupported file format | `E_VALIDATION` | `Cannot open this file type.` |
| Corrupt image file | `E_VALIDATION` | `File appears to be damaged.` |
| Image too large | `E_RESOURCE_LIMIT` | `Image exceeds maximum size. Try a smaller image.` |
| Dirty close without discard | `E_CONFLICT` | `Document has changes that have not been exported.` |
| Export with no active document | `E_NOT_FOUND` | `Open an image before exporting.` |
| Export write failure | `E_IO` | `Cannot save file. Check destination path and try again.` |

### 8.2 Partial Open Summary

User-facing summary:

```text
Opened 8 images. 2 failed.
```

Failure detail examples:

```text
bad-file.png: File appears to be damaged.
huge.tif: Image exceeds maximum size. Try a smaller image.
```

Do not display raw Rust decoder errors directly to the user.

### 8.3 Console-Only Failures Are Not Acceptable

Any open/export/close failure must produce visible UI feedback.

This specifically fixes a current usability gap where some errors are only logged to console.

## 9. Frontend UI Design

### 9.1 Layout Placement

Document tab strip should sit:

- below menu/toolbar chrome.
- above canvas viewport/rulers.
- within the canvas/workspace region.

It should not look like browser tabs.

Desktop visual traits:

- compact height around 28-34px.
- crisp 1px borders.
- active tab visually connected to canvas region.
- no pill-style large web tabs.
- no rounded marketing cards.
- no gradient/glass effects.

### 9.2 Empty State Styling

The empty state should be quiet:

- small centered group.
- primary action button.
- optional dashed/recessed drop target boundary.
- muted secondary hint.

Avoid:

- hero-sized type.
- large illustrated welcome panel.
- recent project grid.
- card-heavy dashboard composition.
- onboarding checklist.

### 9.3 Inspector No-Document State

Layer tab:

```text
No document open
```

Properties:

```text
Open an image to edit properties.
```

History:

```text
No document open
```

Controls should be visibly disabled but still aligned in the existing panel structure.

### 9.4 Tab Overflow

MVP acceptable options:

- Horizontal scroll in tab strip.
- Fixed min/max width with clipped filename and title tooltip.

Do not:

- wrap tabs to multiple rows.
- resize main chrome height.
- use a web-style dropdown as primary tab navigation.

### 9.5 Keyboard and Menu

Keep or add:

- `Ctrl+O`: open images.
- `Ctrl+W`: close active document.
- `Ctrl+Tab`: optional document switch forward.
- `Ctrl+Shift+Tab`: optional document switch backward.
- `Ctrl+S`: existing decision says open export dialog.

If adding `Ctrl+Tab` or `Ctrl+Shift+Tab`, update `docs/32-keyboard-shortcut-map.md`.

## 10. Backend Implementation Plan

This section is not the final task breakdown, but it defines implementation order.

### Phase 1 - Core Workspace Model

Targets:

- Introduce `DocumentSession`.
- Introduce `WorkspaceState`.
- Move current single document/history into one default session model.
- Remove default background document on launch if no image is open.
- Support `active_document_id: Option<String>`.
- Add `MAX_OPEN_DOCUMENTS = 16`.

Acceptance:

- App can represent zero open documents.
- App can represent multiple document sessions.
- Existing core tests still pass or are migrated.

### Phase 2 - Workspace Commands

Targets:

- Add `get_workspace_state`.
- Add `open_images`.
- Add `switch_document`.
- Add `close_document`.
- Add `set_selected_layer`.
- Update `get_contract_info`.
- Update command contract docs.

Acceptance:

- Opening two valid images produces two document sessions.
- Active document is the last opened valid image.
- Switching active document changes returned active snapshot.
- Closing dirty document without discard returns `E_CONFLICT`.
- Closing clean document succeeds.

### Phase 3 - Active Document Command Migration

Targets:

- Route all edit commands through active document.
- Ensure each document owns independent `HistoryStore`.
- Ensure dirty state changes per document.
- Ensure selected layer is per document.
- Ensure export only uses active document.
- Ensure no-active-document errors are deterministic.

Acceptance:

- `Ctrl+Z` affects only active document.
- Export affects only active document.
- Editing document A does not mutate document B.
- Dirty indicator updates per document.

### Phase 4 - Frontend Workspace UI

Targets:

- Replace single document signals with workspace snapshot signals.
- Add document tab strip.
- Add empty canvas state.
- Add no-document inspector states.
- Wire open dialog multi-select.
- Wire drag/drop multi-file.
- Wire switch/close tab.
- Add discard confirmation.
- Show open summary/errors.

Acceptance:

- Empty app shows minimal empty state.
- Opening two images shows two tabs.
- Clicking tabs updates canvas/layers/status.
- Close dirty tab prompts.
- All tabs closed returns to empty state.

### Phase 5 - Renderer Integration

Targets:

- Render active document only.
- Re-upload or switch layer textures on active document change.
- Mark dirty document/layers correctly.
- Fix current `photrez-render` test failure.
- Verify imported image pixels are visible.

Acceptance:

- Imported image pixels are visible, not placeholder rectangles.
- Switching documents changes visible canvas pixels.
- Brush/eraser changes are visible after stroke.
- `cargo test -p photrez-render --lib` passes.

### Phase 6 - Verification and Docs

Targets:

- Update `FEATURES.md`.
- Update `ARCHITECTURE.md`.
- Update `AI_HISTORY.md`.
- Update `docs/27-key-user-flows.md`.
- Update `docs/34-save-and-document-lifecycle.md`.
- Update `docs/15-command-contract-spec.md`.
- Add tests.
- Run gates.

Acceptance:

- `pnpm.cmd run build` passes.
- `pnpm.cmd --filter photrez-desktop test` passes.
- `cargo test -p photrez-core` passes.
- `cargo test -p photrez-render --lib` passes.
- `cargo test --workspace` passes.
- Manual open-edit-export smoke passes with two images.

## 11. Test Plan

### 11.1 Rust Core / Workspace Tests

Add tests for:

- empty workspace starts with no active document.
- opening one image creates one session.
- opening two images creates two sessions.
- active document is last successful open.
- max 16 documents enforced.
- partial success opens valid files and reports invalid files.
- switch document changes active id.
- close clean document succeeds.
- close dirty document without discard fails.
- close dirty document with discard succeeds.
- closing active document activates nearest remaining document.
- closing final document returns active id to `None`.
- selected layer is per document.
- undo/redo is per document.
- dirty state is per document.

### 11.2 Shell Command Contract Tests

Add tests for:

- `get_workspace_state` empty response shape.
- `open_images` success response shape.
- `open_images` partial success response shape.
- `switch_document` invalid id returns `E_NOT_FOUND`.
- `close_document` dirty conflict returns `E_CONFLICT`.
- active document edit command with no active document returns deterministic error.
- all command responses include `contract_version`.
- `get_contract_info` lists workspace commands.

### 11.3 Frontend Tests

Add Vitest tests for:

- empty state visible when no active document.
- document tab strip visible when empty.
- layer panel shows `No document open`.
- open summary renders partial success.
- tabs render filename and dirty indicator.
- active tab controls displayed layers.
- export disabled when no active document.
- close dirty tab opens confirmation.
- discard close removes tab.
- all tabs closed returns empty state.

### 11.4 Renderer / Visual Smoke

Required manual or automated smoke:

1. Launch app.
2. Verify empty state.
3. Open two real image fixtures.
4. Confirm two tabs appear.
5. Confirm active tab displays actual pixels.
6. Switch tab and confirm pixels change.
7. Draw visible brush stroke on one document.
8. Switch away and back, confirm stroke remains.
9. Undo/redo stroke on active document only.
10. Export active document.
11. Verify exported image includes expected pixels.

### 11.5 Performance Checks

Measure after implementation:

- startup with no document.
- idle RAM with no document.
- idle RAM with one image.
- idle RAM with several images, at least 4 typical-size files.
- startup remains under 2s.
- idle RAM target remains under 250 MB for baseline scenario.

If 16 open documents can exceed idle RAM budget, document the scenario clearly and keep the 16-document cap guarded by per-image memory budget.

## 12. Data and Memory Guardrails

### 12.1 Existing Guardrails To Preserve

- `MAX_PIXEL_BUDGET` per document/layer set must still apply.
- Pixel data should not serialize through frontend JSON snapshots.
- Unsupported/corrupt files must fail closed.

### 12.2 New Workspace Guardrails

- `MAX_OPEN_DOCUMENTS = 16`.
- Optional future guard: total workspace decoded pixel budget.

Recommendation:

- Keep current per-document pixel budget.
- Add workspace-level memory tracking if implementation shows high RAM risk.
- At minimum, expose current open document count and max count in workspace snapshot.

## 13. Dirty State Rules

A document becomes dirty when:

- layer added/deleted/reordered/updated.
- brush/eraser stroke committed.
- crop/resize applied.
- transform applied.
- selection mutation affects document state if persisted.
- imported image session is edited after open.

A document becomes clean when:

- it is newly opened and not edited yet.
- export succeeds.
- undo returns to the last clean snapshot, if clean tracking supports this.

MVP acceptable simplification:

- Newly opened document starts clean.
- Any edit sets dirty.
- Successful export clears dirty.
- Undo does not need to clear dirty even if state returns to original, unless straightforward.

The simplification must be documented if chosen.

## 14. File Targets Likely To Change During Implementation

Expected backend files:

- `apps/desktop/src-tauri/src/main.rs`
- `crates/core/src/document.rs`
- `crates/core/src/history.rs`
- possible new file: `crates/core/src/workspace.rs`
- possible new tests in core workspace module

Expected frontend files:

- `apps/desktop/src/App.tsx`
- `apps/desktop/src/index.css`
- `apps/desktop/src/__tests__/*.test.ts`

Expected docs:

- `docs/15-command-contract-spec.md`
- `docs/27-key-user-flows.md`
- `docs/34-save-and-document-lifecycle.md`
- `docs/FEATURES.md`
- `docs/ARCHITECTURE.md`
- `docs/AI_CURRENT_TASK.md`
- `docs/AI_HISTORY.md`
- `docs/32-keyboard-shortcut-map.md` if tab-switch shortcuts are added

## 15. Risk Register

### R1 - Scope Growth Into Full Document Management

Risk:

- Multi-document tabs can pull in save-as, recent files, floating windows, and batch export.

Mitigation:

- Keep MVP export-only.
- No recent files.
- No floating windows.
- No batch export.
- No native project format.

### R2 - Frontend Accidentally Owns Document Truth

Risk:

- Fast UI implementation could duplicate documents/layers in frontend state.

Mitigation:

- Backend owns `WorkspaceState`.
- Frontend only consumes `WorkspaceSnapshot`.
- Pixel buffers never serialize through frontend.

### R3 - Renderer Still Does Not Show Real Pixels

Risk:

- Multi-document UI could be built while the main usability blocker remains.

Mitigation:

- P1 recovery remains pixel viewport.
- Multi-document work is not complete until actual image pixels render per active tab.

### R4 - Memory Budget Regression

Risk:

- 16 documents with large images can exceed target device memory.

Mitigation:

- Keep per-document decoded budget.
- Add max open document count.
- Consider workspace total budget if needed.
- Re-measure performance after implementation.

### R5 - Command Contract Drift

Risk:

- Existing commands may keep single-document names while semantics change to active document.

Mitigation:

- Update command contract docs.
- Add contract tests.
- Keep compatibility names only when semantics are clear.

## 16. Acceptance Criteria

This design is implemented only when all criteria pass:

- Launching app with no files shows minimal empty state.
- Editor chrome remains stable with no document open.
- Document tab strip is always visible.
- `Open Image` supports multi-select.
- Drag/drop supports multiple files.
- Each valid opened image becomes a separate document tab.
- Last successfully opened image becomes active.
- Active document controls canvas, layers, selected layer, history, and export.
- `Ctrl+Z` and `Ctrl+Y` affect only active document.
- Export exports only active document.
- Closing dirty tab prompts `Discard` / `Cancel`.
- Closing final tab returns to empty state.
- Max 16 open documents is enforced.
- Multi-open partial success produces visible summary.
- No-document layer panel shows `No document open`.
- Actual imported pixels are visible in viewport.
- Exported active document matches visible edited output.
- Required tests pass.

## 17. Documentation Updates Required During Implementation

Update these docs before marking the implementation complete:

- `docs/15-command-contract-spec.md`
- `docs/27-key-user-flows.md`
- `docs/34-save-and-document-lifecycle.md`
- `docs/FEATURES.md`
- `docs/ARCHITECTURE.md`
- `docs/AI_CURRENT_TASK.md`
- `docs/AI_HISTORY.md`
- `docs/38-usable-mvp-recovery-plan.md`

If any command schema breaks compatibility, update:

- `docs/05-adr/0002-command-contract-versioning.md`

If tab-switch shortcuts are added, update:

- `docs/32-keyboard-shortcut-map.md`

## 18. Implementation Gate

Do not start implementation until:

- This design is reviewed and approved by the user.
- A phase-by-phase implementation plan is written.
- Test strategy is mapped to file targets.
- Current unrelated dirty worktree changes are reviewed so implementation does not overwrite them.

## 19. Open Design Questions

No blocking product questions remain from the design discussion.

Implementation can still decide:

- exact Rust module/file split.
- exact command names if contract docs are updated first.
- tab overflow mechanics: horizontal scroll vs clipped tabs.
- whether dirty undo can clear dirty state when returning to last exported state.

These are implementation details, not product blockers.
