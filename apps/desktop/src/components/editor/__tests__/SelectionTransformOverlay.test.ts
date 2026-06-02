import { describe, it, expect, vi } from "vitest";
import { render } from "solid-js/web";
import { EditorProvider } from "../EditorContext";
import { SelectionTransformOverlay } from "../SelectionTransformOverlay";
import { WorkspaceManager } from "@/engine/workspace";

function h(tag: any, props: Record<string, unknown> | null, ...children: any[]): any {
  return () => {
    const el = tag({ ...(props || {}), children: children.length === 1 ? children[0] : children.length > 1 ? children : undefined });
    return el;
  };
}

describe("Resize pointer-capture fix", () => {
  it("captures pointer on root SVG, not on per-handle element", () => {
    const ws = new WorkspaceManager();
    const session = WorkspaceManager.createBlankDocument("test", "Test", 800, 600);

    const mockRenderer = {} as any;
    const mockScheduler = { requestRender: vi.fn() } as any;

    const origSet = SVGElement.prototype.setPointerCapture;
    const setSpy = vi.fn();
    SVGElement.prototype.setPointerCapture = setSpy;

    const origRelease = SVGElement.prototype.releasePointerCapture;
    const releaseSpy = vi.fn();
    SVGElement.prototype.releasePointerCapture = releaseSpy;

    const container = document.createElement("div");
    document.body.appendChild(container);

    const dispose = render(
      h(
        EditorProvider,
        { workspace: ws, renderer: mockRenderer, scheduler: mockScheduler },
        h(SelectionTransformOverlay, null),
      ),
      container,
    );

    // Add document after EditorProvider mounts so onChange fires syncState
    ws.addDocument(session);

    const svg = container.querySelector("svg[data-overlay-svg]");
    expect(svg).not.toBeNull();
    const handle = container.querySelector("[data-handle]");
    expect(handle).not.toBeNull();

    setSpy.mockClear();
    releaseSpy.mockClear();

    handle!.dispatchEvent(
      new PointerEvent("pointerdown", {
        pointerId: 42,
        bubbles: true,
        cancelable: true,
        clientX: 100,
        clientY: 100,
      }),
    );

    expect(setSpy).toHaveBeenCalledTimes(1);
    // The `this` context of the setPointerCapture call should be the root SVG
    expect(setSpy.mock.instances[0]).toBe(svg);
    expect(setSpy).toHaveBeenCalledWith(42);

    // Restore
    SVGElement.prototype.setPointerCapture = origSet;
    SVGElement.prototype.releasePointerCapture = origRelease;
    dispose();
    container.parentNode?.removeChild(container);
  });

  it("releases pointer capture on root SVG via pointerup", () => {
    const ws = new WorkspaceManager();
    const session = WorkspaceManager.createBlankDocument("test2", "Test", 800, 600);

    const mockRenderer = {} as any;
    const mockScheduler = { requestRender: vi.fn() } as any;

    const origSet = SVGElement.prototype.setPointerCapture;
    const setSpy = vi.fn();
    SVGElement.prototype.setPointerCapture = setSpy;

    const origRelease = SVGElement.prototype.releasePointerCapture;
    const releaseSpy = vi.fn();
    SVGElement.prototype.releasePointerCapture = releaseSpy;

    const container = document.createElement("div");
    document.body.appendChild(container);

    const dispose = render(
      h(
        EditorProvider,
        { workspace: ws, renderer: mockRenderer, scheduler: mockScheduler },
        h(SelectionTransformOverlay, null),
      ),
      container,
    );
    ws.addDocument(session);

    const svg = container.querySelector("svg[data-overlay-svg]") as SVGElement;
    const handle = container.querySelector("[data-handle]") as SVGElement;

    setSpy.mockClear();
    releaseSpy.mockClear();

    handle.dispatchEvent(
      new PointerEvent("pointerdown", {
        pointerId: 7,
        bubbles: true,
        cancelable: true,
        clientX: 100,
        clientY: 100,
      }),
    );
    expect(setSpy).toHaveBeenCalledWith(7);

    svg.dispatchEvent(
      new PointerEvent("pointerup", {
        pointerId: 7,
        bubbles: true,
      }),
    );

    expect(releaseSpy).toHaveBeenCalledTimes(1);
    expect(releaseSpy.mock.instances[0]).toBe(svg);
    expect(releaseSpy).toHaveBeenCalledWith(7);

    SVGElement.prototype.setPointerCapture = origSet;
    SVGElement.prototype.releasePointerCapture = origRelease;
    dispose();
    container.parentNode?.removeChild(container);
  });

  it("ignores pointermove from non-captured pointer", () => {
    const ws = new WorkspaceManager();
    const session = WorkspaceManager.createBlankDocument("test3", "Test", 800, 600);

    const requestRender = vi.fn();
    const mockRenderer = {} as any;
    const mockScheduler = { requestRender } as any;

    const origSet = SVGElement.prototype.setPointerCapture;
    const origRelease = SVGElement.prototype.releasePointerCapture;
    const setSpy = vi.fn();
    const releaseSpy = vi.fn();
    SVGElement.prototype.setPointerCapture = setSpy;
    SVGElement.prototype.releasePointerCapture = releaseSpy;

    const container = document.createElement("div");
    document.body.appendChild(container);

    const dispose = render(
      h(
        EditorProvider,
        { workspace: ws, renderer: mockRenderer, scheduler: mockScheduler },
        h(SelectionTransformOverlay, null),
      ),
      container,
    );
    ws.addDocument(session);

    const svg = container.querySelector("svg[data-overlay-svg]") as SVGElement;
    const handle = container.querySelector("[data-handle]") as SVGElement;

    setSpy.mockClear();
    releaseSpy.mockClear();
    requestRender.mockClear();

    // Capture with pointer 1
    handle.dispatchEvent(
      new PointerEvent("pointerdown", {
        pointerId: 1,
        bubbles: true,
        cancelable: true,
        clientX: 100,
        clientY: 100,
      }),
    );

    requestRender.mockClear();

    // Move with a DIFFERENT pointer id — should be ignored
    svg.dispatchEvent(
      new PointerEvent("pointermove", {
        pointerId: 2,
        bubbles: true,
        clientX: 120,
        clientY: 120,
      }),
    );
    expect(requestRender).not.toHaveBeenCalled();

    // Move WITH captured pointer id — should be processed
    svg.dispatchEvent(
      new PointerEvent("pointermove", {
        pointerId: 1,
        bubbles: true,
        clientX: 120,
        clientY: 120,
      }),
    );
    expect(requestRender).toHaveBeenCalledTimes(1);

    SVGElement.prototype.setPointerCapture = origSet;
    SVGElement.prototype.releasePointerCapture = origRelease;
    dispose();
    container.parentNode?.removeChild(container);
  });
});

