# Renderer, Viewport, and Export Review

## Likely Rejections

| ID | Rating | Finding | Evidence | Expected remediation |
| --- | --- | --- | --- | --- |
| FRR-RENDER-001 | Reject | Renderer and overlay viewport alignment has high historical regression risk | AI_HISTORY records GPU camera drift, double transform, clipping, cursor/overlay misalignment. | Keep viewport/renderer changes behind mandatory browser geometry and pixel tests. |
| FRR-RENDER-002 | Must Fix | `webgl2.ts` is a large renderer class with manual resource lifecycle | 793 lines; owns shader compile, uniform lookup, context loss lifecycle, FBOs, textures, rendering, readback, resize. | Split resource management, programs, compositor, lifecycle, and readback modules. |
| FRR-RENDER-003 | Mitigated | WebGL uniform lookups use non-null assertions | Required layer shader uniforms now resolve through `getRequiredUniformLocation()`, which throws an explicit uniform-name error when a shader contract changes. | Keep helper tests and render-path GL mock tests as shader contract coverage. |
| FRR-RENDER-004 | Mitigated | `preserveDrawingBuffer: true` may hurt performance/memory | WebGL context init now uses exported `WEBGL2_CONTEXT_OPTIONS` with `preserveDrawingBuffer: false`; export uses Canvas2D/OffscreenCanvas and no production caller currently depends on WebGL backbuffer preservation. | Keep context-option test and revisit only if a new WebGL readback feature is added. |
| FRR-RENDER-005 | Mitigated | No obvious WebGL context-loss recovery path | `WebGL2Backend` now listens for `webglcontextlost` / `webglcontextrestored`, prevents default loss handling, pauses GPU work while lost, rebuilds shader/buffer resources on restore, and emits a restore event that re-uploads active document textures. | Keep lifecycle regression tests and avoid adding renderer readback features without context-loss coverage. |
| FRR-RENDER-006 | Mitigated | Export parity relies on Canvas 2D separate from WebGL preview | `docs/reference/render-export-parity-matrix.md` defines the MVP blend-mode parity gate; the Layers panel now exposes only typed registry modes and export uses the same registry mapping. | Keep new blend modes blocked until the matrix, type, shader/export mapping, and preview/export parity tests are updated together. |
| FRR-RENDER-007 | Should Fix | Viewport camera state still exists alongside Solid signals and engine viewport | Recovery added adapter, but reviewers will want invariant enforcement. | Add dev invariant checks or a single viewport store. |
| FRR-RENDER-008 | Should Fix | Performance budgets are documented but not tied to renderer checks | No visible script for renderer perf or memory budget. | Add perf smoke for large canvas, zoom/pan, brush, export. |

## Merge Bar

- Renderer resource errors must be explicit.
- Viewport changes require geometry plus pixel proof.
- Export parity cannot rely only on unit tests if preview uses a different renderer path.

## Execution Notes

- FRR-RENDER-003 mitigated: required layer shader uniforms use `getRequiredUniformLocation()` with explicit missing-uniform errors.
- FRR-RENDER-004 mitigated: WebGL2 context options are centralized with `preserveDrawingBuffer: false`.
- FRR-RENDER-005 mitigated: context-loss/restoration is now an explicit renderer lifecycle state, with focused tests covering pause and restore behavior.
- FRR-RENDER-006 mitigated: blend modes exposed to users are limited to the typed parity registry and documented in `docs/reference/render-export-parity-matrix.md`.
