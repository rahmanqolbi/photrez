# FAANG-Style Review Rejection Register

Created: 2026-06-17

This folder documents what would likely be rejected in a strict large-company code review of Photrez. It is intentionally written as a review register, not a bug report. Some items are already mitigated by tests or MVP decisions, but would still draw reviewer scrutiny because they raise maintainability, safety, reliability, or release-readiness risk.

The word "FAANG" here means a high bar for ownership boundaries, typed APIs, test realism, release gates, observability, and maintainability. It is not a claim about any specific company's private process.

## Rating

| Rating | Meaning |
| --- | --- |
| Reject | Likely blocks merge/release without remediation or explicit waiver |
| Must Fix | Strong reviewer request before merge unless scoped out in writing |
| Should Fix | Follow-up expected; can merge only with owner/date |
| Nit | Style or cleanup, not a merge blocker |

## Files

| File | Focus |
| --- | --- |
| `00-executive-summary.md` | Top likely rejection themes |
| `01-architecture-boundaries.md` | Runtime ownership, docs drift, shell/core split |
| `02-editor-state-tool-wiring.md` | EditorContext, tool wiring, global state, context fallback |
| `03-layer-workspace-history.md` | Layer model, workspace, history/data-loss contracts |
| `04-selection-move-transform.md` | Selection, Move, transform, snapping, cursor paths |
| `05-crop-resize.md` | Modern/Classic crop, resize, geometry complexity |
| `06-brush-eraser-color.md` | Paint pipeline, color sampling, performance |
| `07-drag-drop-native-events.md` | HTML5 drag, Tauri OS drop, async target capture |
| `08-renderer-viewport-export.md` | WebGL2 renderer, viewport camera, export parity |
| `09-shell-ipc-security-release.md` | Tauri IPC, native file IO, security, release gates |
| `10-testing-ci-observability.md` | Test realism, CI, lint/static analysis, observability |
| `11-remediation-roadmap.md` | Suggested order of fixes |

## Quick Answer

The most likely high-bar review rejects are:

1. Large, multi-owner files with too many responsibilities: `CanvasViewport.tsx`, `useCanvasPointerTools.ts`, `CropOptionBar.tsx`, `webgl2.ts`, `DocumentEngine`.
2. Type safety bypasses and test-only fallbacks: `as any` in production paths and many tests.
3. Runtime contract/document drift: docs list many Tauri commands and contract `1.0.0`, while current `main.rs` exposes a smaller `2.0.0` file-IO contract.
4. Browser E2E tests documenting native behavior instead of proving it in the Tauri runtime.
5. Shell/file IO security and robustness concerns around raw path-based read/write and base64 memory duplication.
6. CI/static analysis gaps: no lint script, no audit script, no committed CI gate visible in the root scripts.
7. Release-only debug/test hooks such as `window.__photrezEditor` being attached whenever `window` exists.

