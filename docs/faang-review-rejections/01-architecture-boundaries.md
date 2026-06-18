# Architecture and Ownership Boundary Review

## Likely Rejections

| ID | Rating | Finding | Evidence | Expected remediation |
| --- | --- | --- | --- | --- |
| FRR-ARCH-001 | Mitigated | Runtime IPC contract and docs drift | 2026-06-18: `main.rs`, `command-contract-spec.md`, and `ARCHITECTURE.md` now agree on contract `2.0.0` and the four registered Tauri commands. Generated-doc enforcement remains future work. | Keep command-list tests and consider generating docs from runtime metadata. |
| FRR-ARCH-002 | Must Fix | MVP runtime ownership is split across TS engine, Rust core docs, and historical diagrams | `ARCHITECTURE.md` now marks active Tauri commands correctly, but the large ASCII diagram still contains historical workspace/layer command labels for ownership context. | Redraw or split active-runtime and historical/future-target diagrams. |
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
