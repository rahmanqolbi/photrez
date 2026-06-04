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

## AI Documentation Protocol

- When **any** AI doc is mentioned (`AI_CONTEXT`, `AI_CURRENT_TASK`, `AI_HISTORY`, `FEATURES`, `ARCHITECTURE`), read **ALL 5** automatically.
- Before modifying code: update `AI_CURRENT_TASK.md` with what you're doing.
- After completing work: update `AI_HISTORY.md` and `FEATURES.md` with results.
- Never truncate or overwrite history in these files — only append.

## Working Mode

- If user says focus on docs, do not start implementation code.
- If user says wait for command, do not execute build implementation.
- Keep decisions synchronized in `docs/01-id-decision-log.md`.

## Definition of Done for Any Delivery

- Changes match locked scope.
- Relevant docs are updated.
- Risks and blockers are clearly reported.

## Verification Pipeline (MANDATORY)

**Run ALL steps below BEFORE marking any task as COMPLETE.**

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

**Do NOT skip any step.** If one fails, FIX before claiming DONE.

Notes:
- `cargo check -p photrez-desktop` will fail due to pre-existing `windres` toolchain issue.
- Use `pnpm.cmd tauri dev` (or `cargo run`) to verify binary compile — bypasses windres.
- `cargo test -p photrez-core` only verifies core crate — NOT the binary crate.
