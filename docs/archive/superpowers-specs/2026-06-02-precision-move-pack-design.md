# Precision Move Pack — Design Spec

> Improves Move Tool precision and workflow without expanding MVP scope.

## 1. Scope

Add four lightweight capabilities to the Move Tool:

1. **Keyboard nudge** — Arrow keys move layer 1px, Shift+Arrow 10px.
2. **Canvas auto-select** — Click visible layer on canvas to select it.
3. **Minimal transform HUD** — ΔX/ΔY (move), W/H/% (resize), angle (rotate) near cursor during drag.
4. **Snap feedback refinement** — HUD shows `snap` label when snap is active.

All four fit inside the locked MVP "selection + move + basic transform" boundary.

### Out of scope

- Multi-layer transform.
- Rotated edge-to-edge snapping.
- Commit transformed pixels to bitmap.
- Full modal Free Transform with Enter/apply state.
- Numeric transform panel (X/Y/W/H/rotation inputs) — defer.

## 2. Behavior

### 2.1 Keyboard nudge

| Trigger | Effect |
|---------|--------|
| `Arrow{up,down,left,right}` | Move active layer 1 document px |
| `Shift + Arrow` | Move active layer 10 document px |

- Active only when tool is Move Tool.
- Ignored if: no active layer, layer locked, any input/textarea focused, brush/crop/selection drag in progress.
- Nudge does NOT trigger snapping or guide lines — it's explicit precision move.
- History: commit snapshot once on the initial keydown (`!event.repeat`). Holding the key (repeated keydown) does NOT create more history entries, since that would spam the undo stack. The undo stack naturally handles the accumulation.

### 2.2 Canvas auto-select

- Active only when tool is Move Tool.
- On `pointerdown` on canvas (not on existing transform overlay handles):
  - Hit-test layers from topmost z-order down.
  - Hit uses transformed corners (`getLayerCorners`) via point-in-polygon, NOT AABB, so rotated layers feel correct.
  - Skip hidden (`visible === false`) layers.
  - Locked layers can be selected but not dragged — cursor shows `default`.
  - Empty canvas area: keep current selection, do NOT clear. Avoids accidental deselect.
- After auto-select, the selection change is immediate. If the hit layer is unlocked, subsequent `pointermove` continues as a normal move drag.
- No change to Rust/core — only frontend hit-test + active document state.

### 2.3 Transform HUD

Transient overlay near cursor during drag operations in `SelectionTransformOverlay.tsx`:

| Drag mode | Display |
|-----------|---------|
| Move | `ΔX 12  ΔY -4` |
| Resize | `W 240  H 120  120%` |
| Rotate | `15°` |
| Snap active (any mode) | Append `snap` label |

- Position: offset 16px right / 24px below cursor, clamped to viewport bounds.
- Style: Photon Amber accent for labels, low-opacity background, `pointer-events: none`.
- No history, no core change. Purely visual feedback.
- Percent = `(currentScale / 1) * 100` for Resize.
- Units in document-px (not screen-px).

### 2.4 Snap feedback refinement

- `computeSnapAdjustment` already returns `lines[]`.
- When `lines.length > 0`, the HUD appends `snap`.
- No additional line metadata for this batch — simple signal is enough.
- Future: can extend with label like `center`, `left edge` if needed.

## 3. Architecture

### 3.1 File changes

| File | Change |
|------|--------|
| `apps/desktop/src/components/editor/CanvasViewport.tsx` | Add global keydown for Arrow nudge; add pointerdown auto-select logic passing through to existing handlers. |
| `apps/desktop/src/components/editor/SelectionTransformOverlay.tsx` | Expose dragType and dragValues to parent for HUD rendering. |
| `apps/desktop/src/viewport/input-handler.ts` | Possibly expose auto-select helper import. |
| New: `apps/desktop/src/viewport/layerHitTest.ts` | Pure helper: hit-test a point against a layer's transformed geometry (point-in-polygon). |
| New: `apps/desktop/src/__tests__/layer-hit-test.test.ts` | Unit tests for hit helper. |

### 3.2 No Rust/core changes

All capabilities are frontend-only.

- `keyboard nudge` → uses existing `engine.transformLayer()` / `engine.moveLayer()`.
- `canvas auto-select` → sets active layer via existing state.
- `HUD` → transient, no persistence.
- `snap feedback` → already computed by `computeSnapAdjustment`.

## 4. Dependencies

None. Reuses existing `transformGeometry.ts` (`getLayerCorners`), existing `computeSnapAdjustment`, existing engine APIs.

## 5. Testing Plan

- **layer-hit-test.test.ts**: hit inside transformed rect, hit outside, hit rotated rect, skip hidden layer, skip layer with no intersection.
- **Existing tests**: full regression suite must still pass.
- **Manual checklist**: nudge moves correctly with Arrow/Shift+Arrow; auto-select picks topmost visible layer; HUD shows correct values during drag; snap label appears.

## 6. Risks

- Arrow nudge with `event.repeat` spamming history: guard with `!event.repeat` for commit, or batch.
- Auto-select performance: hit-test per layer per pointerdown. With ≤256 layers (current limit) trivial.
- HUD clamping: ensure `getBoundingClientRect()` boundary check so HUD doesn't overflow viewport.
