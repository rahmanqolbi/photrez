# Viewport Camera Regression Recovery Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Restore reliable canvas/tool alignment after the GPU smooth zoom migration, then reintroduce smooth zoom only after viewport coordinate ownership is proven stable.

**Architecture:** Treat viewport pan/zoom as a single-source-of-truth problem. First recover the known-good coordinate model, then centralize viewport writes behind one adapter, then add regression tests and only then decide whether smooth zoom should be WebGL-camera based or presentation-only.

**Tech Stack:** SolidJS, TypeScript, WebGL2 renderer, Photrez DocumentEngine, Vitest, Tauri 2.

---

## Current Diagnosis

The GPU smooth zoom plan moved rendering from CSS transform-driven viewport sizing into a WebGL camera matrix, but the current tree still has mixed viewport ownership:

- `ViewportCamera` drives WebGL rendering and some overlays.
- `engine.setViewport`, `setPan`, and `setZoom` are still called directly by some UI paths.
- Move/selection overlays use camera screen-space, while some interactions still depend on engine viewport state or CSS-transformed document containers.
- The old plan file is still marked `Draft — Pending User Approval`, but the project docs now record the migration as `DONE`.

This makes bugs like “Move Tool bounding box separated from layer” expected, because rendered pixels and tool overlays can read different transform states.

## Recovery Principle

Do not polish zoom animation while tool geometry is unstable.

The first milestone is not smoothness. The first milestone is:

1. Canvas pixels align with selected layer overlay.
2. Pointer hit-testing selects the same layer the user sees.
3. Move, resize, rotate, brush cursor, classic crop, modern crop, smart guides, and navigator all agree on the same pan/zoom.

---

## Files And Responsibilities

- `apps/desktop/src/viewport/viewportCamera.ts`  
  Camera state, conversions, and optional animation. Must not silently diverge from engine viewport.

- `apps/desktop/src/components/editor/EditorContext.tsx`  
  Should expose one viewport adapter API. Avoid letting components mutate camera, Solid signals, and engine independently.

- `apps/desktop/src/components/editor/useViewportRenderer.ts`  
  Owns renderer sizing, fit-to-screen, animation loop, and render scheduling.

- `apps/desktop/src/components/editor/usePanNavigation.ts`  
  Owns wheel zoom, panning, momentum, and scroll behavior.

- `apps/desktop/src/components/editor/CanvasViewport.tsx`  
  Hosts canvas and overlays. Should not mix incompatible coordinate containers for active tool overlays.

- `apps/desktop/src/components/editor/SelectionTransformOverlay.tsx`  
  Move Tool transform box. Must align with WebGL-rendered layer AABB across pan/zoom.

- `apps/desktop/src/components/editor/Navigator.tsx` and `apps/desktop/src/components/editor/LayersPanel.tsx`  
  Existing direct viewport mutation paths that must be routed through the same viewport adapter.

- `apps/desktop/src/renderer/webgl2.ts`  
  WebGL draw pipeline. Must apply the viewport transform exactly once.

- `docs/AI_CURRENT_TASK.md`, `docs/AI_HISTORY.md`, `docs/FEATURES.md`  
  Must be updated when implementation begins and after each completed recovery stage.

---

### Task 1: Freeze Scope And Capture Baseline

**Files:**
- Read: `docs/plans/2026-06-13-gpu-smooth-zoom-transitions-design.md`
- Read: `apps/desktop/src/components/editor/CanvasViewport.tsx`
- Read: `apps/desktop/src/components/editor/SelectionTransformOverlay.tsx`
- Read: `apps/desktop/src/components/editor/useViewportRenderer.ts`
- Read: `apps/desktop/src/components/editor/usePanNavigation.ts`
- Read: `apps/desktop/src/renderer/webgl2.ts`
- Modify: `docs/AI_CURRENT_TASK.md`

- [ ] **Step 1: Mark recovery execution start**

Append a new `BUG FIX / VIEWPORT` entry to `docs/AI_CURRENT_TASK.md` before touching implementation code:

```markdown
### [2026-06-13] Bug Fix — Viewport Camera Regression Recovery [IN PROGRESS]

**Goal:**
Restore canvas/tool coordinate consistency after the GPU smooth zoom migration before adding or polishing zoom transitions.

**Initial Risk:**
Current viewport state is split between `ViewportCamera`, SolidJS `pan/zoom`, and `DocumentEngine.viewport`.
```

- [ ] **Step 2: Record current changed files**

Run:

```powershell
git status --short
git diff --stat
```

Expected:
- Confirm all current smooth-zoom-related files are visible.
- Do not revert unrelated user changes.

