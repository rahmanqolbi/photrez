# AI_CURRENT_TASK.md - Photrez Current Task

---

## Current Task - Crop Rotate Regression Recovery [COMPLETE]

**Date:** 2026-06-08

### Scope

- Recover regressions after rotate hit-area rollback went too far.
- Fix Modern Crop rotation preview so the image canvas rotates with the Modern crop transform instead of only moving the artboard border/overlay.
- Remove stale Classic Crop corner-arc rotate UI so Classic uses the newer outside rotate band without changing crop resize/move math.

### Working Hypothesis

- Modern Crop's visual rotation broke because the WebGL canvas was moved outside the transform container for post-crop edge quality, while `modernImageTransformStyle()` is still applied to the document-space overlay container.
- Classic Crop still looks like the old version because `CropOverlayHandles` continues rendering corner rotate arcs even after `CropOverlay` added the shared outside rotate band.

### Fix

1. **Modern Crop canvas transform restored** — `CanvasViewport.tsx` now applies `modernImageTransformStyle()` directly to the WebGL canvas while Modern Crop is active, using document-size CSS dimensions so the existing pivot/rotation math rotates the image itself instead of only the artboard overlay container.
2. **Classic stale rotate arcs removed** — `CropOverlayHandles.tsx` no longer renders the old corner arc rotate UI/hit paths. Classic Crop keeps the existing resize handles, while rotation is owned by the shared outside rotate band in `CropOverlay.tsx`.

### Verification

- PASS: `pnpm --filter photrez-desktop exec vitest run src/components/editor/__tests__/CropOverlay.test.tsx src/components/editor/__tests__/rotateBand.test.ts --pool=threads --maxWorkers=1` (42 tests)
- PASS: `pnpm run build`
- PASS: `pnpm --filter photrez-desktop test --run --pool=threads --maxWorkers=1` (724 tests)

---

## Current Task - Classic Rotated Crop Resize Axis Fix [COMPLETE]

**Date:** 2026-06-08

### Scope

- Fix Classic Crop resize after rotation where dragging handles makes the crop box stretch in the wrong direction.
- Keep Modern Crop unchanged.
- Keep Classic move/rotate behavior unchanged; only resize delta mapping should change.

### Root Cause Hypothesis

- Classic Crop renders the crop box and handles inside a rotated SVG group, but resize drag still sends raw screen/document-axis deltas into `applyCropResizeHandle`.
- Once the crop box is rotated, resize handles visually move along the crop box's local axes, so pointer delta must be inverse-rotated into crop-local coordinates before width/height math runs.

### Fix

- Added `screenDeltaToRotatedCropLocalDelta()` in `cropGeometry.ts`.
- Updated Classic Crop resize drag in `useCropOverlayDrag.ts` to inverse-rotate resize deltas by the current crop rotation before calling `applyCropResizeHandle()`.
- Move and rotate interactions are unchanged.

### Verification

- PASS: `pnpm --filter photrez-desktop exec vitest run src/__tests__/crop-geometry.test.ts src/components/editor/__tests__/CropOverlay.test.tsx --pool=threads --maxWorkers=1` (70 tests)
- PASS: `pnpm run build`
- PASS: `pnpm --filter photrez-desktop test --run --pool=threads --maxWorkers=1` (728 tests)

---

## Current Task - Size Mode Frame Fitting + Crop Re-entry Sync [COMPLETE]

**Date:** 2026-06-08

### Scope

1. **Size mode frame must fit canvas** — Target W/H defines output aspect/size, but visible crop preview must always be scaled to fill canvas bounds at the target's aspect ratio.
2. **Crop re-entry sync** — After undo/redo or returning to Crop, the option bar keeps previous mode/values, but the crop box/frame does not recompute to match. Fix by ensuring preview reinitializes from current option bar values on entry and mode change.

### Bugs Found & Fixed

#### Bug 1: Size mode used raw target dimensions for preview
**Root cause:** Size mode's frame-setting paths used `fitFrameToMaxBounds(target.w * zoom, target.h * zoom)` which preserved literal target pixel size. A small target (100×100) produced a tiny 100×100 frame instead of filling canvas at 1:1 aspect.

**Fix** (`CropOptionBar.tsx`): Replaced `fitFrameToMaxBounds` with `setModernFrameToAspect({ w: target.w, h: target.h })` in all 4 Size mode paths (mode switch, W input, H input, swap). Frame now always fills canvas at target's aspect ratio, consistent with Ratio mode behavior.

**Files:** `apps/desktop/src/components/editor/CropOptionBar.tsx`

#### Bug 2: Modern crop session key ignored mode/values
**Root cause:** The Modern crop entry effect's session key `${activeDocumentId}:${viewportWidth}x${viewportHeight}:${zoom}` did not track `cropMode()`, `cropAspect()`, or `cropSizeTarget()`. Changing modes mid-session or re-entering crop didn't refit the frame. Size mode passed `aspect: null` to `getDefaultModernCropFrame`, defaulting to canvas aspect.

**Fix** (`CanvasViewport.tsx`): Extended session key to `${...}:${mode}:${aspectKey}`. Computes aspect from current mode: Ratio uses `cropAspect()`, Size uses `{ w: cropSizeTarget.w, h: cropSizeTarget.h }`, Free uses null.

#### Bug 3: Classic crop had no entry initialization
**Root cause:** No effect initialized `cropRect` on Classic mode entry. Entering Crop in Size/Ratio mode with no rect left preview empty while controls showed correct values.

**Fix** (`CanvasViewport.tsx`): Added `createEffect` that initializes `cropRect` via `fitCropRectToAspect` when entering Classic crop in constrained mode with no rect and no hidden preview. Only creates rect when `cropRect()` is null AND `hiddenCropPreview()` is null — preserves pasteboard hide/restore mechanism.

### Tests Added (11 total)

**CropOptionBar.test.tsx** (6 new):
- Small target (100×100) fills canvas at 1:1 aspect
- Very tall target (1000×2000, 1:2) fills canvas
- Very wide target (2000×1000, 2:1) fills canvas
- Size W input submit refits frame to new aspect
- Size H input submit refits frame to new aspect
- Swap button in Size mode refits frame to swapped aspect

**CanvasViewport.test.tsx** (5 new):
- Modern: entering Crop in Size mode initializes frame at target aspect
- Classic: entering Crop in Size mode initializes rect at target aspect
- Classic: entering Crop in Ratio mode initializes rect at cropAspect
- Classic: entering Crop in Free mode does NOT auto-create rect
- Switching mode after entering Crop refits Modern frame (Free→Size→Ratio)

### Verification Results
- PASS: `pnpm.cmd run build` (tsc + Vite)
- PASS: `pnpm.cmd --filter photrez-desktop test --run --pool=threads --maxWorkers=1` (692 tests, 50 files)

### Files Changed
- `apps/desktop/src/components/editor/CropOptionBar.tsx`
- `apps/desktop/src/components/editor/CanvasViewport.tsx`
- `apps/desktop/src/components/editor/__tests__/CropOptionBar.test.tsx`
- `apps/desktop/src/components/editor/__tests__/CanvasViewport.test.tsx`
- `docs/AI_CURRENT_TASK.md`
- `docs/AI_HISTORY.md`
- `docs/FEATURES.md`

---

**Date:** 2026-06-08

### Scope
- Adversarial bug hunting across editor: test regression flows, fix bugs with minimal scope, report findings.

### Bugs Found & Fixed

1. **Classic crop state persisted across document switches** — `cropRect`, `cropRotation`, `cropMode`, `cropAspect`, `cropSizeTarget`, `hiddenCropPreview` leaked from old documents to new documents with different dimensions.
   - **Root cause**: `cropState.ts` stores pure signals with no reactive effects on `activeDocumentId`. CanvasViewport never reset them on document change.
   - **Fix**: Added `createEffect` in `CanvasViewport.tsx` (lines 188-203) that resets Classic crop state when `activeDocumentId()` changes. Uses `prevDocIdForCropReset` sentinel to skip initial mount.
   - **Exposed**: `setCropMode`, `setCropAspect`, `setCropSizeTarget`, `clearCropStacks` added to CanvasViewport destructuring.

### Non-Bugs Verified (No Fix Needed)

2. **Lostpointercapture during Modern crop** — Pointer capture on SVG root ensures `pointerup` fires on SVG regardless of pointer position. Undo works because `onModernCropCommit()` fires at drag start, pushing pre-drag state to undo stack.
3. **Escape during Modern rotate drag** — Two-handler mechanism: SVG `onKeyDown` → `clearDrag()`, then window `keydown` → `resetModernCrop()`.
4. **Pointer capture + lostpointercapture during Modern move/resize/rotate** — All three drag types correctly stop further updates after lostpointercapture.

### Regression Tests Added

**CanvasViewport.test.tsx** (4 new tests):
- Classic crop state resets when switching documents
- Classic crop state resets when switching back to original document
- Modern crop frame recomputes with new document dimensions/aspect ratio
- Crop state resets even when not in crop tool

**CropOverlay.test.tsx** (3 new tests):
- Modern crop: lostpointercapture during move drag stops updates
- Modern crop: lostpointercapture during resize drag stops updates
- Modern crop: lostpointercapture during rotate drag stops updates

**modern-crop-geometry.test.ts** (6 new tests):
- Resize from minimum 24×24 outward doesn't produce NaN
- Resize from minimum 24×24 inward doesn't crash
- 100:1 aspect ratio resize maintains monotonic growth
- 1:100 aspect ratio resize maintains monotonic growth
- Extreme free mode resize stays finite (no NaN)
- Extreme inward free mode resize clamps to minimum

### Files Changed
- `apps/desktop/src/components/editor/CanvasViewport.tsx` — crop reset effect + setter imports
- `apps/desktop/src/components/editor/__tests__/CanvasViewport.test.tsx` — 4 new doc-switch tests
- `apps/desktop/src/components/editor/__tests__/CropOverlay.test.tsx` — 3 new lostpointercapture tests
- `apps/desktop/src/__tests__/modern-crop-geometry.test.ts` — 6 new edge case tests
- `docs/AI_CURRENT_TASK.md`
- `docs/AI_HISTORY.md`

### Verification Results
- PASS: `pnpm.cmd run build` (tsc + Vite, 2075 modules)
- PASS: `pnpm.cmd --filter photrez-desktop test --run --pool=threads --maxWorkers=1` (681 tests, 50 files)

---

## Current Task - Crop Mode/Layout Changes Stale Frame Fix [COMPLETE]

**Date:** 2026-06-08

### Scope
- Fix crop box not re-fitting to canvas after mode, ratio, or size changes.
- **Phase 1** (previous): Mode selector Free/Ratio/Size not applying immediately due to `if (cropRect())` guard excluding Modern mode, no `mode === "free"` branch.
- **Phase 2** (this task): Even after mode applies, the frame can still be stale/oversized — not clamped to canvas bounds. Affects: Large size targets, ratio preset changes, swap button, repeated mode cycling, `handlePresetChange("custom")` missing Modern path.

### Changes

**`CropOptionBar.tsx`:**

1. **New helper `fitFrameToMaxBounds`** — scales frame down preserving aspect if it exceeds `min(viewport, doc * zoom)`. Used in all frame-setting paths.

2. **`setModernFrameToAspect` rewritten** — now calls `getDefaultModernCropFrame` (gives max frame at aspect that fits canvas) instead of ad-hoc aspect fitting within current frame.

3. **Mode `onChange` → Free**: calls `fitFrameToMaxBounds` on current frame.

4. **Mode `onChange` → Size**: uses `fitFrameToMaxBounds(target * zoom)` instead of raw assign.

5. **Size W/H EditableNumField `onSubmit`**: both use `fitFrameToMaxBounds`.

6. **`handlePresetChange("custom")`**: added Modern mode path via `setModernFrameToAspect`.

7. **Swap button — Size mode**: uses `fitFrameToMaxBounds`.

8. **Swap button — Free mode**: uses `fitFrameToMaxBounds`.

**`CropOptionBar.test.tsx`:**
- Added 7 regression tests in new `"crop box always fits inside canvas after changes"` suite covering:
  - Repeated mode changes (Free→Ratio→Size→Free→Ratio): frame always ≤ max bounds
  - Size→Free with oversized frame: clamps to max bounds preserving aspect
  - Ratio preset change (16:9 → 3:2): frame re-fits at new aspect
  - Custom ratio "preset" selection in Modern mode
  - Classic mode repeated mode changes: rect always inside doc bounds

### Files Changed
- `apps/desktop/src/components/editor/CropOptionBar.tsx`
- `apps/desktop/src/components/editor/__tests__/CropOptionBar.test.tsx`
- `docs/AI_CURRENT_TASK.md`
- `docs/AI_HISTORY.md`

### Verification Results
- PASS: `pnpm.cmd --filter photrez-desktop exec vitest run src/components/editor/__tests__/CropOptionBar.test.tsx` (19 tests: 15 new + 4 existing)
- PASS: `pnpm.cmd --filter photrez-desktop test --run --pool=threads --maxWorkers=1` (668 tests, 50 files)
- PASS: `pnpm.cmd run build` (tsc + Vite)

---

## Current Task - Global Focus Halo / :focus-visible Fix [COMPLETE]

---


## Current Task - Modern Crop Apply Rotation Sign [COMPLETE]

**Date:** 2026-06-07

