# Ratio Pill Bar — Design Spec

## Overview
Replace the current crop mode selector (Free/Ratio/Size `<select>`) and the separate preset dropdown in Ratio mode with a single pill bar UI in the option bar. The pill bar shows "Free" as the default unrestricted mode and a row of common aspect ratio presets. Clicking a ratio pill auto-switches to Ratio mode and applies the aspect. The pill bar is contextual — hidden in Size mode where W/H dimension inputs take over.

## UX Contract

### Pill Bar Layout
```
[Free | 1:1 | 16:9 | 4:3 | 3:2 | 21:9]
```
- **Free** — Always first, dashed border style. No aspect constraint. Active by default.
- **Ratio pills** — Common presets. Clicking one sets cropAspect and switches to Ratio mode.
- **Active pill** — Highlighted in editor accent color (`bg-editor-accent`).
- **Custom ratio** — A `+` pill at the end expands inline into W:H `EditableNumField` (same as current Custom ratio UX).
- **Overflow** — `overflow-x-auto` with scroll on narrow viewports (matches existing OptionBar pattern).

### Mode Visibility
| Mode | Pill bar visible | W/H fields visible |
|------|-----------------|-------------------|
| Free | Yes (Free active) | No (replaced by pill bar) |
| Ratio | Yes (selected ratio active) | Custom W:H when `+` is expanded |
| Size | No | Yes (W/H `EditableNumField` + unit selector) |

### Interaction
1. **User clicks "Free"** → `setCropMode("free")`, `cropAspect` cleared, existing frame resets to max bounds.
2. **User clicks "16:9"** (currently Free) → `setCropMode("ratio")`, `setCropAspect({ w: 16, h: 9 })`, existing frame resized to match.
3. **User clicks "Free"** (currently in Ratio mode with 16:9) → `setCropMode("free")`, aspect constraint removed.
4. **User clicks "Size"** mode selector (stays as a separate compact widget or moved) → pill bar hidden, W/H fields shown.
5. **Custom ratio** → User clicks `+` pill, W:H inline fields appear below or inline. Submitting calls `setCropAspect` + `setCropFrameToAspect`.

### Existing Frame Behavior
- **No frame exists** (after Escape / fresh tool entry) → Pill selection applies to next drag-create or click.
- **Frame exists** → Pill selection immediately resizes the existing frame to the new aspect (same as current `setCropFrameToAspect`).

### Drag-to-Create Interaction
- During drag-create in Free mode: `Shift` temporarily constrains to 1:1.
- During drag-create with a ratio pill active: drag respects the selected aspect ratio. `Shift` temporarily overrides to 1:1 (same as current behavior).
- `Alt` for center-out drag: orthogonal modifier, no interaction with pill state.

## Implementation

### Files Changed

1. **`CropOptionBar.tsx`** — Main UI change:
   - Replace `cropMode` `<select>` (lines 234-288) with pill bar buttons.
   - Remove the Ratio-mode preset `<select>` + Custom W:H (lines 300-345) — replaced by pill bar + inline Custom expansion.
   - Keep Size mode W/H fields (lines 348-403) — unchanged, shown when pill bar hidden.
   - Add `overflow-x-auto` container for pills.
   - Add `+` pill toggle for Custom ratio inline fields.

2. **`cropPresets.ts`** — Optional update:
   - Add or rearrange presets to match pill bar: `Free`, `1:1`, `16:9`, `4:3`, `3:2`, `21:9`.
   - Keep existing presets for backward compat but front-end exposes only the pill subset + custom.

3. **`__tests__/CropOptionBar.test.tsx`** (if exists) or `__tests__/CanvasViewport.test.tsx`:
   - Click Free pill → no aspect constraint + Free highlighted.
   - Click 16:9 pill → mode changes to ratio + aspect set.
   - Click Free pill while in Ratio mode → mode changes to free.
   - Custom `+` → W:H fields appear → submit → aspect applied.
   - Size mode → pill bar hidden, W/H fields shown.
   - Across mode/tool changes → pill state resets correctly.

4. **`useCanvasPointerTools.ts`** — No changes needed (already reads `cropAspect` / `cropMode` from context; pill bar drives these values).

### No Changes Needed
- `EditorContext.tsx` — `cropMode`, `cropAspect`, etc. already signals.
- `modernCropGeometry.ts` — `setCropFrameToAspect` already works.
- `CanvasViewport.tsx` — No new rendering; frame updates reactively.

## Preset List
| Pill | Value |
|------|-------|
| Free | (none — `cropMode = "free"`) |
| 1:1 | `{ w: 1, h: 1 }` |
| 16:9 | `{ w: 16, h: 9 }` |
| 4:3 | `{ w: 4, h: 3 }` |
| 3:2 | `{ w: 3, h: 2 }` |
| 21:9 | `{ w: 21, h: 9 }` |
| + | Custom W:H inline (falls back to `{ w: 16, h: 9 }` default) |

## Risks
- **Shrinking option bar space**: Pill bar needs ~400px for all pills. Currently the OptionBar scrolls horizontally (`overflow-x-auto`) so this is fine. On narrow viewports, pills scroll.
- **Mode state confusion**: Pill bar merges the Free/Ratio distinction into a single widget. The `cropMode` signal still exists internally — the pill bar just drives it. Free pill = `cropMode("free")`, ratio pill = `cropMode("ratio")`.
- **Existing preset dropdown users**: Users accustomed to the dropdown will adapt quickly since pills are more visible and require fewer clicks.

## Test Plan
| Test | Type |
|------|------|
| Click Free pill → mode = free, no aspect constraint | Integration |
| Click 16:9 pill → mode = ratio, aspect = 16:9, frame resized | Integration |
| Switch Free → 16:9 → Free → state reset correctly | Integration |
| Free mode with Shift+drag → square constraint (existing test) | Integration |
| Click `+` → Custom W:H fields appear → submit → aspect applied | Integration |
| Size mode → pill bar hidden, W/H fields visible | Integration |
| Custom ratio → pill bar appears when switching back to Free/Ratio | Integration |
| Narrow viewport → pills scroll horizontally | Visual |
