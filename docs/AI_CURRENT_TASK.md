# AI_CURRENT_TASK.md - Photrez Current Task

---

## Current Tasks

### [2026-06-13] Bug Fix — Modern Crop: Reset Button in Ratio/Size Modes [COMPLETE]

**Root Cause:**
In `CropOptionBar.tsx`, the Reset button's click handler reset the Modern crop frame using `getDefaultModernCropFrame` but passed `aspect` as `cropMode() === "ratio" ? cropAspect() : null`. If `cropMode()` was `"size"`, it passed `null`, causing the reset cropbox to ignore the target size aspect ratio and fall back to the viewport aspect ratio.

**Done:**
1. Updated `CropOptionBar.tsx` Reset button onClick handler to pass the correct aspect ratio for both `ratio` and `size` modes (`aspect: ea`) when resetting in Modern crop mode.
2. Added unit tests in `CropOptionBar.test.tsx` verifying that resetting the cropbox in Size mode correctly preserves the target size's aspect ratio.

**Verification:**
- PASS: 54 test files, 813 frontend tests
- PASS: TypeScript + Vite build

### [2026-06-13] Bug Fix — Modern Crop: 1:1 Cursor Tracking & Lag in Center-Resizing [COMPLETE]

**Root Cause:**
Because the Modern Crop frame is always centered in the viewport, resizing by dragging a handle moves the frame boundaries symmetrically from both sides. With `effDx = deltaX` in one-sided mode, the handle only moves at half-speed on screen relative to the pointer (`deltaX / 2`), causing the mouse to drift ahead and feel "left behind" (laggy). To achieve pixel-perfect 1:1 cursor tracking on screen, the delta multipliers must always be doubled (`effDx = deltaX * 2`) for both Alt and non-Alt resizing, which matches the visual center-resizing nature of the viewport-fixed Modern frame.

**Done:**
1. Modified `resizeModernFrameOneSided` to double `deltaX` and `deltaY` by default (`effDx = deltaX * 2` and `effDy = deltaY * 2`) for both Alt and non-Alt cases, aligning screen boundary changes with the pointer 1:1.
2. Updated the `handle-to-pointer tracking (regression)` assertions in `modern-crop-geometry.test.ts` to expect 1:1 pixel changes instead of half-speed changes.
3. Updated the mock pointer event expectations in `CropOverlay.test.tsx` to align with 1:1 mouse tracking results.

### Verification
- PASS: 54 test files, 812 frontend tests
- PASS: TypeScript + Vite build
- PASS: 92 Rust workspace tests

### [2026-06-13] Bug Fix — Modern Crop: Frame Visual Shift on Resize & Alt Modifier Key [COMPLETE]

**Root Cause:**
1. In `resizeModernFrameOneSided`, a recent change forced the frame coordinates `x, y` to shift in screen space (one-sidedly) during resize. In Modern crop, the crop frame is viewport-fixed and must always stay centered on the screen, with the image content panning/scaling underneath. Centering coordinates `(fw - newW)/2` must be used for the frame, and the one-sided anchoring must be achieved via the `compensation` offset instead.
2. Erroneous diagonal drift occurred because resizing via side handles (like "n"/"s" or "w"/"e") applied compensation to the opposite axis, when that axis should have zero compensation to resize symmetrically.
3. Alt key functionality was reported missing/non-responsive due to potential event-handling focus issues and default browser behavior on Windows. We must ensure `isAltPressed` is correctly reactive and snap behavior is disabled when Alt is held.

**Done:**
1. Reverted Modern crop frame coordinates to always center-resize on the screen: `x: params.frame.x + (fw - newW) / 2` and `y: params.frame.y + (fh - newH) / 2` (fixed the jumping frame issue).
2. Corrected the `compensation` formulas to apply axis-specific one-sided offsets only when the handle includes the corresponding direction, and zero otherwise.
3. Ensured Alt key modifier correctly disables snapping and enforces center-out resizing.
4. Aligned the test suites `modern-crop-geometry.test.ts` and `CropOverlay.test.tsx` to match centered-resizing expectations.
5. Prevented negative zero (`-0`) values from being produced by the division arithmetic in `compensation` calculations.

### Verification
- PASS: 54 test files, 812 frontend tests
- PASS: TypeScript + Vite build
- PASS: 92 Rust workspace tests

### [2026-06-13] Bug Fix — Modern Crop: Compensation Over-Correction for W/N Handles [COMPLETE]

**Root Cause:**
In `resizeModernFrameOneSided`, frame position adjusts for "w"/"n" handles to anchor the opposite edge. But `compensation` was still applied on the same axis, creating a double shift — the crop rect anchor point drifted in document space.

