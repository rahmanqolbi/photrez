# AI_CURRENT_TASK.md - Photrez Current Task

---

## Current Tasks [ALL COMPLETE]

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
