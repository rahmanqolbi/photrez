# AI_CURRENT_TASK.md - Photrez Current Task

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

## Current Task — Photoshop-Style Crop Moving Panning [COMPLETE]

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


## Current Task — Photoshop-Style Crop Box Canvas Expansion [COMPLETE]

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
