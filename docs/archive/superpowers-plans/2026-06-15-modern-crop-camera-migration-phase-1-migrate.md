# Modern Crop CSS Path → Camera Image Transform — Phase 1 Migration Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans (recommended for small phases) or superpowers:subagent-driven-development. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace `modernImageTransformStyle` createMemo (CSS string) with SolidJS effect that calls `camera.setImageTransform(...)`. Update EditorShell to single render path. Add feature flag for rollback. Add integration tests.

**Architecture:** SolidJS effect reads modern crop signals + viewport signals + frame, computes pivot, calls `camera.setImageTransform()` (mutates camera class state). EditorShell's render scheduler always uses `camera.getViewProjectionMatrix()` (which now includes image transform). Feature flag `USE_GPU_CAMERA_FOR_MODERN_CROP` in EditorContext gates the new path; when `false`, fallback to old CSS path.

**Tech Stack:** SolidJS createEffect/createSignal, ViewportCamera (extended in Phase 0), TypeScript, Vitest, solid-testing-library

**Spec:** `docs/superpowers/specs/2026-06-15-modern-crop-camera-migration-design.md` §5 B, §8 Phase 1, §11

**Verification gate:**
- All 993+ frontend tests pass
- `pnpm run build` hijau
- Pre-commit pipeline green

**Bug-fixing:** Use `systematic-debugging` skill when bugs are found.

---

## File Structure

| File | Action | Responsibility |
|------|--------|----------------|
| `apps/desktop/src/components/editor/EditorContext.tsx` | Modify | Add `useGPUCameraForModernCrop` signal + setter to context |
| `apps/desktop/src/components/editor/CanvasViewport.tsx` | Modify | Replace `modernImageTransformStyle` createMemo with effect; add feature flag gate; trigger `scheduler.requestRender()` on state changes |
| `apps/desktop/src/components/editor/EditorShell.tsx` | Modify | Single render path (always use VP matrix); remove `isModernCropActive` conditional |
| `apps/desktop/src/components/editor/__tests__/CanvasViewport.test.tsx` | Modify | Add 2-3 integration tests for camera image transform sync |

No new files created. No dependencies added.

---

## Task 1: Add feature flag to EditorContext

**Files:**
- Modify: `apps/desktop/src/components/editor/EditorContext.tsx`

- [ ] **Step 1: Add `useGPUCameraForModernCrop` to `EditorContextValue` interface**

In `EditorContext.tsx`, find the `EditorContextValue` interface (around line 100-160) and add:

```ts
  useGPUCameraForModernCrop: () => boolean;
  setUseGPUCameraForModernCrop: (v: boolean) => void;
```

- [ ] **Step 2: Add the signal in `EditorProvider`**

In `EditorProvider` (around line 199), after `const editorState = createEditorState();`, add:

```ts
  const [useGPUCameraForModernCrop, setUseGPUCameraForModernCrop] = createSignal(true);
```

- [ ] **Step 3: Add to context value object**

Find where the context value is constructed (the object passed to `<EditorContext.Provider value={...}>`). Add the new properties to that object:

```ts
        useGPUCameraForModernCrop,
        setUseGPUCameraForModernCrop,
```

- [ ] **Step 4: Add safe defaults in `useEditor()` fallback**

In `useEditor()` (the `if (!context)` branch, around line 167-188), add:

```ts
      useGPUCameraForModernCrop: () => true,
      setUseGPUCameraForModernCrop: () => {},
```

- [ ] **Step 5: Verify TypeScript compiles**

Run: `cd apps/desktop; pnpm.cmd exec tsc --noEmit`
Expected: No errors

- [ ] **Step 6: Run existing tests to verify no regression**

Run: `pnpm.cmd --filter photrez-desktop test --run 2>&1 | Select-Object -Last 5`
Expected: 993/993 tests pass (no behavior change)

- [ ] **Step 7: Commit**

```bash
git add apps/desktop/src/components/editor/EditorContext.tsx
git commit -m "feat(editor): add useGPUCameraForModernCrop feature flag"
```

---

## Task 2: Replace `modernImageTransformStyle` with effect that sets camera state

**Files:**
- Modify: `apps/desktop/src/components/editor/CanvasViewport.tsx`

- [ ] **Step 1: Read current implementation of `modernImageTransformStyle` and surrounding code**

Read `CanvasViewport.tsx:138-163` to understand the createMemo structure. The new effect replaces this.

