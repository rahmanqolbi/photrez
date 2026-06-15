# Overlay Container to Screen-Space Positioning — Design Spec

**Date**: 2026-06-15
**Status**: Draft — pending user review
**Scope**: Single file, scoped to `apps/desktop/src/components/editor/CanvasViewport.tsx:740-764`
**Phase**: 1 of 3 (Phase 2: Modern Crop, Phase 3: animation smoothness)

---

## 1. Problem Statement

Photrez has converged on `ViewportCamera` as the single source of truth for viewport pan/zoom. The 2026-06-13 recovery migration unified camera ↔ SolidJS signals ↔ `DocumentEngine.viewport` via `setViewportState()` adapter. 6 of 7 overlay components were migrated to screen-space positioning in that effort.

**One general-path spot remains**: `CanvasViewport.tsx:740-764` still uses a CSS `transform: translate3d(pan) scale(zoom)` wrapper to position the 2D brush preview canvas and the artboard border.

This is a **dual-source-of-truth** wart: viewport state is read three different ways in this single file (SolidJS `pan()`/`zoom()` signals for CSS transform, `camera.getState()` for the screen-space overlays below, and the WebGL canvas reads it via VP matrix). For a new tool, the developer must ask "do I put my element inside the CSS wrapper or alongside it?" — a question that should not exist.

**Reference**:
- `docs/plans/2026-06-13-gpu-smooth-zoom-transitions-design.md` — original GPU migration (SUPERSEDED 2026-06-13)
- `docs/AI_HISTORY.md §[2026-06-13] BUG FIX — Viewport Camera Regression Recovery` — recovery pattern
- `docs/decisions/id-decision-log.md` line 77-78 — "do not ship as originally planned" decision

## 2. Goal

Eliminate the last general-path CSS transform wrapper. Position the 2 children (2D brush preview canvas, artboard border) directly in screen-space coordinates. After this change:

- Every general-path viewport element reads viewport state the same way: explicit screen-space coords (`left`, `top`, `width`, `height` in pixels)
- The `ViewportCamera` class is the only place viewport state mutation happens
- 1 mental model for "where does this element go" when adding new tools
- Modern Crop CSS path remains untouched (documented deferred)

## 3. Non-Goals (Explicit)

- ❌ Migrate `ModernCropOverlay` to camera (Phase 2 — only if pain point emerges)
- ❌ Cleanup of `CropOverlayTooltip.tsx:14` inverse scale (unrelated concern)
- ❌ Add smooth animations to keyboard zoom / scroll wheel zoom (Phase 3)
- ❌ Optimize `will-change` for GPU-accelerated panning (only if perf issue reported)
- ❌ Touch the WebGL rendering pipeline (already camera-based, works correctly)
- ❌ Touch the 6 already-migrated overlays

## 4. Current State

`CanvasViewport.tsx:736-764`:

```jsx
<Show when={activeTool() !== "crop" || cropInteractionMode() !== "modern"}>
  {/* Document-space CSS transform container for background previews */}
  <div
    style={{
      transform: `translate3d(${pan().x}px, ${pan().y}px, 0) scale(${zoom()})`,
      "transform-origin": "0 0",
      transition: "none",
      "will-change":
        isPanning() || isCropDragging() ? "transform" : "auto",
      position: "absolute",
      width: `${docWidth()}px`,
      height: `${docHeight()}px`,
      "pointer-events": "none",
    }}
  >
    {/* Overlay canvas — sync 2D brush preview, no createImageBitmap per move */}
    <canvas ref={setOverlayCanvasRef} style={overlayCanvasStyle()} />

    {/* Artboard border & shadow */}
    <div
      class="absolute inset-0 pointer-events-none border border-white/10"
      style={{
        "box-shadow":
          "0 0 0 1px rgba(0, 0, 0, 0.6), 0 8px 32px rgba(0, 0, 0, 0.7)",
      }}
    />
  </div>
  ...
```

**`overlayCanvasStyle()` (lines 208-243)** returns a style object that:
- Positions at `left: 0, top: 0` in document space
- Sizes to `layer.width × layer.height` (document space)
- Applies layer transform via `transform: translate3d(layer.x, layer.y) rotate(rot) scale(...)` with `transform-origin: 0 0`
- Sets `opacity`, `pointer-events: none`

The **outer wrapper** takes the result of `overlayCanvasStyle()` (which is in document space + layer transform) and adds viewport pan/zoom on top. This is composable because both use `transform-origin: 0 0`.

## 5. Target State

`CanvasViewport.tsx:736-764` (post-migration):

```jsx
<Show when={activeTool() !== "crop" || cropInteractionMode() !== "modern"}>
  {/* 2D brush preview canvas — screen-space coords, layer transform preserved */}
  <canvas
    ref={setOverlayCanvasRef}
    style={overlayCanvasStyleScreenSpace()}
  />

  {/* Artboard border & shadow — screen-space coords */}
  <div
    class="absolute pointer-events-none border border-white/10"
    style={{
      left: `${pan().x}px`,
      top: `${pan().y}px`,
      width: `${docWidth() * zoom()}px`,
      height: `${docHeight() * zoom()}px`,
      "box-shadow":
        "0 0 0 1px rgba(0, 0, 0, 0.6), 0 8px 32px rgba(0, 0, 0, 0.7)",
    }}
  />
  ...
```

