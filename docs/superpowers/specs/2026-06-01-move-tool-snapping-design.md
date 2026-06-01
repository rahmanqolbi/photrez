# Move Tool Snapping & Precision Design

Date: 2026-06-01
Status: Approved for planning, not implemented
Scope: MVP move tool precision and simplification

## 1. Summary

Photrez's Move tool currently drags the active layer with raw pointer
positions, ignoring alignment cues. Drag precision feels imprecise
compared to Photoshop, Affinity, and Figma. The user can only see
where the layer ends up after releasing the mouse.

This design adds:

- A small snap engine that nudges the active layer onto snap targets
  while dragging.
- Snap targets are: canvas edges and center, and visible layers other
  than the active layer.
- Smart guides are drawn only when an actual snap is active.
- Holding `Alt` (or `Option`) during drag disables snapping temporarily.
- A tiny simplification pass in the input handler to remove the
  current side-effect-only `onComputeSnapLines` callback.

This is not a full move-tool rewrite. It does not add grid snapping,
multi-select drag, rotated-bounds snap, editable numeric X/Y fields,
or keyboard nudge. Those are deferred to a later design if needed.

## 2. Product Goal

Make Move tool drag feel like a desktop image editor:

1. Drag a layer near a canvas edge: it snaps to the edge.
2. Drag a layer near the canvas center: it snaps to center.
3. Drag a layer near another layer: it snaps to that layer's edge or
   center.
4. A magenta/cyan guide line shows which target was hit.
5. Hold `Alt` to drag freely without snapping and without guides.
6. The hit threshold is small enough that snapping feels intentional
   (default 5 document pixels).

After this change, Move tool matches the precision users expect from
Photoshop or Affinity without introducing new UI surfaces.

## 3. Decisions Locked During Design Discussion

### 3.1 Snap Targets

Decision: snap to visible layers other than the active layer, plus
the canvas bounds and center.

Behavior:

- The target list passed to the helper includes:
  - Every layer except the active layer (hidden or locked included).
  - The canvas rect at `{ x: 0, y: 0, w: docW, h: docH }`.
- Each layer contributes one axis-aligned snap rect:
  - `x = layer.transform.x`
  - `y = layer.transform.y`
  - `w = layer.width * layer.transform.scaleX`
  - `h = layer.height * layer.transform.scaleY`
- Canvas center alignment is exposed as one additional candidate per
  axis: the moving rect's center X is compared to `docW / 2`; the
  moving rect's center Y is compared to `docH / 2`. These candidates
  participate in the same nearest-wins logic as edge candidates and
  are represented in the target list as synthetic rects spanning the
  full axis (e.g. `{ x: docW / 2, y: -Infinity, w: 0, h: Infinity }`
  for the vertical center line).
- Locked layers still appear as snap references. This matches how
  Photoshop treats locked layers.
- Off-canvas layer transforms are clamped to the rect math but do
  not get skipped.

Rationale:

- A canvas-only snap is too coarse for precise editing.
- Snap-to-layer covers the most common alignment workflow.
- Locked layers as references avoids the surprise of "I can't snap to
  that background".

### 3.2 Snap Behavior

Decision: auto-snap during drag, hold `Alt` to disable.

Behavior:

- While dragging with the Move tool, snap is evaluated every pointer
  move sample.
- If the user holds `Alt` (or `Option` on macOS), snapping is disabled
  for that drag. Releasing `Alt` re-enables it until pointer up.
- The snap helper returns:
  - `dx`: correction in document space for the X axis.
  - `dy`: correction in document space for the Y axis.
  - `lines`: zero, one, or two smart guide lines to render.
- If neither axis has a candidate within threshold, `dx` and `dy` are
  `0` and `lines` is empty.
- A new `isAltPressed` flag on `ToolContext` controls this in
  `input-handler.ts`. The flag is consumed only by the Move tool's
  move branch.

Rationale:

- Auto-snap matches Photoshop, Figma, and Affinity default behavior.
- `Alt` disable is the standard temporary override across the
  industry. Users who do not like snapping can hold `Alt` for the rest
  of the session.
- A clear single boolean keeps `input-handler.ts` simple.

### 3.3 Helper API

Decision: add a single pure helper next to the existing
`computeSnapLines` in `apps/desktop/src/viewport/smartGuides.ts`:

```ts
export interface SnapRect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface SnapResult {
  dx: number;
  dy: number;
  lines: SnapLine[];
}

export function computeSnapAdjustment(
  moving: SnapRect,
  targets: SnapRect[],
  threshold?: number,
): SnapResult
```

Behavior:

- For each axis, the moving rect contributes up to three candidates
  (left, center, right for X; top, center, bottom for Y).
- For each axis, every target contributes the same three candidates.
- For each axis, the pair (moving candidate, target candidate) with
  the smallest absolute distance wins, provided that distance is
  within `threshold`.
- The winner's distance is returned as `dx` (or `dy`). It is the
  delta that, when added to the moving rect's origin, aligns the
  winning candidate.
- At most one `SnapLine` is emitted per axis, so the result has 0, 1,
  or 2 lines total.
