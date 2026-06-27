# Modern Crop Drag-to-Create — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add drag-to-create crop frame in Modern Crop mode when no frame exists.

**Architecture:** One-file change (`useCanvasPointerTools.ts`) + new tests. Replace the immediate `setModernCropFrame(getDefaultModernCropFrame(...))` call in `onCanvasPointerDown` with deferred creation on drag threshold or pointerup. Use local variable tracking (like `isPendingCropClick`) for drag start position and threshold state. Use `e.shiftKey` from PointerEvent for square constrain (no need to thread Shift signal).

**Tech Stack:** SolidJS, TypeScript, Vitest, jsdom

---

### Task 1: Replace immediate frame creation with drag-to-create tracking

**Files:**
- Modify: `apps/desktop/src/components/editor/useCanvasPointerTools.ts` (lines 1-450)

- [ ] **Step 1: Fix import — add `getProjectedCanvasSize` and `clampFrameToProjectedBounds`**

Replace line 18:
```typescript
import { getDefaultModernCropFrame } from "@/viewport/modernCropGeometry";
```
With:
```typescript
import { getDefaultModernCropFrame, getProjectedCanvasSize, clampFrameToProjectedBounds } from "@/viewport/modernCropGeometry";
```

- [ ] **Step 2: Add local tracking variables**

After `let isPendingCropClick = false;` (line 89), add:
```typescript
let modernDragStart: { x: number; y: number } | null = null;
let modernDragExceededThreshold = false;
```

- [ ] **Step 3: Replace modern crop block in `onCanvasPointerDown`**

Replace lines 242-263:
```typescript
    if (activeTool() === "crop" && e.button === 0) {
      if (cropInteractionMode() === "modern") {
        if (!modernCropFrame()) {
          const mode = cropMode();
          const ratioAspect = cropAspect();
          const sizeTarget = cropSizeTarget();
          const aspect = mode === "ratio" && ratioAspect
            ? ratioAspect
            : mode === "size" && sizeTarget && sizeTarget.w > 0 && sizeTarget.h > 0
              ? { w: sizeTarget.w, h: sizeTarget.h }
              : null;
          setModernCropFrame(getDefaultModernCropFrame({
            viewportWidth: viewportWidth(),
            viewportHeight: viewportHeight(),
            docWidth: docWidth(),
            docHeight: docHeight(),
            zoom: zoom(),
            aspect,
          }));
          scheduler.requestRender();
        }
        isPendingCropClick = false;
      } else {
        isPendingCropClick = !cropRect();
      }
    } else {
      isPendingCropClick = false;
    }
```
With:
```typescript
    if (activeTool() === "crop" && e.button === 0) {
      if (cropInteractionMode() === "modern") {
        if (modernCropFrame()) {
          isPendingCropClick = false;
        } else {
          // Defer frame creation — track drag start, create on threshold or pointerup
          const viewport = params.getCanvasContainerRef();
          if (!viewport) return;
          const rect = viewport.getBoundingClientRect();
          modernDragStart = {
            x: e.clientX - rect.left,
            y: e.clientY - rect.top,
          };
          modernDragExceededThreshold = false;
          isPendingCropClick = false;
        }
      } else {
        isPendingCropClick = !cropRect();
      }
    } else {
      isPendingCropClick = false;
    }
```

- [ ] **Step 4: Guard early return when modern drag start failed**

After the brush/eraser guard at line 286 (`if (getPaintToolBlockReason...`) and before `history.commit`, add:
```typescript
    // If modern crop mode with no frame and no dragStart, bail
    if (activeTool() === "crop" && cropInteractionMode() === "modern" && !modernCropFrame() && !modernDragStart) {
      return;
    }
```

- [ ] **Step 5: Add drag-to-create threshold check in `onCanvasPointerMove`**

After the `if (params.isPanning()) return;` guard at line 315 and before the engine check, add:
```typescript
    // Modern crop drag-to-create: detect threshold exceed
    if (
      activeTool() === "crop" &&
      cropInteractionMode() === "modern" &&
      !modernCropFrame() &&
      modernDragStart &&
      !modernDragExceededThreshold
    ) {
      const container = params.getCanvasContainerRef();
      if (!container) return;
      const rect = container.getBoundingClientRect();
      const dx = e.clientX - (rect.left + modernDragStart.x);
      const dy = e.clientY - (rect.top + modernDragStart.y);
      if (Math.abs(dx) >= 5 || Math.abs(dy) >= 5) {
        modernDragExceededThreshold = true;
        createModernCropFrameFromDrag(
          modernDragStart.x,
          modernDragStart.y,
          e.clientX - rect.left,
          e.clientY - rect.top,
          e.shiftKey,
        );
      }
      return; // Don't dispatch to handlePointerMove until frame exists
    }
```

