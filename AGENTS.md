# AGENTS.md

Project-wide instructions for AI coding agents.

## Primary Objective

Build Photrez according to the locked MVP scope and architecture documents.

## Required Read Order (Before Any Task)

1. `docs/AI_CONTEXT.md` — **START HERE** (master AI rules + cross-reference map)
2. `docs/AI_CURRENT_TASK.md` — Active task status
3. `docs/FEATURES.md` — Feature implementation status
4. `docs/ARCHITECTURE.md` — Runtime architecture reference
5. `docs/AI_HISTORY.md` — Change history log
6. `docs/00-vision-and-strategy.md`
7. `docs/00-product-scope.md`
8. `docs/01-prd.md`
9. `docs/02-architecture.md`
10. `docs/03-trd.md`
11. `docs/01-id-decision-log.md`

## AI Documentation Protocol

- When **any** AI doc is mentioned (`AI_CONTEXT`, `AI_CURRENT_TASK`, `AI_HISTORY`, `FEATURES`, `ARCHITECTURE`), read **ALL 5** automatically.
- Before modifying code: update `AI_CURRENT_TASK.md` with what you're doing.
- After completing work: update `AI_HISTORY.md` and `FEATURES.md` with results.
- Never truncate or overwrite history in these files — only append.

## Scope Guard

- Only implement features inside MVP scope unless explicitly approved by user.
- Do not introduce PSD workflow, print checker, plugin runtime, or AI features in MVP execution tasks.

## Architecture Guard

- `Shell (Tauri)` owns app lifecycle, file dialogs, and command bridge only.
- `Core (Rust)` owns document truth and editing logic.
- `Renderer (wgpu)` owns drawing/compositing only.
- Do not place image business logic in shell/frontend layer.

## Command Contract Guard

- All edits must flow through command interfaces.
- Use deterministic command envelopes from `docs/03-trd.md` and ADR `0002`.
- Any breaking command schema change requires ADR update.

## Security Guard

- Treat imported files as untrusted input.
- Enforce validation boundaries for path, extension, and resource limits.
- Fail closed on parse/decode errors.

## Performance Guard

Target budgets:

- Installer `< 80 MB`
- Idle RAM `< 250 MB`
- Startup `< 2s`

Do not accept changes that knowingly violate these targets without explicit approval.

## Working Mode

- If user says focus on docs, do not start implementation code.
- If user says wait for command, do not execute build implementation.
- Keep decisions synchronized in `docs/01-id-decision-log.md`.

## Definition of Done for Any Delivery

- Changes match locked scope.
- Relevant docs are updated.
- Risks and blockers are clearly reported.

## Verification Pipeline (MANDATORY)

**WAJIB jalankan SEMUA tahap berikut SEBELUM mark task sebagai COMPLETE.**

### Rust Changes

```
cargo test -p photrez-core              # Core unit tests
cargo test --workspace                  # All Rust workspace tests
```

### Frontend Changes

```
pnpm.cmd run build                      # TypeScript + Vite build
pnpm.cmd --filter photrez-desktop test  # Frontend unit tests
```

### Binary / App-Level Changes (main.rs, Tauri commands)

```
pnpm.cmd tauri dev                      # Verify app compiles AND launches
```

**JANGAN skip tahap manapun.** Jika salah satu gagal, FIX dulu sebelum claim DONE.

Catatan:
- `cargo check -p photrez-desktop` akan gagal karena pre-existing `windres` toolchain issue.
- Gunakan `pnpm.cmd tauri dev` (atau `cargo run`) untuk verify binary compile — ini melewati windres.
- `cargo test -p photrez-core` hanya verify core crate — TIDAK verify binary crate.
