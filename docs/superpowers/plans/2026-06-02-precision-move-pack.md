# Precision Move Pack Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Improve Move Tool with keyboard nudge, canvas auto-select, transform HUD, and snap feedback — all frontend-only.

**Architecture:** Pure helpers in `viewport/layerHitTest.ts`, new `TransformHud` SVG overlay component, wiring in `CanvasViewport.tsx`. No Rust/core changes.

**Tech Stack:** SolidJS + TypeScript, SVG overlay, existing `transformGeometry.ts` + `DocumentEngine`.

---

### Task 1: layerHitTest pure helper + tests

**Files:**
- Create: `apps/desktop/src/viewport/layerHitTest.ts`
- Create: `apps/desktop/src/__tests__/layer-hit-test.test.ts`

- [ ] **Step 1: Write the helper**

```ts
import { getLayerCorners } from "./transformGeometry";
import type { Transform2D } from "../engine/types";

export interface LayerHit {
  id: string;
}

function pointInPolygon(px: number, py: number, corners: { x: number; y: number }[]): boolean {
  let inside = false;
  const n = corners.length;
  for (let i = 0, j = n - 1; i < n; j = i++) {
    const xi = corners[i].x, yi = corners[i].y;
    const xj = corners[j].x, yj = corners[j].y;
    if ((yi > py) !== (yj > py) && px < ((xj - xi) * (py - yi)) / (yj - yi) + xi) {
      inside = !inside;
    }
  }
  return inside;
}

export interface LayerInfo {
  id: string;
  transform: Transform2D;
  width: number;
  height: number;
  visible: boolean;
  locked: boolean;
}

export function hitTestLayer(
  point: { x: number; y: number },
  layer: LayerInfo
): boolean {
  if (!layer.visible) return false;
  const corners = getLayerCorners(layer.transform, layer.width, layer.height);
  return pointInPolygon(point.x, point.y, corners);
}

export function hitTestLayers(
  point: { x: number; y: number },
  layers: LayerInfo[]
): LayerHit | null {
  for (const layer of layers) {
    if (!layer.visible) continue;
    const corners = getLayerCorners(layer.transform, layer.width, layer.height);
    if (pointInPolygon(point.x, point.y, corners)) {
      return { id: layer.id };
    }
  }
  return null;
}
```

- [ ] **Step 2: Write the tests**

```ts
import { describe, it, expect } from "vitest";
import { hitTestLayers, hitTestLayer, type LayerInfo } from "../viewport/layerHitTest";

function makeLayer(overrides: Partial<LayerInfo> = {}): LayerInfo {
  return {
    id: "layer-1",
    visible: true,
    locked: false,
    transform: { x: 100, y: 100, scaleX: 1, scaleY: 1, rotation: 0, flipH: false, flipV: false },
    width: 200,
    height: 100,
    ...overrides,
  };
}

describe("hitTestLayer", () => {
  it("returns true for point inside unrotated rect", () => {
    expect(hitTestLayer({ x: 150, y: 150 }, makeLayer())).toBe(true);
  });

  it("returns false for point outside rect", () => {
    expect(hitTestLayer({ x: 50, y: 50 }, makeLayer())).toBe(false);
  });

  it("returns true for point inside rotated layer", () => {
    const layer = makeLayer({ transform: { ...makeLayer().transform, rotation: 45 } });
    const inside = hitTestLayer({ x: 200, y: 150 }, layer);
    expect(inside).toBe(true);
  });

  it("returns false for hidden layer", () => {
    expect(hitTestLayer({ x: 150, y: 150 }, makeLayer({ visible: false }))).toBe(false);
  });

  it("returns false for point in the gap of a rotated rect", () => {
    // Rotate 45°, hit a point inside AABB but outside rotated bounds
    const layer = makeLayer({ transform: { ...makeLayer().transform, rotation: 45 } });
    const inside = hitTestLayer({ x: 250, y: 120 }, layer);
    expect(inside).toBe(false);
  });
});

describe("hitTestLayers", () => {
  it("returns topmost matching layer", () => {
    const top = makeLayer({ id: "top", x: 0, y: 0, transform: { x: 0, y: 0, scaleX: 1, scaleY: 1, rotation: 0, flipH: false, flipV: false } });
    const bottom = makeLayer({ id: "bottom", x: 100, y: 100, transform: { x: 100, y: 100, scaleX: 1, scaleY: 1, rotation: 0, flipH: false, flipV: false } });
    const layers = [top, bottom]; // top is first (z-order front)
    const result = hitTestLayers({ x: 50, y: 50 }, layers);
    expect(result?.id).toBe("top");
  });

  it("skips hidden layers", () => {
    const hidden = makeLayer({ id: "hidden", visible: false, transform: { x: 0, y: 0, scaleX: 1, scaleY: 1, rotation: 0, flipH: false, flipV: false } });
    const visible = makeLayer({ id: "visible", transform: { x: 0, y: 0, scaleX: 1, scaleY: 1, rotation: 0, flipH: false, flipV: false } });
    const result = hitTestLayers({ x: 50, y: 50 }, [hidden, visible]);
    expect(result?.id).toBe("visible");
  });

  it("returns null when no layer is hit", () => {
    expect(hitTestLayers({ x: 999, y: 999 }, [makeLayer()])).toBeNull();
  });
});
```

