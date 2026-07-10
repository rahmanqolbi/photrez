import { describe, it, expect, vi, beforeEach } from "vitest";
import type { LayerNode } from "../types";

function makeLayer(over: Partial<LayerNode> = {}): LayerNode {
  return {
    id: "l1",
    name: "Layer",
    visible: true,
    opacity: 1,
    width: 100,
    height: 100,
    transform: { x: 0, y: 0 },
    imageBitmap: {} as ImageBitmap,
    ...over,
  } as LayerNode;
}

describe("performPixelSampling", () => {
  beforeEach(() => {
    vi.unstubAllGlobals();
  });

  it("composites a single opaque layer via the reusable scratch canvas", async () => {
    const mockCtx = {
      clearRect: vi.fn(),
      drawImage: vi.fn(),
      getImageData: vi.fn(() => ({ data: new Uint8ClampedArray([10, 20, 30, 255]) })),
    };
    vi.stubGlobal(
      "OffscreenCanvas",
      class {
        width = 1;
        height = 1;
        getContext() {
          return mockCtx;
        }
      },
    );

    const { performPixelSampling } = await import("../pixelSample");
    const layer = makeLayer({ imageBitmap: {} as ImageBitmap });
    const result = performPixelSampling([layer], 100, 100, 10, 10);

    expect(result).toEqual([10, 20, 30, 1]);
    // Reused across the single sample — getContext called once, not per call.
    expect(mockCtx.clearRect).toHaveBeenCalled();
  });

  it("returns amber fallback when OffscreenCanvas is unavailable", async () => {
    vi.stubGlobal("OffscreenCanvas", undefined);

    // Fresh module so the lazy ctx reflects the missing global.
    vi.resetModules();
    const mod = await import("../pixelSample");
    const layer = makeLayer({ imageBitmap: {} as ImageBitmap });
    const result = mod.performPixelSampling([layer], 100, 100, 10, 10);

    expect(result).toEqual([225, 90, 23, 1.0]);
  });

  it("returns transparent when coordinates are out of bounds", async () => {
    vi.stubGlobal("OffscreenCanvas", undefined);
    vi.resetModules();
    const mod = await import("../pixelSample");
    const layer = makeLayer();
    expect(mod.performPixelSampling([layer], 100, 100, -1, 50)).toEqual([0, 0, 0, 0]);
  });
});
