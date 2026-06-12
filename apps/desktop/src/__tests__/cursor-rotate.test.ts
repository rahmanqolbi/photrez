import { describe, it, expect } from "vitest";
import { getRotateCursorByPos, getRotateCursorForHandle } from "@/viewport/cursorRotate";

describe("cursorRotate", () => {
  const rect = { x: 100, y: 100, w: 200, h: 200 };

  describe("getRotateCursorByPos", () => {
    it("returns a data-URI cursor string", () => {
      const cursor = getRotateCursorByPos({ x: 200, y: 100 }, rect);
      expect(cursor).toContain("data:image/svg+xml");
      expect(cursor).toContain("crosshair");
    });

    it("returns different cursors for different angles", () => {
      const right = getRotateCursorByPos({ x: 300, y: 200 }, rect);
      const left = getRotateCursorByPos({ x: 100, y: 200 }, rect);
      const top = getRotateCursorByPos({ x: 200, y: 100 }, rect);
      const bottom = getRotateCursorByPos({ x: 200, y: 300 }, rect);
      // All should be different data URIs (different rotation angles)
      const cursors = new Set([right, left, top, bottom]);
      expect(cursors.size).toBe(4);
    });

    it("returns same cursor for same angle (cached)", () => {
      const c1 = getRotateCursorByPos({ x: 300, y: 200 }, rect);
      const c2 = getRotateCursorByPos({ x: 300, y: 200 }, rect);
      expect(c1).toBe(c2);
    });

    it("includes hotspot coordinates", () => {
      const cursor = getRotateCursorByPos({ x: 200, y: 200 }, rect);
      expect(cursor).toContain("1 7");
    });
  });

  describe("getRotateCursorForHandle", () => {
    it("returns a data-URI cursor for each corner", () => {
      for (const corner of ["nw", "ne", "se", "sw"]) {
        const cursor = getRotateCursorForHandle(corner);
        expect(cursor).toContain("data:image/svg+xml");
        expect(cursor).toContain("crosshair");
      }
    });

    it("returns different cursors for different corners", () => {
      const nw = getRotateCursorForHandle("nw");
      const ne = getRotateCursorForHandle("ne");
      const se = getRotateCursorForHandle("se");
      const sw = getRotateCursorForHandle("sw");
      const cursors = new Set([nw, ne, se, sw]);
      expect(cursors.size).toBe(4);
    });

    it("accounts for layer rotation", () => {
      const base = getRotateCursorForHandle("se", 0);
      const rotated = getRotateCursorForHandle("se", 45);
      expect(base).not.toBe(rotated);
    });

    it("accounts for flip (scaleX * scaleY < 0)", () => {
      const normal = getRotateCursorForHandle("se", 30, 1, 1);
      const flipped = getRotateCursorForHandle("se", 30, -1, 1);
      expect(normal).not.toBe(flipped);
    });
  });
});
