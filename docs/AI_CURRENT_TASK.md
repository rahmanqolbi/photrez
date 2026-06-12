# AI_CURRENT_TASK.md - Photrez Current Task

---

## Current Tasks

### [2026-06-12] Brush Preset UX Calibration [COMPLETE]

Manual QA shows the core hardness 0 brush is now acceptable, but users still need editor-like presets: Soft Round should be a usable main soft brush with a slightly fuller center, while Large Soft remains a low-flow wash/airbrush-like preset.

**Done:**
1. Keep the core brush rendering engine unchanged.
2. Updated brush preset expectations first.
3. Tuned `Soft Round` default to hardness `0.15` and flow `1.0` for a desktop-editor main soft brush.
4. Kept `Large Soft` as a lower-flow broad wash preset with hardness `0.0`, opacity `0.85`, and flow `0.65`.
5. Focused brush-related tests pass; full verification recorded in `AI_HISTORY.md`.

### [2026-06-12] Brush Soft Round Fatter Center Calibration [COMPLETE]

Manual QA shows hardness 0 now has correct feathering and opacity, but the visible center remains too thin. The next calibration will change the soft radial falloff shape, not overall flow, so the middle reads more like a desktop editor soft round brush.

**Done:**
1. Keep softPeak, effective flow, spacing, and max-alpha stroke behavior unchanged.
2. Tuned the hardness 0 `soft` falloff exponent toward a fatter-center profile.
3. Added dynamic soft falloff exponent based on hardness, so hardness 0 gets a wider center while higher hardness values retain tighter edges.
4. Updated pixel-profile tests so hardness 0 has stronger alpha at 25-50% radius while retaining a feathered edge.
5. Focused tests pass; full verification recorded in `AI_HISTORY.md`.

### [2026-06-12] Brush Soft Round Opacity Body Calibration [COMPLETE]

Polishing hardness 0 soft round brush after manual QA showed the feather shape is correct but Flow 100 / Strength 100 still looks too airbrush-like and low-opacity compared with desktop image editors.

**Done:**
1. Keep current soft falloff exponent, softPeak, dab spacing, and subpixel stamping unchanged.
2. Raised low-hardness effective flow from `0.82` to `0.90`, while keeping hardness 100 at `1.0`.
3. Updated focused brush/renderer tests to lock the new opacity-body target.
4. Focused tests pass; full verification recorded in `AI_HISTORY.md`.

### [2026-06-12] Brush Soft Round Editor-Like Final Polish [COMPLETE]

Polishing the soft round brush after manual QA showed the latest hardness 0 stroke is natural but still slightly too transparent for Flow 100 / Strength 100.

**Done:**
1. Slightly raise low-hardness effective flow from `0.80` to `0.82` while keeping hardness 100 at `1.0`.
2. Keep the current `soft` falloff exponent and softPeak profile unchanged.
3. Cleaned small TypeScript/test issues found during review (`any` in brushTipMask tests, unused variable in hard overlay path).
4. Repaired malformed `AI_HISTORY.md` brush entry heading.
5. Focused brush tests pass; full verification recorded in `AI_HISTORY.md`.

### [2026-06-12] Bug Fix — Viewport Transition Jiggle [COMPLETE]

Fixing the shaking/jiggling transition effects in the viewport during zoom (via shortcuts/mouse wheel) and tool switching.

**Done:**
1. Disabled CSS transitions for position (`left`, `top`) and scaling (`transform`) on the canvas and overlay container in `CanvasViewport.tsx` to ensure zoom and tool switching are instant, snappy, and free from coordinate/visual alignment drift.
2. Verified that zoom, panning, and tool switching remain functional and look much cleaner.
3. Ran Vitest test suite, TypeScript compile checks, and Tauri dev builds. All tests and builds pass.

### [2026-06-12] Brush Effective Flow Hardness Scaling Calibration [COMPLETE]

Tuning effective brush flow based on hardness to achieve an airbrush-like soft stroke.

