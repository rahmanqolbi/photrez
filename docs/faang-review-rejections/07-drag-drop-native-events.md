# Drag and Drop and Native Events Review

## Likely Rejections

| ID | Rating | Finding | Evidence | Expected remediation |
| --- | --- | --- | --- | --- |
| FRR-DND-001 | Reject | OS file drop is not fully automated in Tauri runtime | `cross-doc-drag-drop.spec.ts` says full OS-level file drop requires `pnpm tauri dev`; browser tests simulate HTML5 events. | Add Tauri runtime E2E/manual gate with explicit release checklist evidence. |
| FRR-DND-002 | Reject | Some E2E tests document behavior instead of asserting it | The "multi-file cascade positions" test asserts `expect(24).toBe(24)` and notes actual file drop requires Tauri. | Replace placeholder-style E2E with real integration or move it to docs, not tests. |
| FRR-DND-003 | Must Fix | Cross-doc layer ops use dynamic engine calls and `any` casts | `crossDocLayerOps.ts` casts target engines and layers to `any`, calls optional methods dynamically, and imports UI toast side effects. | Create typed adapters and inject notification/error handling. |
| FRR-DND-004 | Must Fix | Drag/drop combines HTML5, Tauri, Solid context, timers, and workspace mutation | Drop correctness depends on producer state, MIME payload, hover timer, target classification, and active document. | Build one drag-drop state machine with explicit events and tests. |
| FRR-DND-005 | Must Fix | Async file import can partially mutate target document | `addFilesAsLayers` commits history before decoding all files; failures toast but do not necessarily rollback created empty layers. | Decode first or use transaction/rollback semantics. |
| FRR-DND-006 | Should Fix | Copy vs Alt-move is not atomic across documents | Source delete happens after target add with per-doc history. | Document non-atomicity in user-facing behavior or implement transaction semantics. |
| FRR-DND-007 | Should Fix | OS path handling trusts path strings from events | Tauri file paths flow into `readFileBytes` and bitmap decoding. | Validate supported extensions/size before reading and add failure telemetry. |

## Merge Bar

- No placeholder tests in E2E.
- Tauri-only behavior must have Tauri-runtime proof before release.
- Drag/drop mutations must be transactional or explicitly non-atomic with recovery behavior.

