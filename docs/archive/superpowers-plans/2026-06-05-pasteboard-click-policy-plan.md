# Pasteboard Click Policy impl Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add predictable outside-canvas / pasteboard click behavior for Photrez so clicks outside the artboard clear lightweight canvas state where appropriate without accidentally cancelling crop or transform sessions.

**Architecture:** Keep document truth in `DocumentEngine`; pasteboard click handling is frontend interaction policy owned by the editor viewport. Add a small centralized helper that maps current UI context to an action, then invoke it from the viewport container when the pointer down target is the pasteboard, not the WebGL artboard or overlay controls.

**Tech Stack:** SolidJS, `CanvasViewport`, `useCanvasPointerTools`, TypeScript `DocumentEngine`, existing transform/crop session state, Vitest component/unit tests.

## UX Contract

| Context | Pasteboard click behavior |
| --- | --- |
| No document | No-op |
| Space/panning active | No-op; panning owns the pointer |
| Active layer transform session | No-op; Apply/Cancel remains explicit |
| Crop tool active with crop rect | No-op; Enter/Esc/Apply/Cancel owns crop lifecycle |
| Move tool normal | Hide canvas transform overlay / clear canvas selection affordance; do not mutate pixels |
| Selection tool with marquee/selection affordance | Clear lightweight selection affordance |
| Brush/Eraser | No-op |
| Eyedropper | No-op |

## Product Decision

For MVP, do not introduce a separate `canvasSelectionLayerId` yet unless implementation proves `activeLayerId` cannot be safely used. Use the smallest viable behavior:

- Pasteboard click in normal Move mode clears active layer selection via `engine.setActiveLayer(null)`.
- Transform sessions are protected from pasteboard clicks.
- Crop is protected from pasteboard clicks.
- Selection marquee preview is cleared through existing local selection overlay state.

If later panel UX feels too empty when active layer is cleared, split panel selection and canvas overlay selection in a follow-up.

## File Structure

- Add `apps/desktop/src/components/editor/pasteboardClickPolicy.ts`: pure policy helper and action types.
- Modify `apps/desktop/src/components/editor/useCanvasPointerTools.ts`: expose a selection preview clear function if needed.
- Modify `apps/desktop/src/components/editor/CanvasViewport.tsx`: detect pasteboard pointer down and execute policy action.
- Add `apps/desktop/src/components/editor/__tests__/pasteboardClickPolicy.test.ts`: unit tests for policy matrix.
- Add or update `apps/desktop/src/components/editor/__tests__/CanvasViewport.test.tsx` if an existing viewport harness is practical.
- Modify docs after implementation: `AI_CURRENT_TASK.md`, `AI_HISTORY.md`, `FEATURES.md`, `docs/plans/task.md`.

## Task 1: Add Pure Pasteboard Policy Helper

- Add: `apps/desktop/src/components/editor/pasteboardClickPolicy.ts`
- Add: `apps/desktop/src/components/editor/__tests__/pasteboardClickPolicy.test.ts`
- Test: `pnpm.cmd --filter photrez-desktop test -- pasteboardClickPolicy`

- [ ] **Step 1: Create action and context types.**

Create `apps/desktop/src/components/editor/pasteboardClickPolicy.ts`:

```ts
export type PasteboardClickAction =
  | "noop"
  | "clear-active-layer"
  | "clear-selection-preview";

export interface PasteboardClickContext {
  hasDocument: boolean;
  activeTool: string;
  isNavigationMode: boolean;
  hasLayerTransformSession: boolean;
  hasCropRect: boolean;
  hasSelectionPreview: boolean;
}
```

- [ ] **Step 2: Implement policy function.**

Add:

```ts
export function getPasteboardClickAction(ctx: PasteboardClickContext): PasteboardClickAction {
  if (!ctx.hasDocument) return "noop";
  if (ctx.isNavigationMode) return "noop";
  if (ctx.hasLayerTransformSession) return "noop";
  if (ctx.activeTool === "crop" && ctx.hasCropRect) return "noop";
  if (ctx.activeTool === "selection" && ctx.hasSelectionPreview) return "clear-selection-preview";
  if (ctx.activeTool === "move") return "clear-active-layer";
  return "noop";
}
```

