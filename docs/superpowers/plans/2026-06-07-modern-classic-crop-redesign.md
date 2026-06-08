# Modern and Classic Crop Redesign impl Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebuild Photrez Crop Tool interaction so Modern and Classic are truly different: Modern uses a fixed viewport-centered crop frame with the image moving underneath, while Classic keeps the existing document-space movable crop box.

**Architecture:** Split crop interaction by coordinate system. Modern crop frame lives in viewport/screen coordinates and never uses `cropRect.x/y` as its visual position. Classic crop stays in document coordinates and continues to use `cropRect`/`cropRotation`.

**Tech Stack:** SolidJS signals/components, TypeScript, WebGL2 viewport rendering, existing `DocumentEngine.applyCrop`, Vitest component/unit tests.

## Design Contract

### Modern Crop

- Crop frame is always centered in the viewport.
- Frame position does not change during drag, rotate, resize, aspect preset changes, zoom, or pan.
- Drag inside frame moves the image/document underneath the fixed frame.
- Resize handles change only frame `w/h`; the frame center remains the viewport center.
- Rotate changes image rotation under the fixed frame. The frame remains axis-aligned and centered.
- Modern frame lives in viewport/screen coordinates, not document coordinates.
- Modern must not use `cropRect.x/y` as the primary visual frame position.

### Classic Crop

- Image stays visually fixed unless the user explicitly pans the viewport.
- Crop box lives in document coordinates.
- Crop box can move, resize, and rotate anywhere.
- Existing `cropRect`/`cropRotation` behavior remains the base implementation.

## Data Model

### Keep Existing State

- `cropInteractionMode: "modern" | "classic"`
- `cropRect: { x, y, w, h } | null`
- `cropRotation: number`
- `cropMode: "free" | "ratio" | "size"`
- `cropAspect`
- `cropSizeTarget`
- `cropGuideMode`
- `cropDeletePixels`
- `hiddenCropPreview`

### Add Modern-Specific State

Create `apps/desktop/src/components/editor/modernCropState.ts`:

```ts
import { createSignal } from "solid-js";

export interface ModernCropFrame {
  w: number;
  h: number;
}

export interface ModernCropImageTransform {
  offsetX: number;
  offsetY: number;
  rotation: number;
  scale: number;
}

export function createModernCropState() {
  const [modernCropFrame, setModernCropFrame] =
    createSignal<ModernCropFrame | null>(null);
  const [modernCropImageTransform, setModernCropImageTransform] =
    createSignal<ModernCropImageTransform>({
      offsetX: 0,
      offsetY: 0,
      rotation: 0,
      scale: 1,
    });

  const resetModernCrop = () => {
    setModernCropFrame(null);
    setModernCropImageTransform({
      offsetX: 0,
      offsetY: 0,
      rotation: 0,
      scale: 1,
    });
  };

  return {
    modernCropFrame,
    setModernCropFrame,
    modernCropImageTransform,
    setModernCropImageTransform,
    resetModernCrop,
  };
}
```

Expose these in `EditorContext.tsx`:

```ts
modernCropFrame: Accessor<ModernCropFrame | null>;
setModernCropFrame: Setter<ModernCropFrame | null>;
modernCropImageTransform: Accessor<ModernCropImageTransform>;
setModernCropImageTransform: Setter<ModernCropImageTransform>;
resetModernCrop: () => void;
```

## Render Layer Split

### Current Problem

`CropOverlay` is currently rendered inside the document transform container:

```tsx
<div style={{ transform: `translate3d(${pan().x}px, ${pan().y}px, 0) scale(${zoom()})` }}>
  <canvas />
  <svg>document-space overlays</svg>
  <CropOverlay />
</div>
```

This is correct for Classic but wrong for Modern. Anything inside this container moves with the document, so it cannot be a fixed viewport-centered crop frame.

### New Structure

In `CanvasViewport.tsx`, render two crop overlay paths:

```tsx
<Show when={activeTool() === "crop" && cropInteractionMode() === "classic" && cropRect()}>
  <ClassicCropOverlay ... />
</Show>

<Show when={activeTool() === "crop" && cropInteractionMode() === "modern" && modernCropFrame()}>
  <ModernCropOverlay ... />
</Show>
```

