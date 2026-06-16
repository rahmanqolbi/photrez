import { describe, it, expect } from "vitest";
import { shouldPreventDefaultDrag } from "../useDesktopGuards";

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
