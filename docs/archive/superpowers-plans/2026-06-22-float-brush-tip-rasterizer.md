# Float Brush-Tip Rasterizer Implementation Plan
> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Refactor the production brush-tip path to a cached Float32 alpha raster with padded calibrated support and subpixel mask/ImageData stamping.

**Architecture:** `brushTipMask.ts` remains the single owner of tip rasterization, cache, stamping, and compositing. Its cached tip becomes single-channel Float32 while the existing Uint8 layer-mask accumulation API and every production consumer remain unchanged.

**Tech Stack:** TypeScript, Vitest, Canvas `ImageData`, CPU Float32 alpha masks.

## Task 1: Lock the Float Raster and Cache API

- Modify: `apps/desktop/src/components/editor/__tests__/brushTipMask.test.ts`
- Modify: `apps/desktop/src/components/editor/brushTipMask.ts`

- [x] Add failing tests importing `rasterizeBrushTip` and `getCachedBrushTip`; assert `Float32Array`, exact padded diameter, nominal radius, center-of-pixel sampling, float alpha beyond nominal radius, small-tip AA, and cache identity changes only for diameter/hardness.
- [x] Run the focused rasterizer test; observe missing exports and exact cache/fractional-diameter failures.
- [x] Implement canonical rasterization with `textureCenter = diameter / 2`, `(x + 0.5, y + 0.5)` samples, and one alpha float per texel while preserving legacy entry points.
- [x] Re-run the focused file and require green.

## Task 2: Adapt Existing Stamping to the Float Tip

- Modify: `apps/desktop/src/components/editor/__tests__/brushTipMask.test.ts`
- Modify: `apps/desktop/src/components/editor/__tests__/brushReferenceAudit.test.ts`
- Modify: `apps/desktop/src/components/editor/brushTipMask.ts`

- [x] Cover the existing Uint8 source-over mask accumulation, bilinear fractional placement, and enlarged edge support.
- [x] Keep `stampBrushTip(...)` and every public call signature intact; only change its source sampling from RGBA byte alpha to single-channel Float32 alpha.
- [x] Keep terminal/transient helpers and the existing Uint8 layer-mask accumulation path intact.
- [x] Re-run focused coverage and require green.

## Task 3: Preserve Production Wiring

- Modify: `apps/desktop/src/components/editor/__tests__/paintStrokeRenderer.test.ts`
- Modify: `apps/desktop/src/components/editor/__tests__/paintStrokeCoordinates.test.ts`

- [x] Adjust representation assertions and prove enlarged support remains visible without clipping.
- [x] Prove existing production consumers remain compatible without modifying `useBrushOverlay.ts`, `paintCommitCommand.ts`, or the WebGL2 path.
- [x] Run profile, mask, renderer, coordinate, overlay, and CanvasViewport tests.

## Task 4: Verify and Document

- Modify: `docs/AI_CURRENT_TASK.md`
- Modify: `docs/AI_HISTORY.md`
- Modify: `docs/FEATURES.md`

- [x] Run full frontend tests, production build, Rust core tests, and Rust workspace tests.
- [x] Record exact verification counts and the single-path migration in required docs.
- [x] Run `git diff --check` and inspect documentation diffs for text encoding integrity.
