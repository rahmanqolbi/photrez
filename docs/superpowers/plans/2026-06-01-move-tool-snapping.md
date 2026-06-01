# Move Tool Snapping Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the Move tool drag the active layer with Photoshop-style auto-snap precision, hold-Alt to disable, and one-line smart guides only when a snap is active.

**Architecture:** Extend the existing `smartGuides.ts` with a pure `computeSnapAdjustment` helper that returns `{ dx, dy, lines }` for a moving rect against a target list. Keep the existing `computeSnapLines` as a thin wrapper so older tests stay green. Replace the `onComputeSnapLines` side-effect callback on `ToolContext` with a pure `onComputeSnap` that returns `SnapResult` plus an `onSnapLines` setter. Drive snapping from `input-handler.ts` so the input handler applies the deltas and emits guide lines. The viewport precomputes the target list once per drag and feeds both the canvas rect and center lines as additional synthetic rects.

**Tech Stack:** TypeScript, SolidJS signals, Vitest, existing `photrez-core` Rust crate (untouched).

---

## File Structure

Create:

- `apps/desktop/src/__tests__/snap-adjustment.test.ts`
  - Unit tests for the new `computeSnapAdjustment` helper.

Modify:

- `apps/desktop/src/viewport/smartGuides.ts`
  - Add `SnapResult` interface.
  - Add `computeSnapAdjustment(moving, targets, threshold?)` returning `SnapResult`.
  - Rewrite `computeSnapLines` to delegate to `computeSnapAdjustment` and return only the lines.

- `apps/desktop/src/viewport/input-handler.ts`
  - Add `isAltPressed: boolean`, `onComputeSnap?: (rect) => SnapResult`, `onSnapLines?: (lines) => void` to `ToolContext`.
  - Remove `onComputeSnapLines`.
  - In Move branch of `handlePointerMove`: apply `dx, dy` from `onComputeSnap` and call `onSnapLines`.
  - In `handlePointerUp`: call `onSnapLines` with `[]` to clear guides.

- `apps/desktop/src/components/editor/CanvasViewport.tsx`
  - Precompute the target list (other layers + canvas rect + canvas center lines) once per drag in `prepareToolContext`.
  - Replace `interactiveState.onComputeSnapLines` with `interactiveState.onComputeSnap` and `interactiveState.onSnapLines`.
  - Set `interactiveState.isAltPressed = isAltPressed()` in `prepareToolContext`.
  - Pass `isAltPressed` initial value on the module-level `interactiveState` literal.

- `apps/desktop/src/__tests__/input-handler-snap.test.ts`
  - Unit tests for the snap wiring in `handlePointerMove` and `handlePointerUp`.

- `docs/AI_CURRENT_TASK.md`, `docs/AI_HISTORY.md`, `docs/FEATURES.md`
  - Reflect the new Move tool snapping feature.

---

## Task 1: Add failing tests for `computeSnapAdjustment`

**Files:**
- Create: `apps/desktop/src/__tests__/snap-adjustment.test.ts`

- [ ] **Step 1: Write the failing tests**