**New `overlayCanvasStyleScreenSpace()`** (replaces `overlayCanvasStyle()`):

```ts
const overlayCanvasStyleScreenSpace = createMemo(() => {
  const layer = activeLayer();
  const tool = activeTool();
  const isBrushOrEraser = tool === "brush" || tool === "eraser";

  if (!layer || !isBrushOrEraser) {
    return { display: "none" };
  }

  const transform = layer.transform;
  const rot = transform.rotation || 0;
  const scaleX = transform.scaleX ?? 1;
  const scaleY = transform.scaleY ?? 1;
  const flipX = transform.flipH ? -1 : 1;
  const flipY = transform.flipV ? -1 : 1;

  return {
    position: "absolute" as const,
    left: `${pan().x + (transform.x ?? 0) * zoom()}px`,
    top: `${pan().y + (transform.y ?? 0) * zoom()}px`,
    width: `${layer.width * zoom()}px`,
    height: `${layer.height * zoom()}px`,
    transform: `rotate(${rot}deg) scale(${scaleX * flipX}, ${scaleY * flipY})`,
    "transform-origin": "0 0",
    opacity: layer.opacity ?? 1,
    "pointer-events": "none" as const,
  };
});
```

The outer CSS transform is replaced by explicit screen-space coords. The inner layer transform (rotation, scale, flip) is preserved because it is layer-specific, not viewport.

## 6. Math Equivalence

For uniform zoom and same-origin transforms, the outer CSS `transform` (translate + scale) is mathematically equivalent to applying the same translate via `left/top` and the same scale via `width/height`. The inner layer transform (translate + rotate + scale) is preserved as a CSS transform on the canvas itself.

Concretely, for a layer at doc-space position `(layer.x, layer.y)` with size `(w, h)` and rotation `rot`:

- **Before** (wrapper transform + inner transform):
  - Canvas positioned at doc-space `(0, 0)` with size `(w, h)`
  - Inner CSS: `translate(layer.x, layer.y) rotate(rot) scale(sx, sy)` (origin 0 0)
  - Outer CSS: `translate(pan.x, pan.y) scale(zoom)` (origin 0 0)
  - Effective: `(pan + zoom*(layer + R*rot*scale*P))`

- **After** (no wrapper, screen-space layout + inner transform):
  - Canvas positioned at screen-space `(pan + zoom*layer)` with size `(w*zoom, h*zoom)`
  - Inner CSS: `rotate(rot) scale(sx, sy)` (origin 0 0)
  - Effective: `(pan + zoom*layer + R*rot*scale*P)`

**For uniform zoom with `transform-origin: 0 0`**: the two formulations produce identical screen positions. The zoom is applied once to the layer position (via `width/height` in the new state, via outer `scale(zoom)` in the old state), and the inner rotation/scale is applied to the canvas's rendered content, which is uniform-scaled by the canvas's CSS `width/height`.

**The two are equivalent for the brush preview use case** (uniform zoom, no per-axis scaling on the viewport). The visual result should be identical for all layer types: non-rotated, rotated, scaled, flipped.

**Verification**: a Playwright visual comparison of brush stroke with the same layer at the same pan/zoom will confirm equivalence. If divergence is found in manual QA, the inner transform can be adjusted to compensate.

## 7. Data Flow

| Trigger | Before | After |
|---|---|---|
| `pan()` or `zoom()` changes | Wrapper `transform` updates (GPU) | `left/top/width/height` of 2 elements update (CPU layout) |
| `docWidth()` / `docHeight()` changes | Wrapper `width/height` updates | Artboard border `width/height` updates |
| Active layer changes | Canvas position reset (display:none if not brush) | Same — `display: none` if not brush/eraser |
| Layer transform changes | Inner canvas `transform` updates | Inner canvas `transform` updates (unchanged) |

No new data flow paths. No new signals. No new state.

## 8. Trade-offs

| Aspect | Before | After |
|---|---|---|
| GPU-accelerated panning | `will-change: transform` | None (layout-based) |
| Mental model | 2 transform levels to reason about | 1 set of screen-space coords |
| Code maintenance | Synchronize 2 transforms | Independent per element |
| Performance during rapid pan | Marginal gain (GPU composite) | Acceptable — RAF-bounded, small element |
| Code at file | Wrapper + 2 children (3 elements) | 2 sibling elements |

**Mitigation** for any perf issue: add `will-change: transform` per element. This is trivial to apply later and out of scope for this phase.

## 9. Testing Strategy

### Existing tests (must remain green)

- 981/981 frontend tests must pass
- `pnpm run build` must succeed
- `pnpm --filter photrez-desktop exec playwright test` — Playwright E2E (14 tests) must pass

### New regression test (1 test, in `CanvasViewport.test.tsx`)

