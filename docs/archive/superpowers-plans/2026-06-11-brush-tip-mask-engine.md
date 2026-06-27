# Brush Tip Mask Engine impl Plan
> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make Photrez brush and eraser feel like a normal desktop image editor: responsive soft brushes, full-diameter feather at hardness `0`, no obvious repeated dab circles, and no lag that grows with stroke length.

**Architecture:** Keep the MVP hot path in the TypeScript editor layer. `brushTipMask.ts` owns pure brush tip math and per-stroke mask operations. `paintStrokeRenderer.ts` remains a compatibility renderer for final/one-shot calls. `useBrushOverlay.ts` must own the interactive `PaintStrokeSession` and update only the new dabs produced since the previous pointer point.

**Tech Stack:** SolidJS, TypeScript, Vitest, Canvas 2D `ImageData`, `OffscreenCanvas`, existing `DocumentEngine`, existing brush/eraser overlay flow.

## Current Diagnosis

The current implementation is not finished enough for editor-like UX.

Confirmed issues:
- `useBrushOverlay.ts` imports brush-tip helpers but still calls `renderPaintStrokeToContext(...)` for preview.
- Brush preview clears the overlay and re-renders all `localPoints` on every pointer move.
- Eraser preview clears the eraser buffer, redraws the layer bitmap, then re-renders all `localPoints` on every pointer move.
- `paintStrokeRenderer.ts` soft path still uses full-canvas `getImageData(...)`, creates a full-canvas mask, loops the full point list, then `putImageData(...)`.
- Focused tests pass, but they only prove helper and compatibility rendering behavior. They do not prove the interactive overlay path is incremental.

Why this matters:
- Cost grows as the stroke gets longer.
- Large soft brushes feel laggy.
- Hardness `0` can still look like a narrow strong core with a halo instead of a soft editor brush.
- Tests may pass while the actual pointer-move UX remains wrong.

This plan supersedes the distance-field plan for interactive use. The distance-field renderer fixed some visual math, but it is too expensive because each redraw can cost:

```text
stroke bounding-box pixels * stroke segment count
```

The new target should keep pointer-move cost close to:

```text
new dab count * brush tip pixels
```

## Non-Negotiable Requirements

- Do not use Canvas `shadowBlur` as the primary soft-brush model.
- Do not scan every pixel against every stroke segment during pointer movement.
- Do not call the one-shot `renderPaintStrokeToContext(...)` from `useBrushOverlay.ts` during active brush/eraser pointer moves.
- Do not re-render the whole point list on every pointer move.
- Do not introduce new dependencies.
- Preserve hard brush behavior for `hardness >= 1`.
- Preserve eraser parity.
- Preserve transformed-layer preview alignment.
- Preserve lock transparency behavior for brush strokes.
- Keep document truth in the existing MVP `DocumentEngine` flow.
- Keep changes scoped to brush/eraser rendering and docs.

## Desired UX

- Size `70-100`, hardness `0`, flow `100` should be responsive during a long drag.
- Hardness `0` should feather to the full cursor diameter, not shrink to a small visible core.
- Hardness controls the solid-center radius, not the outer cursor diameter.
- Flow controls strength/build-up. Lower flow should feel lighter.
- One continuous drag must not show obvious circular stamp buildup.
- A second separate stroke may build up normally after the first stroke commits.
- Brush and eraser should share the same hardness, spacing, and tip behavior.

## File Responsibilities

- `apps/desktop/src/components/editor/brushTipMask.ts`
  - Brush tip alpha generation.
  - Brush tip cache.
  - Dab spacing.
  - Dab interpolation with carry.
  - Per-stroke max-alpha stamping.
  - Reusable mask compositing helpers.

- `apps/desktop/src/components/editor/__tests__/brushTipMask.test.ts`
  - Pure tests for falloff, cache keys, tip profile, spacing, interpolation carry, max-alpha stamping, and mask compositing.

- `apps/desktop/src/components/editor/paintStrokeRenderer.ts`
  - Compatibility renderer only.
  - Hard brush path can stay path-based.
  - Soft brush path should use brush-tip mask helpers.
  - It may use full-canvas `getImageData/putImageData` because it is not the interactive preview path.

- `apps/desktop/src/components/editor/__tests__/paintStrokeRenderer.test.ts`
  - Integration tests for the compatibility renderer.
  - Remove distance-field-specific assertions if they are still present.