- [ ] **Step 2: Replace `modernImageTransformStyle` createMemo with the camera-sync effect**

In `CanvasViewport.tsx`, replace the createMemo at lines 138-163 with:

```ts
  // Sync modern crop state to camera image transform.
  // The camera's VP matrix will include this transform, eliminating
  // the need for CSS transform on the canvas.
  createEffect(() => {
    if (!useGPUCameraForModernCrop()) {
      // Feature flag disabled: don't touch camera, let CSS handle it
      return;
    }

    const tool = activeTool();
    const mode = cropInteractionMode();

    if (tool !== "crop" || mode !== "modern") {
      camera.resetImageTransform();
      return;
    }

    const frame = modernCropFrame();
    const transform = modernCropImageTransform();

    if (!frame) {
      // No frame: apply offset + scale only (no rotation pivot)
      camera.setImageTransform({
        offsetX: transform.offsetX,
        offsetY: transform.offsetY,
        rotation: 0,
        scale: transform.scale,
        pivotScreen: null,
        pivotDocument: null,
      });
      return;
    }

    // With frame: compute pivot, apply full transform
    const pivot = getModernCropImagePivot({
      frame,
      viewport: {
        width: viewportWidth(),
        height: viewportHeight(),
        panX: pan().x,
        panY: pan().y,
        zoom: zoom(),
      },
      transform,
    });

    camera.setImageTransform({
      offsetX: transform.offsetX,
      offsetY: transform.offsetY,
      rotation: transform.rotation,
      scale: transform.scale,
      pivotScreen: pivot.screen,
      pivotDocument: pivot.document,
    });
  });
```

- [ ] **Step 3: Add `useGPUCameraForModernCrop` to useEditor() destructure**

In `CanvasViewport.tsx`, find the `useEditor()` destructure (around the top of the component). Add:

```ts
  const { ..., useGPUCameraForModernCrop } = useEditor();
```

- [ ] **Step 4: Verify TypeScript compiles**

Run: `cd apps/desktop; pnpm.cmd exec tsc --noEmit`
Expected: No errors

- [ ] **Step 5: Run existing tests**

Run: `pnpm.cmd --filter photrez-desktop test --run 2>&1 | Select-Object -Last 5`
Expected: 993/993 tests pass (effect runs but flag defaults to true, so no behavior change yet because canvas still has CSS transform style)

- [ ] **Step 6: Commit**

```bash
git add apps/desktop/src/components/editor/CanvasViewport.tsx
git commit -m "refactor(canvas): replace modernImageTransformStyle with camera-sync effect"
```

---

## Task 3: Update EditorShell to single render path (with feature flag)

**Files:**
- Modify: `apps/desktop/src/components/editor/EditorShell.tsx`

- [ ] **Step 1: Read current implementation of render scheduler**

Read `EditorShell.tsx:79-84` to understand the current conditional render.

- [ ] **Step 2: Update render scheduler to feature-flag-gated single path**

In `EditorShell.tsx`, replace the render scheduler callback (around line 79-84) with:

```ts
  const scheduler = new RenderScheduler(() => {
    const engine = workspace.getActiveEngine();
    if (!engine) return;
    if (useGPUCameraForModernCrop()) {
      // New path: always use VP matrix (includes image transform if set)
      const matrix = camera.getViewProjectionMatrix();
      renderer.render(engine.getRenderState(), matrix);
    } else {
      // Legacy path: conditional render based on isModernCropActive flag
      if (camera.isModernCropActive) {
        renderer.render(engine.getRenderState());
      } else {
        const matrix = camera.getViewProjectionMatrix();
        renderer.render(engine.getRenderState(), matrix);
      }
    }
  });
```

- [ ] **Step 3: Add `useGPUCameraForModernCrop` to useEditor() destructure in EditorShell**

In `EditorShell.tsx`, find the `useEditor()` destructure and add:

```ts
  const { ..., useGPUCameraForModernCrop } = useEditor();
```

- [ ] **Step 4: Verify TypeScript compiles**

Run: `cd apps/desktop; pnpm.cmd exec tsc --noEmit`
Expected: No errors

- [ ] **Step 5: Run existing tests**

Run: `pnpm.cmd --filter photrez-desktop test --run 2>&1 | Select-Object -Last 5`
Expected: 993/993 tests pass (flag defaults to true, so old path is unused; new path is functionally equivalent to old conditional)

- [ ] **Step 6: Commit**

```bash
git add apps/desktop/src/components/editor/EditorShell.tsx
git commit -m "refactor(editor): feature-flag-gated single render path in EditorShell"
```