### Scope
- Fix Modern Crop apply when the image is rotated so the committed crop orientation matches the visible preview.
- Preserve Classic Crop crop-rotation semantics and only adapt Modern Crop's preview rotation before sending it to the crop engine.
- Add regression coverage before production changes.

### Root Cause
- Modern Crop preview renders the image with CSS/document rotation `+R`, but `DocumentEngine.applyCrop()` treats `cropRotation` as a crop-frame rotation that is subtracted from the layer transform.
- Passing Modern preview rotation directly makes the committed result appear opposite/inverted after apply.

### Fix
- Added `getModernCropApplyRotation()` so Modern Crop converts preview rotation into the crop engine rotation convention before apply.
- Updated Modern Crop apply paths in viewport overlay, keyboard Enter, and option-bar Apply to use the converted rotation.
- Preserved Classic Crop behavior by leaving Classic `cropRotation()` pass-through unchanged.

### Files Changed
- `apps/desktop/src/viewport/modernCropGeometry.ts`
- `apps/desktop/src/components/editor/CanvasViewport.tsx`
- `apps/desktop/src/components/editor/CropOptionBar.tsx`
- `apps/desktop/src/components/editor/useCanvasKeyboard.ts`
- `apps/desktop/src/__tests__/modern-crop-geometry.test.ts`
- `apps/desktop/src/components/editor/__tests__/ModernCropKeyboardParity.test.tsx`
- `docs/AI_CURRENT_TASK.md`
- `docs/AI_HISTORY.md`
- `docs/FEATURES.md`

### Verification Results
- RED: `pnpm.cmd exec vitest run src/components/editor/__tests__/ModernCropKeyboardParity.test.tsx src/__tests__/modern-crop-geometry.test.ts --pool=threads --maxWorkers=1` failed because Modern Enter still sent `cropRotation: 15` and the conversion helper was missing.
- PASS: `pnpm.cmd exec vitest run src/components/editor/__tests__/ModernCropKeyboardParity.test.tsx src/__tests__/modern-crop-geometry.test.ts --pool=threads --maxWorkers=1` (45 tests)
- PASS: `pnpm.cmd run build`
- PASS: `pnpm.cmd --filter photrez-desktop test --run --pool=threads --maxWorkers=1` (605 tests, 50 files)

---

## Current Task - Modern Crop Visual Apply and Rotated Drag Direction [COMPLETE]

**Date:** 2026-06-07

### Scope
- Fix Modern Crop apply so the committed crop dimensions and center match the visible viewport-space crop frame.
- Fix Modern Crop image drag/resize compensation direction when the image is rotated.
- Add regression tests before production changes.

### Root Cause
- `modernFrameToCropRect()` currently maps the four screen cropbox corners through the rotated inverse transform and returns their axis-aligned bounding box. The crop engine expects the crop frame's center and unrotated crop width/height plus a rotation value, so the AABB makes the applied canvas larger and offset from the visual crop.
- Modern Crop move/resize stores raw screen deltas directly in `offsetX/offsetY`. Because the render transform rotates offset deltas, mouse drag direction becomes rotated instead of following the pointer in screen space.

### Fix
- Changed `modernFrameToCropRect()` to return the visual frame size in document units, centered on the rendered cropbox pivot. Rotation remains passed separately to the crop engine.
- Added `modernScreenDeltaToImageOffsetDelta()` to inverse-rotate screen drag/resize compensation deltas before storing them in Modern image offset state.
- Wired Modern Crop move drag and resize compensation through the new delta conversion helper.
- Added regressions for rotated apply size and rotated drag direction.

### Files Changed
- `apps/desktop/src/viewport/modernCropGeometry.ts`
- `apps/desktop/src/components/editor/ModernCropOverlay.tsx`
- `apps/desktop/src/__tests__/modern-crop-geometry.test.ts`
- `apps/desktop/src/components/editor/__tests__/CropOverlay.test.tsx`
- `docs/AI_CURRENT_TASK.md`
- `docs/AI_HISTORY.md`
- `docs/FEATURES.md`

### Verification Results
- RED: `pnpm.cmd exec vitest run src/__tests__/modern-crop-geometry.test.ts --pool=threads --maxWorkers=1` failed because rotated Modern crop returned AABB dimensions and drag delta helper was missing.
- PASS: `pnpm.cmd exec vitest run src/components/editor/__tests__/CropOverlay.test.tsx src/__tests__/modern-crop-geometry.test.ts --pool=threads --maxWorkers=1` (61 tests)
- PASS: `pnpm.cmd run build`
- PASS: `pnpm.cmd --filter photrez-desktop test --run --pool=threads --maxWorkers=1` (604 tests, 50 files)

---

## Current Task - Modern Crop Resize Handle Lag Regression Fix [COMPLETE]

**Date:** 2026-06-08

### Scope
- Fix Modern Crop resize handle trailing behind mouse cursor during drag.
- Compare with previous Bug J fix to identify why it was incomplete.
- Add real pointer-flow regression tests proving handle-to-pointer tracking at 1:1.

### Root Cause
Bug J's previous fix only doubled deltas for the Alt path (`params.alt ? params.deltaX * 2 : params.deltaX`), leaving the primary non-Alt path with `effDx = params.deltaX`. Because the frame is centered (`d(rightEdge)/d(frameW) = 1/2`), the right edge moved at half cursor speed.

### Fix
1. Removed the alt-guard: `effDx = params.deltaX * 2` unconditionally.
2. Shift+corner proportional path: `applyCropResizeHandle` receives doubled deltas.
3. Added 12 handle-tracking regression tests covering all 8 handles (freeform edge, freeform corner, inward, multi-move drift-free, aspect-ratio edge).

### Files Changed
- `apps/desktop/src/viewport/modernCropGeometry.ts`
- `apps/desktop/src/__tests__/modern-crop-geometry.test.ts`
- `apps/desktop/src/components/editor/__tests__/CropOverlay.test.tsx`
- `docs/AI_CURRENT_TASK.md`
- `docs/AI_HISTORY.md`
- `docs/FEATURES.md`

### Verification Results
- PASS: `npx vitest run src/__tests__/modern-crop-geometry.test.ts` (63 tests)
- PASS: `npx vitest run` (653 tests, 50 files)
- PASS: `pnpm.cmd run build` (tsc + Vite)

---

## Current Task - Crop Apply Viewport Recentering [COMPLETE]

**Date:** 2026-06-07

### Scope
- Fix crop apply so the canvas/artboard returns to a centered viewport after the crop is committed.
- Cover Modern Crop and Classic Crop apply paths because both use `applyCropPreview()`.
- Add a regression test before production changes.

### Root Cause
- `applyCropPreview()` changes document dimensions and resizes/uploads renderer textures, but does not recompute viewport zoom/pan after the new canvas size.
- The old viewport pan/zoom survives into the post-crop document, so after crop exit the canvas can appear off-center, especially after Modern Crop image movement/rotation.

### Fix
- Added an optional `recenterViewport` hook to `applyCropPreview()` and call it after `engine.applyCrop()` but before renderer resize/upload.
- Wired Modern Crop, Classic Crop, keyboard Enter, and Crop option-bar Apply paths to recenter the viewport after crop commit.
- Added regression coverage proving crop apply invokes the recenter hook.

### Files Changed
- `apps/desktop/src/components/editor/cropToolActions.ts`
- `apps/desktop/src/components/editor/CanvasViewport.tsx`
- `apps/desktop/src/components/editor/useCanvasKeyboard.ts`
- `apps/desktop/src/components/editor/CropOptionBar.tsx`
- `apps/desktop/src/components/editor/__tests__/cropToolActions.test.ts`
- `docs/AI_CURRENT_TASK.md`
- `docs/AI_HISTORY.md`
- `docs/FEATURES.md`

### Verification Results
- RED: `pnpm.cmd exec vitest run src/components/editor/__tests__/cropToolActions.test.ts --pool=threads --maxWorkers=1` failed because `recenterViewport` was not called.
- PASS: `pnpm.cmd exec vitest run src/components/editor/__tests__/cropToolActions.test.ts --pool=threads --maxWorkers=1` (7 tests)
- PASS: `pnpm.cmd run build`
- PASS: `pnpm.cmd --filter photrez-desktop test --run --pool=threads --maxWorkers=1` (602 tests, 50 files)

---

## Current Task - Modern Crop Modifier and Shortcut Parity [COMPLETE]

**Date:** 2026-06-07

### Scope
- Bring Modern Crop modifier-key behavior in line with Classic Crop and Transform where the behavior applies.
- Cover Shift, Alt, Shift+Alt, Enter, Esc, arrow keys, and undo/redo with regression tests.
- Reuse existing crop/transform modifier conventions rather than maintaining a simplified Modern-only interaction model.

### Working Hypothesis
- Modern Crop resize currently treats ratio/size mode constraints differently from Classic Crop's Shift inversion semantics.
- Modern Crop drag paths may not consistently honor Alt snap-disable and Shift rotation snapping conventions.
- Keyboard behavior needs focused coverage so Enter/Esc, nudge, and undo/redo remain available in Modern mode.

### Root Cause
- Modern Crop resize did not pass pointer `shiftKey`/`altKey` into its geometry helper, so it lost Classic Crop modifier semantics for free aspect lock, ratio/size Shift inversion, Alt center resize, and Shift+Alt combined resize.
- The crop keyboard branch handled `Ctrl+Z` before checking `Shift`, so `Ctrl+Shift+Z` was routed to undo instead of redo in Crop mode.

### Fix
- Extended `resizeModernFrameOneSided()` with `shift`/`alt` inputs and reused Classic Crop resize semantics for Shift corner behavior while preserving Modern's centered viewport frame and existing image-compensation model.
- Wired Modern pointer event modifiers through `ModernCropOverlay`.
- Updated the Crop keyboard shortcut branch to check `Ctrl+Shift+Z` redo before plain `Ctrl+Z` undo.
- Added regression coverage for Modern Shift, Alt, Shift+Alt pointer modifiers plus Enter, Esc, Shift+Arrow nudge, Ctrl+Z, Ctrl+Y, and Ctrl+Shift+Z.

### Files Changed
- `apps/desktop/src/viewport/modernCropGeometry.ts`
- `apps/desktop/src/components/editor/ModernCropOverlay.tsx`
- `apps/desktop/src/components/editor/useCanvasKeyboard.ts`
- `apps/desktop/src/components/editor/__tests__/CropOverlay.test.tsx`
- `apps/desktop/src/components/editor/__tests__/ModernCropKeyboardParity.test.tsx`
- `docs/AI_CURRENT_TASK.md`
- `docs/AI_HISTORY.md`
- `docs/FEATURES.md`

### Verification Results
- PASS: `pnpm.cmd exec vitest run src/__tests__/modern-crop-geometry.test.ts src/components/editor/__tests__/CropOverlay.test.tsx src/components/editor/__tests__/ModernCropKeyboardParity.test.tsx --pool=threads --maxWorkers=1` (63 tests)
- PASS: `pnpm.cmd run build`
- PASS: `pnpm.cmd --filter photrez-desktop test --run --pool=threads --maxWorkers=1` (602 tests, 50 files)

---

## Current Task - Modern Crop Rotation Pivot [COMPLETE]

**Date:** 2026-06-07

### Scope
- Fix Modern Crop visual rotation so the image/document rotates around the rendered cropbox center in viewport coordinates.
- Replace top-left-origin rotation with explicit pivot-center transform math.
- Keep apply-crop inverse geometry aligned with the same pivot math.
- Add regression tests before production changes.

### Root Cause Hypothesis
- `CanvasViewport` currently builds Modern image transform as `translate(...) rotate(...) scale(...)` with `transform-origin: 0 0`, so CSS rotation happens around document top-left instead of cropbox/viewport center.
- `screenPointToModernDocumentPoint()` inverse math needs to match the same pivot-center transform used for rendering.

### Root Cause
- Modern Crop rendered the document with `translate(pan + offset) rotate(rotation) scale(...)` and `transform-origin: 0 0`, so CSS rotation pivoted around document top-left.
- The apply-crop inverse mapping used viewport-center assumptions, but the visual DOM transform did not rotate around that same screen pivot.

### Fix
- Added explicit Modern crop pivot helpers that compute the pivot from the rendered cropbox center in viewport/screen coordinates.
- `CanvasViewport` now builds the Modern image transform as `translate(pivot screen) rotate(...) scale(...) translate(-pivot document)`, keeping the cropbox center visually pinned while the image rotates underneath it.
- Updated `screenPointToModernDocumentPoint()` and `modernFrameToCropRect()` to use the same pivot math as rendering.
- Added regression tests proving the cropbox center maps to the same document pivot under rotation and scale.

### Files Changed
- `apps/desktop/src/viewport/modernCropGeometry.ts`
- `apps/desktop/src/components/editor/CanvasViewport.tsx`
- `apps/desktop/src/__tests__/modern-crop-geometry.test.ts`
- `docs/AI_CURRENT_TASK.md`
- `docs/AI_HISTORY.md`
- `docs/FEATURES.md`

### Verification Results
- PASS: `pnpm.cmd exec vitest run src/__tests__/modern-crop-geometry.test.ts --pool=threads --maxWorkers=1` (39 tests)
- PASS: `pnpm.cmd run build`
- PASS: `pnpm.cmd --filter photrez-desktop test --run --pool=threads --maxWorkers=1` (594 tests, 49 files)

