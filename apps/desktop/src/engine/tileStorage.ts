import { TILE_SIZE, type Tile } from "./types";

export interface TileGrid {
  numXTiles: number;
  numYTiles: number;
  tileSize: number;
}

/**
 * Compute how many tiles cover a given canvas dimension.
 * Returns 0 for any dimension <= 0.
 */
export function computeTileGrid(
  width: number,
  height: number,
  tileSize: number = TILE_SIZE,
): TileGrid {
  const numXTiles = width > 0 ? Math.ceil(width / tileSize) : 0;
  const numYTiles = height > 0 ? Math.ceil(height / tileSize) : 0;
  return { numXTiles, numYTiles, tileSize };
}

/** Human-readable key for a tile at grid coordinates, e.g. "4,12" */
export function tileKey(gridX: number, gridY: number): string {
  return `${gridX},${gridY}`;
}

/**
 * Create a set of empty (null-bitmap) tiles for a given canvas size.
 * Useful for blank layers before any pixels are painted.
 */
export function createEmptyTiles(
  width: number,
  height: number,
  tileSize: number = TILE_SIZE,
): Tile[] {
  const { numXTiles, numYTiles } = computeTileGrid(width, height, tileSize);
  const tiles: Tile[] = [];

  for (let gridY = 0; gridY < numYTiles; gridY++) {
    for (let gridX = 0; gridX < numXTiles; gridX++) {
      const x = gridX * tileSize;
      const y = gridY * tileSize;
      const tw = Math.min(tileSize, width - x);
      const th = Math.min(tileSize, height - y);
      tiles.push({ gridX, gridY, imageBitmap: null, width: tw, height: th });
    }
  }

  return tiles;
}

/**
 * Split an ImageBitmap into an array of tiles.
 *
 * Uses `createImageBitmap(source, sx, sy, sw, sh)` which is a GPU-accelerated
 * copy in Chromium — no intermediate CPU readback.
 */
export async function splitIntoTiles(
  bitmap: ImageBitmap,
  tileSize: number = TILE_SIZE,
): Promise<Tile[]> {
  const { numXTiles, numYTiles } = computeTileGrid(
    bitmap.width,
    bitmap.height,
    tileSize,
  );
  const tiles: Tile[] = [];

  for (let gridY = 0; gridY < numYTiles; gridY++) {
    for (let gridX = 0; gridX < numXTiles; gridX++) {
      const x = gridX * tileSize;
      const y = gridY * tileSize;
      const tw = Math.min(tileSize, bitmap.width - x);
      const th = Math.min(tileSize, bitmap.height - y);

      const tileBitmap = await createImageBitmap(bitmap, x, y, tw, th);
      tiles.push({
        gridX,
        gridY,
        imageBitmap: tileBitmap,
        width: tw,
        height: th,
      });
    }
  }

  return tiles;
}

/**
 * Reconstruct a full ImageBitmap from an array of tiles.
 *
 * Useful for backwards-compatible reads — callers that expect a single
 * ImageBitmap (e.g. export, legacy render path) get one.
 */
export function composeFromTiles(
  tiles: Tile[],
  width: number,
  height: number,
  tileSize: number = TILE_SIZE,
): ImageBitmap {
  const canvas = new OffscreenCanvas(width, height);
  const ctx = canvas.getContext("2d")!;

  for (const tile of tiles) {
    if (tile.imageBitmap) {
      const dx = tile.gridX * tileSize;
      const dy = tile.gridY * tileSize;
      ctx.drawImage(tile.imageBitmap, dx, dy);
    }
  }

  return canvas.transferToImageBitmap();
}
