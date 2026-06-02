# Enhanced Crop Tool — Design Spec

**Date:** 2026-06-02
**Status:** Draft
**Scope:** MVP (Phase 1)
**Approach:** 2 (Photoshop-like Enhanced Rectangular Crop)

## Goal

Replace the current bare-bones crop tool (display-only W/H, APPLY CROP button) with a Photoshop-grade Enhanced Crop Tool: interactive crop box with 8 resize handles + move inside, ratio/size/free modes, live guides, and Enter/Esc apply/cancel — all without requiring a Rust core or wgpu renderer.

## Problem

MVP crop tool is unusable for professional editing:

- Crop area is defined only by canvas-wide drag — no resize handles, no fine-tuning after creation.
- `handlePointerUp` in `input-handler.ts` has **no crop finalization branch** (`isDragging = false` but nothing happens to the crop rect).
- `prepareToolContext()` does not wire `onCropCreated`, so `cropRect` never receives drag-created rect.
- Option Bar displays `cropW`/`cropH` signals that are initialized to engine dimensions and never sync with the drawn crop rect.
- `engine.cropCanvas(0, 0, cropW(), cropH())` crops from origin, ignoring the user's drawn rectangle.
- No keyboard shortcuts (Enter/Esc), no guide overlay customization, no ratio/size locking.
- No visual shield with cutout — just a white outline on transparent overlay.

## Non-Goals (Phase 1)

- **Rotate / straighten** the crop box independently of the document axes (Phase 2).
- **Perspective crop** (4-corner perspective warp — explicitly deferred to future scope).
- **Content-aware crop fill** (generative fill of void areas).
- Non-destructive crop history (crop is destructive, delete-cropped-pixels toggle commits permanently).
- Multi-layer crop (crop applies to the whole document canvas, not individual layers).
- Golden spiral / composition overlay guides (Phase 2 aesthetic enhancement).

## Target Behavior

### State Model

Single source of truth in `CanvasViewport.tsx` (or extracted `usePointerCrop` hook):

```ts
// Current signals to repurpose:
const [cropRect, setCropRect] = createSignal<{ x: number; y: number; w: number; h: number } | null>(null);
const [cropGuideMode, setCropGuideMode] = createSignal<"none" | "thirds" | "grid" | "diagonal" | "golden">("none");

// New signals to add:
const [cropMode, setCropMode] = createSignal<"free" | "ratio" | "size">("free");
const [cropAspect, setCropAspect] = createSignal<{ w: number; h: number } | null>(null); // ratio lock
const [cropSizeTarget, setCropSizeTarget] = createSignal<{ w: number; h: number } | null>(null); // size mode target
const [cropDeletePixels, setCropDeletePixels] = createSignal(true); // default ON
const [cropIsActive, setCropIsActive] = createSignal(false); // whether we're in crop interaction

// Crop drag interaction state (could extract to usePointerCrop):
// dragStart, dragCurrent, resizeHandle, isDragging
```

### Interaction Model

#### Creating the Crop Box

1. User activates Crop Tool (icon, or `C` key).
2. Canvas enters crop mode: `cropIsActive = true`.
3. If a previous crop rect exists from a prior crop session (not yet committed or cancelled), it is restored as the initial rect.
4. Default initial crop rect = full document bounds (entire canvas).
5. User can drag anywhere on canvas to create a new crop rect.
6. During drag, the crop rect is drawn in real-time via existing `onCropCreated` callback.
7. On pointer-up, the crop rect is finalized as the current `cropRect`.

#### Resizing the Crop Box (After Creation)

After the initial drag, the crop box shows 8 handles (4 corners + 4 edges):

