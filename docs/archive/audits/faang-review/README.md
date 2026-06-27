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
| Mitigated | Previously reject-class finding now addressed; keep regression evidence or follow-up governance |

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
| `2026-06-18-execution-audit.md` | Phase 0 execution results and remaining release gaps |
| `2026-06-18-native-runtime-smoke-checklist.md` | Required release evidence for Tauri-only OS behavior |

## Quick Answer

The remaining high-bar review rejects are:

1. Large, multi-owner files with too many responsibilities: `CanvasViewport.tsx`, `useCanvasPointerTools.ts`, `CropOptionBar.tsx`, `webgl2.ts`, `DocumentEngine`.
2. Type safety bypasses in broad test surfaces and a few production edge paths.
3. Release evidence still needs filled native Tauri smoke results; browser E2E alone is not enough.
4. Shell/file IO robustness concerns around base64 memory duplication; a 256MB guard exists, but streaming is still future work.
5. Native-runtime evidence and audit execution proof: CI now exists and a Tauri smoke checklist is defined, but actual release artifacts still need filled evidence.
