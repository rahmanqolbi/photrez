import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { TILE_SIZE } from "../types";
import {
  computeTileGrid,
  tileKey,
  createEmptyTiles,
  splitIntoTiles,
  composeFromTiles,
} from "../tileStorage";

// ─── computeTileGrid (pure — no mocks needed) ───

describe("computeTileGrid", () => {
  it("computes exact divisions", () => {
    const g = computeTileGrid(512, 512, 256);
    expect(g.numXTiles).toBe(2);
    expect(g.numYTiles).toBe(2);
    expect(g.tileSize).toBe(256);
  });

  it("rounds up for partial edge tiles", () => {
    const g = computeTileGrid(600, 400, 256);
    expect(g.numXTiles).toBe(3); // ceil(600/256) = 3
    expect(g.numYTiles).toBe(2); // ceil(400/256) = 2
  });

  it("returns zero for zero or negative dimensions", () => {
    expect(computeTileGrid(0, 100).numXTiles).toBe(0);
    expect(computeTileGrid(100, 0).numYTiles).toBe(0);
    expect(computeTileGrid(-1, 100).numXTiles).toBe(0);
  });

  it("uses default TILE_SIZE when omitted", () => {
    const g = computeTileGrid(256, 256);
    expect(g.tileSize).toBe(TILE_SIZE);
    expect(g.numXTiles).toBe(1);
  });
});

// ─── tileKey (pure — no mocks needed) ───

describe("tileKey", () => {
  it("formats coordinates", () => {
    expect(tileKey(4, 12)).toBe("4,12");
    expect(tileKey(0, 0)).toBe("0,0");
  });
});

// ─── createEmptyTiles (pure — no mocks needed) ───

describe("createEmptyTiles", () => {
  it("creates the correct number of tiles for exact dimensions", () => {
    const tiles = createEmptyTiles(512, 512, 256);
    expect(tiles).toHaveLength(4); // 2×2
  });

  it("creates extra tiles for partial edges", () => {
    const tiles = createEmptyTiles(300, 300, 256);
    expect(tiles).toHaveLength(4); // ceil(300/256)^2 = 4
  });

  it("all tiles have null imageBitmap", () => {
    const tiles = createEmptyTiles(256, 256);
    for (const tile of tiles) {
      expect(tile.imageBitmap).toBeNull();
    }
  });

  it("edge tiles have correct (smaller) dimensions", () => {
    const tiles = createEmptyTiles(300, 300, 256);
    // bottom-right tile (1,1) should be 44×44
    const edge = tiles.find((t) => t.gridX === 1 && t.gridY === 1)!;
    expect(edge).toBeDefined();
    expect(edge.width).toBe(44);
    expect(edge.height).toBe(44);
  });

  it("returns empty array for zero dimensions", () => {
    expect(createEmptyTiles(0, 100)).toHaveLength(0);
    expect(createEmptyTiles(100, 0)).toHaveLength(0);
  });
});

// ─── splitIntoTiles (needs createImageBitmap mock) ───

describe("splitIntoTiles", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("splits into the correct number of tiles", async () => {
    vi.stubGlobal("createImageBitmap", vi.fn(async (_src: any, _sx: number, _sy: number, sw: number, sh: number) => {
      return { width: sw, height: sh } as ImageBitmap;
    }));

    const bmp = { width: 512, height: 512 } as ImageBitmap;
    const tiles = await splitIntoTiles(bmp, 256);
    expect(tiles).toHaveLength(4);
  });

  it("each tile has the correct dimensions", async () => {
    vi.stubGlobal("createImageBitmap", vi.fn(async (_src: any, _sx: number, _sy: number, sw: number, sh: number) => {
      return { width: sw, height: sh } as ImageBitmap;
    }));

    const bmp = { width: 512, height: 512 } as ImageBitmap;
    const tiles = await splitIntoTiles(bmp, 256);
    for (const t of tiles) {
      expect(t.width).toBe(256);
      expect(t.height).toBe(256);
    }
  });

  it("edge tiles are smaller for non-exact dimensions", async () => {
    vi.stubGlobal("createImageBitmap", vi.fn(async (_src: any, _sx: number, _sy: number, sw: number, sh: number) => {
      return { width: sw, height: sh } as ImageBitmap;
    }));

    const bmp = { width: 300, height: 300 } as ImageBitmap;
    const tiles = await splitIntoTiles(bmp, 256);
    expect(tiles).toHaveLength(4);

    const edge = tiles.find((t) => t.gridX === 1 && t.gridY === 1)!;
    expect(edge.width).toBe(44);
    expect(edge.height).toBe(44);
  });

  it("calls createImageBitmap with correct source rect for each tile", async () => {
    const createImageBitmapMock = vi.fn(async (_src: any, _sx: number, _sy: number, sw: number, sh: number) => {
      return { width: sw, height: sh } as ImageBitmap;
    });
    vi.stubGlobal("createImageBitmap", createImageBitmapMock);

    const bmp = { width: 512, height: 512 } as ImageBitmap;
    await splitIntoTiles(bmp, 256);

    // 2×2 grid:
    // (0,0) tile sources from (0,0) 256×256
    // (1,0) tile sources from (256,0) 256×256
    // (0,1) tile sources from (0,256) 256×256
    // (1,1) tile sources from (256,256) 256×256
    expect(createImageBitmapMock).toHaveBeenCalledTimes(4);
    expect(createImageBitmapMock).toHaveBeenCalledWith(bmp, 0, 0, 256, 256);
    expect(createImageBitmapMock).toHaveBeenCalledWith(bmp, 256, 0, 256, 256);
    expect(createImageBitmapMock).toHaveBeenCalledWith(bmp, 0, 256, 256, 256);
    expect(createImageBitmapMock).toHaveBeenCalledWith(bmp, 256, 256, 256, 256);
  });

  it("calls createImageBitmap with correct source rect for partial edge tiles", async () => {
    const createImageBitmapMock = vi.fn(async (_src: any, _sx: number, _sy: number, sw: number, sh: number) => {
      return { width: sw, height: sh } as ImageBitmap;
    });
    vi.stubGlobal("createImageBitmap", createImageBitmapMock);

    const bmp = { width: 300, height: 300 } as ImageBitmap;
    await splitIntoTiles(bmp, 256);

    // 2×2 grid with partial edges:
    // (0,0) → (0,0, 256,256)
    // (1,0) → (256,0, 44,256)
    // (0,1) → (0,256, 256,44)
    // (1,1) → (256,256, 44,44)
    expect(createImageBitmapMock).toHaveBeenCalledTimes(4);
    expect(createImageBitmapMock).toHaveBeenCalledWith(bmp, 0, 0, 256, 256);
    expect(createImageBitmapMock).toHaveBeenCalledWith(bmp, 256, 0, 44, 256);
    expect(createImageBitmapMock).toHaveBeenCalledWith(bmp, 0, 256, 256, 44);
    expect(createImageBitmapMock).toHaveBeenCalledWith(bmp, 256, 256, 44, 44);
  });
});