- [ ] **Step 6: Add `createModernCropFrameFromDrag` function**

After `setSelectionBoxSignal(null);` cleanup (around line 388), before `onCanvasPointerCancel`, add:
```typescript
  function createModernCropFrameFromDrag(
    startX: number, startY: number, endX: number, endY: number, shiftKey: boolean,
  ) {
    const vw = viewportWidth();
    const vh = viewportHeight();

    const dragW = Math.max(Math.abs(endX - startX), 1);
    const dragH = Math.max(Math.abs(endY - startY), 1);

    const mode = cropMode();
    const ratioAspect = cropAspect();
    const sizeTarget = cropSizeTarget();

    let aspect: { w: number; h: number } | null = null;

    if (mode === "free") {
      if (shiftKey) {
        aspect = { w: 1, h: 1 };
      } else {
        const dragAspect = Math.max(dragW, dragH) / Math.min(dragW, dragH);
        const clamped = Math.min(10, Math.max(1 / 10, dragAspect));
        if (dragW >= dragH) {
          aspect = { w: clamped, h: 1 };
        } else {
          aspect = { w: 1, h: clamped };
        }
      }
    } else if (mode === "ratio" && ratioAspect && ratioAspect.w > 0 && ratioAspect.h > 0) {
      aspect = ratioAspect;
    } else if (mode === "size" && sizeTarget && sizeTarget.w > 0 && sizeTarget.h > 0) {
      aspect = { w: sizeTarget.w, h: sizeTarget.h };
    }

    const scale = Math.max(dragW / vw, dragH / vh);
    let frameW = Math.min(vw, Math.max(100, vw * scale * 0.6));
    let frameH: number;

    if (!aspect) {
      frameH = Math.min(vh, Math.max(100, vh * scale * 0.6));
    } else {
      const aspectRatio = aspect.w / aspect.h;
      frameH = frameW / aspectRatio;
      if (frameH > vh) {
        frameH = vh;
        frameW = frameH * aspectRatio;
      }
    }

    const projected = getProjectedCanvasSize({
      docWidth: docWidth(),
      docHeight: docHeight(),
      zoom: zoom(),
    });

    const frame = clampFrameToProjectedBounds(
      { w: Math.round(frameW), h: Math.round(frameH) },
      projected,
      100,
    );
    setModernCropFrame(frame);
    scheduler.requestRender();
  }
```

- [ ] **Step 7: Add pointerup fallback in `onCanvasPointerUp` for click behavior**

After the brush/eraser commit block (after the closing `}` of `if (layerId && interactiveState.strokePoints.length > 0)`, around line 363), before the `isPendingCropClick` check, add:
```typescript
    // Modern crop: drag never exceeded threshold → default frame (click behavior)
    if (
      activeTool() === "crop" &&
      cropInteractionMode() === "modern" &&
      !modernCropFrame() &&
      modernDragStart
    ) {
      if (!modernDragExceededThreshold) {
        const mode = cropMode();
        const ratioAspect = cropAspect();
        const sizeTarget = cropSizeTarget();
        const aspect = mode === "ratio" && ratioAspect
          ? ratioAspect
          : mode === "size" && sizeTarget && sizeTarget.w > 0 && sizeTarget.h > 0
            ? { w: sizeTarget.w, h: sizeTarget.h }
            : null;
        setModernCropFrame(getDefaultModernCropFrame({
          viewportWidth: viewportWidth(),
          viewportHeight: viewportHeight(),
          docWidth: docWidth(),
          docHeight: docHeight(),
          zoom: zoom(),
          aspect,
        }));
        scheduler.requestRender();
      }
      modernDragStart = null;
      modernDragExceededThreshold = false;
    }
```

- [ ] **Step 8: Clean up drag state on cancel/lost capture**

In `onCanvasPointerCancel` (before its closing `}`, around line 413) and `onCanvasLostPointerCapture` (before its closing `}`, around line 432), add:
```typescript
    modernDragStart = null;
    modernDragExceededThreshold = false;
```

- [ ] **Step 9: Build to verify**

Run: `pnpm.cmd run build`
Expected: tsc + Vite succeed, no errors

- [ ] **Step 10: Run existing tests to verify no regressions**

Run: `pnpm.cmd --filter photrez-desktop test --run`
Expected: All existing tests pass