- **Corner handles**: resize along both axes simultaneously.
  - Shift+drag corner: free (non-proportional) resize.
  - Default (no Shift): proportional resize maintaining aspect ratio (if `cropMode` is "free", default to proportional like Photoshop's crop tool; if "ratio" mode, locked to ratio; if "size" mode, resize changes W/H that must match target size).
- **Edge handles**: resize one axis only.
- **Alt+drag any handle**: resize from center point (opposite edge anchored).

#### Moving the Crop Box

- Click and drag inside the crop box (but not on a handle) to move the entire crop region.
- Box cannot be moved outside document bounds; edges clamp to `[0, 0, docW, docH]`.

#### Applying / Cancelling

- **Enter** key: apply crop. Destructive operation. Commits history entry, resizes canvas, exits crop mode.
- **Esc** key: cancel crop. Clears `cropRect`, exits crop mode, reverts to move tool.
- **Apply button** in Option Bar: same as Enter.
- **Cancel button** in Option Bar: same as Esc.

#### Modifier Keys During Resize/Move

| Modifier | Effect |
|----------|--------|
| Shift | Corner resize: free (non-proportional). Move: constrain to 45° axis. |
| Alt | Resize from center. |
| (none) | Corner resize: proportional (aspect-locked). |

### Visual Design

The crop overlay is drawn as an SVG layer over the canvas (extending the current `CropOverlay.tsx`).

```
┌─────────────────────────────────────────┐
│  ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░  │  ← shield (50% black)
│  ░░  ┌──────────────┬───────────┐  ░░  │
│  ░░  │◢             │           │◣ ░░  │  ← white border + corner brackets
│  ░░  │ ─ ─ ─ ─ ─ ─ ┼ ─ ─ ─ ─ ─ │ ░░  │  ← guide lines (thirds shown)
│  ░░  │              │           │ ░░  │
│  ░░  ├──────────────┼───────────┤ ░░  │
│  ░░  │              │           │ ░░  │
│  ░░  │ ─ ─ ─ ─ ─ ─ ┼ ─ ─ ─ ─ ─ │ ░░  │
│  ░░  │◥             │           │◤ ░░  │
│  ░░  └──────────────┴───────────┘ ░░  │
│  ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░  │
└─────────────────────────────────────────┘
```

#### Shield

- Dark semi-transparent overlay covering the entire canvas *outside* the crop rect.
- Opacity: `rgba(0,0,0,0.5)` — same as current.
- The cutout is achieved via an SVG `<mask>` with a white full-canvas rect and a black crop-rect hole (inverted).
- Alternatively: two `<rect>` elements with `clip-path` or `<path>` with `fill-rule="evenodd"`.

#### Border

- 1px white stroke on the crop rect outline, `vector-effect="non-scaling-stroke"`.
- Subtle outer shadow for depth: `filter="drop-shadow(0 0 4px rgba(0,0,0,0.5))"`.

#### Handles (8)

- **Corner handles** (`nw`, `ne`, `se`, `sw`): 8×8 px white-filled squares with 1px border.
- **Edge handles** (`n`, `e`, `s`, `w`): 8×8 px white-filled squares.
- Render as `<rect>` elements positioned at crop rect corners and edge midpoints.
- Size in SVG space: `8 / zoom` to appear constant on screen.
- `vector-effect="non-scaling-stroke"` if using stroke, or compute size in document-space.
- Handle hover: light gray fill (`rgba(255,255,255,0.7)`).
- Handle active (during drag): amber fill (`#E15A17`).

#### Corner Brackets (Hit Zone Enhancement)

- Visual: small L-shaped brackets extending ~12px outside each corner, white 1px stroke.
- Functional: these extend the interactive hit zone for corner handles, matching Photoshop behavior.
- Hit zone: `16 / zoom` px around each handle center.

#### Guide Overlay

Guide lines drawn inside the crop rect, matching `cropGuideMode`:

| Mode | Visual |
|------|--------|
| `none` | No guide lines |
| `thirds` | 2 vertical + 2 horizontal lines dividing rect into 9 equal zones, `rgba(255,255,255,0.35)` 1px |
| `grid` | Grid dividing rect into equal cells (~64px cells or configurable), `rgba(255,255,255,0.2)` 0.5px |
| `diagonal` | 2 diagonal lines connecting opposite corners, `rgba(255,255,255,0.2)` 0.5px |
| `golden` | Golden ratio spiral overlay, `rgba(255,255,255,0.2)` 0.5px |

> **Note:** Current code already has `"grid" | "diagonal" | "golden"` in the signal type, but CropOverlay only renders `thirds`. The new overlay must implement all 5 modes.

#### Live Dimension Tooltip

During resize/move, a small overlay near the cursor shows:
```
1920 × 1280 px
```

- Font: `9px` monospace, white text on `rgba(0,0,0,0.6)` background.
- `pointer-events: none`, positioned near the cursor.
- Fades out ~1.5s after pointer-up.
- Also shown when hovering the crop box without dragging (tooltip style).

### Option Bar

Option bar crop section is redesigned from the current display-only W/H fields to full interactive controls:

```
[Free ▼] [W: ____] [H: ____] [↔] [Guides: Thirds ▼] [🗑 Delete] [Reset] [Cancel] [APPLY]
```

#### Mode Selector

Dropdown to select crop mode:
- **Free** — no constraints on aspect ratio or size.
- **Ratio** — locks aspect ratio to a user-selectable ratio (e.g., 1:1, 3:2, 4:3, 16:9, Custom).
  - When "Custom" selected in Ratio mode, the W/H fields become editable ratio fields.
  - The crop rect maintains the aspect ratio during resize.
- **Size** — locks to exact W×H target. If the crop rect W/H does not match, scale to fit.
  - When "Size" mode selected, change W/H fields to editable target dimensions.
  - On Enter/blur of W/H in Size mode, recalculate crop rect to match target size (scale proportionally if needed, centered).

Default mode: **Free**.

#### W / H Fields

- In **Free** mode: display current crop rect dimensions (read-only, matching Photoshop's crop info display).
- In **Ratio** mode: editable fields for custom ratio (e.g., set W=16, H=9 to lock to 16:9).
- In **Size** mode: editable fields for target dimensions in px.

All fields show value + `px` suffix.

#### Swap Button (↔)

- Swaps the W and H values of the current crop rect (or ratio, or target size depending on mode).
- Immediate effect on the crop rect: width ↔ height.
- If current crop rect is not square, this flips orientation.

#### Guide Dropdown

`<select>` or custom dropdown:
- None, Thirds, Grid, Diagonal, Golden.
- Default: Thirds.
- Updates `cropGuideMode` signal immediately.

#### Delete Cropped Pixels Toggle

- `ToggleBtn` component (matching ToggleBtn style used for Auto Select / Snap in Move Tool).
- Icon: trash/garbage can icon.
- Label: "Delete".
- Default: ON.
- When ON: crop is destructive (pixels outside crop rect are permanently removed).
- When OFF: crop becomes non-destructive (canvas size changes but pixels are retained? — **blocker**: engine `cropCanvas()` is currently destructive only. MVP limitation: toggle reflects the engine's capability. If OFF, the apply behavior should still be destructive (same engine behavior) but the toggle provides the UX skeleton for future non-destructive mode. Document this clearly.)

> **MVP reality:** `cropCanvas()` is always destructive. The toggle sets intent for future non-destructive crop but both states call the same engine method for now. UI label should be clear: when toggle is visible but engine only supports destructive, show a subtle note or accept the limitation.

#### Reset Button

- Resets `cropRect` to full document bounds `{ x: 0, y: 0, w: docW, h: docH }`.
- Does NOT exit crop mode.

#### Cancel Button

- Same as Escape: clears `cropRect`, exits crop mode, switches to Move tool.

#### Apply Button

- Same as Enter: commits the crop, exits crop mode, switches to Move tool.

### Keyboard Shortcuts

| Key | Action |
|-----|--------|
| **Enter** | Apply crop (commit) |
| **Esc** | Cancel crop |
| **C** | Activate Crop Tool (if toolbar shortcut — TBD per tool panel) |
| Shift+drag (corner) | Free resize (non-proportional) |
| Shift+drag (move) | Constrain move to 45° axis |
| Alt+drag (resize) | Resize from center |
| Arrows | Nudge crop rect 1px (or 10px with Shift) |

### Guide Modes Rendering Detail

#### Thirds
2 vertical lines at ⅓ and ⅔ width, 2 horizontal at ⅓ and ⅔ height. Current implementation is correct; keep as-is.

#### Grid
Calculate optimal cell size: find `ceil(sqrt(w*h / 4096))` as approximate row/col count, then compute regular intervals. Render all lines. Minimum spacing 32px.

#### Diagonal
Two lines: from `(x, y)` to `(x+w, y+h)` and from `(x+w, y)` to `(x, y+h)`.

#### Golden
Single spiral overlay approximated by ¼ circle arcs at golden ratio points:
- First vertical line at `w * 0.382` from one edge.
- First horizontal line at `h * 0.382` from corresponding edge.
- Render as thin white arcs (`rgba(255,255,255,0.15)`).

### Delete Cropped Pixels UX Detail

Toggle default ON aligns with current engine behavior (destructive only). When toggle is ON:
- Apply calls `engine.cropCanvas(x, y, w, h)`.
- After crop, the document becomes the new cropped size; layers are offset by `-x, -y`.

When toggle is OFF (future, currently same behavior):
- Same destructive crop.
- The toggle visually toggles but behavior is identical.
- This is marked as **known limitation** in the spec.

### Files to Modify / Create

#### Modified

1. **`apps/desktop/src/components/editor/CropOverlay.tsx`**
   - Rewrite from 30-line placeholder to full interactive SVG overlay.
   - Import `createSignal`, `createEffect`, `onCleanup` from Solid.
   - Add handle rendering (8 handle rects).
   - Add pointer event handlers for resize + move drag.
   - Implement guide overlay for all 5 modes (currently only thirds).
   - Add shield mask with cutout (replace the current two-<rect> approach).
   - Add dimension tooltip.
   - Emit `onCropRectChange` callback for parent sync.
   - Props:
     ```ts
     interface CropOverlayProps {
       cropRect: { x: number; y: number; w: number; h: number } | null;
       guideMode: "none" | "thirds" | "grid" | "diagonal" | "golden";
       canvasWidth: number;
       canvasHeight: number;
       zoom: number;
       cropMode: "free" | "ratio" | "size";
       cropAspect: { w: number; h: number } | null;
       onCropRectChange: (rect: { x: number; y: number; w: number; h: number }) => void;
     }
     ```

2. **`apps/desktop/src/components/editor/OptionBar.tsx`**
   - Replace display-only W/H + APPLY CROP button with full interactive controls:
     - Mode dropdown (Free / Ratio / Size).
     - W/H editable fields (behavior depends on mode).
     - Swap button.
     - Guide dropdown.
     - Delete cropped pixels toggle.
     - Reset / Cancel / Apply buttons.
   - Wire to `EditorContext` signals: `cropMode`, `cropGuideMode`, `cropDeletePixels`, `cropAspect`.

3. **`apps/desktop/src/viewport/input-handler.ts`**
   - `handlePointerUp`: add `tool === "crop"` branch.
     - If `w > 2 && h > 2`: set crop rect (finalize).
     - Else: reset crop rect to full document bounds or clear.
     - Currently no branch exists — pointer-up does nothing for crop.
   - Consider: `handlePointerDown` with crop + existing rect: should initiate resize if pointer on handle, move if inside rect, or new rect if outside.

4. **`apps/desktop/src/components/editor/CanvasViewport.tsx`**
   - Add new signals: `cropMode`, `cropAspect`, `cropDeletePixels`.
   - Wire `prepareToolContext` to set `interactiveState.onCropCreated`.
   - Wire `onCropRectChange` from `CropOverlay`.
   - Pass new props to `CropOverlay` (zoom, cropMode, cropAspect, onCropRectChange).
   - Wire Option Bar signal setters.
   - Add keyboard handler for Enter (apply) / Esc (cancel) when crop is active.

5. **`apps/desktop/src/components/editor/EditorContext.tsx`**
   - Add signals: `cropMode`, `cropGuideMode`, `cropDeletePixels`, `cropAspect`, `cropSizeTarget`.

6. **`apps/desktop/src/renderer/shaders.ts` / `webgl2.ts`**
   - No changes needed for Phase 1. Crop is a canvas-level operation, not a shader transform.

#### New Files

7. **`apps/desktop/src/viewport/cropGeometry.ts`** (new)
   - Pure math helpers for crop-specific geometry:
     - `clampCropRect(rect, docW, docH)` — clamp to document bounds.
     - `applyCropResizeHandle(rect, handle, localDx, localDy, aspect)` — adjusted from `transformGeometry.ts` for crop-specific behavior (no rotation, always axis-aligned).
     - `applyCropMove(rect, dx, dy, docW, docH)` — move within bounds.
     - `constrainCropAspect(rect, aspect)` — adjust rect to match aspect ratio.
     - `constrainCropToSize(rect, targetW, targetH)` — scale rect to match exact size.
   - Unit tested separately (see test section).

#### Tests

8. **`apps/desktop/src/__tests__/crop-geometry.test.ts`** (new)
   - Unit tests for `cropGeometry.ts` helpers.

9. **`apps/desktop/src/components/editor/__tests__/CropOverlay.test.ts`** (new)
   - Component tests for crop overlay interaction.

### Implementation Order

1. **`cropGeometry.ts` + tests** — pure math helpers, fully testable without DOM.
2. **`input-handler.ts` crop pointer-up branch** — minimal change, completes the data flow.
3. **`CanvasViewport.tsx` signal wiring** — add new crop signals, wire `prepareToolContext`, wire keyboard Enter/Esc.
4. **`CropOverlay.tsx` rewrite** — full interactive SVG overlay with handles, shield, guides, tooltip.
5. **`OptionBar.tsx` crop section** — replace placeholder with full interactive controls.
6. **`EditorContext.tsx`** — expose new crop signals.

### Tests to Add

| # | Test | Level |
|---|------|-------|
| 1 | `clampCropRect` clamps all edges to document bounds | Unit |
| 2 | `applyCropResizeHandle` corner SE increases w/h proportionally | Unit |
| 3 | `applyCropResizeHandle` edge S only changes h | Unit |
| 4 | `applyCropResizeHandle` corner with aspect ratio lock | Unit |
| 5 | `applyCropResizeHandle` Alt+corner resizes from center | Unit |
| 6 | `applyCropResizeHandle` Shift+corner does free resize | Unit |
| 7 | `applyCropMove` moves rect within bounds | Unit |
| 8 | `applyCropMove` clamps at document edges | Unit |
| 9 | `constrainCropAspect` adjusts width to match aspect | Unit |
| 10 | `constrainCropToSize` scales rect to target size | Unit |
| 11 | `handlePointerUp` crop branch finalizes rect (input-handler) | Integration |
| 12 | CropOverlay renders shield with cutout | Component |
| 13 | CropOverlay renders guide lines in all 5 modes | Component |
| 14 | CropOverlay handle drag updates crop rect | Component |
| 15 | Enter key applies crop (CanvasViewport keyboard) | Integration |
| 16 | Esc key cancels crop (CanvasViewport keyboard) | Integration |

### Phase 2: Rotate / Straighten (Future)

Specified here for architectural awareness, not implemented in Phase 1:

- Rotate handle: a circle/arc ~20px outside each corner, same pattern as Free Transform.
- Dragging rotate handle rotates the crop box around its center.
- Straighten button in Option Bar: auto-rotate to correct horizon based on image analysis (MVP: manual angle input only).
- Rotated crop rect drawing requires SVG `<g transform="rotate(angle, cx, cy)">` wrapping.
- After rotation, the crop rect is no longer axis-aligned; the effective crop region is the axis-aligned bounding box of the rotated rect.
- `engine.cropCanvas()` remains axis-aligned even for rotated crops — we compute the AABB of the rotated rect and crop to that.

**Not started in Phase 1.** No code changes for rotate.

### Pain Points & Remedies

| Current Pain Point | Remedy |
|---|---|
| Crop rect can only be created via initial drag, no post-creation adjustments | 8 handles + move inside box |
| No visual shield | SVG mask cutout with 50% opacity outside |
| Keyboard shortcuts absent | Enter apply, Esc cancel |
| W/H fields display engine size not drawn rect | Sync W/H from `cropRect`, not `cropW`/`cropH` signals |
| `handlePointerUp` does nothing for crop | Add crop finalization branch |
| Option Bar looks like web form | Desktop-native controls (ToggleBtn, dropdowns with same 11px styling) |
| Only 1 guide mode implemented | All 5 modes rendered |
| No dimension feedback during interaction | Live tooltip on resize/move |
