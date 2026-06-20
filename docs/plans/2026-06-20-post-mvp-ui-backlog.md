# Post-MVP UI Backlog

Status: planned after release-candidate native evidence.

This backlog preserves requested UI and desktop-shell work that is intentionally outside the locked MVP feature set. Items remain product goals; they are not release blockers for the current MVP.

## Entry Gate

Before starting the first item:

- Complete and attach evidence for `docs/faang-review-rejections/2026-06-18-native-runtime-smoke-checklist.md`.
- Run the root verification, type-check, lint, browser E2E, and audit gates from one clean commit.
- Open a dedicated task in `AI_CURRENT_TASK.md`; do not implement multiple backlog items in one task.

## Recommended Order

| Order | Item | First decision required | Minimum delivery evidence |
| --- | --- | --- | --- |
| 1 | Window state persistence | Storage location, invalid/off-screen bounds recovery, multi-monitor behavior | Unit tests for bounds normalization plus real Tauri restart smoke |
| 2 | Native menu integration | Whether native menu mirrors or replaces the custom menu bar | Command-routing tests plus Windows native runtime smoke |
| 3 | Tooltip system | Which existing controls are the first consumers; avoid a framework without consumers | Focus/hover lifecycle tests, keyboard accessibility, cleanup proof |
| 4 | General context-menu system | Reuse or extract from the existing brush menu only when a second real consumer exists | Mounted event wiring, focus/Escape/outside-click tests, tool shortcut isolation |
| 5 | Dialog system | Inventory existing export, resize, color, and confirmation dialogs before extracting shared behavior | Focus trap/restore, Escape policy, shortcut isolation, mounted wiring tests |
| 6 | History panel UI | Define operation labels and whether snapshots need metadata before designing the list | History state contract, undo/redo selection tests, mounted panel wiring |

## Guardrails

- Follow the existing visual system; no redesign is implied by these items.
- Prefer extracting shared primitives from proven existing consumers over creating a generic UI framework first.
- Every item requires a production wiring test, state contract where signals mutate, full frontend regression, build, and relevant native smoke.
- History Panel must not change the 50-step undo limit without a separate decision.
- Native menu and window persistence are Tauri-only behaviors and cannot be declared complete using browser E2E alone.

## Deferred Architecture

Rust-core and wgpu runtime migration remain separate future-target work. They are not prerequisites for this backlog.
