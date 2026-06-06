# Transform Session Hardening + Contextual Option Bar impl Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Harden the existing layer transform session so undo/cancel/tool-switch/document-switch behavior is correct, then replace the normal Move option bar with a contextual Transform option bar while a resize/rotate session is active.

**Architecture:** Keep document truth in the existing TypeScript `DocumentEngine`; transform session state remains frontend UI state, but it must carry enough identity and snapshot data to safely commit or cancel against the correct document. Introduce a dedicated session lifecycle helper and a contextual `TransformOptionBar` so active transform sessions cannot accidentally mix with Move-only actions such as Auto Select, Align, Flip, or normal Reset.

**Tech Stack:** SolidJS signals/components, TypeScript `DocumentEngine`, `WorkspaceManager`, `CommandHistory`, existing `EditableNumField`/`NumField` primitives, Vitest, Vite.

## Scope Contract

- Fix the existing session safety gaps:
  - Store `documentId` in `LayerTransformSession`.
  - Store the full `originalSnapshot`, not only `originalTransform`.
  - Commit session using the captured snapshot as the undo entry.
  - Cancel session by restoring the captured snapshot.
  - Prevent Apply/Cancel from affecting the wrong document.
  - Resolve session before tool switch, tab switch, tab close, layer delete, undo/redo, and option-bar actions that are not transform-session controls.
- Add contextual Transform Option Bar:
  - When no transform session is active, keep `MoveOptionBar` behavior unchanged.
  - When a layer transform session is active, render `TransformOptionBar` instead of the normal Move controls.
  - Transform bar includes compact controls for `X`, `Y`, `W`, `H`, `R`, ratio lock, Reset Preview, Apply, and Cancel.
  - Do not expose Auto Select, hovered target badge, Align, Flip, or ordinary Reset while transform session is active.
- Keep Crop separate:
  - Do not merge crop state into layer transform state.
  - Crop tool continues using its own option bar and Enter/Esc behavior.

## File Structure

- Modify `apps/desktop/src/components/editor/editorState.ts`: update `LayerTransformSession` to include `documentId`, `originalSnapshot`, and ratio-lock preview state.
- Modify `apps/desktop/src/components/editor/EditorContext.tsx`: expose any additional session actions/state if needed.
- Modify `apps/desktop/src/components/editor/transformSession.ts`: replace transform-only snapshot helper with full lifecycle helpers.
- Modify `apps/desktop/src/components/editor/useSelectionTransformDrag.ts`: create sessions with `documentId` and full snapshot, use ratio lock state for resize.
- Modify `apps/desktop/src/components/editor/useCanvasKeyboard.ts`: route Enter/Escape through hardened helpers.
- Modify `apps/desktop/src/components/editor/OptionBar.tsx`: switch to `TransformOptionBar` while a transform session is active.
- Add `apps/desktop/src/components/editor/TransformOptionBar.tsx`: contextual transform session controls.
- Modify `apps/desktop/src/components/editor/MoveOptionBar.tsx`: remove session Apply/Cancel controls and keep normal Move-only controls.
- Modify `apps/desktop/src/components/editor/LeftToolRail.tsx`: cancel active layer transform session before switching away from Move/Selection.
- Modify `apps/desktop/src/components/editor/DocumentTabsBar.tsx`: cancel active layer transform session before switching/closing tabs.
- Modify `apps/desktop/src/components/editor/LayersPanel.tsx`: cancel active layer transform session before layer delete, reorder, undo, redo, lock/visibility changes that affect the active layer.
- Modify `apps/desktop/src/components/editor/AppTitleBar.tsx`: cancel active layer transform session before global undo/redo.
- Modify `apps/desktop/src/components/editor/BottomStatusBar.tsx`: update status text for contextual bar semantics.
- Add or update tests under `apps/desktop/src/components/editor/__tests__/`.

## UX Contract

### Normal Move Option Bar

Visible when `activeTool()` is `move` or `selection` and `layerTransformSession()` is null.

Controls:
- Tool label
- Auto Select toggle
- Snap toggle
- Hover target badge
- X/Y fields
- W/H display
- R field
- Align controls
- Flip controls
- Reset

### Transform Option Bar

Visible when `layerTransformSession()` is not null.

