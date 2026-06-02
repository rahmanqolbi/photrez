# Photoshop-Like Free Transform for Photrez Move Tool

Date: 2026-06-02

## Goal

Bring Photrez Move Tool to Photoshop-grade Free Transform behavior: the bounding box, handles, hit testing, cursor, and renderer all share one true 2D transform model, so rotating, flipping, and resizing a layer feels native to professional image editors.

## Problem

The current Move Tool in Photrez advertises "8 resize handles + 1 rotation handle" but the implementation is not transform-aware:

- `SelectionTransformOverlay.tsx` draws an HTML div box using `left/top/width/height` derived from `x/y/scale`. It ignores `rotation` and `flipH`/`flipV`, so a rotated layer's frame is drawn as a straight rectangle that does not align with the rendered pixels.
- `renderer/shaders.ts` maps `u_layerRect.xy + pos * u_layerRect.zw` to document space, with no scale-around-center, no rotation, and no flip. The WebGL pixel output is therefore always axis-aligned, regardless of what the model says.
- Resize math in `handlePointerMove` uses screen-axis `dx`/`dy` divided by zoom. On a rotated layer the handles do not move along the visual edges of the image, so dragging the "top-right" handle stretches a different axis than the user expects.
- Cursors are static `nwse-resize` / `nesw-resize` / `ns-resize` / `ew-resize`; they do not rotate with the layer.
- The reference project `D:\Project\aplikasi-cetak-massal` already has a correct pattern: an SVG bounding box wrapped in a `<g transform="rotate(...)">`, handle detection via `rotatePoint` to layer-local space, and an `applyScaleHandle` that resizes in the layer's local frame.

## Non-Goals (First Pass)

- Free transform of multi-layer selection groups (group AABB transform).
- Snapping rotated edges to rotated edges (per-edge snap).
- Non-destructive smart-object transform.
- Distort / perspective handles (4-corner perspective warp is out of scope).
- Committing transformed pixels back into the layer bitmap. Transform remains a 2D affine on the rendered layer; we do not rasterize the new bitmap on commit. This matches current Photrez behavior.

## Target Behavior

### Visual

- The frame around the selected layer is a 1px stroke, non-scaling, drawn through an SVG group that is rotated by `transform.rotation` around the layer's rotated center.
- 8 resize handles (4 corners + 4 sides) are drawn at constant screen size, sized `8 / zoom`.
- 4 corner rotate zones are transparent hit zones outside the corners, sized `250 / zoom` (or scaled to stay useful at extreme zoom).
- A center pivot dot is drawn at the layer center, also constant screen size.
- Color: Photon Amber `#E15A17` for the active frame, white-filled squares for inactive handles, amber-filled squares for the active handle.
- All visual stroke widths and handle sizes use `vector-effect="non-scaling-stroke"` or computed `1 / zoom` so the overlay stays crisp at every zoom.

### Interaction

- Pointer down on the box interior (`move`): drag the layer. Same as today, including Move Tool snapping.
- Pointer down on a corner handle: resize along both axes, preserving aspect ratio by default.
- Pointer down on a side handle: resize one axis only, no aspect lock.
- Pointer down on a corner rotate zone (outside-corner): rotate the layer about its center.
- `Shift` while corner-resizing: allow free, non-proportional scaling.
- `Shift` while rotating: snap to 15-degree increments.
- `Alt` while resizing: scale from center instead of the opposite handle.
- `Esc` while a transform is active: revert to the start-of-drag transform.
- Pointer up: commit the transform as a single history entry. If pointer never moved, do not commit (matches current code).
- `Space` held or panning: pointer events fall through to the viewport (no transform), same as the current "navigation mode" behavior.
- Locked or invisible layer: no overlay interaction, default cursor.

### Hit Testing