`ClassicCropOverlay` stays inside the document transform container.

`ModernCropOverlay` must render as a direct child of `#canvas-container`, outside the document transform container:

```tsx
<div id="canvas-container">
  <div data-document-transform>
    <canvas />
    <svg data-document-overlays />
    <ClassicCropOverlay />
  </div>

  <ModernCropOverlay />
</div>
```

This makes Modern frame fixed to viewport coordinates.

## Gesture Behavior

### Modern

| Gesture | Behavior | State Changed |
| --- | --- | --- |
| Enter Crop | Create centered `modernCropFrame` sized to viewport/document fit | `modernCropFrame`, reset image transform |
| Drag inside frame | Move image/document under frame | `modernCropImageTransform.offsetX/Y` or viewport pan |
| Resize corner/edge | Resize frame from center | `modernCropFrame.w/h` |
| Aspect preset | Recompute frame `w/h` from center | `modernCropFrame` |
| Rotate drag / angle field | Rotate image under frame | `modernCropImageTransform.rotation` |
| Double-click inside | Apply crop | engine mutation |
| Reset | Recenter image transform and frame | modern state reset |
| Cancel | Clear Modern crop session | modern state reset, active tool behavior unchanged per existing UX |

### Classic

| Gesture | Behavior | State Changed |
| --- | --- | --- |
| Enter Crop | Preserve current behavior | `cropRect` as existing |
| Pasteboard drag | Create replacement crop rect | `cropRect` |
| Drag inside rect | Move crop box over static image | `cropRect.x/y` |
| Resize corner/edge | Resize crop box | `cropRect` |
| Rotate drag / angle field | Rotate crop box | `cropRotation` |
| Double-click inside | Apply crop | engine mutation |
| Reset | Full-canvas crop rect | `cropRect`, `cropRotation` |
| Cancel | Clear crop session | existing crop state |

## Modern Apply Crop Math

Modern apply must convert a fixed viewport frame into document coordinates.

Inputs:

```ts
type ViewportState = {
  panX: number;
  panY: number;
  zoom: number;
};

type ModernCropFrameScreen = {
  x: number;
  y: number;
  w: number;
  h: number;
};

type ModernCropImageTransform = {
  offsetX: number;
  offsetY: number;
  rotation: number;
  scale: number;
};
```

For the first implementation, do not add `scale` interactions. Keep `scale = 1` but include it in the type so future zoom-to-fill is straightforward.

Create `apps/desktop/src/viewport/modernCropGeometry.ts`:

```ts
export interface ModernCropFrame {
  w: number;
  h: number;
}

export interface ModernCropImageTransform {
  offsetX: number;
  offsetY: number;
  rotation: number;
  scale: number;
}

export interface ModernCropViewport {
  width: number;
  height: number;
  panX: number;
  panY: number;
  zoom: number;
}

export function getModernCropFrameScreenRect(
  frame: ModernCropFrame,
  viewportWidth: number,
  viewportHeight: number,
) {
  return {
    x: (viewportWidth - frame.w) / 2,
    y: (viewportHeight - frame.h) / 2,
    w: frame.w,
    h: frame.h,
  };
}

export function screenPointToModernDocumentPoint(
  screen: { x: number; y: number },
  viewport: ModernCropViewport,
  transform: ModernCropImageTransform,
) {
  const docX = (screen.x - viewport.panX - transform.offsetX) / viewport.zoom;
  const docY = (screen.y - viewport.panY - transform.offsetY) / viewport.zoom;

  if (transform.rotation === 0 && transform.scale === 1) {
    return { x: docX, y: docY };
  }

  const cx = viewport.width / 2;
  const cy = viewport.height / 2;
  const rad = -transform.rotation * Math.PI / 180;
  const translatedX = screen.x - cx;
  const translatedY = screen.y - cy;
  const rotatedX = translatedX * Math.cos(rad) - translatedY * Math.sin(rad);
  const rotatedY = translatedX * Math.sin(rad) + translatedY * Math.cos(rad);

  return {
    x: (cx + rotatedX / transform.scale - viewport.panX - transform.offsetX) / viewport.zoom,
    y: (cy + rotatedY / transform.scale - viewport.panY - transform.offsetY) / viewport.zoom,
  };
}

export function modernFrameToCropRect(params: {
  frame: ModernCropFrame;
  viewport: ModernCropViewport;
  transform: ModernCropImageTransform;
}) {
  const screenRect = getModernCropFrameScreenRect(
    params.frame,
    params.viewport.width,
    params.viewport.height,
  );

  const topLeft = screenPointToModernDocumentPoint(
    { x: screenRect.x, y: screenRect.y },
    params.viewport,
    params.transform,
  );

  const bottomRight = screenPointToModernDocumentPoint(
    { x: screenRect.x + screenRect.w, y: screenRect.y + screenRect.h },
    params.viewport,
    params.transform,
  );

  return {
    x: Math.min(topLeft.x, bottomRight.x),
    y: Math.min(topLeft.y, bottomRight.y),
    w: Math.abs(bottomRight.x - topLeft.x),
    h: Math.abs(bottomRight.y - topLeft.y),
  };
}
```

