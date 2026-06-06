import { describe, expect, it, vi, afterEach } from "vitest";
import { render } from "solid-js/web";
import { createSignal } from "solid-js";
import { BrushContextMenu } from "../BrushContextMenu";
import * as EditorContextModule from "../EditorContext";

function createMockEditor(overrides: Record<string, any> = {}) {
  const defaults: Record<string, any> = {
    activeTool: "brush",
    brushSize: 20,
    brushHardness: 0.8,
    brushOpacity: 1,
    brushFlow: 1,
    brushSmoothing: 0,
    eraserSize: 32,
    eraserHardness: 1,
    eraserOpacity: 1,
    eraserFlow: 1,
    eraserSmoothing: 0,
    brushPresetId: null,
    eraserPresetId: null,
  };
  const merged = { ...defaults, ...overrides };
  const signals: Record<string, any> = {};
  for (const [key, val] of Object.entries(merged)) {
    const [s, set] = createSignal(val);
    signals[key] = s;
    const setKey = "set" + key.charAt(0).toUpperCase() + key.slice(1);
    signals[setKey] = set;
  }
  return signals;
}

describe("BrushContextMenu", () => {
  let root: HTMLDivElement;
  let container: HTMLDivElement;

  afterEach(() => {
    document.body.innerHTML = "";
    vi.restoreAllMocks();
  });

  it("renders nothing by default (not open)", () => {
    const mock = createMockEditor({ activeTool: "brush" });
    vi.spyOn(EditorContextModule, "useEditor").mockReturnValue(mock as any);

    root = document.createElement("div");
    document.body.appendChild(root);
    const dispose = render(() => <BrushContextMenu />, root);

    expect(root.textContent).toBe("");

    dispose();
  });

  it("opens on contextmenu event on the canvas container", () => {
    const mock = createMockEditor({ activeTool: "brush" });
    vi.spyOn(EditorContextModule, "useEditor").mockReturnValue(mock as any);

    container = document.createElement("div");
    container.id = "canvas-container";
    document.body.appendChild(container);

    root = document.createElement("div");
    document.body.appendChild(root);
    const dispose = render(() => <BrushContextMenu />, root);

    const event = new MouseEvent("contextmenu", {
      bubbles: true,
      clientX: 200,
      clientY: 150,
    });
    container.dispatchEvent(event);

    expect(root.textContent).toContain("Size");
    expect(root.textContent).toContain("Hardness");
    expect(root.textContent).toContain("Strength");

    dispose();
  });

  it("does not open for non-paint tools", () => {
    const mock = createMockEditor({ activeTool: "move" });
    vi.spyOn(EditorContextModule, "useEditor").mockReturnValue(mock as any);

    container = document.createElement("div");
    container.id = "canvas-container";
    document.body.appendChild(container);

    root = document.createElement("div");
    document.body.appendChild(root);
    const dispose = render(() => <BrushContextMenu />, root);

    const event = new MouseEvent("contextmenu", {
      bubbles: true,
      clientX: 200,
      clientY: 150,
    });
    container.dispatchEvent(event);

    expect(root.textContent).toBe("");

    dispose();
  });

  it("size slider updates brush size signal", () => {
    const mock = createMockEditor({ activeTool: "brush", brushSize: 30 });
    vi.spyOn(EditorContextModule, "useEditor").mockReturnValue(mock as any);

    container = document.createElement("div");
    container.id = "canvas-container";
    document.body.appendChild(container);

    root = document.createElement("div");
    document.body.appendChild(root);
    const dispose = render(() => <BrushContextMenu />, root);

    container.dispatchEvent(new MouseEvent("contextmenu", { bubbles: true, clientX: 200, clientY: 150 }));

    const sizeSlider = root.querySelector<HTMLInputElement>("[data-context-size]")!;
    expect(sizeSlider).toBeTruthy();
    expect(sizeSlider.value).toBe("30");

    sizeSlider.value = "50";
    sizeSlider.dispatchEvent(new Event("input", { bubbles: true }));
    expect(mock.brushSize()).toBe(50);

    dispose();
  });

  it("closes on Escape key", () => {
    const mock = createMockEditor({ activeTool: "brush" });
    vi.spyOn(EditorContextModule, "useEditor").mockReturnValue(mock as any);

    container = document.createElement("div");
    container.id = "canvas-container";
    document.body.appendChild(container);

    root = document.createElement("div");
    document.body.appendChild(root);
    const dispose = render(() => <BrushContextMenu />, root);

    container.dispatchEvent(new MouseEvent("contextmenu", { bubbles: true, clientX: 100, clientY: 100 }));
    expect(root.textContent).toContain("Size");

    window.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
    expect(root.textContent).toBe("");

    dispose();
  });
});