Controls:
- Session label: `Transform`
- Mode badge: `Resize` or `Rotate`
- X/Y editable fields
- W/H editable fields
- R editable field
- Ratio lock toggle
- Reset Preview
- Apply
- Cancel

Rules:
- Enter maps to Apply.
- Esc maps to Cancel.
- Reset Preview restores the captured snapshot transform, but keeps the session active.
- Ratio lock affects drag resize and typed W/H changes during this session only.
- Apply writes one undo entry: the captured original snapshot.
- Cancel restores the captured original snapshot and writes no undo entry.

## Task 1: Strengthen Session Type And Helpers

- Modify: `apps/desktop/src/components/editor/editorState.ts`
- Modify: `apps/desktop/src/components/editor/transformSession.ts`
- Test: `apps/desktop/src/components/editor/__tests__/transformSession.test.ts`

- [ ] **Step 1: Update `LayerTransformSession`.**

In `editorState.ts`, import `DocumentModel`:

```ts
import type { LayerNode, DocumentTabSummary, Transform2D, DocumentModel } from "@/engine/types";
```

Replace the session type with:

```ts
export interface LayerTransformSession {
  documentId: string;
  layerId: string;
  originalSnapshot: DocumentModel;
  originalTransform: Transform2D;
  mode: "resize" | "rotate";
  lockRatio: boolean;
  startedAt: number;
}
```

- [ ] **Step 2: Replace `transformSession.ts` with full lifecycle helpers.**

Use this shape:

```ts
import type { DocumentModel, Transform2D } from "@/engine/types";
import type { LayerTransformSession } from "./editorState";

export interface TransformSessionEngine {
  getId(): string;
  snapshot(): DocumentModel;
  restore(snapshot: DocumentModel): void;
  getLayer(id: string): { id: string; transform: Transform2D } | null | undefined;
  transformLayer(id: string, transform: Partial<Transform2D>): void;
}

export interface TransformSessionHistory {
  commit(snapshot: DocumentModel): void;
}

export function isSessionForEngine(
  session: LayerTransformSession | null,
  engine: TransformSessionEngine | null | undefined
): session is LayerTransformSession {
  return Boolean(session && engine && session.documentId === engine.getId());
}

export function commitLayerTransformSession(
  session: LayerTransformSession | null,
  engine: TransformSessionEngine | null | undefined,
  history: TransformSessionHistory | null | undefined
): boolean {
  if (!session || !engine || !history) return false;
  if (!isSessionForEngine(session, engine)) return false;
  const layer = engine.getLayer(session.layerId);
  if (!layer) return true;
  history.commit(session.originalSnapshot);
  return true;
}

export function cancelLayerTransformSession(
  session: LayerTransformSession | null,
  engine: TransformSessionEngine | null | undefined
): boolean {
  if (!session || !engine) return false;
  if (!isSessionForEngine(session, engine)) return false;
  engine.restore(session.originalSnapshot);
  return true;
}

export function resetLayerTransformPreview(
  session: LayerTransformSession | null,
  engine: TransformSessionEngine | null | undefined
): boolean {
  if (!session || !engine) return false;
  if (!isSessionForEngine(session, engine)) return false;
  engine.transformLayer(session.layerId, session.originalTransform);
  return true;
}
```

- [ ] **Step 3: Rewrite helper tests.**

Update `transformSession.test.ts` to verify:

```ts
it("commits the captured original snapshot, not a mutated preview snapshot", () => {
  const history = { commit: vi.fn() };
  const originalSnapshot = makeSnapshot({ dirty: false, transform: original });
  const engine = makeEngine({ id: "doc-1", transform: preview });

  const ok = commitLayerTransformSession(
    makeSession({ documentId: "doc-1", originalSnapshot, originalTransform: original }),
    engine,
    history
  );

  expect(ok).toBe(true);
  expect(history.commit).toHaveBeenCalledWith(originalSnapshot);
});
```

Also test:
- `cancelLayerTransformSession` calls `engine.restore(originalSnapshot)`.
- `resetLayerTransformPreview` calls `engine.transformLayer(layerId, originalTransform)` and keeps history untouched.
- Helpers return `false` when `session.documentId !== engine.getId()`.

