# Production Bug Risk Register

Created: 2026-06-17

This folder lists potential production bugs for Photrez by feature/tool area. These are not confirmed bugs. They are risk checklists derived from the current architecture, implemented feature surface, recurring bug history, and source/test hotspots.

Use this folder before shipping, before adding a new tool, and during bug triage when a report says "tests pass but the app does nothing".

## Severity

| Severity | Meaning | Release stance |
| --- | --- | --- |
| P0 | Data loss, crash, broken core workflow, silent corruption | Block release |
| P1 | Major user-visible failure with workaround or narrow trigger | Fix before public release candidate |
| P2 | Annoying or confusing issue, workaround available | Schedule next hardening pass |
| P3 | Polish, diagnostics, minor edge case | Fix opportunistically |

## Files

| File | Area |
| --- | --- |
| `00-risk-taxonomy-and-release-gates.md` | Shared taxonomy, bug classes, release checks |
| `01-global-wiring-state-sync.md` | Tool wiring, Solid signals, history, cleanup |
| `02-layer-workspace.md` | Layers, workspace, document tabs, multi-doc state |
| `03-selection-move-transform.md` | Selection, Move, transform, snapping, cursors |
| `04-crop-resize.md` | Classic/Modern crop, canvas resize, crop apply |
| `05-brush-eraser-color.md` | Brush, eraser, eyedropper, paint pipeline |
| `06-drag-drop.md` | Cross-document layer drag, OS file drop, toasts |
| `07-viewport-renderer.md` | Viewport camera, overlays, WebGL2, texture lifecycle |
| `08-export-file-io-ipc.md` | Export, native file IO, Tauri IPC contract |
| `09-ui-shell-accessibility-responsive.md` | Shell UI, menus, dialogs, responsive/a11y |
| `10-testing-observability-release.md` | Test gaps, release gates, observability |
| `2026-06-17-execution-audit.md` | Executed hardening pass, closed risks, and verification evidence |

## Fast Release Scan

Before declaring a feature production-ready:

1. Run the mandatory gates from `AGENTS.md`.
2. Check the feature-specific file in this folder.
3. Add at least one wiring test for every DOM/Tauri/Solid event path touched.
4. Add one engine-signal or state contract test for every source-of-truth mutation.
5. Verify undo/redo for every mutating action.
6. Verify viewport states: fit, zoom, pan, HiDPI, and active tool overlay alignment.
7. Verify no listener is mounted only inside a component that can unmount before the user triggers the event.
