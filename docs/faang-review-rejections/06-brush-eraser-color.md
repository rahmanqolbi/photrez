# Brush, Eraser, and Color Review

## Likely Rejections

| ID | Rating | Finding | Evidence | Expected remediation |
| --- | --- | --- | --- | --- |
| FRR-BRUSH-001 | Must Fix | Paint pipeline mixes UI state, overlay preview, bitmap mutation, and renderer upload | Brush behavior spans `useBrushOverlay.ts`, `paintStrokeRenderer.ts`, `brushTipMask.ts`, `brushToolState.ts`, `DocumentEngine`, and WebGL texture upload. | Add a typed paint command/service boundary. |
| FRR-BRUSH-002 | Must Fix | Snapshot history is costly for paint-heavy workflows | Docs note dirty-rect history was intentionally deferred; high-bar reviewers would require a plan before large-canvas release. | Add memory/performance benchmarks and dirty-region history proposal. |
| FRR-BRUSH-003 | Must Fix | Coordinate conversion for transformed layers is safety-critical and spread across layers | Painting requires document-to-layer-local conversion plus layer transform handling. | Keep shared geometry helpers and pixel tests for transformed layers. |
| FRR-BRUSH-004 | Should Fix | Brush/Eraser settings are many independent signals in global editor context | Size, hardness, opacity, flow, smoothing, preset IDs for brush and eraser live in `EditorContextValue`. | Move paint settings into dedicated paint context/store. |
| FRR-BRUSH-005 | Should Fix | Eyedropper Alt behavior overlaps with other tool modifiers | Alt means eyedropper for paint, disable snap for move, center-out for resize/crop. | Add shared modifier intent resolver per active tool. |
| FRR-BRUSH-006 | Should Fix | Performance gates are not visible as automated scripts | Large brush/smoothing perf is not represented in package scripts. | Add perf smoke scripts or benchmark docs with thresholds. |

## Merge Bar

- Paint commits must be one command path with history, bitmap, dirty flag, and texture upload invariants.
- Brush performance must have measurable thresholds.
- Modifier behavior must be documented and tested per tool.