---

### Task 2: Add tests for drag-to-create behavior

**Files:**
- Modify: `apps/desktop/src/components/editor/__tests__/CanvasViewport.test.tsx`

- [ ] **Step 1: Add test helper `dispatchModernCanvasDrag`**

Add a helper (with existing helper `dispatchPasteboardClick`) to simulate canvas drag in modern crop mode:
```typescript
  function dispatchModernCanvasDrag(
    fromX: number, fromY: number, toX: number, toY: number,
  ) {
    const canvas = container.querySelector("canvas") as HTMLCanvasElement;
    if (!canvas) throw new Error("Canvas not found");

    canvas.dispatchEvent(new PointerEvent("pointerdown", {
      bubbles: true, cancelable: true, button: 0, pointerId: 1,
      clientX: fromX, clientY: fromY,
    }));

    // Simulate pointermove on container (matches real event flow)
    const viewportContainer = container.querySelector("[data-viewport-container]") as HTMLDivElement;
    viewportContainer.dispatchEvent(new PointerEvent("pointermove", {
      bubbles: true, cancelable: true, button: 0, pointerId: 1,
      clientX: toX, clientY: toY,
    }));

    canvas.dispatchEvent(new PointerEvent("pointerup", {
      bubbles: true, cancelable: true, button: 0, pointerId: 1,
      clientX: toX, clientY: toY,
    }));
  }
```

- [ ] **Step 2: Add helper `dispatchModernCanvasClick`**

Add a helper for click in modern crop (below threshold):
```typescript
  function dispatchModernCanvasClick(x: number, y: number) {
    const canvas = container.querySelector("canvas") as HTMLCanvasElement;
    if (!canvas) throw new Error("Canvas not found");

    canvas.dispatchEvent(new PointerEvent("pointerdown", {
      bubbles: true, cancelable: true, button: 0, pointerId: 1,
      clientX: x, clientY: y,
    }));

    canvas.dispatchEvent(new PointerEvent("pointerup", {
      bubbles: true, cancelable: true, button: 0, pointerId: 1,
      clientX: x, clientY: y,
    }));
  }
```

- [ ] **Step 3: Write test "creates default frame on canvas click in Modern mode with no frame"**

Add inside `describe("CanvasViewport Pasteboard Clicks", ...`) block, before `afterEach`:
```typescript
  it("creates default frame on canvas click in Modern mode with no frame", async () => {
    renderViewport();
    await new Promise((resolve) => setTimeout(resolve, 0));

    setTool("crop");
    setCropInteractionMode("modern");
    // No frame yet — click should create default
    expect(getModernFrame()).toBeNull();

    // Click on canvas
    const canvas = container.querySelector("canvas") as HTMLCanvasElement;
    expect(canvas).not.toBeNull();

    canvas.dispatchEvent(new PointerEvent("pointerdown", {
      bubbles: true, cancelable: true, button: 0, pointerId: 1,
      clientX: 50, clientY: 50,
    }));
    canvas.dispatchEvent(new PointerEvent("pointerup", {
      bubbles: true, cancelable: true, button: 0, pointerId: 1,
      clientX: 50, clientY: 50,
    }));

    // Should have created a frame
    const frame = getModernFrame();
    expect(frame).not.toBeNull();
    expect(frame!.w).toBeGreaterThan(0);
    expect(frame!.h).toBeGreaterThan(0);
  });
```

- [ ] **Step 4: Run tests to verify new test fails with old code**

Run: `pnpm.cmd --filter photrez-desktop test --run -t "creates default frame on canvas click"
Expected: PASS (this test tests click behavior which is already implemented)

- [ ] **Step 5: Write test "drag in Modern mode below threshold creates default frame"**

```typescript
  it("drag in Modern mode below threshold creates default frame", async () => {
    renderViewport();
    await new Promise((resolve) => setTimeout(resolve, 0));

    setTool("crop");
    setCropInteractionMode("modern");
    expect(getModernFrame()).toBeNull();

    // 4px drag — below 5px threshold
    dispatchModernCanvasClick(100, 100);

    // Need to get frame — after pointerup with below-threshold drag
    // Wait: dispatchModernCanvasClick dispatches at same position (0px)
    // Let me use a separate small displacement
    const canvas = container.querySelector("canvas") as HTMLCanvasElement;
    canvas.dispatchEvent(new PointerEvent("pointerdown", {
      bubbles: true, cancelable: true, button: 0, pointerId: 1,
      clientX: 100, clientY: 100,
    }));
    const viewportContainer = container.querySelector("[data-viewport-container]") as HTMLDivElement;
    viewportContainer.dispatchEvent(new PointerEvent("pointermove", {
      bubbles: true, cancelable: true, button: 0, pointerId: 1,
      clientX: 103, clientY: 100, // 3px — below 5px threshold
    }));
    canvas.dispatchEvent(new PointerEvent("pointerup", {
      bubbles: true, cancelable: true, button: 0, pointerId: 1,
      clientX: 103, clientY: 100,
    }));

    const frame = getModernFrame();
    expect(frame).not.toBeNull();
    expect(frame!.w).toBeGreaterThan(0);
    expect(frame!.h).toBeGreaterThan(0);
  });
