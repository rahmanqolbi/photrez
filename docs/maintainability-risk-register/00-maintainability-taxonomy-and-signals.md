# Maintainability Taxonomy And Signals

This file defines the shared language for the maintainability risk register.

## What Counts As A Maintainability Risk

A maintainability risk is any code, test, documentation, or process pattern that makes future changes:

- harder to understand without deep tribal knowledge,
- harder to review because ownership is unclear,
- harder to test in the same path users actually exercise,
- harder to migrate because contracts are implicit,
- harder to debug because failures have weak signals.

## Severity Scale

| Severity | Six-month meaning | Typical response |
| --- | --- | --- |
| M1 | Will slow or block near-term feature work repeatedly | Create remediation task before adjacent feature work |
| M2 | Will become expensive after 2-3 more tools/features | Refactor opportunistically with tests |
| M3 | Localized drag with bounded blast radius | Fix while touching the file |
| M4 | Cleanup only | Batch with housekeeping |

## Common Smells In This Codebase

### One File Owns Too Many User Paths

Signals:

- File crosses 500 lines and owns UI, state, event handling, and engine calls.
- Tests for the file cross 1k lines and require many mocks.
- New features need edits in the same file repeatedly.

Current examples:

- `CanvasViewport.tsx`
- `useCanvasPointerTools.ts`
- `CropOptionBar.tsx`
- `DocumentEngine`
- `webgl2.ts`

### Type Boundaries Are Bypassed

Signals:

- Production code uses `as any`.
- Tests must cast every provider or engine mock.
- Context fallback values can exist without a real workspace, renderer, or scheduler.

Six-month impact:

- API changes look compile-safe but break at runtime.
- Test mocks become the real contract instead of production types.

### Docs And Runtime Contracts Drift

Signals:

- Docs define a contract version or command list that runtime no longer returns.
- Feature status says DONE, but active task history has another IN PROGRESS branch for the same capability.
- Reference docs are not checked by tests.

Six-month impact:

- New contributors implement against stale docs.
- Release/debug conversations become archaeology.

### Tests Prove Internals Instead Of User Contracts

Signals:

- Tests assert helper calls but not visible user state.
- Browser tests document native behavior that requires Tauri.
- Placeholder assertions exist for expected behavior.

Six-month impact:

- Regression confidence drops even while test count grows.
- Refactors are avoided because tests are brittle.

## Ownership Gates

Before adding a feature, ask:

1. Which module owns the user-visible state?
2. Which module owns the mutation?
3. Which module owns render/presentation?
4. Which module owns native/file-system effects?
5. Which test proves the production wiring path?

If the answer to any question is "several files depending on the path", add or update an `MRR-*` entry.

## Maintenance Budget Rule

For every feature that touches a high-risk area:

- Spend one small refactor to reduce future risk.
- Prefer extracting typed adapters over moving logic blindly.
- Add one wiring test for the production path touched.
- Update the relevant docs before declaring the task complete.

