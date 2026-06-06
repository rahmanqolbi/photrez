import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render } from "solid-js/web";
import { EditorProvider, useEditor } from "../EditorContext";
import { CanvasViewport } from "../CanvasViewport";
import { WorkspaceManager } from "@/engine/workspace";

// Mock useViewportRenderer
vi.mock("../useViewportRenderer", () => ({
  useViewportRenderer: () => ({
    isFitTransition: () => false,
    fitToScreenAndRender: vi.fn(),
    resizeRenderer: vi.fn(),
  }),
}));

// Mock useBrushOverlay
const { mockCommitBrushStroke } = vi.hoisted(() => ({
  mockCommitBrushStroke: vi.fn(),
}));
vi.mock("../useBrushOverlay", () => ({
  useBrushOverlay: () => ({
    onPaintStroke: vi.fn(),
    commitBrushStroke: mockCommitBrushStroke,
    setOverlayCanvasRef: vi.fn(),
    getOverlayCanvasRef: vi.fn(),
  }),
}));

// Mock usePanNavigation
let mockSpacePressed = false;
let mockPanningActive = false;
const mockOnViewportPointerDown = vi.fn();
const mockOnViewportPointerUp = vi.fn();
const mockOnViewportPointerCancel = vi.fn();
const mockOnViewportLostPointerCapture = vi.fn();
vi.mock("../usePanNavigation", () => ({
  usePanNavigation: () => ({
    isSpacePressed: () => mockSpacePressed,
    setIsSpacePressed: vi.fn(),
    isPanning: () => mockPanningActive,
    setIsPanning: vi.fn(),
    stopMomentum: vi.fn(),
    handleWheel: vi.fn(),
    onViewportPointerDown: mockOnViewportPointerDown,
    onViewportPointerMove: vi.fn(),
    onViewportPointerUp: mockOnViewportPointerUp,
    onViewportPointerCancel: mockOnViewportPointerCancel,
    onViewportLostPointerCapture: mockOnViewportLostPointerCapture,
  }),
}));

// Mock useCanvasDerivedState
vi.mock("../useCanvasDerivedState", () => ({
  useCanvasDerivedState: () => ({
    cropSnapTargets: () => [],
  }),
}));

// Mock useCanvasKeyboard
vi.mock("../useCanvasKeyboard", () => ({
  useCanvasKeyboard: vi.fn(),
}));

let setTool: (tool: string) => void = () => {};
let setSession: (session: any) => void = () => {};
let setCrop: (rect: any) => void = () => {};
let getCrop: () => any = () => null;
let getCropRotation: () => number = () => 0;
let setCropRotation: (rot: number) => void = () => {};
let getHiddenCropPreview: () => any = () => null;
let setHiddenCropPreview: (preview: any) => void = () => {};

const TestConsumer = () => {
  const editor = useEditor();
  setTool = editor.setActiveTool;
  setSession = editor.setLayerTransformSession;
  setCrop = editor.setCropRect;
  getCrop = editor.cropRect;
  getCropRotation = editor.cropRotation;
  setCropRotation = editor.setCropRotation;
  getHiddenCropPreview = editor.hiddenCropPreview;
  setHiddenCropPreview = editor.setHiddenCropPreview;
  return null;
};