- [ ] **Step 3: Add policy tests.**

Create `apps/desktop/src/components/editor/__tests__/pasteboardClickPolicy.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { getPasteboardClickAction, type PasteboardClickContext } from "../pasteboardClickPolicy";

const base: PasteboardClickContext = {
  hasDocument: true,
  activeTool: "move",
  isNavigationMode: false,
  hasLayerTransformSession: false,
  hasCropRect: false,
  hasSelectionPreview: false,
};

describe("getPasteboardClickAction", () => {
  it("does nothing without a document", () => {
    expect(getPasteboardClickAction({ ...base, hasDocument: false })).toBe("noop");
  });

  it("does nothing while navigation/panning owns the pointer", () => {
    expect(getPasteboardClickAction({ ...base, isNavigationMode: true })).toBe("noop");
  });

  it("protects active layer transform sessions", () => {
    expect(getPasteboardClickAction({ ...base, hasLayerTransformSession: true })).toBe("noop");
  });

  it("protects active crop sessions", () => {
    expect(getPasteboardClickAction({ ...base, activeTool: "crop", hasCropRect: true })).toBe("noop");
  });

  it("clears active layer for normal Move pasteboard click", () => {
    expect(getPasteboardClickAction(base)).toBe("clear-active-layer");
  });

  it("clears selection preview for Selection tool pasteboard click", () => {
    expect(getPasteboardClickAction({ ...base, activeTool: "selection", hasSelectionPreview: true })).toBe("clear-selection-preview");
  });

  it("does nothing for paint and sampling tools", () => {
    expect(getPasteboardClickAction({ ...base, activeTool: "brush" })).toBe("noop");
    expect(getPasteboardClickAction({ ...base, activeTool: "eraser" })).toBe("noop");
    expect(getPasteboardClickAction({ ...base, activeTool: "eyedropper" })).toBe("noop");
  });
});
```

- [ ] **Step 4: Run targeted tests.**

```powershell
pnpm.cmd --filter photrez-desktop test -- pasteboardClickPolicy
```

Expected result: all policy tests pass.

## Task 2: Expose Selection Preview Clear Hook

- Modify: `apps/desktop/src/components/editor/useCanvasPointerTools.ts`
- Test: `pnpm.cmd run build`

- [ ] **Step 1: Return the existing setter already held by the hook.**

`useCanvasPointerTools` already owns:

```ts
const [selectionBox, setSelectionBoxSignal] = createSignal<...>(null);
```

It already returns `setSelectionBoxSignal`. If current implementation still returns it, no code change is required. If not, add:

```ts
setSelectionBoxSignal,
```

to the returned object.

- [ ] **Step 2: Keep selection clearing lightweight.**

Do not call `history.commit` and do not mutate `DocumentEngine` for this MVP pasteboard selection preview clear. This is a transient UI affordance.

- [ ] **Step 3: Verify build.**

```powershell
pnpm.cmd run build
```

Expected result: build passes.

## Task 3: Add Pasteboard Pointer Handling In CanvasViewport

- Modify: `apps/desktop/src/components/editor/CanvasViewport.tsx`
- Test: add/update viewport component test if practical; otherwise use policy tests plus build.

- [ ] **Step 1: Import helper.**

Add:

```ts
import { getPasteboardClickAction } from "./pasteboardClickPolicy";
```

- [ ] **Step 2: Destructure session state from editor context.**

Extend `useEditor()` destructuring:

```ts
layerTransformSession,
```

Keep crop state existing:

```ts
cropRect,
```

- [ ] **Step 3: Destructure `setSelectionBoxSignal`.**

The hook already returns it. Add it to the destructuring if missing:

```ts
setSelectionBoxSignal,
```

- [ ] **Step 4: Add a pasteboard detector.**