- [ ] **Step 3: Run tests**

```bash
npx vitest run layer-hit-test -v
```
Expected: 10/10 PASS

- [ ] **Step 4: Commit**

```bash
git add apps/desktop/src/viewport/layerHitTest.ts apps/desktop/src/__tests__/layer-hit-test.test.ts
git commit -m "feat: add layerHitTest helper for canvas auto-select"
```

---

### Task 2: Canvas auto-select in CanvasViewport

**Files:**
- Modify: `apps/desktop/src/components/editor/CanvasViewport.tsx`

- [ ] **Step 1: Add import at top of file**

After existing `import { getLayerAabb } from "@/viewport/transformGeometry"`:
```ts
import { hitTestLayers } from "@/viewport/layerHitTest";
import type { LayerInfo } from "@/viewport/layerHitTest";
```

- [ ] **Step 2: Add auto-select logic in `onCanvasPointerDown`**

Find the section:
```ts
const onCanvasPointerDown = (e: PointerEvent) => {
    if (isSpacePressed() || e.button === 1) return;
    // ... existing code
    prepareToolContext();
    // ...
    handlePointerDown(...)
```

Insert auto-select before `prepareToolContext()`:
```ts
  const onCanvasPointerDown = (e: PointerEvent) => {
    if (isSpacePressed() || e.button === 1) return;

    stopMomentum();
    const engine = workspace.getActiveEngine();
    const history = workspace.getActiveHistory();
    if (!engine || !history) return;

    // Auto-select layer under cursor for Move Tool
    if (activeTool() === "move") {
      const coords = getDocCoords(e);
      const allLayers = engine.getLayers();
      const hit = hitTestLayers(coords, allLayers as LayerInfo[]);
      if (hit && hit.id !== engine.getActiveLayerId()) {
        engine.setActiveLayer(hit.id);
        scheduler.requestRender();
      }
    }

    prepareToolContext();
    setSnapLines([]);
    canvasRef.setPointerCapture(e.pointerId);

    const coords = getDocCoords(e);
    handlePointerDown(
      activeTool() as ToolType,
      coords.x,
      coords.y,
      engine,
      history,
      () => scheduler.requestRender(),
      interactiveState,
    );
  };
```

Note: if `hit.id` equals the already-active layer, we skip `setActiveLayer` to avoid unnecessary reactivity. If no layer is hit, we leave current selection unchanged.

- [ ] **Step 3: Run existing tests + build**

```bash
npx vitest run -v
pnpm.cmd run build
```

Expected: All existing tests pass. Build succeeds.

- [ ] **Step 4: Commit**

```bash
git add apps/desktop/src/components/editor/CanvasViewport.tsx
git commit -m "feat: add canvas auto-select for Move Tool"
```

---

### Task 3: Keyboard nudge

**Files:**
- Modify: `apps/desktop/src/components/editor/CanvasViewport.tsx`

- [ ] **Step 1: Add nudge handler in the global `handleKeyDown`**

Find the section after spacebar handling and before zoom shortcuts:
```ts
      // Spacebar panning toggle
      if (e.code === "Space") {
        e.preventDefault();
        stopMomentum();
        if (!isSpacePressed()) {
          setIsSpacePressed(true);
        }
        return;
      }

      // Zoom Shortcuts: Ctrl + Plus / Equal
```

