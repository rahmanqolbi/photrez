# Reference-Calibrated Round Brush Hardness Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace Photrez's bounded inverse-quadratic soft round tip with the exact user-supplied reference-calibrated super-Gaussian profile while preserving cached stamping, nominal cursor size, and existing stroke behavior.

**Architecture:** A pure `brushHardnessProfile.ts` module owns calibration, monotone interpolation, exact alpha evaluation, and finite 8-bit support. The existing `brushTipMask.ts` remains the sole raster/cache boundary and adds only the two supplied raster special cases; `paintStrokeRenderer.ts` continues consuming one cached tip per stroke.

**Tech Stack:** TypeScript 5.2, Vitest 4.1, CPU brush masks, SolidJS production wiring, WebGL2 layer upload.

## File Structure

- Create `apps/desktop/src/components/editor/brushHardnessProfile.ts`: pure calibration and support math.
- Create `apps/desktop/src/components/editor/__tests__/brushHardnessProfile.test.ts`: numeric contracts.
- Modify `apps/desktop/src/components/editor/brushTipMask.ts`: calibrated soft rasterization through the existing cache.
- Modify `apps/desktop/src/components/editor/__tests__/brushTipMask.test.ts`: raster, small-AA, and cache contracts.
- Modify `apps/desktop/src/components/editor/__tests__/brushReferenceAudit.test.ts`: measured reference behavior.
- Modify `apps/desktop/src/components/editor/__tests__/paintStrokeRenderer.test.ts`: production tail stamping.
- Modify `docs/AI_CURRENT_TASK.md`, `docs/FEATURES.md`, and `docs/AI_HISTORY.md`: results and evidence.

## Task 1: Lock the Exact Calibration API

**Files:**
- Create: `apps/desktop/src/components/editor/brushHardnessProfile.ts`
- Test: `apps/desktop/src/components/editor/__tests__/brushHardnessProfile.test.ts`

- [ ] **Step 1: Write failing table-driven tests**

The test imports `brushAlpha`, `getBrushProfileParameters`, `getBrushProfileSupportNorm`, `BRUSH_HARD_EDGE_THRESHOLD`, and `MIN_RELIABLE_BRUSH_DIAMETER_PX`. Use Vitest 4.1 `test.each` for these exact knots:

```ts
const knots = [
  [0, 0.661, 2.00],
  [0.10, 0.738, 2.68],
  [0.25, 0.830, 4.07],
  [0.50, 0.935, 8.23],
  [0.75, 0.990, 20.22],
  [0.90, 1.004, 51.20],
  [1.00, 1.006, 60.00],
] as const;

test.each(knots)("returns the calibration knot at hardness %f", (hardness, sigma, n) => {
  expect(getBrushProfileParameters(hardness).sigma).toBeCloseTo(sigma, 12);
  expect(getBrushProfileParameters(hardness).n).toBeCloseTo(n, 12);
});
```

Also assert:

```ts
expect(brushAlpha(0.5, 0)).toBeCloseTo(Math.exp(-Math.pow(0.5 / 0.661, 2)), 12);
expect(brushAlpha(1, 0.5)).toBeCloseTo(Math.exp(-Math.pow(1 / 0.935, 8.23)), 12);
expect(BRUSH_HARD_EDGE_THRESHOLD).toBe(0.97);
expect(brushAlpha(1, 0.97)).toBe(1);
expect(brushAlpha(1.000001, 0.97)).toBe(0);
expect(MIN_RELIABLE_BRUSH_DIAMETER_PX).toBe(22);
const support = getBrushProfileSupportNorm(0);
expect(brushAlpha(support, 0)).toBeCloseTo(0.5 / 255, 12);
expect(brushAlpha(support + 0.01, 0)).toBeLessThan(0.5 / 255);
```

- [ ] **Step 2: Verify RED**

```powershell
pnpm.cmd --filter photrez-desktop exec vitest run src/components/editor/__tests__/brushHardnessProfile.test.ts
```

Expected: FAIL because `../brushHardnessProfile` does not exist.

- [ ] **Step 3: Implement the supplied model**

Implement the user-provided `MonotoneCubic` algorithm verbatim in structure, with readonly TypeScript fields and these exports:

```ts
export const BRUSH_HARD_EDGE_THRESHOLD = 0.97;
export const MIN_RELIABLE_BRUSH_DIAMETER_PX = 22;
export const MIN_VISIBLE_ALPHA_8BIT = 0.5 / 255;

export function getBrushProfileParameters(hardness: number): { sigma: number; n: number };
export function brushAlpha(rNorm: number, hardness: number): number;
export function getBrushProfileSupportNorm(hardness: number): number;
```

`brushAlpha` must use:

```ts
if (h >= BRUSH_HARD_EDGE_THRESHOLD) return rNorm <= 1 ? 1 : 0;
const { sigma, n } = getBrushProfileParameters(h);
const x = Math.max(rNorm, 0) / sigma;
return Math.exp(-Math.pow(x, n));
```

