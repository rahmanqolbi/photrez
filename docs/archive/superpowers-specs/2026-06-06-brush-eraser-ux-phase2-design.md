# Phase 2: Brush/Eraser Tool UX

Date: 2026-06-06

## Overview

Upgrade Brush and Eraser from barebones (size/hardness/strength only) to a compact but useful tool UX with flow, smoothing, presets, keyboard shortcuts, and a right-click context menu.

## Scope

- Enhanced option bar (flow, smoothing, preset dropdown)
- Right-click context menu on canvas
- Keyboard shortcuts (`[`/`]` for size, Shift+`[`/`]` for hardness)
- Brush presets (Hard Round, Soft Round, Detail, Large Soft, Hard Eraser, Soft Eraser)
- Weighted moving average smoothing engine

**Out of scope:**
- Delayed/lagging stabilizer (future phase)
- User-savable presets (future phase)
- Temp-mask flow accumulation (future phase)

---

## 1. Data Model Changes

### PaintToolSettings (brushToolState.ts)

```ts
export interface PaintToolSettings {
  size: number;
  hardness: number;
  opacity: number;
  flow: number;        // 0-1 — per-dab alpha multiplier (effectiveAlpha = opacity * flow)
  smoothing: number;   // 0-100 — weighted moving average window strength
}
```

### PaintToolState (brushToolState.ts)

```ts
export interface PaintToolState {
  brushSize: number;
  brushHardness: number;
  brushOpacity: number;
  brushFlow: number;
  brushSmoothing: number;
  eraserSize: number;
  eraserHardness: number;
  eraserOpacity: number;
  eraserFlow: number;
  eraserSmoothing: number;
}
```

### Preset tracking in editor state

Add to `editorState.ts` and `EditorContext.tsx`:

```ts
brushPresetId: Accessor<string | null>;
setBrushPresetId: Setter<string | null>;
eraserPresetId: Accessor<string | null>;
setEraserPresetId: Setter<string | null>;
```

- Applying a preset sets the matching `brushPresetId` or `eraserPresetId`, plus all size/hardness/opacity/flow/smoothing values.
- Any manual edit to size, hardness, strength, flow, or smoothing clears the matching preset id to `null` (shows "Custom").
- Brush and eraser preset ids are fully independent.

### New functions

```ts
applyPaintPreset(
  preset: BrushPreset,
  targetTool: PaintTool,
  state: PaintToolState
): Partial<PaintToolState>

adjustPaintHardness(
  tool: string,
  state: PaintToolState,
  delta: number
): Pick<PaintToolState, "brushHardness" | "eraserHardness">
```

### Presets

```ts
export interface BrushPreset {
  id: string;
  name: string;
  size: number;
  hardness: number;
  opacity: number;
  flow: number;
  smoothing: number;
  tool: "brush" | "eraser" | "both";
}

export const BRUSH_PRESETS: BrushPreset[] = [
  { id: "hard-round",     name: "Hard Round",   size: 20,  hardness: 1.0, opacity: 1.0, flow: 1.0, smoothing: 0,  tool: "both" },
  { id: "soft-round",     name: "Soft Round",   size: 40,  hardness: 0.3, opacity: 1.0, flow: 1.0, smoothing: 0,  tool: "both" },
  { id: "detail",         name: "Detail",        size: 5,   hardness: 0.8, opacity: 1.0, flow: 1.0, smoothing: 10, tool: "both" },
  { id: "large-soft",     name: "Large Soft",    size: 100, hardness: 0.2, opacity: 0.8, flow: 0.8, smoothing: 0,  tool: "both" },
  { id: "hard-eraser",    name: "Hard Eraser",   size: 30,  hardness: 1.0, opacity: 1.0, flow: 1.0, smoothing: 0,  tool: "eraser" },
  { id: "soft-eraser",    name: "Soft Eraser",   size: 50,  hardness: 0.3, opacity: 1.0, flow: 1.0, smoothing: 0,  tool: "eraser" },
];
```

---

## 2. Smoothing Engine (paintSmoothing.ts)

### smoothingToWindowSize

Maps smoothing value 0–100 to window size:

| Smoothing | Window Size | Behavior |
|-----------|-------------|----------|
| 0         | 1           | Passthrough (no smoothing) |
| 1–30      | 2–3         | Subtle |
| 31–70     | 4–6         | Medium |
| 71–100    | 7–10        | Strong |

Linear interpolation within each range.

### PaintSmoother class

```ts
class PaintSmoother {
  constructor()
  reset(): void
  addPoint(x: number, y: number): { x: number; y: number }
}
```

- Maintains a circular buffer of up to 10 raw points.
- `addPoint` computes weighted average: each point's weight = `decay^(position_from_newest)`, normalized.
- `reset()` clears the buffer. Called on:
  - `pointerdown` (stroke start)
  - `pointercancel` (browser cancellation)
  - `lostpointercapture` (capture stolen)
  - Tool change (brush ←→ eraser ←→ other)
  - Document change (active document switches)