Insert nudge handler between them:
```ts
      // Keyboard nudge for Move Tool: Arrow = 1px, Shift+Arrow = 10px
      if (activeTool() === "move" && (e.key.startsWith("Arrow"))) {
        const activeId = engine.getActiveLayerId();
        if (!activeId) return;
        const layer = engine.getLayer(activeId);
        if (!layer || layer.locked) return;

        e.preventDefault();
        const step = e.shiftKey ? 10 : 1;
        let dx = 0, dy = 0;
        if (e.key === "ArrowUp") dy = -step;
        else if (e.key === "ArrowDown") dy = step;
        else if (e.key === "ArrowLeft") dx = -step;
        else if (e.key === "ArrowRight") dx = step;

        if (!e.repeat) {
          history.commit(engine.snapshot());
        }
        engine.moveLayer(activeId, layer.transform.x + dx, layer.transform.y + dy);
        scheduler.requestRender();
        return;
      }
```

Note: The nudge returns early (no fallthrough to other handlers), only commits history on initial keydown (not repeat), and checks Move Tool active + unlocked layer.

- [ ] **Step 2: Add `history` ref in onMount closure**

The `handleKeyDown` closure needs `history`. Looking at the existing code:
```ts
const history = workspace.getActiveHistory();
```
It's already available inside `onCanvasPointerDown` via `workspace.getActiveHistory()`. But in the `onMount` keydown listener, `history` is not captured. We need to add it.

Find in onMount:
```ts
    const handleKeyDown = (e: KeyboardEvent) => {
      const active = document.activeElement;
```

Add after `const engine = workspace.getActiveEngine();`:
```ts
      const engine = workspace.getActiveEngine();
      if (!engine) return;
      const history = workspace.getActiveHistory();
      if (!history) return;
```

- [ ] **Step 3: Run existing tests + build**

```bash
npx vitest run -v
pnpm.cmd run build
```

Expected: All existing tests pass. Build succeeds.

- [ ] **Step 4: Commit**

```bash
git add apps/desktop/src/components/editor/CanvasViewport.tsx
git commit -m "feat: add keyboard nudge for Move Tool (Arrow=1px, Shift+Arrow=10px)"
```

---

### Task 4: Transform HUD + snap feedback

**Files:**
- Create: `apps/desktop/src/components/editor/TransformHud.tsx`
- Modify: `apps/desktop/src/components/editor/SelectionTransformOverlay.tsx`
- Modify: `apps/desktop/src/components/editor/CanvasViewport.tsx`

- [ ] **Step 1: Create TransformHud component**

```tsx
import { Show } from "solid-js";

export type HudMode = "move" | "resize" | "rotate";

interface TransformHudProps {
  mode: HudMode;
  cursorX: number;  // cursor document-space x
  cursorY: number;  // cursor document-space y
  zoom: number;
  // Move mode
  deltaX?: number;
  deltaY?: number;
  // Resize mode
  width?: number;
  height?: number;
  scalePercent?: number;
  // Rotate mode
  angle?: number;
  // Snap
  snapActive?: boolean;
}

export function TransformHud(props: TransformHudProps) {
  const label = () => {
    switch (props.mode) {
      case "move": {
        let s = `ΔX ${Math.round(props.deltaX ?? 0)}  ΔY ${Math.round(props.deltaY ?? 0)}`;
        if (props.snapActive) s += "  snap";
        return s;
      }
      case "resize": {
        let s = `W ${Math.round(props.width ?? 0)}  H ${Math.round(props.height ?? 0)}  ${Math.round(props.scalePercent ?? 100)}%`;
        if (props.snapActive) s += "  snap";
        return s;
      }
      case "rotate": {
        let s = `${Math.round(props.angle ?? 0)}°`;
        if (props.snapActive) s += "  snap";
        return s;
      }
      default:
        return "";
    }
  };

  // Clamp to viewport using viewport coords: convert document cursor to screen then offset
  // We render in document-space SVG, so position relative to cursor with an offset
  const padX = 16;  // px offset right of cursor
  const padY = 24;  // px offset down from cursor

  return (
    <Show when={label().length > 0}>
      <g transform={`translate(${props.cursorX + padX / props.zoom}, ${props.cursorY + padY / props.zoom})`}>
        <rect
          x={0}
          y={0}
          width={label().length * 6.5 + 16}
          height={20}
          rx={4}
          fill="rgba(20,20,20,0.85)"
          stroke="rgba(255,255,255,0.08)"
          stroke-width={1 / props.zoom}
        />
        <text
          x={8}
          y={14}
          fill="#E15A17"
          font-size={12}
          font-weight="bold"
          text-anchor="start"
          style={{ "user-select": "none", "font-family": "monospace", "pointer-events": "none" }}
        >
          {label()}
        </text>
      </g>
    </Show>
  );
}
```

