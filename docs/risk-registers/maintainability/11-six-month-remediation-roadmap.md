# Six-Month Remediation Roadmap

This roadmap turns the maintainability risks into practical work. It assumes normal feature development continues, so the goal is to reduce risk incrementally instead of pausing the product.

## Phase 0: Immediate Guardrails

Target: next 1-2 weeks

- Add this folder to planning references for any new editor feature.
- Add a short rule: touching `CanvasViewport.tsx`, `useCanvasPointerTools.ts`, `CropOptionBar.tsx`, `DocumentEngine`, or `webgl2.ts` requires naming the relevant `MRR-*` ID in the task.
- Stop adding new production `as any` except at documented platform interop boundaries.
- Replace placeholder tests in active work areas with stateful assertions.
- Decide the authoritative IPC contract version and document the migration note.

Success signal:

- New tasks reference maintainability IDs.
- New tool/feature reviews include an ownership boundary section.

## Phase 1: Typed Test Infrastructure

Target: month 1

- Build typed test fixtures:
  - editor context fixture,
  - workspace/session fixture,
  - renderer/scheduler fixture,
  - pointer event fixture,
  - native IO mock fixture.
- Move repeated test setup out of large suites.
- Split at least one giant suite as the pattern.

Success signal:

- New tests do not need broad `as any` to mount editor flows.
- Refactoring a provider requires updating one fixture, not many tests.

## Phase 2: Interaction Boundary Extraction

Target: months 2-3

- Extract a pointer tool dispatcher shell from `useCanvasPointerTools.ts`.
- Move one tool into a typed handler module as the reference implementation.
- Extract viewport shell sections from `CanvasViewport.tsx` without changing behavior.
- Add coordinate adapter contracts for fit, pan, zoom, and high-DPI paths.

Success signal:

- Adding a new tool no longer requires editing a 800-line dispatcher directly.
- Tool switch tests cover cleanup through a shared handler contract.

## Phase 3: Command And History Discipline

Target: months 3-4

- Introduce typed command wrappers for user-visible mutations.
- Make history strategy explicit per command.
- Add cross-document command contracts for copy/move/drop behavior.
- Centralize layer lock validation.

Success signal:

- Undo/redo coverage is attached to command tests, not scattered UI tests.
- New mutations cannot skip a history decision silently.

## Phase 4: Renderer And Native IO Hardening

Target: months 4-5

- Split WebGL internals behind the existing backend facade.
- Add texture lifecycle and memory-budget checks.
- Add native IO policy wrappers for size, path, and error mapping.
- Define export parity tests against viewport semantics.

Success signal:

- Renderer work can be reviewed by concern.
- Large file operations have visible policy gates.

## Phase 5: Governance And CI Closure

Target: months 5-6

- Add a root `verify` script.
- Add CI with frontend tests, build, Rust tests, and doc contract parity checks.
- Add a quarterly maintainability audit that refreshes this folder.
- Convert M1/M2 open items into regular backlog tasks.

Success signal:

- Release confidence does not depend on memory or manual command recall.
- Docs, runtime contracts, and feature status are checked together.

## Priority Order

1. `MRR-ARCH-002`: contract source of truth.
2. `MRR-STATE-002`: typed fixtures and context fallback cleanup.
3. `MRR-VIEW-001`: viewport ownership extraction.
4. `MRR-VIEW-002`: pointer tool handler boundary.
5. `MRR-LAYER-002`: command/history discipline.
6. `MRR-DD-004`: replace placeholder native-adjacent coverage.
7. `MRR-TEST-003`: CI/verify command.

