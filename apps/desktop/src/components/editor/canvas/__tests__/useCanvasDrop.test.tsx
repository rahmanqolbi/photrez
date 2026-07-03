import { describe, it, expect, vi } from "vitest";
import { useCanvasDrop } from "../useCanvasDrop";
import type { DragController, DragState } from "../../DragController";
import type { ViewportCamera } from "@/viewport/viewportCamera";

function fakeState(overrides?: Partial<DragState>): DragState {
  return {
    dragKind: null,
    payload: null,
    filePaths: null,
    dragStartPosition: null,
    dropTarget: null,
    hoverTabId: null,
    cascadeIndex: 0,
    ...overrides,
  };
}

function createDragController(initialState: DragState = fakeState()): DragController {
  let state = { ...initialState };
  return {
    state: () => state,
    beginLayerDrag: vi.fn(),
    beginFileDrag: vi.fn(),
    endDrag: vi.fn(() => { state = fakeState(); }),
    setDropTarget: vi.fn((t) => { state.dropTarget = t; }),
    startTabHover: vi.fn(),
    cancelTabHover: vi.fn(),
    isTabHovering: vi.fn(() => false),
  };
}

function createCamera() {
  return { screenToDocument: vi.fn((x: number, y: number) => ({ x, y })) } as unknown as ViewportCamera;
}

// jsdom does not implement DragEvent — use plain Event instead
function dragEvent(type: string, opts: Partial<EventInit> & { relatedTarget?: EventTarget | null } = {}): Event {
  const evt = new Event(type, { bubbles: true, cancelable: true, ...opts });
  if ("relatedTarget" in opts) {
    Object.defineProperty(evt, "relatedTarget", { value: opts.relatedTarget });
  }
  return evt;
}

describe("useCanvasDrop", () => {
  it("calls preventDefault on dragover and sets canvas drop target", () => {
    const dc = createDragController(fakeState({ dragKind: "layer" }));
    const { onDragOver } = useCanvasDrop({
      dragController: dc,
      camera: createCamera(),
      workspace: {} as any,
      renderer: {} as any,
      scheduler: { requestRender: vi.fn() },
    });

    const evt = dragEvent("dragover") as DragEvent;
    const preventDefault = vi.spyOn(evt, "preventDefault");
    onDragOver(evt);

    expect(preventDefault).toHaveBeenCalled();
    expect(dc.setDropTarget).toHaveBeenCalledWith({ type: "canvas" });
  });

  it("does not set drop target when no drag is active", () => {
    const dc = createDragController(fakeState({ dragKind: null }));
    const { onDragOver } = useCanvasDrop({
      dragController: dc,
      camera: createCamera(),
      workspace: {} as any,
      renderer: {} as any,
      scheduler: { requestRender: vi.fn() },
    });

    onDragOver(dragEvent("dragover") as DragEvent);
    expect(dc.setDropTarget).not.toHaveBeenCalled();
  });

  it("calls endDrag on drop even when no drag kind matches", () => {
    const dc = createDragController(fakeState({ dragKind: null }));
    const { onDrop } = useCanvasDrop({
      dragController: dc,
      camera: createCamera(),
      workspace: {} as any,
      renderer: {} as any,
      scheduler: { requestRender: vi.fn() },
    });

    onDrop(dragEvent("drop") as DragEvent);
    expect(dc.endDrag).toHaveBeenCalled();
  });

  it("clears canvas drop target on dragLeave when mouse leaves the element", () => {
    const dc = createDragController(fakeState({ dragKind: "layer", dropTarget: { type: "canvas" } }));
    const { onDragLeave } = useCanvasDrop({
      dragController: dc,
      camera: createCamera(),
      workspace: {} as any,
      renderer: {} as any,
      scheduler: { requestRender: vi.fn() },
    });

    const el = document.createElement("div");
    const evt = dragEvent("dragleave", { relatedTarget: document.createElement("span") });
    Object.defineProperty(evt, "currentTarget", { value: el });

    onDragLeave(evt as DragEvent);
    expect(dc.setDropTarget).toHaveBeenCalledWith(null);
  });

  it("does not clear canvas drop target when dragLeave moves inside the element", () => {
    const dc = createDragController(fakeState({ dragKind: "layer", dropTarget: { type: "canvas" } }));
    const { onDragLeave } = useCanvasDrop({
      dragController: dc,
      camera: createCamera(),
      workspace: {} as any,
      renderer: {} as any,
      scheduler: { requestRender: vi.fn() },
    });

    const el = document.createElement("div");
    const child = document.createElement("span");
    el.appendChild(child);
    const evt = dragEvent("dragleave");
    Object.defineProperty(evt, "currentTarget", { value: el });
    Object.defineProperty(evt, "relatedTarget", { value: child });

    onDragLeave(evt as DragEvent);
    // relatedTarget is a child of currentTarget → still inside the element
    expect(dc.setDropTarget).not.toHaveBeenCalledWith(null);
  });
});
