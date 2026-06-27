# Layers, Workspace, And History

## MRR-LAYER-001: DocumentEngine Is Too Broad To Stay Easy To Change

Severity: M1

Likely hard-to-maintain path:

- `DocumentEngine` owns layer CRUD, transforms, selection, viewport, crop, resize, render state, snapshots, dirty tracking, memory accounting, and pixel sampling.

Why this becomes painful in 6 months:

- Any domain change risks changing the public engine facade.
- Undo/redo and render invalidation become easy to forget.
- Tests for one domain need full engine setup.

Recommended direction:

- Keep `DocumentEngine` as facade, but move internals into domain services:
  - layer stack,
  - selection model,
  - viewport model,
  - crop/resize operations,
  - render invalidation.
- Add contract tests at the facade boundary.

## MRR-LAYER-002: History Commit Discipline Is Manual

Severity: M1

Likely hard-to-maintain path:

- Many UI paths call engine mutations directly and must remember `history.commit()` before mutation.
- New tool instructions already call out undo/redo wiring as a frequent failure.

Why this becomes painful in 6 months:

- New mutations can ship without undo coverage.
- Tests may verify state changes but not history behavior.

Recommended direction:

- Route all user-visible mutations through typed command functions.
- Make command functions require a history strategy: `commitBefore`, `commitAfter`, or `noHistory`.
- Add mutation tests that fail when a command mutates without a history decision.

## MRR-LAYER-003: Per-Document Workspace State Can Drift During Cross-Doc Work

Severity: M2

Likely hard-to-maintain path:

- Workspace owns sessions and histories.
- Cross-document operations can copy or move layers between documents.
- Active document changes can happen via tab hover, drop targets, or direct switch.

Why this becomes painful in 6 months:

- Bugs appear only when two documents are open.
- Dirty state, history stack, and active layer can diverge across documents.

Recommended direction:

- Define a cross-document command contract with source doc, target doc, history policy, and active selection outcome.
- Add a two-document state machine test for every cross-doc command.

## MRR-LAYER-004: Layer Lock Rules Are Spread Across UI And Operation Paths

Severity: M2

Likely hard-to-maintain path:

- Layer lock flags affect move, rotate, paint, delete, reorder, and drag-drop.
- Some checks live in UI hooks, some in engine methods.

Why this becomes painful in 6 months:

- New operations may bypass lock rules.
- UI can block an action that a keyboard shortcut still allows.

Recommended direction:

- Centralize lock validation in operation-level guards.
- Keep UI guards only for affordance and messaging.
- Add shared lock-behavior tests per mutation category.