- Pointer position is converted to layer-local space using `rotatePoint(pointer, center, -rotation)` before any corner/side/inside test. This makes hit testing correct for any rotation, including flipped layers.
- Hit zones:
  - Corner handle hit: `16 / zoom` (Photoshop-like tolerance).
  - Side handle hit: `16 / zoom`.
  - Rotate zone: outside the rectangle by `250 / zoom` in each direction, but inside a square that includes the corners.
  - Move hit: pointer is inside the rotated rectangle but not on a handle.

### Renderer

- The layer pixels must match the transform. The vertex shader now applies signed scale (`scaleX * (flipH ? -1 : 1)`, `scaleY * (flipV ? -1 : 1)`), rotation around the layer center, and translation to the layer's top-left in document space.
- The current shader:

  ```glsl
  vec2 docPos = u_layerRect.xy + pos * u_layerRect.zw;
  gl_Position = u_viewProj * vec4(docPos, 0.0, 1.0);
  ```

  is replaced with a center-anchored, scale+rotate-aware path. The texture sampling stays in `[0,1]`; we remap `pos` to local space, scale, rotate, then translate.

### Snapping

- Existing Move Tool snapping stays.
- The "moving" rect becomes the layer's transformed AABB.
- Targets stay axis-aligned canvas edges/centers and other layers' transformed AABB edges/centers.
- Smart guides remain axis-aligned for the first pass.

### Cursor

- Layer is locked: default cursor.
- Space held: grab/grabbing.
- Move tool, no hover handle, not on box: default.
- Move tool, hover on a resize handle: rotation-aware resize cursor. The handle's screen angle is `(handleBaseAngle + visualRotation) % 360`, mapped to the closest 45-degree cursor slot. Visual rotation uses `rotation * sign(scaleX * scaleY)`, matching the reference.
- Move tool, hover on a corner rotate zone: rotate cursor. For the first pass we use a built-in `crosshair` cursor; a custom SVG rotate cursor is a polish item.
- Hover on box interior: `move` cursor.

## Architecture

The transform pipeline becomes a single, well-defined boundary:

1. **Pure geometry helpers** (`apps/desktop/src/viewport/transformGeometry.ts`)
   - `getLayerCenter(layer)`
   - `getLayerCorners(layer)` returns `[{x, y}, ...]` in document order TL, TR, BR, BL after applying rotation, flip, scale.
   - `getLayerAabb(layer)` returns the AABB of the rotated corners.
   - `pointToLayerLocal(point, layer)` returns the same point in layer-local coordinates (rotation removed).
   - `detectHandle(point, layer, zoom)` returns `'move' | 'nw' | 'n' | 'ne' | 'e' | 'se' | 's' | 'sw' | 'w' | 'rotate' | null`.
   - `applyResizeHandle(...)` returns the new `Transform2D` (and updates `x`/`y` to keep the opposite handle anchored, with optional `Alt` = center anchor and optional `Shift` = free scaling for corners).
   - `applyRotationDrag(...)` returns the new rotation in degrees, with `Shift` snap to 15 degrees.
   - `getCursorForHandle(handle, rotation, scaleX, scaleY)` returns a CSS cursor string.

2. **Renderer** (`apps/desktop/src/renderer/shaders.ts`, `webgl2.ts`)
   - Update the vertex shader to apply center-anchored scale, flip, and rotation.
   - Update `RenderState.layers[i].transform` consumers to use the layer's effective rotation/flip; the uniform layout becomes a structured value the shader can decode.

3. **Overlay** (`apps/desktop/src/components/editor/SelectionTransformOverlay.tsx`)
   - Replace the HTML div with an SVG `<g transform={`rotate(${rotation} ${cx} ${cy})`}>` that draws the rectangle, handles, and rotate hit zones.
   - Pointer handlers are rewired to call into `transformGeometry.ts`.
   - Keep `isNavigationMode` pass-through.

4. **Snapping** (`apps/desktop/src/viewport/smartGuides.ts`, `CanvasViewport.tsx`)
   - Use the transformed AABB for the moving rect and the visible non-active layers' rects.
   - Guide lines remain axis-aligned; endpoints clamped with the existing finite-endpoint guard.