Important implementation rule:

- Phase 1 supports `rotation = 0` apply accurately.
- Phase 2 supports rotated apply by passing `rotation` into existing `engine.applyCrop(..., { rotation })`.
- If the current crop engine cannot perfectly represent viewport-centered rotation, keep Modern rotation preview behind a guard until apply parity is proven by tests.

## Migration From Current Implementation

Remove the failed half-modern model:

- Stop applying CSS transform directly to `canvasRef.style.transform` for crop content offset.
- Keep `cropContentOffset` only as a temporary migration field or delete it after all references are removed.
- Remove `isModernMode` branches from `useCropOverlayDrag.ts` once `ModernCropOverlay` owns its own interaction.
- Keep `CropOverlay.tsx` as `ClassicCropOverlay.tsx` or wrap it as the Classic path.
- Move Modern behavior into new files instead of expanding `CropOverlay.tsx`.

## File Structure

Create:

- `apps/desktop/src/components/editor/modernCropState.ts`
- `apps/desktop/src/components/editor/ModernCropOverlay.tsx`
- `apps/desktop/src/components/editor/useModernCropInteraction.ts`
- `apps/desktop/src/viewport/modernCropGeometry.ts`
- `apps/desktop/src/components/editor/__tests__/ModernCropOverlay.test.tsx`
- `apps/desktop/src/__tests__/modern-crop-geometry.test.ts`

Modify:

- `apps/desktop/src/components/editor/EditorContext.tsx`
- `apps/desktop/src/components/editor/CanvasViewport.tsx`
- `apps/desktop/src/components/editor/CropOptionBar.tsx`
- `apps/desktop/src/components/editor/cropToolActions.ts`
- `apps/desktop/src/components/editor/CropOverlay.tsx` or rename/classic wrapper
- `apps/desktop/src/components/editor/useCropOverlayDrag.ts`
- `apps/desktop/src/components/editor/__tests__/CropOverlay.test.tsx`
- `apps/desktop/src/components/editor/__tests__/CanvasViewport.test.tsx`
- `docs/AI_CURRENT_TASK.md`
- `docs/AI_HISTORY.md`
- `docs/FEATURES.md`
- `docs/01-id-decision-log.md`

## Task 1: Lock Modern Geometry Helpers

- Create: `apps/desktop/src/viewport/modernCropGeometry.ts`
- Create: `apps/desktop/src/__tests__/modern-crop-geometry.test.ts`

- [ ] Write failing tests for centered frame:

```ts
import { describe, expect, it } from "vitest";
import {
  getModernCropFrameScreenRect,
  modernFrameToCropRect,
} from "../viewport/modernCropGeometry";

describe("modern crop geometry", () => {
  it("centers the frame in viewport coordinates", () => {
    expect(getModernCropFrameScreenRect({ w: 400, h: 300 }, 1200, 800))
      .toEqual({ x: 400, y: 250, w: 400, h: 300 });
  });

  it("maps centered screen frame to document crop rect with pan and zoom", () => {
    const rect = modernFrameToCropRect({
      frame: { w: 400, h: 300 },
      viewport: { width: 1200, height: 800, panX: 100, panY: 50, zoom: 2 },
      transform: { offsetX: 0, offsetY: 0, rotation: 0, scale: 1 },
    });

    expect(rect.x).toBeCloseTo(150);
    expect(rect.y).toBeCloseTo(100);
    expect(rect.w).toBeCloseTo(200);
    expect(rect.h).toBeCloseTo(150);
  });

  it("includes image offset when mapping to document crop rect", () => {
    const rect = modernFrameToCropRect({
      frame: { w: 400, h: 300 },
      viewport: { width: 1200, height: 800, panX: 100, panY: 50, zoom: 2 },
      transform: { offsetX: 40, offsetY: -20, rotation: 0, scale: 1 },
    });

    expect(rect.x).toBeCloseTo(130);
    expect(rect.y).toBeCloseTo(110);
  });
});
```

