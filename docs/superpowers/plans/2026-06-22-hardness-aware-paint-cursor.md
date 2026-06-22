# Hardness-Aware Paint Cursor Implementation Plan
> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the single Brush/Eraser cursor ring follow the measured 20% alpha contour while leaving painted output and nominal tool size unchanged.

**Architecture:** Extend the pure calibrated hardness profile with one cursor scale helper, then consume it in the existing `BrushCursorOverlay`. No new state, UI surface, dependency, or renderer path is introduced.

**Tech Stack:** TypeScript 5.2, SolidJS, SVG, Vitest 4.1.

## Task 1: Lock Cursor Contour Math

- Modify: `apps/desktop/src/components/editor/__tests__/brushHardnessProfile.test.ts`
- Modify: `apps/desktop/src/components/editor/brushHardnessProfile.ts`

- [ ] Add failing tests for the 0.20 contour, input clamping, monotone scale, and the 97% full-radius branch.
- [ ] Run `pnpm.cmd --filter photrez-desktop exec vitest run src/components/editor/__tests__/brushHardnessProfile.test.ts` and verify RED because the helper is missing.
- [ ] Add `BRUSH_CURSOR_ALPHA_CONTOUR = 0.20` and `getBrushCursorRadiusScale(hardness)` using the existing `getBrushProfileParameters` interpolation.
- [ ] Re-run the focused profile test and verify GREEN.

## Task 2: Wire the Existing Cursor Overlay

- Modify: `apps/desktop/src/components/editor/__tests__/BrushCursorOverlay.test.tsx`
- Modify: `apps/desktop/src/components/editor/BrushCursorOverlay.tsx`

- [ ] Add failing mounted tests proving Brush and Eraser cursor radii shrink at hardness 0, react to hardness changes, and stay nominal at hardness 97%.
- [ ] Run `pnpm.cmd --filter photrez-desktop exec vitest run src/components/editor/__tests__/BrushCursorOverlay.test.tsx` and verify RED against the nominal-radius implementation.
- [ ] Multiply the existing nominal screen radius by `getBrushCursorRadiusScale(settings().hardness)`; keep both contrast strokes on the same single ring geometry.
- [ ] Re-run both focused files and verify GREEN.

## Task 3: Verify and Document

- Modify: `docs/AI_CURRENT_TASK.md`
- Modify: `docs/AI_HISTORY.md`
- Modify: `docs/FEATURES.md`

- [ ] Run the focused Brush/Eraser cursor, profile, UX, and CanvasViewport tests.
- [ ] Run the complete frontend, build, Rust core, and Rust workspace gates from `AGENTS.md`.
- [ ] Append completion evidence to the three required AI docs without overwriting prior history.
- [ ] Run `git diff --check` and inspect the documentation diff for UTF-8 text output.