- `apps/desktop/src/components/editor/useBrushOverlay.ts`
  - Main fix target.
  - Own active `PaintStrokeSession`.
  - Stamp only new dabs since the previous pointer point.
  - Composite preview from the session mask.
  - Never call `renderPaintStrokeToContext(...)` for active pointer-move preview.

- `apps/desktop/src/components/editor/brushToolState.ts`
  - Tune soft presets only after the incremental engine is working.

- `docs/AI_CURRENT_TASK.md`, `docs/AI_HISTORY.md`, `docs/FEATURES.md`, `docs/decisions/id-decision-log.md`
  - Keep task status and decisions in sync.

## Shared Types and Helpers

Use real TypeScript. Do not copy pseudo-code with `num`, `str`, `fn`, or `ret`.

Expected `PaintStrokeSession` shape in `useBrushOverlay.ts`:

```ts
interface PaintStrokeSession {
  layerId: string;
  isEraser: boolean;
  settingsKey: string;
  color: string;
  maskData: Uint8ClampedArray;
  maskWidth: number;
  maskHeight: number;
  lastPoint: { x: number; y: number } | null;
  spacingCarry: number;
  dabCount: number;
}
```

Expected reusable mask compositing API:

```ts
export function compositeMaskToImageData(
  imageData: ImageData,
  mask: Uint8ClampedArray,
  color: string,
  isEraser: boolean,
): void;

export function paintMaskToContext(
  ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D,
  mask: Uint8ClampedArray,
  width: number,
  height: number,
  color: string,
  isEraser: boolean,
): void;
```

For brush preview, `paintMaskToContext(...)` can create a transparent `ImageData`, composite the colored brush into it, then `putImageData(...)` to the overlay context.

For eraser preview, use the current layer bitmap as the initial image, then composite the mask as eraser alpha reduction, then upload the preview bitmap.

## Task 1: Fix Plan Baseline Before Coding

- Modify: `docs/AI_CURRENT_TASK.md`
- Read: `apps/desktop/src/components/editor/useBrushOverlay.ts`
- Read: `apps/desktop/src/components/editor/paintStrokeRenderer.ts`

- [ ] **Step 1: Confirm current interactive path is wrong**

Search:

```powershell
rg -n "renderPaintStrokeToContext|paintSession|stampBrushTipMaxAlpha|getImageData" apps/desktop/src/components/editor/useBrushOverlay.ts apps/desktop/src/components/editor/paintStrokeRenderer.ts
```

Expected:
- `useBrushOverlay.ts` still calls `renderPaintStrokeToContext(...)` during preview.
- `useBrushOverlay.ts` has no working `PaintStrokeSession`.
- `paintStrokeRenderer.ts` contains full-canvas soft compatibility rendering.

- [ ] **Step 2: Record implementation intent**

Append the active task note in `docs/AI_CURRENT_TASK.md` before code edits:

```md
- Implementation focus: replace the brush/eraser interactive preview path in `useBrushOverlay.ts` with an incremental `PaintStrokeSession`; keep `paintStrokeRenderer.ts` as one-shot compatibility only.
```

Expected: docs change only, textual diff.

## Task 2: Make Brush Tip Helpers Production-Grade

- Modify: `apps/desktop/src/components/editor/brushTipMask.ts`
- Modify: `apps/desktop/src/components/editor/__tests__/brushTipMask.test.ts`

- [ ] **Step 1: Add or verify tests for valid TypeScript helper API**

`brushTipMask.test.ts` must cover:

```ts
it("feathers the full radius at hardness 0", () => {
  expect(brushAlphaAtDistance(0, 50, 0, "cosine")).toBe(1);
  expect(brushAlphaAtDistance(25, 50, 0, "cosine")).toBeCloseTo(0.5, 5);
  expect(brushAlphaAtDistance(49, 50, 0, "cosine")).toBeGreaterThan(0);
  expect(brushAlphaAtDistance(50, 50, 0, "cosine")).toBe(0);
});

it("stamps with max alpha instead of additive alpha", () => {
  const tip = createBrushTip({ size: 3, hardness: 1, curve: "cosine" });
  const mask = new Uint8ClampedArray(9);
  stampBrushTipMaxAlpha(mask, 3, 3, tip, 1, 1, 0.5);
  stampBrushTipMaxAlpha(mask, 3, 3, tip, 1, 1, 0.5);
  expect(mask[4]).toBe(128);
});

it("carries leftover spacing across segments", () => {
  const first = interpolateDabs({ x: 0, y: 0 }, { x: 15, y: 0 }, 10, 0);
  expect(first.dabs).toEqual([{ x: 10, y: 0 }]);
  expect(first.carry).toBe(5);
  const second = interpolateDabs({ x: 15, y: 0 }, { x: 25, y: 0 }, 10, first.carry);
  expect(second.dabs).toEqual([{ x: 20, y: 0 }]);
});
```

