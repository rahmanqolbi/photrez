# Selection, Move, And Transform Refactor

## Current Problem

Selection has a healthier domain split than many areas, but integration still crosses overlays, pointer routing, keyboard shortcuts, history, engine state, and viewport coordinates.

## Ponytail Decision

Do not rewrite the selection subsystem.

Do protect integration boundaries with small command and adapter functions.

## What To Keep

- `features/selection/` domain split,
- existing selection validator/operations/renderer separation,
- pure transform geometry helpers,
- current overlay UX where proven.

## What To Discard

- overlay-only behavior that blocks canvas production paths,
- transform mutations without shared command entry,
- repeated geometry interpretation in UI components,
- tests that fire events at internals and skip DOM propagation.

## Minimal Move Command

```ts
interface MoveLayerIntent {
  layerId: LayerId;
  delta: Point;
  snap?: Point;
}
```

The move tool should convert pointer movement into intent. The command applies it.

## Minimal Transform Intent

```ts
interface TransformIntent {
  layerId: LayerId;
  transform: Partial<Transform2D>;
  anchor?: Point;
}
```

Do not build a transform graph.

## Overlay Rule

Overlays can own handles.

Overlays should not intercept plain move behavior unless they are the explicit owner of that behavior. If canvas owns move drag, overlay move zones must pass through.

## Coordinate Rule

Transform code must state which coordinate space it accepts:

- screen,
- canvas,
- document,
- layer-local.

If a function name does not reveal the coordinate space, rename it before moving it.

## What Not To Build

- generic transform node tree,
- arbitrary nested groups,
- constraint solver,
- animation system,
- selection plugin API.

## Minimum Proof

Selection/transform refactor needs:

- click select,
- marquee select,
- move selected layer,
- resize handle,
- rotate handle,
- keyboard nudge if supported,
- tool switch cleanup,
- zoom/pan coordinate correctness.

## First Slice

Start with Move tool.

Why:

- high user value,
- lower state than crop,
- exposes pointer, history, lock, coordinate, and overlay issues,
- good template for future tool handler extraction.

