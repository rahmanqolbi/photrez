# Keep, Discard, Defer Map

This file answers the blunt question: if refactoring from scratch, what gets kept, what gets discarded, and what gets deferred?

## System Level

| Area | Keep | Discard | Defer |
| --- | --- | --- | --- |
| Product scope | Locked MVP editor scope | speculative pro-photo roadmap inside MVP code | plugin ecosystem, collaboration, scripting |
| Runtime | Tauri 2 + SolidJS + TypeScript | browser-only assumptions for native flows | alternate runtimes |
| Engine | `DocumentEngine` facade temporarily | one class owning every domain internally | Rust migration without explicit task |
| Renderer | WebGL2 backend facade | one class owning context, textures, passes, readback, resize | multi-backend renderer framework |
| Tests | current valuable user-path tests | placeholder/documentation-only assertions counted as coverage | snapshot-heavy visual approval system |
| Docs | reference docs and risk registers | stale docs as source of truth | generated docs for everything |

## Editor Shell

Keep:

- visible app shell,
- existing document tabs UX,
- compact desktop layout,
- existing titlebar/tool rail where stable.

Discard:

- shell-level code that knows tool internals,
- broad context access from every child,
- debug globals as implicit integration API.

Defer:

- full menu system,
- configurable workspace layouts,
- plugin menus.

## Canvas And Viewport

Keep:

- current viewport camera concepts,
- existing coordinate helpers where accurate,
- overlay model that places tool UI above canvas.

Discard:

- `CanvasViewport` as the owner of every canvas-adjacent behavior,
- ad hoc coordinate conversion inside tool handlers,
- feature-specific event logic inside the viewport shell.

Defer:

- animated camera beyond presentation-only smoothing,
- separate viewport architecture for every tool,
- generic scene graph.

## Tools

Keep:

- tool names and MVP semantics,
- existing keyboard shortcuts that match docs,
- existing pure geometry helpers.

Discard:

- one dispatcher that knows every tool's lifecycle,
- manual cleanup scattered through handlers,
- test-only tool state shapes.

Defer:

- user-installable tools,
- custom tool scripting,
- tool plugin marketplace.

## Crop

Keep:

- Free, Ratio, Size modes,
- delete cropped pixels toggle,
- Enter/Esc behavior,
- fill behavior if still in MVP scope.

Discard:

- overlapping legacy/modern crop state where not needed,
- crop option UI owning geometry decisions,
- GPU camera flags leaking into crop semantics.

Defer:

- batch crop,
- non-destructive crop stack,
- preset library beyond current needs.

## Brush And Eraser

Keep:

- brush/eraser MVP behavior,
- cached brush-tip alpha masks,
- deterministic stroke output,
- current visual calibration rules.

Discard:

- duplicate preview-vs-commit stroke models,
- cursor/preview state that can survive tool switches,
- performance-sensitive math hidden in UI hooks.

Defer:

- tablet pressure,
- advanced brush engines,
- smudge/clone/heal tools.

## Drag-Drop And Native IO

Keep:

- Tauri native file integration,
- cross-document drag intent,
- current UX decisions: copy default, Alt moves.

Discard:

- browser tests pretending to prove native file drop,
- raw file IO exposed as generic utility everywhere,
- cross-doc operations that rely on adapter casts.

Defer:

- atomic multi-document transaction system,
- full asset manager,
- cloud import/export.

## Testing And CI

Keep:

- existing Vitest and Playwright setup,
- wiring test requirement,
- real pointer-chain integration tests.

Discard:

- huge repeated fixtures,
- broad `as any` mocks as default style,
- tests that assert constants without production state.

Defer:

- full visual diff infrastructure,
- flaky cross-platform UI timing matrix,
- telemetry dashboards.

