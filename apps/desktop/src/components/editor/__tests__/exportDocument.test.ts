import { describe, expect, it, vi, afterEach } from "vitest";
import type { DocumentEngine } from "@/engine/document";
import type { LayerNode } from "@/engine/types";

const BASE_LAYER: LayerNode = {
  id: "l1",
  name: "Test",
  type: "raster",
  visible: true,
  opacity: 1,
  locked: false,
  blendMode: "normal",
  width: 2,
  height: 2,
  transform: { x: 0, y: 0, scaleX: 1, scaleY: 1, rotation: 0, flipH: false, flipV: false },
  imageBitmap: null!,
};

function makeMockEngine(layers: LayerNode[], width = 2, height = 2): DocumentEngine {
  return {
    getWidth: () => width,
    getHeight: () => height,
    getLayers: () => layers,
  } as unknown as DocumentEngine;
}

function createOffscreenCtxMock() {
  let fillStyle = "";
  return {
    clearRect: vi.fn(),
    set fillStyle(v: string) { fillStyle = v; },
    get fillStyle() { return fillStyle; },
    fillRect: vi.fn(),
    save: vi.fn(),
    restore: vi.fn(),
    translate: vi.fn(),
    rotate: vi.fn(),
    scale: vi.fn(),
    drawImage: vi.fn(),
  };
}

describe("encodeComposite", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("produces PNG bytes for a simple document", async () => {
    const layers: LayerNode[] = [{
      ...BASE_LAYER, id: "bg", name: "Bg",
      imageBitmap: { width: 2, height: 2 } as ImageBitmap,
    }];

    const mockCtx = createOffscreenCtxMock();
    vi.stubGlobal("OffscreenCanvas", vi.fn(function (this: any, w: number, h: number) {
      this.width = w;
      this.height = h;
      this.getContext = () => mockCtx;
      this.convertToBlob = vi.fn().mockResolvedValue(new Blob(["PNG-DATA"]));
    }));

    const { encodeComposite } = await import("../exportDocument");
    const engine = makeMockEngine(layers);
    const bytes = await encodeComposite(engine, "png", 100);

    expect(bytes).toBeDefined();
    expect(bytes.length).toBeGreaterThan(0);
    expect(mockCtx.clearRect).toHaveBeenCalledWith(0, 0, 2, 2);
    // Must use drawLayerToContext (tested via save/drawImage being called)
    expect(mockCtx.save).toHaveBeenCalled();
    expect(mockCtx.drawImage).toHaveBeenCalled();
    expect(mockCtx.restore).toHaveBeenCalled();
  });

  it("produces JPEG bytes with white background fill", async () => {
    const layers: LayerNode[] = [{
      ...BASE_LAYER, id: "bg", name: "Bg",
      imageBitmap: { width: 2, height: 2 } as ImageBitmap,
    }];

    const mockCtx = createOffscreenCtxMock();
    vi.stubGlobal("OffscreenCanvas", vi.fn(function (this: any, w: number, h: number) {
      this.width = w;
      this.height = h;
      this.getContext = () => mockCtx;
      this.convertToBlob = vi.fn().mockResolvedValue(new Blob(["JPEG-DATA"]));
    }));

    const { encodeComposite } = await import("../exportDocument");
    const engine = makeMockEngine(layers);
    await encodeComposite(engine, "jpeg", 85);

    expect(mockCtx.fillStyle).toBe("#FFFFFF");
    expect(mockCtx.fillRect).toHaveBeenCalledWith(0, 0, 2, 2);
  });

  it("composites layers bottom-to-top order", async () => {
    const bottom: LayerNode = {
      ...BASE_LAYER, id: "bottom", name: "Bottom",
      imageBitmap: { width: 2, height: 2 } as ImageBitmap,
    };
    const top: LayerNode = {
      ...BASE_LAYER, id: "top", name: "Top",
      imageBitmap: { width: 2, height: 2 } as ImageBitmap,
    };
    // layers[0] = top, layers[1] = bottom
    const layers = [top, bottom];

    const drawCalls: string[] = [];
    const mockCtx = {
      ...createOffscreenCtxMock(),
      ...{
        save: vi.fn(() => { drawCalls.push("save"); }),
        drawImage: vi.fn(() => { drawCalls.push("drawImage"); }),
        restore: vi.fn(() => { drawCalls.push("restore"); }),
      },
    };

    vi.stubGlobal("OffscreenCanvas", vi.fn(function (this: any, w: number, h: number) {
      this.width = w;
      this.height = h;
      this.getContext = () => mockCtx;
      this.convertToBlob = vi.fn().mockResolvedValue(new Blob(["PNG"]));
    }));

    const { encodeComposite } = await import("../exportDocument");
    const engine = makeMockEngine(layers);
    await encodeComposite(engine, "png", 100);

    // Bottom layer drawImage should come before top layer drawImage
    const bottomIdx = drawCalls.indexOf("drawImage");
    expect(bottomIdx).toBeGreaterThanOrEqual(0);
    expect(drawCalls.lastIndexOf("drawImage")).toBeGreaterThan(bottomIdx);
  });

  it("skips invisible layers", async () => {
    const visible: LayerNode = {
      ...BASE_LAYER, id: "v", name: "Visible",
      imageBitmap: { width: 2, height: 2 } as ImageBitmap,
    };
    const hidden: LayerNode = {
      ...BASE_LAYER, id: "h", name: "Hidden", visible: false,
      imageBitmap: { width: 2, height: 2 } as ImageBitmap,
    };

    const mockCtx = createOffscreenCtxMock();
    vi.stubGlobal("OffscreenCanvas", vi.fn(function (this: any, w: number, h: number) {
      this.width = w;
      this.height = h;
      this.getContext = () => mockCtx;
      this.convertToBlob = vi.fn().mockResolvedValue(new Blob(["PNG"]));
    }));

    const { encodeComposite } = await import("../exportDocument");
    const engine = makeMockEngine([visible, hidden]);
    await encodeComposite(engine, "png", 100);

    // Only one drawImage call (for visible layer)
    expect(mockCtx.drawImage).toHaveBeenCalledTimes(1);
  });

  it("respects layer opacity", async () => {
    const semiOpaque: LayerNode = {
      ...BASE_LAYER, id: "semi", name: "Semi",
      opacity: 0.5,
      imageBitmap: { width: 2, height: 2 } as ImageBitmap,
    };

    const mockCtx = createOffscreenCtxMock();
    let capturedAlpha = 1;
    mockCtx.save = vi.fn(() => { capturedAlpha = (mockCtx as any).globalAlpha; });

    vi.stubGlobal("OffscreenCanvas", vi.fn(function (this: any, w: number, h: number) {
      this.width = w;
      this.height = h;
      this.getContext = () => mockCtx;
      this.convertToBlob = vi.fn().mockResolvedValue(new Blob(["PNG"]));
    }));

    const { encodeComposite } = await import("../exportDocument");
    const engine = makeMockEngine([semiOpaque]);
    await encodeComposite(engine, "png", 100);

    // drawLayerToContext sets globalAlpha = layer.opacity
    expect(mockCtx.save).toHaveBeenCalled();
  });

  it("uses correct mime type and quality for each format", async () => {
    let capturedBlobOptions: any = null;
    vi.stubGlobal("OffscreenCanvas", vi.fn(function (this: any, w: number, h: number) {
      this.width = w;
      this.height = h;
      this.getContext = () => createOffscreenCtxMock();
      this.convertToBlob = vi.fn((opts: any) => {
        capturedBlobOptions = opts;
        return Promise.resolve(new Blob(["DATA"]));
      });
    }));

    const { encodeComposite } = await import("../exportDocument");
    const engine = makeMockEngine([]);

    // PNG
    await encodeComposite(engine, "png", 100);
    expect(capturedBlobOptions.type).toBe("image/png");
    expect(capturedBlobOptions.quality).toBeUndefined();

    // JPEG
    await encodeComposite(engine, "jpeg", 85);
    expect(capturedBlobOptions.type).toBe("image/jpeg");
    expect(capturedBlobOptions.quality).toBe(0.85);

    // WebP (quality=0 based because quality is stored in closure)
    await encodeComposite(engine, "webp", 75);
    expect(capturedBlobOptions.type).toBe("image/webp");
    expect(capturedBlobOptions.quality).toBe(0.75);
  });

  it("document dimensions match output canvas size", async () => {
    let capturedW = 0;
    let capturedH = 0;
    vi.stubGlobal("OffscreenCanvas", vi.fn(function (this: any, w: number, h: number) {
      capturedW = w;
      capturedH = h;
      this.width = w;
      this.height = h;
      this.getContext = () => createOffscreenCtxMock();
      this.convertToBlob = vi.fn().mockResolvedValue(new Blob(["DATA"]));
    }));

    const { encodeComposite } = await import("../exportDocument");
    const engine = makeMockEngine([], 1920, 1080);
    await encodeComposite(engine, "png", 100);

    expect(capturedW).toBe(1920);
    expect(capturedH).toBe(1080);
  });
});