---

## Current Task - Modern Crop: Projected Canvas Bounds [COMPLETE]

**Date:** 2026-06-07

### Scope
1. Frame size tracks projected canvas bounds (`docWidth × zoom × scale`), not viewport size alone.
2. Frame recomputes on zoom changes and clamps to `min(viewport, projected canvas)`.
3. Resize interactions clamp to projected canvas bounds.
4. Add geometry helpers and update tests.

### What's Built
1. **`getProjectedCanvasSize()`** — computes `docWidth × zoom × scale` for both axes.
2. **`clampFrameToProjectedBounds()`** — clamps frame w/h to projected canvas size with min 24px.
3. **`getDefaultModernCropFrame()`** — frame fits within `min(viewport, projected canvas)`. Optional `scale` param.
4. **Resize functions** — `resizeModernFrameFromCenter` and `resizeModernFrameOneSided` accept `projectedWidth`/`projectedHeight` as max bounds.
5. **CanvasViewport** — session key includes zoom; passes `scale` and projected bounds to overlay.
6. **ModernCropOverlay** — receives `projectedWidth`/`projectedHeight` props, passes to resize handler.

### Verification Results
- PASS: `npx vitest run src/__tests__/modern-crop-geometry.test.ts` (37 tests)
- PASS: `pnpm.cmd run build` (tsc + Vite)
- PASS: `npx vitest run` (588 tests, 49 files)

---

## Current Task - Modern Crop Behavior Fix: Size Mode Resize, Undo/Redo [COMPLETE]

**Date:** 2026-06-07

### Scope
1. Add size/crop-mode constraint to `resizeModernFrameFromCenter` so size mode preserves target aspect ratio during resize.
2. Add dedicated modern crop undo/redo stack in `modernCropState.ts` tracking frame + imageTransform snapshots.
3. Wire commit on drag end and Ctrl+Z/Y keyboard shortcuts for modern crop undo/redo.
4. Add regression tests for size-mode resize, undo/redo, and center stability.

### What's Built
1. **Size mode resize**: `resizeModernFrameFromCenter` now accepts `cropMode` param. Size mode constrains resize to target-size aspect ratio (same as ratio mode but uses `cropSizeTarget` aspect). CanvasViewport computes effective aspect per drag from `cropSizeTarget` when in size mode.
2. **Modern crop undo/redo**: `modernCropState.ts` now has `commitModernCropState`, `undoModernCrop`, `redoModernCrop` with dedicated undo/redo stacks. Commit called at start of each drag (move/resize/rotate). Ctrl+Z/Y shortcuts in `useCanvasKeyboard.ts` wired for modern crop mode.
3. **ModernCropOverlay**: Added `onModernCropCommit` callback prop, called before each new drag starts. Classic crop undo/redo unaffected.
4. **19 new tests**: size mode resize preserves ratio, center stays fixed during resize (N/S/E/corner), undo/redo commit/restore/clear/stack behavior.

### Verification Results
- PASS: `pnpm.cmd --filter photrez-desktop test -- apps/desktop/src/__tests__/modern-crop-geometry.test.ts apps/desktop/src/__tests__/modern-crop-state.test.ts` (563 tests, 49 files)
- PASS: `pnpm.cmd run build`
- PASS: `pnpm.cmd --filter photrez-desktop test --run --pool=threads --maxWorkers=1` (563 tests, 49 files)

---

## Current Task - Modern Crop Rotate and Initial Fit Regression [COMPLETE]

## Current Task - Modern Crop Rotate and Initial Fit Regression [COMPLETE]

**Date:** 2026-06-07

### Scope
- Fix Modern crop rotate gesture so corner rotate hit zones reliably update `modernCropImageTransform.rotation`.
- Restore Modern crop initial frame to fit the visible canvas/artboard instead of shrinking to an arbitrary viewport percentage.
- Add focused regression tests before production changes and rerun frontend verification.

### Root-Cause Hypotheses To Verify
- Modern rotate hit zone is rendered before resize handle hit zone, so corner pointerdown is captured by resize.
- `getDefaultModernCropFrame` clamps to `viewport * 0.82`, so it cannot match a canvas that previously filled the viewport via fit-to-screen.

### Root Cause
- Modern rotate zones were rendered as generic transparent circles without a dedicated selector and overlapped the resize handle area. The interaction was ambiguous and tests did not prove rotation from the rotate zone.
- Modern default frame used `viewport * 0.82` as a hard cap instead of the fitted canvas screen size (`docWidth * zoom`, `docHeight * zoom`), so the frame could be smaller than the visible canvas/artboard.
- Modern frame initialization only ran when `modernCropFrame` was null, so old smaller frame state could persist into later crop sessions.

### Fix
- Modern rotate hit zones now reuse the same `getRotatePath()` ring geometry used by transform/crop handles, with `data-modern-crop-rotate` regression coverage.
- Default Modern crop frame now fits the zoomed canvas size within the viewport, preserving aspect when requested.
- Entering a new Modern crop session refits the frame to the current document/viewport/zoom so stale small frame state does not survive.

### Verification Results
- PASS: `pnpm.cmd --filter photrez-desktop test -- apps/desktop/src/__tests__/modern-crop-geometry.test.ts apps/desktop/src/components/editor/__tests__/CropOverlay.test.tsx --run --pool=threads --maxWorkers=1` (549 tests, 48 files)
- PASS: `pnpm.cmd run build`
- PASS: `pnpm.cmd --filter photrez-desktop test --run --pool=threads --maxWorkers=1` (549 tests, 48 files)

---

## Current Task - Modern vs Classic Crop Redesign Implementation [COMPLETE]

**Date:** 2026-06-07

### Scope
Execute `docs/superpowers/plans/2026-06-07-modern-classic-crop-redesign.md` using subagent-driven development.

### Contract
- Modern crop frame lives in viewport/screen coordinates and remains centered in the viewport.
- Modern drag/rotate moves or transforms the image under the frame, not the frame position.
- Modern resize changes frame size from center.
- Classic crop remains document-space with movable/resizable/rotatable crop box over a static image.

### Verification Plan
- Red/green focused Vitest for geometry and overlay behavior.
- `pnpm.cmd run build`
- `pnpm.cmd --filter photrez-desktop test`

### Files Changed
- `apps/desktop/src/viewport/modernCropGeometry.ts`
- `apps/desktop/src/__tests__/modern-crop-geometry.test.ts`
- `apps/desktop/src/components/editor/modernCropState.ts`
- `apps/desktop/src/components/editor/EditorContext.tsx`
- `apps/desktop/src/components/editor/CanvasViewport.tsx`
- `apps/desktop/src/components/editor/ModernCropOverlay.tsx`
- `apps/desktop/src/components/editor/CropOverlay.tsx`
- `apps/desktop/src/components/editor/useCropOverlayDrag.ts`
- `apps/desktop/src/components/editor/CropOptionBar.tsx`
- `apps/desktop/src/components/editor/__tests__/CropOverlay.test.tsx`
- `apps/desktop/src/components/editor/__tests__/CropOptionBar.test.tsx`
- `docs/AI_CURRENT_TASK.md`
- `docs/AI_HISTORY.md`
- `docs/FEATURES.md`

### Result
- Modern crop now has a dedicated viewport-space frame (`modernCropFrame`) and image transform (`modernCropImageTransform`).
- Modern frame remains centered in the viewport; drag-inside moves the image transform underneath, resize changes only frame size from center, and rotation changes image rotation.
- Classic crop remains document-space using `cropRect`/`cropRotation`; drag-inside moves the crop box over a static image.
- Removed the obsolete `cropContentOffset` path and old Modern behavior from `CropOverlay`/`useCropOverlayDrag`.

### Verification Results
- PASS: `pnpm.cmd --filter photrez-desktop test -- apps/desktop/src/__tests__/modern-crop-geometry.test.ts --run --pool=threads --maxWorkers=1` (548 tests, 48 files)
- PASS: `pnpm.cmd --filter photrez-desktop test -- apps/desktop/src/components/editor/__tests__/CropOverlay.test.tsx --run --pool=threads --maxWorkers=1` (548 tests, 48 files)
- PASS: `pnpm.cmd --filter photrez-desktop test -- apps/desktop/src/components/editor/__tests__/CropOptionBar.test.tsx --run --pool=threads --maxWorkers=1` (548 tests, 48 files)
- PASS: `pnpm.cmd run build`
- PASS: `pnpm.cmd --filter photrez-desktop test --run --pool=threads --maxWorkers=1` (548 tests, 48 files)

---

## Current Task - Crop UX Clarification and Modern Drag Repair [COMPLETE]

**Date:** 2026-06-07

### Scope
1. Audit current Modern/Classic crop interaction because the modes still feel visually unclear.
2. Use external crop references and `D:\Project\aplikasi-cetak-massal` crop implementation as behavior references.
3. Repair Modern drag-inside behavior so the crop frame remains visually stable while the document moves underneath through the normal viewport model, not a separate canvas-only CSS transform.
4. Keep Classic behavior as crop-rect movement over a static image.
5. Update focused regression coverage and run relevant frontend verification.

### Initial Findings
- Lightroom-style references support moving/reframing the image inside the crop area, while classic crop tools move the crop rectangle itself.
- The current Modern implementation applies `cropContentOffset` as a CSS transform directly on the WebGL canvas, which separates the image from the crop overlay/artboard model and makes the UX feel incoherent.
- The safer repair is to remove the canvas-only transform and use viewport pan compensation for Modern drag-inside, while preserving Classic as rect-only movement.

### Files Changed
- `apps/desktop/src/components/editor/CanvasViewport.tsx`
- `apps/desktop/src/components/editor/useCropOverlayDrag.ts`
- `apps/desktop/src/components/editor/__tests__/CropOverlay.test.tsx`
- `docs/AI_CURRENT_TASK.md`
- `docs/AI_HISTORY.md`
- `docs/FEATURES.md`

### Verification Results
- PASS: `pnpm.cmd --filter photrez-desktop test -- apps/desktop/src/components/editor/__tests__/CropOverlay.test.tsx --run --pool=threads --maxWorkers=1 --reporter=verbose` (Vitest ran 47 files, 542 tests)
- PASS: `pnpm.cmd run build`
- PASS: `pnpm.cmd --filter photrez-desktop test` (542 tests, 47 files)

---

## Current Task - Crop Overlay Visual Polish [COMPLETE]

**Date:** 2026-06-07

