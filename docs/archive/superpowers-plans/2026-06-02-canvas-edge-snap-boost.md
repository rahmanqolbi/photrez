# Canvas Edge Snap Boost Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make canvas edges feel more magnetic with 12px threshold and priority resolution, while keeping layer-to-layer snap at 5px.

**Architecture:** Extend `SnapRect` with optional `snapThreshold`/`snapPriority` fields. Update `computeSnapAdjustment` to prefer higher-priority targets over closer lower-priority ones. Update `CanvasViewport.tsx` target builders to tag canvas edges (priority 3, threshold 12) and center lines (priority 2, threshold 6).

**Tech Stack:** TypeScript, SolidJS, Vite/Vitest

---

### Task 1: Update `smartGuides.ts` — priority-aware snap resolution

**Files:**
- Modify: `apps/desktop/src/viewport/smartGuides.ts:1-19` — SnapRect interface + initial approach
- Modify: `apps/desktop/src/viewport/smartGuides.ts:35-106` — computeSnapAdjustment logic
- Test: `apps/desktop/src/__tests__/snap-adjustment.test.ts` (add tests)

- [ ] **Step 1: Add optional fields to SnapRect**

```ts
export interface SnapRect {
  x: number;
  y: number;
  w: number;
  h: number;
  snapThreshold?: number;
  snapPriority?: number;
}
```

- [ ] **Step 2: Update `computeSnapAdjustment` for priority-aware selection**

Replace the per-axis tracking initialization:

```ts
let bestDx = 0;
let bestDxDist = Infinity;
let bestDxLineY1 = moving.y;
let bestDxLineY2 = moving.y + moving.h;
let bestDxHitX: number | null = null;
let bestDxPriority = -1;

let bestDy = 0;
let bestDyDist = Infinity;
let bestDyLineX1 = moving.x;
let bestDyLineX2 = moving.x + moving.w;
let bestDyHitY: number | null = null;
let bestDyPriority = -1;
```

Replace the acceptance condition inside both axis loops. For X axis (similar for Y):

```ts
const tThreshold = t.snapThreshold ?? threshold;
const tPriority = t.snapPriority ?? 1;
const d = te[tk] - me[mk];
const dist = Math.abs(d);
if (dist < tThreshold && (tPriority > bestDxPriority || (tPriority === bestDxPriority && dist < bestDxDist))) {
  bestDxDist = dist;
  bestDxPriority = tPriority;
  bestDx = d;
  bestDxHitX = te[tk];
  const rawY1 = Math.min(moving.y, t.y) - 10;
  const rawY2 = Math.max(moving.y + moving.h, t.y + t.h) + 10;
  bestDxLineY1 = Number.isFinite(rawY1) ? rawY1 : moving.y - 10000;
  bestDxLineY2 = Number.isFinite(rawY2) ? rawY2 : moving.y + moving.h + 10000;
}
```

And for Y axis:

```ts
const tThreshold = t.snapThreshold ?? threshold;
const tPriority = t.snapPriority ?? 1;
const d = te[tk] - me[mk];
const dist = Math.abs(d);
if (dist < tThreshold && (tPriority > bestDyPriority || (tPriority === bestDyPriority && dist < bestDyDist))) {
  bestDyDist = dist;
  bestDyPriority = tPriority;
  bestDy = d;
  bestDyHitY = te[tk];
  const rawX1 = Math.min(moving.x, t.x) - 10;
  const rawX2 = Math.max(moving.x + moving.w, t.x + t.w) + 10;
  bestDyLineX1 = Number.isFinite(rawX1) ? rawX1 : moving.x - 10000;
  bestDyLineX2 = Number.isFinite(rawX2) ? rawX2 : moving.x + moving.w + 10000;
}
```

- [ ] **Step 3: Write failing tests**

Add these tests to `apps/desktop/src/__tests__/snap-adjustment.test.ts` inside the existing `describe("computeSnapAdjustment", ...)` block:

```ts
it("snaps layer 10px from canvas edge (within 12px threshold)", () => {
  const moving = { x: 10, y: 100, w: 50, h: 50 };
  const targets: SnapRect[] = [
    { x: 0, y: 0, w: 1000, h: 800, snapThreshold: 12, snapPriority: 3 },
  ];
  const result = computeSnapAdjustment(moving, targets, 5);
  // moving x=10, canvas edge x=0 → d = -10 → dx = -10
  expect(result.dx).toBe(-10);
});

it("snaps layer 11px from canvas edge (within 12px threshold)", () => {
  const moving = { x: 11, y: 100, w: 50, h: 50 };
  const targets: SnapRect[] = [
    { x: 0, y: 0, w: 1000, h: 800, snapThreshold: 12, snapPriority: 3 },
  ];
  const result = computeSnapAdjustment(moving, targets, 5);
  expect(result.dx).toBe(-11);
});

it("does NOT snap layer 13px from canvas edge (outside 12px threshold)", () => {
  const moving = { x: 13, y: 100, w: 50, h: 50 };
  const targets: SnapRect[] = [
    { x: 0, y: 0, w: 1000, h: 800, snapThreshold: 12, snapPriority: 3 },
  ];
  const result = computeSnapAdjustment(moving, targets, 5);
  expect(result.dx).toBe(0);
});

it("canvas edge wins over layer edge when both are candidates", () => {
  // moving left=7, canvas edge=0 (d=-7, within 12), layer right=2 (d=-5, within 5)
  // canvas edge priority 3 > layer priority 1 → canvas wins
  const moving = { x: 7, y: 100, w: 50, h: 50 };
  const targets: SnapRect[] = [
    { x: 0, y: 0, w: 1000, h: 800, snapThreshold: 12, snapPriority: 3 },
    { x: -48, y: 100, w: 50, h: 50 }, // right edge at -48+50=2, d=2-7=-5, within 5
  ];
  const result = computeSnapAdjustment(moving, targets, 5);
  // Canvas: d=0-7=-7, closer than layer's -5 but canvas has higher priority
  expect(result.dx).toBe(-7);
});

it("canvas center snap works within its 6px threshold", () => {
  // moving rect x=100, w=50 → center=125
  // target center=120 → d=120-125=-5 → | -5 |=5 <6 ✓
  const moving = { x: 100, y: 0, w: 50, h: 50 };
  const result = computeSnapAdjustment(moving, [
    { x: 120, y: -Infinity, w: 0, h: Infinity, snapThreshold: 6, snapPriority: 2 },
  ], 5);
  expect(result.dx).toBe(-5);
});

it("canvas center does NOT snap beyond its 6px threshold", () => {
  // moving rect x=100, w=50 → center=125
  // target center=132 → d=132-125=7 → |7|=7 >6 ✗
  const moving = { x: 100, y: 0, w: 50, h: 50 };
  const result = computeSnapAdjustment(moving, [
    { x: 132, y: -Infinity, w: 0, h: Infinity, snapThreshold: 6, snapPriority: 2 },
  ], 5);
  expect(result.dx).toBe(0);
});

it("backward compat: bare SnapRect uses default threshold and priority", () => {
  const moving = { x: 97, y: 100, w: 50, h: 50 };
  const targets: SnapRect[] = [
    { x: 100, y: 200, w: 50, h: 50 },
  ];
  const result = computeSnapAdjustment(moving, targets, 5);
  expect(result.dx).toBe(3); // 100 - 97 = 3
  expect(result.lines.length).toBe(1);
});
```

- [ ] **Step 4: Run tests to verify they fail**

Run: `npx vitest run snap-adjustment -t "snaps layer 10px" -t "snaps layer 11px" -t "does NOT snap layer 13px" -t "canvas edge wins" -t "snaps to canvas center" -t "backward compat" --reporter verbose`

Expected: Some tests fail because computeSnapAdjustment hasn't been updated yet.

Wait — the tests will use the current SnapRect interface which doesn't have snapThreshold/snapPriority. After Step 1, TypeScript will accept them. After Step 2, the implementation will handle them. Let me just run the full test file after both steps.

Run: `npx vitest run snap-adjustment --reporter verbose`
Expected: New tests fail (old snap behavior ignores priority/threshold).

- [ ] **Step 5: Run tests to verify they pass after implementation**

Run: `npx vitest run snap-adjustment --reporter verbose`
Expected: All tests PASS (existing + new).

- [ ] **Step 6: Commit**

```bash
git add apps/desktop/src/viewport/smartGuides.ts apps/desktop/src/__tests__/snap-adjustment.test.ts
git commit -m "feat(snap): priority-aware computeSnapAdjustment with per-target threshold"
```

---

### Task 2: Update `CanvasViewport.tsx` — tag canvas targets with threshold and priority

**Files:**
- Modify: `apps/desktop/src/components/editor/CanvasViewport.tsx:244-264` and `885-913`

- [ ] **Step 1: Update `syncStateHandler` snap target builder**

Replace lines 252-257:

```ts
const snapTargets: SnapRect[] = [
  { x: 0, y: 0, w: docW, h: docH, snapThreshold: 12, snapPriority: 3 },
  { x: docW / 2, y: -Infinity, w: 0, h: Infinity, snapThreshold: 6, snapPriority: 2 },
  { x: -Infinity, y: docH / 2, w: Infinity, h: 0, snapThreshold: 6, snapPriority: 2 },
  ...layerTargets,
];
```

- [ ] **Step 2: Update `onComputeSnap` inline snap target builder (JSX prop)**

Replace lines 897-902:

```ts
const snapTargets: SnapRect[] = [
  { x: 0, y: 0, w: docW, h: docH, snapThreshold: 12, snapPriority: 3 },
  { x: docW / 2, y: -Infinity, w: 0, h: Infinity, snapThreshold: 6, snapPriority: 2 },
  { x: -Infinity, y: docH / 2, w: Infinity, h: 0, snapThreshold: 6, snapPriority: 2 },
  ...layerTargets,
];
```

- [ ] **Step 3: Run full test suite**

Run: `npx vitest run --reporter verbose`
Expected: All 155+ tests PASS.

- [ ] **Step 4: Commit**

```bash
git add apps/desktop/src/components/editor/CanvasViewport.tsx
git commit -m "feat(snap): canvas edges get threshold 12 priority 3, center lines threshold 6 priority 2"
```

---

### Task 3: Verify build

**Files:** none

- [ ] **Step 1: Run full test suite**

Run: `npx vitest run`
Expected: All tests PASS.

- [ ] **Step 2: Run build**

Run: `pnpm.cmd run build`
Expected: SUCCESS.