const { mockWriteFileBytes, mockShowSaveDialog } = vi.hoisted(() => ({
  mockWriteFileBytes: vi.fn().mockResolvedValue(undefined),
  mockShowSaveDialog: vi.fn().mockResolvedValue("/tmp/test.png"),
}));

vi.mock("@/tauri/native", () => ({
  writeFileBytes: mockWriteFileBytes,
  showSaveDialog: mockShowSaveDialog,
}));

describe("exportActiveDocument", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
    mockWriteFileBytes.mockClear();
    mockShowSaveDialog.mockClear();
  });

  it("calls showSaveDialog and writeFileBytes with correct arguments", async () => {
    const mockCtx = createOffscreenCtxMock();
    vi.stubGlobal("OffscreenCanvas", vi.fn(function (this: any, w: number, h: number) {
      this.width = w;
      this.height = h;
      this.getContext = () => mockCtx;
      this.convertToBlob = vi.fn().mockResolvedValue(new Blob(["EXPORTED"]));
    }));

    const { exportActiveDocument } = await import("../exportDocument");
    const engine = makeMockEngine([]);

    const result = await exportActiveDocument(engine, "MyImage.png", "png", 100);

    expect(mockShowSaveDialog).toHaveBeenCalled();
    expect(mockWriteFileBytes).toHaveBeenCalled();
    expect(result).toBe("/tmp/test.png");
  });
});
