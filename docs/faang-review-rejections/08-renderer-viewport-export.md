# Renderer, Viewport, and Export Review

## Likely Rejections

| ID | Rating | Finding | Evidence | Expected remediation |
| --- | --- | --- | --- | --- |
| FRR-RENDER-001 | Reject | Renderer and overlay viewport alignment has high historical regression risk | AI_HISTORY records GPU camera drift, double transform, clipping, cursor/overlay misalignment. | Keep viewport/renderer changes behind mandatory browser geometry and pixel tests. |
| FRR-RENDER-002 | Must Fix | `webgl2.ts` is a large renderer class with manual resource lifecycle | 689 lines; owns shader compile, uniform lookup, FBOs, textures, rendering, readback, resize. | Split resource management, programs, compositor, and readback modules. |
| FRR-RENDER-003 | Must Fix | WebGL uniform lookups use non-null assertions | `gl.getUniformLocation(...)!` can fail silently until runtime if shader changes. | Validate locations with explicit errors and shader contract tests. |
| FRR-RENDER-004 | Must Fix | `preserveDrawingBuffer: true` may hurt performance/memory | WebGL context init enables it unconditionally. | Justify with readback needs or disable outside export/readback path. |
| FRR-RENDER-005 | Must Fix | No obvious WebGL context-loss recovery path | Renderer initializes context but no context lost/restored event handling is visible in the read section. | Add context loss handling or explicit unsupported-state UX. |
| FRR-RENDER-006 | Must Fix | Export parity relies on Canvas 2D separate from WebGL preview | `FEATURES.md` notes known blend-mode parity limitation. | Add a parity matrix and block new blend modes until preview/export match. |
| FRR-RENDER-007 | Should Fix | Viewport camera state still exists alongside Solid signals and engine viewport | Recovery added adapter, but reviewers will want invariant enforcement. | Add dev invariant checks or a single viewport store. |
| FRR-RENDER-008 | Should Fix | Performance budgets are documented but not tied to renderer checks | No visible script for renderer perf or memory budget. | Add perf smoke for large canvas, zoom/pan, brush, export. |

## Merge Bar

- Renderer resource errors must be explicit.
- Viewport changes require geometry plus pixel proof.
- Export parity cannot rely only on unit tests if preview uses a different renderer path.

