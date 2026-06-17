# Brush, Eraser, and Color Risks

Hotspots:

- `apps/desktop/src/components/editor/useBrushOverlay.ts`
- `apps/desktop/src/components/editor/paintStrokeRenderer.ts`
- `apps/desktop/src/components/editor/brushTipMask.ts`
- `apps/desktop/src/components/editor/paintSmoothing.ts`
- `apps/desktop/src/components/editor/brushToolState.ts`
- `apps/desktop/src/components/editor/BrushCursorOverlay.tsx`
- `apps/desktop/src/components/editor/BrushOptionBar.tsx`
- `apps/desktop/src/components/editor/BrushContextMenu.tsx`
- `apps/desktop/src/engine/pixelSample.ts`
- `apps/desktop/src/engine/document.ts`

## Potential Production Bugs

| ID | Severity | Potential production symptom | Trigger / root cause | Guard / mitigation |
| --- | --- | --- | --- | --- |
| PBR-BRUSH-001 | P0 | Brush/Eraser no-ops after Move pasteboard deselect | Paint target reads selected layer instead of engine active layer | Regression: Move deselect, switch Brush/Eraser, verify pixels change |
| PBR-BRUSH-002 | P0 | Painting modifies locked/hidden/protected layer | Editability guard omitted in one paint path | Paint guard tests for locked, hidden, transparency lock, position lock |
| PBR-BRUSH-003 | P1 | Stroke appears offset on transformed layer | Document-to-layer-local coordinate conversion misses scale/rotation/flip | Paint on transformed layer pixel tests |
| PBR-BRUSH-004 | P1 | Soft brush accumulates too dark or eraser removes too much | Per-dab max-alpha/flow math regresses into additive accumulation | Pixel-profile tests for opacity, flow, hardness |
| PBR-BRUSH-005 | P1 | Stroke is lost when pointer leaves canvas or capture is lost | Partial stroke not committed on cancel/lost pointer capture | Pointer cancel/lost capture paint commit test |
| PBR-BRUSH-006 | P1 | Cursor ring is stale after zoom/pan without mouse move | Cursor position stored only in document space and not recomputed on viewport change | Brush cursor test tracking zoom/pan signals |
| PBR-BRUSH-007 | P1 | Space+drag pan paints or leaves cursor ring visible | Navigation guard missing in brush overlay/cursor | Panning guard test for brush and eraser |
| PBR-BRUSH-008 | P1 | Alt-hold eyedropper samples wrong pixel under zoom/pan/transform | Screen-to-document or composite sample path wrong | Eyedropper tests at zoom, pan, transparent/overlapping layers |
| PBR-BRUSH-009 | P2 | Shift-click line starts from stale previous point after tool switch/doc switch | Last paint coordinate not reset when context changes | Shift-click state reset tests |
| PBR-BRUSH-010 | P2 | Shift-drag axis lock chooses wrong axis after first movement | Axis selection recalculates instead of locking once | Axis-lock interaction tests |
| PBR-BRUSH-011 | P2 | Preset dropdown says preset but settings are custom | Manual edits do not clear preset ID or separate brush/eraser IDs | Preset tracking tests |
| PBR-BRUSH-012 | P2 | Context menu remains open or consumes keyboard shortcuts | Outside/Escape listener cleanup conflict | Menu lifecycle and shortcut propagation tests |
| PBR-BRUSH-013 | P2 | Large soft brush causes frame drops | Tip mask, smoothing, or preview recalculates too often | Performance smoke with large brush and long stroke |
| PBR-BRUSH-014 | P3 | Color swatches/status disagree after eyedropper or swap | Foreground/background signals updated inconsistently | Color signal contract tests |

## Production Review Checklist

- Verify paint after Move deselect and after document switch.
- Verify transformed-layer coordinate conversion.
- Verify pointer cancel/lost capture commits or cancels intentionally.
- Verify brush preview, committed pixels, and export output match.
- Verify large brush performance with smoothing and soft hardness.