- [ ] **Step 2: Ensure `brushTipMask.ts` uses real TypeScript**

All helper signatures must use `number`, `string`, `function`, and `return`, not pseudo aliases.

Core implementation contract:

```ts
export type BrushFalloffCurve = "cosine" | "smoothstep" | "quadratic";

export interface BrushTip {
  width: number;
  height: number;
  radius: number;
  data: Uint8ClampedArray;
}
```

- [ ] **Step 3: Add reusable compositing helpers**

Move or duplicate the current private `compositeMaskToImageData(...)` behavior into `brushTipMask.ts` so both renderer and overlay can share it.

Rules:
- Brush uses source-over math.
- Eraser reduces destination alpha.
- Respect color alpha.
- Skip pixels where mask alpha is `0`.

- [ ] **Step 4: Run focused helper tests**

```powershell
pnpm.cmd --filter photrez-desktop exec vitest run src/components/editor/__tests__/brushTipMask.test.ts --run
```

Expected: PASS.

## Task 3: Keep `paintStrokeRenderer.ts` as Compatibility Only

- Modify: `apps/desktop/src/components/editor/paintStrokeRenderer.ts`
- Modify: `apps/desktop/src/components/editor/__tests__/paintStrokeRenderer.test.ts`

- [ ] **Step 1: Remove stale distance-field ownership**

`paintStrokeRenderer.ts` should not own distance-field helpers for the soft branch. Remove or stop exporting stale helpers if tests no longer need them:

```ts
smoothstep01
brushAlphaAtDistance
distanceToSegment
getStrokeBounds
distanceToStrokePath
```

If a helper is still useful, move the real one to `brushTipMask.ts` and update tests to import it there.

- [ ] **Step 2: Use shared mask compositing helper**

Soft compatibility renderer should look structurally like this:

```ts
function renderSoftStrokeWithTipMask(
  ctx: CanvasRenderingContext2D,
  points: StrokePoint[],
  settings: PaintToolSettings,
  color: string,
  isEraser: boolean,
): void {
  const canvas = ctx.canvas;
  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const mask = new Uint8ClampedArray(canvas.width * canvas.height);
  const tip = getBrushTip({ size: settings.size, hardness: settings.hardness, curve: "cosine" });
  const spacing = getBrushDabSpacing(settings.size, settings.hardness, settings.flow);
  const alphaScale = settings.opacity * settings.flow;

  if (points.length === 1) {
    stampBrushTipMaxAlpha(mask, canvas.width, canvas.height, tip, points[0].x, points[0].y, alphaScale);
  } else {
    let carry = 0;
    stampBrushTipMaxAlpha(mask, canvas.width, canvas.height, tip, points[0].x, points[0].y, alphaScale);
    for (let i = 1; i < points.length; i += 1) {
      const result = interpolateDabs(points[i - 1], points[i], spacing, carry);
      carry = result.carry;
      for (const dab of result.dabs) {
        stampBrushTipMaxAlpha(mask, canvas.width, canvas.height, tip, dab.x, dab.y, alphaScale);
      }
    }
  }

  compositeMaskToImageData(imageData, mask, color, isEraser);
  ctx.putImageData(imageData, 0, 0);
}
```

Important: this full-canvas approach is acceptable only in this compatibility renderer. It is not acceptable in `useBrushOverlay.ts` pointer-move preview.

- [ ] **Step 3: Update renderer tests**

Renderer tests should prove:
- Soft branch uses mask rendering and writes expected color/alpha.
- Hard branch still uses normal path/arc behavior.
- Eraser soft branch reduces alpha.
- No test requires distance-field path scanning.

- [ ] **Step 4: Run focused renderer tests**

