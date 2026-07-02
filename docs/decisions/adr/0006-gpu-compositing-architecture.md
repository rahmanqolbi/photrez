# ADR 0006: GPU Compositing Architecture

## Status

Accepted (Superseded 2026-06 — the `photrez-render` crate was removed from workspace members; GPU compositing is handled via WebGL2 in the frontend renderer.)

## Date

2026-05-28

## Context

The original implementation used CPU compositing via `get_flattened_pixels()` in the core crate, which sent flattened pixel data to the frontend for display via Canvas 2D. This deviated from the documented architecture which specifies:

- "Renderer owns frame rendering, texture upload, compositing previews, viewport transforms" (02-architecture.md:25)
- "Renderer consumes state/patch and draws next frame" (02-architecture.md:33)
- "Renderer owns compositing previews" (ARCHITECTURE.md:25)

The CPU compositing approach had several issues:
1. Performance: CPU compositing on every frame is slow
2. Memory: Extra copies through base64 encoding/decoding
3. Architecture violation: Core was doing compositing instead of Renderer

## Decision

Implement GPU compositing in the renderer crate (`photrez-render`):

1. **Renderer maintains per-layer GPU textures** — Each layer's pixel data is uploaded to a separate GPU texture
2. **GPU compositing in shader** — Layers are composited on the GPU using alpha blending
3. **On-demand rendering** — Render only when layers are dirty (state has changed)
4. **Dirty flag tracking** — Document tracks which layers need re-upload to GPU

### Architecture

```
Core (Document + dirty_layers)
    ↓ [layer data references]
Renderer (WgpuRenderer)
    ↓ [upload_layer_texture per layer]
GPU Textures
    ↓ [render_layers: composit composited texture]
Composited Texture
    ↓ [render to screen]
Screen
```

### Data Flow

1. User action → Shell command → Core mutates state → `mark_dirty()`
2. `MainEventsCleared` → Check `has_dirty_layers()`
3. If dirty: collect layer data → `renderer.render_layers()`
4. Renderer uploads dirty layer textures → composites on GPU → presents to screen
5. `clear_dirty()`

## Consequences

### Positive
- GPU-accelerated compositing (better performance)
- Reduced memory copies (no base64 encoding/decoding)
- Architecture compliance (Renderer owns compositing)
- On-demand rendering (no unnecessary GPU work)

### Negative
- More complex renderer code (texture management)
- GPU memory usage for layer textures
- Requires transparent webview CSS for wgpu overlay

### Neutral
- Frontend no longer renders pixels (just viewport transform)
- `get_framebuffer` command removed (no longer needed)
- `render_frame()` method removed (replaced by `render_layers()`)

## Alternatives Considered

1. **Canvas 2D approach** — Simpler but violates architecture docs, CPU-based
2. **Hybrid approach** — CPU compositing + Canvas 2D display — rejected for same reasons
3. **wgpu with CPU compositing** — Current implementation before this ADR — rejected due to architecture violation

## References

- `docs/ARCHITECTURE.md` — Module boundaries and data flow
- `docs/ARCHITECTURE.md` — Runtime architecture and renderer responsibilities
- `docs/spec/trd.md` — Technical requirements for rendering
