# Tests, CI, And Observability Refactor

## Current Problem

The project has a lot of tests, which is good. But some tests are very large, heavily mocked, or browser-only for native-adjacent behavior. CI is documented as needed but not yet visible as the single enforced gate.

## Ponytail Decision

Do not add test infrastructure for its own sake.

Do add tiny typed fixtures and one root verify command when implementation resumes.

## What To Keep

- Vitest,
- Playwright,
- existing wiring test requirement,
- real pointer-chain tests,
- focused unit tests for pure geometry/engine functions.

## What To Discard

- repeated `as any` editor mocks,
- placeholder tests counted as coverage,
- tests that bypass production DOM path when the bug class is DOM wiring,
- giant fixture setup duplicated across files.

## Minimal Test Fixture Set

Create only these first:

```text
createWorkspaceFixture()
createRendererFixture()
createEditorProviderFixture()
dispatchPointerChain()
createNativeIOFixture()
```

No custom test framework. No fluent DSL.

## Wiring Test Rule

For any feature touching DOM event listeners, Tauri IPC, or Solid context:

- mount the production entry component,
- simulate the real event path,
- assert state mutation or visible output,
- assert cleanup if lifecycle exists.

## CI Rule

Add one root command when ready:

```json
{
  "scripts": {
    "verify": "pnpm run build && pnpm --filter photrez-desktop test --run && pnpm --filter photrez-desktop test:e2e"
  }
}
```

Adjust for Rust tests and Tauri constraints based on the repo's known toolchain notes. The point is one remembered gate.

## Observability Rule

Add small, bounded debug signals only where user failures are currently hard to explain:

- active tool changed,
- command executed,
- command rejected,
- native IO failed,
- renderer resize/context lost,
- export started/finished/failed.

Do not add a telemetry platform for MVP.

## What Not To Build

- custom testing DSL,
- snapshot approval framework,
- full visual regression infrastructure,
- telemetry backend,
- generic logging abstraction,
- flaky timing-heavy E2E matrix.

## Minimum Proof

Testing refactor needs:

- one large test suite reduced or fixture-shared,
- one production `as any` removed,
- one mock-heavy test replaced with typed fixture,
- one native-adjacent behavior clearly labeled browser-only or verified in Tauri,
- root verify command or CI plan updated.

## First Slice

Create typed editor provider fixture and migrate one small test file. Do not start with the largest suite.