- [ ] **Step 4: Run targeted tests.**

```powershell
pnpm.cmd --filter photrez-desktop test -- transformSession
```

Expected result: helper tests pass.

## Task 2: Start Sessions With Document Identity And Full Snapshot

- Modify: `apps/desktop/src/components/editor/useSelectionTransformDrag.ts`
- Test: `apps/desktop/src/components/editor/__tests__/SelectionTransformOverlay.test.ts`

- [ ] **Step 1: Capture document ID and full snapshot on resize/rotate pointer down.**

In `handlePointerDown`, replace session creation with:

```ts
const originalSnapshot = engine.snapshot();
setLayerTransformSession({
  documentId: engine.getId(),
  layerId: layer.id,
  originalSnapshot,
  originalTransform: { ...layer.transform },
  mode: type === "rotate" ? "rotate" : "resize",
  lockRatio: e.shiftKey,
  startedAt: Date.now(),
});
```

Keep direct body Move unchanged: it should still `history.commit(engine.snapshot())` before mutation.

- [ ] **Step 2: Do not overwrite an existing session for another document or layer.**

Before starting a new session:

```ts
const existing = layerTransformSession();
if (existing && (existing.documentId !== engine.getId() || existing.layerId !== layer.id)) {
  return;
}
```

This prevents accidental cross-document/session mixing. Higher-level tool/tab handlers will cancel before navigation in later tasks.

- [ ] **Step 3: Update Escape during active pointer drag.**

Replace transform-only revert with:

```ts
const session = layerTransformSession();
if (session?.documentId === engine.getId() && session.layerId === layer.id) {
  engine.restore(session.originalSnapshot);
  setLayerTransformSession(null);
} else {
  engine.transformLayer(layer.id, drag.startTransform);
}
scheduler.requestRender();
```

- [ ] **Step 4: Add regression tests.**

In `SelectionTransformOverlay.test.ts`, add tests for:
- Resize handle pointerdown creates a session with `documentId` and `originalSnapshot`.
- Move body pointerdown does not create a session.
- Escape during active resize restores original snapshot and clears session.

- [ ] **Step 5: Verify.**

```powershell
pnpm.cmd --filter photrez-desktop test -- SelectionTransformOverlay
pnpm.cmd run build
```

Expected result: overlay tests and build pass.

## Task 3: Add Session Resolution At Navigation And Destructive UI Boundaries

- Modify: `apps/desktop/src/components/editor/LeftToolRail.tsx`
- Modify: `apps/desktop/src/components/editor/DocumentTabsBar.tsx`
- Modify: `apps/desktop/src/components/editor/AppTitleBar.tsx`
- Modify: `apps/desktop/src/components/editor/LayersPanel.tsx`
- Test: add focused component tests if harness exists; otherwise verify with build and manual smoke.

- [ ] **Step 1: Add a small local cancel helper pattern.**

Use this in each component that needs cleanup:

```ts
const cancelActiveTransformSession = () => {
  const engine = workspace.getActiveEngine();
  if (cancelLayerTransformSession(layerTransformSession(), engine)) {
    setLayerTransformSession(null);
    scheduler.requestRender();
  }
};
```

- [ ] **Step 2: Cancel before tool switching.**

In `LeftToolRail.tsx`, destructure `workspace`, `layerTransformSession`, and `setLayerTransformSession`.

Before `setActiveTool(id)`:

```ts
if (layerTransformSession() && id !== "move" && id !== "selection") {
  cancelActiveTransformSession();
}
```

Then switch the tool. This matches the plan contract: tool switch away from transform context cancels the preview.

- [ ] **Step 3: Cancel before tab switch/close/new tab.**

In `DocumentTabsBar.tsx`, cancel active session before:
- `workspace.switchDocument(id)`
- `workspace.removeDocument(id)`
- `workspace.addDocument(session)`

Do this before changing active document so the helper still targets the correct active engine.

- [ ] **Step 4: Cancel before global undo/redo.**

In `AppTitleBar.tsx`, cancel active transform session before document `undo` or `redo`. If a session is active and user clicks Undo, prefer cancel and return early:

```ts
if (cancelActiveTransformSession()) return;
```

This avoids putting preview state into redo incorrectly.