```ts
it("overlay container children render at screen-space coords (no CSS transform wrapper)", () => {
  // Setup: pan = (50, 50), zoom = 2.0, docWidth = 800, docHeight = 600
  // Active layer with transform.x = 10, transform.y = 20, rotation = 0
  // ... render CanvasViewport

  const overlayCanvas = container.querySelector(
    'canvas[data-overlay-canvas]',
  ) as HTMLCanvasElement;
  const artboard = container.querySelector(
    '[data-artboard-border]',
  ) as HTMLDivElement;

  // Artboard border should be at screen-space
  expect(artboard.style.left).toBe("50px");
  expect(artboard.style.top).toBe("50px");
  expect(artboard.style.width).toBe("1600px"); // 800 * 2.0
  expect(artboard.style.height).toBe("1200px"); // 600 * 2.0

  // No CSS transform should be present
  expect(artboard.style.transform).toBe("");

  // No wrapper div with viewport transform
  const wrapper = container.querySelector('[data-overlay-wrapper]');
  expect(wrapper).toBeNull();
});
```

### Test data attributes to add

- `data-overlay-canvas` on the brush preview canvas (for testability)
- `data-artboard-border` on the artboard border div (for testability)
- These do not affect production behavior

### Playwright visual check (existing tests, no new test needed)

The existing `e2e/editor-smoke.spec.ts` covers:
- Brush stroke appearance after Move deselect
- Move tool transform alignment after fit/zoom/pan

These should catch any visual regression without new E2E.

## 10. Implementation Steps

1. Add `data-overlay-canvas` to canvas ref binding in `CanvasViewport.tsx`
2. Add `data-artboard-border` to artboard border div
3. Rename `overlayCanvasStyle` to `overlayCanvasStyleScreenSpace`, update its body to produce screen-space coords
4. Remove the wrapper `<div>` and its 6-style-object wrapper
5. Update the artboard border div to use explicit `left/top/width/height` instead of `inset-0`
6. Verify with `pnpm --filter photrez-desktop test --run` (981 → 982 tests)
7. Verify with `pnpm run build`
8. Verify with `pnpm --filter photrez-desktop exec playwright test`

## 11. Verification Pipeline (Mandatory per AGENTS.md)

```
pnpm.cmd --filter photrez-desktop test --run      # 982/982 frontend tests
pnpm.cmd run build                                 # tsc + Vite production
pnpm.cmd --filter photrez-desktop exec playwright test  # 14 E2E tests
```

All must be green before marking COMPLETE.

## 12. Documentation Updates

After successful implementation:

- `docs/AI_HISTORY.md` — add `[2026-06-15] MIGRATION — Overlay Container to Screen-Space Positioning [COMPLETE]` entry with Goal + Done + Files Changed + Verification
- `docs/FEATURES.md` — line 191-193 (Viewport section) update from `RECOVERY` to `DONE` for the smooth zoom architecture
- `docs/AI_CURRENT_TASK.md` — mark `[2026-06-15]` task COMPLETE
- `docs/decisions/id-decision-log.md` — no change (decision is still "do not ship as originally planned" but Phase 1 of the 3-phase recovery is now complete; add a note)

## 13. Risks

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| Visual regression in brush preview | Low | High | Playwright E2E covers brush stroke; manual QA before merge |
| Alignment drift in artboard border | Low | Medium | New regression test asserts exact coords |
| Performance regression during rapid pan | Low | Low | RAF-bounded; `will-change` can be added later if reported |
| Tests break that depend on wrapper structure | Very low | Medium | Verified by grep — no test queries for `data-overlay-wrapper` or similar |
| SolidJS reactivity gap | Very low | High | All changes are inside existing `createMemo` / JSX style — SolidJS signals are read normally |

## 14. Future Phases (Out of Scope for This Spec)

- **Phase 2**: Modern Crop CSS path migration. Only if `isModernCropActive` becomes a maintenance pain point. Not planned.
- **Phase 3**: Smooth animations for keyboard zoom, scroll wheel zoom, fit-to-screen (Ctrl+0). Reuse existing `camera.animateTo()` and `easeOutCubic` infrastructure. Spec to be written after Phase 1 is stable.

## 15. References

- `docs/AI_CONTEXT.md` — AI rules (pre-coding protocol, anti-truncate)
- `docs/AI_CURRENT_TASK.md §[2026-06-15]` — current task entry
- `docs/AI_HISTORY.md §[2026-06-13] BUG FIX — Viewport Camera Regression Recovery` — recovery pattern
- `docs/decisions/id-decision-log.md` line 77-78 — recovery decision
- `docs/plans/2026-06-13-gpu-smooth-zoom-transitions-design.md` — original plan
- `apps/desktop/src/viewport/viewportCamera.ts` — camera class
- `apps/desktop/src/viewport/easing.ts` — easing functions
- `apps/desktop/src/components/editor/CanvasViewport.tsx:208-243` — `overlayCanvasStyle` (current)
- `apps/desktop/src/components/editor/CanvasViewport.tsx:736-764` — wrapper to migrate
