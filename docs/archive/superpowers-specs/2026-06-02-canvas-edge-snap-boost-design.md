# Canvas Edge Snap Boost — Design Spec

**Date:** 2026-06-02
**Status:** Draft
**Scope:** MVP

## Problem

Current snapping using uniform 5px threshold for all targets. Canvas edges are the most
frequent snap destination, especially for aligning layers flush to canvas bounds. User
reports "kurang nempel" (not sticky enough) to canvas edges.

## Design

### Behavior

| Target | Threshold | Priority |
|--------|-----------|----------|
| Canvas edge (left/right/top/bottom) | 12px | 3 (highest) |
| Canvas center (vertical/horizontal synthetic lines) | 6px | 2 |
| Layer edge-to-edge | 5px | 1 |
| Layer/center-to-center | 5px | 1 |

Resolution rules:
1. If multiple targets are within threshold, pick **highest priority**.
2. If same priority, pick **shortest distance** (existing nearest-wins).
3. Only the winning candidate emits a guide line per axis.

Modifier `Alt` continues to disable snapping (existing behavior). Guide lines remain
magenta with current visual — no new UI elements.

### Changes

#### `SnapRect` — extend with optional metadata
```ts
interface SnapRect {
  x: number; y: number; w: number; h: number;
  snapThreshold?: number;   // per-target threshold override
  snapPriority?: number;    // higher = wins tiebreaks
}
```
Existing code that omits these fields uses default values (threshold 5, priority 1).

#### `computeSnapAdjustment()` — priority-aware selection
```ts
function computeSnapAdjustment(
  moving: SnapRect,
  targets: SnapRect[],
  defaultThreshold?: number,
): SnapResult
```
Per-axis resolution: within threshold → compare (priority > best || (priority === best && dist < bestDist)).

#### `CanvasViewport.tsx` — target builders

```ts
const snapTargets: SnapRect[] = [
  // Canvas edges — highest priority, widest threshold
  { x: 0, y: 0, w: docW, h: docH, snapThreshold: 12, snapPriority: 3 },
  // Canvas center — moderate threshold
  { x: docW / 2, y: -Infinity, w: 0, h: Infinity, snapThreshold: 6, snapPriority: 2 },
  { x: -Infinity, y: docH / 2, w: Infinity, h: 0, snapThreshold: 6, snapPriority: 2 },
  // Layer targets — default threshold 5, lowest priority
  ...layerTargets.map(r => ({ ...r })),
];
```

#### `input-handler.ts` — call site

No change needed. `context.onComputeSnap` receives `SnapRect` and CanvasViewport
constructs the full target list with metadata.

#### `SelectionTransformOverlay.tsx`

No change needed. The resize path already calls `onComputeSnap` with a `SnapRect`
from `getLayerAabb()`. CanvasViewport's handler ignores metadata fields on the
moving rect and only reads them from target rects.

### Priority Resolution Logic

In `computeSnapAdjustment`, per-axis tracking changes from:
```
dist < threshold → accept
```
to:
```
dist < effectiveThreshold
  AND (
    priority > bestPriority
    OR (priority === bestPriority AND dist < bestDist)
  )
```

Where `effectiveThreshold = target.snapThreshold ?? defaultThreshold`
and `priority = target.snapPriority ?? 1`.

### Files to Modify

1. `apps/desktop/src/viewport/smartGuides.ts` — add optional `snapThreshold` /
   `snapPriority` fields to `SnapRect`; update `computeSnapAdjustment` priority-aware
   selection logic.
2. `apps/desktop/src/components/editor/CanvasViewport.tsx` — update snap target
   builder in both call sites: canvas rect gets `snapThreshold: 12, snapPriority: 3`,
   center lines get `snapThreshold: 6, snapPriority: 2`.
3. `apps/desktop/src/components/editor/SelectionTransformOverlay.tsx` — no change.
4. `apps/desktop/src/viewport/input-handler.ts` — no change.
5. `apps/desktop/src/__tests__/snap-adjustment.test.ts` — add priority/threshold tests.

### Tests to Add

1. Layer 10px from canvas edge → snaps (within 12px threshold).
2. Layer 11px from canvas edge → snaps (12px > 11px).
3. Layer 13px from canvas edge → no snap (outside 12px).
4. Layer 10px from canvas edge AND simultaneously 5px from another layer edge
   → canvas edge wins (priority 3 > 1).
5. Canvas center snap at 6px threshold (layer at 5px from center).
6. Canvas center NOT snapped at 8px from center (outside 6px).
7. Backward compat: `computeSnapAdjustment` with raw `SnapRect[]` works (default
   priority 1, threshold 5).
