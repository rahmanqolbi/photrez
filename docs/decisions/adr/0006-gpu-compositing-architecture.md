# ADR 0006: GPU Compositing Architecture

## Status

Accepted

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

1. **Renderer maintains per-layer GPU textures** â€” Each layer's pixel data is uploaded to a separate GPU texture
2. **GPU compositing in shader** â€” Layers are composited on the GPU using alpha blending
3. **On-demand rendering** â€” Render only when layers are dirty (state has changed)
4. **Dirty flag tracking** â€” Document tracks which layers need re-upload to GPU

### Architecture

```
Core (Document + dirty_layers)
    â†“ [layer data references]
Renderer (WgpuRenderer)
    â†“ [upload_layer_texture per layer]
GPU Textures
    â†“ [render_layers: composit composited texture]
Composited Texture
    â†“ [render to screen]
Screen
```

### Data Flow

1. User action â†’ Shell command â†’ Core mutates state â†’ `mark_dirty()`
2. `MainEventsCleared` â†’ Check `has_dirty_layers()`
3. If dirty: collect layer data â†’ `renderer.render_layers()`
4. Renderer uploads dirty layer textures â†’ composites on GPU â†’ presents to screen
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

1. **Canvas 2D approach** â€” Simpler but violates architecture docs, CPU-based
2. **Hybrid approach** â€” CPU compositing + Canvas 2D display â€” rejected for same reasons
3. **wgpu with CPU compositing** â€” Current implementation before this ADR â€” rejected due to architecture violation

## References

- `docs/ARCHITECTURE.md` â€” Module boundaries and data flow
- `docs/ARCHITECTURE.md` â€” Runtime architecture and renderer responsibilities
- `docs/spec/trd.md` â€” Technical requirements for rendering
