import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render } from "solid-js/web";
import { shouldPreventDefaultDrag, useDesktopGuards } from "../useDesktopGuards";

describe("shouldPreventDefaultDrag", () => {
  it("returns true for native browser drags (images, links, generic elements)", () => {
    const img = document.createElement("img");
    const event = { target: img } as unknown as DragEvent;
    expect(shouldPreventDefaultDrag(event)).toBe(true);
  });

  it("returns false for layer items (data-layer-idx present)", () => {
    const layer = document.createElement("div");
    layer.setAttribute("data-layer-idx", "0");
    const event = { target: layer } as unknown as DragEvent;
    expect(shouldPreventDefaultDrag(event)).toBe(false);
  });

  it("returns false for children of layer items (eye button, lock button, thumbnail)", () => {
    const layer = document.createElement("div");
    layer.setAttribute("data-layer-idx", "0");
    const eyeButton = document.createElement("button");
    layer.appendChild(eyeButton);
    const event = { target: eyeButton } as unknown as DragEvent;
    expect(shouldPreventDefaultDrag(event)).toBe(false);
  });

  it("returns false for nested descendants of layer items", () => {
    const layer = document.createElement("div");
    layer.setAttribute("data-layer-idx", "0");
    const span = document.createElement("span");
    const inner = document.createElement("span");
    span.appendChild(inner);
    layer.appendChild(span);
    const event = { target: inner } as unknown as DragEvent;
    expect(shouldPreventDefaultDrag(event)).toBe(false);
  });

  it("returns true for elements outside any layer item", () => {
    const unrelated = document.createElement("div");
    const event = { target: unrelated } as unknown as DragEvent;
    expect(shouldPreventDefaultDrag(event)).toBe(true);
  });
});

describe("useDesktopGuards wiring", () => {
  let container: HTMLDivElement;
  let dispose: () => void;

  function GuardsHarness() {
    useDesktopGuards();
    return null;
  }

  beforeEach(() => {
    container = document.createElement("div");
    document.body.appendChild(container);
  });

  afterEach(() => {
    dispose?.();
    container.remove();
  });

  it("prevents default contextmenu for non-editable targets", () => {
    dispose = render(() => GuardsHarness(), container);
    const ev = new MouseEvent("contextmenu", { bubbles: true, cancelable: true });
    document.dispatchEvent(ev);
    expect(ev.defaultPrevented).toBe(true);
  });

  it("does NOT prevent contextmenu for editable targets (input)", () => {
    dispose = render(() => GuardsHarness(), container);
    const input = document.createElement("input");
    container.appendChild(input);
    const ev = new MouseEvent("contextmenu", { bubbles: true, cancelable: true });
    input.dispatchEvent(ev);
    expect(ev.defaultPrevented).toBe(false);
  });

  it("prevents default dragstart for generic elements", () => {
    dispose = render(() => GuardsHarness(), container);
    const generic = document.createElement("div");
    container.appendChild(generic);
    // to verify the preventDefault wiring. Dispatch on a child element so
    // event.target is an Element (not Document — Document has no .closest).
    const ev = new Event("dragstart", { bubbles: true, cancelable: true });
    generic.dispatchEvent(ev);
    expect(ev.defaultPrevented).toBe(true);
  });

  it("does NOT prevent dragstart for layer items (data-layer-idx)", () => {
    dispose = render(() => GuardsHarness(), container);
    const layer = document.createElement("div");
    layer.setAttribute("data-layer-idx", "0");
    container.appendChild(layer);
    const ev = new Event("dragstart", { bubbles: true, cancelable: true });
    layer.dispatchEvent(ev);
    expect(ev.defaultPrevented).toBe(false);
  });

  it("cleans up event listeners on unmount", () => {
    dispose = render(() => GuardsHarness(), container);
    dispose(); // unmount
    dispose = () => {};

    const generic = document.createElement("div");
    container.appendChild(generic);
    const ev = new MouseEvent("contextmenu", { bubbles: true, cancelable: true });
    generic.dispatchEvent(ev);
    expect(ev.defaultPrevented).toBe(false);
  });
});
