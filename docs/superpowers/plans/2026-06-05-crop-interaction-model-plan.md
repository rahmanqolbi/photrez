# Crop Hidden Preview Restore impl Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Correct Crop tool behavior so pasteboard click hides the active crop preview, canvas click restores that same hidden preview, drag from inside or outside the canvas creates a new replacement preview, and explicit Cancel/Esc discards the crop session.

**Architecture:** Crop preview remains transient SolidJS UI state. Add a separate hidden crop preview state so "hide preview" and "discard preview" are distinct operations. Document pixels and document history are mutated only by Apply/Enter/double-click apply.

**Tech Stack:** SolidJS signals, TypeScript, current TypeScript `DocumentEngine`, WebGL2 renderer, Vitest, Playwright smoke tests already present in the repo.

## Why This Plan Exists

The previous plan incorrectly translated "klik canvas cropboxnya muncul lagi" into "create a full-canvas crop box". That made execution diverge from the conversation.

Correct interpretation:

- Pasteboard click is a temporary hide action.
- Pasteboard drag is not a click: once movement crosses the drag threshold, it creates a new replacement crop box.
- The hidden crop box must be restorable.
- Canvas click after hiding restores the same crop box, including rotation.
- Canvas drag creates a new crop box and replaces the current or hidden crop box.
- Drag can start inside the canvas, outside the canvas, or cross the canvas boundary. The resulting crop rect may extend outside the current document bounds so crop apply can expand the canvas.
- Cancel/Esc discards the crop session rather than hiding it for later restore.

## Correct UX Contract

| State | User action | Required behavior | Document/history behavior |
| --- | --- | --- | --- |
| Crop tool active, visible crop preview exists | Click pasteboard/outside canvas | Hide the visible crop preview, store it as hidden preview, stay in Crop tool | No document mutation, no history commit |
| Crop tool active, no visible preview, hidden preview exists | Click canvas without drag | Restore the hidden preview exactly: same rect and rotation, clear hidden preview, stay in Crop tool | No document mutation, no history commit |
| Crop tool active, no visible preview, no hidden preview | Click canvas without drag | Create full-canvas preview `{ x: 0, y: 0, w: docWidth, h: docHeight }`, rotation `0`, stay in Crop tool | No document mutation, no history commit |
| Crop tool active, visible preview exists | Drag outside current preview | Create a new crop preview from drag bounds, clear hidden preview, reset rotation to `0`, replace visible preview | No document mutation, no history commit |
| Crop tool active, hidden preview exists | Drag canvas | Create a new crop preview from drag bounds, clear hidden preview, reset rotation to `0`, replace hidden preview | No document mutation, no history commit |
| Crop tool active, visible or hidden preview exists | Drag pasteboard/outside canvas beyond threshold | Create a new crop preview from drag bounds, clear hidden preview, reset rotation to `0`, replace any visible preview; do not treat it as pasteboard click | No document mutation, no history commit |
| Crop tool active, visible or hidden preview exists | Drag from canvas to pasteboard, or pasteboard to canvas | Create a new crop preview from the complete gesture bounds; allow negative/out-of-document coordinates instead of clamping to current document bounds | No document mutation, no history commit |
| Crop tool active, visible or hidden preview exists | Drag entirely outside current canvas | Create a new crop preview if the gesture crosses the drag threshold and produces non-zero width/height; this is a valid canvas-expansion crop preview | No document mutation, no history commit |
| Crop tool active, visible preview exists | Drag inside preview | Move existing preview with current behavior | Crop mini undo may record UI-state changes; no document history commit |
| Crop tool active, visible preview exists | Drag handles or rotate handle | Resize/rotate existing preview with current behavior | Crop mini undo may record UI-state changes; no document history commit |
| Crop tool active, visible preview exists | Double-click inside preview | Apply crop, clear visible preview, clear hidden preview, request render, switch to Move tool | Commit document history before mutation |
| Crop tool active, no visible preview | Double-click pasteboard/canvas | No-op; do not restore and do not fit-to-screen | No document mutation, no history commit |
| Crop tool active, visible or hidden preview exists | `Esc` or Crop Option Bar `Cancel` | Discard crop session: clear visible preview, clear hidden preview, reset rotation to `0`, stay in Crop tool | No document mutation, no history commit |
| Crop tool active, visible preview exists | `Enter` or Crop Option Bar `Apply` | Apply crop, clear visible preview, clear hidden preview, switch to Move tool | Commit document history before mutation |
| Non-crop tool | Double-click pasteboard/canvas | Preserve existing fit-to-screen behavior | Viewport-only mutation |

## Terms

- **Visible crop preview:** Current `cropRect()` plus `cropRotation()` that is rendered as `CropOverlay`.
- **Hidden crop preview:** Stored crop preview that is not rendered after pasteboard click.
- **Discard:** Clear visible preview, hidden preview, and rotation. Used by Cancel/Esc and Apply cleanup.
- **Hide:** Move visible preview into hidden preview. Used only by pasteboard click.
- **Restore:** Move hidden preview back into visible preview. Used by canvas click without drag.
- **Replace:** Create a new preview from drag bounds and clear hidden preview.
- **Pasteboard drag:** A left-button pointer gesture that starts outside the current canvas and crosses the drag threshold. It is replacement, not hide.
- **Outside-bounds crop rect:** A replacement crop rect whose `x` or `y` is negative, or whose right/bottom edge exceeds the current document width/height. Do not clamp these values during preview creation.

## File Structure

Modify:

- `apps/desktop/src/components/editor/cropState.ts`
  - Owns visible crop state, hidden crop preview state, and crop mini undo/redo.
- `apps/desktop/src/components/editor/EditorContext.tsx`
  - Exposes hidden crop preview signals/actions to components.
- `apps/desktop/src/components/editor/cropToolActions.ts`
  - Centralizes hide, restore, discard, reset, replace-start, and apply behavior.
- `apps/desktop/src/components/editor/CanvasViewport.tsx`
  - Wires pasteboard click to hide, wires pasteboard drag to replacement crop creation, passes apply handler and replacement behavior to crop overlay.
- `apps/desktop/src/components/editor/useCanvasPointerTools.ts`
  - Changes canvas click behavior from "always reset to full-canvas" to "restore hidden preview first, full-canvas only when no hidden preview exists"; keeps real drag as replacement crop creation.
- `apps/desktop/src/components/editor/useCropOverlayDrag.ts`
  - Clears hidden preview on replacement drag, preserves outside-bounds coordinates, and treats small replacement drags as click/no-op according to the contract.
