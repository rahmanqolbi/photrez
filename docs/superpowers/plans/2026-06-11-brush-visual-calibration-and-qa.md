# Brush Visual Calibration and Pixel QA impl Plan
> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the already-implemented brush-tip mask engine visibly feel like a normal image editor brush by calibrating hardness `0`, spacing, and flow behavior with pixel-profile tests and manual screenshot QA.

**Architecture:** Do not replace the incremental `PaintStrokeSession` architecture unless inspection proves it is missing. Keep `useBrushOverlay.ts` as the interactive owner. Tune the pure brush-tip profile in `brushTipMask.ts`, add measurable pixel-profile tests, then tune presets only if the engine output is correct but the default UX still feels too heavy.

**Tech Stack:** SolidJS, TypeScript, Vitest, Canvas 2D `ImageData`, existing `brushTipMask.ts`, existing `useBrushOverlay.ts`, existing `paintStrokeRenderer.ts`.

## Current Diagnosis

Manual screenshot review still shows little perceived improvement at:

```text
Size: 75
Hardness: 0
Strength/Opacity: 100
Flow: 100
Zoom: 200%
```

The stroke still reads as:
- a strong narrow vertical orange core,
- a dark/soft halo around it,
- visible repeated dab bands along the stroke,
- not enough full-diameter feather for a soft round brush.

Important current state:
- `useBrushOverlay.ts` already has `PaintStrokeSession`.
- Soft path no longer calls `renderPaintStrokeToContext(...)` from active pointer-move preview.
- Therefore the next fix should not be another broad architecture rewrite.
- The likely remaining causes are brush alpha curve, dab spacing/carry, tip stamping quantization, and flow semantics.

## Non-Negotiable Requirements

- Do not go back to Canvas `shadowBlur`.
- Do not re-render the full point list on every pointer move for soft brush preview.
- Do not remove lock transparency enforcement in `useBrushOverlay.ts`.
- Do not break eraser parity.
- Do not change UI layout or styling.
- Do not add dependencies.
- Use measurable tests before declaring the visual issue fixed.

## Target Visual Behavior

For size `75`, hardness `0`, flow `100`:
- The visible soft edge should occupy most of the cursor radius.
- The stroke may have a strong center, but the center should not read as a narrow hard stripe.
- Alpha should decline smoothly from center to the cursor boundary.
- At normal drawing speed, dab bands should not be visible.
- At zoom `200%`, some pixel detail is acceptable, but the stroke should not look like stacked circular stamps.

For size `75`, hardness `50`, flow `100`:
- The center should be clearly more solid than hardness `0`.
- The edge should still feather.

For size `75`, hardness `100`, flow `100`:
- Stroke should be crisp and hard round.

## Files

- Modify: `apps/desktop/src/components/editor/brushTipMask.ts`
  - Tune falloff curve, dab spacing, optional subpixel stamping, and mask helpers.

- Modify: `apps/desktop/src/components/editor/__tests__/brushTipMask.test.ts`
  - Add pixel-profile tests for hardness `0`, `50`, and `100`.

- Modify: `apps/desktop/src/components/editor/paintStrokeRenderer.ts`
  - Only if one-shot compatibility path must mirror the tuned brush-tip behavior.

- Modify: `apps/desktop/src/components/editor/__tests__/paintStrokeRenderer.test.ts`
  - Add integration test for soft stroke visual profile if needed.

- Modify: `apps/desktop/src/components/editor/brushToolState.ts`
  - Only tune presets after raw custom brush output is correct.

- Modify: `docs/AI_CURRENT_TASK.md`, `docs/AI_HISTORY.md`, `docs/FEATURES.md`
  - Keep planning and completion status honest.

## Task 1: Confirm Runtime Path and Baseline

- [ ] **Step 1: Verify soft preview no longer uses one-shot renderer**

Run:

```powershell
rg -n "renderPaintStrokeToContext|PaintStrokeSession|paintMaskToContext|stampBrushTipMaxAlpha" apps/desktop/src/components/editor/useBrushOverlay.ts
```

Expected:
- No `renderPaintStrokeToContext` match in `useBrushOverlay.ts`.
- `PaintStrokeSession`, `paintMaskToContext`, and `stampBrushTipMaxAlpha` exist.

- [ ] **Step 2: Verify no pseudo TypeScript remains**

Run:

```powershell
rg -n "\bnum\b|\bstr\b|export fn|\bret\b" apps/desktop/src/components/editor/brushTipMask.ts
```

Expected:
- No matches.

If there are matches, fix this first. Use real TypeScript only: `number`, `string`, `function`, `return`.

- [ ] **Step 3: Run current focused tests**

Run:

```powershell
pnpm.cmd --filter photrez-desktop exec vitest run src/components/editor/__tests__/brushTipMask.test.ts src/components/editor/__tests__/paintStrokeRenderer.test.ts --run
```

Expected:
- PASS before calibration changes.

## Task 2: Add Pixel-Profile Tests for Brush Tip

- Modify: `apps/desktop/src/components/editor/__tests__/brushTipMask.test.ts`

- [ ] **Step 1: Add radial sample helper in tests**

Add a test helper:

```ts
function alphaAt(tip: BrushTip, x: number, y: number): number {
  return tip.data[(y * tip.width + x) * 4 + 3] / 255;
}
```

- [ ] **Step 2: Add hardness 0 profile test**

Add:

```ts
it("hardness 0 uses a broad feather instead of a narrow hard core", () => {
  const tip = createBrushTip({ size: 75, hardness: 0, curve: "cosine" });
  const c = Math.floor(tip.width / 2);

  const center = alphaAt(tip, c, c);
  const r25 = alphaAt(tip, c + Math.round(75 * 0.125), c);
  const r50 = alphaAt(tip, c + Math.round(75 * 0.25), c);
  const r75 = alphaAt(tip, c + Math.round(75 * 0.375), c);
  const edge = alphaAt(tip, tip.width - 1, c);

  expect(center).toBeGreaterThan(0.95);
  expect(r25).toBeGreaterThan(0.55);
  expect(r50).toBeGreaterThan(0.20);
  expect(r50).toBeLessThan(r25);
  expect(r75).toBeLessThan(r50);
  expect(edge).toBeLessThan(0.05);
});
```

This test encodes the UX target: hardness `0` should still fill the whole radius with a visible feather, not collapse into a tiny stripe.

- [ ] **Step 3: Add hardness comparison test**

Add:

```ts
it("hardness increases solid center without changing outer diameter", () => {
  const soft = createBrushTip({ size: 75, hardness: 0, curve: "cosine" });
  const medium = createBrushTip({ size: 75, hardness: 0.5, curve: "cosine" });
  const hard = createBrushTip({ size: 75, hardness: 1, curve: "cosine" });
  const c = Math.floor(soft.width / 2);
  const sampleX = c + Math.round(75 * 0.25);

  expect(alphaAt(medium, sampleX, c)).toBeGreaterThan(alphaAt(soft, sampleX, c));
  expect(alphaAt(hard, sampleX, c)).toBeGreaterThan(0.95);
  expect(alphaAt(soft, soft.width - 1, c)).toBeLessThan(0.05);
  expect(alphaAt(medium, medium.width - 1, c)).toBeLessThan(0.05);
  expect(alphaAt(hard, hard.width - 1, c)).toBeLessThan(0.05);
});
```

- [ ] **Step 4: Run tests and observe failure/pass**

Run:

```powershell
pnpm.cmd --filter photrez-desktop exec vitest run src/components/editor/__tests__/brushTipMask.test.ts --run
```

Expected:
- If current curve already passes, move to Task 3.
- If it fails, tune `brushAlphaAtDistance` or `falloff` in Task 3.

## Task 3: Tune Falloff Curve for Editor-Like Softness

- Modify: `apps/desktop/src/components/editor/brushTipMask.ts`

- [ ] **Step 1: Prefer a broad soft curve for hardness 0**

If cosine is too narrow visually, add a dedicated default curve or adjust `cosine` to keep mid-radius more visible.

Recommended first option:

```ts
export type BrushFalloffCurve = "cosine" | "smoothstep" | "quadratic" | "soft";

export function falloff(x: number, curve: BrushFalloffCurve = "soft"): number {
  const v = clamp01(x);
  if (curve === "smoothstep") return v * v * (3 - 2 * v);
  if (curve === "quadratic") return v * v;
  if (curve === "cosine") return 0.5 - 0.5 * Math.cos(Math.PI * v);
  return Math.pow(v, 0.75);
}
```

Use `"soft"` as the default curve for `getBrushTip(...)` calls in brush rendering if manual QA confirms it feels better.

- [ ] **Step 2: Keep edge alpha near zero**

Do not make the entire circle uniformly translucent. The outer boundary must still fade to zero near the cursor edge.

- [ ] **Step 3: Run profile tests**

Run:

```powershell
pnpm.cmd --filter photrez-desktop exec vitest run src/components/editor/__tests__/brushTipMask.test.ts --run
```

Expected:
- PASS.

## Task 4: Reduce Visible Dab Banding

- Modify: `apps/desktop/src/components/editor/brushTipMask.ts`
- Modify: `apps/desktop/src/components/editor/__tests__/brushTipMask.test.ts`

- [ ] **Step 1: Add spacing test for size 75 hardness 0**

Add:

```ts
it("uses dense spacing for large soft brushes", () => {
  expect(getBrushDabSpacing(75, 0, 1)).toBeLessThanOrEqual(6);
  expect(getBrushDabSpacing(75, 0, 1)).toBeGreaterThanOrEqual(1);
});
```

- [ ] **Step 2: Tune soft spacing**

If current spacing is too high, use:

```ts
export function getBrushDabSpacing(size: number, hardness: number, flow: number): number {
  const h = clamp01(hardness);
  const baseRatio = h >= 0.95 ? 0.16 : 0.075 + 0.045 * h;
  const flowRatio = flow < 0.5 ? 0.85 : 1;
  return Math.max(1, Math.min(18, Math.round(size * baseRatio * flowRatio)));
}
```

For size `75`, hardness `0`, flow `1`, this gives spacing about `6px`.

- [ ] **Step 3: Run tests**

Run:

```powershell
pnpm.cmd --filter photrez-desktop exec vitest run src/components/editor/__tests__/brushTipMask.test.ts --run
```

Expected:
- PASS.

## Task 5: Investigate Subpixel Stamping if Bands Remain

- Modify: `apps/desktop/src/components/editor/brushTipMask.ts`
- Modify: `apps/desktop/src/components/editor/__tests__/brushTipMask.test.ts`

Only do this if Task 4 still leaves visible banding.

- [ ] **Step 1: Identify integer snapping**

Current likely issue:

```ts
const left = Math.round(centerX - (tip.width - 1) / 2);
const top = Math.round(centerY - (tip.height - 1) / 2);
```

This snaps every dab to integer pixels. At zoom `200%`, that can make bands more visible.

- [ ] **Step 2: Add a test for fractional centers**

Add a test that stamps at `10.25` and `10.75` and asserts the masks are not identical if subpixel stamping is implemented.

- [ ] **Step 3: Implement subpixel only if worth it**

Preferred low-risk option:
- Keep integer stamping for now if denser spacing fixes banding.
- Implement bilinear sampling only if manual QA still shows strong stepping.

Do not add complex resampling unless there is visual proof it is needed.

## Task 6: Verify One-Shot Renderer Matches Tip Profile

- Modify: `apps/desktop/src/components/editor/paintStrokeRenderer.ts`
- Modify: `apps/desktop/src/components/editor/__tests__/paintStrokeRenderer.test.ts`

- [ ] **Step 1: Ensure first point is stamped in multi-point soft path**

The soft compatibility renderer should stamp the first point before interpolating later segments:

```ts
stampBrushTipMaxAlpha(mask, canvas.width, canvas.height, tip, points[0].x, points[0].y, alphaScale);
```

Then interpolate from `points[i - 1]` to `points[i]`.

- [ ] **Step 2: Add integration test**

Test a horizontal soft stroke and sample center/mid/edge pixels to verify the output uses the same brush-tip profile.

- [ ] **Step 3: Run renderer tests**

Run:

```powershell
pnpm.cmd --filter photrez-desktop exec vitest run src/components/editor/__tests__/paintStrokeRenderer.test.ts --run
```

Expected:
- PASS.

## Task 7: Manual QA With Required Screenshots

- Run: `pnpm.cmd tauri dev`

- [ ] **Step 1: Brush visual QA**

On the same portrait/background used in the user screenshots:

Settings:
- Size `75`
- Hardness `0`
- Strength `100`
- Flow `100`
- Smooth `0`
- Zoom `200%`

Draw:
- one slow vertical stroke,
- one faster curved stroke,
- one dot/click.

Expected:
- Stroke visibly differs from the current screenshot.
- It should look less like a thin stripe with halo.
- Dab bands should be minimal at normal drawing speed.
- Dot should fill the cursor diameter with broad feather.

- [ ] **Step 2: Compare flow**

Settings:
- Size `75`
- Hardness `0`
- Flow `20`, `50`, `100`

Expected:
- `20` is light.
- `50` is moderate.
- `100` is strong but still feathered.

- [ ] **Step 3: Compare hardness**

Settings:
- Size `75`
- Flow `100`
- Hardness `0`, `50`, `100`

Expected:
- `0` broad feather.
- `50` larger solid center.
- `100` hard edge.

- [ ] **Step 4: Eraser parity**

Repeat hardness `0` with eraser.

Expected:
- Eraser feather shape matches brush feather shape.
- Commit matches preview.

## Task 8: Documentation Updates

- Modify: `docs/AI_CURRENT_TASK.md`
- Modify: `docs/AI_HISTORY.md`
- Modify: `docs/FEATURES.md`

- [ ] **Step 1: Update `FEATURES.md`**

If implementation passes manual QA, add or update:

```md
| ✅ DONE | Brush visual calibration: hardness 0 broad feather, dense soft spacing, and pixel-profile regression tests |
```

