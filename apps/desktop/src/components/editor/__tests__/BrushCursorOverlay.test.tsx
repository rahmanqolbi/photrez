import { describe, expect, it, vi } from "vitest";
import { render } from "solid-js/web";
import { createSignal } from "solid-js";
import { BrushCursorOverlay } from "../BrushCursorOverlay";
import * as EditorContextModule from "../EditorContext";
import { ViewportCamera } from "../../../viewport/viewportCamera";

describe("BrushCursorOverlay", () => {
  it("uses brush size and hardness for the cursor rings", () => {
    const [activeTool, setActiveTool] = createSignal("brush");
    const [zoom] = createSignal(1);
    const [brushSize] = createSignal(24);
    const [brushHardness] = createSignal(0.5);

    vi.spyOn(EditorContextModule, "useEditor").mockReturnValue({
      activeTool,
      setActiveTool,
      zoom,
      camera: new ViewportCamera(),
      brushSize,
      brushHardness,
      brushOpacity: () => 1,
      eraserSize: () => 40,
      eraserHardness: () => 1,
      eraserOpacity: () => 1,
    } as any);

    const root = document.createElement("svg");
    document.body.appendChild(root);
    const dispose = render(() => <BrushCursorOverlay forceVisibleForTest cursorPosForTest={{ x: 10, y: 10 }} />, root);

    expect(root.querySelector("[data-paint-cursor-outer]")?.getAttribute("r")).toBe("12");
    expect(root.querySelector("[data-paint-cursor-hardness]")).toBeNull();

    dispose();
    root.remove();
    vi.restoreAllMocks();
  });

  it("uses eraser size when eraser is active", () => {
    const [activeTool, setActiveTool] = createSignal("eraser");
    const [zoom] = createSignal(1);
    const [eraserSize] = createSignal(40);

    vi.spyOn(EditorContextModule, "useEditor").mockReturnValue({
      activeTool,
      setActiveTool,
      zoom,
      camera: new ViewportCamera(),
      brushSize: () => 24,
      brushHardness: () => 0.5,
      brushOpacity: () => 1,
      eraserSize,
      eraserHardness: () => 1,
      eraserOpacity: () => 1,
    } as any);

    const root = document.createElement("svg");
    document.body.appendChild(root);
    const dispose = render(() => <BrushCursorOverlay forceVisibleForTest cursorPosForTest={{ x: 10, y: 10 }} />, root);

    expect(root.querySelector("[data-paint-cursor-outer]")?.getAttribute("r")).toBe("20");

    dispose();
    root.remove();
    vi.restoreAllMocks();
  });

  it("keeps radius in document space at zoom != 1 (not divided by zoom)", () => {
    const [activeTool] = createSignal("brush");
    const [zoom] = createSignal(2);
    const [brushSize] = createSignal(24);

    vi.spyOn(EditorContextModule, "useEditor").mockReturnValue({
      activeTool,
      zoom,
      camera: new ViewportCamera(),
      brushSize,
      brushHardness: () => 0.5,
      brushOpacity: () => 1,
      eraserSize: () => 40,
      eraserHardness: () => 1,
      eraserOpacity: () => 1,
    } as any);

    const root = document.createElement("svg");
    document.body.appendChild(root);
    const dispose = render(() => <BrushCursorOverlay forceVisibleForTest cursorPosForTest={{ x: 10, y: 10 }} />, root);

    // r should be screen-space radius (12 * zoom = 24)
    expect(root.querySelector("[data-paint-cursor-outer]")?.getAttribute("r")).toBe("24");

    dispose();
    root.remove();
    vi.restoreAllMocks();
  });
});