Create `apps/desktop/src/__tests__/snap-adjustment.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { computeSnapAdjustment } from "../viewport/smartGuides";

describe("computeSnapAdjustment", () => {
  it("returns zero delta and no lines when no target is within threshold", () => {
    const moving = { x: 0, y: 0, w: 50, h: 50 };
    const targets = [{ x: 500, y: 500, w: 50, h: 50 }];
    const r = computeSnapAdjustment(moving, targets, 5);
    expect(r.dx).toBe(0);
    expect(r.dy).toBe(0);
    expect(r.lines).toEqual([]);
  });

  it("snaps moving left edge to target left edge", () => {
    const moving = { x: 98, y: 100, w: 50, h: 50 };
    const targets = [{ x: 100, y: 200, w: 50, h: 50 }];
    const r = computeSnapAdjustment(moving, targets, 5);
    expect(r.dx).toBe(2);
    expect(r.dy).toBe(0);
    expect(r.lines.length).toBe(1);
    expect(r.lines[0].x1).toBe(100);
    expect(r.lines[0].x2).toBe(100);
  });

  it("snaps moving center to target center", () => {
    const moving = { x: 75, y: 100, w: 50, h: 50 };
    const targets = [{ x: 75, y: 200, w: 50, h: 50 }];
    const r = computeSnapAdjustment(moving, targets, 5);
    expect(r.dx).toBe(0);
    expect(r.dy).toBe(0);
    expect(r.lines.length).toBeGreaterThan(0);
  });

  it("snaps moving center to canvas horizontal center (synthetic vertical line)", () => {
    // doc width 1000, moving 200x200 centered at x=498 (200 + 100 - 2)
    const moving = { x: 298, y: 0, w: 200, h: 200 };
    const targets = [
      // vertical center line: x=500 spanning full height
      { x: 500, y: -Infinity, w: 0, h: Infinity },
    ];
    const r = computeSnapAdjustment(moving, targets, 5);
    expect(r.dx).toBe(2); // 500 - 498 = 2
    expect(r.dy).toBe(0);
    expect(r.lines.length).toBe(1);
    expect(r.lines[0].x1).toBe(500);
  });

  it("snaps moving top edge to target top edge", () => {
    const moving = { x: 100, y: 98, w: 50, h: 50 };
    const targets = [{ x: 200, y: 100, w: 50, h: 50 }];
    const r = computeSnapAdjustment(moving, targets, 5);
    expect(r.dx).toBe(0);
    expect(r.dy).toBe(2);
    expect(r.lines.length).toBe(1);
    expect(r.lines[0].y1).toBe(100);
    expect(r.lines[0].y2).toBe(100);
  });

  it("picks the nearest target when multiple are within threshold (X axis)", () => {
    const moving = { x: 0, y: 0, w: 50, h: 50 }; // left = 0
    const targets = [
      { x: 2, y: 0, w: 50, h: 50 },   // left 2, distance 2
      { x: 4, y: 0, w: 50, h: 50 },   // left 4, distance 4
    ];
    const r = computeSnapAdjustment(moving, targets, 5);
    expect(r.dx).toBe(2);
    expect(r.lines.length).toBe(1);
    expect(r.lines[0].x1).toBe(2);
  });

  it("emits at most one line per axis (0, 1, or 2 total)", () => {
    const moving = { x: 98, y: 98, w: 50, h: 50 };
    const targets = [{ x: 100, y: 100, w: 50, h: 50 }];
    const r = computeSnapAdjustment(moving, targets, 5);
    expect(r.lines.length).toBeLessThanOrEqual(2);
  });

  it("respects custom threshold (no snap when distance >= threshold)", () => {
    const moving = { x: 95, y: 100, w: 50, h: 50 };
    const targets = [{ x: 100, y: 200, w: 50, h: 50 }];
    const r = computeSnapAdjustment(moving, targets, 3);
    expect(r.dx).toBe(0);
    expect(r.dy).toBe(0);
    expect(r.lines).toEqual([]);
  });

  it("uses default threshold of 5 when none provided", () => {
    const moving = { x: 96, y: 0, w: 50, h: 50 };
    const targets = [{ x: 100, y: 0, w: 50, h: 50 }];
    const r = computeSnapAdjustment(moving, targets);
    expect(r.dx).toBe(4);
  });

  it("emits a vertical guide for a horizontal-axis snap and vice versa", () => {
    // X axis only: vertical guide line
    const xOnly = computeSnapAdjustment(
      { x: 98, y: 0, w: 50, h: 50 },
      [{ x: 100, y: 200, w: 50, h: 50 }],
      5,
    );
    expect(xOnly.lines[0].x1).toBe(xOnly.lines[0].x2);

    // Y axis only: horizontal guide line
    const yOnly = computeSnapAdjustment(
      { x: 0, y: 98, w: 50, h: 50 },
      [{ x: 200, y: 100, w: 50, h: 50 }],
      5,
    );
    expect(yOnly.lines[0].y1).toBe(yOnly.lines[0].y2);
  });
});
```

- [ ] **Step 2: Run the new tests and verify they fail**

Run from the repo root:

```bash
pnpm.cmd --filter photrez-desktop test -- snap-adjustment
```

Expected: FAIL — `computeSnapAdjustment` is not exported from `../viewport/smartGuides`.

- [ ] **Step 3: Commit the failing test**

```bash
git add apps/desktop/src/__tests__/snap-adjustment.test.ts
git commit -m "test: add failing tests for computeSnapAdjustment"
```

---

## Task 2: Implement `computeSnapAdjustment`

**Files:**
- Modify: `apps/desktop/src/viewport/smartGuides.ts`

- [ ] **Step 1: Add `SnapResult` interface and `computeSnapAdjustment` function**

Replace the entire content of `apps/desktop/src/viewport/smartGuides.ts` with:

```ts
export interface SnapRect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface SnapLine {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}

export interface SnapResult {
  dx: number;
  dy: number;
  lines: SnapLine[];
}

const X_KEYS = ["left", "right", "cx"] as const;
const Y_KEYS = ["top", "bottom", "cy"] as const;

function buildAxis(rect: SnapRect) {
  return {
    left: rect.x,
    right: rect.x + rect.w,
    cx: rect.x + rect.w / 2,
    top: rect.y,
    bottom: rect.y + rect.h,
    cy: rect.y + rect.h / 2,
  };
}

export function computeSnapAdjustment(
  moving: SnapRect,
  targets: SnapRect[],
  threshold = 5,
): SnapResult {
  const me = buildAxis(moving);
  let bestDx = 0;
  let bestDxDist = Infinity;
  let bestDxLineY1 = moving.y;
  let bestDxLineY2 = moving.y + moving.h;
  let bestDxHitX: number | null = null;

  let bestDy = 0;
  let bestDyDist = Infinity;
  let bestDyLineX1 = moving.x;
  let bestDyLineX2 = moving.x + moving.w;
  let bestDyHitY: number | null = null;

  for (const t of targets) {
    const te = buildAxis(t);
    for (const mk of X_KEYS) {
      for (const tk of X_KEYS) {
        const d = te[tk] - me[mk];
        const dist = Math.abs(d);
        if (dist < threshold && dist < bestDxDist) {
          bestDxDist = dist;
          bestDx = d;
          bestDxHitX = te[tk];
          bestDxLineY1 = Math.min(moving.y, t.y) - 10;
          bestDxLineY2 = Math.max(moving.y + moving.h, t.y + t.h) + 10;
        }
      }
    }
    for (const mk of Y_KEYS) {
      for (const tk of Y_KEYS) {
        const d = te[tk] - me[mk];
        const dist = Math.abs(d);
        if (dist < threshold && dist < bestDyDist) {
          bestDyDist = dist;
          bestDy = d;
          bestDyHitY = te[tk];
          bestDyLineX1 = Math.min(moving.x, t.x) - 10;
          bestDyLineX2 = Math.max(moving.x + moving.w, t.x + t.w) + 10;
        }
      }
    }
  }

  const lines: SnapLine[] = [];
  if (bestDxHitX !== null) {
    lines.push({
      x1: bestDxHitX,
      y1: bestDxLineY1,
      x2: bestDxHitX,
      y2: bestDxLineY2,
    });
  }
  if (bestDyHitY !== null) {
    lines.push({
      x1: bestDyLineX1,
      y1: bestDyHitY,
      x2: bestDyLineX2,
      y2: bestDyHitY,
    });
  }

  return { dx: bestDx, dy: bestDy, lines };
}

export function computeSnapLines(
  moving: SnapRect,
  targets: SnapRect[],
  threshold = 5,
): SnapLine[] {
  return computeSnapAdjustment(moving, targets, threshold).lines;
}
```

- [ ] **Step 2: Run the new tests and verify they pass**

```bash
pnpm.cmd --filter photrez-desktop test -- snap-adjustment
```

Expected: PASS — all 10 new tests pass.

- [ ] **Step 3: Run the existing `computeSnapLines` tests and verify they still pass**

```bash
pnpm.cmd --filter photrez-desktop test -- smart-guides
```

Expected: PASS — the existing wrapper still satisfies all old assertions because each old test exercises a single target with a single within-threshold candidate.

- [ ] **Step 4: Run the full frontend test suite**

```bash
pnpm.cmd --filter photrez-desktop test
```

Expected: PASS — all unit tests including the existing 11 in `smart-guides.test.ts` and the 10 new ones.

- [ ] **Step 5: Commit**

```bash
git add apps/desktop/src/viewport/smartGuides.ts
git commit -m "feat(smartGuides): add computeSnapAdjustment and use it from computeSnapLines"
```

---

## Task 3: Add failing tests for input-handler snap wiring

**Files:**
- Create: `apps/desktop/src/__tests__/input-handler-snap.test.ts`

- [ ] **Step 1: Write the failing tests**

Create `apps/desktop/src/__tests__/input-handler-snap.test.ts`:

```ts
import { describe, it, expect, vi } from "vitest";
import { handlePointerDown, handlePointerMove, handlePointerUp } from "../viewport/input-handler";
import type { DocumentEngine } from "../engine/document";
import type { CommandHistory } from "../engine/history";
import type { SnapResult, SnapLine } from "../viewport/smartGuides";

function makeEngine(): {
  engine: DocumentEngine;
  history: CommandHistory;
  requestRender: () => void;
} {
  // Use vi.fn for the parts we don't care about
  const engine = {
    getLayer: (id: string) => ({
      id,
      name: "L1",
      type: "raster" as const,
      visible: true,
      opacity: 1,
      locked: false,
      blendMode: "normal" as const,
      transform: { x: 50, y: 50, scaleX: 1, scaleY: 1, rotation: 0, flipH: false, flipV: false },
      width: 100,
      height: 100,
      imageBitmap: null,
    }),
    getActiveLayerId: () => "L1",
    getLayers: () => [],
    moveLayer: vi.fn(),
    snapshot: () => ({}),
  } as unknown as DocumentEngine;

  const history = {
    commit: vi.fn(),
  } as unknown as CommandHistory;

  return { engine, history, requestRender: () => {} };
}

describe("input-handler snap wiring", () => {
  it("applies snap delta and emits guide lines on move (Alt not pressed)", () => {
    const { engine, history } = makeEngine();
    const snap: SnapResult = { dx: 3, dy: 0, lines: [{ x1: 100, y1: 0, x2: 100, y2: 200 }] };
    const lines: SnapLine[] = [];
    const ctx = {
      fgColor: "#000",
      bgColor: "#fff",
      brushSize: 20,
      brushHardness: 0.8,
      brushOpacity: 1,
      selectedLayerId: "L1",
      isDragging: false,
      dragStart: { x: 0, y: 0 },
      dragCurrent: { x: 0, y: 0 },
      strokePoints: [],
      isAltPressed: false,
      onComputeSnap: vi.fn(() => snap),
      onSnapLines: (l: SnapLine[]) => lines.push(...l),
    };

    handlePointerDown("move", 50, 50, engine, history, () => {}, ctx);
    handlePointerMove("move", 55, 50, engine, () => {}, ctx);
    handlePointerUp("move", 55, 50, engine, history, () => {}, ctx);

    // raw newX = 55 - 0 = 55; layer.transform.x before move is 50
    // engine.moveLayer called with newX=55, newY=50
    expect((engine.moveLayer as unknown as ReturnType<typeof vi.fn>).mock.calls[0])
      .toEqual(["L1", 55 + 3, 50]);
    expect(ctx.onComputeSnap).toHaveBeenCalled();
    // Last lines pushed should be empty (clear on pointer up)
    expect(lines[lines.length - 1]).toEqual([]);
  });

  it("skips snap and emits no lines when Alt is pressed", () => {
    const { engine, history } = makeEngine();
    const onComputeSnap = vi.fn();
    const ctx = {
      fgColor: "#000",
      bgColor: "#fff",
      brushSize: 20,
      brushHardness: 0.8,
      brushOpacity: 1,
      selectedLayerId: "L1",
      isDragging: false,
      dragStart: { x: 0, y: 0 },
      dragCurrent: { x: 0, y: 0 },
      strokePoints: [],
      isAltPressed: true,
      onComputeSnap,
      onSnapLines: vi.fn(),
    };

    handlePointerDown("move", 50, 50, engine, history, () => {}, ctx);
    handlePointerMove("move", 55, 50, engine, () => {}, ctx);
    handlePointerUp("move", 55, 50, engine, history, () => {}, ctx);

    expect(onComputeSnap).not.toHaveBeenCalled();
    expect((engine.moveLayer as unknown as ReturnType<typeof vi.fn>).mock.calls[0])
      .toEqual(["L1", 55, 50]);
  });

  it("clears snap lines on pointer up", () => {
    const { engine, history } = makeEngine();
    const onSnapLines = vi.fn();
    const ctx = {
      fgColor: "#000",
      bgColor: "#fff",
      brushSize: 20,
      brushHardness: 0.8,
      brushOpacity: 1,
      selectedLayerId: "L1",
      isDragging: false,
      dragStart: { x: 0, y: 0 },
      dragCurrent: { x: 0, y: 0 },
      strokePoints: [],
      isAltPressed: false,
      onComputeSnap: () => ({ dx: 0, dy: 0, lines: [] }),
      onSnapLines,
    };

    handlePointerDown("move", 50, 50, engine, history, () => {}, ctx);
    handlePointerMove("move", 50, 50, engine, () => {}, ctx);
    handlePointerUp("move", 50, 50, engine, history, () => {}, ctx);

    // Last onSnapLines call should be empty array
    const calls = (onSnapLines as unknown as ReturnType<typeof vi.fn>).mock.calls;
    expect(calls[calls.length - 1][0]).toEqual([]);
  });

  it("does not call onComputeSnap when no layer is selected", () => {
    const { engine, history } = makeEngine();
    const onComputeSnap = vi.fn();
    const ctx = {
      fgColor: "#000",
      bgColor: "#fff",
      brushSize: 20,
      brushHardness: 0.8,
      brushOpacity: 1,
      selectedLayerId: null,
      isDragging: false,
      dragStart: { x: 0, y: 0 },
      dragCurrent: { x: 0, y: 0 },
      strokePoints: [],
      isAltPressed: false,
      onComputeSnap,
      onSnapLines: vi.fn(),
    };

    handlePointerDown("move", 50, 50, engine, history, () => {}, ctx);
    handlePointerMove("move", 55, 50, engine, () => {}, ctx);

    expect(onComputeSnap).not.toHaveBeenCalled();
    expect((engine.moveLayer as unknown as ReturnType<typeof vi.fn>)).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run the new tests and verify they fail**

```bash
pnpm.cmd --filter photrez-desktop test -- input-handler-snap
```

Expected: FAIL — `isAltPressed`, `onComputeSnap`, `onSnapLines` are not in `ToolContext`.

- [ ] **Step 3: Commit the failing test**

```bash
git add apps/desktop/src/__tests__/input-handler-snap.test.ts
git commit -m "test: add failing tests for input-handler snap wiring"
```

---

## Task 4: Update `ToolContext` and `input-handler` Move branch

**Files:**
- Modify: `apps/desktop/src/viewport/input-handler.ts`

- [ ] **Step 1: Update the `ToolContext` interface**

In `apps/desktop/src/viewport/input-handler.ts`, replace the existing import line for `SnapRect`:

```ts
import type { SnapRect } from "./smartGuides";
```

with:

```ts
import type { SnapRect, SnapResult } from "./smartGuides";
```

- [ ] **Step 2: Replace `onComputeSnapLines` with `onComputeSnap` and `onSnapLines` in the interface**

In the same file, replace the `ToolContext` block (lines 7-29) with:

```ts
export interface ToolContext {
  fgColor: string;
  bgColor: string;
  brushSize: number;
  brushHardness: number;
  brushOpacity: number;
  selectedLayerId: string | null;
  isAltPressed: boolean;

