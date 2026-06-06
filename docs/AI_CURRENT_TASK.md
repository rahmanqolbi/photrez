# AI_CURRENT_TASK.md - Photrez Current Task

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

> **Older completed entries archived to:** `docs/archive/AI_CURRENT_TASK_ARCHIVE.md`


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