describe("Snap line cleanup", () => {
  function setup(customProps: Record<string, unknown> = {}) {
    const ws = new WorkspaceManager();
    const session = WorkspaceManager.createBlankDocument("snap-test", "Test", 800, 600);

    const mockRenderer = {} as any;
    const mockScheduler = { requestRender: vi.fn() } as any;

    const origSet = SVGElement.prototype.setPointerCapture;
    const origRelease = SVGElement.prototype.releasePointerCapture;

    const setSpy = vi.fn();
    const releaseSpy = vi.fn();
    SVGElement.prototype.setPointerCapture = setSpy;
    SVGElement.prototype.releasePointerCapture = releaseSpy;

    const container = document.createElement("div");
    document.body.appendChild(container);

    const onSnapClear = vi.fn();
    const onHudUpdate = vi.fn();
    const onComputeSnap = vi.fn(() => ({ dx: 0, dy: 0, lines: [] }));

    const dispose = render(
      h(
        EditorProvider,
        { workspace: ws, renderer: mockRenderer, scheduler: mockScheduler },
        h(SelectionTransformOverlay, { onSnapClear, onHudUpdate, onComputeSnap, ...customProps }),
      ),
      container,
    );
    ws.addDocument(session);

    const svg = container.querySelector("svg[data-overlay-svg]") as SVGElement;
    const handle = container.querySelector("[data-handle]") as SVGElement;
    const moveRect = container.querySelector("rect[data-move]") as SVGElement;

    onSnapClear.mockClear();
    onHudUpdate.mockClear();
    onComputeSnap.mockClear();

    return { ws, svg, handle, moveRect, onSnapClear, onHudUpdate, dispose, restore: () => {
      SVGElement.prototype.setPointerCapture = origSet;
      SVGElement.prototype.releasePointerCapture = origRelease;
      dispose();
      container.parentNode?.removeChild(container);
    }};
  }

  function startMoveDrag(svg: SVGElement, handle: SVGElement) {
    handle.dispatchEvent(
      new PointerEvent("pointerdown", {
        pointerId: 10,
        bubbles: true,
        cancelable: true,
        clientX: 100,
        clientY: 100,
      }),
    );
    svg.dispatchEvent(
      new PointerEvent("pointermove", {
        pointerId: 10,
        bubbles: true,
        clientX: 120,
        clientY: 120,
      }),
    );
  }

  it("clears snap lines on pointerup after move drag", () => {
    const { svg, handle, onSnapClear, restore } = setup();
    startMoveDrag(svg, handle);

    svg.dispatchEvent(new PointerEvent("pointerup", { pointerId: 10, bubbles: true }));

    expect(onSnapClear).toHaveBeenCalledTimes(1);
    restore();
  });

  it("clears snap lines on pointercancel after move drag", () => {
    const { svg, handle, onSnapClear, restore } = setup();
    startMoveDrag(svg, handle);

    svg.dispatchEvent(new PointerEvent("pointercancel", { pointerId: 10, bubbles: true }));

    expect(onSnapClear).toHaveBeenCalledTimes(1);
    restore();
  });

  it("clears snap lines on lostpointercapture after move drag", () => {
    const { svg, handle, onSnapClear, restore } = setup();
    startMoveDrag(svg, handle);

    svg.dispatchEvent(new PointerEvent("lostpointercapture", { pointerId: 10, bubbles: true }));

    expect(onSnapClear).toHaveBeenCalledTimes(1);
    restore();
  });

  it("clears snap lines on Escape keydown during drag", () => {
    const { svg, handle, onSnapClear, restore } = setup();
    startMoveDrag(svg, handle);

    window.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));

    expect(onSnapClear).toHaveBeenCalledTimes(1);
    restore();
  });

  it("disables snapping when snap toggle is OFF during overlay move drag", () => {
    const onComputeSnap = vi.fn(() => ({ dx: 5, dy: 5, lines: [{ x1: 100, y1: 0, x2: 100, y2: 1000 }] }));
    const onSnapClear = vi.fn();
    const { svg, moveRect, restore } = setup({ onComputeSnap, onSnapClear, moveSnapEnabled: false });

    moveRect.dispatchEvent(
      new PointerEvent("pointerdown", {
        pointerId: 25,
        bubbles: true,
        cancelable: true,
        clientX: 100,
        clientY: 100,
      }),
    );

    onComputeSnap.mockClear();
    onSnapClear.mockClear();

    // Move without Alt — onComputeSnap should NOT fire because snap toggle is OFF
    svg.dispatchEvent(
      new PointerEvent("pointermove", {
        pointerId: 25,
        bubbles: true,
        clientX: 120,
        clientY: 120,
      }),
    );
    expect(onComputeSnap).not.toHaveBeenCalled();
    expect(onSnapClear).toHaveBeenCalled();

    restore();
  });

  it("disables snapping when Alt is held during overlay move drag", () => {
    const onComputeSnap = vi.fn(() => ({ dx: 5, dy: 5, lines: [{ x1: 100, y1: 0, x2: 100, y2: 1000 }] }));
    const onSnapClear = vi.fn();
    const { svg, moveRect, restore } = setup({ onComputeSnap, onSnapClear });

    // Start drag on move zone (triggers drag.type = "move")
    moveRect.dispatchEvent(
      new PointerEvent("pointerdown", {
        pointerId: 20,
        bubbles: true,
        cancelable: true,
        clientX: 100,
        clientY: 100,
      }),
    );

    onComputeSnap.mockClear();
    onSnapClear.mockClear();

    // Move WITHOUT Alt — onComputeSnap should fire
    svg.dispatchEvent(
      new PointerEvent("pointermove", {
        pointerId: 20,
        bubbles: true,
        clientX: 120,
        clientY: 120,
      }),
    );
    expect(onComputeSnap).toHaveBeenCalledTimes(1);
    onComputeSnap.mockClear();
    onSnapClear.mockClear();

    // Move WITH Alt — onComputeSnap should NOT fire, onSnapClear should fire
    svg.dispatchEvent(
      new PointerEvent("pointermove", {
        pointerId: 20,
        bubbles: true,
        clientX: 140,
        clientY: 140,
        altKey: true,
      }),
    );
    expect(onComputeSnap).not.toHaveBeenCalled();
    expect(onSnapClear).toHaveBeenCalledTimes(1);

    restore();
  });
});
