import { describe, expect, it, vi, beforeEach } from "vitest";
import { render } from "solid-js/web";
import { EditorProvider, useEditor } from "../../shell/EditorContext";
import { usePanNavigation } from "../usePanNavigation";
import { WorkspaceManager } from "@/engine/workspace";

function PanHarness(props: {
  containerRef: HTMLDivElement;
  capture: (value: ReturnType<typeof useEditor>, nav: ReturnType<typeof usePanNavigation>) => void;
}) {
  const editor = useEditor();
  const nav = usePanNavigation({
    getCanvasContainerRef: () => props.containerRef,
    fitToScreenAndRender: vi.fn(),
  });
  props.capture(editor, nav);
  return null;
}

describe("usePanNavigation", () => {
  it("panning does NOT call engine.setViewport (regression: syncFromCamera re-selects layer)", async () => {
    const ws = new WorkspaceManager();
    const session = WorkspaceManager.createBlankDocument("pan-test", "Pan Test", 800, 600);
    vi.spyOn(session.engine, "setViewport");
    const renderer = {} as any;
    const scheduler = { requestRender: vi.fn() } as any;
    const viewport = document.createElement("div");
    viewport.getBoundingClientRect = () => ({
      x: 0, y: 0, top: 0, left: 0, right: 1000, bottom: 700,
      width: 1000, height: 700, toJSON: () => ({}),
    });
    const container = document.createElement("div");
    document.body.appendChild(container);
    let editor: any = null;
    let navigation: ReturnType<typeof usePanNavigation> | null = null;

    const dispose = render(
      () => (
        <EditorProvider workspace={ws} renderer={renderer} scheduler={scheduler}>
          <PanHarness
            containerRef={viewport}
            capture={(value, nav) => {
              editor = value;
              navigation = nav;
            }}
          />
        </EditorProvider>
      ),
      container,
    );
    ws.addDocument(session);
    await Promise.resolve();
    vi.clearAllMocks();

    // Set initial pan state by simulating a pan gesture
    const startX = 500;
    const startY = 300;

    // Simulate Space keydown to enable panning mode
    window.dispatchEvent(new KeyboardEvent("keydown", { key: " ", code: "Space", bubbles: true }));
    await Promise.resolve();

    // Simulate pointerdown to start panning
    const pointerDown = new PointerEvent("pointerdown", {
      clientX: startX, clientY: startY, button: 0, pointerId: 1, bubbles: true,
    });
    viewport.dispatchEvent(pointerDown);
    await Promise.resolve();

    // Clear mocks after pointerdown (setViewport may have been called during setup)
    vi.clearAllMocks();

    // Simulate pointermove during panning
    const pointerMove = new PointerEvent("pointermove", {
      clientX: startX + 50, clientY: startY + 30, button: 0, pointerId: 1, bubbles: true,
    });
    viewport.dispatchEvent(pointerMove);
    await Promise.resolve();

    // engine.setViewport should NOT be called during panning — it triggers
    // notifyChange → sync → setSelectedLayerId, re-selecting a deselected layer.
    expect(session.engine.setViewport).not.toHaveBeenCalled();

    // Clean up
    window.dispatchEvent(new KeyboardEvent("keyup", { key: " ", code: "Space", bubbles: true }));
    dispose();
    container.parentNode?.removeChild(container);
  });

  it("uses the same strong zoom step for Ctrl+wheel as keyboard zoom", async () => {
    const ws = new WorkspaceManager();
    const session = WorkspaceManager.createBlankDocument("wheel-zoom", "Wheel Zoom", 800, 600);
    const renderer = {} as any;
    const scheduler = { requestRender: vi.fn() } as any;
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
    let navigation: ReturnType<typeof usePanNavigation> | null = null;

    const dispose = render(
      () => (
        <EditorProvider workspace={ws} renderer={renderer} scheduler={scheduler}>
          <PanHarness
            containerRef={viewport}
            capture={(value, nav) => {
              editor = value;
              navigation = nav;
            }}
          />
        </EditorProvider>
      ),
      container,
    );
    ws.addDocument(session);
    await Promise.resolve();

    navigation!.handleWheel(new WheelEvent("wheel", {
      deltaY: -1,
      clientX: 500,
      clientY: 350,
      ctrlKey: true,
      cancelable: true,
    }));

    // Ctrl+wheel zoom is instant (no animation)
    expect(editor?.camera.getState().zoom).toBeCloseTo(1.25);
    expect(editor?.zoom()).toBeCloseTo(1.25);
    expect(scheduler.requestRender).toHaveBeenCalled();

    dispose();
    container.parentNode?.removeChild(container);
  });
});
