import { describe, it, expect, vi } from "vitest";
import { render } from "solid-js/web";
import { SelectionRenderer } from "../SelectionRenderer";
import { SelectionState } from "../SelectionTypes";

function renderComponent(props: {
  selection: SelectionState | null;
  zoom?: number;
  pan?: { x: number; y: number };
  onHandlePointerDown?: (handleId: string) => void;
  onRotatePointerDown?: () => void;
}) {
  const container = document.createElement("div");
  document.body.appendChild(container);
  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  container.appendChild(svg);
  const dispose = render(
    () => (
      <SelectionRenderer
        selection={props.selection}
        zoom={props.zoom ?? 1}
        pan={props.pan ?? { x: 0, y: 0 }}
        onHandlePointerDown={props.onHandlePointerDown ?? vi.fn()}
        onRotatePointerDown={props.onRotatePointerDown ?? vi.fn()}
      />
    ),
    svg,
  );
  return { container, dispose };
}

describe("SelectionRenderer", () => {
  it("renders nothing when selection is null", () => {
    const { container, dispose } = renderComponent({ selection: null });
    expect(container.querySelector("rect")).toBeNull();
    expect(container.querySelector("circle")).toBeNull();
    dispose();
  });

  it("renders marquee rect with screen-space coordinates", () => {
    const sel: SelectionState = { x: 100, y: 50, width: 200, height: 150, angle: 0 };
    const { container, dispose } = renderComponent({ selection: sel, zoom: 2, pan: { x: 10, y: 20 } });
    const rect = container.querySelector("rect");
    expect(rect).not.toBeNull();
    expect(rect!.getAttribute("x")).toBe("210");
    expect(rect!.getAttribute("y")).toBe("120");
    expect(rect!.getAttribute("width")).toBe("400");
    expect(rect!.getAttribute("height")).toBe("300");
    dispose();
  });

  it("renders with rotation group when angle !== 0", () => {
    const sel: SelectionState = { x: 0, y: 0, width: 100, height: 100, angle: 45 };
    const { container, dispose } = renderComponent({ selection: sel });
    const g = container.querySelector("g[transform]");
    expect(g).not.toBeNull();
    expect(g!.getAttribute("transform")).toContain("rotate(45");
    dispose();
  });

  it("renders with animate-dash class on rect", () => {
    const sel: SelectionState = { x: 0, y: 0, width: 100, height: 100, angle: 0 };
    const { container, dispose } = renderComponent({ selection: sel });
    expect(container.querySelector("rect.animate-dash")).not.toBeNull();
    dispose();
  });

  it("renders 8 resize handles", () => {
    const sel: SelectionState = { x: 0, y: 0, width: 100, height: 100, angle: 0 };
    const { container, dispose } = renderComponent({ selection: sel });
    const handles = container.querySelectorAll("[data-handle-id]");
    expect(handles.length).toBe(8);
    const ids = Array.from(handles).map((h) => h.getAttribute("data-handle-id"));
    expect(ids).toContain("nw");
    expect(ids).toContain("n");
    expect(ids).toContain("ne");
    expect(ids).toContain("e");
    expect(ids).toContain("se");
    expect(ids).toContain("s");
    expect(ids).toContain("sw");
    expect(ids).toContain("w");
    dispose();
  });

  it("renders rotation handle", () => {
    const sel: SelectionState = { x: 0, y: 0, width: 100, height: 100, angle: 0 };
    const { container, dispose } = renderComponent({ selection: sel });
    const rotHandle = container.querySelector("[data-rotation-handle]");
    expect(rotHandle).not.toBeNull();
    dispose();
  });

  it("calls onHandlePointerDown with correct handle id on pointer down", () => {
    const onHandle = vi.fn();
    const sel: SelectionState = { x: 0, y: 0, width: 100, height: 100, angle: 0 };
    const { container, dispose } = renderComponent({
      selection: sel,
      onHandlePointerDown: onHandle,
    });
    const seHandle = container.querySelector('[data-handle-id="se"]');
    expect(seHandle).not.toBeNull();
    seHandle!.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true }));
    expect(onHandle).toHaveBeenCalledWith("se");
    dispose();
  });

  it("calls onRotatePointerDown on rotation handle pointer down", () => {
    const onRotate = vi.fn();
    const sel: SelectionState = { x: 0, y: 0, width: 100, height: 100, angle: 0 };
    const { container, dispose } = renderComponent({
      selection: sel,
      onRotatePointerDown: onRotate,
    });
    const rotHandle = container.querySelector("[data-rotation-handle]");
    expect(rotHandle).not.toBeNull();
    rotHandle!.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true }));
    expect(onRotate).toHaveBeenCalled();
    dispose();
  });

  it("positions handles at correct corners for unrotated selection", () => {
    const sel: SelectionState = { x: 50, y: 30, width: 100, height: 80, angle: 0 };
    const { container, dispose } = renderComponent({ selection: sel });
    const nw = container.querySelector('[data-handle-id="nw"]') as SVGCircleElement;
    const se = container.querySelector('[data-handle-id="se"]') as SVGCircleElement;
    const n = container.querySelector('[data-handle-id="n"]') as SVGCircleElement;
    expect(nw.getAttribute("cx")).toBe("50");
    expect(nw.getAttribute("cy")).toBe("30");
    expect(se.getAttribute("cx")).toBe("150");
    expect(se.getAttribute("cy")).toBe("110");
    expect(n.getAttribute("cx")).toBe("100");
    expect(n.getAttribute("cy")).toBe("30");
    dispose();
  });
});
