import { afterEach, describe, expect, it, vi } from "vitest";
import { render } from "solid-js/web";
import { EditorProvider } from "../EditorContext";
import { useEditor } from "../EditorContext";
import { useCanvasKeyboard } from "../useCanvasKeyboard";
import { WorkspaceManager } from "@/engine/workspace";

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

  it("zooms immediately with a stronger keyboard step", async () => {
    const session = WorkspaceManager.createBlankDocument("zoom-keyboard", "Zoom Keyboard", 800, 600);
    const ws = new WorkspaceManager();
    const renderer = { uploadImage: vi.fn(), destroyTexture: vi.fn() };
    const scheduler = { requestRender: vi.fn() };
    const viewport = document.createElement("div");
    viewport.getBoundingClientRect = () => ({
      x: 0,
      y: 0,
      top: 0,
      left: 0,
      right: 1000,
      bottom: 700,
      width: 1000,
      height: 700,
      toJSON: () => ({}),
    });
    const container = document.createElement("div");
    document.body.appendChild(container);
    let editor: any = null;

    const dispose = render(
      () => (
        <EditorProvider workspace={ws} renderer={renderer as any} scheduler={scheduler as any}>
          <ZoomKeyboardHarness
            fitToScreenAndRender={vi.fn()}
            stopMomentum={vi.fn()}
            syncViewport={vi.fn()}
            containerRef={viewport}
            captureEditor={(value) => { editor = value; }}
          />
        </EditorProvider>
      ),
      container,
    );
    ws.addDocument(session);
    await new Promise((resolve) => setTimeout(resolve, 0));

    window.dispatchEvent(new KeyboardEvent("keydown", { key: "=", code: "Equal", ctrlKey: true }));

    expect(editor?.camera.isAnimating()).toBe(false);
    expect(editor?.camera.getState().zoom).toBeCloseTo(1.25);
    expect(editor?.zoom()).toBeCloseTo(1.25);
    expect(scheduler.requestRender).toHaveBeenCalled();

    dispose();
    container.parentNode?.removeChild(container);
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
});
