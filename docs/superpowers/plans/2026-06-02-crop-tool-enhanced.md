# Enhanced Crop Tool Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace bare-bones crop tool with Photoshop-grade Enhanced Crop Tool: interactive crop box with 8 resize handles + move, ratio/size/free modes, 5 guide modes, live dimension HUD, Enter/Esc apply/cancel, and full Option Bar controls.

**Architecture:** Crop tool runs entirely in TypeScript/WebGL2 MVP runtime. Crop geometry is a pure function module (`cropGeometry.ts`). The interactive SVG overlay (`CropOverlay.tsx`) handles pointer events for resize/move. The Option Bar surface signals from `EditorContext`. `engine.cropCanvas()` is called on apply (destructive). The crop-rect is the single source of truth — no more `cropW`/`cropH` drift.

**Tech Stack:** SolidJS (signals, createEffect, Show), SVG (mask, rect, line), TypeScript.

---

## File Map

| File | Status | Responsibility |
|------|--------|----------------|
| `apps/desktop/src/components/editor/EditorContext.tsx` | MODIFY | Add `cropMode`, `cropGuideMode`, `cropDeletePixels`, `cropAspect`, `cropSizeTarget` signals |
| `apps/desktop/src/viewport/cropGeometry.ts` | **CREATE** | Pure math helpers: clampCropRect, applyCropResizeHandle, applyCropMove, constrainCropAspect, constrainCropToSize |
| `apps/desktop/src/__tests__/crop-geometry.test.ts` | **CREATE** | Unit tests for all cropGeometry helpers |
| `apps/desktop/src/viewport/input-handler.ts` | MODIFY | Add `tool === "crop"` branch in `handlePointerUp` to finalize crop rect |
| `apps/desktop/src/components/editor/CanvasViewport.tsx` | MODIFY | Wire crop signals, prepareToolContext, keyboard Enter/Esc, pass new props to CropOverlay |
| `apps/desktop/src/components/editor/CropOverlay.tsx` | **REWRITE** | Full interactive SVG: shield mask, 8 handles, guides (5 modes), move inside, resize, dimension tooltip |
| `apps/desktop/src/components/editor/OptionBar.tsx` | MODIFY | Replace display-only W/H + APPLY CROP with mode dropdown, W/H fields, Swap, Guide, Delete toggle, Reset/Cancel/Apply |

---

### Task 1: EditorContext Crop Signals

**Files:**
- Modify: `apps/desktop/src/components/editor/EditorContext.tsx`

- [ ] **Step 1: Add crop signal types to interface**

```ts
// After line 50 (moveSnapEnabled), add:
cropMode: Accessor<"free" | "ratio" | "size">;
setCropMode: Setter<"free" | "ratio" | "size">;
cropGuideMode: Accessor<"none" | "thirds" | "grid" | "diagonal" | "golden">;
setCropGuideMode: Setter<"none" | "thirds" | "grid" | "diagonal" | "golden">;
cropDeletePixels: Accessor<boolean>;
setCropDeletePixels: Setter<boolean>;
cropAspect: Accessor<{ w: number; h: number } | null>;
setCropAspect: Setter<{ w: number; h: number } | null>;
cropSizeTarget: Accessor<{ w: number; h: number } | null>;
setCropSizeTarget: Setter<{ w: number; h: number } | null>;
```

- [ ] **Step 2: Add signal declarations after line 86**

```ts
const [cropMode, setCropMode] = createSignal<"free" | "ratio" | "size">("free");
const [cropGuideMode, setCropGuideMode] = createSignal<"none" | "thirds" | "grid" | "diagonal" | "golden">("thirds");
const [cropDeletePixels, setCropDeletePixels] = createSignal<boolean>(true);
const [cropAspect, setCropAspect] = createSignal<{ w: number; h: number } | null>(null);
const [cropSizeTarget, setCropSizeTarget] = createSignal<{ w: number; h: number } | null>(null);
```

- [ ] **Step 3: Add to value object before the closing brace**

```ts
cropMode,
setCropMode,
cropGuideMode,
setCropGuideMode,
cropDeletePixels,
setCropDeletePixels,
cropAspect,
setCropAspect,
cropSizeTarget,
setCropSizeTarget,
```

- [ ] **Step 4: Run build + tests**

```bash
pnpm.cmd run build
npx vitest run
```
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add apps/desktop/src/components/editor/EditorContext.tsx
git commit -m "feat(crop): add crop signals to EditorContext"
```

---

### Task 2: cropGeometry.ts + Unit Tests

**Files:**
- Create: `apps/desktop/src/viewport/cropGeometry.ts`
- Test: `apps/desktop/src/__tests__/crop-geometry.test.ts`

- [ ] **Step 1: Write 10 failing tests**

```ts
// apps/desktop/src/__tests__/crop-geometry.test.ts
import { describe, it, expect } from "vitest";
import {
  clampCropRect,
  applyCropResizeHandle,
  applyCropMove,
  constrainCropAspect,
  constrainCropToSize,
} from "../viewport/cropGeometry";

describe("clampCropRect", () => {
  it("clamps rect within document bounds", () => {
    const result = clampCropRect({ x: -10, y: -20, w: 100, h: 200 }, 800, 600);
    expect(result.x).toBe(0);
    expect(result.y).toBe(0);
    expect(result.w).toBe(90);
    expect(result.h).toBe(180);
  });

  it("clamps right/bottom overflow", () => {
    const result = clampCropRect({ x: 750, y: 500, w: 100, h: 200 }, 800, 600);
    expect(result.x).toBe(700);
    expect(result.y).toBe(400);
    expect(result.w).toBe(100);
    expect(result.h).toBe(200);
  });

  it("passes through rect inside bounds", () => {
    const result = clampCropRect({ x: 100, y: 50, w: 400, h: 300 }, 800, 600);
    expect(result.x).toBe(100);
    expect(result.y).toBe(50);
    expect(result.w).toBe(400);
    expect(result.h).toBe(300);
  });
});