### Changes
1. ✅ **Removed corner brackets** (`CropOverlayGuides.tsx`) — the decorative L-shaped corner marks were redundant with border + handles and added visual noise
2. ✅ **Rotate ring hidden until hover** (`CropOverlayHandles.tsx`) — the large white corner ring was always visible; now it fades in only when user hovers a corner. Uses orange accent (#E15A17) when visible
3. ✅ **Standardized guide line opacity to 30%** (all modes: thirds/grid/diagonal/golden) — consistent, unobtrusive
4. ✅ **Quieter corner handles** — default fill reduced from white to `rgba(255,255,255,0.75)`, stroke from `#333` to `rgba(0,0,0,0.35)`. Active handle retains orange. Added subtle 1px rounded corners
5. ✅ **Dual-border** (`CropOverlay.tsx`) — dark outline (1.5px `rgba(0,0,0,0.45)`) underneath white border (0.75px `rgba(255,255,255,0.85)`) ensures visibility on both light and dark images

### Files Changed
- `apps/desktop/src/components/editor/CropOverlayGuides.tsx` — removed `CornerBrackets`, unified opacity to 0.3
- `apps/desktop/src/components/editor/CropOverlayHandles.tsx` — rotate ring hidden by default (opacity 0), orange on hover; subtler handle colors with rounded corners
- `apps/desktop/src/components/editor/CropOverlay.tsx` — replaced single white border with dual dark+light stroke for all-image contrast
- `docs/AI_CURRENT_TASK.md`
- `docs/AI_HISTORY.md`

### Verification Results
- PASS: `pnpm.cmd run build` (tsc + Vite)
- PASS: `pnpm.cmd --filter photrez-desktop test` (541 tests, 47 files)



---

## Current Task - Crop Interaction Modes: Modern + Classic [COMPLETE]

**Date:** 2026-06-07

### What's Built

1. ✅ **`cropInteractionMode` signal** — `"modern" | "classic"` (default `"modern"`) added to `editorState.ts` and exposed via `EditorContext`.
2. ✅ **`cropContentOffset` signal** — `{ x: number; y: number }` added to `cropState.ts`. Stores image offset behind the frame in Modern mode.
3. ✅ **Modern mode (default)** — On entering Crop tool, auto-creates a full-canvas crop frame. Dragging inside updates `cropContentOffset` (NOT `cropRect`). A `createEffect` applies the offset as CSS `translate3d()` on the `<canvas>` element, making the image slide behind the fixed crop frame. Rotation rotates image, resize resizes frame. Double-click applies crop.
4. ✅ **Classic mode** — Pasteboard click creates new rect / hides preview. Dragging inside moves `cropRect` WITHOUT counter-panning viewport → crop box visually moves over image. Resize, rotate, snap unchanged.
5. ✅ **Visual distinction proven**:
   - **Classic drag inside**: `cropRect` x/y changes, SVG frame redraws at new position, viewport pan unchanged → box moves over image.
   - **Modern drag inside**: `cropContentOffset` changes, `cropRect` stays fixed, canvas CSS transform shifts image element → frame stays, image slides behind.
6. ✅ **Mode toggle in option bar** — Modern/Classic segmented toggle.
7. ✅ **Transition rules**:
   - Modern → Classic: bakes `contentOffset` into `cropRect` (`rect.x -= offset.x, rect.y -= offset.y`), resets offset to 0.
   - Classic → Modern: if rect exists keep it, otherwise create full-canvas frame.
   - Re-enter crop tool: restore hidden preview if exists; else if Modern mode and no rect → create frame; else preserve.
8. ✅ **Apply with offset**: `applyCropPreview` bakes `contentOffset` into the crop rect: `{ x: rect.x - offset.x, y: rect.y - offset.y }`.
9. ✅ **No pasteboard crop in Modern** — pasteboard + SVG pointer handlers skip crop-creation.

### Files Changed
- `apps/desktop/src/components/editor/cropState.ts` — added `cropContentOffset` signal
- `apps/desktop/src/components/editor/editorState.ts` — added `cropInteractionMode` signal
- `apps/desktop/src/components/editor/EditorContext.tsx` — added types
- `apps/desktop/src/components/editor/CanvasViewport.tsx` — canvas CSS transform effect, mode transition baking effect, pasteboard guard, Show condition, content offset wired through
- `apps/desktop/src/components/editor/CropOverlay.tsx` — `isModernMode`, `cropContentOffset`, `onCropContentOffsetChange` props
- `apps/desktop/src/components/editor/useCropOverlayDrag.ts` — Classic: move rect + no counter-pan; Modern: update content offset; `disallowNewCrop` param
- `apps/desktop/src/components/editor/CropOptionBar.tsx` — Modern/Classic toggle
- `apps/desktop/src/components/editor/__tests__/CropOverlay.test.tsx` — updated counter-pan test to verify cropRect movement instead
- `apps/desktop/src/components/editor/__tests__/CanvasViewport.test.tsx` — set mode to classic for pasteboard tests
- `apps/desktop/src/components/editor/__tests__/CropOptionBar.test.tsx` — added mock values
- `docs/AI_CURRENT_TASK.md`

### Verification Results
- PASS: `pnpm.cmd run build` (tsc + Vite)
- PASS: `pnpm.cmd --filter photrez-desktop test` (541 tests, 47 files)

---

## Current Task - Canvas Quality: Sync WebGL Backing Buffer on Zoom Changes [COMPLETE]

**Date:** 2026-06-07

### Root Cause
`WebGL2Backend.resize()` was only called on document switch and window resize — **not** on zoom changes (wheel, keyboard). When zoom changed without a matching resize, the `CSS scale(${zoom})` transform stretched/compressed the stale-resolution WebGL canvas buffer, producing a soft/blurry image.

### What's Built
1. ✅ Added reactive `createEffect` in `useViewportRenderer.ts` that watches `zoom()` signal and calls `resizeRenderer()` whenever zoom changes
2. ✅ All zoom paths are covered: wheel zoom (`usePanNavigation`), keyboard shortcuts (`useCanvasKeyboard`), and `fitToScreenAndRender`
3. ✅ 2 new regression tests: verify resize formula includes `zoom × dpr` and that different zoom levels produce different backing sizes

### Files Changed
- `apps/desktop/src/components/editor/useViewportRenderer.ts` — added zoom reactive effect
- `apps/desktop/src/__tests__/renderer.test.ts` — added 2 regression tests
- `docs/AI_CURRENT_TASK.md`
- `docs/AI_HISTORY.md`
- `docs/FEATURES.md`

### Verification Results
- PASS: `pnpm.cmd run build` (tsc + Vite)
- PASS: `pnpm.cmd --filter photrez-desktop test` (541 tests, 47 files)

---



## Current Task - Ctrl+Shift+Z Redo Shortcut [COMPLETE]

**Date:** 2026-06-07

### What's Built
1. ✅ Added `Ctrl+Shift+Z` keyboard shortcut for redo in `AppTitleBar.tsx:148-150`
2. ✅ Ordering ensures `Ctrl+Shift+Z` is checked before `Ctrl+Z` to avoid conflict
3. ✅ Updated test in `keyboard-shortcuts.test.ts` to cover the new shortcut

### Files Changed
- `apps/desktop/src/components/editor/AppTitleBar.tsx`
- `apps/desktop/src/__tests__/keyboard-shortcuts.test.ts`
- `docs/AI_CURRENT_TASK.md`
- `docs/AI_HISTORY.md`
- `docs/FEATURES.md`

### Verification Results
- PASS: `pnpm.cmd run build` (tsc + Vite)
- PASS: `pnpm.cmd --filter photrez-desktop test` (539 tests, 47 files)

---



## Current Task - Export End-to-End Pipeline [COMPLETE]

**Date:** 2026-06-06

### What's Built
1. ✅ **Export pipeline** (`exportDocument.ts`) — composites active document layers respecting visibility, opacity, transforms, flip/rotate, and blend modes. Uses `drawLayerToContext` from `layerComposite.ts` (same function as merge/flatten) for parity with renderer.
2. ✅ **ExportDialog** (`ExportDialog.tsx`) — format selector (PNG/JPEG/WebP), dynamic quality slider (hidden for PNG), loading state, success/error feedback, Escape/Cancel/backdrop-close.
3. ✅ **Wired entry points** — Export button in RightDock, Ctrl+S keyboard shortcut.
4. ✅ **Parity verification**: Layer order (bottom-up), opacity, transforms (translate/scale/rotate/flip), blend modes (normal/multiply/screen/overlay/darken/lighten/color-dodge/color-burn/hard-light/soft-light/difference/exclusion), invisible layer exclusion, JPEG white background pre-fill.
5. ✅ **Format verification**: E2E test verifies PNG magic bytes (89 50 4E 47...), JPEG header (FF D8), WebP header (RIFF), non-empty output, dimensions match document.
6. ✅ **Unit tests**: encodeComposite produces correct bytes, uses drawLayerToContext, respects layer order, skips invisible layers, applies opacity, uses correct MIME types + quality. exportActiveDocument calls showSaveDialog + writeFileBytes.

### Known Limitations
- ⚠️ Blend mode parity: Canvas 2D `globalCompositeOperation` vs WebGL GLSL shader may differ at alpha=0/alpha=1 boundaries (pre-multiplied vs straight alpha). Edge case, negligible for MVP.
- ⚠️ Native file save dialog (`showSaveDialog`) cannot be automated via browser-only Playwright — only verifiable by running `pnpm tauri dev` and manually exporting. Automated coverage: Rust `write_file_bytes` handler tested with temp files (7 tests), frontend data pipeline tested with base64 roundtrip (1 E2E test).

### Verification Results
- PASS: `pnpm.cmd run build` (tsc + Vite)
- PASS: `pnpm.cmd --filter photrez-desktop test -- --pool=forks` (538 tests, 47 files)
- PASS: `playwright test --grep "export dialog|encodeComposite|export compositing|export data flow"` (5/5 export E2E tests)
- PASS: `cargo test -p photrez-desktop` (7 file I/O tests)
- PASS: `cargo test -p photrez-core` (85 tests)

### Manual Verification Steps (native save dialog)
To verify the full export-to-disk flow with native dialog:
1. Run `pnpm tauri dev`
2. Create a blank document
3. Draw something (brush tool)
4. Press Ctrl+S → Export dialog opens
5. Pick PNG format, click Export → native save dialog appears
6. Save to Desktop as `test-export.png`
7. Open the file in any image viewer — should show your drawing at document dimensions
8. Repeat for JPEG (quality 85%) and WebP (quality 90%)

### Remaining Blockers
- B2 — Eraser transparency visual verification (manual)
- X2-X4 — Measure installer size, idle RAM, startup time

---

## Current Task - MVP Release Blockers Phase 1 [COMPLETE]

**Date:** 2026-06-06

### What's Built
1. ✅ **Resize Canvas dialog** - `ResizeCanvasModal.tsx` with W/H number inputs, aspect ratio lock toggle (link/unlink icon), px unit.
2. ✅ **Resize wired into UI** - Accessible from Image menu (AppTitleBar) and Canvas Properties panel. Applies via `engine.resizeCanvas()` → `renderer.resize()` → re-upload textures → `syncViewport()`. Undoable.
3. ✅ **Layer delete confirmation** - `window.confirm()` with layer name and "This can be undone." note before `handleDeleteActiveLayer`.
4. ✅ **Unit tests** - 12 new tests: resize dialog render, aspect ratio lock toggle, apply/cancel/Escape, undoability; layer delete confirm/cancel/last-layer guard.

### Verification Results
- PASS: `pnpm.cmd run build` (tsc + Vite)
- PASS: `pnpm.cmd --filter photrez-desktop test -- --pool=forks` (524 tests, 45 files)

---

## Current Task - Brush/Eraser Tool UX Phase 2 [COMPLETE]

**Date:** 2026-06-06

### What's Built
1. ✅ **Flow control** — per-dab alpha multiplier (`effectiveAlpha = opacity * flow`), range 0-100%, default 100%.
2. ✅ **Smoothing engine** — `PaintSmoother` class with weighted moving average over 2-10 points, mapped from smoothing 0-100.
3. ✅ **Brush presets** — Hard Round, Soft Round, Detail, Large Soft, Hard Eraser, Soft Eraser with apply/clear logic.
4. ✅ **Preset tracking** — `brushPresetId`/`eraserPresetId` in editor state; manual edit clears to "Custom".
5. ✅ **Enhanced option bar** — Flow, Smoothing, preset dropdown added to Size/Hardness/Strength/Hard 100.
6. ✅ **Right-click context menu** — floating panel with Size/Hardness/Strength sliders, preset grid, Reset button.
7. ✅ **Keyboard shortcuts** — `[`/`]` for size, Shift+`[`/`]` for hardness.
8. ✅ **Smoothing integration** — applied to pointerdown/move/up points before stroke rendering.
9. ✅ **Right-click guard** — `e.button === 2` prevents paint on right-click.
10. ✅ **Pointer cancel/lostcapture** — resets smoother buffer on both events.

### Verification Results
- PASS: 507/507 frontend tests (43 files)
- PASS: `pnpm.cmd run build` (tsc + Vite)
- PASS: 85/85 Rust core tests

---

## Current Task - Brush and Eraser Tool Improvements [COMPLETE]

**Date:** 2026-06-06

### Scope
1. Wire brush and eraser settings into editor state and option bar.
2. Pass active paint settings through pointer handling.
3. Render brush and eraser strokes with size, hardness, and strength.
4. Make brush cursor preview match active settings.
5. Add paint tool keyboard shortcuts and blocked-state status feedback.

### Verification Results
- PASS: targeted brush/eraser tests.
- PASS: frontend unit suite with stable worker mode (433 tests).
- PASS: `pnpm.cmd run build`.
- PASS: `pnpm.cmd run test:e2e` (5/5 Playwright smoke tests).

---

## Current Task - Brush and Eraser Tool Improvements Plan [COMPLETE]

**Date:** 2026-06-06

### Scope
1. Create a complete implementation plan for improving Brush and Eraser tool behavior.
2. Use external references and `D:\Project\aplikasi-cetak-massal` as behavior references without naming other image editor apps in product-facing copy.
3. Keep the first implementation phase focused on real tool settings, cursor sync, stroke hardness/strength, shortcuts, and blocked-state feedback.
4. Defer dirty-rect paint history and flow controls to follow-up work because they widen the architecture blast radius.

### Files Expected To Change
- `docs/superpowers/plans/2026-06-06-brush-eraser-tool-improvements.md`
- `docs/AI_CURRENT_TASK.md`
- `docs/AI_HISTORY.md`
- `docs/FEATURES.md`

### Verification Plan
- Documentation-only planning task; verify the plan contains concrete files, logic flow, TDD steps, exact commands, docs sync, and final verification gates.

### Verification Results
- Plan created at `docs/superpowers/plans/2026-06-06-brush-eraser-tool-improvements.md`.
- Context7 used for SolidJS signal/context/event-handler/cleanup planning guidance.
- Plan self-review completed for scope coverage, placeholder scan, type consistency, task sequencing, and verification gates.

---

## Current Task - Crop Mode Panning Regression [COMPLETE]

**Date:** 2026-06-05

### Scope
1. Investigate why panning can stop working after recent crop interaction changes.
2. Identify whether pasteboard crop pointer handling blocks pan/navigation events.
3. Add regression coverage for Crop tool pasteboard panning with Space held.
4. Keep the fix scoped to pointer routing.

### Root Cause
`CanvasViewport` handled Crop tool pasteboard pointer down before navigation mode checks. A left-button Space+drag on the pasteboard was converted into a pending crop replacement gesture and `preventDefault()` blocked `usePanNavigation` from receiving the pointer event.

### Files Changed
- `apps/desktop/src/components/editor/CanvasViewport.tsx`
- `apps/desktop/src/components/editor/__tests__/CanvasViewport.test.tsx`
- `docs/AI_CURRENT_TASK.md`
- `docs/AI_HISTORY.md`
- `docs/FEATURES.md`
- `docs/plans/task.md`

### Verification Results
- PASS: `pnpm.cmd --filter photrez-desktop test -- apps/desktop/src/components/editor/__tests__/CanvasViewport.test.tsx --run --pool=threads --maxWorkers=1` (red before fix, green after fix; Vitest ran desktop suite: 30 files, 324 tests).
- PASS: `pnpm.cmd run build`.

---

## Current Task - Crop Apply Geometry Debugging [COMPLETE]

**Date:** 2026-06-05

### Scope
1. Investigate why applying crop can produce incorrect or visually strange results after the recent crop interaction changes.
2. Compare Photrez crop/apply geometry against relevant image/crop logic in `D:\Project\aplikasi-cetak-massal`.
3. Identify the root cause before patching; add regression coverage for the failing geometry case.
4. Keep the fix scoped to crop apply/geometry behavior unless evidence shows a broader renderer issue.

### Root Cause
1. `performApplyCrop()` treated `targetSize` as a single width-derived scale, so crop output with a target size that changes aspect ratio miscomputed Y position and Y scale.
2. Destructive crop replaces layer `imageBitmap`, but `applyCropPreview()` only requested a render; it did not re-upload changed layer textures before the next WebGL render.

### Files Changed
- `apps/desktop/src/engine/cropApply.ts`
- `apps/desktop/src/engine/__tests__/document.test.ts`
- `apps/desktop/src/components/editor/cropToolActions.ts`
- `apps/desktop/src/components/editor/__tests__/cropToolActions.test.ts`
- `apps/desktop/src/components/editor/CanvasViewport.tsx`
- `apps/desktop/src/components/editor/CropOptionBar.tsx`
- `apps/desktop/src/components/editor/useCanvasKeyboard.ts`
- `docs/AI_CURRENT_TASK.md`
- `docs/AI_HISTORY.md`
- `docs/FEATURES.md`
- `docs/plans/task.md`

### Verification Results
- PASS: `pnpm.cmd --filter photrez-desktop test -- apps/desktop/src/engine/__tests__/document.test.ts --run --pool=threads --maxWorkers=1` (red before fix, green after fix; Vitest ran desktop suite: 30 files, 323 tests).
- PASS: `pnpm.cmd --filter photrez-desktop test -- apps/desktop/src/components/editor/__tests__/cropToolActions.test.ts apps/desktop/src/engine/__tests__/document.test.ts --run --pool=threads --maxWorkers=1` (30 files, 323 tests).
- PASS: `pnpm.cmd run build`.

---

## Current Task - Crop Hidden Preview Restore Correction [COMPLETE]

**Date:** 2026-06-05

### Scope
1. Implement hidden crop preview state `hiddenCropPreview` in `cropState.ts` and expose it via `EditorContext.tsx`.
2. Update crop action helpers in `cropToolActions.ts` (hide, restore, discard, reset, apply).
3. Wire pasteboard pointer down/move/up in `CanvasViewport.tsx` to handle pasteboard hide vs replacement drag.
4. Support canvas click restoring the hidden crop preview before falling back to full-canvas default.
5. Ensure Cancel/Esc clears both visible and hidden crop previews.
6. Verify via Vitest unit and component tests and Playwright E2E tests.

### Files Expected To Change
- `apps/desktop/src/components/editor/cropState.ts`
- `apps/desktop/src/components/editor/EditorContext.tsx`
- `apps/desktop/src/components/editor/cropToolActions.ts`
- `apps/desktop/src/components/editor/CanvasViewport.tsx`
- `apps/desktop/src/components/editor/useCanvasPointerTools.ts`
- `apps/desktop/src/components/editor/useCropOverlayDrag.ts`
- `apps/desktop/src/components/editor/CropOverlay.tsx`
- `apps/desktop/src/components/editor/CropOptionBar.tsx`
- `apps/desktop/src/components/editor/useCanvasKeyboard.ts`
- `apps/desktop/src/components/editor/__tests__/cropToolActions.test.ts`
- `apps/desktop/src/components/editor/__tests__/CanvasViewport.test.tsx`
- `apps/desktop/src/components/editor/__tests__/CropOptionBar.test.tsx`
- `apps/desktop/src/components/editor/__tests__/CropOverlay.test.tsx`
- `apps/desktop/e2e/editor-smoke.spec.ts`

### Verification Results
- PASS: `pnpm.cmd --filter photrez-desktop test` (30 files, 322 tests)
- PASS: `pnpm.cmd run build` (TypeScript + Vite production build)
- PASS: `pnpm.cmd run test:e2e` (5/5 Playwright smoke tests)
- Rust was not touched in this continuation pass.

---


## Current Task - Crop Outside-Canvas Drag Plan Revision [COMPLETE]

**Date:** 2026-06-05

### Scope
1. Revise the crop interaction implementation plan so drag gestures can create a replacement crop box from inside canvas, outside canvas, or across the pasteboard/canvas boundary.
2. Keep pasteboard click as hide-only behavior, separated from pasteboard drag by a pointer movement threshold.
3. Preserve outside-bounds crop coordinates so replacement crop creation can support canvas expansion.
4. Update planning/docs logs only; do not modify runtime code in this task.

### Files Expected To Change
- `docs/superpowers/plans/2026-06-05-crop-interaction-model-plan.md`
- `docs/AI_CURRENT_TASK.md`
- `docs/AI_HISTORY.md`
- `docs/FEATURES.md`
- `docs/plans/task.md`

### Verification Plan
- Documentation-only planning revision; verify the plan includes concrete UX rules, target files, TDD coverage, smoke scenarios, and final verification commands for outside-canvas crop drag creation.

### Verification Results
- Plan now defines pasteboard click vs pasteboard drag using a movement threshold.
- Plan now covers drag from pasteboard to canvas, canvas to pasteboard, and entirely outside the current canvas.
- Plan now requires outside-bounds replacement crop rects to remain unclamped for canvas expansion.
- Placeholder scan: PASS.

---

## Current Task - Crop Hidden Preview Restore Correction Plan [COMPLETE]

**Date:** 2026-06-05

### Scope
1. Rewrite the crop interaction implementation plan to correct the earlier interpretation drift.
2. Define pasteboard click as temporary hide, not discard.
3. Define canvas click as restoring the hidden crop preview before falling back to full-canvas preview.
4. Define Cancel/Esc as discard behavior that clears visible and hidden crop preview.
5. Add detailed task-by-task TDD implementation guidance.

### Files Changed
- `docs/superpowers/plans/2026-06-05-crop-interaction-model-plan.md`
- `docs/AI_CURRENT_TASK.md`
- `docs/AI_HISTORY.md`
- `docs/FEATURES.md`
- `docs/plans/task.md`

### Verification Results
- Plan reviewed for corrected UX contract, target files, TDD steps, exact commands, expected results, and docs sync.
- Placeholder scan: PASS.

---

## Current Task - Crop Interaction Model [COMPLETE]

**Date:** 2026-06-05

### Scope
1. Implement shared crop tool action helpers in `cropToolActions.ts`.
2. Update pasteboard click policy helper & CanvasViewport wiring for crop.
3. Support canvas clicks restoring the default crop box.
4. Support canvas dragging creating replacement crop boxes.
5. Support double-click inside the crop box to apply.
6. Verify via Vitest unit and component tests.

### Verification Results
- ✅ `pnpm run build`: PASS (Vite building client environment for production successful)
- ✅ `pnpm --filter photrez-desktop test`: PASS (312/312 frontend unit and component tests passing)
- ✅ `cargo test --workspace`: PASS (85/85 Rust tests passing)


---

## Current Task - Browser Smoke Test Layer [COMPLETE]

**Date:** 2026-06-05

### Scope
1. Add a browser-based smoke test layer to complement existing Vitest unit/component coverage.
2. Cover critical frontend editor workflows that jsdom cannot validate well: app shell render, document tab creation, tool switching, crop option bar visibility, and side panel toggle.
3. Keep the new layer focused and stable; do not replace existing Vitest tests.

### Files Expected To Change
- `apps/desktop/package.json`
- `apps/desktop/playwright.config.ts`
- `apps/desktop/e2e/editor-smoke.spec.ts`
- `docs/AI_CURRENT_TASK.md`
- `docs/AI_HISTORY.md`
- `docs/FEATURES.md`
- `docs/plans/task.md`

### Verification Plan
- Verify the new browser smoke test fails before Playwright is installed/configured.
- Install required test dependency.
- Run browser smoke tests.
- Run existing frontend unit/component tests.
- Run frontend build.

### Verification Results
- RED: `pnpm.cmd --filter photrez-desktop exec playwright test` failed because Playwright was not installed.
- RED: after installing Playwright, browser smoke tests failed until Chromium browser binaries were installed.
- GREEN: `pnpm.cmd run test:e2e`: PASS (3/3 browser smoke tests passing)
- GREEN: `pnpm.cmd --filter photrez-desktop test`: PASS (308/308 Vitest tests passing)
- GREEN: `pnpm.cmd run build`: PASS

---

## Current Task - Third-Party Software Name Cleanup [COMPLETE]

**Date:** 2026-06-05

### Scope
1. Remove explicit third-party software/application references from active source comments and non-archive documentation.
2. Extend cleanup to archived historical docs for a comprehensive repo-wide naming cleanup.
3. Keep dependency lockfile package names untouched.
4. Verify source, docs, archive docs, and file paths no longer contain explicit product-name references.

### Files Changed
- `apps/desktop/src/viewport/transformGeometry.ts`
- `apps/desktop/src/viewport/cropSnap.ts`
- `apps/desktop/src/renderer/shaders.ts`
- Active docs under `docs/` and `README.md`

### Verification Results
- Active source product-name scan: PASS (no active source matches)
- Full repo product-name scan: PASS (no matches outside dependency lockfile)
- Full repo filename scan: PASS (no matching file paths)
- `pnpm.cmd run build`: PASS
- `pnpm.cmd --filter photrez-desktop test`: PASS (308/308 frontend tests passing)

---

## Current Task - Crop Interaction Model Planning [PLANNING]

**Date:** 2026-06-05

### Scope
1. Create a complete implementation plan for explicit Crop tool interaction behavior.
2. Lock the UX contract for pasteboard click, canvas click, canvas drag, double-click apply, and existing Esc/Cancel/Enter behavior.
3. Produce planning/docs only; do not modify runtime code in this task.

### Files Expected To Change
- `docs/superpowers/plans/2026-06-05-crop-interaction-model-plan.md`
- `docs/AI_CURRENT_TASK.md`
- `docs/AI_HISTORY.md`
- `docs/FEATURES.md`
- `docs/plans/task.md`

### Verification Plan
- Documentation-only planning task; verify the generated plan contains concrete UX rules, target files, sequencing, tests, smoke scenarios, and final verification commands.

---

## Current Task - Crop Cancel Stays In Crop Tool [COMPLETE]

**Date:** 2026-06-05

### Scope
1. Fix Crop cancel behavior so `Esc` and the Crop Option Bar `Cancel` button clear the current crop box without switching the active tool to Move.
2. Keep Crop apply behavior unchanged for now: applying crop can still return to Move after completing the crop operation.
3. Add regression coverage for Crop Option Bar cancel behavior.

### Files Expected To Change
- `apps/desktop/src/components/editor/CropOptionBar.tsx`
- `apps/desktop/src/components/editor/useCanvasKeyboard.ts`
- `apps/desktop/src/components/editor/__tests__/CropOptionBar.test.tsx`
- `docs/AI_CURRENT_TASK.md`
- `docs/AI_HISTORY.md`
- `docs/FEATURES.md`
- `docs/plans/task.md`

### Verification Results
- ✅ `pnpm.cmd --filter photrez-desktop test -- CropOptionBar`: PASS (308/308 frontend tests passing)
- ✅ `pnpm.cmd run build`: PASS (tsc compilation successful, Vite bundle built)

---

## Current Task - Pasteboard Click Policy Implementation [COMPLETE]

**Date:** 2026-06-05

### Scope
1. Implement pure click policy helper `pasteboardClickPolicy.ts` mapping current UI context to an action.
2. Wire container pointer down handler in `CanvasViewport.tsx` to handle pasteboard clicks.
3. Expose selection preview cleanup signal and ensure tool protections (transform sessions, crop overlay, brush/eraser, eyedropper).
4. Build integration tests and verify full suite.

### Verification Results
- ✅ `pnpm run build`: PASS (tsc compilation successful, Vite bundle built)
- ✅ `pnpm --filter photrez-desktop test`: PASS (307/307 frontend unit and integration tests passing)
- ✅ `cargo test --workspace`: PASS (85/85 Rust tests passing)

---

## Current Task - Transform Session Hardening + Contextual Option Bar Planning [PLANNING]

**Date:** 2026-06-05

### Scope
1. Create a complete implementation plan for hardening the existing transform session lifecycle and undo behavior.
2. Extend the UX plan so the option bar switches to a contextual Transform Option Bar while a layer transform session is active.
3. Produce planning/docs only; do not modify runtime code in this task.

### Files Expected To Change
- `docs/superpowers/plans/2026-06-05-transform-session-hardening-contextual-optionbar-plan.md`
- `docs/AI_CURRENT_TASK.md`
- `docs/AI_HISTORY.md`
- `docs/FEATURES.md`
- `docs/plans/task.md`

### Verification Plan
- Documentation-only planning task; verify the generated plan contains concrete files, sequencing, UX rules, tests, and final verification commands.

---

## Current Task - Transform Session Hardening & Contextual Option Bar [COMPLETE]

**Date:** 2026-06-05

### Scope
1. Harden transform session lifecycle by storing documentId, originalSnapshot, and originalTransform.
2. Auto-resolve/cancel active transform session before tool switch, tab switch, undo/redo, and destructive layer changes.
3. Introduce contextual Transform Option Bar containing input fields, ratio lock, reset preview, and apply/cancel controls.

### Verification Results
- ✅ `pnpm run build`: PASS (tsc compilation successful, Vite bundle built)
- ✅ `pnpm --filter photrez-desktop test`: PASS (295/295 tests passing, including new TransformOptionBar and SelectionTransformOverlay Escape tests)
- ✅ `cargo test -p photrez-core`: PASS (85/85 tests passing)
- ✅ `cargo test --workspace`: PASS (85/85 tests passing)

---

## Current Task - Rotate Handle Hover Cursor Outside Boundary Fix [COMPLETE]

**Date:** 2026-06-05

### Scope
1. Fix rotate hover zones in `SelectionTransformOverlay.tsx` and `CropOverlayHandles.tsx` so that the rotate cursor only triggers when hovering outside the layer or crop bounding box corners.
2. Modify the SVG paths of the corner hover hit zones from a 360-degree donut ring to a 270-degree donut ring, excluding the inner quadrant of the corner.
3. Verify using Vitest unit tests and ensure clean compilation.

### Verification Results
- ✅ `pnpm run build`: PASS
- ✅ `pnpm --filter photrez-desktop test`: 286/286 tests PASS
- ✅ `cargo test --workspace`: 85/85 tests PASS

---


## Current Task - Crop Option Bar Dropdown Visual Refinement [COMPLETE]

**Date:** 2026-06-04

### Scope
1. Implement a custom visual overlay dropdown pattern for all dropdown selectors in `CropOptionBar.tsx` (Crop Mode, Preset Aspect Ratios, Unit conversions, and Composition Guide Modes).
2. Ensure the native `<select>` is positioned absolutely with full height/width overlay and opacity-0 to make the entire dropdown box (including the chevron icon and margins) fully clickable, and to display perfectly styled text aligned with other inputs in the options bar.
3. Validate and verify compilation and execute Vitest regression tests.

### Files Expected To Change
- `apps/desktop/src/components/editor/CropOptionBar.tsx`
- `docs/AI_CURRENT_TASK.md`
- `docs/plans/task.md`

---

## Current Task - Crop Option Bar Centered Auto-Fit on Input changes [COMPLETE]

**Date:** 2026-06-04

### Scope
1. Implement centered auto-fitting crop box behavior when crop dimensions/ratio are changed via option bar inputs (custom aspects, target size, or swap).
2. Correct the signature and argument mismatch for `fitCropRectToAspect` calls in custom crop aspect and target size onSubmit handlers in `CropOptionBar.tsx`.
3. Update the width/height swap handler to use centered canvas auto-fit logic when in ratio or size mode.

### Files Changed
- `apps/desktop/src/components/editor/CropOptionBar.tsx`
- `apps/desktop/src/components/editor/__tests__/CropOptionBar.test.tsx` (NEW)
- `docs/plans/task.md`
- `docs/AI_CURRENT_TASK.md`

### Verification Plan
- ✅ `pnpm run build`: PASS
- ✅ `pnpm --filter photrez-desktop test`: PASS (286/286 tests passing, including new CropOptionBar test suite)

---

## Current Task - Crop Option Bar Pain Points & Input Fixes [COMPLETE]

**Date:** 2026-06-04

### Scope
1. Destructive vs. Non-Destructive UX ("Delete Cropped"): Rename label from "Delete" to "Delete Cropped", add detailed tooltips, and conditionally mask outer pixels with canvas background color (#161618, opacity 0.98) in destructive mode.
2. Smart Center-Locked Swap: Implement center-locked W/H swapping for cropRect coordinates, preserving current center and aspect ratios.
3. Remove Floating Indicator: Remove CropModeIndicator popup from CanvasViewport.tsx.
4. Input Bug Fixes: Solve race conditions in EditableNumField (race when setting editing(false) before parsing text value) and prevent floating-point representation jump on focus.
5. Custom Preset Logic Fix: Introduce selectedPreset signal to decouple the custom status from the raw ratio matching, ensuring custom inputs do not hide when values match a default preset.

### Files Changed
- `apps/desktop/src/components/editor/CropOptionBar.tsx`
- `apps/desktop/src/components/editor/OptionBarShared.tsx`
- `apps/desktop/src/components/editor/CropOverlay.tsx`
- `apps/desktop/src/components/editor/CanvasViewport.tsx`
- `apps/desktop/src/components/editor/primitives.tsx`
- `docs/plans/task.md`

### Verification Plan
- ✅ `pnpm run build`: PASS
- ✅ `pnpm --filter photrez-desktop test`: PASS (283/283 tests passing)

---

## Current Task - Crop Option Bar Visual & UX Improvements [COMPLETE]

**Date:** 2026-06-04

### Scope
Improve the Crop Tool Option Bar visual design and UX:
1. Design custom chevron overlay wrapper for native `<select>` dropdowns to achieve a premium custom look.
2. Style options/dropdowns with standard dark panel theme backgrounds.
3. Replace text rotation symbols (↺, ↻, ↔) with high-fidelity Lucide icons (`rotate-ccw`, `rotate-cw`, `swap`) mapped inside `icons.tsx`.
4. Add clear, descriptive tooltips (`title` attributes) for all icon-only buttons.
5. Standardize heights, margins, and border focus ring transitions.

### Files Expected To Change
- `apps/desktop/src/components/editor/icons.tsx`
- `apps/desktop/src/components/editor/CropOptionBar.tsx`
- `docs/plans/task.md`

### Verification Plan
- ✅ `pnpm run build`: PASS (Vite + tsc)
- ✅ `pnpm --filter photrez-desktop test`: PASS (283/283 tests passing)

---

## Current Task - Move Option Bar Visual & UX Improvements [COMPLETE]

**Date:** 2026-06-04

### Scope
Improve the Move Tool Option Bar visual design and UX:
1. Revamp ToggleBtn active state to use high-contrast Photon Amber tint background, borders, and bold text.
2. Implement dynamic Auto-Select hover target readout in MoveOptionBar.
3. Add direct Canvas Alignment buttons (Left/Center-H/Right/Top/Center-V/Bottom) in MoveOptionBar.

### Files Expected To Change
- `apps/desktop/src/components/editor/OptionBarShared.tsx`
- `apps/desktop/src/components/editor/icons.tsx`
- `apps/desktop/src/components/editor/MoveOptionBar.tsx`
- `docs/plans/task.md`

### Verification Plan
- ✅ `pnpm run build`: PASS
- ✅ `pnpm --filter photrez-desktop test`: PASS (283/283 tests passing)
- ✅ `cargo test --workspace`: PASS (85/85 tests passing)

---

## Current Task - Layer Tab Functionality Fixes [COMPLETE]

**Date:** 2026-06-04

### Scope
Fix Layer tab behaviors found during audit:
1. Merge Down and Flatten must upload generated bitmap textures to WebGL.
2. Layer visibility, lock, rename, and opacity controls must commit undo history correctly.
3. Layer tab should gain focused regression coverage for these UI actions.
4. History tab should switch to a functional history status/action view.

### Files Expected To Change

- `apps/desktop/src/components/editor/useLayerActions.ts`
- `apps/desktop/src/components/editor/LayersPanel.tsx`
- `apps/desktop/src/components/editor/LayerItem.tsx`
- `apps/desktop/src/components/editor/__tests__/LayersPanel.test.tsx`
- `docs/AI_HISTORY.md`
- `docs/FEATURES.md`

### Verification Plan

- ✅ `pnpm.cmd --filter photrez-desktop test -- --run apps/desktop/src/components/editor/__tests__/LayersPanel.test.tsx`: PASS (281/281 via vitest run)
- ✅ `pnpm.cmd run build`: PASS
- ✅ `pnpm.cmd --filter photrez-desktop test`: PASS (281/281)

---

## Current Task - Layer Merge Keyboard Shortcuts [COMPLETE]

**Date:** 2026-06-04

### Scope
Add desktop-editor layer merge shortcuts:
1. `Ctrl+E` merges the active layer down.
2. `Ctrl+Shift+E` flattens all layers.
3. Shortcut actions must share the same history and WebGL texture sync behavior as the Layer panel buttons.

### Files Expected To Change

- `apps/desktop/src/components/editor/useCanvasKeyboard.ts`
- `apps/desktop/src/components/editor/useLayerActions.ts`
- `apps/desktop/src/components/editor/layerOperations.ts`
- `apps/desktop/src/components/editor/__tests__/CanvasKeyboardLayerShortcuts.test.tsx`
- `docs/AI_HISTORY.md`
- `docs/FEATURES.md`

### Verification Plan

- ✅ `pnpm.cmd --filter photrez-desktop test -- --run apps/desktop/src/components/editor/__tests__/CanvasKeyboardLayerShortcuts.test.tsx`: PASS (283/283 via vitest run)
- ✅ `pnpm.cmd run build`: PASS
- ✅ `pnpm.cmd --filter photrez-desktop test -- --pool=threads --maxWorkers=1`: PASS (283/283)
- ⚠️ `pnpm.cmd --filter photrez-desktop test`: default Vitest fork mode failed to start 4 workers after a long run (`Timeout waiting for worker to respond`); serial/threads rerun passed all tests.

---

## Current Task - Navigator Relative Drag UX [COMPLETE]

**Date:** 2026-06-04

### Scope
Improve Navigator panning UX so it feels precise and desktop-native:
1. Keep click-on-thumbnail behavior as center-to-point.
2. Change drag started inside the visible viewport frame into relative panning.
3. Prevent Navigator drag from feeling slippery by avoiding continuous recenter-to-pointer during frame drags.
4. Add regression coverage for the interaction model.

### Files Expected To Change

- `apps/desktop/src/components/editor/Navigator.tsx`
- `apps/desktop/src/components/editor/__tests__/Navigator.test.tsx`

### Verification Plan

- ✅ `pnpm.cmd --filter photrez-desktop test -- --run apps/desktop/src/components/editor/__tests__/Navigator.test.tsx`: PASS (275/275 via vitest run)
- ✅ `pnpm.cmd run build`: PASS
- ✅ `pnpm.cmd --filter photrez-desktop test`: PASS (275/275)

---

## Current Task — Scalability and Maintainability Refactor (Waves 3 - 10) [COMPLETE]

**Date:** 2026-06-04

### Scope
Pemisahan concern (Separation of Concerns) pada file viewport, crop overlay, option bar, dan state provider ke dalam hooks dan sub-komponen modular.
- Wave 3: CanvasViewport Shell
- Wave 4: CropOverlay Modularization
- Wave 5: OptionBar Per-Tool Split
- Wave 6: Transform Overlay Cleanup
- Wave 7: EditorContext Split
- Wave 8: Rust Core/Render Reference Organization
- Wave 9: CSS/Primitives & Icon Audit
- Wave 10: Final Verification & Closure

### Verification Results
- ✅ `pnpm run build`: PASS (Vite + TypeScript compiler)
- ✅ `pnpm --filter photrez-desktop test`: 271/271 PASS (vitest)
- ✅ `cargo test --workspace`: 85/85 PASS

---

## Current Task — Separation of Concerns Refactoring (File Splitting) [COMPLETE]

**Date:** 2026-06-04

### Scope

Refactor the largest frontend files in `apps/desktop/src/components/editor/` to extract separate concerns:
1. Extract `useCanvasKeyboard.ts` from `CanvasViewport.tsx` (P0)
2. Extract `LayerItem.tsx` and `useLayerDragReorder.ts` from `LayersPanel.tsx` (P0)
3. Extract `useBrushOverlay.ts` and `usePanNavigation.ts` from `CanvasViewport.tsx` (P1)
4. Extract `useLayerActions.ts` and move `LayerThumb.tsx` from `LayersPanel.tsx` (P1/P2)

Each extraction must be verified by running frontend tests and build checks.

### Files Expected to Change

- `apps/desktop/src/components/editor/CanvasViewport.tsx`
- `apps/desktop/src/components/editor/LayersPanel.tsx`
- `apps/desktop/src/components/editor/useCanvasKeyboard.ts` (NEW)
- `apps/desktop/src/components/editor/LayerItem.tsx` (NEW)
- `apps/desktop/src/components/editor/useLayerDragReorder.ts` (NEW)
- `apps/desktop/src/components/editor/useBrushOverlay.ts` (NEW)
- `apps/desktop/src/components/editor/usePanNavigation.ts` (NEW)
- `apps/desktop/src/components/editor/useLayerActions.ts` (NEW)
- `apps/desktop/src/components/editor/LayerThumb.tsx` (NEW)

### Verification Plan

- Run vitest tests: `pnpm --filter photrez-desktop test`
- Build verification: `pnpm run build`

---

## Current Task — High-Fidelity Layer & UX System Overhaul [COMPLETE]

**Date:** 2026-06-04

### Scope

Complete overhaul of the layer system:
1. Core engine support: drawLayerToContext helper, duplicateLayer (deep bitmap copy), mergeDown (document space composite), flattenLayers, contextual insert above active layer.
2. LayersPanel UI updates: interactive blend mode dropdown, opacity range slider popover, double-click inline renaming input, live canvas thumbnails with checkerboard transparency grid, lock toggles wiring.
3. Drag-and-drop layer reordering list with Photon Amber drop position indicator.
4. Ctrl+J keyboard shortcut in CanvasViewport to duplicate active layer.

### Files Expected to Change

- `apps/desktop/src/engine/document.ts`
- `apps/desktop/src/components/editor/LayersPanel.tsx`
- `apps/desktop/src/components/editor/CanvasViewport.tsx`
- `apps/desktop/src/engine/__tests__/document.test.ts`

### Verification Plan

- Run vitest tests: `pnpm --filter photrez-desktop test`
- Build verification: `pnpm run build`

---

## Current Task — Crop Rotate Zone & Cursor Fix [COMPLETE]

**Date:** 2026-06-03

### Scope

Fix two bugs in crop tool rotation interaction:

**Bug 1 — Rotate hit zone too small:** `ROTATE_OUTER = 24` with `HANDLE_HIT = 20` gives only 4px thick donut ring at zoom=1 — nearly impossible to click. Fixed: `ROTATE_OUTER = 44` (24px ring, matching `SelectionTransformOverlay`).

**Bug 2 — Rotate cursor reverts to crosshair during rotation drag:** Three root causes:
1. `svgRef.setPointerCapture()` in `startDrag` triggers `pointerleave` on the rotate zone `<path>` element → `setHover(null)` + `setHoverPos(null)` → `hoverHandle()` is null → `resolvedCursor()` returns `"crosshair"`.
2. `resolvedCursor` memo only checked `hoverHandle()`, not `dragState()` — so it didn't know a rotation drag was active.
3. `style={{ cursor: ... }}` is not reactive in SolidJS for SVG elements (same issue as CanvasViewport cursor fix history entry).

**Fixes:**
1. `resolvedCursor` now checks `dragState()` first — during rotation drag, always returns rotate cursor regardless of hoverHandle.
2. `rotateCursor` fallback to `"grabbing"` when hoverPos is null during rotation drag.
3. All `onPointerLeave` handlers guard with `if (!dragState())` — don't clear hover during active drag.
4. Changed to `style:cursor={resolvedCursor()}` for proper SolidJS reactivity.
5. Added `SvgSVGAttributes` type extension to `vite-env.d.ts` for `style:${string}` support on SVG elements.

### Files Changed
- `apps/desktop/src/components/editor/CropOverlay.tsx`: ROTATE_OUTER 24→44, cursor resolution with dragState, onPointerLeave guards, style:cursor
- `apps/desktop/src/vite-env.d.ts`: SvgSVGAttributes style:${string} extension

### Verification
- ✅ `pnpm run build`: PASS (2028 modules, ~6.2s)
- ✅ `pnpm --filter photrez-desktop test`: 267/267 PASS (21 files)

---

## Current Task — Rotation Direction Alignment Fix (Shader + Geometry + Tests) [COMPLETE]

**Date:** 2026-06-03

### Scope

Fix rotation direction bugs discovered during crop tool work:

**Bug 1 — Move tool rotate zone too small:** `ROTATE_OUTER` increased from 24 → 44 in `SelectionTransformOverlay.tsx` (24px thick ring instead of 4px).

**Bug 2 — Bounding box expand/shrink on rotation:** Replaced AABB `<rect>` with rotated `<g>` containing `<rect>` + handles matching layer transform — bounding box now always follows layer corners.

**Bug 3 — Rotation direction reversed (3 files):**
1. **shaders.ts** — `-radians(u_layerRotation)` → `radians(u_layerRotation)`. Image now rotates same direction as SVG handles.
2. **transformGeometry.ts** — `rotatePoint` `rad = -deg * DEG` → `rad = deg * DEG`. Positive deg = CW in screen space.
3. **transform-geometry.test.ts** — Updated all rotation expectations to match CW convention. Added tests for 45°, 90°, -90°, 180° corners, round-trip un-rotation, edge-side detection on rotated layers, applyResizeHandle with rotation, cursor rotation with positive/negative angles.

**Bug 4 — Apply resize handle with layer rotation:** `applyResizeHandle` already converts screen dx/dy to local coords via `rad = -rotation * DEG`. Added comprehensive tests for 45° and -45° rotated layers.

### Files Changed

- `apps/desktop/src/components/editor/SelectionTransformOverlay.tsx`: `ROTATE_OUTER = 44`, rotated bounding box
- `apps/desktop/src/renderer/shaders.ts`: rotation direction fix
- `apps/desktop/src/viewport/transformGeometry.ts`: `rotatePoint` convention fix  
- `apps/desktop/src/__tests__/transform-geometry.test.ts`: comprehensive rotation tests
- `apps/desktop/src/__tests__/renderer.test.ts`: shader rotation invariant tests

### Verification

- ✅ `pnpm run build`: PASS (2028 modules, ~6.3s)
- ✅ `pnpm --filter photrez-desktop test`: 267/267 PASS (21 test files)
- ✅ `cargo test --workspace`: 85/85 PASS (pre-existing)

---

## Current Task — Crop Tool Improvement Plan: 7 Incremental Tasks [COMPLETE]

**Date:** 2026-06-03

### Scope

Implement the requested crop tool improvement plan one task at a time, preserving existing crop work already present in the workspace:
1. Draw new crop box from scratch by click-dragging outside the current crop box.
2. Arrow-key crop nudge with viewport pan compensation.
3. Crop intermediate undo/redo state commits after drag completion.
4. Ratio preset dropdown in crop option bar.
5. Size mode unit conversion for px/cm/mm/in at default 300 DPI.
6. Additional composition guides: center, crosshatch, spiral, triangle, safezone.
7. Auto-fit crop rect on ratio changes and rotate-90 control behavior.

### Files Expected To Change

- `apps/desktop/src/components/editor/CropOverlay.tsx`
- `apps/desktop/src/components/editor/CanvasViewport.tsx`
- `apps/desktop/src/components/editor/EditorContext.tsx`
- `apps/desktop/src/components/editor/OptionBar.tsx`
- `apps/desktop/src/viewport/cropPresets.ts`
- `apps/desktop/src/viewport/unitConversion.ts`
- `apps/desktop/src/viewport/cropAutoFit.ts`
- relevant frontend tests

### Verification Plan

- Run targeted frontend tests after each task where practical.
- Run final mandatory verification pipeline before marking complete.

---

## Current Task — Task 3: Crop Intermediate Undo/Redo [IN PROGRESS]

**Date:** 2026-06-03

### Scope

Implement intermediate undo/redo history points for crop box drag adjustments:
1. Capture document state snapshot when starting to drag or draw a crop box (`onDragStateChange` or `onRotationStart` equivalent).
2. Commit document state to history *on drag completion* if the crop rect or rotation values actually changed.
3. Hook intermediate crop adjustments to allow users to undo or redo crop box alterations prior to pressing Enter/APPLY.

### Files Changed

- `apps/desktop/src/components/editor/CropOverlay.tsx`
- `apps/desktop/src/components/editor/CanvasViewport.tsx`




### Verifikasi

- ✅ `pnpm run build`: PASS
- ✅ `pnpm --filter photrez-desktop test`: 245/245 PASS
- ✅ `cargo test --workspace`: 85/85 PASS

---

## Current Task — Crop Moving Panning [COMPLETE]

**Date:** 2026-06-03

### Scope

Make the crop box visually stationary on the screen during drag-move and resize actions while panning the canvas/document in the opposite direction.
1. Update `CropOverlay.tsx` to record start coordinates (`startClientX`, `startClientY`) and starting pan.
2. Calculate screen-space deltas to avoid coordinate feedback loops.
3. Call `engine.setViewport` to pan the viewport by `-actualDx * zoom` and `-actualDy * zoom`.
4. Update tooltip coordinate tracking to account for the viewport shift.

### Files Changed

- `apps/desktop/src/components/editor/CropOverlay.tsx`
- `apps/desktop/src/components/editor/__tests__/CropOverlay.test.tsx`

### Verifikasi

- ✅ `pnpm run build`: PASS
- ✅ `pnpm --filter photrez-desktop test`: 245/245 PASS
- ✅ `cargo test --workspace`: 85/85 PASS

---

## Current Task — Crop Tool Rotation [COMPLETE]

**Date:** 2026-06-03

### Scope

Add rotation support to the Crop tool:
1. Declare `cropRotation` signal and setters in `EditorContext.tsx`.
2. Update WebGL canvas rendering preview rotation in `CanvasViewport.tsx`.
3. Add rotation input field and reset button to `OptionBar.tsx`.
4. Update `applyCrop` logic in `document.ts` to transform layer offsets and rotation (and bake if destructive).
5. Implement rotation drag and dynamic cursor resolution in `CropOverlay.tsx`.
6. Add unit tests for crop rotation.

### Files Changed

- `apps/desktop/src/components/editor/EditorContext.tsx`
- `apps/desktop/src/components/editor/CanvasViewport.tsx`
- `apps/desktop/src/components/editor/OptionBar.tsx`
- `apps/desktop/src/components/editor/CropOverlay.tsx`
- `apps/desktop/src/engine/document.ts`
- `apps/desktop/src/engine/__tests__/document.test.ts`

### Verifikasi

- ✅ `pnpm run build`: PASS
- ✅ `pnpm --filter photrez-desktop test`: 244/244 PASS
- ✅ `cargo test --workspace`: 85/85 PASS

---


## Current Task — Crop Box Canvas Expansion [COMPLETE]

**Date:** 2026-06-03

### Scope

Allow the crop box to extend outside document boundaries, enabling canvas expansion:
1. Modify `constrainCropRectToDocument` in `cropGeometry.ts` to allow coordinates outside document boundaries.
2. Modify `ensureCropRect` in `CanvasViewport.tsx` to prevent auto-resetting of crop box boundaries.
3. Update `crop-geometry.test.ts` to assert that crop bounds can exceed document limits.
4. Update specifications in `01-prd.md` and `35-error-code-registry.md`.

### Files Changed

- `apps/desktop/src/viewport/cropGeometry.ts`
- `apps/desktop/src/components/editor/CanvasViewport.tsx`
- `apps/desktop/src/__tests__/crop-geometry.test.ts`
- `docs/01-prd.md`
- `docs/35-error-code-registry.md`

### Verifikasi

- ✅ `npx vitest run`: 243/243 PASS
- ✅ `npx tsc --noEmit`: PASS
- ✅ `pnpm build`: PASS
- ✅ `cargo test --workspace`: 85/85 PASS

---

---

## Current Task — Bug Hunt: Crop State Edge Cases [COMPLETE]

**Date:** 2026-06-08

### Scope
Systematic bug hunt focused on interaction edge cases:
1. Crop state must not leak after switching tools and returning to Crop.
2. Pasteboard pointer cancel must clean up pending gesture state.
3. Crop resize/drag must stay stable when pointer moves outside canvas.
4. Tool switch during mid-drag must not leave stale state.

### Suspected Bugs to Verify With Tests
- **Bug A**: `pendingPasteboardCropGesture` not cleared on `pointercancel` — state leak that can corrupt next pasteboard gesture.
- **Bug B**: Modern crop `modernCropImageTransform` (offsetX/offsetY/rotation/scale) not reset on tool exit/re-entry — image can appear incorrectly positioned when returning to Crop.
- **Bug C**: `ModernCropOverlay` `clearDrag` doesn't release `setPointerCapture` on pointercancel/lostcapture.

### Files Expected To Change
- `apps/desktop/src/components/editor/__tests__/CanvasViewport.test.tsx`
- `apps/desktop/src/components/editor/__tests__/ModernCropKeyboardParity.test.tsx`
- `apps/desktop/src/components/editor/CanvasViewport.tsx`
- `apps/desktop/src/components/editor/ModernCropOverlay.tsx`
- `docs/AI_CURRENT_TASK.md`
- `docs/AI_HISTORY.md`
- `docs/FEATURES.md`

### Verification Plan
- `pnpm.cmd run build`
- `pnpm.cmd --filter photrez-desktop test --run --pool=threads --maxWorkers=1`

> **Older completed entries archived to:** `docs/archive/AI_CURRENT_TASK_ARCHIVE.md`


---

## Current Task — Bug Hunt Round 3: Tool Switch Mid-Drag Commit Leak [COMPLETE]

**Date:** 2026-06-08

### Scope
Extend the bug hunt to pointercapture defensive gaps found by comparing Classic crop, Modern crop, and SelectionTransformOverlay lostcapture patterns.

### Bugs Found & Fixed

**Bug D — Classic crop `handleLostPointerCapture` has pointerId guard that prevents cleanup on mismatched pointerId:**
- **File:** `useCropOverlayDrag.ts:283-295`
- **Fix:** Removed `e.pointerId !== drag.pointerId` guard. Also added `commitCropState` for non-rotate, non-new drags (functional gap vs `clearDrag`).
- **Test:** `CropOverlay.test.tsx` — "clears dragState on lostpointercapture even with mismatched pointerId"

**Bug E — SelectionTransformOverlay `handleLostPointerCapture` same pointerId guard:**
- **File:** `useSelectionTransformDrag.ts:324-331`
- **Fix:** Removed `e.pointerId !== drag.pointerId` guard.
- **Test:** `SelectionTransformOverlay.test.ts` — "clears dragState on lostpointercapture even with mismatched pointerId"

### Files Changed
- `apps/desktop/src/components/editor/useCropOverlayDrag.ts` — fix + functional gap
- `apps/desktop/src/components/editor/useSelectionTransformDrag.ts` — fix
- `apps/desktop/src/components/editor/__tests__/CropOverlay.test.tsx` — new test
- `apps/desktop/src/components/editor/__tests__/SelectionTransformOverlay.test.ts` — new test

### Verification
- PASS: `pnpm.cmd exec vitest run` (610 tests, 50 files)
- PASS: `pnpm.cmd run build`


---

## Current Task — Bug Hunt Round 3: Tool Switch Mid-Drag Commit Leak [COMPLETE]

**Date:** 2026-06-08

### Scope
When user switches tools while a pointer drag is in progress (e.g., brush → crop mid-stroke), `handlePointerMove`/`handlePointerUp` used `activeTool()` at the time of the event rather than the tool that started the drag. This caused incorrect behavior:
- Brush stroke data lost (never committed)
- Spurious crop rect creation from brush stroke coordinates
- Incorrect selection/move operations from wrong tool handler

### Root Cause
`handlePointerMove` and `handlePointerUp` in `input-handler.ts` received the tool as a parameter from the caller, who passed `activeTool()` (current tool, not drag-start tool). When the tool changed mid-drag, the wrong tool branch was taken.

### Fix
Added `dragTool: ToolType | null` to `ToolContext`. Set in `handlePointerDown` to the tool that initiated the drag. Both `handlePointerMove` and `handlePointerUp` now use `context.dragTool ?? tool` internally. Updated `onCanvasPointerUp`, `onCanvasPointerCancel`, and `onCanvasLostPointerCapture` in `useCanvasPointerTools.ts` to also use `dragTool` for the brush commit guard.

### Files Changed
- `apps/desktop/src/viewport/input-handler.ts` — dragTool set/use fix
- `apps/desktop/src/components/editor/useCanvasPointerTools.ts` — dragTool in commit guards + cleanup
- `apps/desktop/src/__tests__/input-handler-move.test.ts` — 2 dragTool regression tests
- `apps/desktop/src/__tests__/input-handler-snap.test.ts` — dragTool in context

### Verification
- PASS: `pnpm.cmd exec vitest run src/__tests__/input-handler-move.test.ts` (12 tests)
- PASS: `pnpm.cmd exec vitest run src/__tests__/input-handler-snap.test.ts` (4 tests)
- PASS: `pnpm.cmd run build`
- PASS: `pnpm.cmd --filter photrez-desktop test --run --pool=threads --maxWorkers=1` (612 tests, 50 files)


---

## Current Task — WebGL GPU Layer Blend Modes Rendering [COMPLETE]

**Date:** 2026-06-04

### Scope
Implement full GPU-accelerated compositing for layer Blend Modes (Multiply, Screen, Overlay, Darken, Lighten, Color Dodge, Color Burn, Hard Light, Soft Light, Difference, Exclusion) in WebGL2 using a ping-pong framebuffer pipeline.

### Files Changed
- `apps/desktop/src/renderer/shaders.ts`
- `apps/desktop/src/renderer/webgl2.ts`

### Verification Results
- ✅ `pnpm run build`: PASS
- ✅ `pnpm --filter photrez-desktop test`: 271/271 PASS (vitest)
- ✅ `cargo test --workspace`: 85/85 PASS

---

## Current Task - Scalability and Maintainability Refactor Plan [PLANNING]

**Date:** 2026-06-04

Create a detailed planning artifact for staged file splitting/merging across the project so Photrez remains scalable and maintainable without changing behavior.

### Plan Artifact

- `docs/plans/2026-06-04-scalability-maintainability-refactor-plan.md`

### Planning Scope

1. TypeScript MVP engine facade split (`apps/desktop/src/engine/document.ts` remains public source-of-truth facade).
2. Frontend editor shell split (`CanvasViewport`, `CropOverlay`, `OptionBar`, `SelectionTransformOverlay`, `EditorContext`).
3. Pure viewport/domain utility extraction.
4. Legacy/duplicate HUD cleanup.
5. Rust core/render organization as later, lower-priority reference/future-target work.
6. CSS/shared UI audit without splitting small stable files unnecessarily.

### Non-Goals

- No implementation code changes yet.
- No runtime migration from TypeScript engine to Rust.
- No new dependencies.
- No UI redesign or feature scope expansion.

### Verification Plan For Later Execution

- `pnpm.cmd run build`
- `pnpm.cmd --filter photrez-desktop test`
- `cargo test -p photrez-core`
- Run broader mandatory gates per `AGENTS.md` when implementation begins.

---

## Current Task — Adversarial Bug Hunt: Hidden Regressions & State Leaks [COMPLETE]

**Date:** 2026-06-08

### Scope
Systematic adversarial bug hunt searching for hidden regressions, state leaks, stale UI state, invalid transitions, interrupted gestures, and keyboard/pointer conflicts across the Photrez editor.

### Risk Matrix

| # | Risk | Scenario | Impact | Likelihood | Verdict |
|---|------|----------|--------|------------|---------|
| R1 | Mid-stroke Space → abandoned brush | Space while brush stroke active — isPanning blocks pointerup → brush never committed | HIGH | HIGH | **SAFE** — lostpointercapture fallback commits stroke |
| R2 | Modern crop CSS transform misaligns coords | Modern crop rotation/scale CSS transform not reflected in screenToDocument | HIGH | MEDIUM | **SAFE** — crop SVG has own coordinate system; canvas coords only need pan/zoom |
| R3 | **Escape during crop SVG drag overridden** | Drag crop handle → Escape resets crop rect → pointermove recreates from dragState | MEDIUM | HIGH | **BUG FOUND & FIXED** |
| R4 | Rapid sequential pointerDown without pointerUp | Double-click (two pointerdowns) without pointerup → second drag overlaps first | MEDIUM | LOW | **SAFE** — separate pointerIds; mouse can't generate two simultaneous pointerdowns |
| R5 | Escape during modern crop SVG drag overridden | Same pattern as R3 for ModernCropOverlay | MEDIUM | HIGH | **BUG FOUND & FIXED** |
| R6 | Ctrl+Z during brush stroke mid-flight | Undo mid-stroke → engine restored → pointerup commits to wrong state | MEDIUM | LOW | **SAFE** — strokePoints accumulated, onPaintStroke redraws from scratch on fresh engine |
| R7 | Escape during selection transform drag | Same pattern as R3 for SelectionTransformOverlay | MEDIUM | HIGH | **SAFE** — already handled (useSelectionTransformDrag.ts:334-357) |

### Bugs Found & Fixed

**Bug G — Classic crop `useCropOverlayDrag` lacks Escape handler during active drag:**
- **Root Cause:** `useCropOverlayDrag` had no window keydown listener for Escape. When the keyboard handler (`useCanvasKeyboard`) called `discardCropSession` on Escape, it reset `cropRect()`. But the SVG's internal `dragState` remained active, so subsequent `pointermove` events recalculated from `dragState.startRect` and overwrote the reset.
- **Fix:** Added `onMount` with `window.addEventListener("keydown", ...)` in `useCropOverlayDrag.ts` that, on Escape during active drag: restores start rect + rotation, releases pointer capture, clears dragState, clears snap lines, and notifies drag end.
- **Test:** 2 regression tests (handle resize drag, move drag) verifying Escape restores original rect and subsequent pointermove does not fire onCropRectChange.

**Bug H — Modern crop `ModernCropOverlay` lacks Escape handler during active drag:**
- **Root Cause:** Same pattern as Bug G. `ModernCropOverlay` managed its own local `dragState` signal with no Escape handling. Keyboard handler's `resetModernCrop()` reset frame/transform signals, but `dragState` stayed active → pointermove recalculated from `dragState.startFrame`/`startTransform` and overrode the reset.
- **Fix:** Added `onMount` with `window.addEventListener("keydown", ...)` in `ModernCropOverlay.tsx` that calls `clearDrag()` on Escape. Safe to call with no pointer event — the function already handles the `e?.pointerId` guard with optional chaining.
- **Test:** 2 regression tests (resize drag, move drag) verifying Escape clears dragState and subsequent pointermove does not fire callbacks.

**Bug I — Modern crop resize clamped to projected canvas (upper-bound):**
- **Root Cause:** `resizeModernFrameOneSided` and `resizeModernFrameFromCenter` clamped frame w/h to `projectedWidth`/`projectedHeight` via `Math.min(maxW/Math.min(maxH, ...)`. Classic crop (`constrainCropRectToDocument`) only enforces min size 1x1 with no upper bound, so Modern was more restrictive.
- **Fix:** Removed `Math.min(maxW, ...)`/`Math.min(maxH, ...)` upper-bound clamps from both resize functions. Default initial frame still bounded by projected canvas/viewport via `getDefaultModernCropFrame`.
- **Test:** Updated "clamps center resize" → "allows beyond projected canvas bounds" and same for one-sided.

**Bug J — Modern crop resize mouse cursor lags behind crop edge:**
- **Root Cause:** Modern crop frame is centered in viewport: `x = (viewportWidth - frame.w) / 2`. Resize delta `d(right_edge) / d(deltaX) = 1/2`, so the cursor moves 2× the frame width change. Delta to frame size must be doubled for 1:1 cursor tracking.
- **Fix:** Changed `resizeModernFrameOneSided` from `effDx = params.alt ? params.deltaX * 2 : params.deltaX` to `effDx = params.deltaX * 2`. Also doubled deltas in shift proportional path. No alt-guard since centering applies regardless of modifier.
- **Test:** Updated resize coordinate expectations to account for doubled delta.

**Bug K — Crop fixed-ratio corner resize jitters on reverse diagonal drag:**
- **Root Cause:** `applyAspectCornerResize` computed width from `effDx` alone (`w = oldW + effDx`), ignoring `effDy`. Single-axis caused jitter when horizontal axis crossed zero during diagonal reverse drag. Previously fixed in `applyResizeHandle` (`transformGeometry.ts:210-233`) using diagonal projection.
- **Fix:** Project both `effDx`/`effDy` onto handle diagonal: `projected = effDx*hx + effDy*hy`, compute `factor = max(minFactor, 1 + projected/sumWH)`, then `w = oldW * factor` and `h = w / targetRatio`. Mirrors the transform's stability principle: blending both axes damps axis-crossing noise.
- **MinFactor:** Changed from `max(1/oldW, 1/oldH)` to `max(1/oldW, targetRatio/oldW)` to ensure `h = w/targetRatio >= 1` at minimum size.
- **Test:** 15 new regression tests: reverse diagonal drag on all 4 corners, axis-crossing stability (dx oscillates, dy oscillates), min-size clamping, Size mode reverse drag.

**Bug L — Modern Crop fixed-ratio corner resize non-monotonic (axis-selection threshold):**
- **Root Cause:** Both `resizeModernFrameOneSided` and `resizeModernFrameFromCenter` used `Math.abs(dw) >= Math.abs(dh)` to choose width-driven vs height-driven paths. When `|dw| ≈ |dh|` (common during diagonal drag on the ratio diagonal), pointer noise oscillated the threshold, flip-flopping between paths. The aspect ratio amplified the delta differently per path (`×1` vs `×useAspect`), causing per-move delta magnitude to vary by up to `useAspect×` (e.g., 1.777× for 16:9) — perceived as grow-fast/grow-slow cycles.
- **Fix:** Replaced both functions' axis-threshold corner paths with diagonal projection: `projected = effDx*hx + effDy*hy`, `factor = max(minFactor, 1 + projected/sumWH)`, `newW = fw * factor`, `newH = newW / useAspect`. Mirrors same pattern used in `applyResizeHandle` (transform), `applyProportionalCornerResize`, and `applyAspectCornerResize` (Bug K).
- **Test:** 10 new regression tests: outward/inward multi-move sequences with axis flips for all 4 corners (one-sided + centered), per-move delta stability (<1.3× swing vs old ~1.777×), ratio invariant.

### Risk Items Verified Safe
- **R1** (Space mid-brush → lostpointercapture fallback) — SAFE
- **R2** (modern crop CSS coord skew) — SAFE
- **R4** (rapid pointerDown) — SAFE
- **R6** (Ctrl+Z mid-brush) — SAFE
- **R7** (transform Escape already handled) — SAFE

### Files Changed
- `apps/desktop/src/components/editor/useCropOverlayDrag.ts` — Bug G fix (Escape handler)
- `apps/desktop/src/components/editor/ModernCropOverlay.tsx` — Bug H fix (Escape handler)
- `apps/desktop/src/viewport/modernCropGeometry.ts` — Bug I (remove clamps), Bug J (double deltas), Bug L (diagonal projection in corner aspect resize paths)
- `apps/desktop/src/viewport/cropGeometry.ts` — Bug K fix (diagonal projection in applyAspectCornerResize)
- `apps/desktop/src/__tests__/modern-crop-geometry.test.ts` — Bug I/J/L: 10 new + 2 updated tests
- `apps/desktop/src/__tests__/crop-geometry.test.ts` — Bug K: 15 new + 4 updated tests
- `apps/desktop/src/components/editor/__tests__/CropOverlay.test.tsx` — 4 new regression tests

### Verification
- PASS: `pnpm.cmd --filter photrez-desktop test --run --pool=threads --maxWorkers=1` (641 tests, 50 files)
- PASS: `pnpm.cmd run build`
