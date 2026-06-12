# Transform Session UX impl Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add transient transform sessions so high-impact transform operations can be applied with Enter/Apply or reverted with Esc/Cancel without making ordinary layer selection feel modal.

**Architecture:** Keep document truth in the existing TypeScript `DocumentEngine` hot path. Add a small frontend-only transform session state that stores the original layer transform, previews changes live through `engine.transformLayer`, and commits or reverts through explicit session actions. Crop remains its own session model; this plan harmonizes keyboard/button behavior and status text without merging crop state into layer transform state.

**Tech Stack:** SolidJS signals, existing `DocumentEngine`, existing `CommandHistory`, `SelectionTransformOverlay`, `useSelectionTransformDrag`, `useCanvasKeyboard`, Vitest, Vite.

## UX Contract

- Clicking a layer with the Move tool selects the layer and may show transform handles, but does not create a modal transform session by itself.
- Dragging the layer body with Move remains direct manipulation and finalizes on pointer release, matching the current lightweight Move workflow.
- Resizing or rotating a selected layer starts a transient layer transform session.
- While a layer transform session is active:
  - Enter or Apply commits the current preview and exits the session.
  - Esc or Cancel restores the captured original transform and exits the session.
  - Switching tools cancels the active transform session unless the switch is to Move.
- Crop keeps its existing behavior: selecting Crop enters crop session; Enter/Apply commits crop; Esc/Cancel discards crop.
- History should get one entry per accepted transform session, not one entry per pointer movement.

## File Structure

- Modify `apps/desktop/src/components/editor/editorState.ts`: add frontend-only session signal for active layer transform sessions.
- Modify `apps/desktop/src/components/editor/EditorContext.tsx`: expose the new session signal and setter.
- Add `apps/desktop/src/components/editor/transformSession.ts`: centralize commit/cancel helpers so keyboard and option-bar buttons share one behavior.
- Modify `apps/desktop/src/components/editor/useSelectionTransformDrag.ts`: start sessions for resize/rotate, preview live mutations, support cancel semantics, and stop committing history at pointer down for session-based transforms.
- Modify `apps/desktop/src/components/editor/useCanvasKeyboard.ts`: route Enter/Escape to layer transform session commit/cancel before generic Move shortcuts.
- Modify `apps/desktop/src/components/editor/MoveOptionBar.tsx`: add compact Apply/Cancel controls only when a layer transform session is active.
- Modify `apps/desktop/src/components/editor/BottomStatusBar.tsx`: show session-specific status text while a transform session is active.
- Modify `apps/desktop/src/components/editor/SelectionTransformOverlay.tsx`: surface active-session visual state if needed, using existing overlay geometry.
- Add or modify tests under `apps/desktop/src/components/editor/__tests__/` for session helper behavior, keyboard behavior, and drag session behavior.

## Task 1: Add Transform Session State

- Modify: `apps/desktop/src/components/editor/editorState.ts`
- Modify: `apps/desktop/src/components/editor/EditorContext.tsx`
- Test: `pnpm.cmd run build`

- [ ] **Step 1: Add a typed session shape in `editorState.ts`.**

Replace the existing type import with:

```ts
import type { LayerNode, DocumentTabSummary, Transform2D } from "@/engine/types";
```

Add this type near the imports:

```ts
export interface LayerTransformSession {
  layerId: string;
  originalTransform: Transform2D;
  mode: "resize" | "rotate";
  startedAt: number;
}
```

- [ ] **Step 2: Add the signal in `createEditorState`.**

Add this signal after `hoverPos`:

```ts
const [layerTransformSession, setLayerTransformSession] = createSignal<LayerTransformSession | null>(null);
```

Return it from `createEditorState`:

```ts
layerTransformSession, setLayerTransformSession,
```

- [ ] **Step 3: Expose the signal through `EditorContextValue`.**

In `EditorContext.tsx`, import the type:

```ts
import type { LayerTransformSession } from "./editorState";
```

Add these properties to `EditorContextValue`:

```ts
layerTransformSession: Accessor<LayerTransformSession | null>;
setLayerTransformSession: Setter<LayerTransformSession | null>;
```

- [ ] **Step 4: Verify the type surface.**

Run:

```powershell
pnpm.cmd run build
```

Expected result: Vite/TypeScript build completes without missing property or import errors.

## Task 2: Add Shared Transform Session Helpers

- Add: `apps/desktop/src/components/editor/transformSession.ts`
- Add: `apps/desktop/src/components/editor/__tests__/transformSession.test.ts`
- Test: `pnpm.cmd --filter photrez-desktop test -- transformSession`

- [ ] **Step 1: Create helper file.**

Create `apps/desktop/src/components/editor/transformSession.ts`:

```ts
import type { Transform2D } from "@/engine/types";
import type { LayerTransformSession } from "./editorState";

interface TransformSessionEngine {
  snapshot(): { layers: Array<{ id: string; transform: Transform2D }> };
  getLayer(id: string): { id: string; transform: Transform2D } | null | undefined;
  transformLayer(id: string, transform: Partial<Transform2D>): void;
}

interface TransformSessionHistory {
  commit(snapshot: unknown): void;
}

export function createTransformSessionHistorySnapshot<T extends { layers: Array<{ id: string; transform: Transform2D }> }>(
  snapshot: T,
  layerId: string,
  originalTransform: Transform2D
): T {
  return {
    ...snapshot,
    layers: snapshot.layers.map((layer) =>
      layer.id === layerId ? { ...layer, transform: { ...originalTransform } } : layer
    ),
  };
}

export function commitLayerTransformSession(
  session: LayerTransformSession | null,
  engine: TransformSessionEngine | null | undefined,
  history: TransformSessionHistory | null | undefined
): boolean {
  if (!session || !engine || !history) return false;
  const layer = engine.getLayer(session.layerId);
  if (!layer) return true;
  const before = createTransformSessionHistorySnapshot(
    engine.snapshot(),
    session.layerId,
    session.originalTransform
  );
  history.commit(before);
  return true;
}

export function cancelLayerTransformSession(
  session: LayerTransformSession | null,
  engine: TransformSessionEngine | null | undefined
): boolean {
  if (!session || !engine) return false;
  const layer = engine.getLayer(session.layerId);
  if (!layer) return true;
  engine.transformLayer(session.layerId, session.originalTransform);
  return true;
}
```

- [ ] **Step 2: Add tests for helper behavior.**

Create `apps/desktop/src/components/editor/__tests__/transformSession.test.ts`:

```ts
import { describe, expect, it, vi } from "vitest";
import {
  cancelLayerTransformSession,
  commitLayerTransformSession,
  createTransformSessionHistorySnapshot,
} from "../transformSession";
import type { Transform2D } from "@/engine/types";

const original: Transform2D = { x: 10, y: 20, scaleX: 1, scaleY: 1, rotation: 0, flipH: false, flipV: false };
const preview: Transform2D = { x: 10, y: 20, scaleX: 2, scaleY: 1, rotation: 15, flipH: false, flipV: false };

describe("transformSession", () => {
  it("creates a history snapshot with the original transform for the active layer", () => {
    const snapshot = {
      layers: [
        { id: "L1", transform: preview },
        { id: "L2", transform: original },
      ],
    };

    const result = createTransformSessionHistorySnapshot(snapshot, "L1", original);

    expect(result.layers[0].transform).toEqual(original);
    expect(result.layers[1].transform).toEqual(original);
  });

  it("commits the original transform snapshot for undo while keeping the preview as current state", () => {
    const commit = vi.fn();
    const engine = {
      snapshot: () => ({ layers: [{ id: "L1", transform: preview }] }),
      getLayer: () => ({ id: "L1", transform: preview }),
      transformLayer: vi.fn(),
    };

    const applied = commitLayerTransformSession(
      { layerId: "L1", originalTransform: original, mode: "resize", startedAt: 1 },
      engine,
      { commit }
    );

    expect(applied).toBe(true);
    expect(commit).toHaveBeenCalledWith({ layers: [{ id: "L1", transform: original }] });
    expect(engine.transformLayer).not.toHaveBeenCalled();
  });

  it("restores the original transform when cancelled", () => {
    const transformLayer = vi.fn();
    const engine = {
      snapshot: () => ({ layers: [{ id: "L1", transform: preview }] }),
      getLayer: () => ({ id: "L1", transform: preview }),
      transformLayer,
    };

    const cancelled = cancelLayerTransformSession(
      { layerId: "L1", originalTransform: original, mode: "rotate", startedAt: 1 },
      engine
    );

    expect(cancelled).toBe(true);
    expect(transformLayer).toHaveBeenCalledWith("L1", original);
  });
});
```

- [ ] **Step 3: Verify helper tests.**

Run:

```powershell
pnpm.cmd --filter photrez-desktop test -- transformSession
```

Expected result: the new helper test file passes.

## Task 3: Convert Resize/Rotate Into Session Preview

- Modify: `apps/desktop/src/components/editor/useSelectionTransformDrag.ts`
- Test: `pnpm.cmd --filter photrez-desktop test -- SelectionTransformOverlay`

- [ ] **Step 1: Confirm current drag commit behavior.**

Run:

```powershell
Select-String -Path apps/desktop/src/components/editor/useSelectionTransformDrag.ts -Pattern "history.commit|handlePointerDown|handlePointerUp|Escape" -Context 3
```