  // Transient interactive state
  isDragging: boolean;
  dragStart: { x: number; y: number };
  dragCurrent: { x: number; y: number };
  strokePoints: { x: number; y: number }[];

  // Custom updates
  setFgColor?: (c: string) => void;
  setBgColor?: (c: string) => void;
  onSelectionCreated?: (x: number, y: number, w: number, h: number) => void;
  onCropCreated?: (x: number, y: number, w: number, h: number) => void;
  onPaintStroke?: (points: { x: number; y: number }[], isEraser: boolean) => void;
  onHoverHandle?: (handle: string | null) => void;
  onComputeSnap?: (rect: SnapRect) => SnapResult;
  onSnapLines?: (lines: { x1: number; y1: number; x2: number; y2: number }[]) => void;
}
```

- [ ] **Step 3: Update the Move branch in `handlePointerMove`**

In the same file, replace the Move branch (lines 98-111):

```ts
  } else if (tool === "move" && context.selectedLayerId) {
    const layer = engine.getLayer(context.selectedLayerId);
    if (layer && !layer.locked) {
      const newX = docX - context.dragStart.x;
      const newY = docY - context.dragStart.y;
      engine.moveLayer(context.selectedLayerId, newX, newY);
      context.onComputeSnapLines?.({
        x: layer.transform.x,
        y: layer.transform.y,
        w: layer.width * layer.transform.scaleX,
        h: layer.height * layer.transform.scaleY,
      });
    }
  }
```

with:

```ts
  } else if (tool === "move" && context.selectedLayerId) {
    const layer = engine.getLayer(context.selectedLayerId);
    if (layer && !layer.locked) {
      const newX = docX - context.dragStart.x;
      const newY = docY - context.dragStart.y;
      let nextX = newX;
      let nextY = newY;
      if (!context.isAltPressed && context.onComputeSnap) {
        const snap = context.onComputeSnap({
          x: newX,
          y: newY,
          w: layer.width * layer.transform.scaleX,
          h: layer.height * layer.transform.scaleY,
        });
        nextX += snap.dx;
        nextY += snap.dy;
        context.onSnapLines?.(snap.lines);
      } else {
        context.onSnapLines?.([]);
      }
      engine.moveLayer(context.selectedLayerId, nextX, nextY);
    }
  }