### Integration

In `useCanvasPointerTools.ts`:
- Instantiate a single `PaintSmoother` per viewport.
- On `onCanvasPointerDown`: call `smoother.reset()`, then `smoother.addPoint()` for the initial point before adding to `interactiveState.strokePoints`.
- On `onCanvasPointerMove`: pipe through `smoother.addPoint()` before adding the point to `interactiveState.strokePoints` / before the paint path calls `onPaintStroke`.
- On `onCanvasPointerUp`: pipe through `smoother.addPoint()` for the final point.

### CanvasViewport cleanup

`CanvasViewport` must add both `onPointerCancel` and `onLostPointerCapture` handlers on the canvas element for paint cleanup. These handlers must:
- commit any partial brush stroke
- call `smoother.reset()`

`useCanvasPointerTools` should return `onCanvasPointerCancel` and `onCanvasLostPointerCapture` handlers (same pattern as `onCanvasPointerDown/Move/Up`). `CanvasViewport` wires these into the canvas element's `onPointerCancel` and `onLostPointerCapture` props. The smoother instance lives inside `useCanvasPointerTools`, so its `reset()` is called directly — no cross-component ref needed.

---

## 3. Flow Semantics

Per-dab alpha multiplier, no accumulation tracking:

```
effectiveAlpha = opacity * flow
```

At flow=1.0, each dab is rendered at full opacity as before.
At flow=0.3, each dab is rendered at 30% of the set opacity value.
Overlapping dabs may accumulate naturally through Canvas 2D `globalCompositeOperation = "source-over"`.

No temp mask, no single-composite pipeline — deferred to future phase if natural accumulation is insufficient.

---

## 4. Option Bar (BrushOptionBar.tsx)

| Control | Type | Range | Default | Notes |
|---|---|---|---|---|
| Size | Number input | 1–500 | 20/32 | Existing |
| Hardness | Number input | 0–100% | 80%/100% | Existing |
| Strength | Number input | 0–100% | 100% | Existing; now labeled "Strength" |
| Flow | Number input | 0–100% | 100% | New control |
| Smoothing | Number input | 0–100 | 0 | New control |
| Preset | Dropdown | — | — | Compact dropdown showing current preset name or "Custom" |
| Hard 100 | Button | — | — | Eraser-only, existing |

### Preset dropdown

A small button/label showing the active paint tool's preset name or "Custom". On click, opens a brief popdown list below the button. Selecting a preset calls `applyPaintPreset()` and sets the active `brushPresetId` or `eraserPresetId`. Clicking outside the popdown closes it.

---

## 5. Right-click Context Menu (BrushContextMenu.tsx)

### Open conditions
- Active tool is "brush" or "eraser"
- Right-click (`auxclick` with button=2 or `contextmenu` event) on canvas area
- Space is NOT pressed (no context menu while panning)

### Close conditions
- Outside click
- Escape key
- Tool switch
- Document switch
- Pan start (Space pressed)
- Preset selection

### Layout

Floating panel positioned near cursor, clamped to viewport bounds. Contains:

1. **Sliders** (three range inputs):
   - Size: 1–500, display current value
   - Hardness: 0–100%
   - Strength: 0–100%

Flow and Smoothing are intentionally excluded from the right-click menu for Phase 2. The menu targets the three fastest, most frequently adjusted controls. Flow and Smoothing are set-and-forget for most users and remain accessible in the option bar.

2. **Preset buttons** (6 buttons, 2×3 grid):
   - Hard Round, Soft Round, Detail, Large Soft, Hard Eraser, Soft Eraser
   - Each button: preset name, small size
   - Active preset (if matching) is highlighted

3. **Reset button**: reverts brush to defaults (size=20, hardness=80%, opacity=100%, flow=100%, smoothing=0) or eraser to defaults (size=32, hardness=100%, opacity=100%, flow=100%, smoothing=0)

### No-paint guarantee
Right-click must NOT:
- Paint or erase any pixels
- Commit a history entry
- Add stroke points to the paint buffer
- Trigger `pointerdown` → `handlePointerDown` for brush tools

### Global contextmenu guard

The app already prevents native context menus globally (typically via `document.addEventListener("contextmenu", (e) => e.preventDefault())`). The Brush/Eraser context menu must use the canvas container's `contextmenu` event to open the menu. The handler must call `event.preventDefault()` before opening the floating menu, making the behavior self-contained and robust even if the global guard changes.

Additionally, ensure `onCanvasPointerDown` does not fire for right-clicks by checking `e.button === 2` and returning early. This prevents the brush stroke system from seeing right-click as the start of a stroke.

---

## 6. Keyboard Shortcuts

Add to the existing `useCanvasKeyboard.ts` handler (where paint tool shortcuts already live).

