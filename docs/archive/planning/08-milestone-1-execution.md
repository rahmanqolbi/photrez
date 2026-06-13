# 08 - Milestone 1 Execution Checklist

This file translates Milestone 1 in `07-build-plan.md` into concrete execution tasks.

## Scope

Milestone 1 only:

- Initialize desktop shell.
- Establish core skeleton.
- Establish renderer skeleton.
- Wire minimal command bridge.

No feature implementation outside foundation is allowed in this milestone.

## Work Breakdown

### 1. Repository and Workspace Bootstrap

- Create initial project/workspace layout for:
`apps/desktop`, `crates/core`, `crates/render`.
- Add root-level workspace configuration.
- Add baseline scripts for `build`, `test`, `type-check`, and `lint` placeholders.

Deliverable:

- Workspace compiles with placeholder modules.
Estimated effort: `0.5-1 day`

### 2. Tauri Shell Baseline

- Initialize Tauri app with SolidJS + TypeScript + Vite frontend.
- Confirm shell can open, close, and render a minimal app frame.
- Add minimal command endpoint health-check (for example: `ping` command).

Deliverable:

- Desktop app launches successfully in development mode.
Estimated effort: `0.5-1 day`

### 3. Rust Core Skeleton

- Create core crate with module boundaries:
`document`, `layers`, `selection`, `transform`, `brush`, `export`.
- Expose minimal public interfaces and placeholder command handlers.
- Add unit-test scaffold for module wiring.

Deliverable:

- Core crate compiles and tests run (even if tests are placeholders).
Estimated effort: `1 day`

### 4. Renderer Skeleton (wgpu)

- Create renderer crate with minimal viewport pipeline.
- Initialize renderer context and draw a known baseline frame.
- Keep renderer isolated from persistence and business rules.

Deliverable:

- Renderer path initializes without crashing.
Estimated effort: `1 day`

### 5. Shell-Core-Renderer Bridge

- Define minimal IPC command contract for foundation.
- Wire shell -> core -> renderer bootstrap flow.
- Return deterministic error payload for unsupported/placeholder commands.

Deliverable:

- End-to-end command path works for baseline commands.
Estimated effort: `0.5-1 day`

## Verification Checklist

- [ ] `dev` run launches app successfully.
- [ ] Foundation crates compile without manual patching.
- [ ] Baseline tests execute successfully.
- [ ] Command bridge returns deterministic success/error payloads.
- [ ] No scope leakage into Milestone 2 features.

## Evidence to Capture

- Build command outputs.
- Test command outputs.
- Startup time baseline measurement method used (refer to `docs/reference/performance-measurement-protocol.md`).
- Any known blockers with explicit owner and next action.

## Suggested Day-by-Day Plan

### Day 1

- Complete workspace bootstrap.
- Complete Tauri shell baseline.
- Verify app launch path.

### Day 2

- Complete Rust core skeleton.
- Add minimal unit-test scaffold.
- Verify compile and baseline tests.

### Day 3

- Complete renderer skeleton.
- Verify renderer initialization stability.

### Day 4

- Complete minimal shell-core-renderer bridge.
- Verify deterministic success/error payload behavior.

### Day 5

- Run full Milestone 1 verification checklist.
- Record evidence and blockers.
- Freeze milestone notes for review approval.

## Milestone 1 Exit Note Template

- Completed items:
- Verification commands executed:
- Results summary:
- Budget impact observations:
- Open blockers (if any):