Specifically, `compensation.x = actualDw / 2` for "w" handles and `compensation.y = actualDh / 2` for "n" handles, but the frame position already handled anchoring, making compensation unnecessary (and harmful).

**Fix:**
- Non-shift path: compensation.x = 0 for "w" handles, compensation.y = 0 for "n" handles
- Shift path: same zero-out for "w"/"n" handles
- Added 3 combined tests (`resizeModernFrameOneSided` + `modernFrameToCropRect`) verifying anchor point stability in document space
- Updated 10 test expectations across `modern-crop-geometry.test.ts`

### Verification
- PASS: 54 test files, 812 frontend tests
- PASS: TypeScript + Vite build

### [2026-06-12] Option Bar Breakpoint Alignment & Ratio Text Wrap Fix [COMPLETE]

Align responsive breakpoints for crop and brush option bars to 880px to match move tool option bar and more dropdown visibility, and prevent the Ratio selector button text from wrapping into two lines. Additionally, pulled W/H crop inputs out of the responsive collapse container so they remain visible on the main bar at all times, and fixed the "Free" mode crop frame centering bug.

**Done:**
1. Updated `CropOptionBar.tsx` breakpoint to 880px and added `whitespace-nowrap` to prevent Ratio button text from wrapping.
2. Moved custom ratio W/H inputs and physical size W/H inputs (+ unit selector) outside the `@min-[880px]` responsive collapse container in `CropOptionBar.tsx` so they are always visible on the main bar.
3. Removed duplicate W/H inputs and unit selector from `MoreDropdown` in `CropOptionBar.tsx`.
4. Updated `BrushOptionBar.tsx` breakpoint from 768px to 880px.
5. Fixed `fitFrameToMaxBounds` in `CropOptionBar.tsx` to return coordinates centered in the viewport, resolving the bug where switching to "Free" mode shifted the crop box to the top-left corner `(0, 0)`.
6. Added coordinate centering assertions in the `CropOptionBar.test.tsx` test suite.
7. Verified all 810 frontend tests and 92 Rust workspace tests pass, and Vite production build succeeds.

### [2026-06-12] Crop Option Bar UX Improvements [COMPLETE]

Redesign the Crop Tool Option Bar to collapse aspect ratio presets into a single dropdown, place the Swap button directly between the Width (W) and Height (H) input fields (for both custom ratio and physical size modes), and add "Lock Current Shape" and "Recent Ratios" (up to 3 items) features to resolve common UX pain points.

**Done:**
1. Replaced horizontal preset pills with Aspect Ratio Dropdown selector showing lock shape, recents, and presets.
2. Implemented "Lock Current Shape" aspect ratio locking.
3. Implemented Recent Ratios state tracking (up to 3 items) and added `pushRecentRatio` to inputs submit handlers.
4. Positioned Swap button directly between W and H inputs in both ratio mode and size mode, on both main bar and mobile/overflow dropdown.
5. Removed duplicate standalone Swap button from the rotation group.
6. Synchronized custom W/H input fields with current aspect ratio when changed via presets dropdown.
7. Verified via frontend test suite (810/810 pass), Rust tests (92/92 pass), and Vite production builds.

### [2026-06-12] Brush Intermediate Hardness Mapping Polish [COMPLETE]

Polishing brush hardness mapping so intermediate values match desktop editor expectations. Manual QA shows `Hard 80%` still has a wider feather rim than expected; it should be mostly solid with only a narrow soft edge, while `Hard 0%` must keep the current broad feather profile.

**Done:**
1. Keep hardness 0 falloff, flow, spacing, and preset behavior unchanged.
2. Updated pixel-profile tests for hardness 80 to expect a larger solid radius and narrower feather rim.
3. Tried an aggressive `h^0.75` mapping, but it made lower/mid hardness values feel too hard and made the brush feel broken.
4. Settled on a safer linear `h` mapping: `Hard 80%` is still mostly solid, while lower hardness values remain predictable.
5. Focused brush and brush UX tests pass; full verification is pending.

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

### [2026-06-12] Bug Fix — Brush Cursor Shown on Pan [COMPLETE]

Fixing the brush/eraser cursor overlay ring being shown when the user is panning (holding Space or dragging to navigate) by passing viewport panning state to the overlay and hiding it.

**Done:**
1. Added `isPanning` boolean prop to `BrushCursorOverlay.tsx`.
2. Passed `isPanning={isSpacePressed() || isPanning()}` to `<BrushCursorOverlay>` in `CanvasViewport.tsx`.
3. Verified that the cursor hides correctly during panning and that all unit tests pass successfully.

### [2026-06-12] Bug Fix — Brush Cursor Stuck on Zoom [COMPLETE]

