# Brush Terminal Dab Cursor Landing Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make completed Brush and Eraser strokes land exactly at the cursor endpoint without changing regular 25% dab spacing.

**Architecture:** Preserve `interpolateDabs()` as the event-rate-independent path sampler. Add explicit terminal finalization to the existing paint session, feed pointer-up coordinates through the existing stroke callback, and suppress a duplicate stamp when the last regular dab already equals the endpoint.

**Tech Stack:** TypeScript, SolidJS pointer wiring, Canvas/typed-array mask engine, Vitest.

### Task 1: Lock the terminal-dab contract

- Modify: `apps/desktop/src/components/editor/__tests__/brushTipMask.test.ts`
- Modify: `apps/desktop/src/components/editor/__tests__/brushUx.test.tsx`
- Modify: `apps/desktop/src/components/editor/__tests__/paintStrokeRenderer.test.ts`

- [x] Add a real mask test showing a non-grid endpoint is absent before finalization and present afterward.
- [x] Add a contract proving an endpoint already on the spacing grid is not stamped twice.
- [x] Add pointer-hook wiring coverage proving pointer-up forwards the final brush coordinate before commit.
- [x] Run the focused tests and verify they fail for the missing terminal behavior.

### Task 2: Implement endpoint-only finalization

- Modify: `apps/desktop/src/components/editor/brushTipMask.ts`
- Modify: `apps/desktop/src/components/editor/useBrushOverlay.ts`
- Modify: `apps/desktop/src/components/editor/useCanvasPointerTools.ts`
- Modify: `apps/desktop/src/viewport/input-handler.ts`

- [x] Add the smallest terminal-stamp helper/state needed to compare the endpoint with the last emitted dab.
- [x] Forward the constrained/smoothed pointer-up coordinate through `onPaintStroke`.
- [x] Finalize the endpoint before brush or eraser bitmap commit, including cancel/lost-capture paths using their last known point.
- [x] Run focused tests and verify green.

### Task 3: Verify and document

- Modify: `docs/AI_CURRENT_TASK.md`
- Modify: `docs/AI_HISTORY.md`
- Modify: `docs/FEATURES.md`

- [x] Run the complete frontend suite and production build.
- [x] Run Rust core and workspace tests.
- [x] Run `git diff --check` and audit the production call chain.
- [x] Record the root cause, fix rationale, and evidence without overwriting existing history.
