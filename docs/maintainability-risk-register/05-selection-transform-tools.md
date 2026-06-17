# Selection, Move, And Transform Tools

## MRR-SEL-001: Selection Has A Better Domain Split, But Integration Still Leaks

Severity: M2

Likely hard-to-maintain path:

- `features/selection/` has domain files for manager, operations, renderer, types, and validator.
- Integration still crosses viewport, overlay, keyboard, history, and engine state.

Why this becomes painful in 6 months:

- Pure selection tests can pass while production wiring breaks.
- The selection domain may look isolated but still depends on editor-wide behavior.

Recommended direction:

- Keep domain isolation, but add a stable integration adapter for viewport/editor dependencies.
- Make selection integration tests assert both model state and visible overlay behavior.

## MRR-SEL-002: Transform State Has Many Entry Points

Severity: M2

Likely hard-to-maintain path:

- Transform behavior touches option bars, overlays, keyboard shortcuts, pointer drag hooks, geometry helpers, and history commits.

Why this becomes painful in 6 months:

- A transform change can break only one entry point, such as keyboard nudging or overlay handle drag.
- The team may fix one path and forget another.

Recommended direction:

- Define transform commands as the only mutation boundary.
- Make UI entry points call the same command layer.
- Keep geometry pure and separate from history/state commits.

## MRR-SEL-003: Large Interaction Tests Are Hard To Refactor

Severity: M2

Likely hard-to-maintain path:

- Selection/transform tests include large suites with repeated editor mocks and pointer helpers.

Why this becomes painful in 6 months:

- Refactors produce many failing tests that all require similar fixture updates.
- Test helpers become implicit framework code with no ownership.

Recommended direction:

- Promote common test setup into typed fixture builders.
- Split giant tests by contract: geometry, command state, viewport wiring, keyboard wiring.
- Keep one full integration test per critical user path instead of many partial near-duplicates.

## MRR-SEL-004: Coordinate And Rotation Semantics Need Explicit Contracts

Severity: M3

Likely hard-to-maintain path:

- Move/transform/selection code depends on layer transforms, rotation normalization, hit testing, and viewport conversion.

Why this becomes painful in 6 months:

- Small geometry changes can change resize/rotate handles in subtle ways.
- Regression reports will be hard to triage without semantic docs.

Recommended direction:

- Add a short geometry contract doc for layer-local, document, and screen coordinate expectations.
- Link tests to the contract cases they protect.

