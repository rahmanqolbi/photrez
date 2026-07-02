# Paint History Performance Gate

Status: active release gate for paint-heavy history risk.

## Why This Exists

Brush and eraser commits currently use the normal snapshot history path. `createSnapshot()` is a shallow model snapshot, so it does not clone every pixel on every commit. Paint commits still create new bitmap generations, however, and undo/redo history can keep those generations reachable. Large paint-heavy documents therefore need a measurable budget and a migration plan before release claims scale readiness.

This gate mitigates FRR-BRUSH-002 without rewriting undo/redo yet.

## Executable Gate

Run from the repo root:

```powershell
bun run perf:paint-history
```

The script runs `apps/desktop/src/engine/__tests__/paintHistoryBudget.test.ts`, which verifies deterministic memory estimates for:

- raw RGBA layer bytes
- full-layer paint snapshot retention across `MAX_HISTORY_DEPTH`
- dirty-region undo/redo patch retention
- dirty-region clamping to layer bounds
- invalid input handling

## Current Budget Scenario

Default constants:

- `MAX_HISTORY_DEPTH`: 50
- `MAX_PIXEL_BUDGET`: 256 MiB
- bytes per RGBA pixel: 4

Reference scenario:

| Scenario | Estimate | Budget result |
| --- | ---: | --- |
| 4096 x 4096 full-layer bitmap | 67,108,864 bytes | one layer generation is within budget |
| 4096 x 4096 full-layer bitmap x 50 history entries | 3,355,443,200 bytes | exceeds 256 MiB budget |
| 256 x 256 dirty region x 50 entries x undo/redo patches | 26,214,400 bytes | within 256 MiB budget |
| Dirty-region proposal ratio for that scenario | 0.78125% of full snapshot estimate | acceptable target |

## Dirty-Region History Proposal

The next paint-history implementation should store paint commands as bounded dirty-region patches instead of relying on full-layer bitmap generations for every stroke.

Required command payload:

- document id and layer id
- dirty rect in layer-local coordinates
- before patch RGBA bytes for undo
- after patch RGBA bytes for redo
- paint settings hash for diagnostics

Required invariants:

- Dirty rect must be clipped to layer bounds before allocation.
- Patch bytes must be rejected if `dirtyRegionUndoRedoBytes > MAX_PIXEL_BUDGET`.
- Undo restores only the dirty rect and marks that layer dirty for texture upload.
- Redo reapplies only the dirty rect and marks that layer dirty for texture upload.
- A stroke that touches the full layer is still allowed only if its estimated patch bytes pass the same budget gate.

## Release Rule

FRR-BRUSH-002 can remain mitigated while snapshot history is still the runtime path only if:

1. `bun run perf:paint-history` passes.
2. Any increase to `MAX_HISTORY_DEPTH`, canvas limits, or paint commit retention updates this document and the focused budget test.
3. Large-canvas release notes explicitly state that dirty-region history is planned but not yet the active runtime implementation.
