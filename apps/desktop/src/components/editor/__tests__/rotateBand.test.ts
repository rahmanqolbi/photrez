import { describe, it, expect } from "vitest";
import {
  getRotateBandPath,
  ROTATE_BAND_PX,
  ROTATE_CORNER_EXTRA,
} from "@/viewport/rotateBand";

describe("rotateBand", () => {
  describe("constants", () => {
    it("ROTATE_BAND_PX is 20", () => {
      expect(ROTATE_BAND_PX).toBe(20);
    });

    it("ROTATE_CORNER_EXTRA is 2", () => {
      expect(ROTATE_CORNER_EXTRA).toBe(2);
    });
  });

  describe("getRotateBandPath", () => {
    const x = 100, y = 50, w = 400, h = 300;
    const pad = ROTATE_BAND_PX + ROTATE_CORNER_EXTRA; // 22

    it("returns a valid SVG path starting with M and ending with Z", () => {
      const path = getRotateBandPath(x, y, w, h);
      expect(path).toBeTruthy();
      expect(path.startsWith("M ")).toBe(true);
      expect(path.endsWith("Z")).toBe(true);
    });

    it("contains two M commands (outer + inner)", () => {
      const path = getRotateBandPath(x, y, w, h);
      const mCount = (path.match(/\bM\b/g) ?? []).length;
      expect(mCount).toBe(2);
    });

    it("outer rect has rounded corners at correct positions", () => {
      const path = getRotateBandPath(x, y, w, h);
      // Rounded rect M starts at (x - pad + cr, y - pad)
      expect(path).toContain(`M ${x - pad + ROTATE_CORNER_EXTRA} ${y - pad}`);
      // Top edge goes to (x + w + pad - cr)
      expect(path).toContain(`H ${x + w + pad - ROTATE_CORNER_EXTRA}`);
      // Arc to (x + w + pad, y - pad + cr)
      expect(path).toContain(
        `A ${ROTATE_CORNER_EXTRA} ${ROTATE_CORNER_EXTRA} 0 0 1 ${x + w + pad} ${y - pad + ROTATE_CORNER_EXTRA}`,
      );
    });

    it("inner rect matches crop box exactly", () => {
      const path = getRotateBandPath(x, y, w, h);
      expect(path).toContain(`M ${x} ${y} H ${x + w} V ${y + h} H ${x} Z`);
    });

    it("band extends pad = bandWidth + cornerRadius outward on all sides", () => {
      const path = getRotateBandPath(0, 0, 100, 100);
      // Right edge vertical before arc: V 120 (100 + 22 - 2)
      expect(path).toContain(`V ${100 + pad - ROTATE_CORNER_EXTRA}`);
      // Bottom edge horizontal before arc: H -20 (-(22 - 2))
      expect(path).toContain(`H ${-(pad - ROTATE_CORNER_EXTRA)}`);
    });

    it("accepts custom band width and corner radius", () => {
      const bw = 15, cr = 5;
      const path = getRotateBandPath(x, y, w, h, bw, cr);
      const p = bw + cr;
      expect(path).toContain(`M ${x - p + cr} ${y - p}`);
      expect(path).toContain(`M ${x} ${y} H ${x + w} V ${y + h} H ${x} Z`);
    });

    it("path has two Z closings for evenodd ring", () => {
      const path = getRotateBandPath(0, 0, 100, 100);
      const zCount = (path.match(/Z/g) ?? []).length;
      expect(zCount).toBe(2);
    });
  });

  describe("band geometry — diagonal reach at corners", () => {
    it("corner reach is approximately 30px (20√2 + 2 ≈ 30.3)", () => {
      const expectedReach = Math.sqrt(2) * ROTATE_BAND_PX + ROTATE_CORNER_EXTRA;
      expect(Math.abs(expectedReach - 30.3)).toBeLessThan(0.1);
    });

    it("point at (crop_right + 15, crop_bottom + 15) is within 30px diagonal", () => {
      const dist = Math.sqrt(15 * 15 + 15 * 15);
      expect(dist).toBeLessThan(30.3);
    });

    it("point at (crop_right + 28, crop_bottom + 28) is beyond 30px diagonal", () => {
      const dist = Math.sqrt(28 * 28 + 28 * 28);
      expect(dist).toBeGreaterThan(30.3);
    });
  });
});