```powershell
pnpm.cmd --filter photrez-desktop exec vitest run src/components/editor/__tests__/brushTipMask.test.ts src/components/editor/__tests__/paintStrokeRenderer.test.ts --run
```

Expected: PASS.

## Task 4: Implement Incremental Session in `useBrushOverlay.ts`

- Modify: `apps/desktop/src/components/editor/useBrushOverlay.ts`

This is the main task. Do not skip it.

- [ ] **Step 1: Remove preview dependency on one-shot renderer**

Remove this import if it is only used for active preview:

```ts
import { renderPaintStrokeToContext } from "./paintStrokeRenderer";
```

Expected after implementation:

```powershell
rg -n "renderPaintStrokeToContext" apps/desktop/src/components/editor/useBrushOverlay.ts
```

Expected output: no matches.

- [ ] **Step 2: Add session state and key**

Add near existing overlay state:

```ts
let paintSession: PaintStrokeSession | null = null;

function getPaintSessionKey(settings: PaintToolSettings, color: string): string {
  return [
    Math.round(settings.size),
    Math.round(settings.hardness * 100),
    Math.round(settings.opacity * 100),
    Math.round(settings.flow * 100),
    color,
  ].join(":");
}
```

- [ ] **Step 3: Convert only the latest point**

The current code maps every point on every move:

```ts
const localPoints = points.map(...)
```

Replace preview work with latest-point processing:

```ts
const latestDocPoint = points.at(-1);
if (!latestDocPoint) return;

const latest = documentToLayerLocal(
  latestDocPoint.x,
  latestDocPoint.y,
  layer.transform,
  layer.width,
  layer.height,
);
```

The session already holds `lastPoint`, so it does not need all previous points.

- [ ] **Step 4: Start or reset session only when identity changes**

Reset conditions:
- No existing session.
- Active layer changed.
- Brush vs eraser changed.
- Settings/color key changed.
- Layer dimensions changed.
- `prevStrokePointCount === 0`.

Expected reset shape:

```ts
paintSession = {
  layerId: activeId,
  isEraser,
  settingsKey,
  color: fgColor(),
  maskData: new Uint8ClampedArray(layer.width * layer.height),
  maskWidth: layer.width,
  maskHeight: layer.height,
  lastPoint: null,
  spacingCarry: 0,
  dabCount: 0,
};
```

- [ ] **Step 5: Stamp only new dabs**

Use:

```ts
const tip = getBrushTip({ size: settings.size, hardness: settings.hardness, curve: "cosine" });
const spacing = getBrushDabSpacing(settings.size, settings.hardness, settings.flow);
const alphaScale = settings.opacity * settings.flow;

if (!paintSession.lastPoint) {
  stampBrushTipMaxAlpha(paintSession.maskData, layer.width, layer.height, tip, latest.x, latest.y, alphaScale);
  paintSession.dabCount += 1;
} else {
  const result = interpolateDabs(paintSession.lastPoint, latest, spacing, paintSession.spacingCarry);
  paintSession.spacingCarry = result.carry;
  for (const dab of result.dabs) {
    stampBrushTipMaxAlpha(paintSession.maskData, layer.width, layer.height, tip, dab.x, dab.y, alphaScale);
    paintSession.dabCount += 1;
  }
}

paintSession.lastPoint = latest;
```

- [ ] **Step 6: Composite brush preview from mask**

For brush:

```ts
overlayCtx.clearRect(0, 0, layer.width, layer.height);
paintMaskToContext(overlayCtx, paintSession.maskData, layer.width, layer.height, paintSession.color, false);

if (layer.lockTransparency && layer.imageBitmap) {
  overlayCtx.globalCompositeOperation = "destination-in";
  overlayCtx.drawImage(layer.imageBitmap, 0, 0);
  overlayCtx.globalCompositeOperation = "source-over";
}
```

- [ ] **Step 7: Composite eraser preview from mask**

For eraser:

```ts
if (!eraserPreviewCanvas || eraserPreviewCanvas.width !== layer.width || eraserPreviewCanvas.height !== layer.height) {
  eraserPreviewCanvas = new OffscreenCanvas(layer.width, layer.height);
  eraserPreviewCtx = eraserPreviewCanvas.getContext("2d");
}
if (!eraserPreviewCtx) return;

eraserPreviewCtx.clearRect(0, 0, layer.width, layer.height);
if (layer.imageBitmap) {
  eraserPreviewCtx.drawImage(layer.imageBitmap, 0, 0);
}
paintMaskToContext(eraserPreviewCtx, paintSession.maskData, layer.width, layer.height, "rgba(0,0,0,1)", true);
uploadEraserPreview(activeEngine, activeId, layer.width, layer.height);
```

