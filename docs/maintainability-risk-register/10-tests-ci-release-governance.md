# Tests, CI, And Release Governance

## MRR-TEST-001: Test Count Can Hide Fragility

Severity: M1

Likely hard-to-maintain path:

- The project has many frontend tests, but some suites are extremely large and mock-heavy.
- `as any` appears frequently in tests.

Why this becomes painful in 6 months:

- Refactors will break many tests for fixture-shape reasons.
- Passing tests may not prove production wiring.

Recommended direction:

- Create typed fixtures for editor context, workspace, renderer, scheduler, and pointer events.
- Track "wiring tests" separately from pure unit tests.
- Require every new feature to prove at least one production entry point.

## MRR-TEST-002: Giant Test Files Need Ownership Boundaries

Severity: M2

Likely hard-to-maintain path:

- Large tests such as `CanvasViewport.test.tsx`, `CropOverlay.test.tsx`, and `CropOptionBar.test.tsx` carry many scenarios in one file.

Why this becomes painful in 6 months:

- One fixture change can create a wall of failures.
- New contributors will not know where to place tests.

Recommended direction:

- Split large test files by contract area.
- Keep shared test helpers in small typed modules.
- Name tests by user contract, not implementation detail.

## MRR-TEST-003: CI Is Documented As Needed But Not Yet A Visible Gate

Severity: M1

Likely hard-to-maintain path:

- `FEATURES.md` lists CI pipeline as TODO.
- Root scripts include build and E2E, but no single verify command that runs the project-required pipeline.

Why this becomes painful in 6 months:

- Different contributors run different checks.
- Documentation-only policy can drift from actual merge behavior.

Recommended direction:

- Add a root `verify` script after agreeing on exact command cost.
- Wire CI to run frontend tests, build, Rust tests, and doc contract checks.
- Keep known environment exceptions documented but explicit.

## MRR-TEST-004: Placeholder Or Documentation-Only Tests Should Not Count As Coverage

Severity: M2

Likely hard-to-maintain path:

- Some tests document expectations instead of asserting app state.

Why this becomes painful in 6 months:

- Coverage reports can overstate real protection.
- Risky areas may look tested.

Recommended direction:

- Tag documentation-only tests or convert them into real assertions.
- Add a periodic test audit for placeholder assertions, excessive mocks, and unsupported runtime assumptions.

## MRR-TEST-005: Release Gates Need Observable Outputs

Severity: M2

Likely hard-to-maintain path:

- Release readiness appears in docs, but app-level observability is thin.

Why this becomes painful in 6 months:

- QA failures will be hard to localize.
- Users may report "tool did nothing" without useful diagnostics.

Recommended direction:

- Add structured logs or debug events for tool activation, command execution, native IO, renderer resize, and export.
- Keep production logs user-safe and bounded.