describe("applyCropResizeHandle", () => {
  const rect = { x: 100, y: 100, w: 400, h: 300 };

  it("SE corner increases w/h proportionally", () => {
    // Drag SE (dx=50, dy=25) → apportional = min aspect-adjusted
    const r = applyCropResizeHandle(rect, "se", 50, 25, null);
    expect(r.w).toBeGreaterThan(400);
    expect(r.h).toBeGreaterThan(300);
    expect(r.x).toBe(100);
    expect(r.y).toBe(100);
  });

  it("SE corner with Shift does free resize (no aspect lock)", () => {
    const r = applyCropResizeHandle(rect, "se", 50, 25, null, true);
    expect(r.w).toBe(450);
    expect(r.h).toBe(325);
    expect(r.x).toBe(100);
    expect(r.y).toBe(100);
  });

  it("S edge only changes height", () => {
    const r = applyCropResizeHandle(rect, "s", 0, 50, null);
    expect(r.h).toBe(350);
    expect(r.w).toBe(400);
    expect(r.x).toBe(100);
    expect(r.y).toBe(100);
  });

  it("NW corner with Alt resizes from center", () => {
    const cx = rect.x + rect.w / 2;
    const cy = rect.y + rect.h / 2;
    const r = applyCropResizeHandle(rect, "nw", -30, -20, null, false, true);
    // From center: width decreases by 2*30, height by 2*20
    expect(r.w).toBe(400 - 60);
    expect(r.h).toBe(300 - 40);
    expect(r.x).toBe(cx - r.w / 2);
    expect(r.y).toBe(cy - r.h / 2);
  });

  it("corner with aspect ratio lock maintains ratio", () => {
    const r = applyCropResizeHandle(rect, "se", 60, 60, { w: 4, h: 3 });
    // Maintains 4:3 aspect ratio, grows proportionally
    const newRatio = r.w / r.h;
    expect(Math.abs(newRatio - 4 / 3)).toBeLessThan(0.01);
    expect(r.w).toBeGreaterThan(400);
  });
});

describe("applyCropMove", () => {
  const rect = { x: 100, y: 100, w: 400, h: 300 };

  it("moves rect by delta", () => {
    const r = applyCropMove(rect, 50, -30, 800, 600);
    expect(r.x).toBe(150);
    expect(r.y).toBe(70);
  });

  it("clamps left edge", () => {
    const r = applyCropMove(rect, -200, 0, 800, 600);
    expect(r.x).toBe(0);
  });

  it("clamps right edge", () => {
    const r = applyCropMove(rect, 500, 0, 800, 600);
    expect(r.x).toBe(400);
  });
});

describe("constrainCropAspect", () => {
  const rect = { x: 100, y: 100, w: 400, h: 300 };

  it("adjusts width to match 1:1 aspect", () => {
    const r = constrainCropAspect(rect, { w: 1, h: 1 });
    expect(r.w).toBe(300);
    expect(r.h).toBe(300);
    // Center-anchored: x shifts by (oldW - newW)/2
    expect(r.x).toBe(100 + 50);
    expect(r.y).toBe(100);
  });

  it("adjusts height to match 16:9 aspect", () => {
    const r = constrainCropAspect(rect, { w: 16, h: 9 });
    expect(Math.abs(r.w / r.h - 16 / 9)).toBeLessThan(0.01);
  });
});

describe("constrainCropToSize", () => {
  const rect = { x: 100, y: 100, w: 400, h: 300 };

  it("scales proportionally to fit target size", () => {
    const r = constrainCropToSize(rect, 200, 150);
    expect(r.w).toBe(200);
    expect(r.h).toBe(150);
  });
});
```

- [ ] **Step 2: Run test to verify failure**

```bash
npx vitest run crop-geometry
```
Expected: FAIL (module not found)

- [ ] **Step 3: Write cropGeometry.ts implementation**

```ts
// apps/desktop/src/viewport/cropGeometry.ts

export interface CropRect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export function clampCropRect(rect: CropRect, docW: number, docH: number): CropRect {
  let { x, y, w, h } = rect;
  if (x < 0) { w += x; x = 0; }
  if (y < 0) { h += y; y = 0; }
  if (x + w > docW) { w = docW - x; }
  if (y + h > docH) { h = docH - y; }
  w = Math.max(1, w);
  h = Math.max(1, h);
  return { x, y, w, h };
}