```

- [ ] **Step 4: Clear snap lines in `handlePointerUp`**

In the same file, replace the body of `handlePointerUp` (lines 115-145) with:

```ts
export function handlePointerUp(
  tool: ToolType,
  docX: number,
  docY: number,
  engine: DocumentEngine,
  history: CommandHistory,
  requestRender: () => void,
  context: ToolContext
): void {
  if (!context.isDragging) return;
  context.isDragging = false;
  context.dragCurrent = { x: docX, y: docY };

  if (tool === "selection") {
    const x = Math.min(context.dragStart.x, docX);
    const y = Math.min(context.dragStart.y, docY);
    const w = Math.abs(context.dragStart.x - docX);
    const h = Math.abs(context.dragStart.y - docY);
    if (w > 2 && h > 2) {
      engine.createSelection(x, y, w, h);
    } else {
      engine.clearSelection();
    }
  } else if (tool === "brush" || tool === "eraser") {
    if (context.selectedLayerId && context.strokePoints.length > 0) {
      context.onPaintStroke?.([...context.strokePoints], tool === "eraser");
    }
    context.strokePoints = [];
  } else if (tool === "move") {
    context.onSnapLines?.([]);
  }
  requestRender();
}
```

- [ ] **Step 5: Run the new tests and verify they pass**

```bash
pnpm.cmd --filter photrez-desktop test -- input-handler-snap
```

Expected: PASS — all 4 new tests pass.

- [ ] **Step 6: Run the full frontend test suite**

```bash
pnpm.cmd --filter photrez-desktop test
```

Expected: PASS — all unit tests pass.

- [ ] **Step 7: Commit**

```bash
git add apps/desktop/src/viewport/input-handler.ts
git commit -m "feat(input-handler): wire snap deltas and Alt-disable into Move branch"
```

---

## Task 5: Update `CanvasViewport` wiring (target list + Alt flag)

**Files:**
- Modify: `apps/desktop/src/components/editor/CanvasViewport.tsx`

- [ ] **Step 1: Add `isAltPressed` to the module-level `interactiveState`**

In `apps/desktop/src/components/editor/CanvasViewport.tsx`, locate the `interactiveState` literal near line 28. Add `isAltPressed: false,` to it. The relevant block should now contain an `isAltPressed` field with default `false`.

- [ ] **Step 2: Update the imports from `@/viewport/smartGuides`**

In the same file, change:

```ts
import { computeSnapLines } from "@/viewport/smartGuides";
import type { SnapRect } from "@/viewport/smartGuides";
```

to:

```ts
import { computeSnapAdjustment } from "@/viewport/smartGuides";
import type { SnapRect } from "@/viewport/smartGuides";
```

- [ ] **Step 3: Replace `onComputeSnapLines` with `onComputeSnap` + `onSnapLines` and add target precomputation in `prepareToolContext`**

In the same file, replace the `interactiveState.onComputeSnapLines = ...` block inside `prepareToolContext` (lines 181-193) with:

```ts
    interactiveState.isAltPressed = isAltPressed();
    const activeEngineForTargets = workspace.getActiveEngine();
    const movingId = activeEngineForTargets ? activeEngineForTargets.getActiveLayerId() : null;
    const docW = activeEngineForTargets ? activeEngineForTargets.getWidth() : 0;
    const docH = activeEngineForTargets ? activeEngineForTargets.getHeight() : 0;
    const visibleLayers = activeEngineForTargets
      ? activeEngineForTargets.getLayers().filter((l) => l.id !== movingId)
      : [];
    const layerTargets: SnapRect[] = visibleLayers.map((l) => ({
      x: l.transform.x,
      y: l.transform.y,
      w: l.width * l.transform.scaleX,
      h: l.height * l.transform.scaleY,
    }));
    const canvasTarget: SnapRect = { x: 0, y: 0, w: docW, h: docH };
    const centerVertical: SnapRect = { x: docW / 2, y: -Infinity, w: 0, h: Infinity };
    const centerHorizontal: SnapRect = { x: -Infinity, y: docH / 2, w: Infinity, h: 0 };
    const snapTargets: SnapRect[] = [
      ...layerTargets,
      canvasTarget,
      centerVertical,
      centerHorizontal,
    ];
    interactiveState.onComputeSnap = (rect: SnapRect) => {
      if (!activeEngineForTargets) {
        setSnapLines([]);
        return { dx: 0, dy: 0, lines: [] };
      }
      return computeSnapAdjustment(rect, snapTargets);
    };
    interactiveState.onSnapLines = (lines) => setSnapLines(lines);