- [ ] **Step 8: Clear session at all lifecycle exits**

Set `paintSession = null` in:
- Successful brush commit.
- Successful eraser commit.
- Stale commit branches that clear `prevStrokePointCount`.
- `clearPrevStrokePointCount`.
- Overlay ref cleanup if canvas ref becomes `null`.

- [ ] **Step 9: Run build to catch SolidJS/TypeScript issues**

```powershell
pnpm.cmd run build
```

Expected: PASS.

## Task 5: Add Regression Coverage for Interactive Contract

- Modify or create focused tests only where practical.
- Prefer pure tests if hook-level DOM canvas mocking becomes brittle.

- [ ] **Step 1: Add a pure session helper if needed**

If `useBrushOverlay.ts` becomes hard to test directly, extract only the session math to a small helper:

```text
apps/desktop/src/components/editor/paintStrokeSession.ts
apps/desktop/src/components/editor/__tests__/paintStrokeSession.test.ts
```

This helper may own:
- `createPaintStrokeSession(...)`
- `shouldResetPaintStrokeSession(...)`
- `stampPointIntoPaintStrokeSession(...)`

Do not extract SolidJS context, renderer upload, or canvas lifecycle into this helper.

- [ ] **Step 2: Test incremental behavior**

Required assertion:
- First point stamps at least one dab.
- Second point stamps only dabs for the segment from previous point to latest point.
- Replaying a second point does not require the full point history.
- Session uses max-alpha semantics.

- [ ] **Step 3: Test eraser/brush parity**

Required assertion:
- Same size/hardness/flow creates the same mask for brush and eraser.
- Only compositing mode differs.

- [ ] **Step 4: Run focused tests**

```powershell
pnpm.cmd --filter photrez-desktop exec vitest run src/components/editor/__tests__/brushTipMask.test.ts src/components/editor/__tests__/paintStrokeRenderer.test.ts --run
```

If `paintStrokeSession.test.ts` is added, include it in the command.

Expected: PASS.

## Task 6: Tune Presets After Engine Is Correct

- Modify: `apps/desktop/src/components/editor/brushToolState.ts`
- Modify: `apps/desktop/src/components/editor/__tests__/brushToolState.test.ts`

Do this after Task 4, not before.

- [ ] **Step 1: Adjust soft defaults**

Use these defaults unless manual QA proves a better value:

```ts
{ id: "soft-round",  name: "Soft Round",  size: 40,  hardness: 0.0, opacity: 1.0,  flow: 0.55, smoothing: 0, tool: "both" },
{ id: "large-soft",  name: "Large Soft",  size: 100, hardness: 0.0, opacity: 0.85, flow: 0.35, smoothing: 0, tool: "both" },
{ id: "soft-eraser", name: "Soft Eraser", size: 50,  hardness: 0.0, opacity: 1.0,  flow: 0.55, smoothing: 0, tool: "eraser" },
```

Reason: in normal editors, low hardness presets usually pair with lower flow so the first drag feels natural instead of heavy.

- [ ] **Step 2: Update preset tests**

Update existing preset assertions to match the new values.

- [ ] **Step 3: Run preset tests**

```powershell
pnpm.cmd --filter photrez-desktop exec vitest run src/components/editor/__tests__/brushToolState.test.ts --run
```

Expected: PASS.

## Task 7: Manual Visual and Performance QA

- Run: `pnpm.cmd tauri dev`
- Test on a portrait or blank document with high-contrast background.

- [ ] **Step 1: Test soft brush**

Settings:
- Size `85`
- Hardness `0`
- Flow `100`
- Strength/opacity `100`

Expected:
- Pointer tracking feels responsive during a long stroke.
- Stroke has full-diameter feather.
- Edge does not become a hard sausage.
- No obvious repeated circular pattern at normal drawing speed.

- [ ] **Step 2: Test flow**

Settings:
- Size `85`
- Hardness `0`
- Flow `20`, `50`, `100`