- [ ] Run:

```powershell
pnpm.cmd --filter photrez-desktop test -- apps/desktop/src/__tests__/modern-crop-geometry.test.ts --run --pool=threads --maxWorkers=1
```

Expected: tests fail because file does not exist.

- [ ] Implement `modernCropGeometry.ts` with the functions in the Apply Crop Math section.
- [ ] Run the same test command.

Expected: new tests pass.

## Task 2: Add Modern Crop State

- Create: `apps/desktop/src/components/editor/modernCropState.ts`
- Modify: `apps/desktop/src/components/editor/EditorContext.tsx`

- [ ] Write `modernCropState.ts` exactly as defined in the Data Model section.
- [ ] Update `EditorContextValue` imports:

```ts
import {
  createModernCropState,
  type ModernCropFrame,
  type ModernCropImageTransform,
} from "./modernCropState";
```

- [ ] Add context fields:

```ts
modernCropFrame: Accessor<ModernCropFrame | null>;
setModernCropFrame: Setter<ModernCropFrame | null>;
modernCropImageTransform: Accessor<ModernCropImageTransform>;
setModernCropImageTransform: Setter<ModernCropImageTransform>;
resetModernCrop: () => void;
```

- [ ] In `EditorProvider`, instantiate:

```ts
const modernCropState = createModernCropState();
```

- [ ] Include it in context value after `cropState`:

```ts
...cropState,
...modernCropState,
```

- [ ] Run:

```powershell
pnpm.cmd run build
```

Expected: TypeScript compile passes.

## Task 3: Create ModernCropOverlay

- Create: `apps/desktop/src/components/editor/ModernCropOverlay.tsx`
- Create: `apps/desktop/src/components/editor/__tests__/ModernCropOverlay.test.tsx`

- [ ] Write failing tests:

```tsx
import { describe, expect, it, vi } from "vitest";
import { render } from "solid-js/web";
import { ModernCropOverlay } from "../ModernCropOverlay";

describe("ModernCropOverlay", () => {
  it("renders frame centered in viewport coordinates", () => {
    const container = document.createElement("div");
    document.body.appendChild(container);

    const dispose = render(() => (
      <ModernCropOverlay
        viewportWidth={1200}
        viewportHeight={800}
        frame={{ w: 400, h: 300 }}
        guideMode="thirds"
        zoom={1}
        onFrameChange={vi.fn()}
        onImageTransformChange={vi.fn()}
        imageTransform={{ offsetX: 0, offsetY: 0, rotation: 0, scale: 1 }}
        onApplyCrop={vi.fn()}
      />
    ), container);

    const frame = container.querySelector("[data-modern-crop-frame]");
    expect(frame?.getAttribute("x")).toBe("400");
    expect(frame?.getAttribute("y")).toBe("250");
    expect(frame?.getAttribute("width")).toBe("400");
    expect(frame?.getAttribute("height")).toBe("300");

    dispose();
    container.remove();
  });
});
```

- [ ] Implement `ModernCropOverlay` as a viewport-space absolute SVG:

```tsx
import { Show } from "solid-js";
import type { ModernCropFrame, ModernCropImageTransform } from "./modernCropState";
import { getModernCropFrameScreenRect } from "@/viewport/modernCropGeometry";
import { CropOverlayGuides } from "./CropOverlayGuides";
import { useModernCropInteraction } from "./useModernCropInteraction";

interface ModernCropOverlayProps {
  viewportWidth: number;
  viewportHeight: number;
  frame: ModernCropFrame | null;
  imageTransform: ModernCropImageTransform;
  guideMode: "none" | "thirds" | "grid" | "diagonal" | "golden";
  zoom: number;
  onFrameChange: (frame: ModernCropFrame) => void;
  onImageTransformChange: (transform: ModernCropImageTransform) => void;
  onApplyCrop: () => void;
}

export function ModernCropOverlay(props: ModernCropOverlayProps) {
  const rect = () => props.frame
    ? getModernCropFrameScreenRect(props.frame, props.viewportWidth, props.viewportHeight)
    : null;

  const interaction = useModernCropInteraction({
    frame: () => props.frame,
    imageTransform: () => props.imageTransform,
    viewportWidth: () => props.viewportWidth,
    viewportHeight: () => props.viewportHeight,
    onFrameChange: props.onFrameChange,
    onImageTransformChange: props.onImageTransformChange,
  });

  return (
    <Show when={rect()}>
      {(r) => (
        <svg
          data-modern-crop-overlay
          style={{
            position: "absolute",
            inset: 0,
            width: "100%",
            height: "100%",
            "z-index": 36,
            "pointer-events": "auto",
          }}
          onPointerMove={interaction.onPointerMove}
          onPointerUp={interaction.onPointerUp}
          onPointerCancel={interaction.onPointerUp}
        >
          <rect
            x={0}
            y={0}
            width={props.viewportWidth}
            height={props.viewportHeight}
            fill="rgba(0,0,0,0.48)"
            mask="url(#modern-crop-shield)"
            style={{ "pointer-events": "none" }}
          />
          <defs>
            <mask id="modern-crop-shield">
              <rect x={0} y={0} width={props.viewportWidth} height={props.viewportHeight} fill="white" />
              <rect x={r().x} y={r().y} width={r().w} height={r().h} fill="black" />
            </mask>
          </defs>
          <rect
            data-modern-crop-frame
            x={r().x}
            y={r().y}
            width={r().w}
            height={r().h}
            fill="none"
            stroke="rgba(255,255,255,0.9)"
            stroke-width={1}
          />
          <CropOverlayGuides
            x={r().x}
            y={r().y}
            w={r().w}
            h={r().h}
            zoom={1}
            guideMode={props.guideMode}
          />
          <rect
            data-modern-crop-move
            x={r().x}
            y={r().y}
            width={r().w}
            height={r().h}
            fill="transparent"
            style={{ cursor: "move" }}
            onPointerDown={(e) => interaction.startDrag(e, "move")}
            onDblClick={(e) => {
              e.stopPropagation();
              props.onApplyCrop();
            }}
          />
        </svg>
      )}
    </Show>
  );
}
```

- [ ] Run the new overlay test command:

```powershell
pnpm.cmd --filter photrez-desktop test -- apps/desktop/src/components/editor/__tests__/ModernCropOverlay.test.tsx --run --pool=threads --maxWorkers=1
```

Expected: Modern overlay tests pass.

## Task 4: Implement Modern Interaction Hook

- Create: `apps/desktop/src/components/editor/useModernCropInteraction.ts`
- Modify: `apps/desktop/src/components/editor/__tests__/ModernCropOverlay.test.tsx`

- [ ] Add test for drag inside frame:

```tsx
it("dragging inside frame changes image offset but not frame center", () => {
  const onFrameChange = vi.fn();
  const onImageTransformChange = vi.fn();
  const container = document.createElement("div");
  document.body.appendChild(container);

  const dispose = render(() => (
    <ModernCropOverlay
      viewportWidth={1200}
      viewportHeight={800}
      frame={{ w: 400, h: 300 }}
      guideMode="thirds"
      zoom={1}
      onFrameChange={onFrameChange}
      onImageTransformChange={onImageTransformChange}
      imageTransform={{ offsetX: 0, offsetY: 0, rotation: 0, scale: 1 }}
      onApplyCrop={vi.fn()}
    />
  ), container);

  const move = container.querySelector("[data-modern-crop-move]")!;
  const svg = container.querySelector("[data-modern-crop-overlay]")!;

  move.dispatchEvent(new PointerEvent("pointerdown", {
    pointerId: 1,
    bubbles: true,
    clientX: 600,
    clientY: 400,
  }));
  svg.dispatchEvent(new PointerEvent("pointermove", {
    pointerId: 1,
    bubbles: true,
    clientX: 640,
    clientY: 430,
  }));

  expect(onFrameChange).not.toHaveBeenCalled();
  expect(onImageTransformChange).toHaveBeenCalledWith({
    offsetX: 40,
    offsetY: 30,
    rotation: 0,
    scale: 1,
  });

  dispose();
  container.remove();
});
```