```

- [ ] **Step 6: Write test "drag in Modern mode above threshold creates frame with expected aspect"**

```typescript
  it("drag in Modern mode above threshold creates frame with expected aspect", async () => {
    renderViewport();
    await new Promise((resolve) => setTimeout(resolve, 0));

    setTool("crop");
    setCropInteractionMode("modern");
    setCropModeState("free");
    expect(getModernFrame()).toBeNull();

    const canvas = container.querySelector("canvas") as HTMLCanvasElement;
    canvas.dispatchEvent(new PointerEvent("pointerdown", {
      bubbles: true, cancelable: true, button: 0, pointerId: 1,
      clientX: 100, clientY: 100,
    }));
    const viewportContainer = container.querySelector("[data-viewport-container]") as HTMLDivElement;
    viewportContainer.dispatchEvent(new PointerEvent("pointermove", {
      bubbles: true, cancelable: true, button: 0, pointerId: 1,
      clientX: 300, clientY: 150, // wider than tall → w/h > 1
    }));
    canvas.dispatchEvent(new PointerEvent("pointerup", {
      bubbles: true, cancelable: true, button: 0, pointerId: 1,
      clientX: 300, clientY: 150,
    }));

    const frame = getModernFrame();
    expect(frame).not.toBeNull();
    // Wider-than-tall drag → frame should be wider than tall
    expect(frame!.w / frame!.h).toBeGreaterThan(0.9); // approx aspect
  });
```

- [ ] **Step 7: Write test "Shift+drag in Free mode creates square frame"**

```typescript
  it("Shift+drag in Free mode creates square frame", async () => {
    renderViewport();
    await new Promise((resolve) => setTimeout(resolve, 0));

    setTool("crop");
    setCropInteractionMode("modern");
    setCropModeState("free");
    expect(getModernFrame()).toBeNull();

    const canvas = container.querySelector("canvas") as HTMLCanvasElement;
    canvas.dispatchEvent(new PointerEvent("pointerdown", {
      bubbles: true, cancelable: true, button: 0, pointerId: 1,
      clientX: 100, clientY: 100, shiftKey: true,
    }));
    const viewportContainer = container.querySelector("[data-viewport-container]") as HTMLDivElement;
    viewportContainer.dispatchEvent(new PointerEvent("pointermove", {
      bubbles: true, cancelable: true, button: 0, pointerId: 1,
      clientX: 300, clientY: 150, shiftKey: true,
    }));
    canvas.dispatchEvent(new PointerEvent("pointerup", {
      bubbles: true, cancelable: true, button: 0, pointerId: 1,
      clientX: 300, clientY: 150, shiftKey: true,
    }));

    const frame = getModernFrame();
    expect(frame).not.toBeNull();
    // Should be roughly square
    const ratio = Math.max(frame!.w, frame!.h) / Math.min(frame!.w, frame!.h);
    expect(ratio).toBeLessThan(1.01);
  });
```

- [ ] **Step 8: Write test "Ratio mode drag ignores drag aspect, uses option bar aspect"**

```typescript
  it("Ratio mode drag ignores drag aspect, uses option bar aspect", async () => {
    renderViewport();
    await new Promise((resolve) => setTimeout(resolve, 0));

    setTool("crop");
    setCropInteractionMode("modern");
    setCropModeState("ratio");
    setCropAspectState({ w: 16, h: 9 });

    const canvas = container.querySelector("canvas") as HTMLCanvasElement;
    // Drag tall (wider-h narrow) but ratio mode should ignore and use 16:9
    canvas.dispatchEvent(new PointerEvent("pointerdown", {
      bubbles: true, cancelable: true, button: 0, pointerId: 1,
      clientX: 100, clientY: 100,
    }));
    const viewportContainer = container.querySelector("[data-viewport-container]") as HTMLDivElement;
    viewportContainer.dispatchEvent(new PointerEvent("pointermove", {
      bubbles: true, cancelable: true, button: 0, pointerId: 1,
      clientX: 110, clientY: 300, // tall drag (30px wide, 200px down)
    }));
    canvas.dispatchEvent(new PointerEvent("pointerup", {
      bubbles: true, cancelable: true, button: 0, pointerId: 1,
      clientX: 110, clientY: 300,
    }));

    const frame = getModernFrame();
    expect(frame).not.toBeNull();
    // Should be 16:9, not tall
    const frameRatio = frame!.w / frame!.h;
    expect(frameRatio).toBeCloseTo(16 / 9, 0);
  });
