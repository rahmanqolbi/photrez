# Live Terminal Dab Preview Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Keep the visible brush/eraser cap attached to the cursor during drag without changing permanent dab accumulation.

**Architecture:** Add a region-scoped helper that composites one cached tip into an existing preview context without mutating the permanent mask. `useBrushOverlay` paints the regular mask first, then the transient endpoint only for non-final updates whose latest point differs from the last emitted regular dab.

**Tech Stack:** TypeScript, Canvas ImageData, OffscreenCanvas, Vitest.

### Task 1: Lock transient compositing contracts

- Modify: `apps/desktop/src/components/editor/__tests__/brushTipMask.test.ts`
- Create: `apps/desktop/src/components/editor/__tests__/useBrushOverlay.test.ts`

- [x] Add a failing region-compositing test proving the terminal center becomes visible without receiving a permanent mask.
- [x] Add a failing duplicate-suppression test for endpoints already occupied by a regular dab.
- [x] Add a failing production-overlay test proving non-final preview performs a region pass while final preview does not.
- [x] Run focused tests and confirm failures describe the missing transient behavior.

### Task 2: Implement the transient preview

- Modify: `apps/desktop/src/components/editor/brushTipMask.ts`
- Modify: `apps/desktop/src/components/editor/useBrushOverlay.ts`

- [x] Add point-equality and region-scoped tip compositing helpers.
- [x] Composite the transient tip after the persistent brush or eraser preview pass.
- [x] Preserve lock-transparency processing after both brush preview passes.
- [x] Run focused tests and confirm green.

### Task 3: Verify and document

- Modify: `docs/AI_CURRENT_TASK.md`
- Modify: `docs/AI_HISTORY.md`
- Modify: `docs/FEATURES.md`

- [x] Run focused mask, overlay, pointer, renderer, and CanvasViewport coverage.
- [x] Run the full frontend suite and production build.
- [x] Run Rust core and workspace tests.
- [x] Run `git diff --check`, audit mask immutability, and record evidence.