- `apps/desktop/src/components/editor/CropOverlay.tsx`
  - Keeps double-click apply scoped to the crop move zone.
- `apps/desktop/src/components/editor/CropOptionBar.tsx`
  - Cancel discards hidden preview as well as visible preview.
- `apps/desktop/src/components/editor/useCanvasKeyboard.ts`
  - Esc discards hidden preview as well as visible preview.

Tests:

- `apps/desktop/src/components/editor/__tests__/cropToolActions.test.ts`
- `apps/desktop/src/components/editor/__tests__/pasteboardClickPolicy.test.ts`
- `apps/desktop/src/components/editor/__tests__/CanvasViewport.test.tsx`
- `apps/desktop/src/components/editor/__tests__/CropOptionBar.test.tsx`
- `apps/desktop/src/components/editor/__tests__/CropOverlay.test.tsx`
- `apps/desktop/e2e/editor-smoke.spec.ts`

Docs:

- `docs/AI_CURRENT_TASK.md`
- `docs/AI_HISTORY.md`
- `docs/FEATURES.md`
- `docs/plans/task.md`

## Public State Shape

Add this state shape to `cropState.ts`:

```ts
export type CropPreview = {
  rect: { x: number; y: number; w: number; h: number };
  rotation: number;
};
```

Expose from `createCropState()`:

```ts
const [hiddenCropPreview, setHiddenCropPreview] = createSignal<CropPreview | null>(null);
```

Return additions:

```ts
hiddenCropPreview,
setHiddenCropPreview,
```

Add to `EditorContextValue`:

```ts
hiddenCropPreview: Accessor<CropPreview | null>;
setHiddenCropPreview: Setter<CropPreview | null>;
```

## Task 1: Add Hidden Crop Preview State

- Modify: `apps/desktop/src/components/editor/cropState.ts`
- Modify: `apps/desktop/src/components/editor/EditorContext.tsx`
- Test: `apps/desktop/src/components/editor/__tests__/cropToolActions.test.ts`

- [ ] **Step 1: Write failing type/action tests**

Add these tests to `cropToolActions.test.ts` before implementation:

```ts
import { describe, expect, it, vi } from "vitest";
import {
  discardCropSession,
  hideCropPreview,
  restoreHiddenCropPreview,
  type CropPreviewControls,
} from "../cropToolActions";

function controls(overrides: Partial<CropPreviewControls> = {}) {
  return {
    cropRect: () => ({ x: 10, y: 20, w: 100, h: 80 }),
    cropRotation: () => 12,
    hiddenCropPreview: () => null,
    setCropRect: vi.fn(),
    setCropRotation: vi.fn(),
    setHiddenCropPreview: vi.fn(),
    ...overrides,
  } satisfies CropPreviewControls;
}

describe("cropToolActions hidden preview", () => {
  it("hides the visible crop preview without discarding it", () => {
    const c = controls();

    hideCropPreview(c);

    expect(c.setHiddenCropPreview).toHaveBeenCalledWith({
      rect: { x: 10, y: 20, w: 100, h: 80 },
      rotation: 12,
    });
    expect(c.setCropRect).toHaveBeenCalledWith(null);
    expect(c.setCropRotation).toHaveBeenCalledWith(0);
  });

  it("restores hidden crop preview exactly", () => {
    const c = controls({
      cropRect: () => null,
      cropRotation: () => 0,
      hiddenCropPreview: () => ({
        rect: { x: 30, y: 40, w: 120, h: 90 },
        rotation: -8,
      }),
    });

    const restored = restoreHiddenCropPreview(c);

    expect(restored).toBe(true);
    expect(c.setCropRect).toHaveBeenCalledWith({ x: 30, y: 40, w: 120, h: 90 });
    expect(c.setCropRotation).toHaveBeenCalledWith(-8);
    expect(c.setHiddenCropPreview).toHaveBeenCalledWith(null);
  });

  it("reports false when there is no hidden preview to restore", () => {
    const c = controls({
      cropRect: () => null,
      hiddenCropPreview: () => null,
    });

    const restored = restoreHiddenCropPreview(c);

    expect(restored).toBe(false);
    expect(c.setCropRect).not.toHaveBeenCalled();
    expect(c.setCropRotation).not.toHaveBeenCalled();
  });

  it("discards visible and hidden crop preview", () => {
    const c = controls({
      hiddenCropPreview: () => ({
        rect: { x: 30, y: 40, w: 120, h: 90 },
        rotation: -8,
      }),
    });

    discardCropSession(c);

    expect(c.setCropRect).toHaveBeenCalledWith(null);
    expect(c.setCropRotation).toHaveBeenCalledWith(0);
    expect(c.setHiddenCropPreview).toHaveBeenCalledWith(null);
  });
});
```

- [ ] **Step 2: Run failing test**

Run:

```powershell
pnpm.cmd --filter photrez-desktop test -- cropToolActions
```

Expected red result:

```text
FAIL src/components/editor/__tests__/cropToolActions.test.ts
Error: No export named discardCropSession
```

- [ ] **Step 3: Add state and context fields**

In `cropState.ts`, add:

```ts
export type CropPreview = {
  rect: { x: number; y: number; w: number; h: number };
  rotation: number;
};
```

Inside `createCropState()` add after `cropRotation`:

```ts
const [hiddenCropPreview, setHiddenCropPreview] = createSignal<CropPreview | null>(null);
```

Add to returned object:

```ts
hiddenCropPreview, setHiddenCropPreview,
```

In `EditorContext.tsx`, import type:

```ts
import type { CropPreview } from "./cropState";
```

Add to `EditorContextValue`:

```ts
hiddenCropPreview: Accessor<CropPreview | null>;
setHiddenCropPreview: Setter<CropPreview | null>;
```

When building `val`, include:

```ts
hiddenCropPreview: cropState.hiddenCropPreview,
setHiddenCropPreview: cropState.setHiddenCropPreview,
```

- [ ] **Step 4: Add action functions**

Replace current `CropPreviewControls` in `cropToolActions.ts` with:

```ts
import type { WorkspaceManager } from "@/engine/workspace";
import type { RenderScheduler } from "@/renderer/scheduler";
import type { CropPreview } from "./cropState";

export interface CropPreviewControls {
  cropRect: () => CropPreview["rect"] | null;
  cropRotation: () => number;
  hiddenCropPreview: () => CropPreview | null;
  setCropRect: (rect: CropPreview["rect"] | null) => void;
  setCropRotation: (rot: number) => void;
  setHiddenCropPreview: (preview: CropPreview | null) => void;
}

export function hideCropPreview(controls: CropPreviewControls) {
  const rect = controls.cropRect();
  if (!rect) return;
  controls.setHiddenCropPreview({
    rect: { x: rect.x, y: rect.y, w: rect.w, h: rect.h },
    rotation: controls.cropRotation(),
  });
  controls.setCropRect(null);
  controls.setCropRotation(0);
}

export function restoreHiddenCropPreview(controls: CropPreviewControls): boolean {
  const hidden = controls.hiddenCropPreview();
  if (!hidden) return false;
  controls.setCropRect({ ...hidden.rect });
  controls.setCropRotation(hidden.rotation);
  controls.setHiddenCropPreview(null);
  return true;
}

export function discardCropSession(controls: CropPreviewControls) {
  controls.setCropRect(null);
  controls.setCropRotation(0);
  controls.setHiddenCropPreview(null);
}
```

Then keep `resetCropPreviewToCanvas(...)`, but add hidden preview clearing:

```ts
export function resetCropPreviewToCanvas(params: {
  engine: { getWidth: () => number; getHeight: () => number } | null;
  setCropRect: (rect: CropPreview["rect"] | null) => void;
  setCropRotation: (rot: number) => void;
  setHiddenCropPreview: (preview: CropPreview | null) => void;
}) {
  if (!params.engine) return;
  params.setCropRect({ x: 0, y: 0, w: params.engine.getWidth(), h: params.engine.getHeight() });
  params.setCropRotation(0);
  params.setHiddenCropPreview(null);
}
```

Update `applyCropPreview(...)` signature to accept `setHiddenCropPreview`, then after successful apply call:

```ts
discardCropSession({
  cropRect: () => params.cropRect,
  cropRotation: () => params.cropRotation,
  hiddenCropPreview: () => null,
  setCropRect: params.setCropRect,
  setCropRotation: params.setCropRotation,
  setHiddenCropPreview: params.setHiddenCropPreview,
});
```

- [ ] **Step 5: Run test to green**

Run:

```powershell
pnpm.cmd --filter photrez-desktop test -- cropToolActions
```

Expected:

```text
PASS src/components/editor/__tests__/cropToolActions.test.ts
```

## Task 2: Pasteboard Click Hides, Not Discards

- Modify: `apps/desktop/src/components/editor/CanvasViewport.tsx`
- Test: `apps/desktop/src/components/editor/__tests__/CanvasViewport.test.tsx`

- [ ] **Step 1: Write failing component test**

Add this test to `CanvasViewport.test.tsx`:

```ts
it("hides crop preview on pasteboard click and preserves it for restore", async () => {
  const editor = renderViewportWithDocument();
  editor.setActiveTool("crop");
  editor.setCropRect({ x: 12, y: 18, w: 200, h: 140 });
  editor.setCropRotation(15);

  const container = screen.getByTestId("canvas-container");
  fireEvent.pointerDown(container, { button: 0 });

  expect(editor.cropRect()).toBeNull();
  expect(editor.cropRotation()).toBe(0);
  expect(editor.hiddenCropPreview()).toEqual({
    rect: { x: 12, y: 18, w: 200, h: 140 },
    rotation: 15,
  });
  expect(editor.activeTool()).toBe("crop");
});
```

If the current helper does not expose `screen.getByTestId("canvas-container")`, update the existing test helper to query the existing `id="canvas-container"` or add `data-testid="canvas-container"` to the same element.

- [ ] **Step 2: Run failing test**

Run:

```powershell
pnpm.cmd --filter photrez-desktop test -- CanvasViewport
```

Expected red result:

```text
expected hiddenCropPreview() to equal {...}
received null
```

- [ ] **Step 3: Wire pasteboard action to hide**

In `CanvasViewport.tsx`, import:

```ts
import { hideCropPreview } from "./cropToolActions";
```

Read from context:

```ts
hiddenCropPreview, setHiddenCropPreview,
```

For `clear-crop-preview`, replace discard/reset logic with:

```ts
if (action === "clear-crop-preview") {
  hideCropPreview({
    cropRect,
    cropRotation,
    hiddenCropPreview,
    setCropRect,
    setCropRotation,
    setHiddenCropPreview,
  });
  setHoverHandle(null);
  setSnapLines([]);
  setHudInfo(null);
  scheduler.requestRender();
  return;
}
```

- [ ] **Step 4: Run test to green**

Run:

```powershell
pnpm.cmd --filter photrez-desktop test -- CanvasViewport
```

Expected:

```text
PASS src/components/editor/__tests__/CanvasViewport.test.tsx
```

## Task 3: Canvas Click Restores Hidden Preview Before Full-Canvas Fallback

- Modify: `apps/desktop/src/components/editor/useCanvasPointerTools.ts`
- Test: `apps/desktop/src/components/editor/__tests__/CanvasViewport.test.tsx`

- [ ] **Step 1: Write failing restore test**

Add:

```ts
it("restores hidden crop preview on canvas click without drag", async () => {
  const editor = renderViewportWithDocument();
  editor.setActiveTool("crop");
  editor.setCropRect(null);
  editor.setCropRotation(0);
  editor.setHiddenCropPreview({
    rect: { x: 25, y: 35, w: 160, h: 120 },
    rotation: -10,
  });

  const canvas = screen.getByTestId("document-canvas");
  fireEvent.pointerDown(canvas, { button: 0, clientX: 100, clientY: 100, pointerId: 1 });
  fireEvent.pointerUp(canvas, { button: 0, clientX: 100, clientY: 100, pointerId: 1 });

  expect(editor.cropRect()).toEqual({ x: 25, y: 35, w: 160, h: 120 });
  expect(editor.cropRotation()).toBe(-10);
  expect(editor.hiddenCropPreview()).toBeNull();
});
```

If the canvas currently lacks a stable selector, add `data-testid="document-canvas"` to the WebGL canvas in `CanvasViewport.tsx`.

- [ ] **Step 2: Write fallback test**

Add:

