# AGENTS.md

Project-wide instructions for AI coding agents.

## Primary Objective

Build Photrez according to the locked MVP scope and architecture documents.

## Required Read Order (Before Any Task)

1. `docs/00-vision-and-strategy.md`
2. `docs/00-product-scope.md`
3. `docs/01-prd.md`
4. `docs/02-architecture.md`
5. `docs/03-trd.md`
6. `docs/01-id-decision-log.md`

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