`getBrushProfileSupportNorm` must use:

```ts
return Math.max(1, sigma * Math.pow(-Math.log(MIN_VISIBLE_ALPHA_8BIT), 1 / n));
```

Clamp hardness to `[0, 1]` at the public boundary. Do not add fitted constants or alternate curves.

- [ ] **Step 4: Verify GREEN**

Run the same focused test; expect all cases PASS.

- [ ] **Step 5: Commit**

```powershell
git add -- apps/desktop/src/components/editor/brushHardnessProfile.ts apps/desktop/src/components/editor/__tests__/brushHardnessProfile.test.ts
git commit -m "feat(brush): add measured hardness calibration"
```

## Task 2: Integrate Rasterization into the Existing Cache

**Files:**
- Modify: `apps/desktop/src/components/editor/brushTipMask.ts`
- Modify: `apps/desktop/src/components/editor/__tests__/brushTipMask.test.ts`

- [ ] **Step 1: Write failing raster/cache tests**

Add contracts equivalent to:

```ts
it("keeps calibrated hardness-0 alpha outside the nominal radius", () => {
  const radius = 50;
  expect(brushAlphaAtDistance(radius, radius, 0, "soft")).toBeGreaterThan(0.09);
  expect(brushAlphaAtDistance(radius * 1.4, radius, 0, "soft")).toBeGreaterThan(0.01);
});

it("allocates soft support beyond size without changing nominal radius", () => {
  const tip = createBrushTip({ size: 100, hardness: 0, curve: "soft" });
  expect(tip.radius).toBe(50);
  expect(tip.width).toBeGreaterThan(100);
  expect(tip.height).toBe(tip.width);
});

it("reuses cached data until size or hardness changes", () => {
  clearBrushTipCache();
  const first = getBrushTip({ size: 100, hardness: 0.5, curve: "soft" });
  expect(getBrushTip({ size: 100, hardness: 0.5, curve: "soft" })).toBe(first);
  expect(getBrushTip({ size: 101, hardness: 0.5, curve: "soft" })).not.toBe(first);
  expect(getBrushTip({ size: 100, hardness: 0.6, curve: "soft" })).not.toBe(first);
});
```

Add a size-21 tip test proving full center alpha and a partial one-pixel boundary. Remove only old `soft` assertions requiring zero at `R`, a flat core, or equal mask dimensions. Keep legacy curve, spacing, accumulation, compositing, and interpolation coverage.

- [ ] **Step 2: Verify RED**

```powershell
pnpm.cmd --filter photrez-desktop exec vitest run src/components/editor/__tests__/brushTipMask.test.ts src/components/editor/__tests__/brushReferenceAudit.test.ts
```

Expected: the new bleed/dynamic-support tests fail; old bounded audit contracts also fail once replaced.

- [ ] **Step 3: Implement minimal integration**

Import the profile module into `brushTipMask.ts`. For `curve === "soft"`:

```ts
function smallRoundAlpha(distance: number, radius: number): number {
  return clamp01(radius - distance + 0.5);
}

export function getBrushTipOuterRadius(radius: number, hardness: number, curve: BrushFalloffCurve = "soft"): number {
  if (curve !== "soft" || radius * 2 < MIN_RELIABLE_BRUSH_DIAMETER_PX) return radius;
  return radius * getBrushProfileSupportNorm(hardness);
}
```

Reliable-size soft tips call `brushAlpha(distance / radius, h)`. Sub-22px tips call `smallRoundAlpha`. Legacy non-soft curves keep their current core/feather behavior. `createBrushTip` remains the only allocator and `getBrushTip` remains the only cache; width/height use `Math.ceil(outerRadius * 2)` while `radius` remains `size / 2`.

- [ ] **Step 4: Verify GREEN**

Run the Task 2 command and expect PASS.

- [ ] **Step 5: Commit**

```powershell
git add -- apps/desktop/src/components/editor/brushTipMask.ts apps/desktop/src/components/editor/__tests__/brushTipMask.test.ts
git commit -m "feat(brush): rasterize calibrated soft tips"
```

## Task 3: Replace Guessed Audits and Prove Production Stamping

**Files:**
- Modify: `apps/desktop/src/components/editor/__tests__/brushReferenceAudit.test.ts`
- Modify: `apps/desktop/src/components/editor/__tests__/paintStrokeRenderer.test.ts`

- [ ] **Step 1: Write failing measured-profile tests**

Replace inverse-quadratic/fixed-support sections with:

```ts
expect(brushAlphaAtDistance(0.5, 50, 0, "soft")).toBeLessThan(1);
expect(brushAlphaAtDistance(50, 50, 0, "soft"))
  .toBeCloseTo(Math.exp(-Math.pow(1 / 0.661, 2)), 12);
expect(brushAlphaAtDistance(70, 50, 0, "soft")).toBeGreaterThan(0.01);

expect(brushAlphaAtDistance(40, 50, 0.9, "soft")).toBeGreaterThan(0.99);
expect(brushAlphaAtDistance(50, 50, 0.9, "soft")).toBeGreaterThan(0.4);
expect(brushAlphaAtDistance(55, 50, 0.9, "soft")).toBeLessThan(0.001);

expect(brushAlphaAtDistance(49.99, 50, 0.97, "soft")).toBe(1);
expect(brushAlphaAtDistance(50.01, 50, 0.97, "soft")).toBe(0);
```

Add a renderer test that calls `renderPaintStrokeToContext` for one 100px hardness-0 dab centered on a transparent 240px canvas, then asserts nonzero alpha 51px and 70px from center. This proves the production path, not merely the pure function.

- [ ] **Step 2: Verify RED**

```powershell
pnpm.cmd --filter photrez-desktop exec vitest run src/components/editor/__tests__/brushReferenceAudit.test.ts src/components/editor/__tests__/paintStrokeRenderer.test.ts
```

Expected: bounded old contracts or absent production-tail coverage fail for the intended reason.

- [ ] **Step 3: Preserve the existing renderer path**

Do not change `paintStrokeRenderer.ts` unless the new production test proves it bypasses `getBrushTip()`. Its current one-tip-per-stroke path already meets the caching requirement; Ponytail forbids a duplicate renderer or per-dab formula evaluation.

- [ ] **Step 4: Verify all focused brush/wiring tests**

```powershell
pnpm.cmd --filter photrez-desktop exec vitest run src/components/editor/__tests__/brushHardnessProfile.test.ts src/components/editor/__tests__/brushTipMask.test.ts src/components/editor/__tests__/brushReferenceAudit.test.ts src/components/editor/__tests__/paintStrokeRenderer.test.ts src/components/editor/__tests__/CanvasViewport.test.tsx
```

Expected: every selected test passes, including existing real pointer-chain Brush/Eraser cases.

- [ ] **Step 5: Commit**

```powershell
git add -- apps/desktop/src/components/editor/__tests__/brushReferenceAudit.test.ts apps/desktop/src/components/editor/__tests__/paintStrokeRenderer.test.ts
git commit -m "test(brush): audit reference-calibrated stamping"
```

## Task 4: Generate and Inspect Visual Evidence

**Files:** No production files.

- [ ] **Step 1: Render from the production profile**

Use `pnpm.cmd --filter photrez-desktop exec vite-node -e` to import `brushHardnessProfile.ts`, sample 0%, 50%, 90%, and 100% from `0..1.7R`, and emit a deterministic image under the ignored `test-results` directory. The command must call production `brushAlpha` and must not copy the formula.

- [ ] **Step 2: Inspect the image**

Confirm 0% continuously decreases and bleeds beyond `R`; 50% has a broad continuous shoulder without a hard plateau; 90% stays nearly solid then drops near `R`; 100% is a literal disk. Any contradiction becomes a failing test before production changes.

## Task 5: Full Verification and Documentation

**Files:**
- Modify: `docs/AI_CURRENT_TASK.md`
- Modify: `docs/AI_HISTORY.md`
- Modify: `docs/FEATURES.md`

- [ ] **Step 1: Run the complete frontend suite**

```powershell
pnpm.cmd --filter photrez-desktop test
```

Expected: zero failed tests.

- [ ] **Step 2: Run production build**

```powershell
pnpm.cmd run build
```

Expected: TypeScript and Vite exit 0.

- [ ] **Step 3: Run Rust gates**

```powershell
cargo test -p photrez-core
cargo test --workspace
```

Expected: all tests pass.

- [ ] **Step 4: Append required docs**

Mark the current task complete; append a FEATURE entry with calibration, cache integration, bleed, special cases, and fresh command counts; update Brush/Eraser status in `FEATURES.md`.

- [ ] **Step 5: Verify docs and final diff**

```powershell
git diff --check
git diff -- docs/AI_CURRENT_TASK.md docs/AI_HISTORY.md docs/FEATURES.md
git status --short
```

Expected: no whitespace errors, no binary markdown diffs, no unrelated changes introduced by this task.

- [ ] **Step 6: Commit documentation**

```powershell
git add -- docs/AI_CURRENT_TASK.md docs/AI_HISTORY.md docs/FEATURES.md
git commit -m "docs: record calibrated brush hardness"
```

## Completion Audit

Verify evidence for every requirement: exact seven knots; exact monotone interpolation and super-Gaussian; hard edge from 97%; one-pixel AA below 22px; low-hardness bleed outside nominal radius; cache identity and invalidation; no per-dab formula work; real stroke and pointer wiring; inspected 0/50/90/100 visual evidence; full frontend/build/Rust/doc gates.
