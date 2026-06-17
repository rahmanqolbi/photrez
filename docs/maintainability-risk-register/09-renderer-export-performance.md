# Renderer, Export, And Performance

## MRR-RENDER-001: WebGL2Backend Owns Too Many Renderer Concerns

Severity: M1

Likely hard-to-maintain path:

- `webgl2.ts` handles initialization, shaders/programs, texture lifecycle, resize, render, blending, scissor projection, pixel readback, and disposal.

Why this becomes painful in 6 months:

- Adding renderer features requires touching a large low-level class.
- Resource leaks and rendering differences become hard to isolate.
- Tests need WebGL-like mocks for many unrelated concerns.

Recommended direction:

- Split renderer internals into:
  - GL context/program lifecycle,
  - texture registry,
  - render pass,
  - readback/sampling,
  - resize/viewport projection.
- Keep `WebGL2Backend` as facade until the split stabilizes.

## MRR-RENDER-002: `preserveDrawingBuffer` Is A Maintenance And Performance Trap

Severity: M2

Likely hard-to-maintain path:

- Renderer initialization uses `preserveDrawingBuffer: true`.
- E2E also depends on readback from WebGL canvas.

Why this becomes painful in 6 months:

- Performance may degrade as documents and layers get larger.
- Tests may require a setting that is not ideal for production rendering.

Recommended direction:

- Document why `preserveDrawingBuffer` is needed today.
- Separate production render settings from test readback strategy if possible.
- Add performance checks before changing it.

## MRR-RENDER-003: Export Pipeline Can Drift From Viewport Rendering

Severity: M2

Likely hard-to-maintain path:

- Export encodes a composite from `DocumentEngine`, while viewport rendering uses WebGL render state and textures.

Why this becomes painful in 6 months:

- Users can see one result in the viewport and export another.
- Blend modes, opacity, transforms, and color handling can drift.

Recommended direction:

- Maintain explicit export parity tests for layer transforms, opacity, blend modes, crop, and transparency.
- Document which renderer is authoritative for export semantics.

## MRR-RENDER-004: Memory Accounting Is Not Yet A Release Gate

Severity: M2

Likely hard-to-maintain path:

- Document memory calculation exists, but large image workflows involve ImageBitmap, WebGL textures, base64 native transfer, canvas export, and snapshots.

Why this becomes painful in 6 months:

- Bugs appear as freezes or crashes rather than test failures.
- More tools will keep extra buffers or snapshots alive.

Recommended direction:

- Add memory budget scenarios for open, duplicate, paint, crop, export, and close.
- Track texture disposal and ImageBitmap lifecycle explicitly.
- Make memory pressure part of release verification.

