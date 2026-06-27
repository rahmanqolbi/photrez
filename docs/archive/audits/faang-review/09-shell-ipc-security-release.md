# Shell, IPC, Security, and Release Review

## Likely Rejections

| ID | Rating | Finding | Evidence | Expected remediation |
| --- | --- | --- | --- | --- |
| FRR-SHELL-001 | Mitigated | IPC contract version mismatch | 2026-06-18: runtime, `command-contract-spec.md`, and `ARCHITECTURE.md` now agree on `2.0.0`. | Keep contract version assertions in tests. |
| FRR-SHELL-002 | Mitigated | Runtime supported command list differs from docs | 2026-06-18: runtime docs list only `ping`, `get_contract_info`, `read_file_bytes`, and `write_file_bytes`. | Generate docs from runtime or keep exact command-list tests to prevent drift. |
| FRR-SHELL-003 | Mitigated | Raw file path read/write helpers are too broad for a desktop shell | `read_file_bytes` now rejects unsupported import extensions before metadata/read, and `write_file_bytes` rejects unsupported export extensions before decode/write. The remaining command surface is image import/export only. | Keep extension allowlist tests and revisit handle/capability design if non-image file IO enters scope. |
| FRR-SHELL-004 | Mitigated | Serialization uses `unwrap()` in response helpers | 2026-06-18: normal response helpers return structured `E_INTERNAL` serialization errors instead of panicking. | Keep contract tests for error envelopes. |
| FRR-SHELL-005 | Mitigated | Base64 IPC duplicates memory for import/export | 2026-06-18: read/write helpers enforce a 256MB `E_RESOURCE_LIMIT`; streaming remains future scale work. | Revisit streaming if large-file support becomes explicit product scope. |
| FRR-SHELL-006 | Mitigated | No visible `cargo audit`/`npm audit` gate despite dependency policy | Root `audit` script exists and `.github/workflows/ci.yml` runs it after installing `cargo-audit`. | Capture successful audit job output in release evidence. |
| FRR-SHELL-007 | Mitigated | Binary verification has a known toolchain workaround | `2026-06-18-native-runtime-smoke-checklist.md` now requires `pnpm.cmd tauri dev` or installer launch evidence for each release candidate. | Fill the checklist with exact command/output evidence before release. |
| FRR-SHELL-008 | Should Fix | Error details are always `null` | `err_response` does not carry structured details. | Add safe diagnostic details for validation/path/IO failures. |

## 2026-06-18 Execution Update

- FRR-SHELL-001 and FRR-SHELL-002: mitigated. Runtime and `command-contract-spec.md` now agree on contract `2.0.0` and the four registered commands.
- FRR-SHELL-004: mitigated. Normal success/error response helpers no longer use serialization `unwrap()`.
- FRR-SHELL-005: partially mitigated. `read_file_bytes` and `write_file_bytes` now enforce a 256MB limit; streaming/chunking remains future work.
- FRR-SHELL-006: script gap closed. `pnpm.cmd run audit` exists, but local execution was blocked by network access to the npm advisory endpoint.
- FRR-SHELL-007: mitigated by the native runtime smoke checklist; completed evidence remains release-candidate work.
- FRR-SHELL-003: mitigated for the current image-only command surface. Runtime read/write helpers enforce explicit extension allowlists: import `.png/.jpg/.jpeg/.webp/.gif/.bmp/.tif/.tiff`; export `.png/.jpg/.jpeg/.webp`.

## Merge Bar

- Runtime contract and docs must match.
- File IO must have explicit security/capability policy.
- Release verification must be automated or manually signed off with evidence.
