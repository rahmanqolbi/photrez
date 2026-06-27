# Brush And Eraser Paint Refactor

## Current Problem

Brush and eraser behavior spans UI controls, cursor overlay, pointer routing, brush state, paint smoothing, brush masks, preview rendering, and committed bitmap mutation. Performance and visual quality are easy to regress.

## Ponytail Decision

Do not build a professional brush engine.

Do define one stroke model shared by preview and commit paths.

## What To Keep

- current brush/eraser MVP semantics,
- calibrated brush-tip alpha mask behavior,
- deterministic pixel output,
- current option bar controls that users need,
- existing paint tests with meaningful pixel assertions.

## What To Discard

- preview and commit paths using different stroke meanings,
- brush performance logic hidden inside UI hooks,
- cursor state that can outlive active tool,
- per-option custom algorithms where simple math works.

## Minimal Stroke Model

```ts
interface PaintStroke {
  tool: "brush" | "eraser";
  points: Point[];
  size: number;
  hardness: number;
  opacity: number;
  color: Rgba;
  blendMode: "normal";
}
```

Keep `blendMode` fixed until product scope requires more.

## Minimal Stroke Lifecycle

```text
idle
  -> previewing pointer hover
  -> painting pointer down
  -> committed pointer up
  -> cancelled on tool switch/cancel/lost capture
```

No state machine library. Use a discriminated union.

## Preview And Commit Rule

Preview and commit must use the same stroke input.

They may use different output targets:

- preview target: temporary overlay/canvas,
- commit target: active layer bitmap.

But the stroke meaning must not fork.

## Performance Rule

Optimize only measured hot paths:

- brush-tip mask caching,
- spacing along stroke,
- incremental preview,
- avoiding full-layer copies during pointer move.

Do not add worker/offscreen rendering until measurement proves main-thread rendering cannot meet interaction needs.

## What Not To Build

- brush marketplace,
- pressure curves,
- smudge/heal/clone engine,
- full layer compositing engine inside brush,
- GPU brush path before CPU path is measured.

## Minimum Proof

Brush refactor needs:

- hard brush pixel test,
- soft brush pixel test,
- eraser alpha test,
- stroke spacing test,
- pointer chain integration test,
- tool switch cleanup test,
- simple performance budget check for a long stroke.

## First Slice

Create `PaintStroke` type and convert one brush commit path to consume it. Do not move all brush code first.

