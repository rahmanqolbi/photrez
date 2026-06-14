import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { SelectionOperations } from "../SelectionOperations";
import { DocumentEngine } from "../../../engine/document";

/**
 * OffscreenCanvas mock for jsdom (which has no OffscreenCanvas).
 * Simulates drawImage by copying pixel data from source bitmap into target buffer
 * and implements getImageData/putImageData via Uint8ClampedArray buffers.
 */
function setupOffscreenCanvasMock() {
  const instances: any[] = [];

  const MockOffscreenCanvas = function (this: any, w: number, h: number) {
    this.width = w;
    this.height = h;
    this._buffer = new Uint8ClampedArray(w * h * 4);
    this._lastDraw = null as null | {
      src: any;
      sx: number;
      sy: number;
      sw: number;
      sh: number;
      dx: number;
      dy: number;
      dw: number;
      dh: number;
    };
    // Expose dimensions on ctx so paint operations can compute pixel indices
    // and bounds. Without these the arithmetic uses `undefined` and silently
    // writes nothing — the source bitmap never gets filled.
    const ctx = {
      width: w,
      height: h,
      _buffer: this._buffer,
      _fillStyle: "",
      get fillStyle() { return this._fillStyle; },
      set fillStyle(v: string) { this._fillStyle = v; },
      clearRect: vi.fn(function (this: any, x: number, y: number, cw: number, ch: number) {
        for (let row = y; row < y + ch; row++) {
          for (let col = x; col < x + cw; col++) {
            if (row < 0 || row >= this.height || col < 0 || col >= this.width) continue;
            const idx = (row * this.width + col) * 4;
            this._buffer[idx] = 0;
            this._buffer[idx + 1] = 0;
            this._buffer[idx + 2] = 0;
            this._buffer[idx + 3] = 0;
          }
        }
      }),
      save: vi.fn(),
      restore: vi.fn(),
      translate: vi.fn(),
      rotate: vi.fn(),
      scale: vi.fn(),
      drawImage: vi.fn(function (this: any, src: any, sx: number, sy: number, sw: number, sh: number, dx?: number, dy?: number, dw?: number, dh?: number) {
        // Support both 3-arg (drawImage(src, dx, dy)) and 9-arg forms
        if (dx === undefined) {
          // 3-arg form: drawImage(src, dx, dy)
          this._lastDraw = { src, sx: 0, sy: 0, sw: src.width, sh: src.height, dx: sx, dy: sy, dw: src.width, dh: src.height };
        } else {
          this._lastDraw = { src, sx, sy, sw, sh, dx, dy, dw: dw!, dh: dh! };
        }
        // If the source is a mock bitmap with a buffer, copy pixels
        if (src && src._buffer) {
          const sxStart = Math.max(0, this._lastDraw.sx);
          const syStart = Math.max(0, this._lastDraw.sy);
          const sxEnd = Math.min(src.width, this._lastDraw.sx + this._lastDraw.sw);
          const syEnd = Math.min(src.height, this._lastDraw.sy + this._lastDraw.sh);
          const dxStart = this._lastDraw.dx;
          const dyStart = this._lastDraw.dy;
          const scaleX = this._lastDraw.dw / this._lastDraw.sw;
          const scaleY = this._lastDraw.dh / this._lastDraw.sh;
          for (let row = syStart; row < syEnd; row++) {
            for (let col = sxStart; col < sxEnd; col++) {
              const srcIdx = (row * src.width + col) * 4;
              const destCol = Math.round(dxStart + (col - sxStart) * scaleX);
              const destRow = Math.round(dyStart + (row - syStart) * scaleY);
              if (destRow < 0 || destRow >= this.height || destCol < 0 || destCol >= this.width) continue;
              const dstIdx = (destRow * this.width + destCol) * 4;
              this._buffer[dstIdx] = src._buffer[srcIdx];
              this._buffer[dstIdx + 1] = src._buffer[srcIdx + 1];
              this._buffer[dstIdx + 2] = src._buffer[srcIdx + 2];
              this._buffer[dstIdx + 3] = src._buffer[srcIdx + 3];
            }
          }
        }
      }),
      fillRect: vi.fn(function (this: any, x: number, y: number, fw: number, fh: number) {
        const m = /^#([0-9a-fA-F]{2})([0-9a-fA-F]{2})([0-9a-fA-F]{2})$/.exec(this._fillStyle);
        let r = 0, g = 0, b = 0, a = 255;
        if (m) {
          r = parseInt(m[1], 16);
          g = parseInt(m[2], 16);
          b = parseInt(m[3], 16);
        }
        for (let row = y; row < y + fh; row++) {
          for (let col = x; col < x + fw; col++) {
            if (row < 0 || row >= this.height || col < 0 || col >= this.width) continue;
            const idx = (row * this.width + col) * 4;
            this._buffer[idx] = r;
            this._buffer[idx + 1] = g;
            this._buffer[idx + 2] = b;
            this._buffer[idx + 3] = a;
          }
        }
      }),
      getImageData: vi.fn(function (this: any, x: number, y: number, gw: number, gh: number) {
        const data = new Uint8ClampedArray(gw * gh * 4);
        for (let row = 0; row < gh; row++) {
          for (let col = 0; col < gw; col++) {
            const srcCol = x + col;
            const srcRow = y + row;
            if (srcRow < 0 || srcRow >= this.height || srcCol < 0 || srcCol >= this.width) continue;
            const srcIdx = (srcRow * this.width + srcCol) * 4;
            const dstIdx = (row * gw + col) * 4;
            data[dstIdx] = this._buffer[srcIdx];
            data[dstIdx + 1] = this._buffer[srcIdx + 1];
            data[dstIdx + 2] = this._buffer[srcIdx + 2];
            data[dstIdx + 3] = this._buffer[srcIdx + 3];
          }
        }
        return { data, width: gw, height: gh, colorSpace: "srgb" } as ImageData;
      }),
      putImageData: vi.fn(function (this: any, imageData: ImageData, x: number, y: number) {
        for (let row = 0; row < imageData.height; row++) {
          for (let col = 0; col < imageData.width; col++) {
            const srcIdx = (row * imageData.width + col) * 4;
            const dstCol = x + col;
            const dstRow = y + row;
            if (dstRow < 0 || dstRow >= this.height || dstCol < 0 || dstCol >= this.width) continue;
            const dstIdx = (dstRow * this.width + dstCol) * 4;
            this._buffer[dstIdx] = imageData.data[srcIdx];
            this._buffer[dstIdx + 1] = imageData.data[srcIdx + 1];
            this._buffer[dstIdx + 2] = imageData.data[srcIdx + 2];
            this._buffer[dstIdx + 3] = imageData.data[srcIdx + 3];
          }
        }
      }),
    };
    this.getContext = vi.fn(() => ctx);
    this.transferToImageBitmap = vi.fn(function (this: any) {
      return {
        width: this.width,
        height: this.height,
        _buffer: this._buffer,
      } as unknown as ImageBitmap;
    });
    instances.push(this);
  };

  vi.stubGlobal("OffscreenCanvas", MockOffscreenCanvas as unknown as typeof OffscreenCanvas);
  return instances;
}

