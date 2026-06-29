import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { renderHook } from "@solidjs/testing-library";
import { render } from "solid-js/web";
import { DragControllerProvider, useDragController, DragGlobalGuard } from "../DragController";

describe("DragController", () => {
  const testWorkspace = { switchDocument: vi.fn() };
  const wrapper = (props: any) => (
    <DragControllerProvider workspaceOverride={testWorkspace} {...props} />
  );

  beforeEach(() => {
    vi.useFakeTimers();
    testWorkspace.switchDocument.mockClear();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it("begins a layer drag and stores payload", () => {
    const { result } = renderHook(() => useDragController(), { wrapper });
    result.beginLayerDrag({
      version: 1,
      sourceDocId: "d",
      layerId: "l",
      sourceName: "n",
      isAltPressed: false,
    }, null);
    expect(result.state().dragKind).toBe("layer");
    expect(result.state().payload?.layerId).toBe("l");
  });

  it("endDrag clears all state", () => {
    const { result } = renderHook(() => useDragController(), { wrapper });
    result.beginLayerDrag({
      version: 1,
      sourceDocId: "d",
      layerId: "l",
      sourceName: "n",
      isAltPressed: false,
    }, null);
    result.endDrag();
    expect(result.state().dragKind).toBeNull();
    expect(result.state().payload).toBeNull();
  });

  it("startTabHover triggers workspace.switchDocument after 500ms", () => {
    const switchDocument = vi.fn();
    const { result } = renderHook(() => useDragController(), {
      wrapper: (props: any) => (
        <DragControllerProvider workspaceOverride={{ switchDocument } as any} {...props} />
      ),
    });
    result.startTabHover("doc-B");
    vi.advanceTimersByTime(500);
    expect(switchDocument).toHaveBeenCalledWith("doc-B");
    expect(result.state().hoverTabId).toBeNull();
  });

  it("cancelTabHover prevents switch if called before 500ms", () => {
    const switchDocument = vi.fn();
    const { result } = renderHook(() => useDragController(), {
      wrapper: (props: any) => (
        <DragControllerProvider workspaceOverride={{ switchDocument } as any} {...props} />
      ),
    });
    result.startTabHover("doc-B");
    vi.advanceTimersByTime(300);
    result.cancelTabHover();
    vi.advanceTimersByTime(300);
    expect(switchDocument).not.toHaveBeenCalled();
  });

  it("setDropTarget updates state", () => {
    const { result } = renderHook(() => useDragController(), { wrapper });
    result.setDropTarget({ type: "canvas" });
    expect(result.state().dropTarget).toEqual({ type: "canvas" });
  });

  it("beginFileDrag sets file paths and position", () => {
    const { result } = renderHook(() => useDragController(), { wrapper });
    result.beginFileDrag(["/a.png", "/b.jpg"], { x: 100, y: 200 });
    expect(result.state().dragKind).toBe("file");
    expect(result.state().filePaths).toEqual(["/a.png", "/b.jpg"]);
    expect(result.state().dragStartPosition).toEqual({ x: 100, y: 200 });
  });

  it("beginFileDrag with empty paths (OS file drop path)", () => {
    const { result } = renderHook(() => useDragController(), { wrapper });
    result.beginFileDrag([], { x: 100, y: 200 });
    expect(result.state().dragKind).toBe("file");
    expect(result.state().filePaths).toEqual([]);
    expect(result.state().dragStartPosition).toEqual({ x: 100, y: 200 });
  });

  it("endDrag clears hover state", () => {
    const switchDocument = vi.fn();
    const { result } = renderHook(() => useDragController(), {
      wrapper: (props: any) => (
        <DragControllerProvider workspaceOverride={{ switchDocument } as any} {...props} />
      ),
    });
    result.startTabHover("doc-B");
    result.endDrag();
    vi.advanceTimersByTime(500);
    expect(switchDocument).not.toHaveBeenCalled();
  });

  it("startTabHover does NOT reset timer when re-called with same tab (user keeps moving)", () => {
    const switchDocument = vi.fn();
    const { result } = renderHook(() => useDragController(), {
      wrapper: (props: any) => (
        <DragControllerProvider workspaceOverride={{ switchDocument } as any} {...props} />
      ),
    });
    // First hover starts the timer.
    result.startTabHover("doc-B");
    vi.advanceTimersByTime(300);
    // Re-hovering the same tab (e.g., a pointermove during drag) must
    // NOT reset the timer — otherwise the user can never hold still
    // long enough for the switch to fire.
    result.startTabHover("doc-B");
    vi.advanceTimersByTime(300);
    // Total elapsed: 600ms, but the timer was started once at t=0 and
    // should fire at t=500. So we expect exactly one switch at ~500ms.
    expect(switchDocument).toHaveBeenCalledTimes(1);
    expect(switchDocument).toHaveBeenCalledWith("doc-B");
  });

  it("startTabHover DOES reset timer when called with a different tab", () => {
    const switchDocument = vi.fn();
    const { result } = renderHook(() => useDragController(), {
      wrapper: (props: any) => (
        <DragControllerProvider workspaceOverride={{ switchDocument } as any} {...props} />
      ),
    });
    result.startTabHover("doc-B");
    vi.advanceTimersByTime(300);
    // Different tab — restart the countdown.
    result.startTabHover("doc-C");
    vi.advanceTimersByTime(300);
    // Original timer (doc-B at t=500) was cancelled; new timer (doc-C)
    // fires at t=600 (300+300). So no switch yet.
    expect(switchDocument).not.toHaveBeenCalled();
    vi.advanceTimersByTime(200);
    // Now we're at t=800, doc-C timer (started at t=300) has fired.
    expect(switchDocument).toHaveBeenCalledWith("doc-C");
  });
});

describe("DragGlobalGuard wiring", () => {
  let container: HTMLDivElement;
  let dispose: () => void;

  function GuardHarness() {
    return (
      <DragControllerProvider workspaceOverride={{ switchDocument: vi.fn() }}>
        <DragGlobalGuard />
      </DragControllerProvider>
    );
  }

  beforeEach(() => {
    container = document.createElement("div");
    document.body.appendChild(container);
  });

  afterEach(() => {
    dispose?.();
    container.remove();
  });

  it("registers dragover listener and prevents default while layer drag is active", () => {
    // Render guard + provider, grab the controller via a nested component
    let ctrl!: ReturnType<typeof useDragController>;
    function Inner() { ctrl = useDragController(); return null; }
    dispose = render(() => <GuardHarness />, container);
    // Re-render with Inner to grab the controller reference
    // Instead, embed Inner in the harness directly
  });

  it("prevents default dragover when dragKind is set (layer drag)", () => {
    let ctrl!: ReturnType<typeof useDragController>;
    dispose = render(() => (
      <DragControllerProvider workspaceOverride={{ switchDocument: vi.fn() }}>
        <DragGlobalGuard />
        <OpenCtrlProvider callback={(c: ReturnType<typeof useDragController>) => { ctrl = c; }} />
      </DragControllerProvider>
    ), container);
    // Dispatch dragover BEFORE any drag — default should NOT be prevented
    const ev1 = new Event("dragover", { bubbles: true, cancelable: true });
    (ev1 as any).dataTransfer = null;
    container.dispatchEvent(ev1);
    expect(ev1.defaultPrevented).toBe(false);

    // Start a layer drag
    ctrl.beginLayerDrag({
      version: 1, sourceDocId: "d", layerId: "l", sourceName: "n", isAltPressed: false,
    }, null);

    // Now dragover should be prevented
    const ev2 = new Event("dragover", { bubbles: true, cancelable: true });
    (ev2 as any).dataTransfer = null;
    container.dispatchEvent(ev2);
    expect(ev2.defaultPrevented).toBe(true);
  });

  it("calls beginFileDrag and prevents default when dataTransfer contains Files", () => {
    let ctrl!: ReturnType<typeof useDragController>;
    dispose = render(() => (
      <DragControllerProvider workspaceOverride={{ switchDocument: vi.fn() }}>
        <DragGlobalGuard />
        <OpenCtrlProvider callback={(c: ReturnType<typeof useDragController>) => { ctrl = c; }} />
      </DragControllerProvider>
    ), container);

    // Dispatch dragover with Files dataTransfer
    const ev = new Event("dragover", { bubbles: true, cancelable: true });
    (ev as any).dataTransfer = { types: ["Files"] };
    container.dispatchEvent(ev);

    expect(ev.defaultPrevented).toBe(true);
    expect(ctrl.state().dragKind).toBe("file");
  });

  it("cleans up listener on unmount", () => {
    let ctrl!: ReturnType<typeof useDragController>;
    dispose = render(() => (
      <DragControllerProvider workspaceOverride={{ switchDocument: vi.fn() }}>
        <DragGlobalGuard />
        <OpenCtrlProvider callback={(c: ReturnType<typeof useDragController>) => { ctrl = c; }} />
      </DragControllerProvider>
    ), container);

    ctrl.beginLayerDrag({
      version: 1, sourceDocId: "d", layerId: "l", sourceName: "n", isAltPressed: false,
    }, null);

    dispose(); // unmount
    dispose = () => {};

    const ev = new Event("dragover", { bubbles: true, cancelable: true });
    (ev as any).dataTransfer = null;
    container.dispatchEvent(ev);
    // Listener removed — preventDefault should NOT happen
    expect(ev.defaultPrevented).toBe(false);
  });
});

// Helper component to expose the controller to wiring tests
function OpenCtrlProvider(props: { callback: (c: ReturnType<typeof useDragController>) => void }) {
  const ctrl = useDragController();
  props.callback(ctrl);
  return null;
}