```

- [ ] **Step 3b: Re-sync `isAltPressed` per pointer move sample**

In `onCanvasPointerMove` (around line 602), add `interactiveState.isAltPressed = isAltPressed();` as the first line of the function body, before the `coords` calculation. This ensures pressing or releasing `Alt` mid-drag takes effect on the very next move sample (spec acceptance #5).

The updated function head should read:

```ts
  const onCanvasPointerMove = (e: PointerEvent) => {
    // Ignore if panning is active
    if (isPanning()) return;

    const engine = workspace.getActiveEngine();
    if (!engine) return;

    // Re-sync Alt state so toggling Alt mid-drag takes effect on this sample
    interactiveState.isAltPressed = isAltPressed();

    const coords = getDocCoords(e);
    handlePointerMove(
      activeTool() as ToolType,
      coords.x,
      coords.y,
      engine,
      () => scheduler.requestRender(),
      interactiveState,
    );
  };
```

- [ ] **Step 4: Verify the build succeeds**

```bash
pnpm.cmd run build
```

Expected: build succeeds. TypeScript will fail here if `interactiveState.isAltPressed` is missing or if any other type is wrong.

- [ ] **Step 5: Run the full frontend test suite**

```bash
pnpm.cmd --filter photrez-desktop test
```

Expected: PASS — all tests still green (no test depends on the removed `onComputeSnapLines` since the only caller was the deleted one).

- [ ] **Step 6: Commit**

```bash
git add apps/desktop/src/components/editor/CanvasViewport.tsx
git commit -m "feat(viewport): feed snap target list (layers + canvas + centers) to Move tool"
```

---

## Task 6: Run the full verification pipeline

- [ ] **Step 1: Frontend build**

```bash
pnpm.cmd run build
```

Expected: build succeeds with no TypeScript errors.

- [ ] **Step 2: Frontend tests**

```bash
pnpm.cmd --filter photrez-desktop test
```

Expected: all unit tests pass (existing 99 + 10 new `computeSnapAdjustment` + 4 new `input-handler-snap` = 113 total).

- [ ] **Step 3: Rust core tests**

```bash
cargo test -p photrez-core
```

Expected: all 85 Rust unit tests pass (the snap change is frontend-only, so this is a no-op regression check).

- [ ] **Step 4: (Optional but recommended) launch the app**

```bash
pnpm.cmd tauri dev
```

Manually verify:
- Drag a layer near a canvas edge: it snaps; a guide line appears.
- Drag a layer near canvas center: it snaps to center; a guide appears.
- Drag a layer near another layer's edge: it snaps; a guide appears.
- Hold `Alt` while dragging: snap and guides are disabled.
- Undo restores the original position in one step.
- Pointer up clears the guide.

Quit the dev server (Ctrl+C) once verified.

- [ ] **Step 5: Commit any build/cache drift if needed**

If `pnpm.cmd tauri dev` produced no source changes, skip this step.

---

## Task 7: Update project documentation

**Files:**
- Modify: `docs/AI_CURRENT_TASK.md`
- Modify: `docs/AI_HISTORY.md`
- Modify: `docs/FEATURES.md`

- [ ] **Step 1: Mark the task complete in `docs/AI_CURRENT_TASK.md`**

Open `docs/AI_CURRENT_TASK.md` and prepend a new top entry following the existing format. The new top task should read:

```markdown
# Move Tool Snapping (snap to layer + canvas) [COMPLETE]

Implementasi Move Tool dengan auto-snap ke layer lain dan canvas (edge + center), hold-Alt untuk disable, dan smart guides yang hanya muncul saat snap aktif.

**Spec:** `docs/superpowers/specs/2026-06-01-move-tool-snapping-design.md`
**Plan:** `docs/superpowers/plans/2026-06-01-move-tool-snapping.md`

