# Drag-Drop And Native IO Refactor

## Current Problem

Drag-drop combines HTML5 drag, pointer-based layer reorder, and Tauri native file drop. Native file IO uses path and base64 helpers that are easy to reuse without policy.

## Ponytail Decision

Do not build a drag-drop framework.

Do define one small drag state model and one native IO policy wrapper.

## What To Keep

- HTML5 drag for in-app cross-document layer drag,
- pointer events for layer reorder if it remains simpler,
- Tauri native file drop for OS files,
- copy default and Alt move behavior,
- current cascade offset rule if still desired.

## What To Discard

- tests that claim native coverage without Tauri runtime,
- raw IO helpers called directly from arbitrary UI paths,
- cross-document operations that depend on active document implicitly,
- adapter casts around workspace/engine types.

## Minimal Drag State

```ts
type DragSource =
  | { kind: "layer"; docId: DocumentId; layerId: LayerId }
  | { kind: "files"; paths: string[] };

type DropTarget =
  | { kind: "canvas"; docId: DocumentId; point: Point }
  | { kind: "tab"; docId: DocumentId }
  | { kind: "layers-panel"; docId: DocumentId }
  | { kind: "new-document" };

interface DragIntent {
  source: DragSource;
  target: DropTarget;
  mode: "copy" | "move";
}
```

This is enough. Do not add a generalized DnD runtime.

## Native IO Policy

All native IO should go through a policy wrapper:

```ts
interface NativeIOPolicy {
  maxReadBytes: number;
  allowedReadExtensions: string[];
  allowedWriteExtensions: string[];
}
```

The wrapper should:

- validate extension where relevant,
- enforce size limits,
- map errors to user-safe codes,
- avoid leaking raw platform errors into UI copy.

## File Transfer Rule

Base64 transfer is acceptable for MVP only if size limits exist.

If large image workflows become common, prefer a streaming/native asset path. Do not design that path before measurement.

## What Not To Build

- atomic multi-document transactions,
- global asset database,
- file watcher,
- custom sandbox,
- generalized drag-drop coordinator across the whole app,
- cloud storage abstraction.

## Minimum Proof

Drag/drop refactor needs:

- layer copy between docs,
- Alt move between docs,
- drop rejected for invalid targets,
- OS file drop verified in Tauri runtime,
- multi-file cascade verified against app state,
- IO errors mapped to safe messages,
- file size limit test.

## First Slice

Replace raw cross-doc casts with typed adapters. Then add one real Tauri smoke checklist/test for OS file drop.