- [ ] **Step 2: Wire HUD state in SelectionTransformOverlay**

Add HUD state exposure in `SelectionTransformOverlay.tsx`. First, add a `hudInfo` callback prop:

```ts
interface SelectionTransformOverlayProps {
  isNavigationMode?: boolean;
  onHudUpdate?: (hud: { mode: string; deltaX: number; deltaY: number; width: number; height: number; scalePercent: number; angle: number; snapActive: boolean } | null) => void;
}
```

In `handlePointerMove`, emit HUD updates:

After the existing code in `handlePointerMove`:
```ts
const handlePointerMove = (e: PointerEvent) => {
    const drag = dragState();
    if (!drag) return;

    const engine = workspace.getActiveEngine();
    const layer = getLayer();
    if (!engine || !layer) return;

    const z = zoom();
    const dx = (e.clientX - drag.startX) / z;
    const dy = (e.clientY - drag.startY) / z;

    const cent = getLayerCenter(drag.startTransform, layer.width, layer.height);

    if (drag.type === "move") {
      engine.transformLayer(layer.id, {
        x: drag.startTransform.x + dx,
        y: drag.startTransform.y + dy,
      });
      props.onHudUpdate?.({
        mode: "move",
        deltaX: dx,
        deltaY: dy,
        width: 0, height: 0, scalePercent: 0, angle: 0, snapActive: false,
      });
    } else if (drag.type === "rotate") {
      const newRot = applyRotationDrag(
        cent,
        { x: drag.startX / z, y: drag.startY / z },
        { x: e.clientX / z, y: e.clientY / z },
        drag.startTransform.rotation,
        e.shiftKey
      );
      engine.transformLayer(layer.id, { rotation: newRot });
      props.onHudUpdate?.({
        mode: "rotate",
        angle: newRot - drag.startTransform.rotation,
        deltaX: 0, deltaY: 0, width: 0, height: 0, scalePercent: 0, snapActive: false,
      });
    } else {
      const newTransform = applyResizeHandle(
        drag.startTransform,
        layer.width,
        layer.height,
        drag.type,
        dx,
        dy,
        e.shiftKey,
        e.altKey
      );
      engine.transformLayer(layer.id, newTransform);
      const effW = layer.width * Math.abs(newTransform.scaleX);
      const effH = layer.height * Math.abs(newTransform.scaleY);
      props.onHudUpdate?.({
        mode: "resize",
        width: effW,
        height: effH,
        scalePercent: Math.abs(newTransform.scaleX) * 100,
        deltaX: 0, deltaY: 0, angle: 0,
        snapActive: false,
      });
    }
    scheduler.requestRender();
  };
```

Add `props.onHudUpdate?.(null)` in `handlePointerUp` (after setDragState(null)).

- [ ] **Step 3: Wire HUD in CanvasViewport**

In `CanvasViewport.tsx`:
- Import `TransformHud`
- Add state: `const [hudInfo, setHudInfo] = createSignal<... | null>(null);`
- Pass `onHudUpdate={setHudInfo}` to `SelectionTransformOverlay`
- Render `TransformHud` inside the document-space SVG (near `SmartGuides`)

- [ ] **Step 4: Run existing tests + build**

```bash
npx vitest run -v
pnpm.cmd run build
```

Expected: All existing tests pass. Build succeeds.

- [ ] **Step 5: Commit**

```bash
git add apps/desktop/src/components/editor/TransformHud.tsx apps/desktop/src/components/editor/SelectionTransformOverlay.tsx apps/desktop/src/components/editor/CanvasViewport.tsx
git commit -m "feat: add transform HUD with snap feedback"
```

---

### Task 5: Verification + docs

- [ ] **Step 1: Full test + build verification**

```bash
npx vitest run -v
pnpm.cmd run build
```

Expected: All tests pass (134+ frontend), build succeeds.

- [ ] **Step 2: Core regression**

```bash
cargo test -p photrez-core
```

Expected: 85/85 PASS.

- [ ] **Step 3: Update docs**

`docs/AI_CURRENT_TASK.md` — mark Precision Move Pack as COMPLETE.

`docs/AI_HISTORY.md` — append entry for FEATURE / VIEWPORT / MOVE TOOL.

`docs/FEATURES.md` — update frontend test count if changed.

- [ ] **Step 4: Final commit**

```bash
git add docs/
git commit -m "docs: update task history for Precision Move Pack"
```
