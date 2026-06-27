import { describe, expect, it, vi } from "vitest";
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
