# Executive Summary

## Overall Verdict

A strict FAANG-style review would probably not reject the product direction. It would reject several implementation and release-readiness aspects before approving a broad merge or release candidate.

The codebase shows strong recovery discipline: many regressions have targeted tests, `AI_HISTORY.md` captures root causes, and critical interaction bugs are now documented. The likely rejection areas are mostly around maintainability at scale, typed contracts, native-runtime proof, and governance automation.

2026-06-18/19 execution update: the immediate contract drift, production `useEditor()` fallback, debug-handle guard, root lint/type-check/audit script gaps, CI workflow, native-runtime smoke checklist, typed active tool state, typed cross-doc engine facade, decode-first file drops, guarded cross-doc Alt-move semantics, image-only shell path allowlists, and WebGL uniform/context lifecycle hardening have been addressed. Remaining reject-class risk is concentrated in unfilled release evidence, broad ownership boundaries, drag/drop state-machine complexity, renderer module size/resource ownership, and test `as any` debt. See `2026-06-18-execution-audit.md`.

## Top Likely Rejects

| ID | Rating | Area | Why it would be rejected |
| --- | --- | --- | --- |
| FRR-EXEC-001 | Mitigated | Architecture/docs | Runtime, contract spec, and architecture reference now agree on contract `2.0.0` and registered Tauri commands. |
| FRR-EXEC-002 | Must Fix | Editor state | `useEditor()` fallback and untyped active tool state are fixed, but `EditorContext` remains a very large provider surface and tests still carry `as any` debt. |
| FRR-EXEC-003 | Reject | Tool surface | `CanvasViewport.tsx` and `useCanvasPointerTools.ts` are large multi-responsibility modules, making ownership and review safety weak. |
| FRR-EXEC-004 | Mitigated | Native events | `2026-06-18-native-runtime-smoke-checklist.md` defines required Tauri runtime evidence; filled release artifacts are still required per candidate. |
| FRR-EXEC-005 | Mitigated | Shell security | Tauri file IO now enforces image import/export extension allowlists in code; base64 payloads remain capped at 256MB. |
| FRR-EXEC-006 | Must Fix | Test quality | Many tests use `as any`, reducing confidence that tests enforce the real contracts. |
| FRR-EXEC-007 | Mitigated | Release governance | Root lint/type-check/audit scripts and `.github/workflows/ci.yml` now exist; successful remote audit/native release evidence remains to be captured. |
| FRR-EXEC-008 | Must Fix | Renderer | WebGL2 backend remains a large manual resource-lifecycle class; preserve-buffer, required-uniform, and context-loss gaps are mitigated, but module/resource ownership is still too broad. |
| FRR-EXEC-009 | Mitigated | Product debugging | `window.__photrezEditor` is now guarded by `shouldExposeEditorDebugHandle()` and covered by production-mode tests. |
| FRR-EXEC-010 | Should Fix | Docs | Some feature/test counts and architecture notes appear stale relative to recent work. |

## Evidence Snapshot

Large files that would attract reviewer comments:

| File | Lines | Review concern |
| --- | ---: | --- |
| `apps/desktop/src/components/editor/CanvasViewport.tsx` | 1142 | Viewport, tool routing, crop, drag/drop, overlays all in one component |
| `apps/desktop/src/components/editor/useCanvasPointerTools.ts` | 879 | Many tool state machines and side effects in one hook |
| `apps/desktop/src/components/editor/CropOptionBar.tsx` | 895 | Complex UI state and business rules mixed |
| `apps/desktop/src/renderer/webgl2.ts` | 793 | Renderer resource lifecycle and draw pipeline in one class |
| `apps/desktop/src/engine/document.ts` | 661 | Core document model owns many editing operations |
| `apps/desktop/src/components/editor/LayersPanel.tsx` | 543 | UI plus drag/drop plus layer mutations |
| `apps/desktop/src/components/editor/ModernCropOverlay.tsx` | 541 | Complex interaction and key handling in one component |

## Reviewer Bottom Line

The project has enough test coverage to show seriousness, but a high-bar reviewer would ask for:

1. Smaller ownership seams before more feature work.
2. Typed contracts instead of `any` facades in remaining production/test paths.
3. Filled native runtime smoke evidence for Tauri-only behavior.
4. Contract docs regenerated from runtime or enforced by tests beyond the current Tauri command-list assertions.
5. CI/security audit gates that match the policy docs.