- [ ] Implement hook:

```ts
import { createSignal } from "solid-js";
import type { ModernCropFrame, ModernCropImageTransform } from "./modernCropState";

type ModernCropHandle = "move" | "n" | "e" | "s" | "w" | "nw" | "ne" | "se" | "sw" | "rotate";

interface UseModernCropInteractionParams {
  frame: () => ModernCropFrame | null;
  imageTransform: () => ModernCropImageTransform;
  viewportWidth: () => number;
  viewportHeight: () => number;
  onFrameChange: (frame: ModernCropFrame) => void;
  onImageTransformChange: (transform: ModernCropImageTransform) => void;
}

export function useModernCropInteraction(params: UseModernCropInteractionParams) {
  const [drag, setDrag] = createSignal<{
    handle: ModernCropHandle;
    pointerId: number;
    startClientX: number;
    startClientY: number;
    startFrame: ModernCropFrame;
    startTransform: ModernCropImageTransform;
  } | null>(null);

  const startDrag = (e: PointerEvent, handle: ModernCropHandle) => {
    const frame = params.frame();
    if (!frame) return;
    (e.currentTarget as Element).setPointerCapture?.(e.pointerId);
    setDrag({
      handle,
      pointerId: e.pointerId,
      startClientX: e.clientX,
      startClientY: e.clientY,
      startFrame: { ...frame },
      startTransform: { ...params.imageTransform() },
    });
  };

  const onPointerMove = (e: PointerEvent) => {
    const d = drag();
    if (!d || d.pointerId !== e.pointerId) return;
    const dx = e.clientX - d.startClientX;
    const dy = e.clientY - d.startClientY;

    if (d.handle === "move") {
      params.onImageTransformChange({
        ...d.startTransform,
        offsetX: d.startTransform.offsetX + dx,
        offsetY: d.startTransform.offsetY + dy,
      });
      return;
    }

    let nextW = d.startFrame.w;
    let nextH = d.startFrame.h;
    if (d.handle.includes("e")) nextW += dx * 2;
    if (d.handle.includes("w")) nextW -= dx * 2;
    if (d.handle.includes("s")) nextH += dy * 2;
    if (d.handle.includes("n")) nextH -= dy * 2;

    params.onFrameChange({
      w: Math.max(24, nextW),
      h: Math.max(24, nextH),
    });
  };

  const onPointerUp = (e: PointerEvent) => {
    const d = drag();
    if (!d || d.pointerId !== e.pointerId) return;
    setDrag(null);
  };

  return { startDrag, onPointerMove, onPointerUp };
}
```

- [ ] Extend `ModernCropOverlay` with resize handles after move passes. Add `data-modern-crop-handle="e"` etc.
- [ ] Add tests for resize center stability:

```tsx
expect(onFrameChange).toHaveBeenCalledWith({ w: 480, h: 300 });
```

## Task 5: Wire Modern Overlay Into CanvasViewport

- Modify: `apps/desktop/src/components/editor/CanvasViewport.tsx`
- Modify: `apps/desktop/src/components/editor/__tests__/CanvasViewport.test.tsx`

- [ ] Import `ModernCropOverlay`.
- [ ] Read these context fields:

```ts
modernCropFrame, setModernCropFrame,
modernCropImageTransform, setModernCropImageTransform,
resetModernCrop,
viewportWidth, viewportHeight,
```

- [ ] Add Modern frame initialization effect:

```ts
createEffect(() => {
  if (activeTool() !== "crop") return;
  if (cropInteractionMode() !== "modern") return;
  if (modernCropFrame()) return;

  const vw = viewportWidth();
  const vh = viewportHeight();
  const margin = 96;
  setModernCropFrame({
    w: Math.max(24, vw - margin * 2),
    h: Math.max(24, vh - margin * 2),
  });
  setModernCropImageTransform({
    offsetX: 0,
    offsetY: 0,
    rotation: 0,
    scale: 1,
  });
});
```

