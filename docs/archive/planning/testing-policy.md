# Testing Policy

This document defines minimum testing expectations for Photrez.
Detailed milestone mapping reference:
`docs/17-test-matrix-by-milestone.md`.
CI automation reference:
`docs/18-ci-verification-plan.md`.

## Principles

- Scope-aligned testing:
test depth must match feature risk and blast radius.
- Deterministic results:
tests should be stable and reproducible.
- Contract-first safety:
shell-core command contracts must be tested explicitly.

## Required Test Layers

1. Unit tests:
core capability modules (`document`, `layers`, `selection`, `transform`, `brush`, `export`).
2. Contract tests:
command request/response shape, including `contract_version` and deterministic error format.
3. Renderer smoke tests:
basic viewport and redraw sanity.
4. Performance checks:
startup, idle RAM, and package size against project budgets.
Method reference: `docs/16-performance-measurement-protocol.md`.

## Milestone-Based Minimums

### Milestone 1 (Foundation)

- Command bridge contract tests for baseline commands.
- Compile and smoke checks for shell/core/renderer skeleton.

### Milestone 2-5 (Feature Delivery)

- New feature unit tests are mandatory.
- Contract tests required if command payload or errors change.
- Failure-path tests required for file I/O and export changes.

### Milestone 6 (Perf Gate)

- Repeatable performance measurement run.
- Evidence recorded for installer size, idle RAM, startup time.
- Measurement must follow `docs/16-performance-measurement-protocol.md`.

## Merge Gate (Minimum)

Before merge:

- Relevant tests pass for changed scope.
- New behavior has test coverage or written justification if temporarily untestable.
- No known regression in previously passing critical tests.

## Evidence Format

Each implementation delivery should include:

- Commands executed.
- Pass/fail summary.
- Any skipped tests and reason.
- Known risks not yet covered by tests.

## Blockers and Exceptions

- If environment blocks full test execution, run highest-signal subset and report gap clearly.
- Any temporary exception must include follow-up task and owner.
