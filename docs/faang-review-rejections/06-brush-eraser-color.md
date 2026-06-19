# Brush, Eraser, and Color Review

## Likely Rejections

| ID | Rating | Finding | Evidence | Expected remediation |
| --- | --- | --- | --- | --- |
| FRR-BRUSH-001 | Mitigated | Paint bitmap commit now has a typed command boundary | `paintCommitCommand.ts` owns the commit order for paint bitmap changes: history snapshot, engine bitmap mutation, renderer upload, and render request. Brush and eraser commit paths route through it. | Continue splitting overlay preview/rendering into smaller paint services; keep command-boundary tests green. |
| FRR-BRUSH-002 | Mitigated | Snapshot history cost is now measurable for paint-heavy workflows | `paintHistoryBudget.ts`, `paintHistoryBudget.test.ts`, and `docs/reference/paint-history-performance-gate.md` quantify full-layer snapshot retention vs dirty-region undo/redo patches. | Keep `pnpm.cmd run perf:paint-history` green and implement dirty-region patch history before claiming large-canvas scale readiness. |
| FRR-BRUSH-003 | Mitigated | Paint coordinate conversion for transformed layers is guarded | Paint strokes now use `paintStrokeCoordinates.ts`, which routes brush/eraser document points through shared `documentToLayerLocal`; transformed-layer mask tests cover rotate/scale/flip mapping. | Keep transformed-layer paint tests with any future paint pipeline changes. |
| FRR-BRUSH-004 | Should Fix | Brush/Eraser settings are many independent signals in global editor context | Size, hardness, opacity, flow, smoothing, preset IDs for brush and eraser live in `EditorContextValue`. | Move paint settings into dedicated paint context/store. |
| FRR-BRUSH-005 | Should Fix | Eyedropper Alt behavior overlaps with other tool modifiers | Alt means eyedropper for paint, disable snap for move, center-out for resize/crop. | Add shared modifier intent resolver per active tool. |
| FRR-BRUSH-006 | Should Fix | Performance gates are not visible as automated scripts | Large brush/smoothing perf is not represented in package scripts. | Add perf smoke scripts or benchmark docs with thresholds. |

## Merge Bar

- Paint commits must be one command path with history, bitmap, dirty flag, and texture upload invariants.
- Brush performance must have measurable thresholds.
- Modifier behavior must be documented and tested per tool.

## Execution Notes

- FRR-BRUSH-003 mitigated: `useBrushOverlay` now uses explicit paint coordinate helpers for both hard and soft brush paths, backed by transformed-layer mask tests.
- FRR-BRUSH-002 mitigated: paint-history memory risk now has a deterministic budget estimator, focused `perf:paint-history` gate, and dirty-region history proposal. Runtime history remains snapshot-based until the dirty-region patch command is implemented.
- FRR-BRUSH-001 mitigated: paint bitmap commits now route through `commitPaintBitmap()`, so history commit, engine bitmap mutation, renderer upload, and render scheduling are one typed command path for both brush and eraser.
