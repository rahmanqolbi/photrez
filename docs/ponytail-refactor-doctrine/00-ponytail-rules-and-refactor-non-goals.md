# Ponytail Rules And Refactor Non-Goals

## Core Rule

Photrez refactor work must reduce the amount of code future features need to understand.

If a refactor adds more concepts than it removes, it is probably not Ponytail-compliant.

## The Refactor Ladder

Use this exact ladder in design reviews:

1. **Delete:** Can we remove this behavior, compatibility path, duplicate state, or unused abstraction?
2. **Inline:** Can the code stay local because it is used once?
3. **Use native/platform:** Can browser, Tauri, Solid, TypeScript, Rust, or WebGL already do this?
4. **Use existing project helper:** Is there already a viewport, geometry, command, or renderer helper?
5. **Extract one function:** Is the problem just repeated logic?
6. **Extract one module:** Is there a real ownership boundary?
7. **Introduce a service/state machine:** Only when there is user-visible lifecycle complexity.

## What Counts As Overengineering Here

Avoid:

- app-wide event buses,
- generic command buses before command count justifies them,
- plugin systems for MVP tools,
- inversion-of-control containers,
- schema languages for small local types,
- generic state machines that hide simple branching,
- renderer abstraction layers before there is a second renderer,
- custom file system layers that duplicate Tauri plugins without policy value,
- utility folders that become dumping grounds.

## What Is Not Overengineering

These are allowed because they remove real current risk:

- typed test fixtures,
- one small command wrapper for history-sensitive mutations,
- one pointer handler interface for tools,
- one coordinate adapter for screen/canvas/document/layer conversion,
- one native IO policy wrapper around trust boundaries,
- one renderer facade that preserves current public API while internals split,
- one docs/runtime parity check for IPC contracts.

## Required Refactor Test

Every refactor task must answer:

- What code can be deleted after this?
- Which file becomes smaller?
- Which future feature becomes easier?
- Which test proves production wiring still works?
- Which existing behavior did we intentionally preserve?

If the answer is "none", do not do the refactor.

## The Smallest Useful Abstraction Rule

An abstraction is allowed only when it has all of these:

- a named owner,
- at least two real consumers or one high-risk lifecycle,
- fewer concepts than the code it replaces,
- a narrow typed input/output,
- a test that proves the user path, not just the helper.

## Defer List

Do not build these during the MVP refactor:

- full plugin system for editor tools,
- full scripting API,
- generalized document graph,
- collaborative editing engine,
- renderer backend selection framework,
- cross-platform file sandbox model beyond Tauri policy needs,
- global telemetry pipeline,
- complex dependency injection framework.

## Keep List

Keep these unless a specific task proves otherwise:

- SolidJS component model,
- Tauri 2 app shell,
- `DocumentEngine` as temporary public facade,
- existing viewport geometry helpers,
- existing selection domain split,
- existing brush-tip mask work,
- existing tests that prove real user paths,
- current design tokens and shell layout.

## Documentation Rule

Every new refactor doc or plan must include:

- "What this removes"
- "What this keeps"
- "Minimum implementation"
- "What not to build"
- "Minimum proof"

