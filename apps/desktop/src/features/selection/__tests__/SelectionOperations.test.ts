import { describe, it, expect, beforeEach, vi } from "vitest";
import { SelectionOperations } from "../SelectionOperations";
import { SelectionState } from "../SelectionTypes";
import { DocumentEngine } from "../../../engine/document";

describe("SelectionOperations", () => {
  let engine: DocumentEngine;

  beforeEach(() => {
    engine = new DocumentEngine("test", "Test", 100, 100);
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

  describe("deleteSelection", () => {
    it("throws when no selection", () => {
      expect(() => SelectionOperations.deleteSelection(engine)).toThrow(
        "no selection",
      );
    });

    it("throws when no active layer", () => {
      engine.createSelection(0, 0, 50, 50);
      expect(() => SelectionOperations.deleteSelection(engine)).toThrow(
        "no active layer",
      );
    });

    it("clears selection after delete", () => {
      engine.addLayer("Layer 1", 100, 100);
      engine.createSelection(0, 0, 50, 50);
      SelectionOperations.deleteSelection(engine);
      expect(engine.getSelection()).toBeNull();
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
  });

  describe("cutSelection", () => {
    it("throws when no selection", () => {
      expect(() => SelectionOperations.cutSelection(engine)).toThrow(
        "no selection",
      );
    });

    it("throws when no active layer", () => {
      engine.createSelection(0, 0, 50, 50);
      expect(() => SelectionOperations.cutSelection(engine)).toThrow(
        "no active layer",
      );
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
