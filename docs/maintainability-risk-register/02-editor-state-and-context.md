# Editor State And Context

## MRR-STATE-001: EditorContext Is A Broad Integration Surface

Severity: M1

Likely hard-to-maintain path:

- `EditorContext.tsx` provides workspace, renderer, scheduler, camera state, crop state, toast state, open-image behavior, and debug exposure.
- Many components mock `useEditor()` directly.
- Adding a feature often means extending one shared context value.

Why this becomes painful in 6 months:

- Context changes ripple through many tests.
- Feature owners cannot tell which fields are safe to mutate.
- Tests can pass with synthetic context shapes that production never creates.

Recommended direction:

- Split context into smaller typed providers by ownership:
  - workspace/document,
  - viewport/camera,
  - tool state,
  - notifications,
  - native IO.
- Keep `useEditor()` temporarily as a compatibility facade while new code uses narrower hooks.

## MRR-STATE-002: Test Fallbacks And `as any` Weaken The Real Contract

Severity: M1

Likely hard-to-maintain path:

- `useEditor()` has fallback objects for workspace, renderer, and scheduler.
- Production and test code use `as any` in state, renderer, and context boundaries.
- Large tests frequently mock partial editor values.

Why this becomes painful in 6 months:

- A field can be renamed or removed without all consumers failing at compile time.
- Tests become easier to write but less useful as integration contracts.
- Production-only missing-provider failures are harder to catch.

Recommended direction:

- Replace fallback runtime objects with explicit test-only provider helpers.
- Create typed test builders for workspace, renderer, scheduler, and editor context.
- Ban new production `as any` outside tightly documented interop points.

## MRR-STATE-003: Window-Level Debug Surface Can Become A Hidden Dependency

Severity: M2

Likely hard-to-maintain path:

- `window.__photrezEditor` exposes editor context when `window` exists.
- E2E and debugging can start relying on internals instead of user-visible behavior.

Why this becomes painful in 6 months:

- Internal refactors become breaking changes for tests or scripts.
- Debug-only APIs can leak into production expectations.

Recommended direction:

- Gate debug globals behind explicit dev/test flags.
- Prefer purpose-built test harness APIs with stable names.
- Do not use debug globals as feature integration contracts.

## MRR-STATE-004: Solid Signals Can Drift From Engine State

Severity: M2

Likely hard-to-maintain path:

- UI state, engine state, camera state, and crop state have several synchronization paths.
- Past docs already record viewport/camera divergence as a real class of regression.

Why this becomes painful in 6 months:

- New tools can render from one state and mutate another.
- Bugs appear only after tool switching or document switching.

Recommended direction:

- Document one owner for each state category.
- Add state transition contract tests for active document, active tool, viewport, crop, and selection.
- Prefer derived state over manually mirrored signals when possible.