- [ ] **Step 3: Capture a manual reproduction checklist**

Use this checklist as the manual baseline before editing:

```markdown
- Open one image.
- Select Move Tool.
- Click the visible layer.
- Verify transform box sits exactly on the image bounds.
- Zoom via Navigator slider.
- Verify transform box still sits exactly on the image bounds.
- Zoom via Ctrl+wheel.
- Verify transform box still sits exactly on the image bounds.
- Drag layer 20px right/down.
- Verify rendered image and box move together.
- Switch to Brush and verify cursor ring follows pointer after zoom.
- Switch to Classic Crop and verify crop handles match canvas pixels.
- Switch to Modern Crop and verify existing behavior is not worsened.
```

- [ ] **Step 4: Decide rollback boundary**

Do not delete files yet. Classify each smooth zoom change as one of:

```markdown
- KEEP: standalone tests/utilities that do not affect runtime.
- REVERT: runtime camera integration that splits viewport truth.
- REWORK: useful code that must be routed through one adapter.
```

---

### Task 2: Restore One Source Of Truth For Viewport Writes

**Files:**
- Modify: `apps/desktop/src/components/editor/EditorContext.tsx`
- Modify: `apps/desktop/src/components/editor/Navigator.tsx`
- Modify: `apps/desktop/src/components/editor/LayersPanel.tsx`
- Modify: `apps/desktop/src/components/editor/usePanNavigation.ts`
- Modify: `apps/desktop/src/components/editor/useCanvasKeyboard.ts`
- Test: `apps/desktop/src/components/editor/__tests__/viewport-state-sync.test.tsx`

- [ ] **Step 1: Add a failing test for camera/engine/signal sync**

Create `apps/desktop/src/components/editor/__tests__/viewport-state-sync.test.tsx` with tests that prove viewport mutation keeps all three states aligned:

```tsx
import { describe, expect, it } from "vitest";
import { ViewportCamera } from "@/viewport/viewportCamera";

describe("viewport state synchronization", () => {
  it("keeps camera state numerically stable for pan and zoom", () => {
    const camera = new ViewportCamera();

    camera.setState({ x: 120, y: 80, zoom: 0.6 });

    expect(camera.getState()).toEqual({ x: 120, y: 80, zoom: 0.6 });
    expect(camera.documentToScreen(0, 0)).toEqual({ x: 120, y: 80 });
    expect(camera.screenToDocument(120, 80)).toEqual({ x: 0, y: 0 });
  });
});
```

- [ ] **Step 2: Run focused test**

Run:

```powershell
pnpm.cmd --filter photrez-desktop exec vitest run src/components/editor/__tests__/viewport-state-sync.test.tsx --run
```

Expected:
- PASS for the standalone camera test.
- This confirms the test harness works before adding adapter integration assertions.

- [ ] **Step 3: Introduce one viewport adapter in `EditorContext.tsx`**

Add a single context method that updates camera, Solid signals, and engine together. Name it explicitly so future direct writes are easy to detect:

```ts
const setViewportFromCameraState = (next: { x: number; y: number; zoom: number }) => {
  camera.setState(next);
  batch(() => {
    editorState.setZoom(next.zoom);
    editorState.setPan({ x: next.x, y: next.y });
  });

  const engine = props.workspace.getActiveEngine();
  if (engine) {
    engine.setViewport({
      panX: next.x,
      panY: next.y,
      zoom: next.zoom,
    });
  }
};
```

Then make `syncFromCamera()` call this method:

```ts
const syncFromCamera = () => {
  const state = camera.getState();
  setViewportFromCameraState(state);
};
```

- [ ] **Step 4: Replace direct viewport writes**

Route direct viewport writes through the adapter in:

```text
apps/desktop/src/components/editor/Navigator.tsx
apps/desktop/src/components/editor/LayersPanel.tsx
apps/desktop/src/components/editor/usePanNavigation.ts
apps/desktop/src/components/editor/useCanvasKeyboard.ts
apps/desktop/src/components/editor/useViewportRenderer.ts
```

The target rule:

```text
No component should call engine.setViewport({ panX, panY, zoom }) and setPan/setZoom separately.
```

- [ ] **Step 5: Search for remaining direct writes**

Run:

```powershell
rg -n "engine\.setViewport|setPan\(|setZoom\(|camera\.setState|camera\.pan|camera\.zoomToPoint|camera\.animate" apps/desktop/src/components/editor apps/desktop/src/viewport
```

Expected:
- Remaining direct writes are either inside the viewport adapter or explicitly justified local camera animation setup.

