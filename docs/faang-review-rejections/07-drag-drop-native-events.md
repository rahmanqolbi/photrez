# Drag and Drop and Native Events Review

## Likely Rejections

| ID | Rating | Finding | Evidence | Expected remediation |
| --- | --- | --- | --- | --- |
| FRR-DND-001 | Mitigated | OS file drop is not fully automated in Tauri runtime | `2026-06-18-native-runtime-smoke-checklist.md` requires OS file drop evidence in Tauri runtime before release. | Fill the checklist or replace it with equivalent Tauri automation output. |
| FRR-DND-002 | Mitigated | Some E2E tests document behavior instead of asserting it | The old constant cascade placeholder is gone; current E2E asserts tab hover switching and invalid-zone no-op behavior. | Keep native-only caveats in docs/checklists, not fake tests. |
| FRR-DND-003 | Mitigated | Cross-doc layer ops use dynamic engine calls and `any` casts | `crossDocLayerOps.ts` now uses a narrow typed facade for real engine/workspace methods and production callers pass `WorkspaceManager` directly without `as any`/dynamic method checks. Toast side effects remain a later cleanup. | Keep typed facade aligned with `DocumentEngine` and preserve real-engine integration tests. |
| FRR-DND-004 | Must Fix | Drag/drop combines HTML5, Tauri, Solid context, timers, and workspace mutation | Drop correctness depends on producer state, MIME payload, hover timer, target classification, and active document. | Build one drag-drop state machine with explicit events and tests. |
| FRR-DND-005 | Mitigated | Async file import can partially mutate target document | `addFilesAsLayers` now decodes the whole file batch before history commit or layer creation; decode/read failure returns no created layers and leaves the target document/history unchanged. | Keep the real-engine no-mutation regression test. |
| FRR-DND-006 | Mitigated | Copy vs Alt-move is not atomic across documents | Alt-move now refuses to proceed when the source layer cannot be deleted (currently the source document's last layer), preventing copy masquerading as move. | Keep real-engine tests around source-delete eligibility before target mutation. |
| FRR-DND-007 | Should Fix | OS path handling trusts path strings from events | Tauri file paths flow into `readFileBytes` and bitmap decoding. | Validate supported extensions/size before reading and add failure telemetry. |

## Merge Bar

- No placeholder tests in E2E.
- Tauri-only behavior must have Tauri-runtime proof before release.
- Drag/drop mutations must be transactional or explicitly non-atomic with recovery behavior.

## 2026-06-18 Execution Update

- FRR-DND-003 mitigated for the engine-call/type-safety portion: production cross-doc layer/file operations no longer cast engines or workspaces to `any`.
- Remaining drag/drop review risks: state-machine consolidation (FRR-DND-004) and OS path validation policy (FRR-DND-007).
- FRR-DND-005 mitigated: layer file drops now use decode-first/all-or-nothing mutation for the target document. If any file in the batch fails before mutation, no history entry is committed and no empty layer is created.
- Verification: `pnpm.cmd run type-check` PASS; focused drag/drop tests PASS (4 files / 43 tests); full frontend suite PASS (79 files / 1198 tests); `pnpm.cmd run build` PASS with workspace-local temp HOME after sandboxed pnpm home access failed.
- Follow-up verification after FRR-DND-005: focused decode/wiring/signal suite PASS (3 files / 44 tests); full frontend suite PASS (79 files / 1199 tests); `pnpm.cmd run build` PASS with workspace-local temp HOME.
- FRR-DND-006 mitigated for current source-delete semantics: Alt-move aborts before target mutation when the source document only has one layer.
- Follow-up verification after FRR-DND-006: focused cross-doc move tests PASS (3 files / 24 tests); full frontend suite PASS (79 files / 1201 tests); `pnpm.cmd run build` PASS with workspace-local temp HOME.
