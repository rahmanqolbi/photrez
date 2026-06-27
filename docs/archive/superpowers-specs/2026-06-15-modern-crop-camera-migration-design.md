# Modern Crop CSS Path Migration to Camera-Based Image Transform — Design Spec

**Date**: 2026-06-15
**Status**: Draft — pending user review
**Scope**: Migrate Modern Crop's image transform from CSS `transform` to `ViewportCamera` VP matrix
**Phase**: 2 of 3 (Phase 1: overlay container DONE 2026-06-15, Phase 3: animations deferred)

---

## 1. Problem Statement

Photrez's Modern Crop uses CSS `transform: translate(pivot) rotate scale translate(-pivot)` to manipulate the canvas during crop frame drag. This is a CSS-level image transform applied outside the WebGL pipeline.

**The architectural inconsistency**: 6 other overlays (Selection, HoverHighlight, SmartGuides, BrushCursor, TransformHud, SelectionTransform, CropOverlay) and 6 layers of Modern Crop's own UI (frame, handles, drag preview, fill preview, snap lines, tooltip) are all positioned in screen-space, computed from the `ViewportCamera` state. But the canvas itself — the thing being transformed — uses CSS.

**Why this matters**:
- **GPU usage is split**: WebGL renders the document, then CSS compositing layer transforms it. A pure WebGL pipeline would compute the combined transform in the VP matrix shader.
- **Two render paths**: `EditorShell.tsx:79-84` has a conditional `if (camera.isModernCropActive)` that routes through different code paths.
- **Future Phase 3 (smooth animations) blocked**: Animating image transform via CSS string interpolation is awkward; animating in WebGL is straightforward.
- **Decision log says do it** (after Move/Brush/Crop/Navigator checks pass — all pass now).

**Reference**:
- `docs/plans/2026-06-13-gpu-smooth-zoom-transitions-design.md` §8.2 — original Phase 2 deferral
- `docs/AI_HISTORY.md §[2026-06-13] BUG FIX — Viewport Camera Regression Recovery` — root cause of original migration failure
- `docs/decisions/id-decision-log.md` line 77-78 — recovery decision + Phase 1 complete note (2026-06-15)

## 2. Goal

Move Modern Crop's image transform from CSS to the `ViewportCamera` VP matrix. After this change:
- `ViewportCamera` is the single source of truth for all transforms (viewport + image)
- Modern Crop's image transform is computed in WebGL, not CSS
- `isModernCropActive` flag is removed; render path is single
- `EditorShell` always uses the VP matrix
- `CanvasViewport` canvas has no conditional style

## 3. Non-Goals (Explicit)

- ❌ Phase 3 smooth animations for image transform (deferred — but architecture now supports it)
- ❌ Migrate Classic crop (already camera-based via the regular path)
- ❌ Touch the 6 already-migrated overlays
- ❌ Touch WebGL2 renderer internals (`webgl2.ts` — just consumes the VP matrix)
- ❌ Refactor the Modern Crop frame geometry math (`modernCropGeometry.ts` is unchanged)
- ❌ Touch other Phase-1-migrated areas (overlay container, brush preview canvas, artboard border)

## 4. Current State

### Modern Crop image transform flow

**A.** `CanvasViewport.tsx:138-163` — `modernImageTransformStyle` createMemo:

```ts
const modernImageTransformStyle = createMemo(() => {
  const frame = modernCropFrame();
  const transform = modernCropImageTransform();
  if (!frame) {
    return `translate3d(${pan().x + transform.offsetX}px, ${pan().y + transform.offsetY}px, 0) scale(${zoom() * transform.scale})`;
  }
  const pivot = getModernCropImagePivot({...});
  return [
    `translate3d(${pivot.screen.x}px, ${pivot.screen.y}px, 0)`,
    `rotate(${transform.rotation}deg)`,
    `scale(${zoom() * transform.scale})`,
    `translate3d(${-pivot.document.x}px, ${-pivot.document.y}px, 0)`,
  ].join(" ");
});
```

**B.** `CanvasViewport.tsx:306-329` — effect that toggles `camera.isModernCropActive`:

```ts
createEffect(() => {
  if (activeTool() !== "crop" || cropInteractionMode() !== "modern") {
    camera.isModernCropActive = false;
    if (lastModernCropSessionKey !== null) {
      resetModernCrop();
    }
    lastModernCropSessionKey = null;
    return;
  }
  camera.isModernCropActive = true;
  // ... build aspect, set frame
});
```

**C.** `CanvasViewport.tsx:702-733` — conditional canvas style (now updated post-Phase-1):

```tsx
<canvas
  style={
    activeTool() === "crop" && cropInteractionMode() === "modern"
      ? {
          position: "absolute",
          left: "0px",
          top: "0px",
          width: `${docWidth()}px`,
          height: `${docHeight()}px`,
          transform: modernImageTransformStyle(),  // ← CSS transform
          ...
        }
      : {
          position: "absolute",
          inset: "0px",
          width: "100%",
          height: "100%",
          ...
        }
  }
/>
```

**D.** `EditorShell.tsx:79-84` — conditional render:

```ts
const scheduler = new RenderScheduler(() => {
  const engine = workspace.getActiveEngine();
  if (!engine) return;
  if (camera.isModernCropActive) {
    renderer.render(engine.getRenderState());  // ← no matrix
  } else {
    const matrix = camera.getViewProjectionMatrix();
    renderer.render(engine.getRenderState(), matrix);
  }
});
```

**E.** `viewportCamera.ts:28` — flag:

```ts
public isModernCropActive = false;
```

## 5. Target State

### A. `ViewportCamera` extended with image transform

Add to `viewportCamera.ts`:

```ts
export interface ImageTransformState {
  offsetX: number;
  offsetY: number;
  rotation: number;  // degrees
  scale: number;
  pivotScreen: { x: number; y: number } | null;  // null = identity
  pivotDocument: { x: number; y: number } | null;
}

class ViewportCamera {
  // ... existing
  private imageTransform: ImageTransformState = {
    offsetX: 0,
    offsetY: 0,
    rotation: 0,
    scale: 1.0,
    pivotScreen: null,
    pivotDocument: null,
  };

  public setImageTransform(t: Partial<ImageTransformState>): void {
    this.imageTransform = {
      offsetX: t.offsetX ?? 0,
      offsetY: t.offsetY ?? 0,
      rotation: t.rotation ?? 0,
      scale: t.scale ?? 1.0,
      pivotScreen: t.pivotScreen ?? null,
      pivotDocument: t.pivotDocument ?? null,
    };
  }

  public resetImageTransform(): void {
    this.setImageTransform({});
  }

  public getImageTransform(): ImageTransformState {
    return { ...this.imageTransform };
  }

  public getViewProjectionMatrix(canvasW: number, canvasH: number): Float32Array {
    // If image transform is identity (no pivot), return camera-only matrix
    if (this.imageTransform.pivotScreen === null || this.imageTransform.pivotDocument === null) {
      return this.getCameraOnlyMatrix(canvasW, canvasH);
    }
    return this.getCompositeMatrix(canvasW, canvasH);
  }

  private getCameraOnlyMatrix(canvasW: number, canvasH: number): Float32Array {
    // Existing implementation (refactored)
    const { x, y, zoom } = this.current;
    const m = new Float32Array(16);
    m[0]  = (2 * zoom) / canvasW;
    m[5]  = (-2 * zoom) / canvasH;
    m[10] = 1;
    m[12] = -1 + (-x * 2 * zoom) / canvasW;
    m[13] =  1 + (-y * (-2) * zoom) / canvasH;
    m[15] = 1;
    return m;
  }

  private getCompositeMatrix(canvasW: number, canvasH: number): Float32Array {
    // Camera + image transform composition
    // T(pan) * T(pivotScreen) * R(rotation) * S(zoom*imageScale) * T(-pivotDocument) * point
    // ... (derivation in §6)
  }
}
```

### B. Modern Crop flow uses camera

Replace `modernImageTransformStyle` createMemo with an effect that sets camera state:

```ts
// In CanvasViewport.tsx
createEffect(() => {
  if (activeTool() !== "crop" || cropInteractionMode() !== "modern") {
    camera.resetImageTransform();
    return;
  }
  const frame = modernCropFrame();
  const transform = modernCropImageTransform();
  if (!frame) {
    camera.setImageTransform({
      offsetX: transform.offsetX,
      offsetY: transform.offsetY,
      rotation: 0,
      scale: transform.scale,
      pivotScreen: null,  // no rotation pivot when no frame
      pivotDocument: null,
    });
    return;
  }
  const pivot = getModernCropImagePivot({
    frame,
    viewport: { width: viewportWidth(), height: viewportHeight(), panX: pan().x, panY: pan().y, zoom: zoom() },
    transform,
  });
  camera.setImageTransform({
    offsetX: transform.offsetX,
    offsetY: transform.offsetY,
    rotation: transform.rotation,
    scale: transform.scale,
    pivotScreen: pivot.screen,
    pivotDocument: pivot.document,
  });
});
```

### C. Canvas style is uniform (no conditional)

```tsx
<canvas
  style={{
    position: "absolute",
    inset: "0px",
    width: "100%",
    height: "100%",
    "image-rendering": "auto",
    transition: "none",
  }}
/>
```

### D. EditorShell: single render path

```ts
const scheduler = new RenderScheduler(() => {
  const engine = workspace.getActiveEngine();
  if (!engine) return;
  const matrix = camera.getViewProjectionMatrix();
  renderer.render(engine.getRenderState(), matrix);
});
```

### E. `isModernCropActive` removed

The flag is no longer needed. Modern Crop is detected by `camera.getImageTransform().pivotScreen !== null` or similar, but actually we don't need to detect it anywhere — the matrix just includes the image transform if set.

## 6. VP Matrix Derivation

### CSS composition (current)

```css
.canvas {
  position: absolute;
  left: pan.x;
  top: pan.y;
  width: 100%;
  height: 100%;
  transform: T(pivot_screen) R(rotation) S(zoom*scale) T(-pivot_document);
  transform-origin: 0 0;
}
```

Reading the transform right-to-left (CSS convention): the canvas's local origin is moved by `-pivot_document`, then scaled by `zoom*scale`, then rotated by `rotation`, then translated by `pivot_screen`. The canvas's CSS `left/top` adds another `+pan` translation.

Total transform from doc-space to screen-space:
```
P_screen = T(pan) * T(pivot_screen) * R(rotation) * S(zoom*scale) * T(-pivot_document) * P_doc
```

### WebGL composition (target)

The WebGL render pipeline takes a 4x4 matrix in column-major order (OpenGL convention). For a point in doc-space `P_doc = (x, y, 0, 1)`:

```
gl_Position = M_VP * P_doc
```

We want `gl_Position` to map to screen pixels (clip space normalized to [-1, 1] in WebGL, or screen pixels in the FBO if we keep the existing pattern).

The existing camera matrix is a "screen pixel space" matrix (not normalized clip space). It takes doc-space points and outputs screen pixels (using the FBO coordinates).

The image transform composition is:
```
M_composite = T(pan) * T(pivot_screen) * R(rotation) * S(zoom*scale) * T(-pivot_document)
```

For 4x4 column-major matrix multiplication:
```
M = T(pan) * T(pivot_screen) * R(rotation) * S(zoom*scale) * T(-pivot_document)
```