- [ ] Render Classic overlay only for Classic:

```tsx
<Show when={activeTool() === "crop" && cropInteractionMode() === "classic" && cropRect()}>
  <CropOverlay ... />
</Show>
```

- [ ] Render Modern overlay outside the document transform container:

```tsx
<Show when={activeTool() === "crop" && cropInteractionMode() === "modern"}>
  <ModernCropOverlay
    viewportWidth={viewportWidth()}
    viewportHeight={viewportHeight()}
    frame={modernCropFrame()}
    imageTransform={modernCropImageTransform()}
    guideMode={cropGuideMode()}
    zoom={zoom()}
    onFrameChange={setModernCropFrame}
    onImageTransformChange={setModernCropImageTransform}
    onApplyCrop={handleModernApplyCrop}
  />
</Show>
```

- [ ] Remove Modern branches from old `CropOverlay` props:

```tsx
isModernMode={...}
cropContentOffset={...}
onCropContentOffsetChange={...}
```

Classic should not know about Modern state.

## Task 6: Apply Modern Transform To Image Preview

- Modify: `apps/desktop/src/components/editor/CanvasViewport.tsx`

Modern preview must move/rotate the image under the fixed frame. Apply transform to the document transform container only when Modern crop is active.

- [ ] Replace the document transform expression with:

```ts
const documentTransform = () => {
  const base = `translate3d(${pan().x}px, ${pan().y}px, 0) scale(${zoom()})`;
  if (activeTool() !== "crop" || cropInteractionMode() !== "modern") {
    return base;
  }

  const t = modernCropImageTransform();
  const cx = viewportWidth() / 2;
  const cy = viewportHeight() / 2;
  return [
    `translate3d(${t.offsetX}px, ${t.offsetY}px, 0)`,
    `translate3d(${cx}px, ${cy}px, 0)`,
    `rotate(${t.rotation}deg)`,
    `scale(${t.scale})`,
    `translate3d(${-cx}px, ${-cy}px, 0)`,
    base,
  ].join(" ");
};
```

- [ ] Use `transform: documentTransform()`.
- [ ] Set transition to none while crop dragging.
- [ ] Do not apply this transform in Classic.

## Task 7: Implement Modern Apply

- Modify: `apps/desktop/src/components/editor/cropToolActions.ts`
- Modify: `apps/desktop/src/components/editor/CanvasViewport.tsx`
- Test: `apps/desktop/src/components/editor/__tests__/cropToolActions.test.ts`

- [ ] Add helper in `CanvasViewport.tsx`:

```ts
const handleModernApplyCrop = () => {
  const frame = modernCropFrame();
  const engine = workspace.getActiveEngine();
  if (!frame || !engine) return;

  const rect = modernFrameToCropRect({
    frame,
    viewport: {
      width: viewportWidth(),
      height: viewportHeight(),
      panX: engine.getViewport().panX,
      panY: engine.getViewport().panY,
      zoom: engine.getViewport().zoom,
    },
    transform: modernCropImageTransform(),
  });

  applyCropPreview({
    workspace,
    renderer,
    cropRect: rect,
    cropMode: cropMode(),
    cropSizeTarget: cropSizeTarget(),
    cropDeletePixels: cropDeletePixels(),
    cropRotation: modernCropImageTransform().rotation,
    scheduler,
    setCropRect,
    setCropRotation,
    setHiddenCropPreview,
    setActiveTool,
  });

  resetModernCrop();
};
```

- [ ] For Phase 1, disable Modern rotation UI if rotated apply is not visually proven. If keeping it enabled, add a test that `cropRotation` passed to `applyCropPreview` equals `modernCropImageTransform().rotation`.

## Task 8: Option Bar Mode-Aware Controls

- Modify: `apps/desktop/src/components/editor/CropOptionBar.tsx`
- Test: `apps/desktop/src/components/editor/__tests__/CropOptionBar.test.tsx`

