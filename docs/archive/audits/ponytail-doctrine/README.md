# Ponytail Refactor Doctrine

Created: 2026-06-17

This folder defines how Photrez should be refactored or rebuilt if we were allowed to start over while still respecting the locked MVP. The goal is not to create a grand architecture. The goal is to remove the parts that make change expensive, then rebuild only the smallest boundaries that protect real user workflows.

The doctrine intentionally applies the Ponytail rule:

> The best code is the code we never had to write.

## What This Is

This is a practical refactor doctrine:

- what to keep,
- what to discard,
- what to simplify,
- what to defer,
- what a minimal implementation should look like,
- what tests prove the implementation is real.

## What This Is Not

This is not:

- a request to rewrite the whole app now,
- a new framework,
- a dependency shopping list,
- a command bus for its own sake,
- a clean architecture ceremony,
- a speculative future editor architecture.

## Ponytail Ladder For Every Refactor

Before creating a new module, class, abstraction, algorithm, context, provider, hook, event bus, or service, ask these in order:

1. Does this need to exist?
2. Can the current code be deleted instead?
3. Does the platform or existing dependency already do it?
4. Does an existing local helper already cover it?
5. Can this be one function?
6. Can this be one type plus one function?
7. Only then, create the smallest module that protects a real product boundary.

## The Main Position

If refactoring Photrez from scratch, do not throw away the product. Throw away the accidental shape:

- one giant viewport component,
- one giant pointer dispatcher,
- one giant editor context,
- manual history discipline scattered through UI,
- crop state with overlapping legacy and modern paths,
- renderer class that owns every low-level concern,
- tests that mock internal shapes instead of proving user paths,
- docs/runtime contracts that drift.

## File Index

| File | Purpose |
| --- | --- |
| `00-ponytail-rules-and-refactor-non-goals.md` | Rules, anti-overengineering gates, and forbidden architecture moves |
| `01-keep-discard-defer-map.md` | Complete keep/discard/defer map for current Photrez |
| `02-target-architecture-minimum.md` | Minimal target architecture without ceremony |
| `03-editor-state-context-simplification.md` | Smaller contexts and state ownership |
| `04-tools-pointer-keyboard-routing.md` | Tool state machines, pointer routing, keyboard routing |
| `05-document-layer-history-commands.md` | Document engine, layer model, command/history discipline |
| `06-crop-resize-refactor.md` | Crop/resize simplification |
| `07-selection-transform-refactor.md` | Selection/move/transform simplification |
| `08-brush-eraser-paint-refactor.md` | Brush/eraser paint model |
| `09-drag-drop-native-io-refactor.md` | Drag/drop and native file IO |
| `10-renderer-export-performance-refactor.md` | Renderer/export/performance boundary |
| `11-tests-ci-observability-refactor.md` | Tests, CI, observability, release confidence |
| `12-migration-roadmap.md` | Step-by-step migration plan that avoids big-bang rewrite |
| `13-review-checklists.md` | Checklists for future implementation reviews |

## Highest Priority Refactors

1. Replace manual history discipline with tiny typed command functions.
2. Split `useCanvasPointerTools` into per-tool handlers behind one small dispatcher.
3. Split `CanvasViewport` into shell, pointer bridge, overlay host, pasteboard, and drop-zone host.
4. Replace broad editor context mocks with typed test fixtures and narrower hooks.
5. Decide the authoritative IPC contract source and test docs/runtime parity.
6. Collapse crop state into one command model.
7. Add a real native verification path for Tauri file drop and file IO.

## How To Use This Folder

When planning a refactor:

1. Read the relevant area file.
2. Copy the "Ponytail decision" section into the task plan.
3. Pick one migration slice from `12-migration-roadmap.md`.
4. Add tests from the relevant "minimum proof" section.
5. Do not introduce a new abstraction unless the doc says what existing complexity it removes.