- [ ] **Step 5: Cancel before layer operations that can invalidate the active layer/session.**

In `LayersPanel.tsx`, cancel active transform session before:
- delete layer
- reorder layer
- lock/unlock active layer
- visibility change for active layer
- layer-panel undo/redo

Use exact handler names found in the file; do not add a broad global effect that cancels during harmless layer list sync.

- [ ] **Step 6: Verify.**

```powershell
pnpm.cmd run build
pnpm.cmd --filter photrez-desktop test -- LayersPanel
```

Expected result: build passes and existing LayersPanel tests still pass.

## Task 4: Introduce Contextual Transform Option Bar

- Add: `apps/desktop/src/components/editor/TransformOptionBar.tsx`
- Modify: `apps/desktop/src/components/editor/OptionBar.tsx`
- Modify: `apps/desktop/src/components/editor/MoveOptionBar.tsx`
- Test: add `apps/desktop/src/components/editor/__tests__/TransformOptionBar.test.tsx`

- [ ] **Step 1: Create `TransformOptionBar.tsx`.**

Build a compact bar with:

```tsx
export function TransformOptionBar() {
  const {
    workspace,
    scheduler,
    activeLayerId,
    layerTransformSession,
    setLayerTransformSession,
  } = useEditor();

  const session = () => layerTransformSession();
  const engine = () => workspace.getActiveEngine();
  const activeLayer = () => {
    const current = engine();
    const id = activeLayerId();
    return current && id ? current.getLayer(id) || null : null;
  };
}
```

Render controls in this order:
- Label pill: `Transform`
- Mode badge from `session()?.mode`
- `EditableNumField` X
- `EditableNumField` Y
- `EditableNumField` W
- `EditableNumField` H
- `EditableNumField` R
- `ToggleBtn` ratio lock
- `Reset Preview`
- `Apply`
- `Cancel`

- [ ] **Step 2: Implement Apply/Cancel/Reset handlers.**

Use hardened helpers:

```ts
const apply = () => {
  const current = engine();
  const history = workspace.getActiveHistory();
  if (commitLayerTransformSession(session(), current, history)) {
    setLayerTransformSession(null);
    scheduler.requestRender();
  }
};

const cancel = () => {
  const current = engine();
  if (cancelLayerTransformSession(session(), current)) {
    setLayerTransformSession(null);
    scheduler.requestRender();
  }
};

const resetPreview = () => {
  const current = engine();
  if (resetLayerTransformPreview(session(), current)) {
    scheduler.requestRender();
  }
};
```

- [ ] **Step 3: Implement editable X/Y/R preview fields.**

For X/Y/R submit:

```ts
const updateTransform = (patch: Partial<Transform2D>) => {
  const current = engine();
  const currentSession = session();
  if (!current || !currentSession) return;
  const layer = current.getLayer(currentSession.layerId);
  if (!layer || layer.locked) return;
  current.transformLayer(currentSession.layerId, { ...layer.transform, ...patch });
  scheduler.requestRender();
};
```

Do not call `history.commit` in these field handlers. They are session previews only.

- [ ] **Step 4: Implement editable W/H preview fields.**

Convert width/height to scale:

```ts
const setPreviewWidth = (nextWidth: number) => {
  const current = engine();
  const currentSession = session();
  if (!current || !currentSession) return;
  const layer = current.getLayer(currentSession.layerId);
  if (!layer || layer.locked || layer.width <= 0) return;
  const nextScaleX = nextWidth / layer.width;
  const next: Partial<Transform2D> = { scaleX: nextScaleX };
  if (currentSession.lockRatio && layer.height > 0) {
    const ratioScale = Math.sign(layer.transform.scaleY || 1) * Math.abs(nextScaleX);
    next.scaleY = ratioScale;
  }
  current.transformLayer(currentSession.layerId, next);
  scheduler.requestRender();
};
```

Mirror for height using `scaleY = nextHeight / layer.height`. Clamp invalid values:

```ts
if (!Number.isFinite(nextWidth) || nextWidth <= 0) return;
```

- [ ] **Step 5: Implement ratio lock toggle.**

In `editorState.ts`, `LayerTransformSession` has `lockRatio`.

Update the session immutably:

