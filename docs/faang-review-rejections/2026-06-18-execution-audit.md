# 2026-06-18 FAANG Rejection Execution Audit

Status: partial Phase 0 closure with verified code changes.

## Closed In This Pass

| ID | Result | Evidence |
| --- | --- | --- |
| FRR-EXEC-001 / FRR-SHELL-001 | Runtime contract drift reduced | `docs/reference/command-contract-spec.md` now documents the actual Tauri shell runtime contract: `2.0.0`, `ping`, `get_contract_info`, `read_file_bytes`, `write_file_bytes`. |
| FRR-SHELL-002 | Contract version single source hardened | `CONTRACT_VERSION` constant drives success/error envelopes and `get_contract_info`; tests assert the exact runtime command list. |
| FRR-SHELL-004 | Panic-on-serialization removed | Response helpers now convert serialization failures into `E_INTERNAL` envelopes instead of calling `unwrap()` on normal response paths. |
| FRR-SHELL-005 | File IO resource limit added | `read_file_bytes` and `write_file_bytes` reject payloads over 256MB with `E_RESOURCE_LIMIT`. Streaming is still a future improvement. |
| FRR-STATE-001 | Production context fallback removed | `useEditor()` now throws outside `EditorProvider`; tests use explicit providers or `workspaceOverride` instead of relying on fake production context. |
| FRR-EXEC-009 / FRR-TEST-004 | Root static-analysis scripts added | Root `type-check`, `lint`, and `audit` scripts exist; desktop `type-check` and `lint` scripts exist. |
| FRR-EXEC-007 | Debug handle remains guarded | Existing `shouldExposeEditorDebugHandle()` guard remains in place and is covered by debug exposure tests. |

## Verification

- PASS: `pnpm.cmd --filter photrez-desktop test --run src/components/editor/__tests__/CropOverlay.test.tsx src/components/editor/__tests__/DragController.test.tsx src/components/editor/__tests__/crossDocDragDropWiring.test.tsx` (70 tests).
- PASS: `pnpm.cmd --filter photrez-desktop test --run` (77 files, 1079 tests).
- PASS: `pnpm.cmd run type-check`.
- PASS: `pnpm.cmd run lint` (currently a TypeScript static gate).
- PASS: `pnpm.cmd run build`.
- PASS: `cargo test -p photrez-desktop` (8 tests).
- PASS: `cargo test -p photrez-core` (85 tests).
- PASS: `cargo test --workspace`.

## Remaining Review Risk

- `pnpm.cmd run audit` could not complete in sandbox because `pnpm audit` needs network access to `registry.npmjs.org`; an escalated retry was stopped after it exceeded the useful wait window.
- CI workflow was added after the initial Phase 0 pass in `.github/workflows/ci.yml`; successful remote CI/audit output still needs to be captured as release evidence.
- Native Tauri smoke/release proof is still separate from browser E2E proof.
- File IO still uses base64 payloads, so the 256MB cap mitigates worst-case memory risk but does not replace a future streaming design.
