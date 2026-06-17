# Renderer, Export, And Performance Refactor

## Current Problem

`WebGL2Backend` is a useful facade, but internally it owns context creation, shader programs, texture lifecycle, render passes, resize/projection, blending, readback, and disposal. Export can drift from viewport rendering.

## Ponytail Decision

Do not build a multi-renderer abstraction.

Do split WebGL internals behind the current facade only when it deletes complexity.

## What To Keep

- current `WebGL2Backend` public facade,
- WebGL2 as the renderer,
- existing scheduler concept,
- current export behavior until parity tests prove changes,
- pure projection/scissor helpers.

## What To Discard

- one class owning every renderer concern internally,
- production render settings dictated by test readback needs without documentation,
- export semantics that are not tested against viewport semantics,
- texture lifecycle hidden from tests.

## Minimal Internal Split

```text
WebGL2Backend
  GlProgramStore
  TextureRegistry
  RenderPass
  Readback
  ViewportProjection
```

Do not expose these to app code. They are internals.

## Texture Registry Minimum

```ts
interface TextureRegistry {
  upload(layerId: LayerId, source: ImageBitmap): TextureRef;
  destroy(layerId: LayerId): void;
  get(layerId: LayerId): TextureRef | undefined;
  dispose(): void;
}
```

No generic resource manager unless there are multiple resource types with shared lifecycle.

## Export Rule

Export semantics must be documented:

- source of truth for pixel compositing,
- supported formats,
- transparency behavior,
- color/background behavior,
- transform and opacity parity.

## Performance Rule

Measure before optimizing.

Allowed performance checks:

- render one large document,
- pan/zoom viewport,
- paint long stroke,
- crop/apply large bitmap,
- export large document,
- close document and verify resources drop.

## What Not To Build

- renderer plugin system,
- WebGPU path,
- worker renderer,
- scene graph,
- generalized GPU resource manager,
- complex frame scheduler.

## Minimum Proof

Renderer/export refactor needs:

- render still displays layers,
- resize still updates viewport,
- texture destroy called on layer/document close,
- export matches expected opacity/transform cases,
- readback tests do not force production-only settings without a documented reason,
- memory scenario for open/export/close.

## First Slice

Extract `TextureRegistry` internally. It gives concrete lifecycle value and does not require changing app-level renderer usage.