---

## Task 4: Add integration tests for camera image transform sync

**Files:**
- Modify: `apps/desktop/src/components/editor/__tests__/CanvasViewport.test.tsx`

- [ ] **Step 1: Find the end of the test file**

Run: `Get-Content apps\desktop\src\components\editor\__tests__\CanvasViewport.test.tsx | Measure-Object -Line`

Note the last line number.

- [ ] **Step 2: Add a new describe block at the end of the file**

Append at the end of `CanvasViewport.test.tsx`:

```tsx
describe("CanvasViewport Modern Crop → Camera Image Transform", () => {
  let ws: WorkspaceManager;
  let renderer: any;
  let scheduler: any;
  let container: HTMLDivElement;
  let dispose: () => void;
  let testCamera: any;

  beforeEach(() => {
    ws = new WorkspaceManager();
    renderer = { uploadImage: vi.fn(), destroyTexture: vi.fn() };
    scheduler = { requestRender: vi.fn() };
    container = document.createElement("div");
    document.body.appendChild(container);

    Element.prototype.setPointerCapture = vi.fn();
    Element.prototype.releasePointerCapture = vi.fn();

    // Import camera class for explicit test instance
    testCamera = new (require("../../viewport/viewportCamera").ViewportCamera)();
  });

  afterEach(() => {
    if (dispose) dispose();
    container.parentNode?.removeChild(container);
    vi.restoreAllMocks();
  });

  it("modern crop image transform propagates to camera state when frame + transform set", async () => {
    const session = WorkspaceManager.createBlankDocument("doc-mc-1", "Doc", 800, 600);
    ws.addDocument(session);
    ws.switchDocument("doc-mc-1");

    const result = render(
      () => (
        <EditorProvider
          workspace={ws}
          renderer={renderer}
          scheduler={scheduler}
          camera={testCamera}
        >
          <TestConsumer />
          <CanvasViewport />
        </EditorProvider>
      ),
      container,
    );
    dispose = result;
    setCropInteractionMode("classic");

    // Enter modern crop mode
    setTool("crop");
    setCropInteractionMode("modern");
    setModernFrameState({ x: 100, y: 100, w: 200, h: 200 });
    setModernImageTransform({ offsetX: 0, offsetY: 0, rotation: 45, scale: 1.5 });
    await new Promise((resolve) => setTimeout(resolve, 0));

    // Camera image transform should reflect modern crop state
    const it = testCamera.getImageTransform();
    expect(it.rotation).toBe(45);
    expect(it.scale).toBe(1.5);
    expect(it.pivotScreen).not.toBeNull();
    expect(it.pivotDocument).not.toBeNull();
    expect(it.pivotDocument?.x).toBe(200); // frame.x + frame.w/2 = 100 + 100
    expect(it.pivotDocument?.y).toBe(200); // frame.y + frame.h/2 = 100 + 100
  });

  it("modern crop exits → camera image transform resets to identity", async () => {
    const session = WorkspaceManager.createBlankDocument("doc-mc-2", "Doc", 800, 600);
    ws.addDocument(session);
    ws.switchDocument("doc-mc-2");

    const result = render(
      () => (
        <EditorProvider
          workspace={ws}
          renderer={renderer}
          scheduler={scheduler}
          camera={testCamera}
        >
          <TestConsumer />
          <CanvasViewport />
        </EditorProvider>
      ),
      container,
    );
    dispose = result;
    setCropInteractionMode("classic");

    // Enter modern crop with transform
    setTool("crop");
    setCropInteractionMode("modern");
    setModernFrameState({ x: 100, y: 100, w: 200, h: 200 });
    setModernImageTransform({ offsetX: 0, offsetY: 0, rotation: 45, scale: 1.5 });
    await new Promise((resolve) => setTimeout(resolve, 0));

    // Verify transform is set
    expect(testCamera.getImageTransform().rotation).toBe(45);

    // Exit modern crop
    setTool("move");
    await new Promise((resolve) => setTimeout(resolve, 0));

    // Camera should be reset
    const it = testCamera.getImageTransform();
    expect(it.rotation).toBe(0);
    expect(it.scale).toBe(1);
    expect(it.pivotScreen).toBeNull();
    expect(it.pivotDocument).toBeNull();
  });

  it("modern crop without frame → camera gets offset+scale but no rotation pivot", async () => {
    const session = WorkspaceManager.createBlankDocument("doc-mc-3", "Doc", 800, 600);
    ws.addDocument(session);
    ws.switchDocument("doc-mc-3");

    const result = render(
      () => (
        <EditorProvider
          workspace={ws}
          renderer={renderer}
          scheduler={scheduler}
          camera={testCamera}
        >
          <TestConsumer />
          <CanvasViewport />
        </EditorProvider>
      ),
      container,
    );
    dispose = result;
    setCropInteractionMode("classic");

    // Enter modern crop but no frame yet
    setTool("crop");
    setCropInteractionMode("modern");
    // Note: no setModernFrameState call
    setModernImageTransform({ offsetX: 25, offsetY: 0, rotation: 0, scale: 2 });
    await new Promise((resolve) => setTimeout(resolve, 0));

    const it = testCamera.getImageTransform();
    expect(it.offsetX).toBe(25);
    expect(it.scale).toBe(2);
    expect(it.rotation).toBe(0); // no rotation without frame
    expect(it.pivotScreen).toBeNull();
    expect(it.pivotDocument).toBeNull();
  });
});
```

