import { describe, expect, it, vi } from "vitest";
import { render } from "solid-js/web";
import { createSignal } from "solid-js";
import { BrushOptionBar } from "../BrushOptionBar";
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

describe("BrushOptionBar", () => {
  it("shows brush settings for Brush tool", () => {
    const mock = createMockEditor({ activeTool: "brush", brushSize: 20, brushHardness: 0.8, brushOpacity: 1 });
    vi.spyOn(EditorContextModule, "useEditor").mockReturnValue(mock as any);

    const root = document.createElement("div");
    document.body.appendChild(root);
    const dispose = render(() => <BrushOptionBar />, root);

    expect(root.textContent).toContain("Brush Options");
    expect(root.querySelector<HTMLInputElement>("[data-paint-size]")?.value).toBe("20");
    expect(root.querySelector<HTMLInputElement>("[data-paint-hardness]")?.value).toBe("80");
    expect(root.querySelector<HTMLInputElement>("[data-paint-opacity]")?.value).toBe("100");

    dispose();
    root.remove();
    vi.restoreAllMocks();
  });

  it("shows eraser settings for Eraser tool", () => {
    const mock = createMockEditor({ activeTool: "eraser", eraserSize: 32, eraserHardness: 1, eraserOpacity: 1 });
    vi.spyOn(EditorContextModule, "useEditor").mockReturnValue(mock as any);

    const root = document.createElement("div");
    document.body.appendChild(root);
    const dispose = render(() => <BrushOptionBar />, root);

    expect(root.textContent).toContain("Eraser Options");
    expect(root.querySelector<HTMLInputElement>("[data-paint-size]")?.value).toBe("32");
    expect(root.querySelector<HTMLInputElement>("[data-paint-hardness]")?.value).toBe("100");

    dispose();
    root.remove();
    vi.restoreAllMocks();
  });

  it("updates active tool size without changing inactive size", () => {
    const mock = createMockEditor({ activeTool: "eraser", eraserSize: 32, brushSize: 20 });
    vi.spyOn(EditorContextModule, "useEditor").mockReturnValue(mock as any);

    const root = document.createElement("div");
    document.body.appendChild(root);
    const dispose = render(() => <BrushOptionBar />, root);

    root.querySelector<HTMLInputElement>("[data-paint-size]")!.value = "44";
    root.querySelector<HTMLInputElement>("[data-paint-size]")!.dispatchEvent(new Event("input", { bubbles: true }));

    expect(mock.eraserSize()).toBe(44);
    expect(mock.brushSize()).toBe(20);

    dispose();
    root.remove();
    vi.restoreAllMocks();
  });

  it("renders flow and smoothing inputs", () => {
    const mock = createMockEditor({ activeTool: "brush", brushFlow: 0.8, brushSmoothing: 25 });
    vi.spyOn(EditorContextModule, "useEditor").mockReturnValue(mock as any);

    const root = document.createElement("div");
    document.body.appendChild(root);
    const dispose = render(() => <BrushOptionBar />, root);

    expect(root.querySelector<HTMLInputElement>("[data-paint-flow]")).toBeTruthy();
    expect(root.querySelector<HTMLInputElement>("[data-paint-flow]")!.value).toBe("80");
    expect(root.querySelector<HTMLInputElement>("[data-paint-smoothing]")).toBeTruthy();
    expect(root.querySelector<HTMLInputElement>("[data-paint-smoothing]")!.value).toBe("25");

    dispose();
    root.remove();
    vi.restoreAllMocks();
  });

  it("renders preset dropdown with current preset name or Custom", () => {
    const mock = createMockEditor({ activeTool: "brush", brushPresetId: null });
    vi.spyOn(EditorContextModule, "useEditor").mockReturnValue(mock as any);

    const root = document.createElement("div");
    document.body.appendChild(root);
    const dispose = render(() => <BrushOptionBar />, root);

    const presetBtn = root.querySelector<HTMLButtonElement>("[data-paint-preset]");
    expect(presetBtn).toBeTruthy();
    expect(presetBtn!.textContent).toContain("Custom");

    dispose();
    root.remove();
    vi.restoreAllMocks();
  });
});