Inside `CanvasViewport`, add:

```ts
const isPasteboardPointerDown = (e: PointerEvent) => {
  return e.target === canvasContainerRef;
};
```

This intentionally handles only clicks on the viewport pasteboard container. It does not fire for WebGL canvas, crop overlay, transform handles, or artboard border internals.

- [ ] **Step 5: Add action executor.**

Add:

```ts
const handlePasteboardPointerDown = (e: PointerEvent) => {
  if (!isPasteboardPointerDown(e)) return;
  if (e.button !== 0) return;

  const engine = workspace.getActiveEngine();
  const action = getPasteboardClickAction({
    hasDocument: Boolean(engine),
    activeTool: activeTool(),
    isNavigationMode: isSpacePressed() || isPanning(),
    hasLayerTransformSession: Boolean(layerTransformSession()),
    hasCropRect: Boolean(cropRect()),
    hasSelectionPreview: Boolean(selectionBox()),
  });

  if (action === "noop") return;

  e.preventDefault();
  e.stopPropagation();

  if (action === "clear-active-layer" && engine) {
    engine.setActiveLayer(null);
    setHoverHandle(null);
    setSnapLines([]);
    setHudInfo(null);
    scheduler.requestRender();
    return;
  }

  if (action === "clear-selection-preview") {
    setSelectionBoxSignal(null);
    setSnapLines([]);
    setHudInfo(null);
    scheduler.requestRender();
  }
};
```

- [ ] **Step 6: Call it before panning pointer down.**

Replace container pointer down:

```tsx
onPointerDown={onViewportPointerDown}
```

with:

```tsx
onPointerDown={(e) => {
  handlePasteboardPointerDown(e);
  if (!e.defaultPrevented) onViewportPointerDown(e);
}}
```

This allows pasteboard click policy to consume normal left-clicks while preserving Space/middle-button panning.

- [ ] **Step 7: Verify build.**

```powershell
pnpm.cmd run build
```

Expected result: build passes.

## Task 4: Add Component Regression Coverage

- Add or modify: `apps/desktop/src/components/editor/__tests__/CanvasViewport.test.tsx`
- Test: `pnpm.cmd --filter photrez-desktop test -- CanvasViewport`

- [ ] **Step 1: Add component test harness only if existing provider setup is reusable.**

Use `EditorProvider`, `WorkspaceManager.createBlankDocument`, mock renderer, and mock scheduler, following patterns from existing editor component tests.

- [ ] **Step 2: Test normal Move pasteboard click clears active layer.**

Scenario:
- create workspace with one blank document and active layer.
- render `CanvasViewport`.
- dispatch `pointerdown` on `[data-viewport-container]`.
- assert `engine.getActiveLayerId()` is `null`.

- [ ] **Step 3: Test transform session protects active layer.**

Scenario:
- set `layerTransformSession` through a small test child component or context action.
- dispatch pasteboard pointerdown.
- assert active layer remains unchanged.

- [ ] **Step 4: Test crop protects crop rect.**

Scenario:
- set active tool to `crop`.
- set a crop rect.
- dispatch pasteboard pointerdown.
- assert crop rect remains unchanged.

- [ ] **Step 5: Test paint tools no-op.**

Scenario:
- set active tool to `brush`.
- dispatch pasteboard pointerdown.
- assert active layer remains unchanged.

- [ ] **Step 6: Run targeted viewport tests.**

```powershell
pnpm.cmd --filter photrez-desktop test -- CanvasViewport
```

Expected result: viewport tests pass. If the viewport harness is too brittle due to WebGL renderer setup, keep pure policy tests as the primary automated coverage and document manual smoke in Task 5.

## Task 5: Manual Smoke And Full Verification

- Test-only task.

- [ ] **Step 1: Run frontend build.**

```powershell
pnpm.cmd run build
```

Expected result: Vite/TypeScript build passes.

- [ ] **Step 2: Run frontend tests.**

```powershell
pnpm.cmd --filter photrez-desktop test
```

