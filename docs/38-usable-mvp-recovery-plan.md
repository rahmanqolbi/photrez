# 38 - Usable MVP Recovery Plan

Date: 2026-05-29

This document resets the project truth after the milestone completion pass. The codebase has many MVP foundations implemented, but the app must not be treated as a usable release candidate until the open-edit-export user flow is verified end to end.

## 1. Current Verdict

Photrez is not yet a usable MVP for normal editing work.

The reason is not that all implementation is missing. The reason is that milestone tasks were marked complete at the component level while the product-level usability gate was not proven:

- A user must be able to open a real image and see the actual pixels in the viewport.
- A user must be able to edit those pixels or layer state and see the result immediately.
- A user must be able to export the edited output and verify that the exported file matches the visible canvas.
- The release gate must include a crash-free open-edit-export smoke test, not only unit tests and packaging metrics.

## 2. Verified Evidence

Checked on 2026-05-29:

- `pnpm.cmd run build`: PASS.
- `pnpm.cmd --filter photrez-desktop test`: PASS, 45 frontend tests.
- `cargo test -p photrez-core`: PASS, 69 tests.
- `cargo test -p photrez-render --lib`: FAIL, test binary exits with `STATUS_ENTRYPOINT_NOT_FOUND`.
- `cargo test --workspace`: NOT GREEN because `photrez-render` fails.

Code evidence:

- `apps/desktop/src/App.tsx` still renders layer placeholders as absolutely positioned CSS rectangles in the artboard. This is useful UI scaffolding, but it is not a verified pixel viewport.
- `apps/desktop/src-tauri/src/main.rs` registers `open_image`, `export_document`, `draw_brush_stroke`, and `trigger_render`, but `get_contract_info` does not list `open_image` or `trigger_render`.
- `crates/core/src/document.rs::load_image_from_bytes` decodes image bytes before enforcing the project resource guardrails and then calls `add_layer`, which ignores the `add_layer_safe` error path.
- `apps/desktop/src-tauri/src/main.rs::draw_brush_stroke` mutates layer pixels but does not mark the edited layer dirty inside the command.
- `apps/desktop/src-tauri/src/main.rs` renders on `MainEventsCleared`, but the visible app UI path has not been verified as showing actual imported pixels.

## 3. Root Cause

The docs mixed three different meanings of "done":

1. Foundation done: data structures, commands, and UI controls exist.
2. Integration done: the command, renderer, and frontend paths are wired together.
3. Product usable: a real user can complete open-edit-export without hidden manual steps or unverifiable output.

Several docs marked component milestones as done, then treated that as release readiness. The PRD already requires a crash-free open-edit-export smoke test, but the execution docs did not keep that gate as the final source of truth.

## 4. Recovery Priority

### P0 - Documentation Truth Reset

Status: COMPLETE for this pass.

- Mark release readiness as reopened.
- Treat previous release candidate artifacts as invalidated until usable MVP gates pass.
- Make this document the working recovery plan.
- Keep old milestone logs as history, but do not use them as the current readiness verdict.

### P1 - Pixel Viewport Must Become Real

Goal: imported and edited image pixels are visible in the app.

Required outcomes:

- Open PNG/JPEG/WebP from the File menu or `Ctrl+O`.
- The imported image appears in the viewport with actual pixel content, not only a layer label or placeholder rectangle.
- Brush/eraser edits are visible after stroke commit.
- Opacity, visibility, move, crop, resize, and transform produce visible results.
- Undo/redo changes are reflected in the visible canvas.

Implementation decision needed:

- Preferred path: complete the native wgpu presentation path so the renderer owns drawing as planned.
- Fallback path: if native surface composition remains blocked, write an ADR that allows a temporary verified pixel presentation adapter while keeping image business logic in Rust Core.

Do not mark P1 complete without visual smoke evidence.

### P2 - Import Safety and Command Contract

Goal: opening files is safe, deterministic, and documented.

Required outcomes:

- Validate extension/path/resource limits before heavy decode work where practical.
- Enforce max dimensions and decoded memory budget for imported images.
- Keep document state unchanged on decode failure.
- Add negative tests for invalid file bytes and over-budget images.
- Add `open_image` and `trigger_render` to command contract docs or classify `trigger_render` as internal-only.
- Align command error codes with `docs/35-error-code-registry.md`.

### P3 - Editing Correctness

Goal: editing operations change the real document, renderer, and export consistently.

Required outcomes:

- Brush and eraser commands mark changed layers dirty.
- Transform/crop/resize semantics are documented and tested against exported pixels.
- Layer opacity, visibility, order, and move are verified by pixel-output tests.
- Exported PNG/JPEG/WebP files match the expected flattened document.

### P4 - Release Gate Rebuild

Goal: recreate a valid release candidate only after product smoke tests pass.

Required outcomes:

- `pnpm.cmd run build` passes.
- `pnpm.cmd --filter photrez-desktop test` passes.
- `cargo test --workspace` passes, including `photrez-render`.
- Manual or automated desktop smoke test passes:
  1. Launch app.
  2. Open a real PNG.
  3. Draw one visible brush stroke.
  4. Undo and redo the stroke.
  5. Export PNG.
  6. Verify exported file includes the expected image and edit.
- Performance budgets are re-measured after the real rendering path is fixed.
- New installer artifacts are generated only after all checks are green.

## 5. Definition of Usable MVP

Photrez can be called usable for MVP only when all of these are true:

- A non-developer user can complete open-edit-export from the visible UI.
- The viewport shows actual image pixels.
- Edits are visible before export.
- Export output matches the visible document.
- Error states are shown to the user instead of silently logging to dev console.
- Full build and test gates are green.
- The current docs no longer contain conflicting readiness claims.

## 6. Explicit Non-Goals for Recovery

Do not add these while recovering usability:

- PSD workflow.
- Print checker.
- Plugin runtime.
- AI features.
- Cloud collaboration.
- Native project format.

The recovery work must make the locked MVP usable before expanding scope.
