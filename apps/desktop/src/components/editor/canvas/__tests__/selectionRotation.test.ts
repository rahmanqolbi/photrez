import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import type { ViewportState } from "@/engine/types";
import { startSelectionRotation, type SelectionBox } from "../selectionRotation";

vi.mock("@/viewport/coords", () => ({
  screenToDocument: (x: number, y: number) => ({ x, y }),
}));

describe("startSelectionRotation", () => {
  let setBox: ReturnType<typeof vi.fn>;
  let getContainer: () => HTMLDivElement;
  let getEngine: () => { getViewport(): ViewportState } | null;

  beforeEach(() => {
    setBox = vi.fn();
    getContainer = () =>
      ({ getBoundingClientRect: () => new DOMRect(0, 0, 800, 600) }) as HTMLDivElement;
    getEngine = () => ({ getViewport: () => ({}) as ViewportState });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("returns early when no selection box — no listeners registered", () => {
    const addSpy = vi.spyOn(document, "addEventListener");
    startSelectionRotation(() => null, setBox as (box: SelectionBox | null) => void, getContainer, getEngine);
    expect(addSpy).not.toHaveBeenCalled();
  });

  it("returns early when engine is null — no listeners registered", () => {
    const addSpy = vi.spyOn(document, "addEventListener");
    startSelectionRotation(
      () => ({ x: 0, y: 0, w: 100, h: 100, angle: 0 }),
      setBox as (box: SelectionBox | null) => void,
      getContainer,
      () => null,
    );
    expect(addSpy).not.toHaveBeenCalled();
  });

  it("registers pointermove and pointerup on document when box exists", () => {
    const addSpy = vi.spyOn(document, "addEventListener");
    startSelectionRotation(
      () => ({ x: 0, y: 0, w: 100, h: 100, angle: 0 }),
      setBox as (box: SelectionBox | null) => void,
      getContainer,
      getEngine,
    );
    expect(addSpy).toHaveBeenCalledWith("pointermove", expect.any(Function));
    expect(addSpy).toHaveBeenCalledWith("pointerup", expect.any(Function));
  });

  it("removes listeners on pointerup", () => {
    const removeSpy = vi.spyOn(document, "removeEventListener");
    startSelectionRotation(
      () => ({ x: 0, y: 0, w: 100, h: 100, angle: 0 }),
      setBox as (box: SelectionBox | null) => void,
      getContainer,
      getEngine,
    );
    document.dispatchEvent(new PointerEvent("pointerup"));
    expect(removeSpy).toHaveBeenCalledWith("pointermove", expect.any(Function));
    expect(removeSpy).toHaveBeenCalledWith("pointerup", expect.any(Function));
  });

  it("calls setSelectionBox with an angle on pointermove", () => {
    startSelectionRotation(
      () => ({ x: 100, y: 100, w: 200, h: 150, angle: 10 }),
      setBox as (box: SelectionBox | null) => void,
      getContainer,
      getEngine,
    );
    // Move pointer above the box center (200,175) — at (200, 75)
    document.dispatchEvent(new PointerEvent("pointermove", { clientX: 200, clientY: 75 }));
    expect(setBox).toHaveBeenCalledWith(
      expect.objectContaining({ x: 100, y: 100, w: 200, h: 150 }),
    );
    const calledBox = setBox.mock.calls[0][0] as SelectionBox;
    expect(typeof calledBox.angle).toBe("number");
  });

  it("snaps rotation to 15-degree increments when Shift is held", () => {
    startSelectionRotation(
      () => ({ x: 100, y: 100, w: 200, h: 150, angle: 0 }),
      setBox as (box: SelectionBox | null) => void,
      getContainer,
      getEngine,
    );
    document.dispatchEvent(
      new PointerEvent("pointermove", { clientX: 200, clientY: 75, shiftKey: true }),
    );
    const calledBox = setBox.mock.calls[0][0] as SelectionBox;
    expect(calledBox.angle % 15).toBe(0);
  });
});