```ts
const setLockRatio = (next: boolean) => {
  const currentSession = session();
  if (!currentSession) return;
  setLayerTransformSession({ ...currentSession, lockRatio: next });
};
```

- [ ] **Step 6: Route `OptionBar.tsx`.**

Import `TransformOptionBar` and destructure `layerTransformSession`.

Render:

```tsx
<Show when={layerTransformSession()} fallback={
  <>
    <Show when={activeTool() === "move" || activeTool() === "selection"}>
      <MoveOptionBar />
    </Show>
    <Show when={activeTool() === "crop"}>
      <CropOptionBar />
    </Show>
    <Show when={activeTool() === "brush" || activeTool() === "eraser"}>
      <BrushOptionBar />
    </Show>
  </>
}>
  <TransformOptionBar />
</Show>
```

- [ ] **Step 7: Remove session controls from `MoveOptionBar.tsx`.**

Delete `applyTransformSession`, `cancelTransformSession`, and the `<Show when={layerTransformSession()}>` Apply/Cancel block. Normal Move bar should not know about transform sessions.

- [ ] **Step 8: Add component tests.**

Create `TransformOptionBar.test.tsx` with tests for:
- renders `Transform`, mode badge, Apply, Cancel when session exists.
- Apply calls `history.commit(originalSnapshot)` and clears session.
- Cancel calls `engine.restore(originalSnapshot)` and clears session.
- Editing X/Y/R calls `engine.transformLayer` and does not call history.
- `OptionBar` renders `TransformOptionBar` instead of `MoveOptionBar` during session.

- [ ] **Step 9: Verify.**

```powershell
pnpm.cmd --filter photrez-desktop test -- TransformOptionBar
pnpm.cmd run build
```

Expected result: component tests and build pass.

## Task 5: Wire Ratio Lock Into Drag Resize

- Modify: `apps/desktop/src/components/editor/useSelectionTransformDrag.ts`
- Test: update transform drag tests

- [ ] **Step 1: Use session ratio lock in resize.**

In the resize branch, replace direct `e.shiftKey` with:

```ts
const session = layerTransformSession();
const lockRatio = session?.layerId === layer.id && session.documentId === workspace.getActiveEngine()?.getId()
  ? session.lockRatio || e.shiftKey
  : e.shiftKey;
```

Pass `lockRatio` into `applyResizeHandle`:

```ts
const newTransform = applyResizeHandle(
  drag.startTransform,
  layer.width,
  layer.height,
  drag.type,
  dx,
  dy,
  lockRatio,
  e.altKey
);
```

- [ ] **Step 2: Initialize ratio lock from modifier or default.**

Default `lockRatio` should be `false` for free resize unless user starts with Shift or toggles it in the Transform Option Bar:

```ts
lockRatio: e.shiftKey,
```

- [ ] **Step 3: Add tests.**

Add tests that:
- session starts with `lockRatio: false` for normal resize pointerdown.
- session starts with `lockRatio: true` if Shift is held on pointerdown.
- toggling ratio lock in `TransformOptionBar` changes subsequent W/H preview behavior.

- [ ] **Step 4: Verify.**

```powershell
pnpm.cmd --filter photrez-desktop test -- transform
pnpm.cmd run build
```

Expected result: transform-related tests and build pass.

## Task 6: Status Text And Visual Polish

- Modify: `apps/desktop/src/components/editor/BottomStatusBar.tsx`
- Modify: `apps/desktop/src/components/editor/SelectionTransformOverlay.tsx`
- Test: `pnpm.cmd run build`

- [ ] **Step 1: Update status text.**

Use a more precise message:

```ts
if (session) return "Transform preview active. Edit values above, Enter to apply, Esc to cancel.";
```

- [ ] **Step 2: Keep overlay highlight subtle.**

Keep Photon Amber outline while session is active, but ensure this only highlights the active session's own layer:

```tsx
stroke={layerTransformSession()?.layerId === getLayer()?.id ? "#E15A17" : "rgba(255,255,255,0.72)"}
```

- [ ] **Step 3: Verify.**

```powershell
pnpm.cmd run build
```

Expected result: build passes.

## Task 7: Full Regression Verification

- Test-only task.

- [ ] **Step 1: Run frontend build.**

