import { describe, it, expect, vi, afterEach } from "vitest";
import { render } from "solid-js/web";
import { createSignal } from "solid-js";
import { CropOptionBar } from "../CropOptionBar";
import * as EditorContextModule from "../EditorContext";

describe("CropOptionBar", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("calls setCropRect with centered auto-fit coordinates on custom aspect submit", async () => {
    const [cropRect, setCropRect] = createSignal<{ x: number; y: number; w: number; h: number } | null>({
      x: 10,
      y: 10,
      w: 100,
      h: 100,
    });
    const [cropAspect, setCropAspect] = createSignal<{ w: number; h: number } | null>({ w: 17, h: 13 });
    const [cropMode, setCropMode] = createSignal<"free" | "ratio" | "size">("ratio");

    const setCropRectSpy = vi.fn((rect) => setCropRect(rect));

    const mockValue = {
      workspace: {},
      setActiveTool: vi.fn(),
      scheduler: {},
      cropRect,
      setCropRect: setCropRectSpy,
      cropMode,
      setCropMode,
      cropGuideMode: () => "none",
      setCropGuideMode: vi.fn(),
      cropDeletePixels: () => false,
      setCropDeletePixels: vi.fn(),
      cropAspect,
      setCropAspect,
      cropSizeTarget: () => ({ w: 800, h: 600 }),
      setCropSizeTarget: vi.fn(),
      cropSizeUnit: () => "px" as const,
      setCropSizeUnit: vi.fn(),
      cropRotation: () => 0,
      setCropRotation: vi.fn(),
      hiddenCropPreview: () => null,
      setHiddenCropPreview: vi.fn(),
      docWidth: () => 1600,
      docHeight: () => 1200,
      activeDocumentId: () => "mock-doc-id",
    };

    vi.spyOn(EditorContextModule, "useEditor").mockReturnValue(mockValue as any);

    const container = document.createElement("div");
    document.body.appendChild(container);

    const dispose = render(() => <CropOptionBar />, container);

    const inputs = container.querySelectorAll("input");
    expect(inputs.length).toBeGreaterThan(0);

    const wInput = inputs[0]; // W EditableNumField input
    wInput.focus();
    wInput.value = "3";
    wInput.dispatchEvent(new InputEvent("input", { bubbles: true }));
    wInput.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true }));

    // Aspect changed from 17:13 to 3:13
    // Canvas is 1600x1200 (ratio 4/3 = 1.33)
    // New aspect ratio = 3/13 = 0.2307
    // Since 1600/1200 (1.33) > 3/13 (0.23), crop box will fit height: height=1200, width=1200 * (3/13) = 276.92
    // Centered: x = (1600 - 276.92) / 2 = 661.54, y = 0
    expect(setCropRectSpy).toHaveBeenCalled();
    const lastCall = setCropRectSpy.mock.lastCall?.[0];
    expect(lastCall).not.toBeNull();
    expect(lastCall.w).toBeCloseTo(276.92, 1);
    expect(lastCall.h).toBeCloseTo(1200, 1);
    expect(lastCall.x).toBeCloseTo(661.54, 1);
    expect(lastCall.y).toBe(0);

    dispose();
    container.parentNode?.removeChild(container);
  });

  it("calls setCropRect with centered auto-fit coordinates on custom size submit", async () => {
    const [cropRect, setCropRect] = createSignal<{ x: number; y: number; w: number; h: number } | null>({
      x: 10,
      y: 10,
      w: 100,
      h: 100,
    });
    const [cropSizeTarget, setCropSizeTarget] = createSignal<{ w: number; h: number } | null>({ w: 800, h: 600 });
    const [cropMode, setCropMode] = createSignal<"free" | "ratio" | "size">("size");

    const setCropRectSpy = vi.fn((rect) => setCropRect(rect));

    const mockValue = {
      workspace: {},
      setActiveTool: vi.fn(),
      scheduler: {},
      cropRect,
      setCropRect: setCropRectSpy,
      cropMode,
      setCropMode,
      cropGuideMode: () => "none",
      setCropGuideMode: vi.fn(),
      cropDeletePixels: () => false,
      setCropDeletePixels: vi.fn(),
      cropAspect: () => null,
      setCropAspect: vi.fn(),
      cropSizeTarget,
      setCropSizeTarget,
      cropSizeUnit: () => "px" as const,
      setCropSizeUnit: vi.fn(),
      cropRotation: () => 0,
      setCropRotation: vi.fn(),
      hiddenCropPreview: () => null,
      setHiddenCropPreview: vi.fn(),
      docWidth: () => 1600,
      docHeight: () => 1200,
      activeDocumentId: () => "mock-doc-id",
    };

    vi.spyOn(EditorContextModule, "useEditor").mockReturnValue(mockValue as any);

    const container = document.createElement("div");
    document.body.appendChild(container);

    const dispose = render(() => <CropOptionBar />, container);

    const inputs = container.querySelectorAll("input");
    expect(inputs.length).toBeGreaterThan(0);

    const wInput = inputs[0]; // W target size input
    wInput.focus();
    wInput.value = "400";
    wInput.dispatchEvent(new InputEvent("input", { bubbles: true }));
    wInput.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true }));

    // Target changed to 400x600 (ratio 4/6 = 0.66)
    // Canvas is 1600x1200 (ratio 1.33)
    // crop box will fit height: height=1200, width=1200 * (4/6) = 800
    // Centered: x = (1600 - 800) / 2 = 400, y = 0
    expect(setCropRectSpy).toHaveBeenCalled();
    const lastCall = setCropRectSpy.mock.lastCall?.[0];
    expect(lastCall).not.toBeNull();
    expect(lastCall.w).toBe(800);
    expect(lastCall.h).toBe(1200);
    expect(lastCall.x).toBe(400);
    expect(lastCall.y).toBe(0);

    dispose();
    container.parentNode?.removeChild(container);
  });

  it("calls setCropRect with centered auto-fit coordinates on swap button click", async () => {
    const [cropRect, setCropRect] = createSignal<{ x: number; y: number; w: number; h: number } | null>({
      x: 10,
      y: 10,
      w: 100,
      h: 100,
    });
    const [cropAspect, setCropAspect] = createSignal<{ w: number; h: number } | null>({ w: 16, h: 9 });
    const [cropMode, setCropMode] = createSignal<"free" | "ratio" | "size">("ratio");

    const setCropRectSpy = vi.fn((rect) => setCropRect(rect));

    const mockValue = {
      workspace: {},
      setActiveTool: vi.fn(),
      scheduler: {},
      cropRect,
      setCropRect: setCropRectSpy,
      cropMode,
      setCropMode,
      cropGuideMode: () => "none",
      setCropGuideMode: vi.fn(),
      cropDeletePixels: () => false,
      setCropDeletePixels: vi.fn(),
      cropAspect,
      setCropAspect,
      cropSizeTarget: () => null,
      setCropSizeTarget: vi.fn(),
      cropSizeUnit: () => "px" as const,
      setCropSizeUnit: vi.fn(),
      cropRotation: () => 0,
      setCropRotation: vi.fn(),
      hiddenCropPreview: () => null,
      setHiddenCropPreview: vi.fn(),
      docWidth: () => 1600,
      docHeight: () => 1200,
      activeDocumentId: () => "mock-doc-id",
    };

    vi.spyOn(EditorContextModule, "useEditor").mockReturnValue(mockValue as any);

    const container = document.createElement("div");
    document.body.appendChild(container);

    const dispose = render(() => <CropOptionBar />, container);

    const swapBtn = container.querySelector('button[title="Swap Width/Height"]') as HTMLButtonElement | null;
    expect(swapBtn).not.toBeNull();

    swapBtn!.click();

    // Swapped aspect: 9:16 = 0.5625
    // Canvas is 1600x1200 (ratio 1.33)
    // crop box will fit height: height=1200, width=1200 * (9/16) = 675
    // Centered: x = (1600 - 675) / 2 = 462.5, y = 0
    expect(setCropRectSpy).toHaveBeenCalled();
    const lastCall = setCropRectSpy.mock.lastCall?.[0];
    expect(lastCall).not.toBeNull();
    expect(lastCall.w).toBe(675);
    expect(lastCall.h).toBe(1200);
    expect(lastCall.x).toBe(462.5);
    expect(lastCall.y).toBe(0);

    dispose();
    container.parentNode?.removeChild(container);
  });

  it("cancel discards hidden crop preview and stays in Crop tool", () => {
    const [cropRect, setCropRect] = createSignal<{ x: number; y: number; w: number; h: number } | null>({
      x: 10,
      y: 20,
      w: 100,
      h: 80,
    });
    const [cropMode, setCropMode] = createSignal<"free" | "ratio" | "size">("free");
    const [hiddenCropPreview, setHiddenCropPreview] = createSignal<any>({
      rect: { x: 30, y: 40, w: 120, h: 90 },
      rotation: -8,
    });
    const setCropRectSpy = vi.fn((rect) => setCropRect(rect));
    const setHiddenCropPreviewSpy = vi.fn((preview) => setHiddenCropPreview(preview));
    const setActiveToolSpy = vi.fn();

    const mockValue = {
      workspace: {},
      setActiveTool: setActiveToolSpy,
      scheduler: {},
      cropRect,
      setCropRect: setCropRectSpy,
      cropMode,
      setCropMode,
      cropGuideMode: () => "none",
      setCropGuideMode: vi.fn(),
      cropDeletePixels: () => false,
      setCropDeletePixels: vi.fn(),
      cropAspect: () => null,
      setCropAspect: vi.fn(),
      cropSizeTarget: () => null,
      setCropSizeTarget: vi.fn(),
      cropSizeUnit: () => "px" as const,
      setCropSizeUnit: vi.fn(),
      cropRotation: () => 12,
      setCropRotation: vi.fn(),
      hiddenCropPreview,
      setHiddenCropPreview: setHiddenCropPreviewSpy,
      docWidth: () => 1600,
      docHeight: () => 1200,
      activeDocumentId: () => "mock-doc-id",
    };

    vi.spyOn(EditorContextModule, "useEditor").mockReturnValue(mockValue as any);

    const container = document.createElement("div");
    document.body.appendChild(container);

    const dispose = render(() => <CropOptionBar />, container);
    const cancelButton = Array.from(container.querySelectorAll("button")).find((button) =>
      button.textContent?.trim() === "Cancel"
    );

    expect(cancelButton).toBeDefined();
    cancelButton!.dispatchEvent(new MouseEvent("click", { bubbles: true }));

    expect(setCropRectSpy).toHaveBeenCalledWith(null);
    expect(setHiddenCropPreviewSpy).toHaveBeenCalledWith(null);
    expect(setActiveToolSpy).not.toHaveBeenCalled();

    dispose();
    container.parentNode?.removeChild(container);
  });
});
