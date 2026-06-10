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

### [2026-06-10] Smart Guides (Crop) — Classic [COMPLETE]

Implemented snap to document edges, center, and rule-of-thirds during crop drag-create + cyan dashed snap lines.

**Done:**
1. Added rule-of-thirds targets to `buildCropSnapTargets` in `cropSnap.ts`
2. Fixed `edgesForHandle("new")` to return all 6 edges (was `[]`, no snap during drag-create)
3. Crop snap lines render cyan (#00ffff) with dashed style vs move-tool magenta (#ff00ff)
4. Added optional `color` field to `SnapLine` in `smartGuides.ts`
5. Updated `SmartGuides.tsx` to use `line.color` and dash array for cyan lines
6. Added 3 new tests (rule-of-thirds, "new" handle snap, rule-of-thirds snap + cyan color) — all 8 pass
7. Full test suite: 765 pass (52 files)

**Not in scope:**
- Smart Guides for Modern mode (needs screen→doc coordinate conversion)
- Horizontal center snap target (already worked via `docW/2` and `docH/2`)

### Verification
- PASS: `npx vitest run` (765 tests, 52 files)
- PASS: `pnpm.cmd run build` (tsc + Vite)