- [ ] **Step 3: Verify all new tests pass**

Run: `cd apps/desktop; pnpm.cmd exec vitest run src/components/editor/__tests__/CanvasViewport.test.tsx -t "Modern Crop → Camera Image Transform"`

Expected: 3/3 new tests pass

- [ ] **Step 4: If a test fails, debug**

If "modern crop image transform propagates to camera state" fails:
- Check that `setModernFrameState` and `setModernImageTransform` are exposed in `TestConsumer`
- Check that the SolidJS effect in CanvasViewport runs on signal changes
- Add a `setTimeout(0)` await if the effect needs microtask time

- [ ] **Step 5: Run full test suite to check no regression**

Run: `pnpm.cmd --filter photrez-desktop test --run 2>&1 | Select-Object -Last 5`
Expected: 996/996 tests pass (was 993, +3 new)

- [ ] **Step 6: Commit**

```bash
git add apps/desktop/src/components/editor/__tests__/CanvasViewport.test.tsx
git commit -m "test(canvas): add modern crop → camera image transform integration tests"
```

---

## Task 5: Verify all tests + build + Playwright

**Files:**
- None (verification step)

- [ ] **Step 1: Run full frontend test suite**

Run: `pnpm.cmd --filter photrez-desktop test --run`
Expected: 996/996 tests pass

- [ ] **Step 2: Run production build**

Run: `pnpm.cmd run build`
Expected: tsc + Vite production build succeed

- [ ] **Step 3: Run Playwright E2E tests**

Run: `pnpm.cmd --filter photrez-desktop exec playwright test`
Expected: 19/19 tests pass

- [ ] **Step 4: If anything fails, debug using systematic-debugging skill**

If a test fails:
1. Use the systematic-debugging skill to identify root cause
2. Fix with smallest change
3. Re-run
4. If modern crop is broken in Playwright, use the feature flag to verify the old path still works as fallback

- [ ] **Step 5: No commit needed (all commits per-task)**

Verify git log shows 4 commits for Phase 1:
```
... (Phase 1 commits)
0cc1e63 test(camera): resetImageTransform returns camera-only matrix
```

---

## Self-Review

**1. Spec coverage:**
- §5 B (Modern Crop flow uses camera): covered by Task 2
- §5 D (EditorShell: single render path): covered by Task 3 (with feature flag gate)
- §8 Phase 1 (Migrate Modern Crop to camera): covered by Tasks 1-4
- §11 Feature flag: covered by Task 1
- §12 Verification pipeline: Task 5

**2. Placeholder scan:**
- No TBD, TODO
- All test code is complete
- All implementation code is complete
- Feature flag defaults to `true` (new path) for safety

**3. Type consistency:**
- `useGPUCameraForModernCrop: () => boolean` consistent
- `setUseGPUCameraForModernCrop: (v: boolean) => void` consistent
- `camera.setImageTransform()` signature consistent with Phase 0
- `camera.resetImageTransform()` consistent

**Gaps identified:** None. Phase 2 (remove flag) is a separate phase per spec.

---

## Execution

Recommend inline execution (this session) because:
- 4 tasks, each 2-5 min
- 1 file modified per task (3 code + 1 test)
- Feature flag provides safety net for manual QA
- TDD pattern from Phase 0 worked well — apply same here

**Run inline:** Start with Task 1, proceed sequentially. Pause after Task 5 for user review before Phase 2.