function fillBitmapWithColor(bitmap: any, color: { r: number; g: number; b: number; a: number }) {
  if (!bitmap._buffer) {
    bitmap._buffer = new Uint8ClampedArray(bitmap.width * bitmap.height * 4);
  }
  for (let i = 0; i < bitmap.width * bitmap.height; i++) {
    bitmap._buffer[i * 4] = color.r;
    bitmap._buffer[i * 4 + 1] = color.g;
    bitmap._buffer[i * 4 + 2] = color.b;
    bitmap._buffer[i * 4 + 3] = color.a;
  }
}

describe("SelectionOperations — real pixel operations", () => {
  let engine: DocumentEngine;

  beforeEach(() => {
    setupOffscreenCanvasMock();
    engine = new DocumentEngine("test", "Test", 100, 100);
    SelectionOperations.__resetClipboard();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  describe("getSelectionBounds", () => {
    it("returns null when no selection", () => {
      expect(SelectionOperations.getSelectionBounds(engine)).toBeNull();
    });

    it("returns bounds from engine selection", () => {
      engine.createSelection(10, 20, 50, 60);
      const bounds = SelectionOperations.getSelectionBounds(engine);
      expect(bounds).not.toBeNull();
      expect(bounds!.x).toBe(10);
      expect(bounds!.y).toBe(20);
      expect(bounds!.width).toBe(50);
      expect(bounds!.height).toBe(60);
    });
  });

  describe("copySelection", () => {
    it("returns null when no selection", () => {
      expect(SelectionOperations.copySelection(engine)).toBeNull();
    });

    it("returns null when no active layer", () => {
      engine.createSelection(0, 0, 50, 50);
      expect(SelectionOperations.copySelection(engine)).toBeNull();
    });

    it("returns ImageData with correct dimensions when selection exists", () => {
      const layer = engine.addLayer("Layer 1", 100, 100);
      // Create a bitmap and set it on the layer
      const offscreen = new OffscreenCanvas(100, 100);
      const ctx = offscreen.getContext("2d")!;
      ctx.fillStyle = "#FF0000";
      ctx.fillRect(0, 0, 100, 100);
      const bitmap = offscreen.transferToImageBitmap();
      engine.setLayerImageBitmap(layer.id, bitmap);

      engine.createSelection(10, 20, 50, 60);
      const result = SelectionOperations.copySelection(engine);
      expect(result).not.toBeNull();
      expect(result!.width).toBe(50);
      expect(result!.height).toBe(60);
    });

    it("preserves pixel colors at selection coordinates", () => {
      const layer = engine.addLayer("Layer 1", 100, 100);
      const offscreen = new OffscreenCanvas(100, 100);
      const ctx = offscreen.getContext("2d")!;
      ctx.fillStyle = "#00FF00";
      ctx.fillRect(0, 0, 100, 100);
      const bitmap = offscreen.transferToImageBitmap();
      // Debug: check bitmap was actually filled
      const buf = (bitmap as any)._buffer;
      console.log("Source bitmap pixel (5,5):", buf[4 * (5 * 100 + 5) + 0], buf[4 * (5 * 100 + 5) + 1]);
      engine.setLayerImageBitmap(layer.id, bitmap);

      engine.createSelection(0, 0, 10, 10);
      const result = SelectionOperations.copySelection(engine);
      expect(result).not.toBeNull();
      console.log("Result data sample:", result!.data[0], result!.data[1], result!.data[2], result!.data[3]);
      // Center pixel should be green (0, 255, 0, 255)
      const idx = 4 * (5 * 10 + 5); // row 5, col 5
      expect(result!.data[idx + 0]).toBe(0);     // R
      expect(result!.data[idx + 1]).toBe(255);   // G
      expect(result!.data[idx + 2]).toBe(0);     // B
      expect(result!.data[idx + 3]).toBe(255);   // A
    });

    it("does not modify the source layer", () => {
      const layer = engine.addLayer("Layer 1", 100, 100);
      const offscreen = new OffscreenCanvas(100, 100);
      const ctx = offscreen.getContext("2d")!;
      ctx.fillStyle = "#0000FF";
      ctx.fillRect(0, 0, 100, 100);
      const bitmap = offscreen.transferToImageBitmap();
      engine.setLayerImageBitmap(layer.id, bitmap);

      engine.createSelection(10, 10, 20, 20);
      SelectionOperations.copySelection(engine);

      // Source should still be all blue
      const srcBitmap = engine.getLayerImageBitmap(layer.id);
      expect(srcBitmap).not.toBeNull();
      const c = (srcBitmap as any)._buffer;
      const idx = 4 * (15 * 100 + 15);
      expect(c[idx + 2]).toBe(255); // B channel still 255
      expect(c[idx + 3]).toBe(255); // A channel still 255
    });
  });

  describe("cutSelection", () => {
    it("throws when no selection", () => {
      expect(() => SelectionOperations.cutSelection(engine)).toThrow("no selection");
    });

    it("throws when no active layer", () => {
      engine.createSelection(0, 0, 50, 50);
      expect(() => SelectionOperations.cutSelection(engine)).toThrow("no active layer");
    });

    it("clears selection after cut", () => {
      engine.addLayer("Layer 1", 100, 100);
      engine.createSelection(0, 0, 50, 50);
      SelectionOperations.cutSelection(engine);
      expect(engine.getSelection()).toBeNull();
    });
  });

  describe("deleteSelection", () => {
    it("throws when no selection", () => {
      expect(() => SelectionOperations.deleteSelection(engine)).toThrow("no selection");
    });

    it("throws when no active layer", () => {
      engine.createSelection(0, 0, 50, 50);
      expect(() => SelectionOperations.deleteSelection(engine)).toThrow("no active layer");
    });

    it("clears selection after delete", () => {
      engine.addLayer("Layer 1", 100, 100);
      engine.createSelection(0, 0, 50, 50);
      SelectionOperations.deleteSelection(engine);
      expect(engine.getSelection()).toBeNull();
    });

    it("fills selection with transparent pixels", () => {
      const layer = engine.addLayer("Layer 1", 100, 100);
      const offscreen = new OffscreenCanvas(100, 100);
      const ctx = offscreen.getContext("2d")!;
      ctx.fillStyle = "#FF0000";
      ctx.fillRect(0, 0, 100, 100);
      const bitmap = offscreen.transferToImageBitmap();
      engine.setLayerImageBitmap(layer.id, bitmap);

      engine.createSelection(10, 10, 20, 20);
      SelectionOperations.deleteSelection(engine);

      const srcBitmap = engine.getLayerImageBitmap(layer.id);
      expect(srcBitmap).not.toBeNull();
      const c = (srcBitmap as any)._buffer;

      // Inside selection should be transparent (alpha = 0)
      const insideIdx = 4 * (15 * 100 + 15);
      expect(c[insideIdx + 3]).toBe(0);
      // Outside selection should still be red
      const outsideIdx = 4 * (50 * 100 + 50);
      expect(c[outsideIdx + 0]).toBe(255);
      expect(c[outsideIdx + 3]).toBe(255);
    });
  });

  describe("pasteSelection", () => {
    it("does nothing with null data", () => {
      SelectionOperations.pasteSelection(engine, null);
      expect(engine.getLayers().length).toBe(0);
    });

    it("creates new layer from pasted data", () => {
      const data = {
        width: 50,
        height: 50,
        data: new Uint8ClampedArray(50 * 50 * 4),
      } as unknown as ImageData;
      SelectionOperations.pasteSelection(engine, data);
      expect(engine.getLayers().length).toBe(1);
      expect(engine.getActiveLayerId()).not.toBeNull();
    });

    it("pasted layer name contains Pasted", () => {
      const data = {
        width: 50,
        height: 50,
        data: new Uint8ClampedArray(50 * 50 * 4),
      } as unknown as ImageData;
      SelectionOperations.pasteSelection(engine, data);
      const layers = engine.getLayers();
      expect(layers[0].name).toContain("Pasted");
    });
  });
});