export function applyCropResizeHandle(
  rect: CropRect,
  handle: string,
  dx: number,
  dy: number,
  aspect: { w: number; h: number } | null,
  shift?: boolean,
  alt?: boolean,
): CropRect {
  let { x, y, w, h } = rect;

  const isCorner = ["nw", "ne", "se", "sw"].includes(handle);
  const isEdge = ["n", "e", "s", "w"].includes(handle);

  if (isEdge) {
    // Single-axis resize
    if (handle === "e") { w = Math.max(1, w + dx); }
    if (handle === "w") { w = Math.max(1, w - dx); x = rect.x + rect.w - w; }
    if (handle === "s") { h = Math.max(1, h + dy); }
    if (handle === "n") { h = Math.max(1, h - dy); y = rect.y + rect.h - h; }
    return clampToPositive({ x, y, w, h });
  }

  if (isCorner) {
    const anchorX = handle === "se" || handle === "ne" ? rect.x : rect.x + rect.w;
    const anchorY = handle === "se" || handle === "sw" ? rect.y : rect.y + rect.h;

    if (shift) {
      // Free resize — no aspect lock
      const seHandle = handle === "se" || handle === "ne";
      const sHandle = handle === "se" || handle === "sw";
      const newW = Math.max(1, seHandle ? w + dx : w - dx);
      const newH = Math.max(1, sHandle ? h + dy : h - dy);
      x = seHandle ? anchorX : anchorX - newW;
      y = sHandle ? anchorY : anchorY - newH;
      w = newW;
      h = newH;
    } else {
      // Proportional resize
      const propX = handle === "se" || handle === "ne" ? 1 : -1;
      const propY = handle === "se" || handle === "sw" ? 1 : -1;

      let projected: number;
      if (aspect) {
        // Ratio mode: use aspect diagonal
        const diagLen = Math.sqrt(aspect.w * aspect.w + aspect.h * aspect.h);
        projected = (dx * propX * (aspect.h / diagLen) + dy * propY * (aspect.w / diagLen)) / diagLen;
        const curDiag = Math.sqrt(w * w + h * h);
        const factor = Math.max(0.01, 1 + projected / curDiag);
        w = Math.max(1, w * factor);
        h = Math.max(1, h * factor);
      } else {
        // Free mode: default proportional
        const diagLen = Math.sqrt(rect.w * rect.w + rect.h * rect.h);
        projected = (dx * propX + dy * propY) / diagLen;
        const factor = Math.max(0.01, 1 + projected);
        w = Math.max(1, rect.w * factor);
        h = Math.max(1, rect.h * factor);
      }

      if (alt) {
        // Alt + corner: resize from center
        const cx = rect.x + rect.w / 2;
        const cy = rect.y + rect.h / 2;
        x = cx - w / 2;
        y = cy - h / 2;
      } else {
        x = propX > 0 ? anchorX : anchorX - w;
        y = propY > 0 ? anchorY : anchorY - h;
      }
    }
  }

  return clampToPositive({ x, y, w, h });
}

function clampToPositive(r: CropRect): CropRect {
  return {
    x: r.x,
    y: r.y,
    w: Math.max(1, r.w),
    h: Math.max(1, r.h),
  };
}

export function applyCropMove(
  rect: CropRect,
  dx: number,
  dy: number,
  docW: number,
  docH: number,
): CropRect {
  let x = rect.x + dx;
  let y = rect.y + dy;
  // Clamp to document bounds
  x = Math.max(0, Math.min(x, docW - rect.w));
  y = Math.max(0, Math.min(y, docH - rect.h));
  return { x, y, w: rect.w, h: rect.h };
}

export function constrainCropAspect(
  rect: CropRect,
  aspect: { w: number; h: number },
): CropRect {
  const currentRatio = rect.w / rect.h;
  const targetRatio = aspect.w / aspect.h;

  if (currentRatio > targetRatio) {
    // Too wide: adjust width
    const newW = rect.h * targetRatio;
    return {
      x: rect.x + (rect.w - newW) / 2,
      y: rect.y,
      w: newW,
      h: rect.h,
    };
  } else {
    // Too tall: adjust height
    const newH = rect.w / targetRatio;
    return {
      x: rect.x,
      y: rect.y + (rect.h - newH) / 2,
      w: rect.w,
      h: newH,
    };
  }
}

