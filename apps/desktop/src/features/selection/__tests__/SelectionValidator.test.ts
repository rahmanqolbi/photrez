import { describe, it, expect } from "vitest";
import { validateSelection, normalizeSelection } from "../SelectionValidator";
import { SelectionState, SelectionValidationResult } from "../SelectionTypes";

describe("SelectionValidator", () => {
  describe("validateSelection", () => {
    it("accepts valid selection", () => {
      const selection: SelectionState = {
        x: 0,
        y: 0,
        width: 100,
        height: 100,
        angle: 0,
      };
      const result = validateSelection(selection);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it("rejects selection with NaN x", () => {
      const selection: SelectionState = {
        x: NaN,
        y: 0,
        width: 100,
        height: 100,
        angle: 0,
      };
      const result = validateSelection(selection);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain("x must be finite");
    });

    it("rejects selection with NaN y", () => {
      const selection: SelectionState = {
        x: 0,
        y: NaN,
        width: 100,
        height: 100,
        angle: 0,
      };
      const result = validateSelection(selection);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain("y must be finite");
    });

    it("rejects selection with NaN width", () => {
      const selection: SelectionState = {
        x: 0,
        y: 0,
        width: NaN,
        height: 100,
        angle: 0,
      };
      const result = validateSelection(selection);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain("width must be finite");
    });

    it("rejects selection with NaN height", () => {
      const selection: SelectionState = {
        x: 0,
        y: 0,
        width: 100,
        height: NaN,
        angle: 0,
      };
      const result = validateSelection(selection);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain("height must be finite");
    });

    it("rejects selection with NaN angle", () => {
      const selection: SelectionState = {
        x: 0,
        y: 0,
        width: 100,
        height: 100,
        angle: NaN,
      };
      const result = validateSelection(selection);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain("angle must be finite");
    });

    it("rejects selection with Infinity values", () => {
      const selection: SelectionState = {
        x: Infinity,
        y: -Infinity,
        width: Infinity,
        height: Infinity,
        angle: Infinity,
      };
      const result = validateSelection(selection);
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThanOrEqual(1);
    });

    it("rejects selection with negative width", () => {
      const selection: SelectionState = {
        x: 0,
        y: 0,
        width: -100,
        height: 100,
        angle: 0,
      };
      const result = validateSelection(selection);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain("width must be non-negative");
    });

    it("rejects selection with negative height", () => {
      const selection: SelectionState = {
        x: 0,
        y: 0,
        width: 100,
        height: -100,
        angle: 0,
      };
      const result = validateSelection(selection);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain("height must be non-negative");
    });

    it("accepts zero-area selection", () => {
      const selection: SelectionState = {
        x: 50,
        y: 50,
        width: 0,
        height: 0,
        angle: 0,
      };
      const result = validateSelection(selection);
      expect(result.valid).toBe(true);
    });

    it("accepts negative angle", () => {
      const selection: SelectionState = {
        x: 0,
        y: 0,
        width: 100,
        height: 100,
        angle: -45,
      };
      const result = validateSelection(selection);
      expect(result.valid).toBe(true);
    });

    it("accepts angle > 360", () => {
      const selection: SelectionState = {
        x: 0,
        y: 0,
        width: 100,
        height: 100,
        angle: 720,
      };
      const result = validateSelection(selection);
      expect(result.valid).toBe(true);
    });

    it("collects multiple errors", () => {
      const selection: SelectionState = {
        x: NaN,
        y: NaN,
        width: -100,
        height: -100,
        angle: NaN,
      };
      const result = validateSelection(selection);
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThanOrEqual(3);
    });
  });

  describe("normalizeSelection", () => {
    it("normalizes negative width to positive", () => {
      const selection: SelectionState = {
        x: 100,
        y: 50,
        width: -200,
        height: 100,
        angle: 0,
      };
      const normalized = normalizeSelection(selection);
      expect(normalized.x).toBe(-100);
      expect(normalized.width).toBe(200);
    });

    it("normalizes negative height to positive", () => {
      const selection: SelectionState = {
        x: 50,
        y: 100,
        width: 100,
        height: -200,
        angle: 0,
      };
      const normalized = normalizeSelection(selection);
      expect(normalized.y).toBe(-100);
      expect(normalized.height).toBe(200);
    });

    it("normalizes both negative width and height", () => {
      const selection: SelectionState = {
        x: 100,
        y: 100,
        width: -200,
        height: -200,
        angle: 0,
      };
      const normalized = normalizeSelection(selection);
      expect(normalized.x).toBe(-100);
      expect(normalized.y).toBe(-100);
      expect(normalized.width).toBe(200);
      expect(normalized.height).toBe(200);
    });

    it("does not modify valid selection", () => {
      const selection: SelectionState = {
        x: 10,
        y: 20,
        width: 100,
        height: 100,
        angle: 45,
      };
      const normalized = normalizeSelection(selection);
      expect(normalized).toEqual(selection);
    });

    it("normalizes angle to [-180, 180] range", () => {
      const selection: SelectionState = {
        x: 0,
        y: 0,
        width: 100,
        height: 100,
        angle: 270,
      };
      const normalized = normalizeSelection(selection);
      expect(normalized.angle).toBe(-90);
    });

    it("normalizes negative angle to [-180, 180] range", () => {
      const selection: SelectionState = {
        x: 0,
        y: 0,
        width: 100,
        height: 100,
        angle: -270,
      };
      const normalized = normalizeSelection(selection);
      expect(normalized.angle).toBe(90);
    });
  });
});