Let me compute each component:
- `T(pan)` = identity with m[12] = pan.x * 2 / canvasW, m[13] = -pan.y * 2 / canvasH (in existing camera's coord system)
- `T(pivot_screen)` = identity with m[12] += pivot_screen.x * 2 / canvasW, m[13] += -pivot_screen.y * 2 / canvasH
- `R(rotation)` = standard 2D rotation in 3D space:
  ```
  R = [cos -sin 0 0]
      [sin  cos 0 0]
      [0    0   1 0]
      [0    0   0 1]
  ```
- `S(zoom*scale)` = uniform scale, multiplies the existing camera's scale factor
- `T(-pivot_document)` = identity with m[12] += -pivot_document.x * zoom * 2 / canvasW, m[13] += pivot_document.y * zoom * 2 / canvasH

Multiplying these matrices in order gives the composite. The final m[12] (translation X) is:
```
m[12] = camera_only_m12 
      + pivot_screen.x * 2 / canvasW
      - pivot_document.x * zoom * scale * 2 / canvasW
```

And the rotation matrix m[0..5] components get the rotation applied (the rotation around pivot).

This is what the existing CSS transform does, but in matrix form.

**Verification approach**: a "golden test" with specific values:
- canvasW=800, canvasH=600
- pan=(0, 0), zoom=1
- imageTransform = rotation=45°, scale=1, offset=(0,0), pivot_screen=(400, 300), pivot_document=(400, 300) (frame center)

Expected screen position of doc-space point (100, 100):
- Apply T(-pivot_doc): (100-400, 100-300) = (-300, -200)
- Apply S(1*1): (-300, -200)
- Apply R(45°): (-300*cos45 - (-200)*sin45, -300*sin45 + (-200)*cos45) ≈ (-300*0.707 + 200*0.707, -300*0.707 - 200*0.707) ≈ (-70.7, -353.5)
- Apply T(pivot_screen): (-70.7 + 400, -353.5 + 300) = (329.3, -53.5)
- Apply T(pan=0,0): (329.3, -53.5)

This matches the CSS transform behavior. The unit test asserts this exact value.

## 7. Data Flow

### Modern Crop state → camera → renderer

```
SolidJS signals:                    Camera state:                   Renderer:
- modernCropFrame  ─┐
- modernCropImage   ├─→ effect ──→  setImageTransform()  ──→ getViewProjectionMatrix() ──→ renderer.render(state, matrix)
  Transform         │   (read
- pan, zoom         ┘    signals,
- viewportSize            compute
                        pivot)

```

### Non-Modern-Crop state

```
SolidJS signals:                    Camera state:                   Renderer:
- pan, zoom ────────→ setState() ──→  (imageTransform = identity) ──→ getViewProjectionMatrix() ──→ renderer.render(state, matrix)
```

The same render path. Image transform is identity, matrix is camera-only.

## 8. Phases

### Phase 0 (Pilot): Extend ViewportCamera with image transform

**Goal**: Add image transform state and methods to `ViewportCamera`. No Modern Crop migration yet.

**Files**:
- Modify: `apps/desktop/src/viewport/viewportCamera.ts`
- Modify: `apps/desktop/src/__tests__/viewportCamera.test.ts`

**Tests added** (5-7 unit tests):
1. `setImageTransform({pivotScreen: null})` keeps matrix identical to no-image-transform
2. `setImageTransform({offsetX: 50, offsetY: 0, pivotScreen: null, pivotDocument: null})` pans matrix by 50px X
3. `setImageTransform({scale: 1.5, pivotScreen: {x: 400, y: 300}, pivotDocument: {x: 400, y: 300}})` scales around pivot
4. `setImageTransform({rotation: 45, pivotScreen: {x: 400, y: 300}, pivotDocument: {x: 400, y: 300}})` rotates around pivot — golden test with pre-computed expected values
5. `setImageTransform({scale: 1.5, rotation: 45, pivotScreen: {x: 400, y: 300}, pivotDocument: {x: 400, y: 300}})` combined — golden test
6. `resetImageTransform()` returns matrix to camera-only
7. Identity composition: camera+identity_image_transform = camera-only

**Verification**:
- All 982 existing tests pass
- New 5-7 tests pass
- `pnpm run build` hijau
- Pre-commit pipeline green

**If pilot reveals issues** (e.g., math doesn't match CSS):
- STOP. Re-derive. Do not proceed to Phase 1.

### Phase 1: Migrate Modern Crop to camera

**Goal**: Replace `modernImageTransformStyle` createMemo with effect that sets camera state.

**Files**:
- Modify: `apps/desktop/src/components/editor/CanvasViewport.tsx`
- Modify: `apps/desktop/src/components/editor/EditorShell.tsx`
- Modify: `apps/desktop/src/components/editor/__tests__/CanvasViewport.test.tsx`

**Tests added** (2-3 integration tests):
1. When modern crop is active, camera's `getImageTransform()` reflects the modern crop state
2. When modern crop exits, camera's `getImageTransform()` resets to identity
3. Canvas style no longer has CSS `transform` (already covered by Phase 1 regression test, but re-verify)

**Verification**:
- All 985 existing tests pass
- 19 Playwright E2E pass (Modern Crop flows still work)
- Visual QA in dev: rotate modern crop frame, scale, drag — all match previous behavior
- Pre-commit pipeline green

**If issues found**: use feature flag to rollback (see §11).

### Phase 2: Remove `isModernCropActive` flag

**Goal**: Remove the flag and conditional render paths.

**Files**:
- Modify: `apps/desktop/src/viewport/viewportCamera.ts` (remove flag)
- Modify: `apps/desktop/src/components/editor/CanvasViewport.tsx` (remove conditional)
- Modify: `apps/desktop/src/components/editor/EditorShell.tsx` (single render path)
- Modify: `apps/desktop/src/components/editor/__tests__/CanvasViewport.test.tsx` (update mocks)

**Tests added** (1-2 tests):
1. `isModernCropActive` no longer exists on camera (TypeScript compile error ensures this)

**Verification**:
- All 985 existing tests pass
- TypeScript build clean
- Pre-commit pipeline green

### Phase 3: Verify and document

**Files**:
- Modify: `docs/AI_HISTORY.md`
- Modify: `docs/FEATURES.md`
- Modify: `docs/AI_CURRENT_TASK.md`
- Modify: `docs/decisions/id-decision-log.md`

**Verification**:
- All 985+ tests pass
- 19 Playwright E2E pass
- `pnpm run build` green
- Manual QA in `pnpm tauri dev`:
  - Modern crop: drag, resize, rotate, ratio lock, size mode, apply, cancel
  - Compare with git stashed previous behavior for regression

## 9. Test Strategy

### Phase 0 (Pilot) tests — math verification

These are unit tests in `viewportCamera.test.ts`. They assert exact matrix values for specific configurations. Critical for catching math errors before integration.

```
it("VP matrix with identity image transform matches camera-only matrix", () => {
  // Set image transform with pivotScreen = null
  // Compare matrix to getViewProjectionMatrix with no image transform
});

it("VP matrix with image transform (offset only) shifts by offset in screen space", () => {
  // pan = (0, 0), zoom = 1
  // image transform: offsetX = 50, offsetY = 0, no pivot
  // Doc point (100, 100) → screen point (150, 100) (in screen pixel space)
  // Apply VP matrix, verify result
});

it("VP matrix with image transform (scale + pivot) scales around pivot", () => {
  // pivot_screen = (400, 300), pivot_doc = (400, 300)
  // image scale = 2
  // Doc point (200, 200) → after T(-pivot_doc) = (-200, -100)
  //   → after S(2) = (-400, -200)
  //   → after T(pivot_screen) = (0, 100)
  // Apply VP matrix, verify result
});

it("VP matrix with image transform (rotation + pivot) rotates around pivot", () => {
  // pivot at frame center (400, 300)
  // rotation = 90°
  // Doc point (500, 300) (right of pivot)
  //   → after T(-pivot) = (100, 0)
  //   → after R(90°) = (0, 100)  (using WebGL coord: +X right, +Y down)
  //   → after T(pivot) = (400, 400)
  // Apply VP matrix, verify result
});

// ... more tests
```

### Phase 1 (Modern Crop migration) tests — integration

```
it("Modern crop image transform propagates to camera state", () => {
  // Render CanvasViewport
  // Set activeTool = "crop", cropInteractionMode = "modern"
  // Set modernCropFrame = {x, y, w, h}
  // Set modernCropImageTransform = {offsetX, offsetY, rotation, scale}
  // Assert camera.getImageTransform() matches
});

it("Camera image transform resets when modern crop exits", () => {
  // Enter modern crop, set transform
  // Switch to move tool
  // Assert camera.getImageTransform() is identity
});
```

### Bug-fixing process

When a bug is found (in any phase):
1. **Reproduce** with failing test before fixing
2. **Use systematic-debugging skill** to identify root cause
3. **Fix with smallest change** that addresses root cause
4. **Verify** all tests pass + add regression test
5. **Document** in `AI_HISTORY.md` with Root Cause + Fix Rationale

## 10. Risks and Mitigations

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| Math doesn't match CSS | Medium | High | Golden tests in Phase 0 catch this BEFORE integration |
| Image transform interactions with pan/zoom/fit unexpected | Medium | High | Manual QA + Playwright E2E; feature flag for rollback |
| Render scheduling breaks (animation, on-demand) | Low | High | Existing 982 tests + 19 E2E catch rendering bugs |
| Pivot calculation wrong | Medium | High | Unit test for `getModernCropImagePivot` is unchanged; reuse |
| State sync issues (signal → camera) | Low | High | Existing engine↔signal contract test pattern (Phase 4.5) |
| Regression in unrelated areas (Classic crop, Move, etc.) | Low | Medium | All 982 + 19 E2E tests must pass before each commit |

## 11. Feature Flag (Rollback)

Add a feature flag `USE_GPU_CAMERA_FOR_MODERN_CROP` in `EditorContext.tsx`:

```ts
const [useGPUCameraForModernCrop, setUseGPUCameraForModernCrop] = createSignal(true);
```

In CanvasViewport's effect:
```ts
if (useGPUCameraForModernCrop()) {
  // New: set camera image transform
  camera.setImageTransform({...});
} else {
  // Old: don't touch camera; let CSS handle it
  // The CSS transform is in modernImageTransformStyle
  camera.resetImageTransform();
}
```

In EditorShell:
```ts
if (useGPUCameraForModernCrop()) {
  // Always use VP matrix
  const matrix = camera.getViewProjectionMatrix();
  renderer.render(state, matrix);
} else {
  // Old conditional
  if (camera.isModernCropActive) {
    renderer.render(state);
  } else {
    const matrix = camera.getViewProjectionMatrix();
    renderer.render(state, matrix);
  }
}
```

This allows instant rollback by setting the flag to `false`. Can be removed in Phase 4 (after the migration is stable).

## 12. Verification Pipeline (Mandatory per AGENTS.md)

For each phase:
- `pnpm.cmd --filter photrez-desktop test --run` (982 → 985+ tests)
- `pnpm.cmd run build` (tsc + Vite production)
- `pnpm.cmd --filter photrez-desktop exec playwright test` (19 E2E)
- Pre-commit pipeline green
- Manual QA in `pnpm tauri dev` for Modern Crop

For Phase 3 final:
- All 985+ tests pass
- 19 E2E pass
- Build green
- Manual QA passes

## 13. Documentation Updates

After successful Phase 3:
- `docs/AI_HISTORY.md` — entry: `[2026-06-15+] MIGRATION — Modern Crop to Camera Image Transform [COMPLETE]`
- `docs/FEATURES.md` line 193 — update Viewport section
- `docs/AI_CURRENT_TASK.md` — mark Phase 2 task COMPLETE
- `docs/decisions/id-decision-log.md` line 77-78 — note Phase 2 complete

## 14. Out of Scope (Future)

- Phase 3: smooth animations for image transform (e.g., when exiting modern crop, animate the image back to its "home" position). Now possible because camera has image transform state.
- Phase 4: remove the feature flag (after migration proven stable in production)
- Phase 5: enable image transform animation in `camera.animateTo()` for future features

## 15. References

- `docs/AI_CONTEXT.md` — AI rules
- `docs/AI_CURRENT_TASK.md §[2026-06-15]` — current task
- `docs/AI_HISTORY.md §[2026-06-13] BUG FIX — Viewport Camera Regression Recovery` — recovery pattern
- `docs/decisions/id-decision-log.md` line 77-78 — recovery decision + Phase 1 complete
- `docs/plans/2026-06-13-gpu-smooth-zoom-transitions-design.md` §8.2 — original Phase 2 deferral
- `docs/superpowers/specs/2026-06-15-overlay-container-screen-space-migration-design.md` — Phase 1 spec (precedent)
- `docs/superpowers/plans/2026-06-15-overlay-container-screen-space-migration.md` — Phase 1 plan (precedent)
- `apps/desktop/src/viewport/viewportCamera.ts` — camera class
- `apps/desktop/src/viewport/modernCropGeometry.ts` — pivot + geometry
- `apps/desktop/src/components/editor/CanvasViewport.tsx:138-329, 702-733` — current Modern Crop code
- `apps/desktop/src/components/editor/EditorShell.tsx:79-84` — current conditional render
