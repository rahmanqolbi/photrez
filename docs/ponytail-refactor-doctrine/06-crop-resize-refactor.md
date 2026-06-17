# Crop And Resize Refactor

## Current Problem

Crop is feature-rich but state-heavy. UI, geometry, engine mutation, hidden preview, target size, fill behavior, and modern crop state can overlap. This makes crop expensive to change and risky to test.

## Ponytail Decision

Do not create a full crop engine.

Do define one crop intent model and make UI convert user choices into that model.

## What To Keep

- Free, Ratio, and Size modes,
- guide modes,
- Enter/Esc shortcuts,
- delete cropped pixels option,
- current engine crop/apply capability,
- pure geometry helpers that already work.

## What To Discard

- UI owning crop algorithm decisions,
- duplicate crop state fields without clear authority,
- direct engine mutation from option controls,
- GPU/camera implementation details leaking into crop semantics.

## Minimal Crop Intent

```ts
type CropMode = "free" | "ratio" | "size";

interface CropIntent {
  frame: Rect;
  mode: CropMode;
  aspect?: { w: number; h: number };
  targetSize?: { w: number; h: number };
  deleteCroppedPixels: boolean;
  fill?: { enabled: boolean; color: string | null };
  rotationDeg: number;
}
```

This is enough to describe user intent.

## Minimal Apply Command

```ts
function applyCropCommand(ctx: CommandContext, intent: CropIntent): CommandResult {
  const normalized = normalizeCropIntent(intent, ctx.engine.getWidth(), ctx.engine.getHeight());
  if (!normalized.ok) return normalized;

  ctx.history.commit(ctx.engine.snapshot());
  ctx.engine.applyCrop(
    normalized.frame.x,
    normalized.frame.y,
    normalized.frame.width,
    normalized.frame.height,
    {
      deleteCroppedPixels: normalized.deleteCroppedPixels,
      targetSize: normalized.targetSize ?? null,
      rotation: normalized.rotationDeg,
      fillBackgroundColor: normalized.fill?.enabled ? normalized.fill.color : null,
    }
  );
  ctx.requestRender();
  return { ok: true };
}
```

## Crop UI Rule

Crop UI should only:

- edit `CropIntent`,
- preview `CropIntent`,
- call `applyCropCommand`,
- call `cancelCrop`.

It should not decide bitmap mutation details.

## Resize Rule

Resize canvas is a separate command from crop.

Do not hide resize semantics inside crop UI except for Size mode apply, where target size is explicitly part of `CropIntent`.

## What Not To Build

- non-destructive crop stack,
- crop preset database,
- crop history sub-engine,
- generic geometry constraint solver,
- auto-layout-style crop handles.

## Minimum Proof

Crop refactor must prove:

- Free mode apply,
- Ratio mode apply,
- Size mode apply,
- delete cropped pixels on/off,
- Enter applies,
- Esc cancels,
- fit/zoom/pan overlay alignment,
- history commit before destructive mutation.

## First Slice

Do not refactor all crop files first.

Start by creating `CropIntent` and converting one apply path to use it. Keep old UI state until the command path is stable.