---

### Task 3: Revert Or Fence The Runtime WebGL Camera Path

**Files:**
- Modify: `apps/desktop/src/renderer/webgl2.ts`
- Modify: `apps/desktop/src/renderer/types.ts`
- Modify: `apps/desktop/src/components/editor/useViewportRenderer.ts`
- Modify: `apps/desktop/src/components/editor/CanvasViewport.tsx`
- Test: `apps/desktop/src/ui-sanity.test.ts`

- [ ] **Step 1: Choose the stabilization mode**

Use this decision:

```markdown
Default stabilization mode: CSS/document-space viewport path.

Reason:
The existing tools were built around document-space overlays inside a CSS-transformed viewport. Reverting to this mode is the fastest way to restore editor correctness. Smooth zoom can be reintroduced later as a presentation-layer animation or behind a feature flag.
```

- [ ] **Step 2: Add a runtime feature flag**

In the viewport integration code, define a local constant:

```ts
const USE_WEBGL_VIEWPORT_CAMERA = false;
```

Use it to fence the WebGL camera matrix path. The default user-facing runtime must use the stable path.

- [ ] **Step 3: Ensure WebGL transform is applied once**

In `webgl2.ts`, verify the final pass does not apply the viewport camera a second time. The final pass should either:

```ts
// Stable path: document-sized render path
renderer.render(engine.getRenderState());
```

or:

```ts
// Camera path: FBO content copied to viewport exactly once
renderer.render(engine.getRenderState(), camera.getViewProjectionMatrix());
```

Do not mix both for the same frame.

- [ ] **Step 4: Keep the layout regression test**

Keep the existing docked-layout regression test in `apps/desktop/src/ui-sanity.test.ts`.

Run:

```powershell
pnpm.cmd --filter photrez-desktop exec vitest run src/ui-sanity.test.ts --run
```

Expected:
- PASS.

---

### Task 4: Repair Move Tool Alignment First

**Files:**
- Modify: `apps/desktop/src/components/editor/SelectionTransformOverlay.tsx`
- Modify: `apps/desktop/src/components/editor/useSelectionTransformDrag.ts`
- Modify: `apps/desktop/src/components/editor/CanvasViewport.tsx`
- Test: `apps/desktop/src/components/editor/__tests__/SelectionTransformOverlay.test.ts`

- [ ] **Step 1: Add a failing transform-box alignment assertion**

Add or extend a test in `SelectionTransformOverlay.test.ts` proving a selected layer at `{ x: 0, y: 0, width: 472, height: 709 }` with viewport pan `{ x: 100, y: 50 }` and zoom `0.6` renders its transform box at:

```ts
{
  x: 100,
  y: 50,
  width: 283.2,
  height: 425.4,
}
```

- [ ] **Step 2: Run focused test and verify failure**

Run:

```powershell
pnpm.cmd --filter photrez-desktop exec vitest run src/components/editor/__tests__/SelectionTransformOverlay.test.ts --run
```

Expected before fix:
- FAIL if overlay and rendered layer use different viewport state.

- [ ] **Step 3: Make overlay use the same viewport state as the canvas**

Use one path consistently:

```ts
const screenTopLeft = camera.documentToScreen(layerX(), layerY());
const screenWidth = effW() * camera.getState().zoom;
const screenHeight = effH() * camera.getState().zoom;
```

Do not mix `zoom()` signal from a stale source with `camera.documentToScreen(...)` unless both are guaranteed to be synchronized by the adapter.

- [ ] **Step 4: Run focused test and manual Move Tool check**

Run:

```powershell
pnpm.cmd --filter photrez-desktop exec vitest run src/components/editor/__tests__/SelectionTransformOverlay.test.ts --run
```

Manual check:

```markdown
- Open image.
- Select Move Tool.
- Select Background layer.
- Confirm bounding box is exactly on image edges at 60%, 100%, and after Ctrl+wheel.
- Drag layer and confirm image + bounding box move together.
```

---

### Task 5: Repair Pointer Coordinate Conversion

**Files:**
- Modify: `apps/desktop/src/viewport/coords.ts`
- Modify: `apps/desktop/src/components/editor/CanvasViewport.tsx`
- Modify: `apps/desktop/src/components/editor/useCanvasPointerTools.ts`
- Modify: `apps/desktop/src/components/editor/useCropOverlayDrag.ts`
- Test: `apps/desktop/src/__tests__/viewportCamera.test.ts`
- Test: `apps/desktop/src/components/editor/__tests__/CanvasViewport.test.tsx`

- [ ] **Step 1: Add round-trip tests**