```

- [ ] **Step 9: Write test "cancel mid-drag cleans up state"**

```typescript
  it("cancel mid-drag cleans up modern drag state", async () => {
    renderViewport();
    await new Promise((resolve) => setTimeout(resolve, 0));

    setTool("crop");
    setCropInteractionMode("modern");
    expect(getModernFrame()).toBeNull();

    const canvas = container.querySelector("canvas") as HTMLCanvasElement;
    canvas.dispatchEvent(new PointerEvent("pointerdown", {
      bubbles: true, cancelable: true, button: 0, pointerId: 1,
      clientX: 100, clientY: 100,
    }));
    canvas.dispatchEvent(new PointerEvent("pointercancel", {
      bubbles: true, cancelable: true, button: 0, pointerId: 1,
    }));

    // After cancel, no frame should have been created
    expect(getModernFrame()).toBeNull();

    // Subsequent click should still create a frame
    canvas.dispatchEvent(new PointerEvent("pointerdown", {
      bubbles: true, cancelable: true, button: 0, pointerId: 2,
      clientX: 100, clientY: 100,
    }));
    canvas.dispatchEvent(new PointerEvent("pointerup", {
      bubbles: true, cancelable: true, button: 0, pointerId: 2,
      clientX: 100, clientY: 100,
    }));

    const frame = getModernFrame();
    expect(frame).not.toBeNull();
    expect(frame!.w).toBeGreaterThan(0);
  });
```

- [ ] **Step 10: Write test "lost pointer capture mid-drag cleans up state"**

```typescript
  it("lost pointer capture mid-drag cleans up modern drag state", async () => {
    renderViewport();
    await new Promise((resolve) => setTimeout(resolve, 0));

    setTool("crop");
    setCropInteractionMode("modern");
    expect(getModernFrame()).toBeNull();

    const canvas = container.querySelector("canvas") as HTMLCanvasElement;
    canvas.dispatchEvent(new PointerEvent("pointerdown", {
      bubbles: true, cancelable: true, button: 0, pointerId: 1,
      clientX: 100, clientY: 100,
    }));
    canvas.dispatchEvent(new PointerEvent("lostpointercapture", {
      bubbles: true, cancelable: true, button: 0, pointerId: 1,
    }));

    // After lost capture, no frame should have been created (threshold not exceeded)
    expect(getModernFrame()).toBeNull();
  });
```

- [ ] **Step 11: Write test "drag exceeds threshold creates frame and pointermove resumes normal handling"**

```typescript
  it("drag exceeds threshold creates frame and subsequent pointermove works", async () => {
    renderViewport();
    await new Promise((resolve) => setTimeout(resolve, 0));

    setTool("crop");
    setCropInteractionMode("modern");
    setCropModeState("free");
    expect(getModernFrame()).toBeNull();

    const canvas = container.querySelector("canvas") as HTMLCanvasElement;
    const viewportContainer = container.querySelector("[data-viewport-container]") as HTMLDivElement;

    // Start drag
    canvas.dispatchEvent(new PointerEvent("pointerdown", {
      bubbles: true, cancelable: true, button: 0, pointerId: 1,
      clientX: 100, clientY: 100,
    }));

    // Move beyond threshold to create frame
    viewportContainer.dispatchEvent(new PointerEvent("pointermove", {
      bubbles: true, cancelable: true, button: 0, pointerId: 1,
      clientX: 200, clientY: 100, // 100px horizontal → exceeds 5px
    }));

    // Frame should now exist
    let frame = getModernFrame();
    expect(frame).not.toBeNull();
  });
```

- [ ] **Step 12: Run all tests to verify**

Run: `pnpm.cmd --filter photrez-desktop test --run`
Expected: All tests pass (744+)

- [ ] **Step 13: Build to verify**

Run: `pnpm.cmd run build`
Expected: tsc + Vite succeed, no errors
