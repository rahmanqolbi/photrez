# Shell, IPC, Security, and Release Review

## Likely Rejections

| ID | Rating | Finding | Evidence | Expected remediation |
| --- | --- | --- | --- | --- |
| FRR-SHELL-001 | Reject | IPC contract version mismatch | Runtime `main.rs` returns `2.0.0`; `command-contract-spec.md` says current version `1.0.0`. | Update spec and tests, or revert runtime version. |
| FRR-SHELL-002 | Reject | Runtime supported command list differs from docs | `main.rs` registers only `ping`, `get_contract_info`, `read_file_bytes`, `write_file_bytes`; docs list many commands. | Generate docs from runtime or add contract test that fails on drift. |
| FRR-SHELL-003 | Reject | Raw file path read/write helpers are too broad for a desktop shell | `read_file_bytes(path: String)` and `write_file_bytes(path: String, data: String)` call `std::fs` directly. | Restrict paths through dialog-returned handles/capabilities, validate scope, and document threat model. |
| FRR-SHELL-004 | Must Fix | Serialization uses `unwrap()` in response helpers | `serde_json::to_value(...).unwrap()` can panic if future data fails serialization. | Return structured internal error instead of unwrap. |
| FRR-SHELL-005 | Must Fix | Base64 IPC duplicates memory for import/export | File bytes are encoded/decoded as base64 strings across IPC. | Stream or chunk large files, or enforce size limits with clear error. |
| FRR-SHELL-006 | Must Fix | No visible `cargo audit`/`npm audit` gate despite dependency policy | `dependency-inventory.md` requires both; package scripts do not expose them. | Add scripts and CI jobs, or update policy with current manual process. |
| FRR-SHELL-007 | Must Fix | Binary verification has a known toolchain workaround | `AGENTS.md` says `cargo check -p photrez-desktop` fails due windres; use `pnpm.cmd tauri dev`. | Make release gate executable and documented with exact command outcome. |
| FRR-SHELL-008 | Should Fix | Error details are always `null` | `err_response` does not carry structured details. | Add safe diagnostic details for validation/path/IO failures. |

## Merge Bar

- Runtime contract and docs must match.
- File IO must have explicit security/capability policy.
- Release verification must be automated or manually signed off with evidence.

