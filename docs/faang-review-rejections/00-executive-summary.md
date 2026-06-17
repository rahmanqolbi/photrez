# Executive Summary

## Overall Verdict

A strict FAANG-style review would probably not reject the product direction. It would reject several implementation and release-readiness aspects before approving a broad merge or release candidate.

The codebase shows strong recovery discipline: many regressions have targeted tests, `AI_HISTORY.md` captures root causes, and critical interaction bugs are now documented. The likely rejection areas are mostly around maintainability at scale, typed contracts, native-runtime proof, and governance automation.

## Top Likely Rejects

| ID | Rating | Area | Why it would be rejected |
| --- | --- | --- | --- |
| FRR-EXEC-001 | Reject | Architecture/docs | IPC contract docs and runtime implementation disagree on contract version and supported commands. |
| FRR-EXEC-002 | Reject | Editor state | `EditorContext` is a very large provider surface with test-only fallback objects and `as any` in production code. |
| FRR-EXEC-003 | Reject | Tool surface | `CanvasViewport.tsx` and `useCanvasPointerTools.ts` are large multi-responsibility modules, making ownership and review safety weak. |
| FRR-EXEC-004 | Reject | Native events | OS file drop and native save behavior are partly manual/browser-documented rather than proven by automated Tauri runtime tests. |
| FRR-EXEC-005 | Reject | Shell security | Tauri file IO exposes raw path-based read/write helpers and base64 payloads without a documented capability/path policy in code. |
| FRR-EXEC-006 | Must Fix | Test quality | Many tests use `as any`, reducing confidence that tests enforce the real contracts. |
| FRR-EXEC-007 | Must Fix | Release governance | No visible CI/lint/audit scripts in root/package scripts despite docs requiring them. |
| FRR-EXEC-008 | Must Fix | Renderer | WebGL2 backend has high complexity, `preserveDrawingBuffer: true`, non-null uniform assertions, and no obvious context-loss recovery path. |
| FRR-EXEC-009 | Must Fix | Product debugging | `window.__photrezEditor` is exposed whenever `window` exists, not only under an explicit test/dev guard. |
| FRR-EXEC-010 | Should Fix | Docs | Some feature/test counts and architecture notes appear stale relative to recent work. |

## Evidence Snapshot

Large files that would attract reviewer comments:

| File | Lines | Review concern |
| --- | ---: | --- |
| `apps/desktop/src/components/editor/CanvasViewport.tsx` | 1142 | Viewport, tool routing, crop, drag/drop, overlays all in one component |
| `apps/desktop/src/components/editor/useCanvasPointerTools.ts` | 879 | Many tool state machines and side effects in one hook |
| `apps/desktop/src/components/editor/CropOptionBar.tsx` | 895 | Complex UI state and business rules mixed |
| `apps/desktop/src/renderer/webgl2.ts` | 689 | Renderer resource lifecycle and draw pipeline in one class |
| `apps/desktop/src/engine/document.ts` | 661 | Core document model owns many editing operations |
| `apps/desktop/src/components/editor/LayersPanel.tsx` | 543 | UI plus drag/drop plus layer mutations |
| `apps/desktop/src/components/editor/ModernCropOverlay.tsx` | 541 | Complex interaction and key handling in one component |

## Reviewer Bottom Line

The project has enough test coverage to show seriousness, but a high-bar reviewer would ask for:

1. Smaller ownership seams before more feature work.
2. Typed contracts instead of `any` facades in production paths.
3. A real native runtime test gate for Tauri-only behavior.
4. Contract docs regenerated from runtime or enforced by tests.
5. CI/lint/security audit gates that match the policy docs.

