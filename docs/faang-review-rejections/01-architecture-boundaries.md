# Architecture and Ownership Boundary Review

## Likely Rejections

| ID | Rating | Finding | Evidence | Expected remediation |
| --- | --- | --- | --- | --- |
| FRR-ARCH-001 | Reject | Runtime IPC contract and docs drift | `main.rs` returns contract `2.0.0` and supports `ping`, `get_contract_info`, `read_file_bytes`, `write_file_bytes`; `docs/reference/command-contract-spec.md` still says current version `1.0.0` and lists many workspace/layer/render commands. | Make contract spec generated or tested against runtime; update ADR/version docs. |
| FRR-ARCH-002 | Reject | MVP runtime ownership is split across TS engine, Rust core docs, and stale architecture tables | `ARCHITECTURE.md` still describes many Tauri commands and Rust workspace ownership while active hot path uses TypeScript `DocumentEngine` + WebGL2. | Add a current runtime boundary doc that separates active code from reference/future target. |
| FRR-ARCH-003 | Must Fix | `EditorContext` aggregates too many subsystem concerns | `EditorContextValue` includes workspace, renderer, scheduler, camera, tool state, crop state, modern crop undo, brush settings, dialogs, feature flags, and toasts. | Split into narrower providers or typed subsystem contexts with clear dependency direction. |
| FRR-ARCH-004 | Must Fix | Renderer and editing concerns are coupled through component-level orchestration | `CanvasViewport.tsx` coordinates WebGL renderer, crop geometry, brush overlay, drag/drop, pan navigation, selection overlay, and tool dispatch. | Move orchestration into feature-specific controllers with small props contracts. |
| FRR-ARCH-005 | Should Fix | Future target crates risk becoming stale reference code | Docs say Rust core/render are future target/reference while active behavior is TypeScript/WebGL2. | Add parity policy: either migrate behavior, delete stale paths, or mark reference-only modules explicitly. |
| FRR-ARCH-006 | Should Fix | Decision logs are strong, but not machine-enforced | Docs require module boundaries, dependency updates, and verification gates; scripts do not enforce all of them. | Convert critical rules to lint/check scripts. |

## Why A Strict Reviewer Would Push Back

Large teams reject architecture drift because it creates ownership ambiguity. If docs, tests, and runtime disagree, reviewers cannot know whether a change is correct or merely compatible with stale assumptions.

## Merge Bar

- Contract version and command list must be single-source-of-truth.
- Active MVP runtime boundaries must be clearly marked.
- High-fanout providers should be split or guarded by explicit ownership comments and tests.