- [ ] Keep Modern/Classic toggle.
- [ ] In Modern mode, W/H fields read from `modernCropFrame`.
- [ ] In Classic mode, W/H fields read from `cropRect`.
- [ ] In Modern mode, Angle field writes to `modernCropImageTransform.rotation`.
- [ ] In Classic mode, Angle field writes to `cropRotation`.
- [ ] Reset button:

```ts
if (cropInteractionMode() === "modern") {
  resetModernCrop();
  return;
}
resetCropPreviewToCanvas(...);
```

- [ ] Apply button:

Modern calls `handleModernApplyCrop` through shared action callback from context or `CanvasViewport`; if not available in option bar, extract apply helpers into `cropToolActions.ts`.

## Task 9: Remove Obsolete Modern Branches

- Modify:
  - `apps/desktop/src/components/editor/CropOverlay.tsx`
  - `apps/desktop/src/components/editor/useCropOverlayDrag.ts`
  - `apps/desktop/src/components/editor/cropState.ts`
  - `apps/desktop/src/components/editor/EditorContext.tsx`

- [ ] Remove `cropContentOffset` if no longer referenced.
- [ ] Remove `isModernMode`, `cropContentOffset`, and `onCropContentOffsetChange` props from Classic `CropOverlay`.
- [ ] Remove Modern-specific branching from `useCropOverlayDrag.ts`.
- [ ] Rename comments/tests so old `CropOverlay` is clearly Classic behavior.

Run:

```powershell
rg -n "cropContentOffset|isModernMode|onCropContentOffsetChange" apps/desktop/src
```

Expected: zero results, unless temporary migration notes remain in docs only.

## Task 10: Verification and Docs

- Modify:
  - `docs/AI_CURRENT_TASK.md`
  - `docs/AI_HISTORY.md`
  - `docs/FEATURES.md`
  - `docs/01-id-decision-log.md`

- [ ] Update `AI_CURRENT_TASK.md` before implementation starts.
- [ ] Add a decision-log entry:

```md
## 2026-06-07 - Crop Interaction Coordinate Split

Decision: Modern crop frame lives in viewport coordinates and remains centered. Classic crop box lives in document coordinates.
Rationale: Sharing document-space `cropRect.x/y` made Modern and Classic visually indistinct and produced incoherent image/frame movement.
Consequences: Modern requires separate frame and image transform state plus dedicated apply math.
```

- [ ] Update `FEATURES.md` crop row to:

```md
| ✅ DONE | Crop interaction modes — Modern uses a viewport-centered fixed frame with image movement underneath; Classic uses document-space crop box movement/resize/rotation. |
```

- [ ] Run:

```powershell
pnpm.cmd run build
pnpm.cmd --filter photrez-desktop test
```

Expected:

- Build passes.
- Full frontend test suite passes.

## Manual Verification Script

Run the app and verify:

```powershell
pnpm.cmd tauri dev
```

Manual checks:

1. Open an image.
2. Select Crop Tool.
3. Set mode Modern.
4. Confirm frame appears centered in viewport.
5. Drag inside frame: image moves, frame center stays fixed.
6. Resize a corner: frame grows/shrinks from center, center stays fixed.
7. Change aspect preset: frame stays centered.
8. Rotate: image rotates underneath, frame stays axis-aligned and centered.
9. Switch Classic.
10. Drag crop box: box moves, image stays still.
11. Resize Classic: box changes in document space.
12. Rotate Classic: crop box rotates.
13. Apply both modes and confirm output matches visible crop area.

## Risks

- Rotated Modern apply may require deeper crop engine support than current `applyCrop` can represent exactly. If visual/apply parity fails, ship Modern move/resize first and gate Modern rotate until a follow-up.
- Keeping both crop modes in one overlay will recreate the current confusion. Do not do that.
- Do not use CSS transform on only the WebGL canvas. Any preview transform must apply to the full document transform layer so image, artboard, and overlay relationships remain coherent.

## Self-Review

- Spec coverage: Modern fixed center, image movement, resize from center, rotation under frame, Classic document-space behavior, apply math, migration, tests, and file order are all covered.
- Placeholder scan: no TODO/TBD placeholders.
- Type consistency: `ModernCropFrame` and `ModernCropImageTransform` are defined once and reused through state, overlay, interaction, and geometry tasks.
