# 6-Month Maintainability Risk Register

Created: 2026-06-17

This folder tracks code areas that can become hard to maintain within the next 6 months if Photrez keeps adding tools, native behavior, and renderer features at the current pace.

This is not a confirmed bug list. It is a maintenance-risk map: the question is not "what is broken today?", but "what will make future changes slower, riskier, or harder to review?"

## How To Use This Register

- Use this before starting a new feature or tool.
- Add new risks when a feature touches a listed ownership boundary.
- Treat `M1` and `M2` items as refactor candidates before broad feature work.
- Link implementation plans back to the relevant `MRR-*` IDs.
- Keep this folder in sync with `docs/production-risk-register/` and `docs/faang-review-rejections/`.

## Evidence Snapshot

The register is based on source and docs inspection on 2026-06-17.

Notable maintainability signals:

- `CanvasViewport.tsx` is over 1k lines and owns rendering glue, input routing, pasteboard behavior, overlays, and drop-zone behavior.
- `useCanvasPointerTools.ts` is close to 900 lines and dispatches multiple tools through one hook.
- `CropOptionBar.tsx`, `useCanvasKeyboard.ts`, `webgl2.ts`, and `DocumentEngine` are large enough that ownership is easy to blur.
- Tests include very large suites such as `CanvasViewport.test.tsx`, `CropOverlay.test.tsx`, and `CropOptionBar.test.tsx`.
- Test code and some production paths still rely on `as any` and broad mocks.
- IPC contract docs and runtime metadata currently disagree on contract version and command surface.
- Browser E2E covers some native-adjacent flows, but native Tauri drag/drop and file IO remain easy to document without proving in runtime.

## File Index

| File | Area |
| --- | --- |
| `00-maintainability-taxonomy-and-signals.md` | Severity, smells, and ownership gates |
| `01-architecture-ownership-boundaries.md` | Architecture, module boundaries, source of truth |
| `02-editor-state-and-context.md` | Solid context, signals, editor global state |
| `03-canvas-viewport-and-pointer-routing.md` | Viewport, pointer tools, keyboard routing |
| `04-layers-workspace-history.md` | Layers, workspace, history, dirty state |
| `05-selection-transform-tools.md` | Selection, move, transform overlays and geometry |
| `06-crop-resize-tooling.md` | Crop modes, resize behavior, option bar state |
| `07-brush-eraser-painting.md` | Brush/eraser state, paint path, performance |
| `08-drag-drop-native-io.md` | Cross-doc drag/drop, OS file drop, Tauri file IO |
| `09-renderer-export-performance.md` | WebGL renderer, export, pixel readback, memory |
| `10-tests-ci-release-governance.md` | Tests, CI, release gates, observability |
| `11-six-month-remediation-roadmap.md` | Practical phased remediation plan |

## Severity

| Severity | Meaning |
| --- | --- |
| M1 | Will likely block or repeatedly slow feature work within 1-2 months |
| M2 | Will cause high regression risk or slow reviews within 3-6 months |
| M3 | Localized maintenance drag that should be handled when touching the area |
| M4 | Cleanup/nit that is safe to batch |

