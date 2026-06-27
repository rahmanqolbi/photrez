# Tools, Pointer Routing, And Keyboard Routing

## Current Problem

Pointer and keyboard behavior is centralized enough to work, but dense enough that every tool can affect every other tool. A future tool risks becoming another branch inside the same large dispatcher.

## Ponytail Decision

Do not build a full plugin system.

Do build one tiny handler interface for tools that need pointer lifecycle.

## What To Keep

- active tool union type,
- current shortcuts,
- existing geometry helpers,
- current pointer event normalization where correct,
- direct Solid/browser event handling.

## What To Discard

- one function that knows every tool lifecycle,
- tool cleanup scattered across unrelated handlers,
- modifier behavior duplicated between keyboard and pointer code,
- tool state that survives tool switch accidentally.

## Minimal Tool Handler Interface

```ts
interface ToolPointerHandler {
  begin(ctx: ToolPointerContext, e: PointerEvent): void;
  update(ctx: ToolPointerContext, e: PointerEvent): void;
  end(ctx: ToolPointerContext, e: PointerEvent): void;
  cancel(ctx: ToolPointerContext): void;
}
```

This is enough. Do not add plugin metadata, capability negotiation, lifecycle registries, or async middleware.

## Minimal Dispatcher

```ts
function getPointerHandler(tool: EditorTool): ToolPointerHandler | null {
  switch (tool) {
    case "move":
      return moveToolHandler;
    case "brush":
      return brushToolHandler;
    default:
      return null;
  }
}
```

Keep the dispatcher boring. If a switch statement is clear, use the switch statement.

## Tool State Machine Minimum

Each tool should document its states:

```text
idle -> active -> committed
idle -> active -> cancelled
active -> cancelled on tool switch
active -> cancelled on pointer capture loss
```

Do not introduce a state machine library. A discriminated union is enough:

```ts
type MoveToolState =
  | { kind: "idle" }
  | { kind: "dragging"; layerId: string; start: Point; last: Point };
```

## Keyboard Routing

Keyboard routing should be a table, not a framework:

```ts
const shortcuts = {
  Escape: cancelActiveInteraction,
  Enter: applyActiveTool,
};
```

Tool-specific shortcuts can be small functions:

```ts
function handleCropKey(ctx: ToolKeyContext, e: KeyboardEvent): boolean {
  if (e.key === "Enter") return applyCropCommand(ctx);
  if (e.key === "Escape") return cancelCrop(ctx);
  return false;
}
```

## What Not To Build

- dynamic tool plugin loader,
- global event bus,
- middleware pipeline,
- command palette runtime before product needs it,
- generalized shortcut DSL,
- async tool lifecycle manager.

## Minimum Proof

Every tool handler extraction needs:

- real pointer chain test: `pointerdown -> pointermove -> pointerup`,
- cancel test: pointer cancel or lost capture,
- tool switch test: tool A -> tool B -> tool A,
- history test if mutation occurs,
- one CanvasViewport integration test proving the handler is reachable.

## First Tool To Extract

Extract the least risky mature tool first, not the most complex one.

Recommended order:

1. Move
2. Selection
3. Brush/Eraser
4. Crop

Crop should not be first because it has the most state overlap.

