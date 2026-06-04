# 18 - CI Verification Plan (MVP)

This document defines CI verification stages for Photrez during MVP execution.

## 1) Objectives

- Convert testing and quality rules into repeatable automation.
- Block merges that violate scope-critical quality gates.
- Keep CI lightweight while still high-signal for MVP.

## 2) Source References

- `docs/testing-policy.md`
- `docs/17-test-matrix-by-milestone.md`
- `docs/15-command-contract-spec.md`
- `docs/16-performance-measurement-protocol.md`
- `docs/14-definition-of-ready.md`

## 3) Pipeline Topology

Use one primary pipeline with staged gates:

1. `preflight`
2. `build-and-static-checks`
3. `test-core`
4. `test-contract`
5. `test-render-smoke` (when renderer tests exist)
6. `perf-gate` (Milestone 6 and release candidates)
7. `packaging-check` (release candidates)

Fail-fast rule:

- If a required stage fails, downstream required stages must not pass the merge gate.

## 4) Stage Definitions

### 4.1 `preflight`

Purpose:

- Validate repository integrity and toolchain readiness.

Minimum checks:

- Workspace config present.
- Rust and Node toolchain version check.
- Lockfile presence check.

### 4.2 `build-and-static-checks`

Purpose:

- Catch compile/type/lint issues early.

Minimum checks:

- Rust build/check.
- Frontend type-check.
- Lint checks (scope-relevant).

### 4.3 `test-core`

Purpose:

- Execute required Unit tests from active milestone scope.

Rules:

- Must include core modules relevant to changed scope.
- If tests are missing for new behavior, CI must fail or require approved temporary exception note.

### 4.4 `test-contract`

Purpose:

- Enforce command envelope and deterministic error shape.

Minimum checks:

- Success envelope validation.
- Error envelope validation.
- `contract_version` presence check.
- Deterministic `E_VALIDATION` and `E_UNSUPPORTED` behavior where applicable.

### 4.5 `test-render-smoke`

Purpose:

- Verify renderer initialization and minimal draw path stability.

Rules:

- Required for milestones touching renderer behavior.
- Skip allowed only with explicit exception record and owner.

### 4.6 `perf-gate`

Purpose:

- Validate startup/RAM/installer against budgets.

Rules:

- Must follow `docs/16-performance-measurement-protocol.md`.
- Required for Milestone 6 and release candidates.
- Report PASS/CONDITIONAL/FAIL in CI summary artifact.

### 4.7 `packaging-check`

Purpose:

- Validate release artifact creation and size checks.

Minimum checks:

- Packaging command succeeds.
- Installer artifact generated and size captured.

## 5) Milestone-to-CI Gate Mapping

| Milestone | Required CI Stages |
| --- | --- |
| M1 Foundation | preflight, build-and-static-checks, test-contract, test-render-smoke |
| M2 Document + Layer Core | preflight, build-and-static-checks, test-core, test-contract |
| M3 Selection/Transform/Crop/Resize | preflight, build-and-static-checks, test-core, test-contract |
| M4 Brush/Eraser | preflight, build-and-static-checks, test-core, test-render-smoke |
| M5 Export + Hardening | preflight, build-and-static-checks, test-core, test-contract |
| M6 Perf Gate + Packaging | all stages including perf-gate and packaging-check |

## 6) Merge Gate Policy

A PR is mergeable only if:

1. All required stages for the target milestone pass.
2. No failing required test from touched scope.
3. Any skipped required stage has approved exception note with owner and due date.

## 7) CI Evidence Artifacts

Each CI run should publish:

1. Stage summary (pass/fail/skip).
2. Test summary by layer (unit/contract/renderer/perf).
3. Performance summary (when perf-gate runs).
4. Installer size record (when packaging-check runs).
5. Exception notes (if any).

## 8) Temporary Exception Policy

A temporary exception is allowed only with:

1. Explicit reason.
2. Risk impact level.
3. Owner.
4. Due milestone for closure.

Exception records must be linked in:

- PR description (or equivalent review note).
- Milestone exit notes.
- `docs/13-risk-register.md` when risk is material.

## 9) Future CI Enhancements (Post-MVP)

- Nightly benchmark trend tracking.
- Flaky-test detection and quarantine workflow.
- Cross-platform matrix expansion (macOS/Linux).