**Done:**
1. Implemented `getEffectiveFlowMultiplier(hardness)` using the quadratic curve `0.1 * h^2 + 0.32 * h + 0.58`.
2. Applied the multiplier to `alphaScale` in `useBrushOverlay.ts` and `paintStrokeRenderer.ts` so soft brush settings scale down stamp opacity dynamically.
3. Added a unit test in `brushTipMask.test.ts` to verify the multiplier checkpoints (`f(0) = 0.58`, `f(0.8) = 0.90`, `f(1.0) = 1.00`) and verify that soft brush `alphaScale` is reduced.
4. Adjusted assertions in `paintStrokeRenderer.test.ts` to reflect the calibrated alpha values.
5. All 798 Vitest tests, cargo checks, and Tauri desktop builds compile and pass successfully.


### [2026-06-12] Brush Falloff Soft Exponent and Peak Multiplier Calibration [COMPLETE]

Tuned the soft round brush alpha falloff curve and peak multiplier to achieve a broad, smooth gradual feather.

**Done:**
1. Set the `"soft"` curve exponent to `1.3` (inside the `1.25–1.4` range).
2. Implemented a `softPeak` multiplier of `0.9 + 0.1 * h` to limit maximum opacity of soft dabs.
3. Verified the resulting radial pixel-profile matches exactly: center 0.8-0.95, 25% radius 0.6-0.75, 50% radius 0.3-0.5, 75% radius 0.08-0.2, edge 0.
4. Updated unit tests in `brushTipMask.test.ts` and `paintStrokeRenderer.test.ts` to enforce these boundaries.
5. All 800 Vitest tests and 92 Rust workspace tests pass, and frontend builds successfully.

---

### [2026-06-11] Brush Spacing and Subpixel Stamping Calibration [COMPLETE]

Calibrated the soft round brush spacing, implemented subpixel stamping, and tuned the alpha falloff profile to eliminate visible dab banding/segmentation and core-heaviness at hardness 0.

**Done:**
1. Confirmed soft brush spacing for size 70 hardness 0 computes to 3px (well within the target 2-4px range).
2. Verified `interpolateDabs` behaves consistently without accumulating periodic pattern artifacts.
3. Implemented subpixel stamping via bilinear tip sampling in `stampBrushTipMaxAlpha` to prevent integer rounding coordinate jitter.
4. Added unit test in `brushTipMask.test.ts` to assert correct bilinear subpixel stamping.
5. Tuned the `"soft"` curve exponent in `brushTipMask.ts` from `1.2` to `2.2` to soften the center core/peak and make the feathering transition much more gradual and natural.
6. All 800 Vitest tests and 92 Rust workspace tests pass, and frontend bundles successfully.

---

### [2026-06-09] Post-Crop Move Tool Clean State [COMPLETE]

Introduced `selectedLayerId` as UI selection signal independent from engine `activeLayerId`. After crop apply, both cleared to null. Layer click, auto-select, Escape deselect all update appropriately.

### [2026-06-09] Bug Fix: Crop Fill Background Disappears After Deselect [COMPLETE]

Fixed two root causes in `webgl2.ts render()`:
1. **Stale TEXTURE1 feedback loop** — unbind both TEXTURE0/1 to null at start of each render to prevent cross-frame feedback loop detection that silently drops draw calls.
2. **GL_BLEND double-compositing** — disable BLEND during FBO compositing (shader handles it); re-enable for final screen render.

### Verification
- PASS: `pnpm.cmd --filter photrez-desktop test --run` (738 tests, 52 files)
- PASS: `pnpm.cmd run build` (tsc + Vite)

---

### [2026-06-09] Ratio Pill Bar Implementation [COMPLETE]

Replaced crop mode `<select>` (Free/Ratio/Size) and ratio preset `<select>` (CROP_PRESETS + Custom) with a pill bar in `CropOptionBar.tsx`. Added `4:3` and `21:9` presets to `cropPresets.ts`. Free + Size buttons are always visible; ratio pills and "+" hidden in Size mode. "+" pill toggles inline W:H fields initialized from current cropAspect.

Updated 17+ tests to use `clickPill(container, label)` replacing `fireModeChange`/`firePresetChange`. All 37 tests pass.

### Verification
- PASS: `npx vitest run` (762 tests, 52 files)
- PASS: `pnpm.cmd run build` (tsc + Vite)

## Current Task

### [2026-06-10] Smart Guides (Crop) — Classic + Modern [COMPLETE]

Implemented snap to document edges, center, and rule-of-thirds during crop drag-create + cyan dashed snap lines.

