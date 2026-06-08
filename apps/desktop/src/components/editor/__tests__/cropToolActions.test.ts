import { describe, expect, it, vi } from "vitest";
import {
  clearCropPreview,
  resetCropPreviewToCanvas,
  applyCropPreview,
  hideCropPreview,
  restoreHiddenCropPreview,
  discardCropSession,
  type CropPreviewControls,
} from "../cropToolActions";

function controls(overrides: Partial<CropPreviewControls> = {}) {
  return {
    cropRect: () => ({ x: 10, y: 20, w: 100, h: 80 }),
    cropRotation: () => 12,
    hiddenCropPreview: () => null,
    setCropRect: vi.fn(),
    setCropRotation: vi.fn(),
    setHiddenCropPreview: vi.fn(),
    ...overrides,
  } satisfies CropPreviewControls;
}

describe("cropToolActions", () => {
  it("clearCropPreview clears rect and rotation", () => {
    const setCropRect = vi.fn();
    const setCropRotation = vi.fn();
    clearCropPreview({ setCropRect, setCropRotation });
    expect(setCropRect).toHaveBeenCalledWith(null);
    expect(setCropRotation).toHaveBeenCalledWith(0);
  });

  it("resetCropPreviewToCanvas resets rect to engine bounds and rotation to 0", () => {
    const setCropRect = vi.fn();
    const setCropRotation = vi.fn();
    const setHiddenCropPreview = vi.fn();
    const engine = {
      getWidth: () => 1200,
      getHeight: () => 800,
    };
    resetCropPreviewToCanvas({ engine, setCropRect, setCropRotation, setHiddenCropPreview });
    expect(setCropRect).toHaveBeenCalledWith({ x: 0, y: 0, w: 1200, h: 800 });
    expect(setCropRotation).toHaveBeenCalledWith(0);
    expect(setHiddenCropPreview).toHaveBeenCalledWith(null);
  });

  it("applyCropPreview commits history, applies crop, schedules render, clears, and sets tool to move", () => {
    const setCropRect = vi.fn();
    const setCropRotation = vi.fn();
    const setHiddenCropPreview = vi.fn();
    const setActiveTool = vi.fn();
    const recenterViewport = vi.fn();
    const snapshot = { dummy: "snapshot" };
    
    const engine = {
      snapshot: () => snapshot,
      applyCrop: vi.fn(),
      getWidth: () => 300,
      getHeight: () => 200,
      getViewport: () => ({ zoom: 1 }),
      getLayers: () => [
        { id: "layer-with-bitmap", imageBitmap: { width: 300, height: 400 } },
        { id: "layer-without-bitmap", imageBitmap: null },
      ],
    };
    
    const history = {
      commit: vi.fn(),
    };
    
    const workspace = {
      getActiveEngine: () => engine,
      getActiveHistory: () => history,
    };
    
    const scheduler = {
      requestRender: vi.fn(),
    };

    const renderer = {
      uploadImage: vi.fn(),
      resize: vi.fn(),
    };

    applyCropPreview({
      workspace: workspace as any,
      renderer: renderer as any,
      cropRect: { x: 10, y: 20, w: 100, h: 200 },
      cropMode: "size",
      cropSizeTarget: { w: 300, h: 400 },
      cropDeletePixels: true,
      cropRotation: 45,
      scheduler: scheduler as any,
      setCropRect,
      setCropRotation,
      setHiddenCropPreview,
      setActiveTool,
      recenterViewport,
    });

    expect(history.commit).toHaveBeenCalledWith(snapshot);
    expect(engine.applyCrop).toHaveBeenCalledWith(10, 20, 100, 200, {
      deleteCroppedPixels: true,
      targetSize: { w: 300, h: 400 },
      rotation: 45,
    });
    expect(renderer.resize).toHaveBeenCalledWith(300, 200, 1, 1);
    expect(renderer.uploadImage).toHaveBeenCalledWith("layer-with-bitmap", { width: 300, height: 400 });
    expect(renderer.uploadImage).toHaveBeenCalledTimes(1);
    expect(recenterViewport).toHaveBeenCalledOnce();
    expect(scheduler.requestRender).toHaveBeenCalled();
    expect(setCropRect).toHaveBeenCalledWith(null);
    expect(setCropRotation).toHaveBeenCalledWith(0);
    expect(setHiddenCropPreview).toHaveBeenCalledWith(null);
    expect(setActiveTool).toHaveBeenCalledWith("move");
  });
});

describe("cropToolActions hidden preview", () => {
  it("hides the visible crop preview without discarding it", () => {
    const c = controls();

    hideCropPreview(c);

    expect(c.setHiddenCropPreview).toHaveBeenCalledWith({
      rect: { x: 10, y: 20, w: 100, h: 80 },
      rotation: 12,
    });
    expect(c.setCropRect).toHaveBeenCalledWith(null);
    expect(c.setCropRotation).toHaveBeenCalledWith(0);
  });

  it("restores hidden crop preview exactly", () => {
    const c = controls({
      cropRect: () => null,
      cropRotation: () => 0,
      hiddenCropPreview: () => ({
        rect: { x: 30, y: 40, w: 120, h: 90 },
        rotation: -8,
      }),
    });

    const restored = restoreHiddenCropPreview(c);

    expect(restored).toBe(true);
    expect(c.setCropRect).toHaveBeenCalledWith({ x: 30, y: 40, w: 120, h: 90 });
    expect(c.setCropRotation).toHaveBeenCalledWith(-8);
    expect(c.setHiddenCropPreview).toHaveBeenCalledWith(null);
  });

  it("reports false when there is no hidden preview to restore", () => {
    const c = controls({
      cropRect: () => null,
      hiddenCropPreview: () => null,
    });

    const restored = restoreHiddenCropPreview(c);

    expect(restored).toBe(false);
    expect(c.setCropRect).not.toHaveBeenCalled();
    expect(c.setCropRotation).not.toHaveBeenCalled();
  });

  it("discards visible and hidden crop preview", () => {
    const c = controls({
      hiddenCropPreview: () => ({
        rect: { x: 30, y: 40, w: 120, h: 90 },
        rotation: -8,
      }),
    });

    discardCropSession(c);

    expect(c.setCropRect).toHaveBeenCalledWith(null);
    expect(c.setCropRotation).toHaveBeenCalledWith(0);
    expect(c.setHiddenCropPreview).toHaveBeenCalledWith(null);
  });
});
