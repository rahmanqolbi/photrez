import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { renderHook } from "@solidjs/testing-library";
import { DragControllerProvider, useDragController } from "../DragController";

describe("DragController", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it("begins a layer drag and stores payload", () => {
    const { result } = renderHook(() => useDragController(), { wrapper: DragControllerProvider });
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
    const { result } = renderHook(() => useDragController(), { wrapper: DragControllerProvider });
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
    const { result } = renderHook(() => useDragController(), { wrapper: DragControllerProvider });
    result.setDropTarget({ type: "canvas" });
    expect(result.state().dropTarget).toEqual({ type: "canvas" });
  });

  it("beginFileDrag sets file paths and position", () => {
    const { result } = renderHook(() => useDragController(), { wrapper: DragControllerProvider });
    result.beginFileDrag(["/a.png", "/b.jpg"], { x: 100, y: 200 });
    expect(result.state().dragKind).toBe("file");
    expect(result.state().filePaths).toEqual(["/a.png", "/b.jpg"]);
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
});