```powershell
pnpm.cmd run build
```

Expected result: build passes.

- [ ] **Step 2: Run frontend tests.**

```powershell
pnpm.cmd --filter photrez-desktop test
```

Expected result: all frontend tests pass. If Vitest worker startup times out, rerun targeted suites serially and document both command results.

- [ ] **Step 3: Run Rust checks required by project policy.**

```powershell
cargo test -p photrez-core
cargo test --workspace
```

Expected result: `photrez-core` passes. If workspace fails due to known render/toolchain blocker, document exact failure and do not claim a green workspace.

- [ ] **Step 4: Manual smoke checklist.**

Run the app if feasible:

```powershell
pnpm.cmd tauri dev
```

Smoke scenarios:
- Resize layer, release pointer, press Esc: layer returns to original transform.
- Resize layer, release pointer, press Enter: layer stays transformed; Undo returns to original transform; Redo returns to transformed state.
- Resize layer, switch to Brush: preview cancels and Move bar exits.
- Resize layer, switch document tab: preview cancels before tab changes.
- Resize layer, click Apply in Transform bar: same as Enter.
- Resize layer, click Cancel in Transform bar: same as Esc.
- During session, normal Move controls are not visible.
- W/H typed changes preview scale and do not create extra undo entries.

## Task 8: Docs Sync After Implementation

- Modify: `docs/AI_HISTORY.md`
- Modify: `docs/FEATURES.md`
- Modify: `docs/AI_CURRENT_TASK.md`
- Modify: `docs/plans/task.md`

- [ ] **Step 1: Update `AI_CURRENT_TASK.md`.**

Add a completed implementation entry with actual verification command results.

- [ ] **Step 2: Append `AI_HISTORY.md`.**

Append:

```md
## [2026-06-05] BUG FIX + FEATURE — Transform Session Hardening and Contextual Option Bar [COMPLETE]

### Kategori: BUG FIX / FEATURE / UX / TRANSFORM / FRONTEND

**Deskripsi:** Hardened layer transform session lifecycle and added contextual Transform Option Bar while resize/rotate transform preview is active.

**Root Cause:** Existing transform sessions stored only layer transform data and could leak across tool/document changes or mix with normal Move option bar actions.

**Fix Rationale:** Store full original document snapshot plus document identity, resolve sessions at navigation/destructive boundaries, and replace Move option controls with a focused Transform Option Bar during active sessions.

**Verifikasi:**
- `pnpm.cmd run build`: replace this line with the actual command result
- `pnpm.cmd --filter photrez-desktop test`: replace this line with the actual command result
- `cargo test -p photrez-core`: replace this line with the actual command result
- `cargo test --workspace`: replace this line with the actual command result
```

Replace bracketed results with actual output.

- [ ] **Step 3: Update `FEATURES.md`.**

In `Selection + Move + Transform`, add:

```md
| ✅ DONE | Hardened transform session lifecycle (document-scoped original snapshot, safe Apply/Cancel, tool/tab cleanup) |
| ✅ DONE | Contextual Transform Option Bar (X/Y/W/H/R, ratio lock, Reset Preview, Apply, Cancel) |
```

- [ ] **Step 4: Update `docs/plans/task.md`.**

Append task rows for hardening, contextual option bar, tests, and verification.

## Open Risks

- `engine.restore(originalSnapshot)` triggers full document restore. Verify texture handles remain valid because ImageBitmap references are reused in snapshots.
- If `DocumentEngine.getId()` is unavailable in the current TypeScript type surface, add a typed engine interface in helper tests or use `engine.getModel().id`; do not use `any`.
- W/H typed controls must handle negative scale or flipped layers carefully. For MVP, preserve the sign of existing scale when converting typed positive W/H to scale.
- Option bar layout is only 44px high and horizontally scrollable. Keep controls compact and reuse existing primitives to avoid visual churn.

## Self-Review

- Scope coverage: Covers the two requested areas: fixes/hardening plus contextual option bar.
- File coverage: Names all runtime files touched by the current implementation and the new contextual bar.
- Test coverage: Includes helper, overlay/session, option bar component, navigation cleanup, and manual smoke checks.
- Placeholder scan: No incomplete placeholder language is used.
