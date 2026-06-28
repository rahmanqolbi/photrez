import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render } from "solid-js/web";
import { EditorProvider } from "../../shell/EditorContext";
import { useEditor } from "../../shell/EditorContext";
import { useCanvasKeyboard } from "../useCanvasKeyboard";
import { useEditorCommands } from "../../useEditorCommands";
import { WorkspaceManager } from "@/engine/workspace";
import { easeOutCubic } from "@/viewport/easing";

function installOffscreenCanvasMock(bitmap: ImageBitmap) {
  vi.stubGlobal("OffscreenCanvas", class {
    width: number;
    height: number;

    constructor(width: number, height: number) {
      this.width = width;
      this.height = height;
    }

    getContext() {
      return {
        drawImage: vi.fn(),
        save: vi.fn(),
        restore: vi.fn(),
        translate: vi.fn(),
        rotate: vi.fn(),
        scale: vi.fn(),
        set globalAlpha(_value: number) {},
        set globalCompositeOperation(_value: string) {},
      };
    }

    transferToImageBitmap() {
      return bitmap;
    }
  });
}

function KeyboardHarness() {
  useCanvasKeyboard({
    isSpacePressed: () => false,
    setIsSpacePressed: vi.fn(),
    isAltPressed: () => false,
    setIsAltPressed: vi.fn(),
    isPanning: () => false,
    setIsPanning: vi.fn(),
    stopMomentum: vi.fn(),
    fitToScreenAndRender: vi.fn(),
    syncViewport: vi.fn(),
    getCanvasContainerRef: () => undefined,
  });

  return null;
}

function ZoomKeyboardHarness(props: {
  fitToScreenAndRender: (animated?: boolean) => void;
  stopMomentum: () => void;
  syncViewport: () => void;
  containerRef: HTMLDivElement;
  captureEditor: (editor: ReturnType<typeof useEditor>) => void;
}) {
  const editor = useEditor();
  props.captureEditor(editor);
  useCanvasKeyboard({
    isSpacePressed: () => false,
    setIsSpacePressed: vi.fn(),
    isAltPressed: () => false,
    setIsAltPressed: vi.fn(),
    isPanning: () => false,
    setIsPanning: vi.fn(),
    stopMomentum: props.stopMomentum,
    fitToScreenAndRender: props.fitToScreenAndRender,
    syncViewport: props.syncViewport,
    getCanvasContainerRef: () => props.containerRef,
  });

  return null;
}

function renderKeyboardHarness(session: ReturnType<typeof WorkspaceManager.createBlankDocument>) {
  const ws = new WorkspaceManager();
  const renderer = { uploadImage: vi.fn(), destroyTexture: vi.fn() };
  const scheduler = { requestRender: vi.fn() };
  const container = document.createElement("div");
  document.body.appendChild(container);

  const dispose = render(
    () => (
      <EditorProvider workspace={ws} renderer={renderer as any} scheduler={scheduler as any}>
        <KeyboardHarness />
      </EditorProvider>
    ),
    container,
  );

  ws.addDocument(session);

  return {
    ws,
    renderer,
    scheduler,
    dispose: () => {
      dispose();
      container.parentNode?.removeChild(container);
    },
  };
}