Expected result: all frontend tests pass.

- [ ] **Step 3: Run Rust tests required by project policy.**

```powershell
cargo test -p photrez-core
cargo test --workspace
```

Expected result: `photrez-core` passes. If workspace fails due to a known render/toolchain blocker, document the exact failure and do not claim workspace is green.

- [ ] **Step 4: Manual smoke checklist.**

Run the app if feasible:

```powershell
pnpm.cmd tauri dev
```

Smoke scenarios:
- Move tool, layer selected, click pasteboard: transform overlay disappears / active layer clears.
- Move tool, click inside artboard: existing auto-select/move behavior remains unchanged.
- Active transform session, click pasteboard: session remains active and Apply/Cancel still work.
- Crop tool with crop box, click pasteboard: crop box remains unchanged.
- Selection tool with marquee preview, click pasteboard: transient selection preview clears.
- Brush/Eraser/Eyedropper, click pasteboard: no layer deselect and no crop/selection state changes.
- Space-drag pasteboard: panning still works.
- Middle-button pasteboard: panning still works if currently supported.

## Task 6: Docs Sync After Implementation

- Modify: `docs/AI_CURRENT_TASK.md`
- Modify: `docs/AI_HISTORY.md`
- Modify: `docs/FEATURES.md`
- Modify: `docs/plans/task.md`

- [ ] **Step 1: Update `AI_CURRENT_TASK.md`.**

Add completed implementation entry with actual verification results.

- [ ] **Step 2: Append `AI_HISTORY.md`.**

Append:

```md
## [2026-06-05] FEATURE — Pasteboard Click Policy [COMPLETE]

### Kategori: FEATURE / UX / VIEWPORT / FRONTEND

**Deskripsi:** Menambahkan kebijakan klik pasteboard/outside-canvas terpusat agar Move normal dapat clear active layer, Selection dapat clear preview, dan mode penting seperti Transform Session, Crop, Brush, Eraser, serta Eyedropper tetap aman dari pembatalan tidak sengaja.

**Files Changed/Added:**
- [NEW] `apps/desktop/src/components/editor/pasteboardClickPolicy.ts`
- [NEW] `apps/desktop/src/components/editor/__tests__/pasteboardClickPolicy.test.ts`
- [MODIFY] `apps/desktop/src/components/editor/CanvasViewport.tsx`
- [MODIFY] `apps/desktop/src/components/editor/useCanvasPointerTools.ts`

**Verifikasi:**
- `pnpm.cmd run build`: replace this line with actual result
- `pnpm.cmd --filter photrez-desktop test`: replace this line with actual result
- `cargo test -p photrez-core`: replace this line with actual result
- `cargo test --workspace`: replace this line with actual result
```

- [ ] **Step 3: Update `FEATURES.md`.**

In `Viewport`, add:

```md
| ✅ DONE | Pasteboard click policy (Move clears active layer, Selection clears preview, Transform/Crop/Paint tools protected) |
```

- [ ] **Step 4: Update `docs/plans/task.md`.**

Append task rows for policy helper, viewport wiring, tests, verification, and docs sync.

## Open Risks

- Clearing `activeLayerId` may make the inspector/layers panel feel too empty. If this feels wrong in manual smoke, introduce a separate `canvasSelectedLayerId` in a later task.
- `e.target === canvasContainerRef` only catches direct pasteboard clicks. If future viewport children cover pasteboard areas, add a `data-pasteboard-surface` wrapper and detect closest target instead.
- Do not allow pasteboard clicks to cancel transform or crop sessions; losing previews through accidental clicks would feel worse than requiring explicit Esc/Cancel.

## Self-Review

- Scope coverage: Covers Move, Transform Session, Crop, Selection, Brush/Eraser, Eyedropper, no-document, and panning states.
- File coverage: Names the viewport, pointer hook, helper, tests, and docs files.
- Test coverage: Includes pure policy tests, optional viewport component tests, and manual smoke.
- Placeholder scan: No incomplete placeholder language is used.