- [ ] **Step 2: Append `AI_HISTORY.md`**

Use:

```md
## [2026-06-11] BUG FIX - Brush Visual Calibration and Pixel QA [COMPLETE]

### Kategori: BUG FIX / BRUSH / ERASER / UX / PERFORMANCE

**Root Cause:**
The brush-tip mask engine was incremental, but the default alpha profile and/or dab spacing still made hardness 0 read visually as a narrow strong core with a halo and visible dab bands.

**Fix Rationale:**
Calibrate the brush-tip alpha falloff and soft-brush dab spacing using pixel-profile tests before relying on manual perception. Keep the incremental overlay architecture intact and tune only the pure brush profile and compatibility renderer behavior.

**Rincian Perubahan:**
1. `brushTipMask.ts` - tuned soft falloff and spacing.
2. `brushTipMask.test.ts` - added radial alpha profile and spacing regression tests.
3. `paintStrokeRenderer.ts` / tests - kept compatibility rendering aligned with brush-tip behavior.

### Verification
- PASS: focused brush tests
- PASS: `pnpm.cmd run build`
- PASS: full frontend tests
- MANUAL PASS: screenshot QA for size 75 hardness 0 flow 100.
```

- [ ] **Step 3: Verify docs diff**

Run:

```powershell
git diff -- docs/AI_CURRENT_TASK.md docs/AI_HISTORY.md docs/FEATURES.md docs/superpowers/plans/2026-06-11-brush-visual-calibration-and-qa.md
```

Expected:
- Textual diff only.

## Full Verification Gate

Run after implementation:

```powershell
pnpm.cmd --filter photrez-desktop exec vitest run src/components/editor/__tests__/brushTipMask.test.ts src/components/editor/__tests__/paintStrokeRenderer.test.ts --run
pnpm.cmd run build
pnpm.cmd --filter photrez-desktop test --run --pool=threads --maxWorkers=1
cargo test --workspace
pnpm.cmd tauri dev
```

## Copy-Ready AI Implementation Prompt

```text
You are working in D:\Project\image-studio on Photrez. Follow AGENTS.md exactly.

Before modifying code, read docs/AI_CONTEXT.md, docs/AI_CURRENT_TASK.md, docs/FEATURES.md, docs/ARCHITECTURE.md, and docs/AI_HISTORY.md. Use lean-ctx tools where possible.

Task: implement docs/superpowers/plans/2026-06-11-brush-visual-calibration-and-qa.md.

Context:
The incremental brush-tip mask engine appears to be implemented, but manual QA still shows little visual difference at size 75, hardness 0, flow 100. The stroke looks like a narrow strong core with a halo and visible dab bands. Do not redo the overlay architecture unless inspection proves it is missing.

Primary goal:
Calibrate the brush-tip visual profile and spacing so hardness 0 produces a broad full-diameter feather and the stroke no longer reads like stacked circular dabs.

Do first:
1. Verify `useBrushOverlay.ts` no longer calls `renderPaintStrokeToContext(...)` for soft pointer-move preview.
2. Verify `brushTipMask.ts` is real TypeScript with no pseudo tokens like `num`, `str`, `export fn`, or `ret`.
3. Add pixel-profile tests in `brushTipMask.test.ts` for size 75 hardness 0/50/100.

Implementation focus:
- Tune `falloff(...)`, `brushAlphaAtDistance(...)`, and `getBrushDabSpacing(...)`.
- Keep `PaintStrokeSession` incremental.
- Keep lock transparency and eraser parity.
- Tune presets only after raw custom brush output is correct.

Acceptance:
- Size 75, hardness 0, flow 100 visibly differs from the current screenshot.
- Dot and stroke have full-diameter feather.
- Dab bands are not obvious at normal drawing speed.
- Flow 20/50/100 visibly changes strength.
- Eraser softness matches brush softness.

Final verification:
pnpm.cmd --filter photrez-desktop exec vitest run src/components/editor/__tests__/brushTipMask.test.ts src/components/editor/__tests__/paintStrokeRenderer.test.ts --run
pnpm.cmd run build
pnpm.cmd --filter photrez-desktop test --run --pool=threads --maxWorkers=1
cargo test --workspace
pnpm.cmd tauri dev

After implementation, update docs/AI_CURRENT_TASK.md, docs/AI_HISTORY.md, and docs/FEATURES.md. Do not overwrite history.
```

## Self-Review

- Spec coverage: Covers the user's actual remaining issue: no visible improvement after engine work.
- Scope: Focused on brush visual calibration and proof, not a second broad architecture rewrite.
- Testability: Requires pixel-profile tests before visual claims.
- UX acceptance: Includes the exact size/hardness/flow scenario from the screenshot.