| Shortcut | Action |
|----------|--------|
| `[` | Decrease size by 5 (clamped to MIN_PAINT_SIZE) |
| `]` | Increase size by 5 (clamped to MAX_PAINT_SIZE) |
| Shift + `[` | Decrease hardness by 10% (clamped to 0) |
| Shift + `]` | Increase hardness by 10% (clamped to 100%) |

Active tool must be "brush" or "eraser". Skip if focus is in an INPUT or TEXTAREA.

---

## 7. Brush Cursor

No changes needed. The cursor already reads `paintToolSettings` reactively and updates live when sliders move. The right-click menu sliders will update the same signals, so the cursor updates automatically.

---

## 8. Flow in Stroke Rendering

Target: `renderPaintStrokeToContext()` in `paintStrokeRenderer.ts`.

The dab composition loop already renders with `globalAlpha`. Currently the alpha passed is `opacity`. Change to `opacity * flow`:

```ts
const dabAlpha = settings.opacity * settings.flow;
ctx.globalAlpha = dabAlpha;
```

At flow=1.0, each dab is rendered at full opacity (existing behavior). At flow<1.0, each dab is rendered at a fraction of the set opacity. No accumulation tracking logic is added — overlapping dabs naturally accumulate through Canvas compositing.

---

## 9. Test Plan

### paintSmoothing.test.ts (new)
- `smoothingToWindowSize(0) returns 1`
- `smoothingToWindowSize(15) returns 2`
- `smoothingToWindowSize(50) returns 5`
- `smoothingToWindowSize(85) returns 8`
- `smoothingToWindowSize(100) returns 10`
- `addPoint with windowSize=1 returns identical point`
- `addPoint with windowSize>1 returns averaged point`
- `reset clears buffer`
- `addPoint multiple points with high smoothing converges`

### BrushOptionBar.test.ts (updated)
- Flow input renders and updates signal
- Smoothing input renders and updates signal
- Preset dropdown renders current preset name
- Preset selection applies values and sets brushPresetId
- Manual size edit clears brushPresetId to null (shows "Custom")
- Manual hardness edit clears brushPresetId to null
- Manual strength edit clears brushPresetId to null
- Manual flow edit clears brushPresetId to null
- Manual smoothing edit clears brushPresetId to null
- Brush preset edit does NOT affect eraserPresetId
- Eraser preset edit does NOT affect brushPresetId

### BrushContextMenu.test.ts (new)
- Menu opens on right-click with brush active
- Menu does NOT open on right-click with move tool active
- Menu does NOT open on right-click while Space is held
- Size slider updates brush size signal
- Hardness slider updates brush hardness signal
- Strength slider updates brush opacity signal
- Preset button applies preset values
- Menu closes on Escape
- Menu closes on outside click
- Menu closes on tool switch
- Reset button reverts to defaults

### CanvasViewport/useCanvasPointerTools (updated)
- `[` decreases brush size by 5
- `]` increases brush size by 5
- Shift+`[` decreases hardness
- Shift+`]` increases hardness
- `[`/`]` ignored when active tool is not brush/eraser
- Right-click does not trigger pointerdown handler (no paint)
- Pointercancel resets smoother buffer
- Lostpointercapture resets smoother buffer

---

## 10. Files Changed/Added

| File | Action |
|------|--------|
| `brushToolState.ts` | Add flow, smoothing, presets, adjustPaintHardness, applyPaintPreset |
| `paintSmoothing.ts` | **New** — PaintSmoother class + smoothingToWindowSize |
| `editorState.ts` | Add flow, smoothing, brushPresetId, eraserPresetId signals |
| `EditorContext.tsx` | Add flow, smoothing, brushPresetId, eraserPresetId to interface |
| `BrushOptionBar.tsx` | Add flow, smoothing inputs + preset dropdown; clear preset id on manual edit |
| `BrushContextMenu.tsx` | **New** — right-click context menu |
| `BrushContextMenu.css` | **New** (or inline styles) |
| `useCanvasKeyboard.ts` | Add `[`/`]` and Shift+`[`/`]` shortcuts |
| `useCanvasPointerTools.ts` | Integrate PaintSmoother, guard right-click |
| `paintStrokeRenderer.ts` | Apply flow multiplier to dab alpha |
| `__tests__/paintSmoothing.test.ts` | **New** |
| `__tests__/BrushContextMenu.test.tsx` | **New** |
| `__tests__/BrushOptionBar.test.tsx` | Updated |

---

## 11. Risks and Blockers

- **Right-click prevention**: Canvas `contextmenu` handler must call `preventDefault()` locally before opening the floating menu, making it self-contained. Must also guard `onCanvasPointerDown` against `e.button === 2` to prevent brush stroke start on right-click.
- **Smoothing correctness**: Weighted average must not drift the stroke position. Using normalized weights ensures the output stays within the convex hull of input points.
- **Flow compositing**: Natural overlap accumulation may not produce visually ideal results at low flow values. Accept for MVP, revisit if feedback indicates poor quality.