**Done:**
1. Added rule-of-thirds targets to `buildCropSnapTargets` in `cropSnap.ts`
2. Fixed `edgesForHandle("new")` to return all 6 edges (was `[]`, no snap during drag-create)
3. Crop snap lines render cyan (#00ffff) with dashed style vs move-tool magenta (#ff00ff)
4. Added optional `color` field to `SnapLine` in `smartGuides.ts`
5. Updated `SmartGuides.tsx` to use `line.color` and dash array for cyan lines
6. Added 3 new tests (rule-of-thirds, "new" handle snap, rule-of-thirds snap + cyan color) — all 8 pass
7. Full test suite: 765 pass (52 files)

**Added Modern mode:**
- Added `cropSnapTargets` and `moveSnapEnabled` params to `useCanvasPointerTools`
- During drag-create, converts screen rect → doc-space → `snapCropRect("new")` → screen-space
- Draws cyan snap lines during Modern drag-create
- Clears snap lines on pointer up / cancel
- Added `pan` access via editor context

**Still not in scope:**
- Snap during Modern resize/move (only drag-create)
- Horizontal center snap target (already worked via `docW/2` and `docH/2`)

### Verification
- PASS: `npx vitest run` (765 tests, 52 files)
- PASS: `pnpm.cmd run build` (tsc + Vite)

---

### [2026-06-10] Center-Out Drag Verified + Modern Snap Bug Fix [COMPLETE]

**Center-Out Drag Investigation:**
- Classic mode: `applyCropResizeHandle` already correct.
- Modern mode: `effDx = params.deltaX * 2` is correct for both modes (edge position = center + w/2, so 2× delta = 1:1 cursor tracking). Alt only changes compensation: `params.alt ? 0 : ...`.
- Added 9 new alt=center-out tests proving Modern behavior is correct.

**Modern Snap Bug Fix:**
- `commitDragCreateFrame` used UNSNAPPED `modernDragEnd` while preview showed SNAPPED rect
- Fix: store snapped preview in `modernDragSnappedPreview` variable, use it on drag-end

**Files Changed:**
- `useCanvasPointerTools.ts` — snap-to-commit consistency
- `modern-crop-geometry.test.ts` — 9 new center-out tests

### Verification
- PASS: `npx vitest run` (774 tests, 52 files)
- PASS: `pnpm.cmd run build`

---

### [2026-06-10] Modern Mode Pasteboard Drag & Frame Bounds [COMPLETE]

**Problems Fixed:**
1. Pasteboard clicks in Modern mode never reached drag-create handler — SVG overlay captured events, `isPasteboardPointerDown` didn't recognize them
2. Snap conversion used stale `pan.x/pan.y` (Classic origin) instead of Modern mode CSS transform origin
3. `clampFrameToProjectedBounds` capped frame dimensions at projected canvas, preventing frame > canvas
4. No crosshair cursor on pasteboard when no frame existed
5. Existing frame wasn't cleared during drag-create, causing visual confusion

**Changes:**
- `CanvasViewport.tsx` — `isPasteboardPointerDown` detects SVG overlay clicks, routes Modern mode to `onCanvasPointerDown`, crosshair cursor on viewport container
- `useCanvasPointerTools.ts` — snap conversion uses `canvasRect - containerRect` offset, `commitDragCreateFrame` uses raw viewport selection, clears frame on drag threshold
- `modernCropGeometry.ts` — removed upper cap from `clampFrameToProjectedBounds`
- Test: updated `clampFrameToProjectedBounds` test name and expectations

### Verification
- PASS: `pnpm run build`
- PASS: `pnpm --filter photrez-desktop test` (774 tests, 52 files)
- PASS: `cargo test -p photrez-core` (85 tests)

---

### [2026-06-10] Canvas Expansion — Visual Indicator + Tests [COMPLETE]

**Implementation:**
1. **Visual indicator** (`ModernCropOverlay.tsx`): When crop frame exceeds projected canvas, renders dashed white canvas boundary + subtle fill in expansion areas. Gated on rotation=0.
2. **`canvasScreenRect` prop**: Passed from `CanvasViewport.tsx` as `{ x: panX + offsetX, y: panY + offsetY, w: projectedW, h: projectedH }`. Null when rotated.
3. **Engine test** (`postCropAlignment.test.ts`): Verifies non-fill directional expansion.

**Key insight:** The engine pipeline (`performApplyCrop`) already handled canvas expansion implicitly — it never references `model.width/height`, only the passed `x, y, width, height`. Negative x/y naturally produces directionally larger document. The only missing pieces were the visual indicator during preview and explicit test coverage.

### Verification
- PASS: `pnpm run build`
- PASS: `npx vitest run` (775 tests, 52 files)
- PASS: `cargo test -p photrez-core` (85 tests)

---

### [2026-06-10] Viewport-Aware Crop Frame Position [COMPLETE]

**Implementation:**
1. `ModernCropFrame` interface: `{x,y,w,h}` instead of `{w,h}` — frame position stored explicitly.
2. `getModernCropFrameScreenRect` returns `{x: frame.x, y: frame.y, ...}` — no fallback centering.
3. `shiftModernCropFrame(dx, dy)` in `usePanNavigation.ts` — moves frame along with viewport in all 4 pan paths.
4. `centerModernCropFrame()` helper — recomputes centered x,y from viewport size.
5. `fitToScreenAndRender` in `useViewportRenderer.ts` — recenters frame after Ctrl+0.
6. All resize/move/clamp helpers preserve `x,y` from input frame.
7. Frame literals across 4 source files + 3 test files updated.

### Verification
- PASS: `npx tsc --noEmit`
- PASS: `pnpm.cmd run build`
- PASS: `npx vitest run` (775 tests, 52 files)

---

### [2026-06-10] Bug Fix — Fill Box Stuck + Pan Reset on Crop Entry [COMPLETE]

**Fix 1 — Fill box not following pan:**
Moved `canvasScreenRect` into a top-level `createMemo` at `CanvasViewport` level (outside `<Show>` render prop). Memo tracks `pan()`, `offsetX/Y`, `rotation`, `docWidth`, `zoom`, `scale`. Guarantees reactive update on pan.

**Fix 2 — Pan reset to center on crop entry:**
Replaced `setPan({x:0, y:0})` with centering calc:
```
panX = (viewportWidth − docWidth × zoom × scale) / 2
panY = (viewportHeight − docHeight × zoom × scale) / 2
```
Applied via `setPan()` + `engine.setViewport()`. Zoom preserved.

### Verification
- PASS: `pnpm.cmd run build`
- PASS: `npx vitest run` (775 tests, 52 files)

### [2026-06-10] Bug Fix — Modern Crop Fill BG Panning Lag [COMPLETE]

**Problem:** Modern crop fill background preview (`modernCropFillPreviewStyle`) used viewport-centered coordinates `(viewportWidth - w)/2` instead of actual screen coordinates `frame.x` and `frame.y`, causing the fill preview to be left behind when the viewport was panned/scrolled.

**Solution:** Use `frame.x` and `frame.y` directly in `modernCropFillPreviewStyle`. Added dedicated test coverage verifying positioning correctness.

### Verification
- PASS: `pnpm run build` (tsc + Vite)
- PASS: `pnpm --filter photrez-desktop test` (776 tests, 52 files)
- PASS: `cargo test -p photrez-core` (85 tests)

### [2026-06-10] Feature — Reset Canvas Center on Crop Click Entry [COMPLETE]

**Problem:**
1. Clicking the canvas when no cropbox exists creates a default cropbox, but did not reset the canvas position/pan to the center, which could leave the newly created cropbox off-center if the viewport was panned before.
2. In Modern crop mode, drag-to-create committed a frame with coordinates hardcoded to `(0,0)`, making the newly created frame appear at the top-left corner of the viewport while the image content shifted to center, leading to misalignment.

**Solution:**
1. When creating the default/restored cropbox on canvas click, reset the viewport pan coordinates to center the canvas in the viewport for both Classic and Modern modes.
2. Set the committed drag-create frame's `x` and `y` coordinates to center-fit in the viewport `x: (vw - w)/2` and `y: (vh - h)/2`, matching the Modern crop layout center pivot.

### Verification
- PASS: `pnpm run build` (tsc + Vite)
- PASS: `pnpm --filter photrez-desktop test` (776 tests, 52 files)
- PASS: `cargo test -p photrez-core` (85 tests)

### [2026-06-11] Bug Fix — Classic Rotated Crop Side Resize Axis [COMPLETE]

Fixing the resize behavior of edge/side handles for a rotated cropbox in Classic Crop mode. The current logic uses screen-space coordinates instead of rotated local coordinates when resizing via non-corner handles.

**Planned:**
1. Update `useCropOverlayDrag.ts` to use rotated local coordinates (`localDelta`) for both corner and side handles when `rot !== 0`.
2. Verify that existing and new tests pass.

### Verification
- PASS: `pnpm.cmd run build` (production build compiled successfully in 6.06s)
- PASS: `pnpm.cmd --filter photrez-desktop test --run` (all 781 tests passed, verifying edge handle coordinate conversion, rotation pivot drift correction, SVG drag cursor style, and For-loop reactive cursor style bindings on handle hover)
- PASS: `cargo test -p photrez-core` (all 85 Rust core tests passed)
### [2026-06-12] Brush Effective Flow Calibration Tuning [COMPLETE]

Adjusting the getEffectiveFlowMultiplier formula to increase the opacity and body of soft brushes (hardness 0), preventing them from looking too faded/ghost-like.

**Done:**
1. Updated `getEffectiveFlowMultiplier` in `brushTipMask.ts` from `0.1 * h^2 + 0.32 * h + 0.58` to `0.8 + 0.2 * h`.
2. Updated checkpoints in `brushTipMask.test.ts` (0% hardness -> 0.8, 80% hardness -> 0.96, 100% hardness -> 1.0).
3. Updated expected center alpha for soft brush drawing test in `paintStrokeRenderer.test.ts` to `184` (was `133`), and adjusted the overlap test's expected non-accumulated alpha bounds to `toBeLessThanOrEqual(100)` (was `80`) and `toBeGreaterThan(60)` (was `45`) to match the new multiplier scaling.
4. Ran verification pipeline: all frontend tests, workspace cargo tests, and production build checks compile and pass successfully.

### Verification
- PASS: `pnpm --filter photrez-desktop test --run` (all 802 tests passed)
- PASS: `pnpm run build` (tsc + Vite production build successfully compiled)
- PASS: `cargo test --workspace` (all 92 Rust workspace tests passed)

### [2026-06-12] Brush & Eraser UX Improvements [COMPLETE]

Implementing modifier key workflows (Shift + Alt) for the Brush and Eraser tools:
1. Alt-Hold Eyedropper: Hold Alt key while brush/eraser is active to temporarily sample colors.
2. Shift-Click Straight Lines: Hold Shift and click to draw a straight line from the last stamp point.
3. Shift-Drag Axis Lock: Hold Shift and drag to lock coordinates to horizontal or vertical axis.

**Done:**
1. Setup viewport context, implement Alt-Hold eyedropper and cursor styles (Task 1).
2. Implement Shift-Click straight line interpolation (Task 2).
3. Implement Shift-Drag axis locking (Task 3).
4. Verified using Vitest suite, TypeScript compilation, and workspace tests.

### Verification
- PASS: `pnpm --filter photrez-desktop test --run` (all 809 tests passed)
- PASS: `pnpm run build` (tsc + Vite production build successfully compiled)
- PASS: `cargo test --workspace` (all 92 Rust workspace tests passed)

### [2026-06-12] Remove Inner Brush Hardness Indicator Ring [COMPLETE]

Removing the inner dashed hardness ring from the brush/eraser cursor overlay to match professional editor aesthetics (Photoshop/Affinity) and reduce visual clutter.

**Done:**
1. Removed `<circle data-paint-cursor-hardness>` conditional rendering from `BrushCursorOverlay.tsx`.
2. Cleaned up unused `hardRadius` definition in `BrushCursorOverlay.tsx`.
3. Updated unit tests in `BrushCursorOverlay.test.tsx` to assert that the inner hardness circle is absent (`toBeNull()`).
4. Verified that the updated unit tests and build compilation pass successfully.

### Verification
- PASS: `pnpm --filter photrez-desktop test --run` (all 809 tests passed)
- PASS: `pnpm run build` (tsc + Vite production build successfully compiled)
- PASS: `cargo test --workspace` (all 92 Rust workspace tests passed)