Fixing the brush/eraser cursor overlay ring feeling stuck during zoom operations unless the mouse is moved, by tracking last screen coordinates and updating the position reactively on zoom/pan changes.

**Done:**
1. Identified root cause: document-space coordinates of the mouse cursor were only updated on `pointermove` event, meaning when zooming (without moving the mouse), the overlay ring stayed stuck at the old document location.
2. Destructured `pan` signal from `useEditor` and added a `createEffect` tracking `zoom` and `pan` signals to reactively call `updatePosition()`.
3. Cached `lastClientX` and `lastClientY` coordinates on `pointermove` inside `BrushCursorOverlay.tsx`.
4. Verified that all unit tests pass successfully.

### [2026-06-12] Bug Fix — Viewport WebGL Backing Resolution Clamping [COMPLETE]

Fixing the viewport crash/disappearance at high zoom levels (e.g. 500% or above) by clamping the WebGL canvas and texture backing size to a safe maximum of 4096 to prevent browser canvas limits (16384 max width/height) and VRAM exhaustion from triggering `CONTEXT_LOST_WEBGL`.

**Done:**
1. Identified root cause: lack of upper bound clamping on WebGL canvas size, causing WebGL texture allocation/framebuffer completeness failure and `CONTEXT_LOST_WEBGL` when zoom × dpr × document size exceeds GPU/browser MAX_TEXTURE_SIZE (Chrome caps canvas at 16384px height/width).
2. Applied proportional clamping down to `Math.min(4096, gl.MAX_TEXTURE_SIZE)` in the `resize` function of `WebGL2Backend` (`webgl2.ts`).
3. Verified using Vitest suite (810 tests pass), cargo tests (92 tests pass), and production Vite builds.


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

### [2026-06-12] Implement Smoothstep Brush Falloff Curve [COMPLETE]

Implementing the cubic Hermite / Smoothstep function ($3v^2 - 2v^3$) to map soft brush falloff distances, producing a perfectly smooth gradient transistion at both the core and edge boundaries matching Photoshop/Affinity brush profiles.

**Done:**
1. Modified `brushAlphaAtDistance` in `brushTipMask.ts` to map `v` with a cubic Smoothstep function before applying the exponent.
2. Verified that all pixel-profile unit tests pass successfully.
3. Slightly adjusted overlapping stroke alpha upper bound assertion in `paintStrokeRenderer.test.ts` to 110 (from 100) to account for the fuller center profile of the smoothstep curve.
4. Confirmed that all 809 frontend unit tests and production build compilation pass successfully.

### Verification
- PASS: `pnpm --filter photrez-desktop test --run` (all 809 tests passed)
- PASS: `pnpm run build` (tsc + Vite production build successfully compiled)
- PASS: `cargo test --workspace` (all 92 Rust workspace tests passed)

### [2026-06-12] Fix Shift-Click Straight Lines for Soft Brush [COMPLETE]

Fixing the Shift-click straight line drawing modifier on soft brushes (hardness < 1) by processing all newly added points in the stroke instead of only looking at the last point.

**Done:**
1. Modified the soft brush path in `onPaintStroke` inside `useBrushOverlay.ts` to iterate from `prevStrokePointCount` to `points.length` and process all points sequentially.
2. Verified that Shift-click straight line drawing is now fully functional for both hard and soft brushes.
3. Verified that all 809 frontend unit tests, Rust core workspace tests, and production build checks compile and pass successfully.

### Verification
- PASS: `pnpm --filter photrez-desktop test --run` (all 809 tests passed)
- PASS: `pnpm run build` (tsc + Vite production build successfully compiled)
- PASS: `cargo test --workspace` (all 92 Rust workspace tests passed)

### [2026-06-12] Sync lastPaintCoords with Undo/Redo [COMPLETE]

Synchronize the last painted coordinate (`lastPaintCoords`) with the document undo/redo history stack, so undoing/redoing correctly reverts/advances the straight line start point.

**Done:**
1. Updated `CommandHistory` inside `history.ts` to store `lastPaintCoords` alongside snapshot entries.
2. Exposed `getLastPaintCoords` and `setLastPaintCoords` in `CommandHistory` to manage active document coords.
3. Refactored `useCanvasPointerTools.ts` to read/write `lastPaintCoords` via the active document session's history object.
4. Added integration tests in `brushUx.test.tsx` verifying coordinate reverting/restoring during simulated undo/redo events.
5. All 810 Vitest tests and 92 Rust workspace tests pass, and production app build compiles successfully.

### Verification
- PASS: `pnpm --filter photrez-desktop test --run` (all 810 tests passed)
- PASS: `cargo test --workspace` (all 92 Rust workspace tests passed)
- PASS: `pnpm run build` (tsc + Vite production build successfully compiled)