## What Changed
- `apps/desktop/src/viewport/smartGuides.ts` — added `computeSnapAdjustment(moving, targets, threshold?)` returning `{ dx, dy, lines }`. `computeSnapLines` is now a thin wrapper that drops the deltas.
- `apps/desktop/src/viewport/input-handler.ts` — `ToolContext` gains `isAltPressed`, `onComputeSnap`, `onSnapLines`; old `onComputeSnapLines` removed. Move branch applies `dx, dy` (unless `isAltPressed`) and emits guide lines. Pointer up clears lines.
- `apps/desktop/src/components/editor/CanvasViewport.tsx` — precomputes target list per drag (other layers + canvas rect + vertical/horizontal center lines), wires `onComputeSnap` and `onSnapLines`, and sets `interactiveState.isAltPressed` from the existing signal.
- `apps/desktop/src/__tests__/snap-adjustment.test.ts` — 10 new unit tests.
- `apps/desktop/src/__tests__/input-handler-snap.test.ts` — 4 new unit tests.

## Verification
- `pnpm.cmd run build` — OK
- `pnpm.cmd --filter photrez-desktop test` — all pass (113 total)
- `cargo test -p photrez-core` — all 85 pass (no Rust changes; regression check)

## Out of Scope (deferred)
- Grid snapping
- Rotated-bounds snap
- Multi-select drag
- Editable numeric X/Y/W/H fields
- Keyboard arrow nudge
```

If the file already has a `SelectionTransformOverlay` complete task at the top from prior work, do not remove it — just add the new one above the prior top entry.

- [ ] **Step 2: Append a history entry in `docs/AI_HISTORY.md`**

Append (do not overwrite prior content):

```markdown
## 2026-06-01 — Move Tool Snapping

- Added `computeSnapAdjustment` pure helper in `apps/desktop/src/viewport/smartGuides.ts` that returns `{ dx, dy, lines }` for a moving rect against a target list (3 candidates per axis, nearest wins, default threshold 5).
- Replaced the side-effect-only `onComputeSnapLines` callback on `ToolContext` with a pure `onComputeSnap` + `onSnapLines` pair. Move branch in `input-handler.ts` now applies the deltas and emits guide lines.
- Hold `Alt` during Move drag disables snapping and clears guide lines.
- `CanvasViewport` precomputes the target list per drag: every other layer (locked or hidden included), the canvas rect, and two synthetic rects representing the canvas center lines.
- Added 10 unit tests for `computeSnapAdjustment` and 4 for the input-handler snap wiring. All 113 frontend tests pass. Rust core tests unaffected and still pass.
```

- [ ] **Step 3: Add a feature row in `docs/FEATURES.md`**

In the `Move Tool` section (or create one if missing), add a row stating snapping is now active, with target list (other layers + canvas + center), Alt disable, and smart guide behavior. Match the table style of the existing rows.

- [ ] **Step 4: Commit the documentation update**

```bash
git add docs/AI_CURRENT_TASK.md docs/AI_HISTORY.md docs/FEATURES.md
git commit -m "docs: record Move Tool snapping delivery"
```

---

## Self-Review (Spec Coverage)

| Spec section | Covered by |
|---|---|
| §1 Summary (snap engine, targets, guides, Alt, simplification) | Tasks 2, 4, 5 |
| §2 Product Goal (6 numbered user outcomes) | Tasks 5, 6 (manual verify) |
| §3.1 Snap Targets (other layers + canvas + center) | Task 5 (target list composition) |
| §3.2 Snap Behavior (auto-snap, Alt disable) | Tasks 4, 5 (isAltPressed plumbing) |
| §3.3 Helper API (`SnapRect`, `SnapResult`, `computeSnapAdjustment`, threshold default 5) | Task 2 (helper + types) |
| §3.4 Input Handler Wiring (3 new ToolContext fields, snapshot preserved, pointer up clears lines) | Task 4 (interface + branches) |
| §3.5 Smart Guide Rendering (existing render path, no new renderer) | Task 5 (only feeds `setSnapLines`) |
| §4 Architecture & Constraints (file scope, no Tauri/ADR changes) | Tasks 2, 4, 5 — only the 3 listed files + tests |
| §5 Risks | Acknowledged in spec; no new task needed |
| §6 Out of Scope | No tasks added (correct) |
| §7 Acceptance Criteria #1-#3 (snap to edge/center/layer) | Tasks 5 + 6 manual verify |
| §7 #4-#5 (Alt disable, re-enable on release) | Task 4 (input handler reads `isAltPressed` per move sample) |
| §7 #6 (single-step undo) | Preserved by leaving `history.commit` only in pointer down (Task 4) |
| §7 #7 (pointer up clears lines) | Task 4 (handlePointerUp) |
| §7 #8-#10 (build/test/cargo pass) | Task 6 |

No placeholders. All type names match across tasks. Threshold default `5` is consistent in `smartGuides.ts` and tests.