// ─── composeFromTiles (needs OffscreenCanvas mock) ───

describe("composeFromTiles", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("draws each tile bitmap at the correct position", () => {
    const drawImageMock = vi.fn();
    const transferToImageBitmapMock = vi.fn(() => ({ width: 512, height: 512 }) as ImageBitmap);
    vi.stubGlobal("OffscreenCanvas", vi.fn(function (this: any, w: number, h: number) {
      this.width = w;
      this.height = h;
      this.getContext = () => ({ drawImage: drawImageMock } as unknown as OffscreenCanvasRenderingContext2D);
      this.transferToImageBitmap = transferToImageBitmapMock;
    }));

    const tiles = [
      { gridX: 0, gridY: 0, imageBitmap: { width: 256, height: 256 } as ImageBitmap, width: 256, height: 256 },
      { gridX: 1, gridY: 0, imageBitmap: { width: 256, height: 256 } as ImageBitmap, width: 256, height: 256 },
      { gridX: 0, gridY: 1, imageBitmap: { width: 256, height: 256 } as ImageBitmap, width: 256, height: 256 },
      { gridX: 1, gridY: 1, imageBitmap: { width: 256, height: 256 } as ImageBitmap, width: 256, height: 256 },
    ];

    const result = composeFromTiles(tiles, 512, 512, 256);
    expect(result).toBeDefined();
    expect((result as any).width).toBe(512);
    expect((result as any).height).toBe(512);
    expect(drawImageMock).toHaveBeenCalledTimes(4);
    expect(drawImageMock).toHaveBeenCalledWith(tiles[0].imageBitmap, 0, 0);
    expect(drawImageMock).toHaveBeenCalledWith(tiles[1].imageBitmap, 256, 0);
    expect(drawImageMock).toHaveBeenCalledWith(tiles[2].imageBitmap, 0, 256);
    expect(drawImageMock).toHaveBeenCalledWith(tiles[3].imageBitmap, 256, 256);
    expect(transferToImageBitmapMock).toHaveBeenCalledTimes(1);
  });

  it("handles a single tile (smaller than TILE_SIZE)", () => {
    const drawImageMock = vi.fn();
    const transferToImageBitmapMock = vi.fn(() => ({ width: 100, height: 100 }) as ImageBitmap);
    vi.stubGlobal("OffscreenCanvas", vi.fn(function (this: any, w: number, h: number) {
      this.width = w;
      this.height = h;
      this.getContext = () => ({ drawImage: drawImageMock } as unknown as OffscreenCanvasRenderingContext2D);
      this.transferToImageBitmap = transferToImageBitmapMock;
    }));

    const tiles = [
      { gridX: 0, gridY: 0, imageBitmap: { width: 100, height: 100 } as ImageBitmap, width: 100, height: 100 },
    ];

    const result = composeFromTiles(tiles, 100, 100, 256);
    expect((result as any).width).toBe(100);
    expect((result as any).height).toBe(100);
    expect(drawImageMock).toHaveBeenCalledTimes(1);
    expect(drawImageMock).toHaveBeenCalledWith(tiles[0].imageBitmap, 0, 0);
  });

  it("returns blank canvas when all tiles are null", () => {
    const drawImageMock = vi.fn();
    const transferToImageBitmapMock = vi.fn(() => ({ width: 256, height: 256 }) as ImageBitmap);
    vi.stubGlobal("OffscreenCanvas", vi.fn(function (this: any, w: number, h: number) {
      this.width = w;
      this.height = h;
      this.getContext = () => ({ drawImage: drawImageMock } as unknown as OffscreenCanvasRenderingContext2D);
      this.transferToImageBitmap = transferToImageBitmapMock;
    }));

    const tiles = createEmptyTiles(256, 256);
    expect(() => composeFromTiles(tiles, 256, 256, 256)).not.toThrow();
    // drawImage should not be called since all images are null
    expect(drawImageMock).not.toHaveBeenCalled();
  });
});