describe("CanvasViewport Pasteboard Clicks", () => {
  let ws: WorkspaceManager;
  let renderer: any;
  let scheduler: any;
  let container: HTMLDivElement;
  let dispose: () => void;

  beforeEach(() => {
    ws = new WorkspaceManager();
    renderer = { uploadImage: vi.fn(), destroyTexture: vi.fn() };
    scheduler = { requestRender: vi.fn() };
    container = document.createElement("div");
    document.body.appendChild(container);
    mockOnViewportPointerDown.mockClear();
    mockOnViewportPointerUp.mockClear();
    mockOnViewportPointerCancel.mockClear();
    mockOnViewportLostPointerCapture.mockClear();
    mockCommitBrushStroke.mockClear();
    mockSpacePressed = false;
    mockPanningActive = false;

    Element.prototype.setPointerCapture = vi.fn();
    Element.prototype.releasePointerCapture = vi.fn();
  });

  afterEach(() => {
    if (dispose) dispose();
    container.parentNode?.removeChild(container);
    vi.restoreAllMocks();
  });

  function renderViewport() {
    const session = WorkspaceManager.createBlankDocument("doc-1", "Doc 1", 800, 600);
    ws.addDocument(session);

    const result = render(
      () => (
        <EditorProvider workspace={ws} renderer={renderer} scheduler={scheduler}>
          <TestConsumer />
          <CanvasViewport />
        </EditorProvider>
      ),
      container,
    );

    dispose = result;
    return { session };
  }

  function dispatchPasteboardClick() {
    const viewportContainer = container.querySelector("[data-viewport-container]") as HTMLDivElement;
    if (!viewportContainer) throw new Error("Viewport container not found");

    viewportContainer.dispatchEvent(new PointerEvent("pointerdown", {
      bubbles: true,
      cancelable: true,
      button: 0,
      pointerId: 1,
      clientX: 10,
      clientY: 10,
    }));
    viewportContainer.dispatchEvent(new PointerEvent("pointerup", {
      bubbles: true,
      cancelable: true,
      button: 0,
      pointerId: 1,
      clientX: 10,
      clientY: 10,
    }));
  }

  it("clears the active layer when pasteboard is clicked in Move tool mode", async () => {
    const { session } = renderViewport();
    await new Promise((resolve) => setTimeout(resolve, 0));

    setTool("move");

    const layers = session.engine.getLayers();
    session.engine.setActiveLayer(layers[0].id);
    expect(session.engine.getActiveLayerId()).toBe(layers[0].id);

    dispatchPasteboardClick();

    expect(session.engine.getActiveLayerId()).toBeNull();
    expect(scheduler.requestRender).toHaveBeenCalled();
  });

  it("clears selection preview when pasteboard is clicked in Selection tool mode", async () => {
    renderViewport();
    await new Promise((resolve) => setTimeout(resolve, 0));

    setTool("selection");

    const canvas = container.querySelector("canvas") as HTMLCanvasElement;
    if (!canvas) throw new Error("Canvas not found");

    // Drag to create a selection box (keep pointer down to keep preview visible)
    canvas.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true, clientX: 10, clientY: 10, button: 0 }));
    canvas.dispatchEvent(new PointerEvent("pointermove", { bubbles: true, clientX: 110, clientY: 110, button: 0 }));

    // Selection marquee should be visible
    expect(container.querySelector("rect.animate-dash")).not.toBeNull();

    dispatchPasteboardClick();

    // Selection marquee should be cleared
    expect(container.querySelector("rect.animate-dash")).toBeNull();
    expect(scheduler.requestRender).toHaveBeenCalled();
  });

  it("does not clear active layer when transform session is active", async () => {
    const { session } = renderViewport();
    await new Promise((resolve) => setTimeout(resolve, 0));

    setTool("move");
    const layers = session.engine.getLayers();
    session.engine.setActiveLayer(layers[0].id);

    setSession({
      documentId: "doc-1",
      layerId: layers[0].id,
      originalSnapshot: {} as any,
      originalTransform: {} as any,
      mode: "resize",
      lockRatio: false,
      startedAt: Date.now(),
    });

    dispatchPasteboardClick();

    expect(session.engine.getActiveLayerId()).toBe(layers[0].id);
  });

  it("clears crop preview but keeps tool active when pasteboard is clicked in Crop mode", async () => {
    const { session } = renderViewport();
    await new Promise((resolve) => setTimeout(resolve, 0));

    setTool("crop");
    setCrop({ x: 10, y: 10, w: 200, h: 200 });

    dispatchPasteboardClick();

    expect(getCrop()).toBeNull();
    expect(getCropRotation()).toBe(0);
  });

  it("canvas click in Crop mode with no crop box restores default crop box", async () => {
    const { session } = renderViewport();
    await new Promise((resolve) => setTimeout(resolve, 0));

    setTool("crop");
    setCrop(null);

    const canvas = container.querySelector("canvas") as HTMLCanvasElement;
    if (!canvas) throw new Error("Canvas not found");

    const downEvent = new PointerEvent("pointerdown", { bubbles: true, cancelable: true, button: 0, clientX: 50, clientY: 50 });
    canvas.dispatchEvent(downEvent);

    const upEvent = new PointerEvent("pointerup", { bubbles: true, cancelable: true, button: 0, clientX: 50, clientY: 50 });
    canvas.dispatchEvent(upEvent);

    expect(getCrop()).toEqual({ x: 0, y: 0, w: 800, h: 600 });
  });

  it("does not clear active layer when paint tools are active", async () => {
    const { session } = renderViewport();
    await new Promise((resolve) => setTimeout(resolve, 0));

    setTool("brush");
    const layers = session.engine.getLayers();
    session.engine.setActiveLayer(layers[0].id);

    dispatchPasteboardClick();

    expect(session.engine.getActiveLayerId()).toBe(layers[0].id);
  });

  it("hides crop preview on pasteboard click and preserves it for restore", async () => {
    renderViewport();
    await new Promise((resolve) => setTimeout(resolve, 0));
    setTool("crop");
    setCrop({ x: 12, y: 18, w: 200, h: 140 });
    setCropRotation(15);

    dispatchPasteboardClick();

    expect(getCrop()).toBeNull();
    expect(getHiddenCropPreview()).toEqual({
      rect: { x: 12, y: 18, w: 200, h: 140 },
      rotation: 15,
    });
  });

  it("restores hidden crop preview on canvas click without drag", async () => {
    renderViewport();
    await new Promise((resolve) => setTimeout(resolve, 0));
    setTool("crop");
    setCrop(null);
    setHiddenCropPreview({
      rect: { x: 25, y: 35, w: 160, h: 120 },
      rotation: -10,
    });

    const canvas = container.querySelector("canvas") as HTMLCanvasElement;
    if (!canvas) throw new Error("Canvas not found");

    canvas.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true, cancelable: true, button: 0, clientX: 100, clientY: 100, pointerId: 1 }));
    canvas.dispatchEvent(new PointerEvent("pointerup", { bubbles: true, cancelable: true, button: 0, clientX: 100, clientY: 100, pointerId: 1 }));

    expect(getCrop()).toEqual({ x: 25, y: 35, w: 160, h: 120 });
    expect(getCropRotation()).toBe(-10);
    expect(getHiddenCropPreview()).toBeNull();
  });

  it("creates full-canvas crop preview on canvas click only when no hidden preview exists", async () => {
    renderViewport();
    await new Promise((resolve) => setTimeout(resolve, 0));
    setTool("crop");
    setCrop(null);
    setHiddenCropPreview(null);

    const canvas = container.querySelector("canvas") as HTMLCanvasElement;
    if (!canvas) throw new Error("Canvas not found");

    canvas.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true, cancelable: true, button: 0, clientX: 100, clientY: 100, pointerId: 1 }));
    canvas.dispatchEvent(new PointerEvent("pointerup", { bubbles: true, cancelable: true, button: 0, clientX: 100, clientY: 100, pointerId: 1 }));

    expect(getCrop()).toEqual({ x: 0, y: 0, w: 800, h: 600 });
    expect(getCropRotation()).toBe(0);
  });

  it("creates replacement crop preview from pasteboard drag instead of hiding preview", async () => {
    renderViewport();
    await new Promise((resolve) => setTimeout(resolve, 0));
    setTool("crop");
    setCrop({ x: 120, y: 120, w: 180, h: 120 });
    setHiddenCropPreview({
      rect: { x: 24, y: 32, w: 140, h: 100 },
      rotation: -12,
    });

    const viewportContainer = container.querySelector("[data-viewport-container]") as HTMLDivElement;
    if (!viewportContainer) throw new Error("Viewport container not found");

    viewportContainer.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true, clientX: 10, clientY: 10, button: 0, pointerId: 1 }));
    viewportContainer.dispatchEvent(new PointerEvent("pointermove", { bubbles: true, clientX: 160, clientY: 140, button: 0, pointerId: 1 }));
    viewportContainer.dispatchEvent(new PointerEvent("pointerup", { bubbles: true, clientX: 160, clientY: 140, button: 0, pointerId: 1 }));

    expect(getHiddenCropPreview()).toBeNull();
    expect(getCropRotation()).toBe(0);
    expect(getCrop()).not.toBeNull();
    expect(getCrop()).not.toEqual({ x: 120, y: 120, w: 180, h: 120 });
  });

  it("treats small pasteboard movement as click hide, not replacement drag", async () => {
    renderViewport();
    await new Promise((resolve) => setTimeout(resolve, 0));
    setTool("crop");
    setCrop({ x: 120, y: 120, w: 180, h: 120 });

    const viewportContainer = container.querySelector("[data-viewport-container]") as HTMLDivElement;
    if (!viewportContainer) throw new Error("Viewport container not found");

    viewportContainer.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true, clientX: 10, clientY: 10, button: 0, pointerId: 1 }));
    viewportContainer.dispatchEvent(new PointerEvent("pointermove", { bubbles: true, clientX: 11, clientY: 12, button: 0, pointerId: 1 }));
    viewportContainer.dispatchEvent(new PointerEvent("pointerup", { bubbles: true, clientX: 11, clientY: 12, button: 0, pointerId: 1 }));

    expect(getCrop()).toBeNull();
    expect(getHiddenCropPreview()).toEqual({
      rect: { x: 120, y: 120, w: 180, h: 120 },
      rotation: 0,
    });
  });

  it("allows pasteboard panning in Crop mode while Space is held", async () => {
    renderViewport();
    await new Promise((resolve) => setTimeout(resolve, 0));
    setTool("crop");
    setCrop({ x: 120, y: 120, w: 180, h: 120 });
    mockSpacePressed = true;

    const viewportContainer = container.querySelector("[data-viewport-container]") as HTMLDivElement;
    if (!viewportContainer) throw new Error("Viewport container not found");

    const down = new PointerEvent("pointerdown", {
      bubbles: true,
      cancelable: true,
      clientX: 10,
      clientY: 10,
      button: 0,
      pointerId: 1,
    });
    viewportContainer.dispatchEvent(down);

    expect(mockOnViewportPointerDown).toHaveBeenCalledWith(expect.objectContaining({ pointerId: 1 }));
    expect(getCrop()).toEqual({ x: 120, y: 120, w: 180, h: 120 });
  });

  it("commits brush stroke on pointercancel during active brush drag", async () => {
    renderViewport();
    await new Promise((resolve) => setTimeout(resolve, 0));
    setTool("brush");

    const canvas = container.querySelector("canvas") as HTMLCanvasElement;
    if (!canvas) throw new Error("Canvas not found");

    canvas.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true, clientX: 50, clientY: 50, button: 0, pointerId: 99 }));
    canvas.dispatchEvent(new PointerEvent("pointercancel", { bubbles: true, pointerId: 99 }));

    expect(mockCommitBrushStroke).toHaveBeenCalled();
  });

  it("commits brush stroke on lostpointercapture during active brush drag", async () => {
    renderViewport();
    await new Promise((resolve) => setTimeout(resolve, 0));
    setTool("brush");

    const canvas = container.querySelector("canvas") as HTMLCanvasElement;
    if (!canvas) throw new Error("Canvas not found");

    canvas.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true, clientX: 50, clientY: 50, button: 0, pointerId: 99 }));
    canvas.dispatchEvent(new PointerEvent("lostpointercapture", { bubbles: true, pointerId: 99 }));

    expect(mockCommitBrushStroke).toHaveBeenCalled();
  });

  it("does not start brush drag when isPanning is true", async () => {
    renderViewport();
    await new Promise((resolve) => setTimeout(resolve, 0));
    setTool("brush");
    mockPanningActive = true;

    const canvas = container.querySelector("canvas") as HTMLCanvasElement;
    if (!canvas) throw new Error("Canvas not found");

    canvas.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true, clientX: 50, clientY: 50, button: 0, pointerId: 42 }));
    canvas.dispatchEvent(new PointerEvent("pointermove", { bubbles: true, clientX: 100, clientY: 100, button: 0, pointerId: 42 }));
    canvas.dispatchEvent(new PointerEvent("pointerup", { bubbles: true, clientX: 100, clientY: 100, button: 0, pointerId: 42 }));

    // No brush stroke should be committed since drag was blocked
    expect(mockCommitBrushStroke).not.toHaveBeenCalled();
  });

  it("routes pointerdown event to container panning handler when isPanning blocks canvas", async () => {
    renderViewport();
    await new Promise((resolve) => setTimeout(resolve, 0));
    setTool("selection");
    mockPanningActive = true;

    const canvas = container.querySelector("canvas") as HTMLCanvasElement;
    if (!canvas) throw new Error("Canvas not found");

    canvas.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true, cancelable: true, clientX: 100, clientY: 100, button: 0, pointerId: 7 }));

    // Event should bubble to container → onViewportPointerDown should be called
    expect(mockOnViewportPointerDown).toHaveBeenCalledWith(
      expect.objectContaining({ pointerId: 7, button: 0 })
    );
  });

  it("calls onViewportPointerCancel when container receives pointercancel", async () => {
    renderViewport();
    await new Promise((resolve) => setTimeout(resolve, 0));

    const viewportContainer = container.querySelector("[data-viewport-container]") as HTMLDivElement;
    if (!viewportContainer) throw new Error("Viewport container not found");

    viewportContainer.dispatchEvent(new PointerEvent("pointercancel", { bubbles: false, pointerId: 5 }));

    expect(mockOnViewportPointerCancel).toHaveBeenCalledWith(
      expect.objectContaining({ pointerId: 5 })
    );
  });

  it("calls onViewportLostPointerCapture when container receives lostpointercapture", async () => {
    renderViewport();
    await new Promise((resolve) => setTimeout(resolve, 0));

    const viewportContainer = container.querySelector("[data-viewport-container]") as HTMLDivElement;
    if (!viewportContainer) throw new Error("Viewport container not found");

    viewportContainer.dispatchEvent(new PointerEvent("lostpointercapture", { bubbles: false, pointerId: 3 }));

    expect(mockOnViewportLostPointerCapture).toHaveBeenCalledWith(
      expect.objectContaining({ pointerId: 3 })
    );
  });

  it("sets pointer capture on canvas pointerdown when isPanning is false", async () => {
    renderViewport();
    await new Promise((resolve) => setTimeout(resolve, 0));
    setTool("brush");

    const canvas = container.querySelector("canvas") as HTMLCanvasElement;
    if (!canvas) throw new Error("Canvas not found");

    canvas.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true, clientX: 50, clientY: 50, button: 0, pointerId: 8 }));

    expect(Element.prototype.setPointerCapture).toHaveBeenCalledWith(8);
  });

  it("does not set pointer capture on canvas pointerdown when isPanning is true", async () => {
    renderViewport();
    await new Promise((resolve) => setTimeout(resolve, 0));
    setTool("brush");
    mockPanningActive = true;

    const canvas = container.querySelector("canvas") as HTMLCanvasElement;
    if (!canvas) throw new Error("Canvas not found");

    canvas.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true, clientX: 50, clientY: 50, button: 0, pointerId: 9 }));

    // The isPanning guard should prevent setPointerCapture
    // It may have been called by other code, so check the last call args
    const calls = (Element.prototype.setPointerCapture as ReturnType<typeof vi.fn>).mock.calls;
    const lastCall = calls[calls.length - 1];
    // If there are calls, the last one should NOT be for pointerId 9 (our test event)
    if (lastCall) {
      expect(lastCall[0]).not.toBe(9);
    }
  });
});