```ts
it("creates full-canvas crop preview on canvas click only when no hidden preview exists", async () => {
  const editor = renderViewportWithDocument({ width: 800, height: 600 });
  editor.setActiveTool("crop");
  editor.setCropRect(null);
  editor.setHiddenCropPreview(null);

  const canvas = screen.getByTestId("document-canvas");
  fireEvent.pointerDown(canvas, { button: 0, clientX: 100, clientY: 100, pointerId: 1 });
  fireEvent.pointerUp(canvas, { button: 0, clientX: 100, clientY: 100, pointerId: 1 });

  expect(editor.cropRect()).toEqual({ x: 0, y: 0, w: 800, h: 600 });
  expect(editor.cropRotation()).toBe(0);
});
```

- [ ] **Step 3: Run failing tests**

Run:

```powershell
pnpm.cmd --filter photrez-desktop test -- CanvasViewport
```

Expected first red result:

```text
expected cropRect() to equal { x: 25, y: 35, w: 160, h: 120 }
received { x: 0, y: 0, w: 800, h: 600 }
```

- [ ] **Step 4: Implement restore-first click logic**

In `useCanvasPointerTools.ts`, import:

```ts
import { resetCropPreviewToCanvas, restoreHiddenCropPreview } from "./cropToolActions";
```

Read from context:

```ts
hiddenCropPreview,
setHiddenCropPreview,
```

Replace the click-up crop branch:

```ts
if (tool === "crop" && isPendingCropClick) {
  const dx = Math.abs(coords.x - interactiveState.dragStart.x);
  const dy = Math.abs(coords.y - interactiveState.dragStart.y);
  if (dx <= 2 && dy <= 2) {
    const restored = restoreHiddenCropPreview({
      cropRect,
      cropRotation,
      hiddenCropPreview,
      setCropRect,
      setCropRotation,
      setHiddenCropPreview,
    });
    if (!restored) {
      resetCropPreviewToCanvas({ engine, setCropRect, setCropRotation, setHiddenCropPreview });
    }
    scheduler.requestRender();
  }
  isPendingCropClick = false;
}
```

- [ ] **Step 5: Run tests to green**

Run:

```powershell
pnpm.cmd --filter photrez-desktop test -- CanvasViewport
```

Expected:

```text
PASS src/components/editor/__tests__/CanvasViewport.test.tsx
```

## Task 4: Drag Replacement From Canvas or Pasteboard Creates a New Crop Preview

- Modify: `apps/desktop/src/components/editor/CanvasViewport.tsx`
- Modify: `apps/desktop/src/components/editor/useCanvasPointerTools.ts`
- Modify: `apps/desktop/src/components/editor/useCropOverlayDrag.ts`
- Modify: `apps/desktop/src/components/editor/cropToolActions.ts`
- Test: `apps/desktop/src/components/editor/__tests__/CanvasViewport.test.tsx`
- Test: `apps/desktop/src/components/editor/__tests__/CropOverlay.test.tsx`

- [ ] **Step 1: Write failing overlay replacement test**

Add this test to `CropOverlay.test.tsx`:

```ts
it("dragging outside crop box starts a replacement crop and clears hidden preview", () => {
  const onCropRectChange = vi.fn();
  const onCropRotationChange = vi.fn();
  const onHiddenCropPreviewChange = vi.fn();

  renderCropOverlay({
    cropRect: { x: 100, y: 100, w: 200, h: 120 },
    cropRotation: 22,
    hiddenCropPreview: {
      rect: { x: 20, y: 20, w: 50, h: 50 },
      rotation: 5,
    },
    onCropRectChange,
    onCropRotationChange,
    onHiddenCropPreviewChange,
  });

  const overlay = screen.getByTestId("crop-overlay");
  fireEvent.pointerDown(overlay, { button: 0, clientX: 20, clientY: 20, pointerId: 1 });
  fireEvent.pointerMove(overlay, { clientX: 220, clientY: 180, pointerId: 1 });
  fireEvent.pointerUp(overlay, { clientX: 220, clientY: 180, pointerId: 1 });

  expect(onHiddenCropPreviewChange).toHaveBeenCalledWith(null);
  expect(onCropRotationChange).toHaveBeenCalledWith(0);
  expect(onCropRectChange).toHaveBeenLastCalledWith(expect.objectContaining({
    x: expect.any(Number),
    y: expect.any(Number),
    w: expect.any(Number),
    h: expect.any(Number),
  }));
});
```

If `renderCropOverlay` does not exist, create a local test helper in the same file that renders `CropOverlay` with required props and uses local mutable props for rect/rotation.

- [ ] **Step 2: Write failing outside-bounds replacement test**

Add this test to `CropOverlay.test.tsx`:

```ts
it("replacement drag preserves outside document bounds for canvas expansion", () => {
  const onCropRectChange = vi.fn();
  const onCropRotationChange = vi.fn();
  const onHiddenCropPreviewChange = vi.fn();

  renderCropOverlay({
    documentSize: { width: 800, height: 600 },
    cropRect: { x: 100, y: 100, w: 200, h: 120 },
    cropRotation: 0,
    hiddenCropPreview: null,
    onCropRectChange,
    onCropRotationChange,
    onHiddenCropPreviewChange,
    screenToDocumentPoint: ({ clientX, clientY }) => ({
      x: clientX - 100,
      y: clientY - 100,
    }),
  });

  const overlay = screen.getByTestId("crop-overlay");
  fireEvent.pointerDown(overlay, { button: 0, clientX: 80, clientY: 90, pointerId: 1 });
  fireEvent.pointerMove(overlay, { clientX: 900, clientY: 710, pointerId: 1 });
  fireEvent.pointerUp(overlay, { clientX: 900, clientY: 710, pointerId: 1 });

  expect(onCropRectChange).toHaveBeenLastCalledWith({
    x: -20,
    y: -10,
    w: 820,
    h: 620,
  });
});
```

The important assertion is that the replacement preview is not clamped to `{ x: 0, y: 0, w: 800, h: 600 }`. If the current test helper uses a different coordinate adapter, keep the expected numbers equivalent: start outside the document and end beyond the document.

- [ ] **Step 3: Write failing pasteboard-drag test**

Add this test to `CanvasViewport.test.tsx`:

```ts
it("creates replacement crop preview from pasteboard drag instead of hiding preview", async () => {
  const editor = renderViewportWithDocument();
  editor.setActiveTool("crop");
  editor.setCropRect({ x: 120, y: 120, w: 180, h: 120 });
  editor.setCropRotation(18);
  editor.setHiddenCropPreview({
    rect: { x: 24, y: 32, w: 140, h: 100 },
    rotation: -12,
  });

  const container = screen.getByTestId("canvas-container");
  fireEvent.pointerDown(container, { button: 0, clientX: 10, clientY: 10, pointerId: 1 });
  fireEvent.pointerMove(container, { clientX: 160, clientY: 140, pointerId: 1 });
  fireEvent.pointerUp(container, { clientX: 160, clientY: 140, pointerId: 1 });

  expect(editor.hiddenCropPreview()).toBeNull();
  expect(editor.cropRotation()).toBe(0);
  expect(editor.cropRect()).toEqual(expect.objectContaining({
    x: expect.any(Number),
    y: expect.any(Number),
    w: expect.any(Number),
    h: expect.any(Number),
  }));
  expect(editor.cropRect()).not.toEqual({ x: 120, y: 120, w: 180, h: 120 });
});
```

This test must fail if `CanvasViewport.tsx` only handles pasteboard pointer down as immediate `hideCropPreview(...)`. The implementation must delay the hide decision until pointer up, after checking whether the movement stayed below the click threshold.

- [ ] **Step 4: Write failing pasteboard-click threshold test**

Add this test to `CanvasViewport.test.tsx`:

```ts
it("treats small pasteboard movement as click hide, not replacement drag", async () => {
  const editor = renderViewportWithDocument();
  editor.setActiveTool("crop");
  editor.setCropRect({ x: 120, y: 120, w: 180, h: 120 });
  editor.setCropRotation(18);

  const container = screen.getByTestId("canvas-container");
  fireEvent.pointerDown(container, { button: 0, clientX: 10, clientY: 10, pointerId: 1 });
  fireEvent.pointerMove(container, { clientX: 11, clientY: 12, pointerId: 1 });
  fireEvent.pointerUp(container, { clientX: 11, clientY: 12, pointerId: 1 });

  expect(editor.cropRect()).toBeNull();
  expect(editor.hiddenCropPreview()).toEqual({
    rect: { x: 120, y: 120, w: 180, h: 120 },
    rotation: 18,
  });
});
```

Use a threshold of `3` screen pixels unless the existing viewport pointer helper already defines a threshold. The threshold must compare squared distance or absolute deltas in screen space before converting to document space.

- [ ] **Step 5: Run failing tests**

Run:

```powershell
pnpm.cmd --filter photrez-desktop test -- CanvasViewport
pnpm.cmd --filter photrez-desktop test -- CropOverlay
```

Expected red result:

```text
expected cropRect() not to equal the old preview
expected onHiddenCropPreviewChange to be called with null
```

- [ ] **Step 6: Add replacement rect helpers**

In `cropToolActions.ts`, add:

```ts
import type { Point } from "@/viewport/transformGeometry";
import type { CropRect } from "@/viewport/cropGeometry";

export const CROP_REPLACEMENT_DRAG_THRESHOLD_PX = 3;

export function hasCropReplacementDragDistance(
  start: { clientX: number; clientY: number },
  current: { clientX: number; clientY: number },
): boolean {
  const dx = current.clientX - start.clientX;
  const dy = current.clientY - start.clientY;
  return dx * dx + dy * dy >= CROP_REPLACEMENT_DRAG_THRESHOLD_PX * CROP_REPLACEMENT_DRAG_THRESHOLD_PX;
}

export function createCropRectFromDocumentPoints(start: Point, end: Point): CropRect | null {
  const x = Math.min(start.x, end.x);
  const y = Math.min(start.y, end.y);
  const w = Math.abs(end.x - start.x);
  const h = Math.abs(end.y - start.y);

  if (w <= 0 || h <= 0) {
    return null;
  }

  return { x, y, w, h };
}
```

`Point` is already defined in `apps/desktop/src/viewport/transformGeometry.ts`. `CropRect` is already defined in `apps/desktop/src/viewport/cropGeometry.ts`. Do not clamp `x`, `y`, `w`, or `h` to the document bounds in this helper.

- [ ] **Step 7: Add hidden preview prop to overlay drag**

In `CropOverlayProps`, add:

```ts
hiddenCropPreview?: CropPreview | null;
onHiddenCropPreviewChange?: (preview: CropPreview | null) => void;
```

In `useCropOverlayDrag` params, add:

```ts
onHiddenCropPreviewChange?: (preview: CropPreview | null) => void;
```

When starting `handle: "new"` in `handleSvgPointerDown`, call:

```ts
params.onHiddenCropPreviewChange?.(null);
params.onCropRotationChange?.(0);
```

When replacement movement updates the rect, use:

```ts
const replacement = createCropRectFromDocumentPoints(dragStartDocumentPoint, currentDocumentPoint);
if (replacement) {
  params.onCropRectChange(replacement);
}
```

Do not pass the replacement rect through `constrainCropRectToDocument(...)`. Keep any existing bounded-handle constraint isolated to handle move/resize code paths. Replacement crop creation must preserve outside-bounds coordinates for canvas expansion.

Pass prop from `CanvasViewport.tsx`:

```tsx
hiddenCropPreview={hiddenCropPreview()}
onHiddenCropPreviewChange={setHiddenCropPreview}
```

- [ ] **Step 8: Wire pasteboard drag as a pending gesture**

In `CanvasViewport.tsx`, replace immediate pasteboard crop hide with a pending pointer gesture:

```ts
type PendingPasteboardCropGesture = {
  pointerId: number;
  startClient: { clientX: number; clientY: number };
  startDocument: Point;
  replacementStarted: boolean;
};

const [pendingPasteboardCropGesture, setPendingPasteboardCropGesture] =
  createSignal<PendingPasteboardCropGesture | null>(null);
```

On crop-tool pasteboard `pointerdown`:

```ts
const startDocument = screenToDocumentPoint(event);
setPendingPasteboardCropGesture({
  pointerId: event.pointerId,
  startClient: { clientX: event.clientX, clientY: event.clientY },
  startDocument,
  replacementStarted: false,
});
event.currentTarget.setPointerCapture(event.pointerId);
event.preventDefault();
```

On container `pointermove`:

```ts
const pending = pendingPasteboardCropGesture();
if (pending && event.pointerId === pending.pointerId) {
  if (!hasCropReplacementDragDistance(pending.startClient, event)) {
    return;
  }

  const nextRect = createCropRectFromDocumentPoints(
    pending.startDocument,
    screenToDocumentPoint(event),
  );
  if (!nextRect) {
    return;
  }

  setHiddenCropPreview(null);
  setCropRotation(0);
  setCropRect(nextRect);
  setPendingPasteboardCropGesture({ ...pending, replacementStarted: true });
  event.preventDefault();
}
```