Extend `viewportCamera.test.ts` with:

```ts
it("round-trips document and screen coordinates after pan and zoom", () => {
  const camera = new ViewportCamera({ x: 86, y: 124, zoom: 0.6 });
  const screen = camera.documentToScreen(472, 709);
  const doc = camera.screenToDocument(screen.x, screen.y);

  expect(doc.x).toBeCloseTo(472, 4);
  expect(doc.y).toBeCloseTo(709, 4);
});
```

- [ ] **Step 2: Run camera tests**

Run:

```powershell
pnpm.cmd --filter photrez-desktop exec vitest run src/__tests__/viewportCamera.test.ts --run
```

Expected:
- PASS.

- [ ] **Step 3: Ensure all pointer conversions use viewport-relative screen coordinates**

For container-relative pointer input, use:

```ts
const rect = canvasContainerRef.getBoundingClientRect();
const localX = e.clientX - rect.left;
const localY = e.clientY - rect.top;
const doc = camera.screenToDocument(localX, localY);
```

Do not pass absolute client coordinates into `camera.screenToDocument`.

- [ ] **Step 4: Manual hit-test check**

Manual check:

```markdown
- Open image.
- At 60%, click visible image center with Move Tool.
- Expected: selected layer becomes active.
- At 200%, click visible image center.
- Expected: same layer selected, not pasteboard clear.
- At 200%, click outside image.
- Expected: selection clears.
```

---

### Task 6: Regress Brush, Classic Crop, Modern Crop, Smart Guides, Navigator

**Files:**
- Modify as needed:
  - `apps/desktop/src/components/editor/BrushCursorOverlay.tsx`
  - `apps/desktop/src/components/editor/CropOverlay.tsx`
  - `apps/desktop/src/components/editor/ModernCropOverlay.tsx`
  - `apps/desktop/src/components/editor/SmartGuides.tsx`
  - `apps/desktop/src/components/editor/Navigator.tsx`
- Test:
  - `apps/desktop/src/components/editor/__tests__/BrushCursorOverlay.test.tsx`
  - `apps/desktop/src/components/editor/__tests__/CropOverlay.test.tsx`
  - `apps/desktop/src/components/editor/__tests__/CanvasViewport.test.tsx`

- [ ] **Step 1: Run focused overlay tests**

Run:

```powershell
pnpm.cmd --filter photrez-desktop exec vitest run src/components/editor/__tests__/BrushCursorOverlay.test.tsx src/components/editor/__tests__/CropOverlay.test.tsx src/components/editor/__tests__/CanvasViewport.test.tsx --run
```

Expected:
- PASS before moving on.

- [ ] **Step 2: Manual Brush check**

```markdown
- Select Brush.
- Zoom to 60%, 200%, and 500%.
- Move pointer without drawing.
- Expected: brush cursor ring stays centered under pointer.
- Ctrl+wheel zoom without moving mouse.
- Expected: cursor ring updates without needing mouse shake.
```

- [ ] **Step 3: Manual Classic Crop check**

```markdown
- Select Crop Tool, Classic mode.
- Drag crop box.
- Resize all four corners.
- Pan with Space+drag.
- Expected: crop handles stay on visible crop rectangle.
```

- [ ] **Step 4: Manual Modern Crop check**

```markdown
- Select Crop Tool, Modern mode.
- Create default frame.
- Zoom and pan.
- Resize frame.
- Expected: no new drift, no forced top-left jump, no apply-preview mismatch.
```

- [ ] **Step 5: Manual Navigator check**

```markdown
- Drag Navigator red box.
- Use Navigator zoom slider.
- Expected: main viewport, visible image, and move overlay remain synchronized.
```

---

### Task 7: Decide Smooth Zoom Reintroduction Strategy

**Files:**
- Modify: `docs/plans/2026-06-13-gpu-smooth-zoom-transitions-design.md`
- Create or modify: `docs/plans/2026-06-13-smooth-zoom-reintroduction-plan.md`
- Modify: `docs/decisions/id-decision-log.md`

- [ ] **Step 1: Mark old plan status honestly**

Update the old plan header to indicate it caused regressions and is no longer executable as-is:

```markdown
**Status**: Superseded — caused viewport/tool coordinate regressions when executed as a full runtime migration.
```

- [ ] **Step 2: Record the architecture decision**

Append to `docs/decisions/id-decision-log.md`:

```markdown
## [2026-06-13] Viewport Smooth Zoom Recovery Decision

Decision:
Do not ship the GPU camera viewport migration until all editing tools share one viewport state and tool overlays have regression coverage.

Reason:
The initial migration split viewport ownership between WebGL camera, SolidJS signals, and DocumentEngine viewport, causing rendered pixels and tool overlays to diverge.

Next:
Restore stable viewport behavior first. Reintroduce smooth zoom behind a feature flag or as presentation-only interpolation after Move, Brush, Crop, and Navigator tests pass.
```

- [ ] **Step 3: Choose one of two reintroduction paths**

Recommended default:

```markdown
Path A — Presentation-only smooth zoom:
- Keep document-space tool math.
- Animate CSS transform only for visual interpolation.
- Commit final pan/zoom instantly to engine/camera adapter.
- Disable animation during active drag/paint/crop.
```

Higher-risk future path:

```markdown
Path B — Full WebGL camera viewport:
- Feature-flagged.
- All viewport writes through adapter.
- All overlays screen-space.
- All pointer input camera-based.
- Golden tests and manual QA required per tool.
```

---

### Task 8: Full Verification Gate

**Files:**
- Modify: `docs/AI_HISTORY.md`
- Modify: `docs/FEATURES.md`
- Modify: `docs/AI_CURRENT_TASK.md`

- [ ] **Step 1: Run frontend focused tests**

Run:

```powershell
pnpm.cmd --filter photrez-desktop exec vitest run src/__tests__/viewportCamera.test.ts src/components/editor/__tests__/SelectionTransformOverlay.test.ts src/components/editor/__tests__/BrushCursorOverlay.test.tsx src/components/editor/__tests__/CropOverlay.test.tsx src/components/editor/__tests__/CanvasViewport.test.tsx src/ui-sanity.test.ts --run
```

Expected:
- PASS.

- [ ] **Step 2: Run full frontend suite**

Run:

```powershell
pnpm.cmd --filter photrez-desktop test --run
```

Expected:
- PASS.

- [ ] **Step 3: Run build**

Run:

```powershell
pnpm.cmd run build
```

Expected:
- PASS.

- [ ] **Step 4: Run Rust tests**

Run:

```powershell
cargo test -p photrez-core
cargo test --workspace
```

Expected:
- PASS or document any unrelated pre-existing failure with exact error.

- [ ] **Step 5: Manual app smoke**

Run:

```powershell
pnpm.cmd tauri dev
```

Manual smoke:

```markdown
- Open image.
- Move Tool select/drag/resize/rotate.
- Ctrl+wheel zoom.
- Navigator zoom/pan.
- Brush cursor and one stroke.
- Classic Crop drag/resize.
- Modern Crop entry/resize/apply cancel path.
- Export dialog still opens.
```

- [ ] **Step 6: Update docs after implementation**

Append `AI_HISTORY.md` with:

```markdown
## [2026-06-13] BUG FIX — Viewport Camera Regression Recovery [COMPLETE]

### Kategori: BUG FIX / VIEWPORT / TOOL ALIGNMENT

**Root Cause:**
The GPU smooth zoom migration split viewport ownership between WebGL camera, SolidJS pan/zoom signals, and DocumentEngine viewport. Some tools rendered overlays from camera state while other input and UI paths still mutated engine viewport directly.

**Fix Rationale:**
Restore one viewport mutation path and verify rendered pixels, overlays, and pointer hit-testing agree before reintroducing smooth zoom animation.

**Verification:**
- PASS/FAIL entries with exact commands.
```

Update `FEATURES.md` Viewport section to avoid overstating smooth zoom as complete if it remains disabled or feature-flagged.

Update `AI_CURRENT_TASK.md` entry from `[IN PROGRESS]` to `[COMPLETE]` only after verification passes.

---

## Execution Notes

- Prefer `pnpm.cmd` on Windows.
- Do not use `cargo check -p photrez-desktop` as the binary verification gate because the repo notes a pre-existing `windres` issue.
- Use `pnpm.cmd tauri dev` for app-level compile/launch verification.
- Do not mark smooth zoom as complete unless manual tool QA confirms there is no overlay drift.
- If full WebGL camera migration remains desired, it must be a new feature-flagged plan, not a patch on top of unstable mixed ownership.

## Self-Review

- Spec coverage: Covers diagnosis, rollback/stabilization, viewport ownership, Move Tool alignment, pointer conversion, other tool regression checks, documentation truth reset, and verification.
- Placeholder scan: No task depends on undefined “later” behavior. Every task has concrete commands or expected manual checks.
- Type consistency: Uses existing project concepts: `ViewportCamera`, `engine.setViewport`, `pan/zoom`, `SelectionTransformOverlay`, WebGL2 renderer, and Photrez docs protocol.
