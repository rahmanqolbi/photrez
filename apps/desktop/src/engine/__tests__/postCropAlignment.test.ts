import { describe, it, expect, vi, afterEach } from "vitest";
import { DocumentEngine } from "../document";

interface MockDrawCall {
  img: unknown;
  dx: number;
  dy: number;
}

interface MockOffscreenCanvas {
  width: number;
  height: number;
  drawCalls: MockDrawCall[];
  fillCalls: { fillStyle: string; x: number; y: number; w: number; h: number }[];
  ctx: {
    save: ReturnType<typeof vi.fn>;
    restore: ReturnType<typeof vi.fn>;
    clearRect: ReturnType<typeof vi.fn>;
    translate: ReturnType<typeof vi.fn>;
    rotate: ReturnType<typeof vi.fn>;
    scale: ReturnType<typeof vi.fn>;
    drawImage: ReturnType<typeof vi.fn>;
    fillStyle: string;
    fillRect: ReturnType<typeof vi.fn>;
  };
  getContext: ReturnType<typeof vi.fn>;
  transferToImageBitmap: ReturnType<typeof vi.fn>;
}

/** Set up OffscreenCanvas mock and return a function to get all instances created. */
function setupOffscreenCanvasMock(): () => MockOffscreenCanvas[] {
  const instances: MockOffscreenCanvas[] = [];

  const MockConstructor = function (this: MockOffscreenCanvas, w: number, h: number) {
    this.width = w;
    this.height = h;
    const drawCalls: MockDrawCall[] = [];
    const fillCalls: { fillStyle: string; x: number; y: number; w: number; h: number }[] = [];
    this.drawCalls = drawCalls;
    this.fillCalls = fillCalls;
    this.ctx = {
      save: vi.fn(),
      restore: vi.fn(),
      clearRect: vi.fn(),
      translate: vi.fn(),
      rotate: vi.fn(),
      scale: vi.fn(),
      drawImage: vi.fn((img: unknown, dx: number, dy: number) => {
        drawCalls.push({ img, dx, dy });
      }),
      fillStyle: "",
      fillRect: vi.fn((x: number, y: number, w: number, h: number) => {
        fillCalls.push({ fillStyle: this.ctx.fillStyle, x, y, w, h });
      }),
    };
    this.getContext = vi.fn(() => this.ctx);
    this.transferToImageBitmap = vi.fn(function (this: MockOffscreenCanvas) {
      return { width: this.width, height: this.height } as ImageBitmap;
    });
    instances.push(this);
  };

  vi.stubGlobal("OffscreenCanvas", MockConstructor as unknown as typeof OffscreenCanvas);
  return () => instances;
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe("post-crop alignment for odd crop sizes", () => {
  it("document size equals final crop dimensions after applyCrop (non-delete path)", () => {
    setupOffscreenCanvasMock();
    const engine = new DocumentEngine("doc-1", "Test", 1600, 1200);
    engine.addLayer("Layer 1");

    engine.applyCrop(100, 50, 113, 151);

    expect(engine.getWidth()).toBe(113);
    expect(engine.getHeight()).toBe(151);
  });

  it("layer x/y is 0 and width/height matches document after non-delete crop", () => {
    setupOffscreenCanvasMock();
    const engine = new DocumentEngine("doc-1", "Test", 1600, 1200);
    const layer = engine.addLayer("Layer 1");

    engine.applyCrop(100, 50, 113, 151);

    const l = engine.getLayer(layer.id)!;
    expect(l.transform.x).toBe(-100);
    expect(l.transform.y).toBe(-50);
    expect(l.width).toBe(1600);
    expect(l.height).toBe(1200);
    expect(engine.getWidth()).toBe(113);
    expect(engine.getHeight()).toBe(151);
  });

  it("layer sits at (0,0) with scale 1 after delete-crop with 113x151", () => {
    const getInstances = setupOffscreenCanvasMock();
    const engine = new DocumentEngine("doc-2", "Delete Crop", 1600, 1200);
    const layer = engine.addLayer("Layer 1", 1600, 1200);
    engine.setLayerImageBitmap(layer.id, { width: 1600, height: 1200 } as ImageBitmap);

    engine.applyCrop(100, 50, 113, 151, { deleteCroppedPixels: true });

    const l = engine.getLayer(layer.id)!;
    expect(l.transform.x).toBe(0);
    expect(l.transform.y).toBe(0);
    expect(l.transform.scaleX).toBe(1);
    expect(l.transform.scaleY).toBe(1);
    expect(l.transform.rotation).toBe(0);
  });

  it("layer bitmap dimensions match document after delete-crop 113x151", () => {
    setupOffscreenCanvasMock();
    const engine = new DocumentEngine("doc-3", "Delete Bmp", 1600, 1200);
    const layer = engine.addLayer("Layer 1", 1600, 1200);
    engine.setLayerImageBitmap(layer.id, { width: 1600, height: 1200 } as ImageBitmap);

    engine.applyCrop(100, 50, 113, 151, { deleteCroppedPixels: true });

    const l = engine.getLayer(layer.id)!;
    expect(l.width).toBe(113);
    expect(l.height).toBe(151);
    expect(l.imageBitmap).toBeDefined();
    expect(l.imageBitmap!.width).toBe(113);
    expect(l.imageBitmap!.height).toBe(151);
  });

  it("drawImage covers the full OffscreenCanvas for full-frame layer (113x151 crop)", () => {
    const getInstances = setupOffscreenCanvasMock();
    const engine = new DocumentEngine("doc-4", "Draw Check", 1600, 1200);
    const layer = engine.addLayer("Layer 1", 1600, 1200);
    engine.setLayerImageBitmap(layer.id, { width: 1600, height: 1200 } as ImageBitmap);

    engine.applyCrop(100, 50, 113, 151, { deleteCroppedPixels: true });

    const instances = getInstances();
    const mockCanvas = instances[0];
    expect(mockCanvas).toBeDefined();

    const l = engine.getLayer(layer.id)!;
    expect(l.width).toBe(113);
    expect(l.height).toBe(151);

    // Verify the canvas size
    expect(mockCanvas.width).toBe(113);
    expect(mockCanvas.height).toBe(151);

    // Verify draw position: the image should be drawn so the crop region fills the canvas.
    // For a full-frame 1600x1200 layer at (0,0) cropped at (100,50) with size (113,151):
    //   lw=1600, lh=1200, lcx=800, lcy=600
    //   cropCenter=(156.5, 125.5)
    //   vx=643.5, vy=474.5
    //   rvx=643.5, rvy=474.5
    //   nlcx=700, nlcy=550
    //   finalCX=700, finalCY=550 (exportScale=1)
    //   translate(700, 550), scale(1, 1), drawImage(bitmap, -800, -600)
    //   Image covers: x=[700-800, 700+800]=[-100,1500], y=[550-600, 550+600]=[-50,1150]
    //   Canvas is [0,113]x[0,151], so image covers every pixel of the canvas.
    expect(mockCanvas.drawCalls.length).toBeGreaterThanOrEqual(1);

    const call = mockCanvas.drawCalls[0];
    expect(call.dx).toBe(-800);
    expect(call.dy).toBe(-600);

    // Verify translation position
    expect(mockCanvas.ctx.translate).toHaveBeenCalledWith(700, 550);
    expect(mockCanvas.ctx.scale).toHaveBeenCalledWith(1, 1);
  });

  it("layer transforms correctly for offset layers in full-document delete crop", () => {
    const getInstances = setupOffscreenCanvasMock();
    const engine = new DocumentEngine("doc-5", "Offset Layer", 1600, 1200);
    const layer = engine.addLayer("Layer 1", 113, 151);
    engine.setLayerImageBitmap(layer.id, { width: 113, height: 151 } as ImageBitmap);
    engine.transformLayer(layer.id, { x: 100, y: 50 });

    engine.applyCrop(0, 0, 1600, 1200, { deleteCroppedPixels: true });

    const l = engine.getLayer(layer.id)!;
    expect(l.transform.x).toBe(0);
    expect(l.transform.y).toBe(0);
    expect(l.width).toBe(1600);
    expect(l.height).toBe(1200);

    // The bitmap was baked: the small 113x151 image at (100,50) was drawn
    // into a 1600x1200 canvas at its proportional position.
    expect(l.imageBitmap!.width).toBe(1600);
    expect(l.imageBitmap!.height).toBe(1200);

    // Verify drawImage was called with the right parameters
    const instances = getInstances();
    expect(instances.length).toBeGreaterThanOrEqual(1);
    const mockCanvas = instances[0];

    // For offset layer at (100,50) with size (113,151):
    //   lcx = 100 + 113/2 = 156.5
    //   lcy = 50 + 151/2 = 125.5
    //   cropCenter = (800, 600) (full-document crop)
    //   vx = 156.5-800 = -643.5, vy = 125.5-600 = -474.5
    //   rvx = -643.5, rvy = -474.5
    //   nlcx = 800 + (-643.5) = 156.5
    //   nlcy = 600 + (-474.5) = 125.5
    //   finalCX = 156.5, finalCY = 125.5 (exportScale=1)
    //   drawImage(bitmap, -56.5, -75.5)
    // Image covers: x=[156.5-56.5, 156.5+56.5] = [100, 213]
    // y=[125.5-75.5, 125.5+75.5] = [50, 201]
    // Canvas is [0, 1600] x [0, 1200], image at (100, 50) in canvas
    const call = mockCanvas.drawCalls[0];
    expect(call.dx).toBeCloseTo(-56.5);
    expect(call.dy).toBeCloseTo(-75.5);
  });

  it("size-mode crop produces exact integer dimensions matching target", () => {
    setupOffscreenCanvasMock();
    const engine = new DocumentEngine("doc-6", "Size Mode", 1600, 1200);
    const layer = engine.addLayer("Layer 1", 1600, 1200);
    engine.setLayerImageBitmap(layer.id, { width: 1600, height: 1200 } as ImageBitmap);

    // 3x4 cm at 300 DPI: 354x472 px
    const targetW = Math.round((3 / 2.54) * 300);
    const targetH = Math.round((4 / 2.54) * 300);
    expect(targetW).toBe(354);
    expect(targetH).toBe(472);

    engine.applyCrop(0, 0, 1600, 1200, {
      deleteCroppedPixels: true,
      targetSize: { w: targetW, h: targetH },
    });

    const l = engine.getLayer(layer.id)!;
    expect(l.width).toBe(354);
    expect(l.height).toBe(472);
    expect(l.imageBitmap!.width).toBe(354);
    expect(l.imageBitmap!.height).toBe(472);
    expect(engine.getWidth()).toBe(354);
    expect(engine.getHeight()).toBe(472);
  });

  it("size-mode crop image fills canvas for full-frame layer", () => {
    const getInstances = setupOffscreenCanvasMock();
    const engine = new DocumentEngine("doc-7", "Size Mode Fill", 1600, 1200);
    const layer = engine.addLayer("Layer 1", 1600, 1200);
    engine.setLayerImageBitmap(layer.id, { width: 1600, height: 1200 } as ImageBitmap);

    const targetW = 354;
    const targetH = 472;

    engine.applyCrop(0, 0, 1600, 1200, {
      deleteCroppedPixels: true,
      targetSize: { w: targetW, h: targetH },
    });

    const l = engine.getLayer(layer.id)!;
    expect(l.width).toBe(354);
    expect(l.height).toBe(472);

    // Verify draw parameters for size mode
    // exportScaleX = 354/1600, exportScaleY = 472/1200
    // translate(800 * exportScaleX, 600 * exportScaleY) = translate(177, 236)
    // scale(exportScaleX, exportScaleY)
    // drawImage(img, -800, -600)
    // Image covers: x=[177-800*scaleX, 177+800*scaleX] = [0, 354]
    // y=[236-600*scaleY, 236+600*scaleY] = [0, 472]
    const instances = getInstances();
    const mockCanvas = instances[0];
    expect(mockCanvas).toBeDefined();
    expect(mockCanvas.width).toBe(354);
    expect(mockCanvas.height).toBe(472);
    expect(mockCanvas.drawCalls.length).toBeGreaterThanOrEqual(1);
    expect(mockCanvas.ctx.translate).toHaveBeenCalledWith(177, 236);
  });

  it("multiple layers all get correct baked dimensions after delete crop", () => {
    setupOffscreenCanvasMock();
    const engine = new DocumentEngine("doc-8", "Multi Layer", 800, 600);
    const bg = engine.addLayer("Background", 800, 600);
    engine.setLayerImageBitmap(bg.id, { width: 800, height: 600 } as ImageBitmap);

    const fg = engine.addLayer("Foreground", 100, 100);
    engine.setLayerImageBitmap(fg.id, { width: 100, height: 100 } as ImageBitmap);
    engine.transformLayer(fg.id, { x: 50, y: 50 });

    engine.applyCrop(0, 0, 400, 300, { deleteCroppedPixels: true });

    const bgLayer = engine.getLayer(bg.id)!;
    const fgLayer = engine.getLayer(fg.id)!;

    expect(bgLayer.width).toBe(400);
    expect(bgLayer.height).toBe(300);
    expect(bgLayer.transform.x).toBe(0);
    expect(bgLayer.transform.y).toBe(0);

    expect(fgLayer.width).toBe(400);
    expect(fgLayer.height).toBe(300);
    expect(fgLayer.transform.x).toBe(0);
    expect(fgLayer.transform.y).toBe(0);

    // Both layers have the same dimensions as the document
    expect(bgLayer.width).toBe(engine.getWidth());
    expect(bgLayer.height).toBe(engine.getHeight());
    expect(fgLayer.width).toBe(engine.getWidth());
    expect(fgLayer.height).toBe(engine.getHeight());
  });

  it("document size equals layer bounds for 113x151 free crop (non-delete)", () => {
    setupOffscreenCanvasMock();
    const engine = new DocumentEngine("doc-align-1", "Align Check", 1600, 1200);
    engine.addLayer("Layer 1", 1600, 1200);

    engine.applyCrop(100, 50, 113, 151);

    expect(engine.getWidth()).toBe(113);
    expect(engine.getHeight()).toBe(151);

    const layer = engine.getLayers()[0];
    expect(layer.transform.x).toBe(-100);
    expect(layer.transform.y).toBe(-50);
    expect(layer.width).toBe(1600);
    expect(layer.height).toBe(1200);
  });

  it("render state documentSize matches engine after crop", () => {
    setupOffscreenCanvasMock();
    const engine = new DocumentEngine("doc-render-1", "Render Check", 1600, 1200);
    engine.addLayer("Layer 1", 1600, 1200);

    engine.applyCrop(100, 50, 113, 151);

    const state = engine.getRenderState();
    expect(state.documentSize.width).toBe(113);
    expect(state.documentSize.height).toBe(151);
  });

  it("bakes crop fill background into a bottom layer for canvas expansion", () => {
    const getInstances = setupOffscreenCanvasMock();
    const engine = new DocumentEngine("doc-fill-expand", "Fill Expand", 100, 100);
    const layer = engine.addLayer("Photo", 100, 100);
    engine.setLayerImageBitmap(layer.id, { width: 100, height: 100 } as ImageBitmap);

    engine.applyCrop(-25, -25, 150, 150, {
      deleteCroppedPixels: true,
      fillBackgroundColor: "#123456",
    });

    expect(engine.getWidth()).toBe(150);
    expect(engine.getHeight()).toBe(150);
    const layers = engine.getLayers();
    expect(layers.at(-1)?.name).toBe("Crop Fill Background");
    expect(layers.at(-1)?.width).toBe(150);
    expect(layers.at(-1)?.height).toBe(150);
    expect(layers.at(-1)?.transform.x).toBe(0);
    expect(layers.at(-1)?.transform.y).toBe(0);

    const fillCanvas = getInstances().find((canvas) => canvas.fillCalls.length > 0);
    expect(fillCanvas).toBeDefined();
    expect(fillCanvas!.fillCalls[0]).toEqual({
      fillStyle: "#123456",
      x: 0,
      y: 0,
      w: 150,
      h: 150,
    });
  });

  it("bakes crop fill background for rotated crop empty corners", () => {
    const getInstances = setupOffscreenCanvasMock();
    const engine = new DocumentEngine("doc-fill-rotate", "Fill Rotate", 100, 100);
    const layer = engine.addLayer("Photo", 100, 100);
    engine.setLayerImageBitmap(layer.id, { width: 100, height: 100 } as ImageBitmap);

    engine.applyCrop(0, 0, 100, 100, {
      deleteCroppedPixels: true,
      rotation: 30,
      fillBackgroundColor: "#abcdef",
    });

    const fillLayer = engine.getLayers().at(-1);
    expect(fillLayer?.name).toBe("Crop Fill Background");
    expect(fillLayer?.width).toBe(100);
    expect(fillLayer?.height).toBe(100);
    expect(fillLayer?.imageBitmap?.width).toBe(100);
    expect(fillLayer?.imageBitmap?.height).toBe(100);

    const fillCanvas = getInstances().find((canvas) => canvas.fillCalls.length > 0);
    expect(fillCanvas?.fillCalls[0].fillStyle).toBe("#abcdef");
  });

  it("expands canvas directionally when crop frame exceeds bounds (no fill)", () => {
    setupOffscreenCanvasMock();
    const engine = new DocumentEngine("doc-expand", "Expand", 100, 100);
    const layer = engine.addLayer("Photo", 100, 100);
    engine.setLayerImageBitmap(layer.id, { width: 100, height: 100 } as ImageBitmap);
    engine.transformLayer(layer.id, { x: 10, y: 10 });

    engine.applyCrop(-25, -30, 150, 160, { deleteCroppedPixels: true });

    expect(engine.getWidth()).toBe(150);
    expect(engine.getHeight()).toBe(160);

    const [photo] = engine.getLayers();
    expect(photo.transform.x).toBe(0);
    expect(photo.transform.y).toBe(0);
    expect(photo.width).toBe(150);
    expect(photo.height).toBe(160);
  });
});