Expected:
- Flow `20` is visibly lighter.
- Flow `50` is medium.
- Flow `100` is strong.
- The same single stroke does not harden its own soft edge through repeated overlap.

- [ ] **Step 3: Test hardness**

Settings:
- Size `85`
- Flow `100`
- Hardness `0`, `50`, `100`

Expected:
- Hardness `0`: broad feather.
- Hardness `50`: visible solid center plus soft edge.
- Hardness `100`: crisp hard round stroke.

- [ ] **Step 4: Test eraser**

Expected:
- Eraser softness matches brush softness.
- Eraser preview does not lag more than brush preview.
- Eraser commit matches preview.

- [ ] **Step 5: Test transformed layer**

Use a layer with scale, rotation, and opacity.

Expected:
- Brush preview stays aligned with committed stroke.
- Existing transformed-layer overlay behavior remains intact.

## Task 8: Documentation Updates

- Modify: `docs/AI_CURRENT_TASK.md`
- Modify: `docs/AI_HISTORY.md`
- Modify: `docs/FEATURES.md`
- Modify: `docs/decisions/id-decision-log.md`

- [ ] **Step 1: Update `FEATURES.md` after implementation**

Replace the planned brush-tip row with:

```md
| DONE | Soft edge rendering via cached brush-tip mask + incremental per-stroke max-alpha mask (fast soft brush, no within-stroke buildup) |
```

Keep existing brush rows that remain true.

- [ ] **Step 2: Append implementation entry to `AI_HISTORY.md`**

Use this structure:

```md
## [2026-06-11] BUG FIX - Brush Tip Mask Engine Performance [COMPLETE]

### Kategori: BUG FIX / BRUSH / ERASER / RENDERER / UX / PERFORMANCE

**Root Cause:**
The previous interactive brush preview still rendered the full point list through the one-shot soft renderer on every pointer move. That path used full-canvas mask generation and full-canvas ImageData compositing, so cost grew as a stroke got longer.

**Fix Rationale:**
Move active pointer-drag preview to an incremental `PaintStrokeSession`. Each pointer move stamps only new dabs into a per-stroke max-alpha mask, then composites preview from the mask. This preserves soft edges without within-stroke buildup while keeping runtime proportional to new dabs.

**Rincian Perubahan:**
1. `brushTipMask.ts` - brush tip generation, cache, spacing, interpolation, max-alpha stamping, and mask compositing helpers.
2. `useBrushOverlay.ts` - incremental active stroke session for brush and eraser preview.
3. `paintStrokeRenderer.ts` - one-shot compatibility path uses the same brush-tip mask semantics.
4. `brushToolState.ts` - soft preset flow/hardness tuning.

### Verification
- PASS: focused brush tests
- PASS: `pnpm.cmd run build`
- PASS: full frontend tests
- PASS: `cargo test --workspace`
- MANUAL PASS: size 85, hardness 0, flow 100 is responsive and full-diameter feathered.
```

- [ ] **Step 3: Update decision log**

Set brush engine performance decision to locked only after implementation and manual QA:

```md
| Brush engine performance | Soft brush interactive rendering uses cached brush-tip alpha masks plus incremental per-stroke max-alpha masks. The previous distance-field path is superseded for interactive use because its cost grows with stroke length. | Locked 2026-06-11 |
```

- [ ] **Step 4: Verify docs diff**

```powershell
git diff -- docs/AI_CURRENT_TASK.md docs/AI_HISTORY.md docs/FEATURES.md docs/decisions/id-decision-log.md docs/superpowers/plans/2026-06-11-brush-tip-mask-engine.md
```

Expected: textual diff only.

## Full Verification Gate

Run after implementation:

```powershell
pnpm.cmd --filter photrez-desktop exec vitest run src/components/editor/__tests__/brushTipMask.test.ts src/components/editor/__tests__/paintStrokeRenderer.test.ts src/components/editor/__tests__/brushToolState.test.ts --run
pnpm.cmd run build
pnpm.cmd --filter photrez-desktop test --run --pool=threads --maxWorkers=1
cargo test --workspace
pnpm.cmd tauri dev
```

Expected:
- Focused brush tests PASS.
- Frontend build PASS.
- Full frontend suite PASS.
- Rust workspace PASS, or unrelated pre-existing Rust failure is documented exactly.
- App launches.
- Manual brush QA confirms size `85`, hardness `0`, flow `100` is responsive and visually comparable to normal image editors.

