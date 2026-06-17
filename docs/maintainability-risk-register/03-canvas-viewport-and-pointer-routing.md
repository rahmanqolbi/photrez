# Canvas Viewport And Pointer Routing

## MRR-VIEW-001: CanvasViewport Is The Main Maintenance Choke Point

Severity: M1

Likely hard-to-maintain path:

- `CanvasViewport.tsx` is over 1k lines.
- It hosts the canvas, overlays, pasteboard behavior, pointer entry points, layer drag integration, smart guides, crop UI, and viewport rendering.

Why this becomes painful in 6 months:

- Almost every editor feature touches this file.
- Tool regressions can hide behind unrelated viewport edits.
- New contributors must understand too much before making a safe change.

Recommended direction:

- Extract stable sections by responsibility:
  - viewport shell and layout,
  - pointer event bridge,
  - overlay host,
  - pasteboard interaction,
  - drop-zone host.
- Keep extraction mechanical and backed by existing integration tests.

## MRR-VIEW-002: Pointer Tool Dispatch Is Dense And Cross-Coupled

Severity: M1

Likely hard-to-maintain path:

- `useCanvasPointerTools.ts` dispatches pointer down/move/up for multiple tools.
- It coordinates brush, eraser, eyedropper, selection, move, crop, transform HUD, and drag cleanup.

Why this becomes painful in 6 months:

- Adding one tool can affect pointer capture or cleanup for another.
- Tool switch round trips become the most likely regression source.
- Tool-specific bugs require reading the whole dispatcher.

Recommended direction:

- Introduce typed per-tool handlers with a shared `ToolPointerContext`.
- Keep the dispatcher small: choose handler, pass context, normalize cleanup.
- Require every tool handler to expose `begin`, `update`, `end`, and `cancel` behavior.

## MRR-VIEW-003: Keyboard Routing Is Another Shared Dispatcher

Severity: M2

Likely hard-to-maintain path:

- `useCanvasKeyboard.ts` handles shortcuts for layers, crop, brush, selection, transform, and general editor behavior.
- Keyboard state also affects pointer behavior such as Shift/Alt modifiers.

Why this becomes painful in 6 months:

- Shortcut changes can accidentally change tool semantics.
- Tests may cover pure shortcut behavior without proving pointer modifier behavior.

Recommended direction:

- Keep a single keyboard map as the source of truth.
- Add feature-owned shortcut handlers registered through a typed table.
- Add cross-tests for modifier behavior that spans keyboard and pointer flows.

## MRR-VIEW-004: Coordinate Conversion Needs A Single Boundary

Severity: M2

Likely hard-to-maintain path:

- Viewport camera, renderer matrices, overlay positioning, document coordinates, and pasteboard coordinates are all involved in user interactions.

Why this becomes painful in 6 months:

- Rendering can look correct while hit testing or overlays are offset.
- Bugs reproduce only at non-100 percent zoom, high DPI, or after pan.

Recommended direction:

- Make one `ViewportCoordinateAdapter` the boundary for screen, canvas, document, and layer coordinates.
- Require every tool integration test to run at fit, zoomed, and panned states.

