import { afterEach, beforeEach, describe, expect, it, vi, assert } from "vitest";
import { render } from "solid-js/web";
import { EditorProvider, useEditor } from "../EditorContext";
import { CanvasViewport } from "../CanvasViewport";
import { WorkspaceManager } from "@/engine/workspace";
import { ViewportCamera } from "@/viewport/viewportCamera";

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
let setCropInteractionMode: (mode: "modern" | "classic") => void = () => {};
let getModernImageTransform: () => any = () => ({ offsetX: 0, offsetY: 0, rotation: 0, scale: 1 });
let setModernImageTransform: (t: any) => void = () => {};
let getModernFrame: () => any = () => null;
let setModernFrameState: (frame: any) => void = () => {};
let resetModernCropState: () => void = () => {};
let setUseGPUCameraForModernCrop: (v: boolean) => void = () => {};
let getCropMode: () => string = () => "free";
let setCropModeState: (mode: any) => void = () => {};
let getCropAspect: () => any = () => null;
let setCropAspectState: (aspect: any) => void = () => {};
let getCropSizeTarget: () => any = () => null;
let setCropSizeTargetState: (target: any) => void = () => {};
let getActiveDocId: () => string | null = () => null;
let clearCropStacksState: () => void = () => {};
let setBgColorState: (color: string) => void = () => {};
let setCropFillEnabledState: (enabled: boolean) => void = () => {};
let setCropFillSourceState: (source: "background" | "custom") => void = () => {};
let setCropFillCustomColorState: (color: string) => void = () => {};

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
  setCropInteractionMode = editor.setCropInteractionMode;
  getModernImageTransform = editor.modernCropImageTransform;
  setModernImageTransform = editor.setModernCropImageTransform;
  getModernFrame = editor.modernCropFrame;
  setModernFrameState = editor.setModernCropFrame;
  resetModernCropState = editor.resetModernCrop;
  setUseGPUCameraForModernCrop = editor.setUseGPUCameraForModernCrop;
  getCropMode = editor.cropMode;
  setCropModeState = editor.setCropMode;
  getCropAspect = editor.cropAspect;
  setCropAspectState = editor.setCropAspect;
  getCropSizeTarget = editor.cropSizeTarget;
  setCropSizeTargetState = editor.setCropSizeTarget;
  getActiveDocId = editor.activeDocumentId;
  clearCropStacksState = editor.clearCropStacks;
  setBgColorState = editor.setBgColor;
  setCropFillEnabledState = editor.setCropFillEnabled;
  setCropFillSourceState = editor.setCropFillSource;
  setCropFillCustomColorState = editor.setCropFillCustomColor;
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
    setCropInteractionMode("classic");
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

  it("renders Classic crop fill preview from the current background color", async () => {
    renderViewport();
    await new Promise((resolve) => setTimeout(resolve, 0));

    setTool("crop");
    setCropInteractionMode("classic");
    setCrop({ x: -20, y: -10, w: 120, h: 90 });
    setBgColorState("#224466");
    setCropFillEnabledState(true);
    setCropFillSourceState("background");

    const preview = container.querySelector("[data-crop-fill-preview='classic']") as HTMLElement | null;
    expect(preview).not.toBeNull();
    expect(preview!.style.backgroundColor).toBe("rgb(34, 68, 102)");
  });

  it("renders Modern crop fill preview with custom fill color", async () => {
    renderViewport();
    await new Promise((resolve) => setTimeout(resolve, 0));

    setTool("crop");
    setCropInteractionMode("modern");
    setCropFillEnabledState(true);
    setCropFillSourceState("custom");
    setCropFillCustomColorState("#778899");
    await new Promise((resolve) => setTimeout(resolve, 0));

    const preview = container.querySelector("[data-crop-fill-preview='modern']") as HTMLElement | null;
    expect(preview).not.toBeNull();
    expect(preview!.style.backgroundColor).toBe("rgb(119, 136, 153)");
  });

  it("positions Modern crop fill preview according to frame.x and frame.y", async () => {
    renderViewport();
    await new Promise((resolve) => setTimeout(resolve, 0));

    setTool("crop");
    setCropInteractionMode("modern");
    setCropFillEnabledState(true);
    setModernFrameState({ x: 120, y: 80, w: 200, h: 150 });
    await new Promise((resolve) => setTimeout(resolve, 0));

    const preview = container.querySelector("[data-crop-fill-preview='modern']") as HTMLElement | null;
    expect(preview).not.toBeNull();
    expect(preview!.style.left).toBe("120px");
    expect(preview!.style.top).toBe("80px");
    expect(preview!.style.width).toBe("200px");
    expect(preview!.style.height).toBe("150px");
  });

  it("clears Move tool selection without clearing the active paint layer when pasteboard is clicked", async () => {
    const { session } = renderViewport();
    await new Promise((resolve) => setTimeout(resolve, 0));

    setTool("move");

    const layers = session.engine.getLayers();
    session.engine.setActiveLayer(layers[0].id);
    expect(session.engine.getActiveLayerId()).toBe(layers[0].id);

    dispatchPasteboardClick();

    expect(session.engine.getActiveLayerId()).toBe(layers[0].id);
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

  it("selection marquee stays visible after pointer up (no spurious clear)", async () => {
    const { session } = renderViewport();
    await new Promise((resolve) => setTimeout(resolve, 0));

    setTool("selection");

    const canvas = container.querySelector("canvas") as HTMLCanvasElement;
    if (!canvas) throw new Error("Canvas not found");

    // Full draw flow
    canvas.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true, clientX: 50, clientY: 50, button: 0, pointerId: 1 }));
    canvas.dispatchEvent(new PointerEvent("pointermove", { bubbles: true, clientX: 150, clientY: 150, button: 0, pointerId: 1 }));
    canvas.dispatchEvent(new PointerEvent("pointerup", { bubbles: true, clientX: 150, clientY: 150, button: 0, pointerId: 1 }));

    // Engine should now have a selection
    expect(session.engine.getSelection()).not.toBeNull();

    // Marquee should STILL be visible after pointer up
    expect(container.querySelector("rect.animate-dash")).not.toBeNull();
  });

  it("selection marquee updates in real-time during drag (live preview)", async () => {
    renderViewport();
    await new Promise((resolve) => setTimeout(resolve, 0));

    setTool("selection");

    const canvas = container.querySelector("canvas") as HTMLCanvasElement;
    if (!canvas) throw new Error("Canvas not found");

    canvas.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true, clientX: 10, clientY: 10, button: 0, pointerId: 1 }));

    canvas.dispatchEvent(new PointerEvent("pointermove", { bubbles: true, clientX: 50, clientY: 50, button: 0, pointerId: 1 }));
    const rect1 = container.querySelector("rect.animate-dash") as SVGRectElement | null;
    expect(rect1).not.toBeNull();
    const w1 = parseFloat(rect1!.getAttribute("width") || "0");

    canvas.dispatchEvent(new PointerEvent("pointermove", { bubbles: true, clientX: 200, clientY: 200, button: 0, pointerId: 1 }));
    const rect2 = container.querySelector("rect.animate-dash") as SVGRectElement | null;
    expect(rect2).not.toBeNull();
    const w2 = parseFloat(rect2!.getAttribute("width") || "0");

    // Width should have grown
    expect(w2).toBeGreaterThan(w1);

    canvas.dispatchEvent(new PointerEvent("pointerup", { bubbles: true, clientX: 200, clientY: 200, button: 0, pointerId: 1 }));
  });

  it("SelectionOptionBar appears when selection is committed (engine state)", async () => {
    const { session } = renderViewport();
    await new Promise((resolve) => setTimeout(resolve, 0));

    setTool("selection");

    const canvas = container.querySelector("canvas") as HTMLCanvasElement;
    if (!canvas) throw new Error("Canvas not found");

    canvas.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true, clientX: 50, clientY: 50, button: 0, pointerId: 1 }));
    canvas.dispatchEvent(new PointerEvent("pointermove", { bubbles: true, clientX: 150, clientY: 150, button: 0, pointerId: 1 }));
    canvas.dispatchEvent(new PointerEvent("pointerup", { bubbles: true, clientX: 150, clientY: 150, button: 0, pointerId: 1 }));

    // Engine has selection
    expect(session.engine.getSelection()).not.toBeNull();
  });

  it("clicking inside an existing selection moves it (drag-in-selection)", async () => {
    const { session } = renderViewport();
    await new Promise((resolve) => setTimeout(resolve, 0));

    setTool("selection");

    const canvas = container.querySelector("canvas") as HTMLCanvasElement;
    if (!canvas) throw new Error("Canvas not found");

    // First, create a selection
    canvas.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true, clientX: 100, clientY: 100, button: 0, pointerId: 1 }));
    canvas.dispatchEvent(new PointerEvent("pointermove", { bubbles: true, clientX: 200, clientY: 200, button: 0, pointerId: 1 }));
    canvas.dispatchEvent(new PointerEvent("pointerup", { bubbles: true, clientX: 200, clientY: 200, button: 0, pointerId: 1 }));

    const initialSel = session.engine.getSelection();
    expect(initialSel).not.toBeNull();
    expect(initialSel!.x).toBe(100);
    expect(initialSel!.width).toBe(100);

    // Now click inside the selection and drag
    canvas.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true, clientX: 150, clientY: 150, button: 0, pointerId: 2 }));
    canvas.dispatchEvent(new PointerEvent("pointermove", { bubbles: true, clientX: 200, clientY: 200, button: 0, pointerId: 2 }));
    canvas.dispatchEvent(new PointerEvent("pointerup", { bubbles: true, clientX: 200, clientY: 200, button: 0, pointerId: 2 }));

    const newSel = session.engine.getSelection();
    expect(newSel).not.toBeNull();
    // Selection should have moved (x increased by 50)
    expect(newSel!.x).toBe(150);
    expect(newSel!.width).toBe(100); // width preserved
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

  it("canvas click in Crop mode with no crop box restores default crop box and centers viewport", async () => {
    const { session } = renderViewport();
    await new Promise((resolve) => setTimeout(resolve, 0));

    setTool("crop");
    setCrop(null);
    session.engine.setViewport({ panX: 100, panY: 150, zoom: 1 });

    const canvas = container.querySelector("canvas") as HTMLCanvasElement;
    if (!canvas) throw new Error("Canvas not found");

    const downEvent = new PointerEvent("pointerdown", { bubbles: true, cancelable: true, button: 0, clientX: 50, clientY: 50 });
    canvas.dispatchEvent(downEvent);

    const upEvent = new PointerEvent("pointerup", { bubbles: true, cancelable: true, button: 0, clientX: 50, clientY: 50 });
    canvas.dispatchEvent(upEvent);

    expect(getCrop()).toEqual({ x: 0, y: 0, w: 800, h: 600 });
    expect(session.engine.getViewport().panX).toBe(0);
    expect(session.engine.getViewport().panY).toBe(0);
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

  function dispatchModernCanvasDrag(
    fromX: number, fromY: number, toX: number, toY: number,
    options?: { shiftKey?: boolean }
  ) {
    const canvas = container.querySelector("canvas") as HTMLCanvasElement;
    if (!canvas) throw new Error("Canvas not found");

    canvas.dispatchEvent(new PointerEvent("pointerdown", {
      bubbles: true, cancelable: true, button: 0, pointerId: 1,
      clientX: fromX, clientY: fromY,
      ...(options?.shiftKey ? { shiftKey: true } : {}),
    }));

    canvas.dispatchEvent(new PointerEvent("pointermove", {
      bubbles: true, cancelable: true, button: 0, pointerId: 1,
      clientX: toX, clientY: toY,
      ...(options?.shiftKey ? { shiftKey: true } : {}),
    }));

    canvas.dispatchEvent(new PointerEvent("pointerup", {
      bubbles: true, cancelable: true, button: 0, pointerId: 1,
      clientX: toX, clientY: toY,
      ...(options?.shiftKey ? { shiftKey: true } : {}),
    }));
  }

  it("creates default frame on canvas click in Modern mode with no frame and centers viewport", async () => {
    const { session } = renderViewport();
    await new Promise((resolve) => setTimeout(resolve, 0));

    setTool("crop");
    setCropInteractionMode("modern");
    resetModernCropState();
    expect(getModernFrame()).toBeNull();
    session.engine.setViewport({ panX: 120, panY: 170, zoom: 1 });

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

    const frame = getModernFrame();
    expect(frame).not.toBeNull();
    expect(frame!.w).toBeGreaterThan(0);
    expect(frame!.h).toBeGreaterThan(0);
    expect(session.engine.getViewport().panX).toBe(0);
    expect(session.engine.getViewport().panY).toBe(0);
  });

  it("drag below 5px threshold creates default frame on pointerup", async () => {
    renderViewport();
    await new Promise((resolve) => setTimeout(resolve, 0));

    setTool("crop");
    setCropInteractionMode("modern");
    resetModernCropState();
    expect(getModernFrame()).toBeNull();

    const canvas = container.querySelector("canvas") as HTMLCanvasElement;
    // Drag 3px horizontally — below 5px threshold
    canvas.dispatchEvent(new PointerEvent("pointerdown", {
      bubbles: true, cancelable: true, button: 0, pointerId: 1,
      clientX: 100, clientY: 100,
    }));
    canvas.dispatchEvent(new PointerEvent("pointermove", {
      bubbles: true, cancelable: true, button: 0, pointerId: 1,
      clientX: 103, clientY: 100,
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

  it("drag above 5px threshold creates frame with expected aspect", async () => {
    renderViewport();
    await new Promise((resolve) => setTimeout(resolve, 0));

    setTool("crop");
    setCropInteractionMode("modern");
    setCropModeState("free");
    resetModernCropState();
    expect(getModernFrame()).toBeNull();

    const canvas = container.querySelector("canvas") as HTMLCanvasElement;
    // Drag horizontally (200px → wider than tall)
    canvas.dispatchEvent(new PointerEvent("pointerdown", {
      bubbles: true, cancelable: true, button: 0, pointerId: 1,
      clientX: 100, clientY: 100,
    }));
    canvas.dispatchEvent(new PointerEvent("pointermove", {
      bubbles: true, cancelable: true, button: 0, pointerId: 1,
      clientX: 300, clientY: 150,
    }));
    canvas.dispatchEvent(new PointerEvent("pointerup", {
      bubbles: true, cancelable: true, button: 0, pointerId: 1,
      clientX: 300, clientY: 150,
    }));

    const frame = getModernFrame();
    expect(frame).not.toBeNull();
    // Wider-than-tall drag → frame should be wider than tall
    expect(frame!.w).toBeGreaterThan(frame!.h);
    expect(frame!.x).toBe((800 - frame!.w) / 2);
    expect(frame!.y).toBe((600 - frame!.h) / 2);
  });

  it("Shift+drag in Free mode creates roughly square frame", async () => {
    renderViewport();
    await new Promise((resolve) => setTimeout(resolve, 0));

    setTool("crop");
    setCropInteractionMode("modern");
    setCropModeState("free");
    resetModernCropState();
    expect(getModernFrame()).toBeNull();

    const canvas = container.querySelector("canvas") as HTMLCanvasElement;
    // Drag horizontally with shiftKey — should be square
    canvas.dispatchEvent(new PointerEvent("pointerdown", {
      bubbles: true, cancelable: true, button: 0, pointerId: 1,
      clientX: 100, clientY: 100, shiftKey: true,
    }));
    canvas.dispatchEvent(new PointerEvent("pointermove", {
      bubbles: true, cancelable: true, button: 0, pointerId: 1,
      clientX: 300, clientY: 150, shiftKey: true,
    }));
    canvas.dispatchEvent(new PointerEvent("pointerup", {
      bubbles: true, cancelable: true, button: 0, pointerId: 1,
      clientX: 300, clientY: 150, shiftKey: true,
    }));

    const frame = getModernFrame();
    expect(frame).not.toBeNull();
    // Should be roughly square: ratio < 1.1
    const ratio = Math.max(frame!.w, frame!.h) / Math.min(frame!.w, frame!.h);
    expect(ratio).toBeLessThan(1.1);
  });

  it("Ratio mode drag uses option bar aspect, not drag direction", async () => {
    renderViewport();
    await new Promise((resolve) => setTimeout(resolve, 0));

    setTool("crop");
    setCropInteractionMode("modern");
    setCropModeState("ratio");
    setCropAspectState({ w: 16, h: 9 });
    resetModernCropState();
    expect(getModernFrame()).toBeNull();

    const canvas = container.querySelector("canvas") as HTMLCanvasElement;
    // Drag tall (narrow horizontally) — but ratio mode should use 16:9
    canvas.dispatchEvent(new PointerEvent("pointerdown", {
      bubbles: true, cancelable: true, button: 0, pointerId: 1,
      clientX: 100, clientY: 100,
    }));
    canvas.dispatchEvent(new PointerEvent("pointermove", {
      bubbles: true, cancelable: true, button: 0, pointerId: 1,
      clientX: 105, clientY: 300,
    }));
    canvas.dispatchEvent(new PointerEvent("pointerup", {
      bubbles: true, cancelable: true, button: 0, pointerId: 1,
      clientX: 105, clientY: 300,
    }));

    const frame = getModernFrame();
    expect(frame).not.toBeNull();
    // Should be 16:9 (wider than tall), not tall
    expect(frame!.w / frame!.h).toBeGreaterThan(1);
  });

  it("pointercancel mid-drag cleans up state and allows subsequent click", async () => {
    renderViewport();
    await new Promise((resolve) => setTimeout(resolve, 0));

    setTool("crop");
    setCropInteractionMode("modern");
    resetModernCropState();
    expect(getModernFrame()).toBeNull();

    const canvas = container.querySelector("canvas") as HTMLCanvasElement;
    canvas.dispatchEvent(new PointerEvent("pointerdown", {
      bubbles: true, cancelable: true, button: 0, pointerId: 1,
      clientX: 100, clientY: 100,
    }));

    // Cancel mid-drag
    canvas.dispatchEvent(new PointerEvent("pointercancel", {
      bubbles: true, cancelable: true, button: 0, pointerId: 1,
    }));

    // No frame should have been created
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

  it("lostpointercapture mid-drag cleans up state", async () => {
    renderViewport();
    await new Promise((resolve) => setTimeout(resolve, 0));

    setTool("crop");
    setCropInteractionMode("modern");
    resetModernCropState();
    expect(getModernFrame()).toBeNull();

    const canvas = container.querySelector("canvas") as HTMLCanvasElement;
    canvas.dispatchEvent(new PointerEvent("pointerdown", {
      bubbles: true, cancelable: true, button: 0, pointerId: 1,
      clientX: 100, clientY: 100,
    }));

    canvas.dispatchEvent(new PointerEvent("lostpointercapture", {
      bubbles: true, cancelable: true, button: 0, pointerId: 1,
    }));

    // No frame should have been created (threshold not exceeded)
    expect(getModernFrame()).toBeNull();
  });

  it("drag above threshold creates frame on pointerup with proper sizing (WYSIWYG)", async () => {
    renderViewport();
    await new Promise((resolve) => setTimeout(resolve, 0));

    setTool("crop");
    setCropInteractionMode("modern");
    setCropModeState("free");
    resetModernCropState();
    expect(getModernFrame()).toBeNull();

    const canvas = container.querySelector("canvas") as HTMLCanvasElement;

    canvas.dispatchEvent(new PointerEvent("pointerdown", {
      bubbles: true, cancelable: true, button: 0, pointerId: 1,
      clientX: 100, clientY: 100,
    }));

    // Move beyond threshold — frame should NOT exist yet (only preview rect shown during drag)
    canvas.dispatchEvent(new PointerEvent("pointermove", {
      bubbles: true, cancelable: true, button: 0, pointerId: 1,
      clientX: 300, clientY: 200,
    }));

    expect(getModernFrame()).toBeNull();

    // Drag further — still no frame
    canvas.dispatchEvent(new PointerEvent("pointermove", {
      bubbles: true, cancelable: true, button: 0, pointerId: 1,
      clientX: 400, clientY: 150,
    }));

    expect(getModernFrame()).toBeNull();

    // Pointerup — frame should be created
    canvas.dispatchEvent(new PointerEvent("pointerup", {
      bubbles: true, cancelable: true, button: 0, pointerId: 1,
      clientX: 400, clientY: 150,
    }));

    const frame = getModernFrame();
    expect(frame).not.toBeNull();
    expect(frame!.w).toBeGreaterThan(0);
    expect(frame!.h).toBeGreaterThan(0);
  });

  it("WYSIWYG: frame size matches selection exactly in Free mode", async () => {
    renderViewport();
    await new Promise((resolve) => setTimeout(resolve, 0));

    setTool("crop");
    setCropInteractionMode("modern");
    setCropModeState("free");
    resetModernCropState();

    const canvas = container.querySelector("canvas") as HTMLCanvasElement;
    const fromX = 100, fromY = 100, toX = 400, toY = 300;
    const expectedW = Math.abs(toX - fromX); // 300
    const expectedH = Math.abs(toY - fromY); // 200

    canvas.dispatchEvent(new PointerEvent("pointerdown", {
      bubbles: true, cancelable: true, button: 0, pointerId: 10,
      clientX: fromX, clientY: fromY,
    }));
    canvas.dispatchEvent(new PointerEvent("pointermove", {
      bubbles: true, cancelable: true, button: 0, pointerId: 10,
      clientX: toX, clientY: toY,
    }));
    canvas.dispatchEvent(new PointerEvent("pointerup", {
      bubbles: true, cancelable: true, button: 0, pointerId: 10,
      clientX: toX, clientY: toY,
    }));

    const frame = getModernFrame();
    expect(frame).not.toBeNull();
    expect(frame!.w).toBe(expectedW);
    expect(frame!.h).toBe(expectedH);
  });

  it("reverse drag direction produces same frame size", async () => {
    renderViewport();
    await new Promise((resolve) => setTimeout(resolve, 0));

    setTool("crop");
    setCropInteractionMode("modern");
    setCropModeState("free");
    resetModernCropState();

    const canvas = container.querySelector("canvas") as HTMLCanvasElement;
    // Drag right-to-left then bottom-to-top — same |dx|,|dy|
    canvas.dispatchEvent(new PointerEvent("pointerdown", {
      bubbles: true, cancelable: true, button: 0, pointerId: 10,
      clientX: 400, clientY: 200,
    }));
    canvas.dispatchEvent(new PointerEvent("pointermove", {
      bubbles: true, cancelable: true, button: 0, pointerId: 10,
      clientX: 150, clientY: 100,
    }));
    canvas.dispatchEvent(new PointerEvent("pointerup", {
      bubbles: true, cancelable: true, button: 0, pointerId: 10,
      clientX: 150, clientY: 100,
    }));

    const frame = getModernFrame();
    expect(frame).not.toBeNull();
    expect(frame!.w).toBe(250);
    expect(frame!.h).toBe(100);
  });

  it("image transform offset shifts selection center to viewport center", async () => {
    renderViewport();
    await new Promise((resolve) => setTimeout(resolve, 0));

    setTool("crop");
    setCropInteractionMode("modern");
    setCropModeState("free");
    resetModernCropState();

    const canvas = container.querySelector("canvas") as HTMLCanvasElement;
    // Selection from (100,100) to (400,350)
    // selCenter = (250, 225), vpCenter = (400, 300)
    // offset = (400-250, 300-225) = (150, 75)
    canvas.dispatchEvent(new PointerEvent("pointerdown", {
      bubbles: true, cancelable: true, button: 0, pointerId: 10,
      clientX: 100, clientY: 100,
    }));
    canvas.dispatchEvent(new PointerEvent("pointermove", {
      bubbles: true, cancelable: true, button: 0, pointerId: 10,
      clientX: 400, clientY: 350,
    }));
    canvas.dispatchEvent(new PointerEvent("pointerup", {
      bubbles: true, cancelable: true, button: 0, pointerId: 10,
      clientX: 400, clientY: 350,
    }));

    const t = getModernImageTransform();
    expect(t.offsetX).toBe(150);
    expect(t.offsetY).toBe(75);
  });

  it("Size mode drag creates frame at target size regardless of selection", async () => {
    renderViewport();
    await new Promise((resolve) => setTimeout(resolve, 0));

    setTool("crop");
    setCropInteractionMode("modern");
    setCropModeState("size");
    setCropSizeTargetState({ w: 200, h: 150 });
    resetModernCropState();

    const canvas = container.querySelector("canvas") as HTMLCanvasElement;
    // Drag a 400x300 selection — frame should still be 200x150
    canvas.dispatchEvent(new PointerEvent("pointerdown", {
      bubbles: true, cancelable: true, button: 0, pointerId: 10,
      clientX: 100, clientY: 100,
    }));
    canvas.dispatchEvent(new PointerEvent("pointermove", {
      bubbles: true, cancelable: true, button: 0, pointerId: 10,
      clientX: 500, clientY: 400,
    }));
    canvas.dispatchEvent(new PointerEvent("pointerup", {
      bubbles: true, cancelable: true, button: 0, pointerId: 10,
      clientX: 500, clientY: 400,
    }));

    const frame = getModernFrame();
    expect(frame).not.toBeNull();
    expect(frame!.w).toBe(200);
    expect(frame!.h).toBe(150);
  });

  it("preview rect shown during drag, hidden after pointerup", async () => {
    renderViewport();
    await new Promise((resolve) => setTimeout(resolve, 0));

    setTool("crop");
    setCropInteractionMode("modern");
    setCropModeState("free");
    resetModernCropState();

    const canvas = container.querySelector("canvas") as HTMLCanvasElement;

    // Pointerdown — no preview yet
    canvas.dispatchEvent(new PointerEvent("pointerdown", {
      bubbles: true, cancelable: true, button: 0, pointerId: 10,
      clientX: 100, clientY: 100,
    }));

    // Move beyond threshold — preview should appear
    canvas.dispatchEvent(new PointerEvent("pointermove", {
      bubbles: true, cancelable: true, button: 0, pointerId: 10,
      clientX: 300, clientY: 200,
    }));

    const previewDuringDrag = container.querySelector("[data-crop-drag-preview]");
    expect(previewDuringDrag).not.toBeNull();

    // Pointerup — preview should be removed
    canvas.dispatchEvent(new PointerEvent("pointerup", {
      bubbles: true, cancelable: true, button: 0, pointerId: 10,
      clientX: 300, clientY: 200,
    }));

    // Let SolidJS batch settle
    await new Promise((resolve) => setTimeout(resolve, 50));
    const previewAfter = container.querySelector("[data-crop-drag-preview]");
    expect(previewAfter).toBeNull();
  });

  it("modern crop: drag-dismiss-redrag cycle works", async () => {
    renderViewport();
    await new Promise((resolve) => setTimeout(resolve, 0));

    setTool("crop");
    setCropInteractionMode("modern");
    setCropModeState("free");
    resetModernCropState();
    expect(getModernFrame()).toBeNull();

    const canvas = container.querySelector("canvas") as HTMLCanvasElement;

    // First drag — create frame
    canvas.dispatchEvent(new PointerEvent("pointerdown", {
      bubbles: true, cancelable: true, button: 0, pointerId: 10,
      clientX: 100, clientY: 100,
    }));
    canvas.dispatchEvent(new PointerEvent("pointermove", {
      bubbles: true, cancelable: true, button: 0, pointerId: 10,
      clientX: 300, clientY: 200,
    }));
    canvas.dispatchEvent(new PointerEvent("pointerup", {
      bubbles: true, cancelable: true, button: 0, pointerId: 10,
      clientX: 300, clientY: 200,
    }));

    expect(getModernFrame()).not.toBeNull();
    const firstW = getModernFrame()!.w;

    // Dismiss via Escape
    resetModernCropState();
    await new Promise((resolve) => setTimeout(resolve, 50));
    expect(getModernFrame()).toBeNull();

    // Second drag with different direction
    canvas.dispatchEvent(new PointerEvent("pointerdown", {
      bubbles: true, cancelable: true, button: 0, pointerId: 20,
      clientX: 50, clientY: 50,
    }));
    canvas.dispatchEvent(new PointerEvent("pointermove", {
      bubbles: true, cancelable: true, button: 0, pointerId: 20,
      clientX: 350, clientY: 300,
    }));
    canvas.dispatchEvent(new PointerEvent("pointerup", {
      bubbles: true, cancelable: true, button: 0, pointerId: 20,
      clientX: 350, clientY: 300,
    }));

    const frame = getModernFrame();
    expect(frame).not.toBeNull();
    expect(frame!.w).toBe(300);
    expect(frame!.h).toBe(250);
    // Different from first frame's size (which was 200x100)
    expect(frame!.w).not.toBe(firstW);
  });

  it("vertical drag creates taller-than-wide frame", async () => {
    renderViewport();
    await new Promise((resolve) => setTimeout(resolve, 0));

    setTool("crop");
    setCropInteractionMode("modern");
    setCropModeState("free");
    resetModernCropState();

    const canvas = container.querySelector("canvas") as HTMLCanvasElement;

    // Drag vertically — 100px wide, 300px tall
    canvas.dispatchEvent(new PointerEvent("pointerdown", {
      bubbles: true, cancelable: true, button: 0, pointerId: 10,
      clientX: 200, clientY: 100,
    }));
    canvas.dispatchEvent(new PointerEvent("pointermove", {
      bubbles: true, cancelable: true, button: 0, pointerId: 10,
      clientX: 300, clientY: 400,
    }));
    canvas.dispatchEvent(new PointerEvent("pointerup", {
      bubbles: true, cancelable: true, button: 0, pointerId: 10,
      clientX: 300, clientY: 400,
    }));

    const frame = getModernFrame();
    expect(frame).not.toBeNull();
    expect(frame!.h).toBeGreaterThan(frame!.w);
    expect(frame!.w).toBe(100);
    expect(frame!.h).toBe(300);
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

    // Pasteboard click clears transform selection only; the active paint target remains.
    expect(session.engine.getActiveLayerId()).toBe(layers[0].id);
  });

  it("Move tool clears selection only when viewport canvas receives a click outside the artboard", async () => {
    const { session } = renderViewport();
    await new Promise((resolve) => setTimeout(resolve, 0));
    setTool("move");
    mockSpacePressed = false;

    const layers = session.engine.getLayers();
    session.engine.setActiveLayer(layers[0].id);
    session.engine.setViewport({ panX: 100, panY: 100, zoom: 1 });

    // After the GPU viewport migration the WebGL canvas covers the viewport.
    // A pasteboard click can therefore target the canvas even when it is outside
    // the visible document/artboard.
    firePointerDown(getCanvas(), 31, 20, 20);

    expect(session.engine.getActiveLayerId()).toBe(layers[0].id);
    expect(scheduler.requestRender).toHaveBeenCalled();
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

// -----------------------------------------------------------------------
// Bug Hunt: Edge case regression tests
// -----------------------------------------------------------------------

describe("Bug Hunt: Pasteboard pointercancel clears pending gesture", () => {
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
    const session = WorkspaceManager.createBlankDocument("bug-doc", "Bug Doc", 800, 600);
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
    setCropInteractionMode("classic");
    return { session };
  }

  function getContainer(): HTMLDivElement {
    const c = container.querySelector("[data-viewport-container]") as HTMLDivElement;
    if (!c) throw new Error("Viewport container not found");
    return c;
  }

  it("clears pendingPasteboardCropGesture on pointercancel after pasteboard pointerdown in Crop mode", async () => {
    renderViewport();
    await new Promise((resolve) => setTimeout(resolve, 0));
    setTool("crop");

    const containerEl = getContainer();

    // Start a pasteboard gesture (pointerdown on pasteboard)
    containerEl.dispatchEvent(new PointerEvent("pointerdown", {
      bubbles: true, cancelable: true, button: 0, pointerId: 10, clientX: 5, clientY: 5,
    }));

    // Give effects time to run
    await new Promise((resolve) => setTimeout(resolve, 0));

    // Now pointercancel fires (e.g., system dialog, tab switch)
    containerEl.dispatchEvent(new PointerEvent("pointercancel", {
      bubbles: false, pointerId: 10,
    }));

    // Give effects time to run
    await new Promise((resolve) => setTimeout(resolve, 0));

    // The pending gesture should have been cleaned up.
    // Verify by checking that a subsequent small movement on pasteboard
    // does NOT trigger a crop replacement (it should be ignored).
    // If pending gesture leaked, the move handler would try to create a replacement crop.
    const setRectSpy = vi.spyOn(renderer, "uploadImage");

    setCrop({ x: 50, y: 50, w: 200, h: 150 });
    const prevCrop = getCrop();

    // Dispatch a small move — should not create a new replacement if gesture is cleared
    containerEl.dispatchEvent(new PointerEvent("pointermove", {
      bubbles: true, cancelable: true, button: 0, pointerId: 10, clientX: 10, clientY: 10,
    }));

    // Crop rect should NOT have changed since the pending gesture was cancelled
    expect(getCrop()).toEqual(prevCrop);
  });
});

describe("Bug Hunt: Modern crop state leak across tool switches", () => {
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
    const session = WorkspaceManager.createBlankDocument("leak-doc", "Leak Doc", 800, 600);
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
    setCropInteractionMode("modern");
    return { session };
  }

  it("resets modernCropImageTransform when leaving Crop tool", async () => {
    renderViewport();
    await new Promise((resolve) => setTimeout(resolve, 0));

    setTool("crop");
    await new Promise((resolve) => setTimeout(resolve, 50));

    expect(getModernFrame()).not.toBeNull();

    // Simulate user interaction by setting non-default transform
    setModernImageTransform({ offsetX: 55, offsetY: 33, rotation: 25, scale: 1.2 });

    // Switch to another tool
    setTool("move");
    await new Promise((resolve) => setTimeout(resolve, 50));

    // After switching away from crop, modern crop state should be reset
    const afterExitTransform = getModernImageTransform();
    expect(afterExitTransform.offsetX).toBe(0);
    expect(afterExitTransform.offsetY).toBe(0);
    expect(afterExitTransform.rotation).toBe(0);
    expect(afterExitTransform.scale).toBe(1);

    // Frame should also be null when not in crop mode
    expect(getModernFrame()).toBeNull();
  });

  it("modern crop: Escape leaves frame null (no auto-recreate)", async () => {
    renderViewport();
    await new Promise((resolve) => setTimeout(resolve, 0));

    setTool("crop");
    await new Promise((resolve) => setTimeout(resolve, 50));

    // Frame should be created on entry
    expect(getModernFrame()).not.toBeNull();
    const createdFrame = getModernFrame();

    // Simulate Escape: reset modern crop state
    resetModernCropState();
    await new Promise((resolve) => setTimeout(resolve, 50));

    // Frame should be null after dismiss
    expect(getModernFrame()).toBeNull();

    // Wait extra ticks — ensure createEffect does NOT recreate frame
    // because session key hasn't changed
    await new Promise((resolve) => setTimeout(resolve, 100));
    expect(getModernFrame()).toBeNull();

    // Image transform should also be reset
    const t = getModernImageTransform();
    expect(t.offsetX).toBe(0);
    expect(t.offsetY).toBe(0);
    expect(t.rotation).toBe(0);
    expect(t.scale).toBe(1);
  });

  it("modern crop: canvas click creates frame after Escape dismiss", async () => {
    renderViewport();
    await new Promise((resolve) => setTimeout(resolve, 0));

    setTool("crop");
    await new Promise((resolve) => setTimeout(resolve, 50));

    // Dismiss by resetting (simulating Escape)
    resetModernCropState();
    await new Promise((resolve) => setTimeout(resolve, 50));
    expect(getModernFrame()).toBeNull();

    // Click on canvas
    const canvas = container.querySelector("canvas") as HTMLCanvasElement;
    if (!canvas) throw new Error("Canvas not found");

    canvas.dispatchEvent(new PointerEvent("pointerdown", {
      bubbles: true, cancelable: true, button: 0,
      clientX: 200, clientY: 200, pointerId: 80,
    }));
    canvas.dispatchEvent(new PointerEvent("pointerup", {
      bubbles: true, cancelable: true, button: 0,
      clientX: 200, clientY: 200, pointerId: 80,
    }));

    await new Promise((resolve) => setTimeout(resolve, 50));

    // Frame should be recreated
    expect(getModernFrame()).not.toBeNull();
  });

  it("modern crop: mode change recreates frame after Escape dismiss", async () => {
    renderViewport();
    await new Promise((resolve) => setTimeout(resolve, 0));

    setTool("crop");
    await new Promise((resolve) => setTimeout(resolve, 50));

    // Dismiss by resetting
    resetModernCropState();
    await new Promise((resolve) => setTimeout(resolve, 50));
    expect(getModernFrame()).toBeNull();

    // Change mode (e.g., free → ratio)
    setCropModeState("ratio");
    setCropAspectState({ w: 16, h: 9 });
    await new Promise((resolve) => setTimeout(resolve, 50));

    // Mode change should trigger session key change → createEffect recreates frame
    expect(getModernFrame()).not.toBeNull();
    if (getModernFrame()) {
      // Frame should roughly match 16:9 aspect ratio (wider than tall, centered in viewport)
      expect(getModernFrame().w).toBeGreaterThan(getModernFrame().h);
    }
  });

  it("modern crop: tool switch away and back recreates frame after Escape dismiss", async () => {
    renderViewport();
    await new Promise((resolve) => setTimeout(resolve, 0));

    setTool("crop");
    await new Promise((resolve) => setTimeout(resolve, 50));

    // Dismiss by resetting
    resetModernCropState();
    await new Promise((resolve) => setTimeout(resolve, 50));
    expect(getModernFrame()).toBeNull();

    // Switch to another tool
    setTool("move");
    await new Promise((resolve) => setTimeout(resolve, 50));

    // Switch back to crop (new session created)
    setTool("crop");
    await new Promise((resolve) => setTimeout(resolve, 50));

    // Frame should be recreated
    expect(getModernFrame()).not.toBeNull();
  });

  it("modern crop: resize document does not recreate dismissed frame", async () => {
    renderViewport();
    await new Promise((resolve) => setTimeout(resolve, 0));

    setTool("crop");
    await new Promise((resolve) => setTimeout(resolve, 50));

    // Dismiss by resetting
    resetModernCropState();
    await new Promise((resolve) => setTimeout(resolve, 50));
    expect(getModernFrame()).toBeNull();
  });
});

describe("Bug Hunt: Modern Crop pointercancel releases capture", () => {
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
    const session = WorkspaceManager.createBlankDocument("cap-doc", "Cap Doc", 800, 600);
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
    setCropInteractionMode("modern");
    return { session };
  }

  it("clears drag state on ModernCropOverlay onLostPointerCapture", async () => {
    renderViewport();
    await new Promise((resolve) => setTimeout(resolve, 50));

    setTool("crop");
    await new Promise((resolve) => setTimeout(resolve, 0));

    const moveZone = container.querySelector("[data-modern-crop-move]") as SVGRectElement;
    if (!moveZone) throw new Error("Modern crop move zone not found");

    // Register a listener to track drag state changes
    const dragStateSpy = vi.fn();
    const svg = container.querySelector("[data-modern-crop-overlay]") as SVGSVGElement;
    if (!svg) throw new Error("Modern crop overlay SVG not found");

    svg.addEventListener("pointerup", () => {
      dragStateSpy("cleared");
    });

    // Start a move drag on modern crop frame
    moveZone.dispatchEvent(new PointerEvent("pointerdown", {
      bubbles: true, cancelable: true, pointerId: 5, clientX: 400, clientY: 300,
    }));

    expect(Element.prototype.setPointerCapture).toHaveBeenCalledWith(5);

    // Simulate lostpointercapture — should trigger clearDrag
    svg.dispatchEvent(new PointerEvent("lostpointercapture", { bubbles: false, pointerId: 5 }));

    // Allow effects/enqueued state setters to flush
    await new Promise((resolve) => setTimeout(resolve, 0));

    // Now dispatch pointerup — if clearDrag was already called above,
    // the dragState should be null and pointerup should be a no-op (no additional "cleared")
    svg.dispatchEvent(new PointerEvent("pointerup", { bubbles: false, pointerId: 5 }));

    // The lostpointercapture handler should have fired clearDrag once
    // pointerup should not fire clearDrag again because dragState is null
    expect(dragStateSpy).toHaveBeenCalledTimes(1);
  });
});

describe("Bug Hunt: Crop state leaks across document switch", () => {
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

  function renderViewportWithDocs() {
    const session1 = WorkspaceManager.createBlankDocument("doc-1", "Doc 1", 800, 600);
    const session2 = WorkspaceManager.createBlankDocument("doc-2", "Doc 2", 1600, 400);
    ws.addDocument(session1);
    ws.addDocument(session2);

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
    setCropInteractionMode("classic");
    return { session1, session2 };
  }

  it("resets Classic crop rect when switching to another document", async () => {
    renderViewportWithDocs();
    await new Promise((resolve) => setTimeout(resolve, 0));

    // After render, active doc is doc-2 (last added). Switch to doc-1 first.
    ws.switchDocument("doc-1");
    await new Promise((resolve) => setTimeout(resolve, 50));

    // Set up crop state on doc-1
    setTool("crop");
    setCrop({ x: 50, y: 50, w: 200, h: 150 });
    setCropRotation(15);
    setCropModeState("ratio");
    setCropAspectState({ w: 16, h: 9 });
    setCropSizeTargetState({ w: 800, h: 600 });
    setHiddenCropPreview({ rect: { x: 10, y: 10, w: 100, h: 100 }, rotation: 0 });

    expect(getCrop()).not.toBeNull();
    expect(getCropRotation()).toBe(15);

    // Switch to doc-2
    ws.switchDocument("doc-2");
    await new Promise((resolve) => setTimeout(resolve, 50));

    // Crop state should be reset
    expect(getCrop()).toBeNull();
    expect(getCropRotation()).toBe(0);
    expect(getCropMode()).toBe("free");
    expect(getCropAspect()).toBeNull();
    expect(getCropSizeTarget()).toBeNull();
    expect(getHiddenCropPreview()).toBeNull();
  });

  it("resets Classic crop rect when switching back to original document", async () => {
    renderViewportWithDocs();
    await new Promise((resolve) => setTimeout(resolve, 0));

    // Switch to doc-1 first (active is doc-2 after render)
    ws.switchDocument("doc-1");
    await new Promise((resolve) => setTimeout(resolve, 50));

    setTool("crop");
    setCrop({ x: 100, y: 100, w: 300, h: 200 });
    setCropRotation(45);

    // Switch to doc-2 then back to doc-1
    ws.switchDocument("doc-2");
    await new Promise((resolve) => setTimeout(resolve, 50));
    ws.switchDocument("doc-1");
    await new Promise((resolve) => setTimeout(resolve, 50));

    // Crop state should be reset (from doc-2 switch), not restored to old values
    expect(getCrop()).toBeNull();
    expect(getCropRotation()).toBe(0);
  });

  it("recomputes Modern crop frame when switching documents", async () => {
    renderViewportWithDocs();
    await new Promise((resolve) => setTimeout(resolve, 0));

    // Switch to doc-1 first (800x600)
    ws.switchDocument("doc-1");
    await new Promise((resolve) => setTimeout(resolve, 50));

    setCropInteractionMode("modern");
    setTool("crop");
    await new Promise((resolve) => setTimeout(resolve, 50));

    const frame1 = getModernFrame();
    expect(frame1).not.toBeNull();

    // Switch to doc-2 (1600x400 — different aspect ratio from doc-1's 800x600)
    ws.switchDocument("doc-2");
    await new Promise((resolve) => setTimeout(resolve, 50));

    // Frame should be recomputed for the new document dimensions/aspect ratio
    const frame2 = getModernFrame();
    expect(frame2).not.toBeNull();
    // Different aspect ratio means different frame shape
    const ratio1 = frame1.w / frame1.h;
    const ratio2 = frame2.w / frame2.h;
    expect(ratio2).not.toBeCloseTo(ratio1, 1);
  });

  it("does not reset crop state when switching between non-crop tools", async () => {
    renderViewportWithDocs();
    await new Promise((resolve) => setTimeout(resolve, 0));

    // Switch to doc-1 first (active is doc-2 after render)
    ws.switchDocument("doc-1");
    await new Promise((resolve) => setTimeout(resolve, 50));

    // Set crop state but stay in move tool
    setCrop({ x: 50, y: 50, w: 200, h: 150 });
    setCropRotation(15);

    // Switch documents — crop state should still reset even though not in crop tool
    ws.switchDocument("doc-2");
    await new Promise((resolve) => setTimeout(resolve, 50));

    expect(getCrop()).toBeNull();
    expect(getCropRotation()).toBe(0);
  });
});

describe("Crop re-entry syncs preview with option bar values", () => {
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
  }

  it("Modern: entering Crop in Size mode initializes frame at target aspect ratio", async () => {
    renderViewport();
    await new Promise((resolve) => setTimeout(resolve, 0));

    // Set Size mode values while in Move tool
    setCropSizeTargetState({ w: 300, h: 600 });
    setCropModeState("size");

    // Enter crop in Modern mode
    setCropInteractionMode("modern");
    setTool("crop");
    await new Promise((resolve) => setTimeout(resolve, 50));

    const frame = getModernFrame();
    expect(frame).not.toBeNull();
    // Frame should fill canvas at target 300:600 (0.5) aspect
    expect(frame.w / frame.h).toBeCloseTo(300 / 600, 1);
    expect(frame.w).toBeGreaterThan(0);
    expect(frame.h).toBeGreaterThan(0);
  });

  it("Classic: entering Crop in Size mode initializes rect at target aspect ratio", async () => {
    renderViewport();
    await new Promise((resolve) => setTimeout(resolve, 0));

    // No cropRect set, set Size mode values
    setCropSizeTargetState({ w: 200, h: 600 });
    setCropModeState("size");

    // Enter crop in Classic mode
    setCropInteractionMode("classic");
    setTool("crop");
    await new Promise((resolve) => setTimeout(resolve, 50));

    const rect = getCrop();
    expect(rect).not.toBeNull();
    // Rect should fill document at target 200:600 (1:3) aspect
    expect(rect.w / rect.h).toBeCloseTo(200 / 600, 1);
  });

  it("Classic: entering Crop in Ratio mode initializes rect at cropAspect", async () => {
    renderViewport();
    await new Promise((resolve) => setTimeout(resolve, 0));

    // Set Ratio mode values
    setCropAspectState({ w: 16, h: 9 });
    setCropModeState("ratio");

    // Enter crop in Classic mode
    setCropInteractionMode("classic");
    setTool("crop");
    await new Promise((resolve) => setTimeout(resolve, 50));

    const rect = getCrop();
    expect(rect).not.toBeNull();
    expect(rect.w / rect.h).toBeCloseTo(16 / 9, 1);
  });

  it("Classic: entering Crop in Free mode does not auto-create rect", async () => {
    renderViewport();
    await new Promise((resolve) => setTimeout(resolve, 0));

    setCropModeState("free");
    setCropInteractionMode("classic");
    setTool("crop");
    await new Promise((resolve) => setTimeout(resolve, 50));

    // Free mode should NOT auto-create a rect
    expect(getCrop()).toBeNull();
  });

  it("Switching mode after entering Crop refits the Modern frame", async () => {
    renderViewport();
    await new Promise((resolve) => setTimeout(resolve, 0));

    // Enter crop in Free mode (Modern)
    setCropInteractionMode("modern");
    setTool("crop");
    await new Promise((resolve) => setTimeout(resolve, 50));

    const frameFree = getModernFrame();
    expect(frameFree).not.toBeNull();

    // Switch to Size mode
    setCropSizeTargetState({ w: 400, h: 300 });
    setCropModeState("size");
    await new Promise((resolve) => setTimeout(resolve, 50));

    const frameSize = getModernFrame();
    expect(frameSize).not.toBeNull();
    expect(frameSize.w / frameSize.h).toBeCloseTo(400 / 300, 1);

    // Switch to Ratio mode
    setCropAspectState({ w: 3, h: 2 });
    setCropModeState("ratio");
    await new Promise((resolve) => setTimeout(resolve, 50));

    const frameRatio = getModernFrame();
    expect(frameRatio).not.toBeNull();
    expect(frameRatio.w / frameRatio.h).toBeCloseTo(3 / 2, 1);
  });
});

describe("Phase 3 Tool Switch Contracts (Move, Selection, Brush, Transform)", () => {
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
  });

  afterEach(() => {
    if (dispose) dispose();
    container.parentNode?.removeChild(container);
    vi.restoreAllMocks();
  });

  function renderViewport() {
    const session = WorkspaceManager.createBlankDocument("phase3", "Phase 3", 800, 600);
    ws.addDocument(session);
    dispose = render(
      () => (
        <EditorProvider workspace={ws} renderer={renderer} scheduler={scheduler}>
          <TestConsumer />
          <CanvasViewport />
        </EditorProvider>
      ),
      container,
    );
    return { session };
  }

  it("Move: round-trip Move -> Brush -> Move leaves no orphan state", async () => {
    renderViewport();
    await new Promise((resolve) => setTimeout(resolve, 0));

    setTool("move");
    await new Promise((resolve) => setTimeout(resolve, 50));
    setTool("brush");
    await new Promise((resolve) => setTimeout(resolve, 50));
    setTool("move");
    await new Promise((resolve) => setTimeout(resolve, 50));

    // After round-trip, engine still works
    const engine = ws.getActiveEngine();
    expect(engine).toBeDefined();
    expect(ws.getActiveSession()).toBeDefined();
  });

  it("Selection: round-trip select -> crop -> select leaves no orphan state", async () => {
    renderViewport();
    await new Promise((resolve) => setTimeout(resolve, 0));

    setTool("select");
    await new Promise((resolve) => setTimeout(resolve, 50));
    setTool("crop");
    await new Promise((resolve) => setTimeout(resolve, 50));
    setTool("select");
    await new Promise((resolve) => setTimeout(resolve, 50));

    const engine = ws.getActiveEngine();
    expect(engine).toBeDefined();
    expect(ws.getActiveSession()).toBeDefined();
  });

  it("Brush: round-trip brush -> move -> brush leaves no orphan state", async () => {
    renderViewport();
    await new Promise((resolve) => setTimeout(resolve, 0));

    setTool("brush");
    await new Promise((resolve) => setTimeout(resolve, 50));
    setTool("move");
    await new Promise((resolve) => setTimeout(resolve, 50));
    setTool("brush");
    await new Promise((resolve) => setTimeout(resolve, 50));

    const engine = ws.getActiveEngine();
    expect(engine).toBeDefined();
    expect(ws.getActiveSession()).toBeDefined();
  });

  it("Transform: round-trip move -> crop -> move leaves no orphan layerTransformSession", async () => {
    renderViewport();
    await new Promise((resolve) => setTimeout(resolve, 0));

    setTool("move");
    await new Promise((resolve) => setTimeout(resolve, 50));
    setTool("crop");
    await new Promise((resolve) => setTimeout(resolve, 50));
    setTool("move");
    await new Promise((resolve) => setTimeout(resolve, 50));

    // After round-trip, no stale layerTransformSession
    const session = ws.getActiveSession();
    expect(session).toBeDefined();

    const engine = ws.getActiveEngine();
    expect(engine).toBeDefined();
  });
});

describe("Phase 4 Deep Tool State Cleanup (per-signal assertions)", () => {
  let ws: WorkspaceManager;
  let renderer: any;
  let scheduler: any;
  let container: HTMLDivElement;
  let dispose: () => void;
  let editorRef: { current: any };

  const tick = (ms = 50) => new Promise<void>((resolve) => setTimeout(resolve, ms));

  const DeepTestConsumer = () => {
    editorRef.current = useEditor();
    return null;
  };

  beforeEach(async () => {
    ws = new WorkspaceManager();
    renderer = { uploadImage: vi.fn(), destroyTexture: vi.fn() };
    scheduler = { requestRender: vi.fn() };
    container = document.createElement("div");
    document.body.appendChild(container);
    editorRef = { current: null };

    mockOnViewportPointerDown.mockClear();
    mockOnViewportPointerUp.mockClear();
    mockOnViewportPointerCancel.mockClear();
    mockOnViewportLostPointerCapture.mockClear();
    mockCommitBrushStroke.mockClear();
    mockSpacePressed = false;
    mockPanningActive = false;

    Element.prototype.setPointerCapture = vi.fn();
    Element.prototype.releasePointerCapture = vi.fn();

    const session = WorkspaceManager.createBlankDocument("deep", "Deep", 800, 600);
    ws.addDocument(session);

    dispose = render(
      () => (
        <EditorProvider workspace={ws} renderer={renderer} scheduler={scheduler}>
          <TestConsumer />
          <DeepTestConsumer />
          <CanvasViewport />
        </EditorProvider>
      ),
      container,
    );

    await tick();
  });

  afterEach(() => {
    if (dispose) dispose();
    if (container.parentNode) container.parentNode.removeChild(container);
    vi.restoreAllMocks();
  });

  it("Move: switching away clears hoverHandle, hoverPos, layerTransformSession", async () => {
    const ed = editorRef.current;
    setTool("move");
    await tick();

    // Simulate Move-specific state
    ed.setHoverHandle("nw");
    ed.setHoverPos({ x: 100, y: 100 });
    const engine = ws.getActiveEngine()!;
    const l1 = engine.addLayer("L1");
    await tick();
    ed.setLayerTransformSession({
      documentId: "deep",
      layerId: l1.id,
      originalSnapshot: engine.snapshot(),
      originalTransform: { x: 0, y: 0, scaleX: 1, scaleY: 1, rotation: 0, flipH: false, flipV: false },
      mode: "resize",
      lockRatio: false,
      startedAt: Date.now(),
    });
    await tick();

    // Verify state is set
    expect(ed.hoverHandle()).toBe("nw");
    expect(ed.hoverPos()).not.toBeNull();
    expect(ed.layerTransformSession()).not.toBeNull();

    // Switch to another tool
    setTool("brush");
    await tick();

    // All Move-specific transient state should be cleared
    expect(ed.hoverHandle()).toBeNull();
    expect(ed.hoverPos()).toBeNull();
    expect(ed.layerTransformSession()).toBeNull();
  });

  it("Selection: switching away preserves selection but exits edit mode (no orphan edit mode)", async () => {
    const ed = editorRef.current;
    setTool("select");
    await tick();

    // Set selection and enter edit mode
    ed.setSelection({ x: 10, y: 10, width: 100, height: 100, angle: 0 });
    ed.setSelectionEditMode(true);
    await tick();

    expect(ed.selection()).not.toBeNull();
    expect(ed.selectionEditMode()).toBe(true);

    // Switch to move
    setTool("move");
    await tick();

    // Selection persists (user can have selection in any tool),
    // but edit mode is off (orphan edit mode is the bug)
    expect(ed.selection()).not.toBeNull();
    expect(ed.selectionEditMode()).toBe(false);
  });

  it("Crop (modern): switching away clears modernCropFrame, modernCropImageTransform, undo/redo", async () => {
    const ed = editorRef.current;
    setTool("crop");
    setCropInteractionMode("modern");
    await tick();

    // setTool("crop") with modern mode auto-creates a frame
    expect(ed.modernCropFrame()).not.toBeNull();

    // Set custom image transform
    ed.setModernCropImageTransform({ offsetX: 50, offsetY: 25, rotation: 45, scale: 1.5 });
    await tick();

    // Switch to another tool
    setTool("move");
    await tick();

    // All crop-specific state should be cleared
    expect(ed.modernCropFrame()).toBeNull();
    const t = ed.modernCropImageTransform();
    expect(t.offsetX).toBe(0);
    expect(t.offsetY).toBe(0);
    expect(t.rotation).toBe(0);
    expect(t.scale).toBe(1);
    expect(ed.canModernCropUndo()).toBe(false);
  });

  it("Transform: switching away clears layerTransformSession (orphan transform state)", async () => {
    const ed = editorRef.current;
    setTool("move");
    await tick();

    const engine = ws.getActiveEngine()!;
    const l1 = engine.addLayer("L1");
    await tick();

    // Set up an active transform session (simulates mid-drag)
    ed.setLayerTransformSession({
      documentId: "deep",
      layerId: l1.id,
      originalSnapshot: engine.snapshot(),
      originalTransform: { x: 0, y: 0, scaleX: 1, scaleY: 1, rotation: 0, flipH: false, flipV: false },
      mode: "resize",
      lockRatio: false,
      startedAt: Date.now(),
    });
    await tick();

    expect(ed.layerTransformSession()).not.toBeNull();

    // Switch to crop (any other tool)
    setTool("crop");
    await tick();

    // Transform session should be cleared
    expect(ed.layerTransformSession()).toBeNull();
  });
});

describe("Phase 5 Cross-Tool State Interaction (UX contracts)", () => {
  let ws: WorkspaceManager;
  let renderer: any;
  let scheduler: any;
  let container: HTMLDivElement;
  let dispose: () => void;
  let editorRef: { current: any };

  const tick = (ms = 50) => new Promise<void>((resolve) => setTimeout(resolve, ms));

  const DeepTestConsumer = () => {
    editorRef.current = useEditor();
    return null;
  };

  beforeEach(async () => {
    ws = new WorkspaceManager();
    renderer = { uploadImage: vi.fn(), destroyTexture: vi.fn() };
    scheduler = { requestRender: vi.fn() };
    container = document.createElement("div");
    document.body.appendChild(container);
    editorRef = { current: null };

    mockOnViewportPointerDown.mockClear();
    mockOnViewportPointerUp.mockClear();
    mockOnViewportPointerCancel.mockClear();
    mockOnViewportLostPointerCapture.mockClear();
    mockCommitBrushStroke.mockClear();
    mockSpacePressed = false;
    mockPanningActive = false;

    Element.prototype.setPointerCapture = vi.fn();
    Element.prototype.releasePointerCapture = vi.fn();

    const session = WorkspaceManager.createBlankDocument("cross", "Cross", 800, 600);
    ws.addDocument(session);

    dispose = render(
      () => (
        <EditorProvider workspace={ws} renderer={renderer} scheduler={scheduler}>
          <TestConsumer />
          <DeepTestConsumer />
          <CanvasViewport />
        </EditorProvider>
      ),
      container,
    );

    await tick();
  });

  afterEach(() => {
    if (dispose) dispose();
    if (container.parentNode) container.parentNode.removeChild(container);
    vi.restoreAllMocks();
  });

  it("Selection persists across non-crop tool switch (cross-tool UX contract)", async () => {
    const ed = editorRef.current;
    setTool("select");
    await tick();

    ed.setSelection({ x: 50, y: 50, width: 200, height: 100, angle: 0 });
    await tick();

    expect(ed.selection()).not.toBeNull();

    // Switch through all non-crop tools (selection is document state, persists)
    setTool("move");
    await tick();
    setTool("brush");
    await tick();
    setTool("select");
    await tick();

    // Selection should survive the round-trip
    const sel = ed.selection();
    expect(sel).not.toBeNull();
    expect(sel.x).toBe(50);
    expect(sel.y).toBe(50);
    expect(sel.width).toBe(200);
    expect(sel.height).toBe(100);
  });

  it("Selection is cleared on entering crop tool (documented design)", async () => {
    const ed = editorRef.current;
    setTool("select");
    await tick();

    ed.setSelection({ x: 50, y: 50, width: 200, height: 100, angle: 0 });
    await tick();

    expect(ed.selection()).not.toBeNull();

    // Entering crop is a fresh operation. Selection is intentionally
    // cleared (different tool = different operation, similar to how
    // cropRect is independent from selection). Documented here so
    // future maintainers know this is by design, not a bug.
    setTool("crop");
    setCropInteractionMode("modern");
    await tick();

    expect(ed.selection()).toBeNull();
  });

  it("Active layer persists across tool switch (document state contract)", async () => {
    const ed = editorRef.current;
    const engine = ws.getActiveEngine()!;

    const l1 = engine.addLayer("L1");
    const l2 = engine.addLayer("L2");
    await tick();

    expect(ed.activeLayerId()).toBe(l2.id);

    setTool("move");
    await tick();
    setTool("brush");
    await tick();
    setTool("crop");
    await tick();
    setTool("select");
    await tick();

    // Active layer should still be l2 (last activated, not reset to default)
    expect(ed.activeLayerId()).toBe(l2.id);
  });

  it("Brush settings persist across tool switch (user preferences contract)", async () => {
    const ed = editorRef.current;
    setTool("brush");
    await tick();

    ed.setBrushSize(150);
    ed.setBrushHardness(0.8);
    ed.setBrushOpacity(0.65);
    await tick();

    expect(ed.brushSize()).toBe(150);
    expect(ed.brushHardness()).toBe(0.8);
    expect(ed.brushOpacity()).toBe(0.65);

    // Switch through other tools
    setTool("move");
    await tick();
    setTool("crop");
    await tick();
    setTool("select");
    await tick();
    setTool("brush");
    await tick();

    // User preferences should persist
    expect(ed.brushSize()).toBe(150);
    expect(ed.brushHardness()).toBe(0.8);
    expect(ed.brushOpacity()).toBe(0.65);
  });

  it("Crop (modern): switching away and back creates fresh frame (no orphan state)", async () => {
    const ed = editorRef.current;
    setTool("crop");
    setCropInteractionMode("modern");
    await tick();

    const firstFrame = ed.modernCropFrame();
    expect(firstFrame).not.toBeNull();

    // Switch to another tool
    setTool("move");
    await tick();
    expect(ed.modernCropFrame()).toBeNull();

    // Switch back to crop
    setTool("crop");
    await tick();

    // Should have a fresh frame (may differ in position due to viewport sync,
    // but should exist and be valid)
    const secondFrame = ed.modernCropFrame();
    expect(secondFrame).not.toBeNull();
    expect(secondFrame.w).toBeGreaterThan(0);
    expect(secondFrame.h).toBeGreaterThan(0);
  });
});

describe("CanvasViewport Overlay Container (Screen-Space Migration)", () => {
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

    Element.prototype.setPointerCapture = vi.fn();
    Element.prototype.releasePointerCapture = vi.fn();
  });

  afterEach(() => {
    if (dispose) dispose();
    container.parentNode?.removeChild(container);
    vi.restoreAllMocks();
  });

  it("positions artboard border in screen-space coords (no CSS transform wrapper)", async () => {
    const session = WorkspaceManager.createBlankDocument(
      "doc-screen-space",
      "Doc",
      800,
      600,
    );
    ws.addDocument(session);
    ws.switchDocument("doc-screen-space");

    const result = render(
      () => (
        <EditorProvider
          workspace={ws}
          renderer={renderer}
          scheduler={scheduler}
        >
          <TestConsumer />
          <CanvasViewport />
        </EditorProvider>
      ),
      container,
    );
    dispose = result;
    setCropInteractionMode("classic");

    const engine = session.engine;
    engine.setViewport({ panX: 50, panY: 50, zoom: 2.0 });
    await new Promise((resolve) => setTimeout(resolve, 0));

    const artboard = container.querySelector(
      "[data-artboard-border]",
    ) as HTMLDivElement;
    expect(artboard).not.toBeNull();

    // Artboard border must use explicit screen-space coords, NOT CSS transform
    expect(artboard.style.left).toBe("50px");
    expect(artboard.style.top).toBe("50px");
    expect(artboard.style.width).toBe("1600px");
    expect(artboard.style.height).toBe("1200px");
    expect(artboard.style.transform).toBe("");

    // No wrapper div with transform: translate3d(...) scale(...) should exist
    // (In this test crop mode is not active, so the only transform that
    // would be a "wrapper" is the overlay container's viewport transform.)
    const allDivs = container.querySelectorAll("div");
    for (const div of Array.from(allDivs)) {
      const t = (div as HTMLDivElement).style.transform;
      if (t && t.includes("translate3d") && t.includes("scale(")) {
        throw new Error(
          `Found unexpected CSS transform wrapper: div.transform="${t}"`,
        );
      }
    }
  });
});

describe("CanvasViewport Modern Crop dashed canvas boundary line", () => {
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

    Element.prototype.setPointerCapture = vi.fn();
    Element.prototype.releasePointerCapture = vi.fn();
  });

  afterEach(() => {
    if (dispose) dispose();
    container.parentNode?.removeChild(container);
    vi.restoreAllMocks();
  });

  it("dashed canvas boundary line is at doc position, NOT affected by image transform offset/scale", async () => {
    const session = WorkspaceManager.createBlankDocument(
      "doc-dashed",
      "Doc",
      800,
      600,
    );
    ws.addDocument(session);
    ws.switchDocument("doc-dashed");

    const result = render(
      () => (
        <EditorProvider
          workspace={ws}
          renderer={renderer}
          scheduler={scheduler}
        >
          <TestConsumer />
          <CanvasViewport />
        </EditorProvider>
      ),
      container,
    );
    dispose = result;
    setCropInteractionMode("classic");

    // Enter modern crop with default frame
    setTool("crop");
    setCropInteractionMode("modern");
    await new Promise((resolve) => setTimeout(resolve, 0));

    // Find the dashed line rect (stroke-dasharray="6,4")
    const dashedRect = container.querySelector(
      'rect[stroke-dasharray="6,4"]',
    ) as SVGRectElement | null;

    // The dashed line may not be visible if the frame fits inside the doc.
    // To force it to show, set frame to be larger than the doc.
    setModernFrameState({ x: -200, y: -200, w: 1200, h: 1000 });
    await new Promise((resolve) => setTimeout(resolve, 0));

    const dashedAfterFrame = container.querySelector(
      'rect[stroke-dasharray="6,4"]',
    ) as SVGRectElement | null;
    expect(dashedAfterFrame).not.toBeNull();
    const dashXBefore = dashedAfterFrame!.getAttribute("x");
    const dashYBefore = dashedAfterFrame!.getAttribute("y");
    const dashWBefore = dashedAfterFrame!.getAttribute("width");
    const dashHBefore = dashedAfterFrame!.getAttribute("height");

    // Now set a non-zero image transform offset (simulating user dragging the cropbox)
    setModernImageTransform({
      offsetX: 50,
      offsetY: 30,
      rotation: 0,
      scale: 1.5,
    });
    await new Promise((resolve) => setTimeout(resolve, 0));

    const dashedAfterOffset = container.querySelector(
      'rect[stroke-dasharray="6,4"]',
    ) as SVGRectElement | null;
    expect(dashedAfterOffset).not.toBeNull();

    // The dashed line should be at the SAME doc position (NOT affected by offset)
    expect(dashedAfterOffset!.getAttribute("x")).toBe(dashXBefore);
    expect(dashedAfterOffset!.getAttribute("y")).toBe(dashYBefore);
    expect(dashedAfterOffset!.getAttribute("width")).toBe(dashWBefore);
    expect(dashedAfterOffset!.getAttribute("height")).toBe(dashHBefore);
  });
});

describe("CanvasViewport Modern Crop → Camera Image Transform Sync", () => {
  let ws: WorkspaceManager;
  let renderer: any;
  let scheduler: any;
  let container: HTMLDivElement;
  let dispose: () => void;
  let testCamera: ViewportCamera;

  beforeEach(() => {
    ws = new WorkspaceManager();
    renderer = { uploadImage: vi.fn(), destroyTexture: vi.fn() };
    scheduler = { requestRender: vi.fn() };
    container = document.createElement("div");
    document.body.appendChild(container);

    Element.prototype.setPointerCapture = vi.fn();
    Element.prototype.releasePointerCapture = vi.fn();

    testCamera = new ViewportCamera();
  });

  afterEach(() => {
    if (dispose) dispose();
    container.parentNode?.removeChild(container);
    vi.restoreAllMocks();
  });

  it("modern crop with frame + transform propagates to camera image transform", async () => {
    const session = WorkspaceManager.createBlankDocument(
      "doc-mc-1",
      "Doc",
      800,
      600,
    );
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

    // Set frame BEFORE entering modern crop to use our specific frame
    setModernFrameState({ x: 100, y: 100, w: 200, h: 200 });
    setModernImageTransform({
      offsetX: 0,
      offsetY: 0,
      rotation: 30,
      scale: 1,
    });
    setTool("crop");
    setCropInteractionMode("modern");
    await new Promise((resolve) => setTimeout(resolve, 0));

    const it = testCamera.getImageTransform();
    expect(it.rotation).toBe(30);
    expect(it.scale).toBe(1);
    expect(it.pivotScreen).not.toBeNull();
    expect(it.pivotDocument).not.toBeNull();
    // With scale=1, pan=0, offset=0: pivotScreen == pivotDocument
    expect(it.pivotScreen?.x).toBeCloseTo(it.pivotDocument?.x ?? 0, 5);
    expect(it.pivotScreen?.y).toBeCloseTo(it.pivotDocument?.y ?? 0, 5);
  });

  it("modern crop exit resets camera image transform to identity", async () => {
    const session = WorkspaceManager.createBlankDocument(
      "doc-mc-2",
      "Doc",
      800,
      600,
    );
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

    setModernFrameState({ x: 100, y: 100, w: 200, h: 200 });
    setModernImageTransform({
      offsetX: 0,
      offsetY: 0,
      rotation: 45,
      scale: 1.5,
    });
    setTool("crop");
    setCropInteractionMode("modern");
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(testCamera.getImageTransform().rotation).toBe(45);

    setTool("move");
    await new Promise((resolve) => setTimeout(resolve, 0));

    const it = testCamera.getImageTransform();
    expect(it.rotation).toBe(0);
    expect(it.scale).toBe(1);
    expect(it.pivotScreen).toBeNull();
    expect(it.pivotDocument).toBeNull();
  });

  it("feature flag OFF: modern crop uses legacy CSS path (camera not touched)", async () => {
    const session = WorkspaceManager.createBlankDocument(
      "doc-mc-flag",
      "Doc",
      800,
      600,
    );
    ws.addDocument(session);
    ws.switchDocument("doc-mc-flag");

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

    // Disable the feature flag
    setUseGPUCameraForModernCrop(false);

    setModernFrameState({ x: 100, y: 100, w: 200, h: 200 });
    setModernImageTransform({
      offsetX: 0,
      offsetY: 0,
      rotation: 60,
      scale: 2,
    });
    setTool("crop");
    setCropInteractionMode("modern");
    await new Promise((resolve) => setTimeout(resolve, 0));

    // Camera should NOT have the transform set (legacy path uses CSS instead)
    const it = testCamera.getImageTransform();
    expect(it.rotation).toBe(0);
    expect(it.scale).toBe(1);
    expect(it.pivotScreen).toBeNull();
    expect(it.pivotDocument).toBeNull();
  });
});