On container `pointerup`:

```ts
const pending = pendingPasteboardCropGesture();
if (pending && event.pointerId === pending.pointerId) {
  setPendingPasteboardCropGesture(null);
  event.currentTarget.releasePointerCapture(event.pointerId);

  if (!pending.replacementStarted && !hasCropReplacementDragDistance(pending.startClient, event)) {
    hideCropPreview({
      cropRect,
      cropRotation,
      setCropRect,
      setCropRotation,
      setHiddenCropPreview,
    });
  }

  event.preventDefault();
}
```

If `CanvasViewport.tsx` already has a pointer gesture coordinator, add this as a crop-specific branch in that coordinator instead of creating an isolated signal. The behavioral requirement is the same: `pointerdown` only arms the gesture, `pointermove` creates replacement after threshold, and `pointerup` below threshold performs hide.

- [ ] **Step 9: Keep canvas drag and pasteboard drag consistent**

In `useCanvasPointerTools.ts`, ensure crop-tool document/canvas drag also uses `createCropRectFromDocumentPoints(...)` for replacement drag:

```ts
const nextRect = createCropRectFromDocumentPoints(startDocumentPoint, currentDocumentPoint);
if (nextRect) {
  setHiddenCropPreview(null);
  setCropRotation(0);
  setCropRect(nextRect);
}
```

This keeps inside-canvas, inside-to-outside, outside-to-inside, and pasteboard-only drag on the same replacement semantics. The coordinate source should be the viewport document transform, not the canvas element bounding box alone, so points outside the current document map to negative or beyond-document coordinates.

- [ ] **Step 10: Run tests to green**

Run:

```powershell
pnpm.cmd --filter photrez-desktop test -- CanvasViewport
pnpm.cmd --filter photrez-desktop test -- CropOverlay
```

Expected:

```text
PASS src/components/editor/__tests__/CanvasViewport.test.tsx
PASS src/components/editor/__tests__/CropOverlay.test.tsx
```

## Task 5: Cancel/Esc Discards Visible and Hidden Preview

- Modify: `apps/desktop/src/components/editor/CropOptionBar.tsx`
- Modify: `apps/desktop/src/components/editor/useCanvasKeyboard.ts`
- Test: `apps/desktop/src/components/editor/__tests__/CropOptionBar.test.tsx`
- Test: `apps/desktop/src/components/editor/__tests__/CanvasKeyboardLayerShortcuts.test.tsx` or existing keyboard crop test file

- [ ] **Step 1: Write failing option bar cancel test**

Add to `CropOptionBar.test.tsx`:

```ts
it("cancel discards hidden crop preview and stays in Crop tool", () => {
  const editor = renderCropOptionBar();
  editor.setActiveTool("crop");
  editor.setCropRect({ x: 10, y: 20, w: 100, h: 80 });
  editor.setCropRotation(12);
  editor.setHiddenCropPreview({
    rect: { x: 30, y: 40, w: 120, h: 90 },
    rotation: -8,
  });

  fireEvent.click(screen.getByRole("button", { name: "Cancel" }));

  expect(editor.cropRect()).toBeNull();
  expect(editor.cropRotation()).toBe(0);
  expect(editor.hiddenCropPreview()).toBeNull();
  expect(editor.activeTool()).toBe("crop");
});
```

- [ ] **Step 2: Run failing test**

Run:

```powershell
pnpm.cmd --filter photrez-desktop test -- CropOptionBar
```

Expected red result:

```text
expected hiddenCropPreview() to be null
received { ... }
```

- [ ] **Step 3: Wire Cancel to discard**

In `CropOptionBar.tsx`, import:

```ts
import { discardCropSession, resetCropPreviewToCanvas, applyCropPreview } from "./cropToolActions";
```

Read from context:

```ts
hiddenCropPreview,
setHiddenCropPreview,
```

Cancel button:

```ts
discardCropSession({
  cropRect,
  cropRotation,
  hiddenCropPreview,
  setCropRect,
  setCropRotation,
  setHiddenCropPreview,
});
```

Reset button:

```ts
resetCropPreviewToCanvas({
  engine,
  setCropRect,
  setCropRotation,
  setHiddenCropPreview,
});
```

Apply helper call must include:

```ts
setHiddenCropPreview,
```

- [ ] **Step 4: Wire Esc to discard**

In `useCanvasKeyboard.ts`, read:

```ts
cropRect,
cropRotation,
hiddenCropPreview,
setCropRect,
setCropRotation,
setHiddenCropPreview,
```

On crop `Escape`, use:

```ts
discardCropSession({
  cropRect,
  cropRotation,
  hiddenCropPreview,
  setCropRect,
  setCropRotation,
  setHiddenCropPreview,
});
```

Do not call `setActiveTool("move")`.

- [ ] **Step 5: Run tests to green**

Run:

```powershell
pnpm.cmd --filter photrez-desktop test -- CropOptionBar
pnpm.cmd --filter photrez-desktop test -- CanvasKeyboard
```

Expected:

```text
PASS CropOptionBar
PASS CanvasKeyboard
```

## Task 6: Apply Clears Hidden Preview

- Modify: `apps/desktop/src/components/editor/cropToolActions.ts`
- Test: `apps/desktop/src/components/editor/__tests__/cropToolActions.test.ts`
- Test: `apps/desktop/src/components/editor/__tests__/CanvasViewport.test.tsx`

- [ ] **Step 1: Write failing apply test**

Add to `cropToolActions.test.ts`:

```ts
it("apply clears visible and hidden crop preview after document mutation", () => {
  const engine = {
    snapshot: vi.fn(() => ({ id: "snapshot" })),
    applyCrop: vi.fn(),
  };
  const history = { commit: vi.fn() };
  const workspace = {
    getActiveEngine: () => engine,
    getActiveHistory: () => history,
  } as any;
  const scheduler = { requestRender: vi.fn() } as any;
  const setCropRect = vi.fn();
  const setCropRotation = vi.fn();
  const setHiddenCropPreview = vi.fn();
  const setActiveTool = vi.fn();

  applyCropPreview({
    workspace,
    cropRect: { x: 10, y: 20, w: 100, h: 80 },
    cropMode: "free",
    cropSizeTarget: null,
    cropDeletePixels: true,
    cropRotation: 12,
    scheduler,
    setCropRect,
    setCropRotation,
    setHiddenCropPreview,
    setActiveTool,
  });

  expect(history.commit).toHaveBeenCalledWith({ id: "snapshot" });
  expect(engine.applyCrop).toHaveBeenCalledWith(10, 20, 100, 80, {
    deleteCroppedPixels: true,
    targetSize: null,
    rotation: 12,
  });
  expect(setCropRect).toHaveBeenCalledWith(null);
  expect(setCropRotation).toHaveBeenCalledWith(0);
  expect(setHiddenCropPreview).toHaveBeenCalledWith(null);
  expect(setActiveTool).toHaveBeenCalledWith("move");
});
```