- The threshold defaults to `5` document pixels. Canvas-pixel screen
  threshold scaling is handled at the call site if needed.
- The existing `computeSnapLines` is kept as a thin wrapper that
  discards the deltas, so existing tests and consumers keep working.

Rationale:

- A pure function is trivial to test.
- Returning deltas (not absolute position) keeps the helper ignorant
  of the active layer's history or engine state.
- Preserving the existing function avoids touching unrelated call
  sites that may rely on it.

### 3.4 Input Handler Wiring

Decision: keep Move tool logic inside `input-handler.ts`, but replace
the current `interactiveState.onComputeSnapLines` side-effect callback
with a pure `onComputeSnap` returning `{ dx, dy, lines }`.

Behavior:

- The `ToolContext` interface gains:
  - `isAltPressed: boolean`
  - `onComputeSnap?: (rect: SnapRect) => SnapResult`
  - `onSnapLines?: (lines: SnapLine[]) => void`
- The history snapshot for the move remains a single snapshot taken
  on pointer down (existing behavior we must preserve). The new
  handler must not add per-sample snapshots.
- On pointer move during Move drag:
  1. Compute raw `newX, newY` as today.
  2. If `isAltPressed` is false and `onComputeSnap` exists, call it
     with the moving rect at `(newX, newY, w, h)` and apply `dx, dy`.
  3. Call `engine.moveLayer(selectedLayerId, nextX, nextY)`.
  4. Call `onSnapLines` with the snap lines (empty if `Alt`).
- On pointer up: call `onSnapLines` with `[]` to clear the guide
  layer.
- The old `onComputeSnapLines` field is removed.

Rationale:

- Minimal blast radius: only Move tool drag is affected.
- Side-effect-free API is easier to reason about and test.
- Snap math is owned by the helper, not the input handler.

### 3.5 Smart Guide Rendering

Decision: smart guides are rendered by the existing render path
driven by `interactiveState.snapLines`. The viewport adds nothing
new.

Behavior:

- `CanvasViewport` calls `setSnapLines` from a `createEffect` that
  watches the `onSnapLines` callback's output, or directly via
  imperative call in the move handler.
- The color, line width, and stroke style stay whatever the existing
  code already does. No visual change beyond "guides now appear when
  snapping fires".

Rationale:

- Rendering already exists. We only need to feed it.
- Keeps visual style consistent with previous smart guides.

## 4. Architecture & Constraints

- The shell (Tauri) does not see this change. The renderer (wgpu)
  does not see this change. The change is contained in:
  - `apps/desktop/src/viewport/smartGuides.ts` (helper extension)
  - `apps/desktop/src/viewport/input-handler.ts` (Move tool wiring)
  - `apps/desktop/src/components/editor/CanvasViewport.tsx`
    (target generation + Alt flag plumbing)
  - New unit tests for the helper.
- No new public Tauri command. No change to `docs/03-trd.md`
  command envelopes. No ADR update required.
- The verification pipeline from `AGENTS.md` still applies:
  - `pnpm.cmd run build`
  - `pnpm.cmd --filter photrez-desktop test`
  - `cargo test -p photrez-core`

## 5. Risks

- **Snapping to off-canvas layers**: a layer can be dragged far
  outside the canvas via Move tool. The snap engine still evaluates
  these targets. This is acceptable because Photoshop and Figma
  behave the same way.
- **Threshold feels wrong**: a 5px threshold is a guess. It is
  configurable and easy to tune; the first release can ship with 5
  and adjust based on feel.
- **Performance**: target list is at most a few hundred rects.
  `computeSnapAdjustment` is O(N * candidates) per pointer move
  sample. This is well under 1ms on modern hardware for typical
  scene sizes (<=200 layers). No risk for MVP.
- **Locked layer surprise**: locking a layer still allows snapping
  to it. This matches Photoshop but a user might expect otherwise.
  We accept the Photoshop behavior for consistency.

## 6. Out of Scope

- Grid snapping.
- Pixel snap / discrete transform.
- Rotation-aware bounding box snap.
- Multi-select drag.
- Editable numeric X/Y/W/H fields in the option bar.
- Keyboard arrow nudge.
- Custom snap targets or user preferences UI.
- Snap-to-pixel when zoom is high.

## 7. Acceptance Criteria

1. Dragging a layer within 5 doc px of a canvas edge snaps it to
   that edge; a guide line appears at that edge.
2. Dragging a layer near the canvas horizontal or vertical center
   snaps to the center; a guide line appears at the center.
3. Dragging a layer near another layer's edge or center snaps to it;
   a guide line appears at the matching axis.
4. Holding `Alt` while dragging disables both snap and guides; the
   layer follows raw pointer position.
5. Releasing `Alt` mid-drag re-enables snap on the next move sample.
6. Undo restores the layer to its pre-drag position in one step.
7. Pointer-up clears all snap lines.
8. `pnpm.cmd run build` succeeds.
9. `pnpm.cmd --filter photrez-desktop test` passes, including new
   helper unit tests.
10. `cargo test -p photrez-core` is unaffected and still passes.

## 8. Open Questions

None at design time. The plan stage can introduce clarifying
questions if implementation reveals a hidden constraint.