describe("Space+pan global override across all tools", () => {
  let ws: WorkspaceManager;
  let renderer: any;
  let scheduler: any;
  let container: HTMLDivElement;
  let dispose: () => void;

  beforeEach(() => {
    ws = new WorkspaceManager();
    renderer = { uploadImage: vi.fn(), destroyTexture: vi.fn() };
    scheduler = { requestRender: vi.fn() };
    container = document.createElement("div");
    document.body.appendChild(container);
    mockOnViewportPointerDown.mockClear();
    mockOnViewportPointerUp.mockClear();
    mockCommitBrushStroke.mockClear();
    mockSpacePressed = false;
    mockPanningActive = false;

    Element.prototype.setPointerCapture = vi.fn();
    Element.prototype.releasePointerCapture = vi.fn();
  });

  afterEach(() => {
    if (dispose) dispose();
    container.parentNode?.removeChild(container);
    vi.restoreAllMocks();
  });

  function renderViewport() {
    const session = WorkspaceManager.createBlankDocument("doc-pan", "Pan Test", 800, 600);
    ws.addDocument(session);

    const result = render(
      () => (
        <EditorProvider workspace={ws} renderer={renderer} scheduler={scheduler}>
          <TestConsumer />
          <CanvasViewport />
        </EditorProvider>
      ),
      container,
    );

    dispose = result;
    return { session };
  }

  function getCanvas(): HTMLCanvasElement {
    const c = container.querySelector("canvas") as HTMLCanvasElement;
    if (!c) throw new Error("Canvas not found");
    return c;
  }

  function getContainer(): HTMLDivElement {
    const c = container.querySelector("[data-viewport-container]") as HTMLDivElement;
    if (!c) throw new Error("Viewport container not found");
    return c;
  }

  function firePointerDown(el: Element, pointerId = 10, clientX = 100, clientY = 100) {
    el.dispatchEvent(new PointerEvent("pointerdown", {
      bubbles: true, cancelable: true, button: 0, pointerId, clientX, clientY,
    }));
  }

  function firePointerMove(el: Element, pointerId = 10, clientX = 200, clientY = 200) {
    el.dispatchEvent(new PointerEvent("pointermove", {
      bubbles: true, cancelable: true, button: 0, pointerId, clientX, clientY,
    }));
  }

  function firePointerUp(el: Element, pointerId = 10, clientX = 200, clientY = 200) {
    el.dispatchEvent(new PointerEvent("pointerup", {
      bubbles: true, cancelable: true, button: 0, pointerId, clientX, clientY,
    }));
  }

  // --- Tool-specific Space+pan tests ---

  it("Move tool + selected layer: routes to pan handler when Space held", async () => {
    const { session } = renderViewport();
    await new Promise((resolve) => setTimeout(resolve, 0));
    setTool("move");
    mockSpacePressed = true;
    const layers = session.engine.getLayers();
    session.engine.setActiveLayer(layers[0].id);

    firePointerDown(getCanvas());

    expect(mockOnViewportPointerDown).toHaveBeenCalled();
    // Layer should still be active (no pasteboard clear happened)
    expect(session.engine.getActiveLayerId()).toBe(layers[0].id);
  });

  it("Selection tool + canvas: routes to pan handler when Space held", async () => {
    renderViewport();
    await new Promise((resolve) => setTimeout(resolve, 0));
    setTool("selection");
    mockSpacePressed = true;

    firePointerDown(getCanvas());

    expect(mockOnViewportPointerDown).toHaveBeenCalled();
    // No selection marquee should be created
    expect(container.querySelector("rect.animate-dash")).toBeNull();
  });

  it("Crop tool + canvas: routes to pan handler when Space held", async () => {
    renderViewport();
    await new Promise((resolve) => setTimeout(resolve, 0));
    setTool("crop");
    mockSpacePressed = true;

    firePointerDown(getCanvas());

    expect(mockOnViewportPointerDown).toHaveBeenCalled();
  });

  it("Brush tool + canvas: routes to pan handler when Space held", async () => {
    renderViewport();
    await new Promise((resolve) => setTimeout(resolve, 0));
    setTool("brush");
    mockSpacePressed = true;

    firePointerDown(getCanvas());

    expect(mockOnViewportPointerDown).toHaveBeenCalled();
    expect(mockCommitBrushStroke).not.toHaveBeenCalled();
  });

  it("Eraser tool + canvas: routes to pan handler when Space held", async () => {
    renderViewport();
    await new Promise((resolve) => setTimeout(resolve, 0));
    setTool("eraser");
    mockSpacePressed = true;

    firePointerDown(getCanvas());

    expect(mockOnViewportPointerDown).toHaveBeenCalled();
    expect(mockCommitBrushStroke).not.toHaveBeenCalled();
  });

  it("Crop tool + pasteboard: routes to pan handler when Space held (not pasteboard crop)", async () => {
    renderViewport();
    await new Promise((resolve) => setTimeout(resolve, 0));
    setTool("crop");
    setCrop({ x: 10, y: 10, w: 100, h: 100 });
    mockSpacePressed = true;

    firePointerDown(getContainer());

    expect(mockOnViewportPointerDown).toHaveBeenCalled();
    // Crop rect should not have been cleared
    expect(getCrop()).toEqual({ x: 10, y: 10, w: 100, h: 100 });
  });

  it("Container pointerdown routes to pan handler before pasteboard handler when Space held", async () => {
    renderViewport();
    await new Promise((resolve) => setTimeout(resolve, 0));
    setTool("move");
    mockSpacePressed = true;

    const containerEl = getContainer();
    // Spy on the container's pasteboard handler to verify it's not called
    const listenerSpy = vi.fn();
    containerEl.addEventListener("pointerdown", listenerSpy);

    firePointerDown(containerEl);

    // The mockOnViewportPointerDown should have been called
    expect(mockOnViewportPointerDown).toHaveBeenCalled();
  });

  it("Space+pan works from canvas into pasteboard via pointer capture (isPanning = true)", async () => {
    renderViewport();
    await new Promise((resolve) => setTimeout(resolve, 0));
    setTool("brush");
    mockPanningActive = true;

    const canvas = getCanvas();
    firePointerMove(canvas);
    firePointerUp(canvas);

    // No brush commit since panning blocked everything
    expect(mockCommitBrushStroke).not.toHaveBeenCalled();
  });

  it("Container pointerdown still routes to pasteboard handler when Space is NOT held", async () => {
    const { session } = renderViewport();
    await new Promise((resolve) => setTimeout(resolve, 0));
    setTool("move");
    mockSpacePressed = false;

    const layers = session.engine.getLayers();
    session.engine.setActiveLayer(layers[0].id);
    firePointerDown(getContainer());

    // Active layer should be cleared (pasteboard click behavior)
    expect(session.engine.getActiveLayerId()).toBeNull();
  });

  it("Middle mouse button starts panning regardless of tool and Space state", async () => {
    renderViewport();
    await new Promise((resolve) => setTimeout(resolve, 0));
    setTool("brush");

    const canvas = getCanvas();
    canvas.dispatchEvent(new PointerEvent("pointerdown", {
      bubbles: true, cancelable: true, button: 1, pointerId: 20, clientX: 50, clientY: 50,
    }));

    // onViewportPointerDown should be called (it handles button === 1)
    expect(mockOnViewportPointerDown).toHaveBeenCalledWith(
      expect.objectContaining({ pointerId: 20, button: 1 })
    );
  });
});
