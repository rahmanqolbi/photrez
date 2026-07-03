# Post-MVP UI Backlog

> ⚠️ **All 6 items completed as of 2026-07-02.** This file is kept for historical reference only — no pending work remains.

Status: **COMPLETED** — all items implemented, tested, and shipped.

This backlog preserves requested UI and desktop-shell work that is intentionally outside the locked MVP feature set. Items remain product goals; they are not release blockers for the current MVP.

## Entry Gate

Before starting the first item:

- Complete and attach evidence for `docs/faang-review-rejections/2026-06-18-native-runtime-smoke-checklist.md`.
- Run the root verification, type-check, lint, browser E2E, and audit gates from one clean commit.
- Open a dedicated task in `AI_CURRENT_TASK.md`; do not implement multiple backlog items in one task.

## Recommended Order

| Order | Item | Evidence | Status |
| --- | --- | --- | --- |
| 1 | Window state persistence | `main.rs` — `window_state::load/save`, `SnapStateToScreen`, tests | ✅ DONE |
| 2 | Native menu integration | `main.rs` — `menu.rs`, `build_native_menu`, `on_menu_event`, `NativeMenuCommands.test.tsx` | ✅ DONE |
| 3 | Tooltip system | `Tooltip.test.tsx` (5 tests: hover delay, keyboard focus, cleanup) | ✅ DONE |
| 4 | General context-menu system | `ContextMenu.test.tsx`, `BrushContextMenu.test.tsx`, `contextMenuCore.tsx` | ✅ DONE |
| 5 | Dialog system | `DialogProvider.test.tsx`, shared `confirm/alert` API, focus trap tests | ✅ DONE |
| 6 | History panel UI | `HistoryPanel.test.tsx`, `HistoryPanelWiring.test.tsx`, production wiring | ✅ DONE |

## Guardrails

- Follow the existing visual system; no redesign is implied by these items.
- Prefer extracting shared primitives from proven existing consumers over creating a generic UI framework first.
- Every item requires a production wiring test, state contract where signals mutate, full frontend regression, build, and relevant native smoke.
- History Panel must not change the 50-step undo limit without a separate decision.
- Native menu and window persistence are Tauri-only behaviors and cannot be declared complete using browser E2E alone.

## Deferred Architecture

Rust-core and wgpu runtime migration remain separate future-target work. They are not prerequisites for this backlog.