describe("canvas layer keyboard shortcuts", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  // ─── Zoom keyboard wiring tests ──────────────────────────────────────────
  // These tests verify that Ctrl+=, Ctrl+-, Ctrl+1, and Ctrl+0 dispatch
  // through useEditorCommands to the real camera.  The camera animation is
  // ticked manually because requestAnimationFrame doesn't run in jsdom.

  /** Harness that mounts both useEditorCommands (zoom shortcuts) and
   *  useCanvasKeyboard (Ctrl+0 fit-to-screen, pan, etc.).  Captures the
   *  editor context so tests can read camera state directly. */
  function ZoomCommandHarness(props: {
    captureEditor: (e: ReturnType<typeof useEditor>) => void;
    fitToScreenAndRender?: (animated?: boolean) => void;
  }) {
    const editor = useEditor();
    props.captureEditor(editor);
    useEditorCommands(() => undefined);
    useCanvasKeyboard({
      isSpacePressed: () => false,
      setIsSpacePressed: vi.fn(),
      isAltPressed: () => false,
      setIsAltPressed: vi.fn(),
      isPanning: () => false,
      setIsPanning: vi.fn(),
      stopMomentum: vi.fn(),
      fitToScreenAndRender: props.fitToScreenAndRender ?? vi.fn(),
      syncViewport: vi.fn(),
      getCanvasContainerRef: () => undefined,
    });
    return null;
  }

  function tickCamera(camera: import("@/viewport/viewportCamera").ViewportCamera): number {
    const startTime = performance.now();
    let iterations = 0;
    while (camera.isAnimating() && iterations < 100) {
      camera.tick(startTime + 300);
      iterations++;
    }
    return iterations;
  }

  it("Ctrl+= triggers zoom-in animation through useEditorCommands", async () => {
    const ws = new WorkspaceManager();
    const session = WorkspaceManager.createBlankDocument("zoom-in-doc", "Zoom In", 800, 600);
    ws.addDocument(session);
    const renderer = { uploadImage: vi.fn(), destroyTexture: vi.fn() };
    const scheduler = { requestRender: vi.fn() };
    const container = document.createElement("div");
    document.body.appendChild(container);
    let captured: ReturnType<typeof useEditor> | undefined;

    const dispose = render(
      () => (
        <EditorProvider workspace={ws} renderer={renderer as any} scheduler={scheduler as any}>
          <ZoomCommandHarness captureEditor={(e) => { captured = e; }} />
        </EditorProvider>
      ),
      container,
    );
    await new Promise((resolve) => setTimeout(resolve, 0));

    const editor = captured!;
    editor.camera.setViewportSize(1000, 700);
    editor.camera.setState({ x: 0, y: 0, zoom: 1 });

    window.dispatchEvent(new KeyboardEvent("keydown", {
      key: "=", ctrlKey: true, bubbles: true,
    }));

    expect(editor.camera.isAnimating()).toBe(true);
    tickCamera(editor.camera);
    expect(editor.camera.isAnimating()).toBe(false);
    expect(editor.camera.getState().zoom).toBeCloseTo(1.25, 2);

    dispose();
  });

  it("Ctrl+- triggers zoom-out animation through useEditorCommands", async () => {
    const ws = new WorkspaceManager();
    const session = WorkspaceManager.createBlankDocument("zoom-out-doc", "Zoom Out", 800, 600);
    ws.addDocument(session);
    const renderer = { uploadImage: vi.fn(), destroyTexture: vi.fn() };
    const scheduler = { requestRender: vi.fn() };
    const container = document.createElement("div");
    document.body.appendChild(container);
    let captured: ReturnType<typeof useEditor> | undefined;

    const dispose = render(
      () => (
        <EditorProvider workspace={ws} renderer={renderer as any} scheduler={scheduler as any}>
          <ZoomCommandHarness captureEditor={(e) => { captured = e; }} />
        </EditorProvider>
      ),
      container,
    );
    await new Promise((resolve) => setTimeout(resolve, 0));

    const editor = captured!;
    editor.camera.setViewportSize(1000, 700);
    editor.camera.setState({ x: 0, y: 0, zoom: 1 });

    window.dispatchEvent(new KeyboardEvent("keydown", {
      key: "-", ctrlKey: true, bubbles: true,
    }));

    expect(editor.camera.isAnimating()).toBe(true);
    tickCamera(editor.camera);
    expect(editor.camera.isAnimating()).toBe(false);
    expect(editor.camera.getState().zoom).toBeCloseTo(0.8, 2);

    dispose();
  });

  it("Ctrl+1 triggers actual-size animation from zoomed state", async () => {
    const ws = new WorkspaceManager();
    const session = WorkspaceManager.createBlankDocument("actual-size-doc", "Actual Size", 800, 600);
    ws.addDocument(session);
    const renderer = { uploadImage: vi.fn(), destroyTexture: vi.fn() };
    const scheduler = { requestRender: vi.fn() };
    const container = document.createElement("div");
    document.body.appendChild(container);
    let captured: ReturnType<typeof useEditor> | undefined;

    const dispose = render(
      () => (
        <EditorProvider workspace={ws} renderer={renderer as any} scheduler={scheduler as any}>
          <ZoomCommandHarness captureEditor={(e) => { captured = e; }} />
        </EditorProvider>
      ),
      container,
    );
    await new Promise((resolve) => setTimeout(resolve, 0));

    const editor = captured!;
    editor.camera.setViewportSize(1000, 700);
    editor.camera.setState({ x: 100, y: 80, zoom: 2.5 });

    window.dispatchEvent(new KeyboardEvent("keydown", {
      key: "1", ctrlKey: true, bubbles: true,
    }));

    expect(editor.camera.isAnimating()).toBe(true);
    tickCamera(editor.camera);
    expect(editor.camera.isAnimating()).toBe(false);
    expect(editor.camera.getState().zoom).toBeCloseTo(1.0, 2);

    dispose();
  });

  it("Ctrl+= still works when a range slider has focus (regression: isEditableTarget)", async () => {
    const ws = new WorkspaceManager();
    const session = WorkspaceManager.createBlankDocument("range-focus-doc", "Range Focus", 800, 600);
    ws.addDocument(session);
    const renderer = { uploadImage: vi.fn(), destroyTexture: vi.fn() };
    const scheduler = { requestRender: vi.fn() };
    const container = document.createElement("div");
    document.body.appendChild(container);
    let captured: ReturnType<typeof useEditor> | undefined;

    const dispose = render(
      () => (
        <EditorProvider workspace={ws} renderer={renderer as any} scheduler={scheduler as any}>
          <ZoomCommandHarness captureEditor={(e) => { captured = e; }} />
        </EditorProvider>
      ),
      container,
    );
    await new Promise((resolve) => setTimeout(resolve, 0));

    const editor = captured!;
    editor.camera.setViewportSize(1000, 700);
    editor.camera.setState({ x: 0, y: 0, zoom: 1 });

    // Place a range input and focus it — simulates the user having just
    // dragged a brightness/opacity slider, leaving focus on the <input>.
    const slider = document.createElement("input");
    slider.type = "range";
    slider.setAttribute("aria-label", "Bright");
    container.appendChild(slider);
    slider.focus();
    expect(document.activeElement).toBe(slider);

    window.dispatchEvent(new KeyboardEvent("keydown", {
      key: "=", ctrlKey: true, bubbles: true,
    }));

    // Zoom must NOT be blocked by isEditableTarget(range input)
    expect(editor.camera.isAnimating()).toBe(true);
    tickCamera(editor.camera);
    expect(editor.camera.getState().zoom).toBeCloseTo(1.25, 2);

    dispose();
  });

  it("rapid Ctrl+= presses only result in final zoom (animation cancel)", async () => {
    const ws = new WorkspaceManager();
    const session = WorkspaceManager.createBlankDocument("rapid-doc", "Rapid Zoom", 800, 600);
    ws.addDocument(session);
    const renderer = { uploadImage: vi.fn(), destroyTexture: vi.fn() };
    const scheduler = { requestRender: vi.fn() };
    const container = document.createElement("div");
    document.body.appendChild(container);
    let captured: ReturnType<typeof useEditor> | undefined;

    const dispose = render(
      () => (
        <EditorProvider workspace={ws} renderer={renderer as any} scheduler={scheduler as any}>
          <ZoomCommandHarness captureEditor={(e) => { captured = e; }} />
        </EditorProvider>
      ),
      container,
    );
    await new Promise((resolve) => setTimeout(resolve, 0));

    const editor = captured!;
    editor.camera.setViewportSize(1000, 700);
    editor.camera.setState({ x: 0, y: 0, zoom: 1 });

    // Three rapid Ctrl+= dispatches (all before tick — each computes
    // from the SAME camera state since animation hasn't started yet)
    window.dispatchEvent(new KeyboardEvent("keydown", {
      key: "=", ctrlKey: true, bubbles: true,
    }));
    window.dispatchEvent(new KeyboardEvent("keydown", {
      key: "=", ctrlKey: true, bubbles: true,
    }));
    window.dispatchEvent(new KeyboardEvent("keydown", {
      key: "=", ctrlKey: true, bubbles: true,
    }));

    // Each dispatch cancels the previous animation (but since no tick
    // has happened, they all compute the same target from zoom=1)
    expect(editor.camera.isAnimating()).toBe(true);
    tickCamera(editor.camera);
    expect(editor.camera.isAnimating()).toBe(false);
    expect(editor.camera.getState().zoom).toBeCloseTo(1.25, 2);

    dispose();
  });

  it("zoom keyboard shortcuts silently ignored when no document is open", async () => {
    const ws = new WorkspaceManager(); // no documents
    const renderer = { uploadImage: vi.fn(), destroyTexture: vi.fn() };
    const scheduler = { requestRender: vi.fn() };
    const container = document.createElement("div");
    document.body.appendChild(container);
    let captured: ReturnType<typeof useEditor> | undefined;

    const dispose = render(
      () => (
        <EditorProvider workspace={ws} renderer={renderer as any} scheduler={scheduler as any}>
          <ZoomCommandHarness captureEditor={(e) => { captured = e; }} />
        </EditorProvider>
      ),
      container,
    );
    await new Promise((resolve) => setTimeout(resolve, 0));

    const editor = captured!;
    editor.camera.setViewportSize(1000, 700);
    editor.camera.setState({ x: 0, y: 0, zoom: 1 });

    // Zoom commands require a document — should be silently ignored
    window.dispatchEvent(new KeyboardEvent("keydown", {
      key: "=", ctrlKey: true, bubbles: true,
    }));
    expect(editor.camera.isAnimating()).toBe(false);
    expect(editor.camera.getState().zoom).toBe(1);

    dispose();
  });

  it("routes Ctrl+0 to instant fit-to-screen", async () => {
    const session = WorkspaceManager.createBlankDocument("fit-keyboard", "Fit Keyboard", 800, 600);
    const ws = new WorkspaceManager();
    const renderer = { uploadImage: vi.fn(), destroyTexture: vi.fn() };
    const scheduler = { requestRender: vi.fn() };
    const viewport = document.createElement("div");
    const fitToScreenAndRender = vi.fn();
    const container = document.createElement("div");
    document.body.appendChild(container);

    const dispose = render(
      () => (
        <EditorProvider workspace={ws} renderer={renderer as any} scheduler={scheduler as any}>
          <ZoomKeyboardHarness
            fitToScreenAndRender={fitToScreenAndRender}
            stopMomentum={vi.fn()}
            syncViewport={vi.fn()}
            containerRef={viewport}
            captureEditor={() => {}}
          />
        </EditorProvider>
      ),
      container,
    );
    ws.addDocument(session);
    await new Promise((resolve) => setTimeout(resolve, 0));

    window.dispatchEvent(new KeyboardEvent("keydown", { key: "0", code: "Digit0", ctrlKey: true }));

    expect(fitToScreenAndRender).toHaveBeenCalledWith(false);

    dispose();
    container.parentNode?.removeChild(container);
  });

  it("merges the active layer down with Ctrl+E", async () => {
    const mergedBitmap = { width: 800, height: 600, close: vi.fn() } as unknown as ImageBitmap;
    installOffscreenCanvasMock(mergedBitmap);

    const session = WorkspaceManager.createBlankDocument("merge-keyboard", "Merge Keyboard", 800, 600);
    const topLayer = session.engine.addLayer("Top");
    session.engine.setActiveLayer(topLayer.id);

    const { ws, renderer, scheduler, dispose } = renderKeyboardHarness(session);
    await new Promise((resolve) => setTimeout(resolve, 0));

    window.dispatchEvent(new KeyboardEvent("keydown", { key: "e", ctrlKey: true }));

    const mergedLayer = session.engine.getLayers()[0];
    expect(session.engine.getLayers()).toHaveLength(1);
    expect(mergedLayer.imageBitmap).toBe(mergedBitmap);
    expect(renderer.destroyTexture).toHaveBeenCalledWith(topLayer.id);
    expect(renderer.uploadImage).toHaveBeenCalledWith(mergedLayer.id, mergedBitmap);
    expect(ws.getActiveHistory()?.canUndo()).toBe(true);
    expect(scheduler.requestRender).toHaveBeenCalled();

    dispose();
  });

  it("flattens all layers with Ctrl+Shift+E", async () => {
    const flattenedBitmap = { width: 800, height: 600, close: vi.fn() } as unknown as ImageBitmap;
    installOffscreenCanvasMock(flattenedBitmap);

    const session = WorkspaceManager.createBlankDocument("flatten-keyboard", "Flatten Keyboard", 800, 600);
    session.engine.addLayer("Layer 2");
    session.engine.addLayer("Layer 3");

    const { ws, renderer, scheduler, dispose } = renderKeyboardHarness(session);
    await new Promise((resolve) => setTimeout(resolve, 0));

    window.dispatchEvent(new KeyboardEvent("keydown", { key: "E", ctrlKey: true, shiftKey: true }));

    const flattenedLayer = session.engine.getLayers()[0];
    expect(session.engine.getLayers()).toHaveLength(1);
    expect(flattenedLayer.imageBitmap).toBe(flattenedBitmap);
    expect(renderer.uploadImage).toHaveBeenCalledWith(flattenedLayer.id, flattenedBitmap);
    expect(ws.getActiveHistory()?.canUndo()).toBe(true);
    expect(scheduler.requestRender).toHaveBeenCalled();

    dispose();
  });

  it("adds a new layer with Ctrl+Shift+N", async () => {
    const session = WorkspaceManager.createBlankDocument("new-layer-keyboard", "New Layer", 800, 600);
    const initialCount = session.engine.getLayers().length;

    const { ws, scheduler, dispose } = renderKeyboardHarness(session);
    await new Promise((resolve) => setTimeout(resolve, 0));

    window.dispatchEvent(new KeyboardEvent("keydown", { key: "N", ctrlKey: true, shiftKey: true }));

    expect(session.engine.getLayers()).toHaveLength(initialCount + 1);
    expect(ws.getActiveHistory()?.canUndo()).toBe(true);
    expect(scheduler.requestRender).toHaveBeenCalled();

    dispose();
  });

  it("moves the active layer up in the stack with Ctrl+]", async () => {
    const session = WorkspaceManager.createBlankDocument("move-up-keyboard", "Move Up", 800, 600);
    const middle = session.engine.addLayer("Middle");
    session.engine.addLayer("Top");
    session.engine.setActiveLayer(middle.id);

    const { ws, scheduler, dispose } = renderKeyboardHarness(session);
    await new Promise((resolve) => setTimeout(resolve, 0));

    const beforeIdx = session.engine.getLayers().findIndex((l) => l.id === middle.id);
    window.dispatchEvent(new KeyboardEvent("keydown", { key: "]", ctrlKey: true }));
    const afterIdx = session.engine.getLayers().findIndex((l) => l.id === middle.id);

    expect(afterIdx).toBe(beforeIdx - 1);
    expect(ws.getActiveHistory()?.canUndo()).toBe(true);
    expect(scheduler.requestRender).toHaveBeenCalled();

    dispose();
  });

  it("moves the active layer down in the stack with Ctrl+[", async () => {
    const session = WorkspaceManager.createBlankDocument("move-down-keyboard", "Move Down", 800, 600);
    const middle = session.engine.addLayer("Middle");
    session.engine.addLayer("Top");
    session.engine.setActiveLayer(middle.id);

    const { ws, scheduler, dispose } = renderKeyboardHarness(session);
    await new Promise((resolve) => setTimeout(resolve, 0));

    const beforeIdx = session.engine.getLayers().findIndex((l) => l.id === middle.id);
    window.dispatchEvent(new KeyboardEvent("keydown", { key: "[", ctrlKey: true }));
    const afterIdx = session.engine.getLayers().findIndex((l) => l.id === middle.id);

    expect(afterIdx).toBe(beforeIdx + 1);
    expect(ws.getActiveHistory()?.canUndo()).toBe(true);
    expect(scheduler.requestRender).toHaveBeenCalled();

    dispose();
  });

  it("flips the active layer horizontally with Ctrl+G", async () => {
    const session = WorkspaceManager.createBlankDocument("flip-h-keyboard", "Flip H", 800, 600);
    const layer = session.engine.addLayer("Top");
    session.engine.setActiveLayer(layer.id);
    const initialFlipH = layer.transform.flipH;

    const { ws, scheduler, dispose } = renderKeyboardHarness(session);
    await new Promise((resolve) => setTimeout(resolve, 0));

    window.dispatchEvent(new KeyboardEvent("keydown", { key: "g", ctrlKey: true }));

    expect(session.engine.getLayer(layer.id)?.transform.flipH).toBe(!initialFlipH);
    expect(session.engine.getLayer(layer.id)?.transform.flipV).toBe(false);
    expect(ws.getActiveHistory()?.canUndo()).toBe(true);
    expect(scheduler.requestRender).toHaveBeenCalled();

    dispose();
  });

  it("flips the active layer vertically with Ctrl+Shift+G", async () => {
    const session = WorkspaceManager.createBlankDocument("flip-v-keyboard", "Flip V", 800, 600);
    const layer = session.engine.addLayer("Top");
    session.engine.setActiveLayer(layer.id);
    const initialFlipV = layer.transform.flipV;

    const { ws, scheduler, dispose } = renderKeyboardHarness(session);
    await new Promise((resolve) => setTimeout(resolve, 0));

    window.dispatchEvent(new KeyboardEvent("keydown", { key: "G", ctrlKey: true, shiftKey: true }));

    expect(session.engine.getLayer(layer.id)?.transform.flipV).toBe(!initialFlipV);
    expect(session.engine.getLayer(layer.id)?.transform.flipH).toBe(false);
    expect(ws.getActiveHistory()?.canUndo()).toBe(true);
    expect(scheduler.requestRender).toHaveBeenCalled();

    dispose();
  });

  it("deletes the active layer with Delete key", async () => {
    const session = WorkspaceManager.createBlankDocument("delete-keyboard", "Delete", 800, 600);
    const top = session.engine.addLayer("Top");
    session.engine.setActiveLayer(top.id);
    const initialCount = session.engine.getLayers().length;

    const { ws, scheduler, dispose } = renderKeyboardHarness(session);
    await new Promise((resolve) => setTimeout(resolve, 0));

    window.dispatchEvent(new KeyboardEvent("keydown", { key: "Delete" }));

    expect(session.engine.getLayers()).toHaveLength(initialCount - 1);
    expect(session.engine.getLayer(top.id)).toBeUndefined();
    expect(ws.getActiveHistory()?.canUndo()).toBe(true);
    expect(scheduler.requestRender).toHaveBeenCalled();

    dispose();
  });

  it("deletes the active layer with Backspace key", async () => {
    const session = WorkspaceManager.createBlankDocument("backspace-keyboard", "Backspace", 800, 600);
    const top = session.engine.addLayer("Top");
    session.engine.setActiveLayer(top.id);
    const initialCount = session.engine.getLayers().length;

    const { dispose } = renderKeyboardHarness(session);
    await new Promise((resolve) => setTimeout(resolve, 0));

    window.dispatchEvent(new KeyboardEvent("keydown", { key: "Backspace" }));

    expect(session.engine.getLayers()).toHaveLength(initialCount - 1);
    expect(session.engine.getLayer(top.id)).toBeUndefined();

    dispose();
  });

  it("does not delete the only remaining layer", async () => {
    const session = WorkspaceManager.createBlankDocument("delete-last-keyboard", "Delete Last", 800, 600);
    const onlyId = session.engine.getActiveLayerId()!;

    const { dispose } = renderKeyboardHarness(session);
    await new Promise((resolve) => setTimeout(resolve, 0));

    window.dispatchEvent(new KeyboardEvent("keydown", { key: "Delete" }));

    expect(session.engine.getLayers()).toHaveLength(1);
    expect(session.engine.getLayer(onlyId)).toBeDefined();

    dispose();
  });

  it("sets active layer opacity to 50% with digit 5", async () => {
    const session = WorkspaceManager.createBlankDocument("opacity-keyboard", "Opacity", 800, 600);
    const layer = session.engine.addLayer("Top");
    session.engine.setActiveLayer(layer.id);

    const { ws, scheduler, dispose } = renderKeyboardHarness(session);
    await new Promise((resolve) => setTimeout(resolve, 0));

    window.dispatchEvent(new KeyboardEvent("keydown", { key: "5" }));

    expect(session.engine.getLayer(layer.id)?.opacity).toBeCloseTo(0.5);
    expect(ws.getActiveHistory()?.canUndo()).toBe(true);
    expect(scheduler.requestRender).toHaveBeenCalled();

    dispose();
  });

  it("sets active layer opacity to 100% with digit 0", async () => {
    const session = WorkspaceManager.createBlankDocument("opacity-0-keyboard", "Opacity 0", 800, 600);
    const layer = session.engine.addLayer("Top");
    session.engine.setActiveLayer(layer.id);
    session.engine.setLayerOpacity(layer.id, 0.3);

    const { dispose } = renderKeyboardHarness(session);
    await new Promise((resolve) => setTimeout(resolve, 0));

    window.dispatchEvent(new KeyboardEvent("keydown", { key: "0" }));

    expect(session.engine.getLayer(layer.id)?.opacity).toBeCloseTo(1.0);

    dispose();
  });

  it("does not commit history when pressing the same opacity digit twice", async () => {
    const session = WorkspaceManager.createBlankDocument("opacity-noop", "Opacity NoOp", 800, 600);
    const layer = session.engine.addLayer("Top");
    session.engine.setActiveLayer(layer.id);
    session.engine.setLayerOpacity(layer.id, 0.5);

    const { ws, dispose } = renderKeyboardHarness(session);
    await new Promise((resolve) => setTimeout(resolve, 0));

    window.dispatchEvent(new KeyboardEvent("keydown", { key: "5" }));

    expect(session.engine.getLayer(layer.id)?.opacity).toBeCloseTo(0.5);
    expect(ws.getActiveHistory()?.canUndo()).toBe(false);
    expect(ws.getActiveHistory()?.getUndoCount()).toBe(0);

    dispose();
  });

  it("commits when pressing a different opacity digit but skips on repeat", async () => {
    const session = WorkspaceManager.createBlankDocument("opacity-mixed", "Opacity Mixed", 800, 600);
    const layer = session.engine.addLayer("Top");
    session.engine.setActiveLayer(layer.id);
    session.engine.setLayerOpacity(layer.id, 0.5);

    const { ws, dispose } = renderKeyboardHarness(session);
    await new Promise((resolve) => setTimeout(resolve, 0));

    window.dispatchEvent(new KeyboardEvent("keydown", { key: "5" }));
    expect(ws.getActiveHistory()?.getUndoCount()).toBe(0);

    window.dispatchEvent(new KeyboardEvent("keydown", { key: "7" }));
    expect(session.engine.getLayer(layer.id)?.opacity).toBeCloseTo(0.7);
    expect(ws.getActiveHistory()?.getUndoCount()).toBe(1);

    window.dispatchEvent(new KeyboardEvent("keydown", { key: "7" }));
    expect(ws.getActiveHistory()?.getUndoCount()).toBe(1);

    dispose();
  });
});
