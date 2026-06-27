# Viewport and Renderer Risks

Hotspots:

- `apps/desktop/src/viewport/viewportCamera.ts`
- `apps/desktop/src/viewport/coords.ts`
- `apps/desktop/src/components/editor/useViewportRenderer.ts`
- `apps/desktop/src/components/editor/CanvasViewport.tsx`
- `apps/desktop/src/components/editor/BrushCursorOverlay.tsx`
- `apps/desktop/src/components/editor/CropOverlay.tsx`
- `apps/desktop/src/components/editor/HoverHighlight.tsx`
- `apps/desktop/src/components/editor/SmartGuides.tsx`
- `apps/desktop/src/renderer/webgl2.ts`
- `apps/desktop/src/renderer/scheduler.ts`
- `apps/desktop/src/renderer/shaders.ts`

## Potential Production Bugs

| ID | Severity | Potential production symptom | Trigger / root cause | Guard / mitigation |
| --- | --- | --- | --- | --- |
| PBR-VIEW-001 | P0 | Rendered pixels and all overlays diverge after zoom/pan | Camera, Solid signals, and engine viewport become separate sources of truth | Viewport sync tests and browser geometry smoke |
| PBR-VIEW-002 | P0 | Canvas image appears flipped vertically or double-transformed | Shader UV flip and view matrix flip both apply | Shader invariant test and visual pixel test |
| PBR-VIEW-003 | P0 | Transformed pixels appear outside artboard | Final pass scissor clipping missing or computed from wrong document bounds | WebGL scissor unit test and E2E moved-layer clipping |
| PBR-VIEW-004 | P1 | HiDPI canvas blurry or memory-heavy | Backing buffer uses wrong DPR/zoom dimensions | DPR resize tests and memory gate |
| PBR-VIEW-005 | P1 | Texture leak after closing docs/layers or replacing bitmaps | `destroyTexture` not called or texture handles stale | Texture lifecycle test with delete/close/import |
| PBR-VIEW-006 | P1 | New paint/crop/import pixels do not render until later interaction | Dirty flag not marked or scheduler not requested | Dirty flag and render request contract tests |
| PBR-VIEW-007 | P1 | WebGL context loss blanks editor | No context loss handling or re-upload path | Manual/browser context-loss smoke when supported |
| PBR-VIEW-008 | P1 | Navigator preview differs from main canvas | Preview composition path diverges from renderer/export rules | Navigator pixel parity test |
| PBR-VIEW-009 | P2 | Zoom animation callback leaves UI thinking animation is active | Animation cancelled without `onAnimationEnd` | ViewportCamera cancellation tests |
| PBR-VIEW-010 | P2 | `readPixel` samples wrong location | Coordinate conversion between canvas pixels and document pixels mismatched | Pixel read tests at pan/zoom/DPR |
| PBR-VIEW-011 | P2 | Blend mode edge pixels differ between preview and export | WebGL shader and Canvas 2D composite differ near alpha 0/1 | Keep known limitation documented; add parity tests per mode |
| PBR-VIEW-012 | P2 | Overlay text/HUD scales with zoom unexpectedly | Screen-space overlay metrics divided by zoom | HUD fixed-screen-size tests |
| PBR-VIEW-013 | P3 | Viewport state type exposes rotation but tools do not support it | Future field gets activated without full math support | Do not enable viewport rotation without full tool audit |

## Production Review Checklist

- Verify fit, zoom, pan, Space+drag pan, and HiDPI.
- Verify overlays use one reactive viewport source.
- Verify WebGL final pass clips to document bounds.
- Verify texture cleanup on delete/close/reimport.
- Verify visible canvas, navigator, and export parity for common transforms.

