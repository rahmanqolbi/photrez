# Document, Layer, History, And Commands

## Current Problem

`DocumentEngine` is the temporary source of truth, but it owns many domains. UI paths must remember when to call history commit before mutations. That is simple locally but fragile globally.

## Ponytail Decision

Do not build a generic command bus.

Do create small command functions for user-visible mutations that need history discipline.

## What To Keep

- `DocumentEngine` as public facade during MVP,
- `CommandHistory`,
- snapshot/restore behavior,
- current layer model,
- current per-document history decision.

## What To Discard

- UI components directly mixing validation, history, mutation, and render scheduling,
- repeated lock checks in UI-only paths,
- mutation paths without an explicit history decision,
- cross-document operations that cast around real engine types.

## Minimal Command Function

```ts
export function moveLayerCommand(
  ctx: CommandContext,
  layerId: LayerId,
  delta: Point
): CommandResult {
  const layer = ctx.engine.getLayer(layerId);
  if (!layer) return { ok: false, code: "E_NOT_FOUND", message: "Layer not found" };
  if (layer.locked || layer.lockPosition) {
    return { ok: false, code: "E_LOCKED", message: "Layer is locked" };
  }

  ctx.history.commit(ctx.engine.snapshot());
  ctx.engine.moveLayer(layerId, layer.transform.x + delta.x, layer.transform.y + delta.y);
  ctx.requestRender();
  return { ok: true };
}
```

This is intentionally plain. No dispatcher required.

## History Policy Labels

Every command must choose exactly one:

| Policy | Meaning |
| --- | --- |
| `commitBefore` | Most user-visible mutations |
| `commitAfter` | Rare cases where result must be generated first |
| `noHistory` | Pure UI state, preview state, or non-mutating action |

Add a code comment only when the policy is not obvious.

## Layer Lock Rule

Lock validation belongs at command/operation level.

UI may disable controls for affordance, but command validation is the source of truth.

## Cross-Document Rule

Cross-document operations should accept explicit source and target:

```ts
interface CrossDocLayerMove {
  sourceDocId: DocumentId;
  targetDocId: DocumentId;
  layerId: LayerId;
  mode: "copy" | "move";
  targetPosition: Point;
}
```

Do not rely on active document during a cross-document mutation.

## What Not To Build

- event-sourced document engine,
- generalized command registry,
- undo transaction graph,
- atomic multi-document transactions for MVP,
- document database layer,
- engine rewrite to Rust unless scoped separately.

## Minimum Proof

For each command:

- success test,
- validation failure test,
- history commit test,
- render request test if visible pixels change,
- lock-rule test if layer-related,
- production wiring test for one UI entry point.

## First Commands To Create

Start with commands that are high-risk and repeated:

1. `moveLayerCommand`
2. `setLayerOpacityCommand`
3. `deleteLayerCommand`
4. `applyCropCommand`
5. `paintStrokeCommand`