Expected observation: `history.commit(engine.snapshot())` currently happens in `handlePointerDown`, and Esc only reverts an in-progress pointer drag.

- [ ] **Step 2: Pull session functions from editor context.**

Extend the `useEditor()` destructuring:

```ts
const { workspace, activeLayerId, layers, zoom, pan, scheduler, activeTool, hoverHandle, setHoverHandle, moveSnapEnabled, setHoverPos, hoverPos, layerTransformSession, setLayerTransformSession } = useEditor();
```

- [ ] **Step 3: Add a local classifier.**

Add this helper above `handlePointerDown`:

```ts
const isLayerTransformSessionType = (type: string) => type === "rotate" || type !== "move";
```

- [ ] **Step 4: Start a session only for resize and rotate.**

Replace the unconditional pointer-down history commit:

```ts
history.commit(engine.snapshot());
```

with:

```ts
if (isLayerTransformSessionType(type)) {
  if (!layerTransformSession()) {
    setLayerTransformSession({
      layerId: layer.id,
      originalTransform: { ...layer.transform },
      mode: type === "rotate" ? "rotate" : "resize",
      startedAt: Date.now(),
    });
  }
} else {
  history.commit(engine.snapshot());
}
```

- [ ] **Step 5: Keep pointer-up from committing session transforms.**

Leave `handlePointerUp` as cleanup only. Do not add `history.commit` in pointer-up for resize/rotate.

- [ ] **Step 6: Update in-drag Escape behavior.**

In the Escape handler inside `onMount`, replace the restore transform source with:

```ts
const session = layerTransformSession();
const original = session?.layerId === layer.id ? session.originalTransform : drag.startTransform;
engine.transformLayer(layer.id, original);
setLayerTransformSession(null);
scheduler.requestRender();
```

- [ ] **Step 7: Verify build.**

Run:

```powershell
pnpm.cmd run build
```

Expected result: build passes.

## Task 4: Add Global Commit/Cancel Keyboard Behavior

- Modify: `apps/desktop/src/components/editor/useCanvasKeyboard.ts`
- Test: `apps/desktop/src/components/editor/__tests__/transformSession.test.ts`

- [ ] **Step 1: Import helper functions.**

Add:

```ts
import { cancelLayerTransformSession, commitLayerTransformSession } from "./transformSession";
```

- [ ] **Step 2: Destructure transform session state.**

Add these fields to the `useEditor()` destructuring:

```ts
layerTransformSession,
setLayerTransformSession,
```

- [ ] **Step 3: Route Enter and Escape before Move arrow shortcuts.**

After crop keyboard handling and before generic key handling, add:

```ts
if (layerTransformSession()) {
  if (e.key === "Enter") {
    e.preventDefault();
    e.stopPropagation();
    if (commitLayerTransformSession(layerTransformSession(), engine, history)) {
      setLayerTransformSession(null);
      scheduler.requestRender();
    }
    return;
  }

  if (e.key === "Escape") {
    e.preventDefault();
    e.stopPropagation();
    if (cancelLayerTransformSession(layerTransformSession(), engine)) {
      setLayerTransformSession(null);
      scheduler.requestRender();
    }
    return;
  }
}
```

- [ ] **Step 4: Verify.**

Run:

```powershell
pnpm.cmd --filter photrez-desktop test -- transformSession
pnpm.cmd run build
```

Expected result: tests and build pass.

## Task 5: Add Apply/Cancel Controls In Move Option Bar

- Modify: `apps/desktop/src/components/editor/MoveOptionBar.tsx`
- Test: `pnpm.cmd run build`

- [ ] **Step 1: Import `Show` and helpers if not already present.**

Add:

```ts
import { Show } from "solid-js";
import { cancelLayerTransformSession, commitLayerTransformSession } from "./transformSession";
```

- [ ] **Step 2: Destructure session fields.**

Add:

```ts
layerTransformSession,
setLayerTransformSession,
workspace,
scheduler,
```

- [ ] **Step 3: Add local action handlers.**

Add:

```ts
const applyTransformSession = () => {
  const engine = workspace.getActiveEngine();
  const history = workspace.getActiveHistory();
  if (commitLayerTransformSession(layerTransformSession(), engine, history)) {
    setLayerTransformSession(null);
    scheduler.requestRender();
  }
};

const cancelTransformSession = () => {
  const engine = workspace.getActiveEngine();
  if (cancelLayerTransformSession(layerTransformSession(), engine)) {
    setLayerTransformSession(null);
    scheduler.requestRender();
  }
};
```

- [ ] **Step 4: Render buttons only during a session.**

Add this block in the option bar layout:

```tsx
<Show when={layerTransformSession()}>
  <div class="h-5 w-px bg-editor-border mx-1" />
  <button type="button" class="h-7 px-3 rounded-[4px] border border-editor-accent/50 bg-editor-accent/15 text-editor-text text-[12px] font-semibold" onClick={applyTransformSession} title="Apply transform (Enter)">
    Apply
  </button>
  <button type="button" class="h-7 px-3 rounded-[4px] border border-editor-border bg-editor-surface-2 text-editor-text-dim text-[12px] font-semibold hover:text-editor-text" onClick={cancelTransformSession} title="Cancel transform (Esc)">
    Cancel
  </button>
</Show>
```

- [ ] **Step 5: Verify.**

Run:

```powershell
pnpm.cmd run build
```

Expected result: build passes and controls appear only when a resize/rotate session is active.

## Task 6: Harmonize Status Text And Overlay Feedback

- Modify: `apps/desktop/src/components/editor/BottomStatusBar.tsx`
- Optional modify: `apps/desktop/src/components/editor/SelectionTransformOverlay.tsx`
- Test: `pnpm.cmd run build`

- [ ] **Step 1: Add transform session-aware status text.**

In `BottomStatusBar.tsx`, destructure:

```ts
layerTransformSession,
```

Add:

```ts
const statusText = () => {
  const session = layerTransformSession();
  if (session) return "Transform active. Enter to apply, Esc to cancel.";
  return TOOL_DESCRIPTIONS[activeTool()] || "";
};
```

Render `statusText()` instead of `TOOL_DESCRIPTIONS[activeTool()]`.

- [ ] **Step 2: Add subtle overlay state only if it improves clarity.**

In `SelectionTransformOverlay.tsx`, destructure `layerTransformSession` and use it to slightly brighten the active outline:

```tsx
stroke={layerTransformSession() ? "#E15A17" : "rgba(255,255,255,0.72)"}
```

Do not add large HUDs or floating instructional panels.

- [ ] **Step 3: Verify.**

Run:

```powershell
pnpm.cmd run build
```

Expected result: build passes; status text changes only while transform session is active.

## Task 7: Full Verification And Docs Sync

- Modify: `docs/AI_HISTORY.md`
- Modify: `docs/FEATURES.md`
- Modify: `docs/plans/task.md`

- [ ] **Step 1: Run mandatory frontend verification.**

Run:

```powershell
pnpm.cmd run build
pnpm.cmd --filter photrez-desktop test
```

Expected result: build passes and frontend tests pass. If default Vitest worker startup times out, rerun the relevant suite serially and document both results.

- [ ] **Step 2: Run mandatory Rust verification if implementation touches shared behavior or release status.**

Run:

```powershell
cargo test -p photrez-core
cargo test --workspace
```

Expected result: `photrez-core` passes. If workspace fails due to the known render/toolchain blocker, document exact failure and do not claim the full workspace gate is green.

- [ ] **Step 3: Run app-level compile/launch check only if Tauri command or binary code changed.**

Run:

```powershell
pnpm.cmd tauri dev
```

Expected result: app compiles and launches. Skip only if no binary/app-level files changed, and state that it was not applicable.

- [ ] **Step 4: Update `FEATURES.md`.**

Add or update the `Selection + Move + Transform` section with:

```md
| ✅ DONE | Transient layer transform session (resize/rotate preview, Enter/Apply commit, Esc/Cancel revert) |
```

- [ ] **Step 5: Append `AI_HISTORY.md`.**

Append a new completion entry with the exact files changed and actual verification command results.

- [ ] **Step 6: Update `docs/plans/task.md`.**

Append task rows for each completed implementation chunk and verification run.

## Open Design Notes

- This plan intentionally does not make simple layer click modal. Selection remains lightweight.
- This plan intentionally does not merge crop and transform session state into one abstraction. Crop already has richer crop-specific state: rect, mode, target size, delete pixels, rotation, guides, and crop undo stack.
- If future free-transform supports skew/perspective, add those modes to `LayerTransformSession["mode"]` instead of changing crop behavior.

## Self-Review

- Spec coverage: The plan covers selected state, direct Move behavior, resize/rotate transform session, crop session compatibility, keyboard commit/cancel, option bar controls, status text, tests, and docs sync.
- Placeholder scan: No implementation step uses incomplete placeholder wording.
- Type consistency: `LayerTransformSession`, `layerTransformSession`, and `setLayerTransformSession` are named consistently across state, context, keyboard, option bar, and drag hook tasks.
- Risk: The history commit strategy needs careful validation because current code commits before mutation. The plan preserves undo intent by recording a snapshot where the active layer transform is restored to the original transform before pushing history.