5. **Cursor** (`apps/desktop/src/viewport/cursorResolver.ts`)
   - New function `resolveResizeCursor(handle, rotation, scaleX, scaleY)` returning a CSS cursor.
   - Wire it into `resolveCursor`.

## Data Flow

```text
1. User presses Move tool, selects a layer.
2. SelectionTransformOverlay mounts.
3. Each pointer-move / pointer-down samples pointer in document coordinates.
4. detectHandle() returns the active handle in layer-local space.
5. Pointer-down records start transform; pointer-move computes the new transform via applyResizeHandle / applyRotationDrag.
6. engine.transformLayer(layer.id, newTransform) is called.
7. scheduler.requestRender() redraws the WebGL canvas with the new transform.
8. The SVG overlay re-derives its corners from the new transform on the next reactive pass.
9. Pointer-up pushes a single history snapshot.
```

## Edge Cases

- `scaleX = 0` or `scaleY = 0`: must not divide by zero. Helpers clamp to `Math.max(1e-6, scale)`.
- `flipH` and `flipV` true: corners still come out in correct document order. Hit testing uses local coordinates so flips do not break it.
- `rotation = 90` exactly: handle detection still finds the right handle. The cursor mapping uses `((angle % 360) + 360) % 360` to stay positive.
- Layer locked: overlay exists for visual reference but `pointer-events: none`; no transform.
- Layer invisible: same as locked.
- `Alt` + corner resize: anchor at center, not at opposite corner.
- `Shift` snap during rotation: snap to nearest 15 degrees, never below 0 distance.
- Pointer-up with no movement: do not commit history.

## Testing

- **Unit tests for `transformGeometry.ts`**
  - `getLayerCorners` for 0, 45, 90, 180, -30, 270-degree rotations
  - `getLayerAabb` for rotated, flipped, and scaled layers
  - `pointToLayerLocal` for rotated, flipped layers
  - `detectHandle` for each handle type on rotated and unrotated layers
  - `applyResizeHandle` for corner/side, with/without Shift, with/without Alt
  - `applyRotationDrag` for 15-degree snap with Shift
  - `getCursorForHandle` for all 4 rotation quadrants and flipped layers

- **Build and test verification**
  - `pnpm.cmd run build` to catch any TS regressions
  - `pnpm.cmd --filter photrez-desktop test` for frontend regression
  - `cargo test -p photrez-core` for Rust regression (no Rust changes, but project protocol)

- **Manual smoke test** (recorded in commit message and `AI_HISTORY.md`)
  - Open a single image, select it.
  - Rotate by 45 degrees using outside-corner rotate: pixels, frame, and handles must stay aligned.
  - Resize using a corner: aspect locked by default.
  - Hold `Shift` while resizing a corner: free scaling.
  - Hold `Alt` while resizing: scale from center.
  - Hold `Shift` while rotating: snap to 15 degrees.
  - Press `Esc` mid-drag: revert.
  - Lock a layer, attempt to transform: no interaction.
  - Use Move Tool snapping on a rotated layer: snaps to other layers' AABB edges/centers.

## Risks

- Renderer change can regress HiDPI/zoom that was just stabilized. The new shader must keep `documentSize` math intact and continue to use the existing `viewProj` matrix.
- Pointer capture and event propagation must remain correct; the SVG overlay should not steal events during navigation mode.
- History commits remain single-snapshot per drag (matches today's behavior).

## Definition of Done

- All geometry helpers have unit tests; all tests pass.
- The WebGL renderer draws rotated/flipped pixels correctly.
- The SVG overlay frame, handles, and rotate zones align with the rendered layer at any rotation.
- Resize/rotate feel Photoshop-like: local-axis math, dynamic cursors, modifier behavior, single history commit per drag.
- Snapping uses transformed AABB; existing guide-line finite-endpoint guard still passes.
- Build, frontend tests, and Rust core tests all pass.
- `docs/AI_CURRENT_TASK.md`, `docs/AI_HISTORY.md`, `docs/FEATURES.md` are updated.
