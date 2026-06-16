import { describe, it, expect } from "vitest";
import { LAYER_DRAG_MIME, isLayerDragPayload } from "../dragTypes";

describe("LAYER_DRAG_MIME", () => {
  it("is the Photrez custom MIME type", () => {
    expect(LAYER_DRAG_MIME).toBe("application/x-photrez-layer");
  });
});

describe("isLayerDragPayload", () => {
  it("accepts a valid v1 payload", () => {
    const valid = {
      version: 1,
      sourceDocId: "doc-1",
      layerId: "layer-1",
      sourceName: "Background",
      isAltPressed: false,
    };
    expect(isLayerDragPayload(valid)).toBe(true);
  });

  it("rejects missing fields", () => {
    expect(isLayerDragPayload({ version: 1, sourceDocId: "d" })).toBe(false);
  });

  it("rejects wrong version", () => {
    expect(
      isLayerDragPayload({
        version: 2,
        sourceDocId: "d",
        layerId: "l",
        sourceName: "n",
        isAltPressed: false,
      })
    ).toBe(false);
  });

  it("rejects non-boolean isAltPressed", () => {
    expect(
      isLayerDragPayload({
        version: 1,
        sourceDocId: "d",
        layerId: "l",
        sourceName: "n",
        isAltPressed: "yes",
      })
    ).toBe(false);
  });

  it("handles JSON roundtrip", () => {
    const original = {
      version: 1,
      sourceDocId: "doc-1",
      layerId: "layer-1",
      sourceName: "Background",
      isAltPressed: true,
    };
    const roundtrip = JSON.parse(JSON.stringify(original));
    expect(isLayerDragPayload(roundtrip)).toBe(true);
  });
});
