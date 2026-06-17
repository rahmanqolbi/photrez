# Target Architecture Minimum

This is the smallest target architecture worth migrating toward.

It is intentionally boring.

## Target Shape

```text
App Shell
  Editor Providers
    Workspace Provider
    Viewport Provider
    Tool Provider
    Native IO Provider
  Editor Shell
    Document Tabs
    Tool Rail
    Canvas Viewport Shell
      Canvas Surface
      Pointer Bridge
      Overlay Host
      Drop Zone Host
    Panels

Domain
  DocumentEngine facade
    Layer stack
    Selection model
    Viewport model
    Crop operations
    Snapshot/history helpers

Interactions
  Tool handlers
    pointer begin/update/end/cancel
    keyboard commands
    cleanup

Native
  Tauri command wrappers
  IO policy wrapper

Renderer
  WebGL2Backend facade
    GL context/programs
    texture registry
    render pass
    readback/export helpers
```

## What This Removes

- a single viewport component owning every user path,
- a single context exposing everything everywhere,
- UI components directly deciding mutation/history policy,
- renderer internals all living in one class,
- native IO used as a raw utility without policy.

## What This Keeps

- current MVP feature surface,
- current app shell layout,
- current engine facade for migration safety,
- current Tauri transport,
- current WebGL2 facade,
- current SolidJS mental model.

## Minimal Boundaries

### Workspace Boundary

Owns:

- open documents,
- active document,
- per-document engine/history,
- document lifecycle.

Does not own:

- tool-specific drag state,
- renderer resource lifecycle,
- native file policy.

### Viewport Boundary

Owns:

- screen/canvas/document coordinate conversion,
- camera state,
- canvas surface size,
- overlay placement.

Does not own:

- tool mutation decisions,
- layer operations,
- crop apply semantics.

### Tool Boundary

Owns:

- active interaction lifecycle,
- pointer and keyboard interpretation,
- cleanup when cancelled or switched.

Does not own:

- raw engine mutation without command/history policy,
- renderer texture handling,
- native file IO.

### Command Boundary

Owns:

- user-visible mutation,
- history decision,
- dirty state effect,
- validation result.

Does not own:

- UI layout,
- pointer capture,
- rendering implementation.

## Minimal Type Sketch

```ts
type CommandResult =
  | { ok: true }
  | { ok: false; code: string; message: string };

type EditorCommand = (ctx: CommandContext) => CommandResult;

interface CommandContext {
  engine: DocumentEngine;
  history: CommandHistory;
  requestRender(): void;
}
```

Do not build a generic command bus yet. A command can be one exported function.

## Minimum Rule For New Modules

A new module must be named after the product boundary it protects:

- good: `moveToolHandler.ts`
- good: `viewportCoordinates.ts`
- good: `layerCommands.ts`
- risky: `manager.ts`
- risky: `service.ts`
- risky: `utils.ts`
- risky: `core.ts`

## Forbidden Target Architecture

Do not migrate toward:

- app-wide event bus,
- abstract editor plugin runtime,
- dependency injection container,
- renderer backend plugin system,
- massive command framework,
- state machine library for simple state,
- generated schema layer for local TypeScript types.

