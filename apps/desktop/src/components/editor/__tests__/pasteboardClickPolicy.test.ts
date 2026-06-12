import { describe, expect, it } from "vitest";
import { getPasteboardClickAction, type PasteboardClickContext } from "../pasteboardClickPolicy";

const base: PasteboardClickContext = {
  hasDocument: true,
  activeTool: "move",
  isNavigationMode: false,
  hasLayerTransformSession: false,
  hasCropRect: false,
  hasSelectionPreview: false,
};

describe("getPasteboardClickAction", () => {
  it("does nothing without a document", () => {
    expect(getPasteboardClickAction({ ...base, hasDocument: false })).toBe("noop");
  });

  it("does nothing while navigation/panning owns the pointer", () => {
    expect(getPasteboardClickAction({ ...base, isNavigationMode: true })).toBe("noop");
  });

  it("protects active layer transform sessions", () => {
    expect(getPasteboardClickAction({ ...base, hasLayerTransformSession: true })).toBe("noop");
  });

  it("clears crop preview for Crop tool pasteboard click", () => {
    expect(getPasteboardClickAction({ ...base, activeTool: "crop", hasCropRect: true })).toBe("clear-crop-preview");
    expect(getPasteboardClickAction({ ...base, activeTool: "crop", hasCropRect: false })).toBe("noop");
  });

  it("clears active layer for normal Move pasteboard click", () => {
    expect(getPasteboardClickAction(base)).toBe("clear-active-layer");
  });

  it("clears selection preview for Selection tool pasteboard click", () => {
    expect(getPasteboardClickAction({ ...base, activeTool: "selection", hasSelectionPreview: true })).toBe("clear-selection-preview");
  });

  it("does nothing for paint and sampling tools", () => {
    expect(getPasteboardClickAction({ ...base, activeTool: "brush" })).toBe("noop");
    expect(getPasteboardClickAction({ ...base, activeTool: "eraser" })).toBe("noop");
    expect(getPasteboardClickAction({ ...base, activeTool: "eyedropper" })).toBe("noop");
  });
});