## Copy-Ready AI Implementation Prompt

```text
You are working in D:\Project\image-studio on Photrez. Follow AGENTS.md exactly.

Before modifying code, read:
- docs/AI_CONTEXT.md
- docs/AI_CURRENT_TASK.md
- docs/FEATURES.md
- docs/ARCHITECTURE.md
- docs/AI_HISTORY.md

Use lean-ctx tools where possible.

Task: implement docs/superpowers/plans/2026-06-11-brush-tip-mask-engine.md.

Context:
The current brush-tip implementation is incomplete. `brushTipMask.ts` and a soft one-shot compatibility path exist, but the interactive preview path in `useBrushOverlay.ts` still calls `renderPaintStrokeToContext(...)` on every pointer move and re-renders the full point list. This is why size 70-100, hardness 0 still feels laggy and visually not editor-like.

Primary goal:
Replace the brush/eraser active preview path in `useBrushOverlay.ts` with an incremental `PaintStrokeSession`. During a drag, stamp only new dabs from the previous local point to the latest local point into a per-stroke max-alpha mask, then composite preview from that mask.

Do not:
- Do not use Canvas shadowBlur as the primary softness model.
- Do not scan every pixel against every stroke segment on pointer move.
- Do not call `renderPaintStrokeToContext(...)` from `useBrushOverlay.ts` during active pointer-move preview.
- Do not re-render the full point list every pointer move.
- Do not add dependencies.
- Do not use React patterns. This is SolidJS.

Important files:
- apps/desktop/src/components/editor/brushTipMask.ts
- apps/desktop/src/components/editor/__tests__/brushTipMask.test.ts
- apps/desktop/src/components/editor/paintStrokeRenderer.ts
- apps/desktop/src/components/editor/__tests__/paintStrokeRenderer.test.ts
- apps/desktop/src/components/editor/useBrushOverlay.ts
- apps/desktop/src/components/editor/brushToolState.ts

Implementation priorities:
1. Make `brushTipMask.ts` real production TypeScript and add reusable mask compositing helpers.
2. Keep `paintStrokeRenderer.ts` as one-shot compatibility only.
3. Implement `PaintStrokeSession` in `useBrushOverlay.ts`.
4. Ensure `rg -n "renderPaintStrokeToContext" apps/desktop/src/components/editor/useBrushOverlay.ts` returns no matches.
5. Preserve hard brush behavior, eraser parity, transformed-layer preview alignment, and lock transparency behavior.
6. Tune soft presets only after the incremental engine works.

Verification:
Run focused tests after each task. Final commands:
pnpm.cmd --filter photrez-desktop exec vitest run src/components/editor/__tests__/brushTipMask.test.ts src/components/editor/__tests__/paintStrokeRenderer.test.ts src/components/editor/__tests__/brushToolState.test.ts --run
pnpm.cmd run build
pnpm.cmd --filter photrez-desktop test --run --pool=threads --maxWorkers=1
cargo test --workspace
pnpm.cmd tauri dev

Manual acceptance:
- Brush size 85, hardness 0, flow 100 feels responsive.
- Stroke is full-diameter feathered, not a thin core with a halo.
- No obvious repeated circular dab pattern at normal drawing speed.
- Flow 20/50/100 visibly changes strength.
- Eraser softness matches brush softness.
- Transformed-layer preview still aligns with committed stroke.

After implementation, update docs/AI_CURRENT_TASK.md, docs/AI_HISTORY.md, docs/FEATURES.md, and docs/decisions/id-decision-log.md. Do not overwrite or truncate history. Append or minimally edit the current rows.
```

## Self-Review

- Spec coverage: Covers lag, visual softness, no within-stroke buildup, flow behavior, eraser parity, transformed-layer preview, tests, manual QA, docs, and handoff prompt.
- Current implementation mismatch: Explicitly identifies `useBrushOverlay.ts` as the unfinished part and makes it the main task.
- Placeholder scan: No unresolved placeholder tokens or vague catch-all instructions remain.
- Type consistency: Plan uses real TypeScript syntax and current project types.
- Scope check: One subsystem only, brush/eraser rendering performance and feel. No crop, export, shell, WebGL compositor, or document-truth refactor.