- [ ] **Step 2: Run failing test**

Run:

```powershell
pnpm.cmd --filter photrez-desktop test -- cropToolActions
```

Expected red result:

```text
expected setHiddenCropPreview to be called with null
```

- [ ] **Step 3: Implement apply cleanup**

In `applyCropPreview(...)`, after `params.scheduler.requestRender()`, call:

```ts
params.setCropRect(null);
params.setCropRotation(0);
params.setHiddenCropPreview(null);
params.setActiveTool("move");
```

Do not call `setActiveTool("move")` if engine or rect is missing.

- [ ] **Step 4: Run test to green**

Run:

```powershell
pnpm.cmd --filter photrez-desktop test -- cropToolActions
```

Expected:

```text
PASS src/components/editor/__tests__/cropToolActions.test.ts
```

## Task 7: Pasteboard Policy Text and Feature Docs Must Match Corrected Behavior

- Modify: `apps/desktop/src/components/editor/pasteboardClickPolicy.ts`
- Test: `apps/desktop/src/components/editor/__tests__/pasteboardClickPolicy.test.ts`
- Modify docs after implementation.

- [ ] **Step 1: Keep policy action name but document meaning**

The action name `clear-crop-preview` may remain for compatibility, but tests and comments must define it as "hide preview", not "discard session".

In `pasteboardClickPolicy.test.ts`, rename test to:

```ts
it("hides visible crop preview for Crop tool pasteboard click", () => {
  expect(getPasteboardClickAction({ ...base, activeTool: "crop", hasCropRect: true })).toBe("clear-crop-preview");
});
```

- [ ] **Step 2: Add no-hidden-preview policy note in implementation docs**

Do not add hidden preview state into `pasteboardClickPolicy.ts`. The pure policy should only decide whether pasteboard click wants `clear-crop-preview`; `CanvasViewport.tsx` owns interpreting that as `hideCropPreview(...)`.

- [ ] **Step 3: Run policy test**

Run:

```powershell
pnpm.cmd --filter photrez-desktop test -- pasteboardClickPolicy
```

Expected:

```text
PASS src/components/editor/__tests__/pasteboardClickPolicy.test.ts
```

## Task 8: Browser Smoke Coverage for Hide and Restore

- Modify: `apps/desktop/e2e/editor-smoke.spec.ts`

- [ ] **Step 1: Add crop hide/restore smoke test**

Add a browser smoke test that creates a blank canvas, activates Crop tool, verifies hide/restore, and verifies pasteboard drag creates a replacement preview. Use DOM visibility for the smoke check and keep exact rect/rotation assertions in Vitest.

```ts
test("hides and restores crop preview from pasteboard and canvas click", async ({ page }) => {
  await page.goto("/");
  page.on("dialog", async (dialog) => {
    await dialog.accept(dialog.message().includes("width") ? "800" : "600");
  });
  await page.getByRole("button", { name: "New Canvas" }).click();
  await page.getByRole("button", { name: "Crop Tool" }).click();

  const canvas = page.locator("canvas").first();
  await canvas.click({ position: { x: 100, y: 100 } });
  await expect(page.locator("[data-crop-overlay]")).toBeVisible();

  await page.locator("#canvas-container").click({ position: { x: 10, y: 10 } });
  await expect(page.locator("[data-crop-overlay]")).toHaveCount(0);

  await canvas.click({ position: { x: 100, y: 100 } });
  await expect(page.locator("[data-crop-overlay]")).toBeVisible();
});

test("creates replacement crop preview from pasteboard drag", async ({ page }) => {
  await page.goto("/");
  page.on("dialog", async (dialog) => {
    await dialog.accept(dialog.message().includes("width") ? "800" : "600");
  });
  await page.getByRole("button", { name: "New Canvas" }).click();
  await page.getByRole("button", { name: "Crop Tool" }).click();

  const container = page.locator("#canvas-container");
  await container.dispatchEvent("pointerdown", {
    button: 0,
    pointerId: 1,
    clientX: 10,
    clientY: 10,
  });
  await container.dispatchEvent("pointermove", {
    pointerId: 1,
    clientX: 180,
    clientY: 160,
  });
  await container.dispatchEvent("pointerup", {
    pointerId: 1,
    clientX: 180,
    clientY: 160,
  });

  await expect(page.locator("[data-crop-overlay]")).toBeVisible();
});
```

If the pasteboard click position overlaps the transformed canvas at the default viewport, use a container coordinate outside the document bounds. The first test must fail if canvas click creates full-canvas fallback instead of restoring hidden preview. The second test must fail if pasteboard pointer down always hides immediately and never allows drag replacement.

- [ ] **Step 2: Run E2E**

Run:

```powershell
pnpm.cmd run test:e2e
```

Expected:

```text
PASS e2e/editor-smoke.spec.ts
```

## Task 9: Full Verification

- [ ] **Step 1: Focused frontend tests**

Run:

```powershell
pnpm.cmd --filter photrez-desktop test -- cropToolActions
pnpm.cmd --filter photrez-desktop test -- pasteboardClickPolicy
pnpm.cmd --filter photrez-desktop test -- CanvasViewport
pnpm.cmd --filter photrez-desktop test -- CropOptionBar
pnpm.cmd --filter photrez-desktop test -- CropOverlay
```

Expected:

```text
PASS cropToolActions
PASS pasteboardClickPolicy
PASS CanvasViewport
PASS CropOptionBar
PASS CropOverlay
```

- [ ] **Step 2: Full frontend tests**

Run:

```powershell
pnpm.cmd --filter photrez-desktop test
```

Expected:

```text
Test Files 30 passed
Tests 316+ passed
```

The exact count may be higher if additional tests are added. It must not be lower than the previous passing baseline for the current branch.

- [ ] **Step 3: Browser smoke tests**

Run:

```powershell
pnpm.cmd run test:e2e
```

Expected:

```text
4 passed
```

- [ ] **Step 4: Build**

Run:

```powershell
pnpm.cmd run build
```

Expected:

```text
tsc && vite build
✓ built
```

- [ ] **Step 5: Rust verification boundary**

This crop interaction correction is expected to touch frontend TypeScript and docs only. When executing this plan as written, do not modify Rust files and do not run Rust tests. If execution intentionally expands scope and modifies Rust files, run:

```powershell
cargo test -p photrez-core
cargo test --workspace
```

Expected:

```text
test result: ok
```

## Task 10: Docs Sync After Corrected Implementation

- Modify: `docs/AI_CURRENT_TASK.md`
- Modify: `docs/AI_HISTORY.md`
- Modify: `docs/FEATURES.md`
- Modify: `docs/plans/task.md`

- [ ] **Step 1: Update `AI_CURRENT_TASK.md`**

Add a new top entry:

```md
## Current Task - Crop Hidden Preview Restore Correction [COMPLETE]

**Date:** 2026-06-05

### Scope
1. Correct Crop tool pasteboard behavior so pasteboard click hides visible crop preview instead of discarding it.
2. Restore hidden crop preview on the next canvas click without drag.
3. Keep full-canvas crop preview as fallback only when no visible or hidden preview exists.
4. Keep Cancel/Esc as discard behavior.
5. Add regression tests for hide, restore, discard, replace, and apply cleanup.

### Verification Results
- `pnpm.cmd --filter photrez-desktop test -- cropToolActions`: PASS
- `pnpm.cmd --filter photrez-desktop test -- CanvasViewport`: PASS
- `pnpm.cmd --filter photrez-desktop test -- CropOptionBar`: PASS
- `pnpm.cmd --filter photrez-desktop test -- CropOverlay`: PASS
- `pnpm.cmd --filter photrez-desktop test`: PASS
- `pnpm.cmd run test:e2e`: PASS
- `pnpm.cmd run build`: PASS
```

- [ ] **Step 2: Update `AI_HISTORY.md`**

Append near the top:

```md
## [2026-06-05] BUG FIX - Crop Hidden Preview Restore Correction [COMPLETE]

### Kategori: BUG FIX / UX / CROP / FRONTEND

**Deskripsi:** Corrected Crop tool behavior so pasteboard click hides the active crop preview and preserves it for restore. The next canvas click restores the same rect and rotation. Full-canvas preview is now fallback only when no hidden preview exists.

**Root Cause:** The previous implementation treated "crop box appears again" as "reset to full-canvas crop box", losing the last crop preview after pasteboard hide.

**Fix Rationale:** Hide, restore, discard, and replace are distinct user intents. Keeping a hidden crop preview state preserves the user's crop box across pasteboard hide while still allowing Cancel/Esc to discard the crop session.
```

- [ ] **Step 3: Update `FEATURES.md`**

Replace current crop interaction model row with:

```md
| ✅ DONE | Crop interaction model - pasteboard click hides crop preview, canvas click restores hidden preview, drag from inside or outside canvas replaces preview, double-click inside preview applies crop |
```

- [ ] **Step 4: Update `docs/plans/task.md`**

Append:

```md
| Task 208 | [CropModelCorrection] Add hidden crop preview state | [x] Completed |
| Task 209 | [CropModelCorrection] Restore hidden preview on canvas click | [x] Completed |
| Task 210 | [CropModelCorrection] Discard hidden preview on Cancel/Esc/Apply | [x] Completed |
| Task 211 | [CropModelCorrection] Regression tests and verification | [x] Completed |
```

## Manual Smoke Checklist

Run after automated tests pass:

- [ ] Open or create a document.
- [ ] Select Crop tool.
- [ ] Create a custom crop box that is not full-canvas.
- [ ] Rotate it to a visible non-zero angle.
- [ ] Click pasteboard/outside canvas.
- [ ] Confirm crop overlay disappears and Crop tool remains active.
- [ ] Click canvas once without drag.
- [ ] Confirm the exact previous crop box returns with the same rotation.
- [ ] Click pasteboard again.
- [ ] Drag on canvas.
- [ ] Confirm a new crop box is created and old hidden preview does not return.
- [ ] Drag from pasteboard/outside canvas into the canvas.
- [ ] Confirm a new crop box is created instead of hiding or restoring the old crop box.
- [ ] Drag from inside the canvas out into the pasteboard.
- [ ] Confirm the new crop box extends beyond the current canvas bounds.
- [ ] Drag entirely outside the current canvas with a visible pasteboard gap.
- [ ] Confirm a valid crop preview appears and can be applied as a canvas-expansion crop.
- [ ] Create a crop box, click pasteboard, press Esc.
- [ ] Click canvas once.
- [ ] Confirm full-canvas fallback appears, not the discarded hidden preview.
- [ ] Create a crop box, double-click inside it.
- [ ] Confirm crop applies and active tool switches to Move.

## Self-Review

Spec coverage:

- Pasteboard hide behavior is covered by Task 2.
- Canvas restore behavior is covered by Task 3.
- Full-canvas fallback only when no hidden preview exists is covered by Task 3.
- Replacement drag clears hidden preview and creates a new preview in Task 4.
- Pasteboard/outside-canvas drag creation and boundary-crossing drag are covered by Task 4.
- Cancel/Esc discard behavior is covered by Task 5.
- Apply cleanup is covered by Task 6.
- Policy wording and docs are covered by Tasks 7 and 10.
- Browser smoke coverage for hide/restore and pasteboard drag replacement is covered by Task 8.

Placeholder scan:

- This plan intentionally avoids deferred placeholders. Every task includes target files, test snippets, commands, and expected results.

Type consistency:

- `CropPreview` is defined once in `cropState.ts`.
- `hiddenCropPreview` / `setHiddenCropPreview` are exposed through `EditorContextValue`.
- `CropPreviewControls` uses the same field names across all action helpers.
- `discardCropSession`, `hideCropPreview`, and `restoreHiddenCropPreview` are used consistently across tasks.

## Execution Handoff

Plan complete and saved to `docs/superpowers/plans/2026-06-05-crop-interaction-model-plan.md`.

Two exec options:

1. **Subagent-Driven (recommended)** - dispatch a fresh subagent per task, review between tasks, fast iteration.
2. **Inline exec** - execute tasks in this session using executing-plans, batch execution with checkpoints.

Choose one before implementation.