export function constrainCropToSize(
  rect: CropRect,
  targetW: number,
  targetH: number,
): CropRect {
  // Scale proportionally, then center
  const scale = Math.min(targetW / rect.w, targetH / rect.h);
  const newW = rect.w * scale;
  const newH = rect.h * scale;
  return {
    x: rect.x + (rect.w - newW) / 2,
    y: rect.y + (rect.h - newH) / 2,
    w: Math.round(newW),
    h: Math.round(newH),
  };
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npx vitest run crop-geometry
```
Expected: 10/10 PASS

- [ ] **Step 5: Run full test suite**

```bash
npx vitest run
```
Expected: existing tests still pass (no regressions)

- [ ] **Step 6: Commit**

```bash
git add apps/desktop/src/viewport/cropGeometry.ts apps/desktop/src/__tests__/crop-geometry.test.ts
git commit -m "feat(crop): add cropGeometry pure math helpers + 10 unit tests"
```

---

### Task 3: input-handler.ts Crop Pointer-Up

**Files:**
- Modify: `apps/desktop/src/viewport/input-handler.ts`

- [ ] **Step 1: Add crop finalization to handlePointerUp**

After line 155 (`context.strokePoints = [];`), add crop branch:

```ts
} else if (tool === "crop") {
    const x = Math.min(context.dragStart.x, docX);
    const y = Math.min(context.dragStart.y, docY);
    const w = Math.abs(context.dragStart.x - docX);
    const h = Math.abs(context.dragStart.y - docY);
    if (w > 2 && h > 2) {
      context.onCropCreated?.(x, y, w, h);
    }
    // If w/h <= 2, keep existing crop rect (no-op)
```

Change the existing line 156 `} else if (tool === "move") {` to `} else if (tool === "move") {`.

The full pointer-up function should have these branches in order: selection, brush/eraser, crop, move.

- [ ] **Step 2: Build + tests**

```bash
pnpm.cmd run build
npx vitest run
```
Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add apps/desktop/src/viewport/input-handler.ts
git commit -m "feat(crop): add crop finalization branch in handlePointerUp"
```

---

### Task 4: CanvasViewport Crop Wiring

**Files:**
- Modify: `apps/desktop/src/components/editor/CanvasViewport.tsx`

- [ ] **Step 1: Add new crop state signals**

After line 84 (`const [cropGuideMode, ...]`), add:

```ts
const [cropIsActive, setCropIsActive] = createSignal(false);
const [cropDragState, setCropDragState] = createSignal<{
  handle: string | null;
  startRect: { x: number; y: number; w: number; h: number };
  startPointer: { x: number; y: number };
} | null>(null);
```

- [ ] **Step 2: Wire prepareToolContext to set onCropCreated**

In `prepareToolContext()` (line 230), add after `interactiveState.onSelectionCreated` (line 240):

```ts
interactiveState.onCropCreated = (x, y, w, h) => {
  setCropRect({ x, y, w, h });
  setCropIsActive(true);
};
```

- [ ] **Step 3: Add keyboard handler for Enter/Esc during crop**

In the keyboard handler section (around line 330+), add:

```ts
// Crop tool keyboard shortcuts
if (activeTool() === "crop") {
  if (e.key === "Enter") {
    e.preventDefault();
    const rect = cropRect();
    if (rect && engine) {
      const history = workspace.getActiveHistory();
      history?.commit(engine.snapshot());
      engine.cropCanvas(rect.x, rect.y, rect.w, rect.h);
      scheduler.requestRender();
      setCropRect(null);
      setCropIsActive(false);
      setActiveTool("move");
    }
    return;
  }
  if (e.key === "Escape") {
    e.preventDefault();
    setCropRect(null);
    setCropIsActive(false);
    setActiveTool("move");
    return;
  }
}
```

- [ ] **Step 4: Update CropOverlay props to pass new props**

Find the `<CropOverlay>` usage (around line 859), replace with:

```tsx
<CropOverlay
  cropRect={cropRect()}
  guideMode={cropGuideMode()}
  canvasWidth={docWidth()}
  canvasHeight={docHeight()}
  zoom={zoom()}
  cropMode={cropMode()}
  cropAspect={cropAspect()}
  onCropRectChange={(rect) => setCropRect(rect)}
/>
```

- [ ] **Step 5: Import new signals from EditorContext**

Add after existing destructuring (around line 50+):

```ts
const {
  moveAutoSelect, setMoveAutoSelect,
  moveSnapEnabled, setMoveSnapEnabled,
  cropMode, setCropMode,
  cropGuideMode, setCropGuideMode,
  cropDeletePixels, setCropDeletePixels,
  cropAspect, setCropAspect,
  cropSizeTarget, setCropSizeTarget,
} = useEditor();
```

- [ ] **Step 6: Build + test**

```bash
pnpm.cmd run build
npx vitest run
```
Expected: PASS (build may fail due to new CropOverlay props — that's fine, Task 5 implements them)

- [ ] **Step 7: Commit**

```bash
git add apps/desktop/src/components/editor/CanvasViewport.tsx
git commit -m "feat(crop): wire crop signals, prepareToolContext, keyboard Enter/Esc"
```

---

### Task 5: CropOverlay Full Rewrite

**Files:**
- Rewrite: `apps/desktop/src/components/editor/CropOverlay.tsx`

- [ ] **Step 1: Write the full interactive CropOverlay component**

```tsx
// apps/desktop/src/components/editor/CropOverlay.tsx
import { Show, createSignal, createEffect, onCleanup } from "solid-js";
import { clampCropRect, applyCropResizeHandle, applyCropMove, CropRect } from "../../viewport/cropGeometry";

interface CropOverlayProps {
  cropRect: CropRect | null;
  guideMode: "none" | "thirds" | "grid" | "diagonal" | "golden";
  canvasWidth: number;
  canvasHeight: number;
  zoom: number;
  cropMode: "free" | "ratio" | "size";
  cropAspect: { w: number; h: number } | null;
  onCropRectChange: (rect: CropRect) => void;
}

const HANDLE_SIZE = 8;
const HANDLE_HIT = 16;

type HandleType = "nw" | "n" | "ne" | "e" | "se" | "s" | "sw" | "w";

const HANDLE_TYPES: HandleType[] = ["nw", "n", "ne", "e", "se", "s", "sw", "w"];

function getHandlePosition(rect: CropRect, handle: HandleType): { x: number; y: number } {
  const cx = rect.x + rect.w / 2;
  const cy = rect.y + rect.h / 2;
  switch (handle) {
    case "nw": return { x: rect.x, y: rect.y };
    case "n": return { x: cx, y: rect.y };
    case "ne": return { x: rect.x + rect.w, y: rect.y };
    case "e": return { x: rect.x + rect.w, y: cy };
    case "se": return { x: rect.x + rect.w, y: rect.y + rect.h };
    case "s": return { x: cx, y: rect.y + rect.h };
    case "sw": return { x: rect.x, y: rect.y + rect.h };
    case "w": return { x: rect.x, y: cy };
  }
}

function getHandleCursor(handle: HandleType): string {
  switch (handle) {
    case "nw": return "nwse-resize";
    case "se": return "nwse-resize";
    case "ne": return "nesw-resize";
    case "sw": return "nesw-resize";
    case "n": return "ns-resize";
    case "s": return "ns-resize";
    case "e": return "ew-resize";
    case "w": return "ew-resize";
  }
}

export function CropOverlay(props: CropOverlayProps) {
  const [dragHandle, setDragHandle] = createSignal<HandleType | null>(null);
  const [isMoving, setIsMoving] = createSignal(false);
  const [dragStart, setDragStart] = createSignal<{ x: number; y: number } | null>(null);
  const [startRect, setStartRect] = createSignal<CropRect | null>(null);
  const [tooltipPos, setTooltipPos] = createSignal<{ x: number; y: number } | null>(null);
  const [hoverHandle, setHoverHandle] = createSignal<HandleType | null>(null);
  let svgRef: SVGSVGElement | undefined;

  // Hit-test: find which handle a pointer position is on
  function hitTestHandle(px: number, py: number, rect: CropRect): HandleType | null {
    const hs = HANDLE_SIZE / props.zoom;
    const hh = HANDLE_HIT / props.zoom;
    for (const h of HANDLE_TYPES) {
      const pos = getHandlePosition(rect, h);
      if (Math.abs(px - pos.x) < hh && Math.abs(py - pos.y) < hh) {
        return h;
      }
    }
    return null;
  }

  // Hit-test: is pointer inside the crop rect?
  function isInsideRect(px: number, py: number, rect: CropRect): boolean {
    return px >= rect.x && px <= rect.x + rect.w &&
           py >= rect.y && py <= rect.y + rect.h;
  }

  const handlePointerDown = (e: PointerEvent) => {
    if (!props.cropRect) return;
    const svg = svgRef;
    if (!svg) return;
    const rect = svg.getBoundingClientRect();
    const px = (e.clientX - rect.left) / props.zoom;
    const py = (e.clientY - rect.top) / props.zoom;

    const handle = hitTestHandle(px, py, props.cropRect);
    if (handle) {
      setDragHandle(handle);
      setDragStart({ x: px, y: py });
      setStartRect({ ...props.cropRect });
      e.preventDefault();
      return;
    }

    if (isInsideRect(px, py, props.cropRect)) {
      setIsMoving(true);
      setDragStart({ x: px, y: py });
      setStartRect({ ...props.cropRect });
      e.preventDefault();
      return;
    }
  };

  const handlePointerMove = (e: PointerEvent) => {
    if (!props.cropRect || !svgRef) return;
    const svgRect = svgRef.getBoundingClientRect();
    const px = (e.clientX - svgRect.left) / props.zoom;
    const py = (e.clientY - svgRect.top) / props.zoom;

    if (dragHandle() && dragStart() && startRect()) {
      const h = dragHandle()!;
      const start = dragStart()!;
      const base = startRect()!;
      const dx = px - start.x;
      const dy = py - start.y;
      const shift = e.shiftKey;
      const alt = e.altKey;
      const aspect = props.cropMode === "ratio" && props.cropAspect ? props.cropAspect : null;
      const newRect = applyCropResizeHandle(base, h, dx, dy, aspect, shift, alt);
      const clamped = clampCropRect(newRect, props.canvasWidth, props.canvasHeight);
      props.onCropRectChange(clamped);
      setTooltipPos({ x: e.clientX, y: e.clientY });
      return;
    }

    if (isMoving() && dragStart() && startRect()) {
      const start = dragStart()!;
      const base = startRect()!;
      const dx = px - start.x;
      const dy = py - start.y;
      const moved = applyCropMove(base, dx, dy, props.canvasWidth, props.canvasHeight);
      props.onCropRectChange(moved);
      setTooltipPos({ x: e.clientX, y: e.clientY });
      return;
    }

    // Hover state
    const hh = hitTestHandle(px, py, props.cropRect);
    setHoverHandle(hh);
  };

  const handlePointerUp = () => {
    setDragHandle(null);
    setIsMoving(false);
    setDragStart(null);
    setStartRect(null);
    // Fade tooltip after 1.5s
    setTimeout(() => setTooltipPos(null), 1500);
  };

  // Handlers on SVG root
  createEffect(() => {
    const svg = svgRef;
    if (!svg) return;
    svg.addEventListener("pointerdown", handlePointerDown);
    svg.addEventListener("pointermove", handlePointerMove);
    svg.addEventListener("pointerup", handlePointerUp);
    svg.addEventListener("pointercancel", handlePointerUp);
    onCleanup(() => {
      svg.removeEventListener("pointerdown", handlePointerDown);
      svg.removeEventListener("pointermove", handlePointerMove);
      svg.removeEventListener("pointerup", handlePointerUp);
      svg.removeEventListener("pointercancel", handlePointerUp);
    });
  });

  // Determine cursor class
  const cursorClass = () => {
    if (dragHandle()) return getHandleCursor(dragHandle()!);
    if (hoverHandle()) return getHandleCursor(hoverHandle()!);
    if (isMoving()) return "move";
    return "default";
  };

  return (
    <Show when={props.cropRect}>
      {(rect) => {
        const r = rect();
        return (
          <>
            {/* Shield mask */}
            <defs>
              <mask id="crop-shield">
                <rect x={0} y={0} width={props.canvasWidth} height={props.canvasHeight} fill="white" />
                <rect x={r.x} y={r.y} width={r.w} height={r.h} fill="black" />
              </mask>
            </defs>
            <rect
              x={0} y={0}
              width={props.canvasWidth}
              height={props.canvasHeight}
              fill="rgba(0,0,0,0.5)"
              mask="url(#crop-shield)"
            />

            {/* Crop outline with shadow */}
            <rect
              x={r.x} y={r.y}
              width={r.w} height={r.h}
              fill="none"
              stroke="white"
              stroke-width={1 / props.zoom}
              vector-effect="non-scaling-stroke"
              style={{ filter: "drop-shadow(0 0 4px rgba(0,0,0,0.5))" }}
              pointer-events="visible"
              onPointerDown={(e) => {
                // Let root SVG handlers process this
              }}
            />

            {/* Guide lines */}
            <Show when={props.guideMode === "thirds"}>
              <line x1={r.x + r.w / 3} y1={r.y} x2={r.x + r.w / 3} y2={r.y + r.h} stroke="rgba(255,255,255,0.35)" stroke-width={1 / props.zoom} vector-effect="non-scaling-stroke" />
              <line x1={r.x + 2 * r.w / 3} y1={r.y} x2={r.x + 2 * r.w / 3} y2={r.y + r.h} stroke="rgba(255,255,255,0.35)" stroke-width={1 / props.zoom} vector-effect="non-scaling-stroke" />
              <line x1={r.x} y1={r.y + r.h / 3} x2={r.x + r.w} y2={r.y + r.h / 3} stroke="rgba(255,255,255,0.35)" stroke-width={1 / props.zoom} vector-effect="non-scaling-stroke" />
              <line x1={r.x} y1={r.y + 2 * r.h / 3} x2={r.x + r.w} y2={r.y + 2 * r.h / 3} stroke="rgba(255,255,255,0.35)" stroke-width={1 / props.zoom} vector-effect="non-scaling-stroke" />
            </Show>

            <Show when={props.guideMode === "grid"}>
              <GridLines {...r} zoom={props.zoom} />
            </Show>

            <Show when={props.guideMode === "diagonal"}>
              <line x1={r.x} y1={r.y} x2={r.x + r.w} y2={r.y + r.h} stroke="rgba(255,255,255,0.2)" stroke-width={0.5 / props.zoom} vector-effect="non-scaling-stroke" />
              <line x1={r.x + r.w} y1={r.y} x2={r.x} y2={r.y + r.h} stroke="rgba(255,255,255,0.2)" stroke-width={0.5 / props.zoom} vector-effect="non-scaling-stroke" />
            </Show>

            <Show when={props.guideMode === "golden"}>
              <line x1={r.x + r.w * 0.382} y1={r.y} x2={r.x + r.w * 0.382} y2={r.y + r.h} stroke="rgba(255,255,255,0.15)" stroke-width={0.5 / props.zoom} vector-effect="non-scaling-stroke" />
              <line x1={r.x} y1={r.y + r.h * 0.382} x2={r.x + r.w} y2={r.y + r.h * 0.382} stroke="rgba(255,255,255,0.15)" stroke-width={0.5 / props.zoom} vector-effect="non-scaling-stroke" />
            </Show>

            {/* Corner brackets */}
            <path d={`M${r.x - 12 / props.zoom},${r.y - 12 / props.zoom} L${r.x - 12 / props.zoom},${r.y} L${r.x},${r.y}`} fill="none" stroke="white" stroke-width={1 / props.zoom} vector-effect="non-scaling-stroke" />
            <path d={`M${r.x + r.w + 12 / props.zoom},${r.y - 12 / props.zoom} L${r.x + r.w + 12 / props.zoom},${r.y} L${r.x + r.w},${r.y}`} fill="none" stroke="white" stroke-width={1 / props.zoom} vector-effect="non-scaling-stroke" />
            <path d={`M${r.x - 12 / props.zoom},${r.y + r.h + 12 / props.zoom} L${r.x - 12 / props.zoom},${r.y + r.h} L${r.x},${r.y + r.h}`} fill="none" stroke="white" stroke-width={1 / props.zoom} vector-effect="non-scaling-stroke" />
            <path d={`M${r.x + r.w + 12 / props.zoom},${r.y + r.h + 12 / props.zoom} L${r.x + r.w + 12 / props.zoom},${r.y + r.h} L${r.x + r.w},${r.y + r.h}`} fill="none" stroke="white" stroke-width={1 / props.zoom} vector-effect="non-scaling-stroke" />

            {/* 8 resize handles */}
            <For each={HANDLE_TYPES}>
              {(h) => {
                const pos = getHandlePosition(r, h);
                const isHover = hoverHandle() === h;
                const isActive = dragHandle() === h;
                const hs = HANDLE_SIZE / props.zoom;
                const halved = hs / 2;
                return (
                  <rect
                    x={pos.x - halved}
                    y={pos.y - halved}
                    width={hs}
                    height={hs}
                    fill={isActive ? "#E15A17" : isHover ? "rgba(255,255,255,0.7)" : "white"}
                    stroke="#333"
                    stroke-width={0.5 / props.zoom}
                    vector-effect="non-scaling-stroke"
                    style={{ cursor: getHandleCursor(h) }}
                  />
                );
              }}
            </For>

            {/* Dimension tooltip */}
            <Show when={tooltipPos() && props.cropRect}>
              <foreignObject
                x={tooltipPos()!.x / props.zoom + 16 / props.zoom}
                y={tooltipPos()!.y / props.zoom - 20 / props.zoom}
                width={140 / props.zoom}
                height={24 / props.zoom}
                style={{ pointerEvents: "none" }}
              >
                <div
                  style={{
                    background: "rgba(0,0,0,0.6)",
                    color: "white",
                    "font-size": `${9 / props.zoom}px`,
                    "font-family": "monospace",
                    padding: `${2 / props.zoom}px ${6 / props.zoom}px`,
                    "border-radius": `${3 / props.zoom}px`,
                    "white-space": "nowrap",
                    width: "fit-content",
                  }}
                >
                  {Math.round(props.cropRect.w)} × {Math.round(props.cropRect.h)} px
                </div>
              </foreignObject>
            </Show>

            {/* SVG root catches pointer events — set cursor on SVG */}
          </>
        );
      }}
    </Show>
  );
}

function GridLines(props: { x: number; y: number; w: number; h: number; zoom: number }) {
  const cellSize = Math.max(32, Math.sqrt(props.w * props.h) / 8);
  const cols = Math.ceil(props.w / cellSize);
  const rows = Math.ceil(props.h / cellSize);
  const lines: JSX.Element[] = [];

  for (let i = 1; i < cols; i++) {
    const lx = props.x + i * (props.w / cols);
    lines.push(
      <line x1={lx} y1={props.y} x2={lx} y2={props.y + props.h} stroke="rgba(255,255,255,0.2)" stroke-width={0.5 / props.zoom} vector-effect="non-scaling-stroke" />
    );
  }
  for (let i = 1; i < rows; i++) {
    const ly = props.y + i * (props.h / rows);
    lines.push(
      <line x1={props.x} y1={ly} x2={props.x + props.w} y2={ly} stroke="rgba(255,255,255,0.2)" stroke-width={0.5 / props.zoom} vector-effect="non-scaling-stroke" />
    );
  }
  return <>{lines}</>;
}
```

Note: Need to import `For` from solid-js and `JSX` from solid-js at top.

- [ ] **Step 2: Build + fix any issues**

```bash
pnpm.cmd run build
```
Expected: PASS (may need minor fixes for JSX types)

- [ ] **Step 3: Full tests**

```bash
npx vitest run
```
Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add apps/desktop/src/components/editor/CropOverlay.tsx
git commit -m "feat(crop): rewrite CropOverlay with handles, shield mask, 5 guide modes, dimension tooltip"
```

---

### Task 6: OptionBar Crop Section Rewrite

**Files:**
- Modify: `apps/desktop/src/components/editor/OptionBar.tsx`

- [ ] **Step 1: Destructure crop signals from EditorContext**

Add to existing destructure from `useEditor()` (top of component body):

```ts
const {
  cropMode, setCropMode,
  cropGuideMode, setCropGuideMode,
  cropDeletePixels, setCropDeletePixels,
  cropAspect, setCropAspect,
  cropSizeTarget, setCropSizeTarget,
  activeTool, setActiveTool,
} = useEditor();
```

And remove the local `cropW`/`cropH` signals and their createEffect — replace with reading from the engine directly via `workspace.getActiveEngine()?.getWidth()` for the display labels.

- [ ] **Step 2: Replace crop section (lines 223-238)**

Replace:

```tsx
      {/* ─── Crop options ─── */}
      <Show when={activeTool() === "crop"}>
        <div class="flex h-[26px] shrink-0 items-center gap-2.5 px-2.5">
          <span class="text-[12px] text-editor-text font-semibold uppercase text-editor-accent">Crop Canvas</span>
        </div>

        <div class="flex shrink-0 items-center gap-1.5">
          <NumField label="W" value={`${cropW()} px`} class="w-[86px]" />
          <NumField label="H" value={`${cropH()} px`} class="w-[86px]" />
        </div>

        <button onClick={handleApplyCrop} class="flex h-[26px] shrink-0 items-center rounded-[4px] bg-editor-accent text-white font-medium px-4 text-[12px] hover:bg-editor-accent/90">
          APPLY CROP
        </button>
        <button onClick={() => setActiveTool("move")} class="flex h-[26px] shrink-0 items-center rounded-[4px] border border-editor-field-border bg-editor-field px-3.5 text-[12px] text-editor-text hover:bg-white/5">
          Cancel
        </button>
      </Show>
```

With:

```tsx
      {/* ─── Crop options ─── */}
      <Show when={activeTool() === "crop"}>
        {/* Mode dropdown */}
        <div class="flex h-[24px] shrink-0 items-center gap-1 rounded-[3px] border border-editor-field-border bg-editor-field px-1.5">
          <select
            value={cropMode()}
            onChange={(e) => setCropMode(e.currentTarget.value as any)}
            class="bg-transparent text-[11px] text-editor-text outline-none"
          >
            <option value="free">Free</option>
            <option value="ratio">Ratio</option>
            <option value="size">Size</option>
          </select>
        </div>

        <Divider />

        {/* W / H fields (contextual) */}
        <Show when={cropMode() === "free"}>
          <div class="flex shrink-0 items-center gap-1">
            <NumField label="W" value={`${cropRect() ? Math.round(cropRect().w) : 0} px`} class="w-[78px]" />
            <NumField label="H" value={`${cropRect() ? Math.round(cropRect().h) : 0} px`} class="w-[78px]" />
          </div>
        </Show>

        <Show when={cropMode() === "ratio"}>
          <div class="flex shrink-0 items-center gap-1">
            <EditableNumField label="W" value={cropAspect()?.w ?? 1} onSubmit={(v) => setCropAspect({ w: v, h: cropAspect()?.h ?? 1 })} class="w-[62px]" />
            <span class="text-[11px] text-editor-text-dim">:</span>
            <EditableNumField label="H" value={cropAspect()?.h ?? 1} onSubmit={(v) => setCropAspect({ w: cropAspect()?.w ?? 1, h: v })} class="w-[62px]" />
          </div>
        </Show>

        <Show when={cropMode() === "size"}>
          <div class="flex shrink-0 items-center gap-1">
            <EditableNumField label="W" value={cropSizeTarget()?.w ?? 800} suffix="px" onSubmit={(v) => setCropSizeTarget({ w: v, h: cropSizeTarget()?.h ?? 600 })} class="w-[70px]" />
            <EditableNumField label="H" value={cropSizeTarget()?.h ?? 600} suffix="px" onSubmit={(v) => setCropSizeTarget({ w: cropSizeTarget()?.w ?? 800, h: v })} class="w-[70px]" />
          </div>
        </Show>

        {/* Swap button */}
        <button
          onClick={() => {
            const rect = cropRect();
            if (rect) {
              // Swap W and H of the crop rect
              setCropRect({ x: rect.x, y: rect.y, w: rect.h, h: rect.w });
            }
            // Also swap aspect/size targets if applicable
            if (cropAspect()) {
              setCropAspect({ w: cropAspect()!.h, h: cropAspect()!.w });
            }
            if (cropSizeTarget()) {
              setCropSizeTarget({ w: cropSizeTarget()!.h, h: cropSizeTarget()!.w });
            }
          }}
          class="flex h-[24px] shrink-0 items-center rounded-[3px] border border-transparent px-1 text-[11px] text-editor-text-dim hover:border-editor-field-border hover:text-editor-text"
          aria-label="Swap width and height"
        >
          ↔
        </button>

        <Divider />

        {/* Guide dropdown */}
        <div class="flex h-[24px] shrink-0 items-center gap-1 rounded-[3px] border border-editor-field-border bg-editor-field px-1.5">
          <select
            value={cropGuideMode()}
            onChange={(e) => setCropGuideMode(e.currentTarget.value as any)}
            class="bg-transparent text-[11px] text-editor-text outline-none"
          >
            <option value="none">None</option>
            <option value="thirds">Thirds</option>
            <option value="grid">Grid</option>
            <option value="diagonal">Diagonal</option>
            <option value="golden">Golden</option>
          </select>
        </div>

        <Divider />

        {/* Delete cropped pixels toggle */}
        <ToggleBtn
          active={cropDeletePixels()}
          onChange={setCropDeletePixels}
          icon="trash"
          label="Delete"
        />

        <Divider />

        {/* Reset */}
        <button
          onClick={() => {
            const engine = workspace.getActiveEngine();
            if (engine) {
              setCropRect({ x: 0, y: 0, w: engine.getWidth(), h: engine.getHeight() });
            }
          }}
          class="flex h-[24px] shrink-0 items-center rounded-[3px] border border-transparent px-2 text-[11px] text-editor-text-dim hover:border-editor-field-border hover:text-editor-text"
        >
          Reset
        </button>

        {/* Cancel */}
        <button
          onClick={() => {
            setCropRect(null);
            setActiveTool("move");
          }}
          class="flex h-[24px] shrink-0 items-center rounded-[3px] border border-editor-field-border bg-editor-field px-2 text-[11px] text-editor-text hover:bg-white/5"
        >
          Cancel
        </button>

        {/* Apply */}
        <button
          onClick={() => {
            const engine = workspace.getActiveEngine();
            const rect = cropRect();
            if (engine && rect) {
              const history = workspace.getActiveHistory();
              history?.commit(engine.snapshot());
              engine.cropCanvas(rect.x, rect.y, rect.w, rect.h);
              scheduler.requestRender();
              setCropRect(null);
              setActiveTool("move");
            }
          }}
          class="flex h-[26px] shrink-0 items-center rounded-[4px] bg-editor-accent text-white font-medium px-4 text-[12px] hover:bg-editor-accent/90"
        >
          APPLY
        </button>
      </Show>
```

- [ ] **Step 3: Remove old cropW/cropH signals and handleApplyCrop**

Delete lines 101-122 (cropW/cropH signals, createEffect, handleApplyCrop).

- [ ] **Step 4: Add imports for cropRect from CanvasViewport**

The OptionBar needs access to `cropRect()`. Since `OptionBar` doesn't have access to `cropRect` signal defined in `CanvasViewport`, we need to expose it through `EditorContext`.

Add `cropRect` to EditorContext:

```ts
// In EditorContext.tsx interface:
cropRect: Accessor<CropRect | null>;
setCropRect: Setter<CropRect | null>;
// Signal declaration:
const [cropRect, setCropRect] = createSignal<CropRect | null>(null);
```

This ensures OptionBar and CanvasViewport share the same `cropRect` signal through context.

- [ ] **Step 5: Build + test**

```bash
pnpm.cmd run build
npx vitest run
```
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add apps/desktop/src/components/editor/OptionBar.tsx apps/desktop/src/components/editor/EditorContext.tsx
git commit -m "feat(crop): add interactive crop Option Bar with mode/guide/delete controls"
```

---

## Self-Review Checklist

- [ ] **Spec coverage:** Does every spec requirement have a corresponding task?
  - State model (cropRect, cropMode, cropAspect, etc.): Task 1 + Task 4
  - Crop box handles + resize: Task 5
  - Move inside box: Task 5
  - Shield with cutout: Task 5
  - Guide lines (5 modes): Task 5
  - Enter apply / Esc cancel: Task 4 keyboard handler + Task 6 apply/cancel buttons
  - Option Bar controls: Task 6
  - Keyboard shortcuts: Task 4
  - cropGeometry helpers: Task 2
  - input-handler pointer-up: Task 3
  - Tests: Task 2 (10 geometry tests) + coverage in Task 4/5/6

- [ ] **Placeholder scan:** No TBDs, TODOs, or "implement later" in code blocks.

- [ ] **Type consistency:** `CropRect` interface used consistently (defined in cropGeometry.ts, used by CropOverlay, EditorContext, and input-handler). `cropMode` is `"free" | "ratio" | "size"` everywhere. `cropGuideMode` is `"none" | "thirds" | "grid" | "diagonal" | "golden"` everywhere.

---

## Execution Handoff

Plan complete and saved to `docs/superpowers/plans/2026-06-02-crop-tool-enhanced.md`.

**Two execution options:**

**1. Subagent-Driven (recommended)** — I dispatch a fresh subagent per task, review between tasks, fast iteration

**2. Inline Execution** — Execute tasks in this session using executing-plans, batch execution with checkpoints

**Which approach?**
