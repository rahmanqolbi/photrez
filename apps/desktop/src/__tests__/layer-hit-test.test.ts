import { describe, it, expect } from "vitest";
import { hitTestLayers, hitTestLayer, type LayerInfo } from "../viewport/layerHitTest";

function makeLayer(overrides: Partial<LayerInfo> = {}): LayerInfo {
  return {
    id: "layer-1",
    visible: true,
    locked: false,
    transform: { x: 100, y: 100, scaleX: 1, scaleY: 1, rotation: 0, flipH: false, flipV: false },
    width: 200,
    height: 100,
    ...overrides,
  };
}

describe("hitTestLayer", () => {
  it("returns true for point inside unrotated rect", () => {
    expect(hitTestLayer({ x: 150, y: 150 }, makeLayer())).toBe(true);
  });

  it("returns false for point outside rect", () => {
    expect(hitTestLayer({ x: 50, y: 50 }, makeLayer())).toBe(false);
  });

  it("returns true for point inside rotated layer", () => {
    const layer = makeLayer({ transform: { ...makeLayer().transform, rotation: 45 } });
    const inside = hitTestLayer({ x: 200, y: 150 }, layer);
    expect(inside).toBe(true);
  });

  it("returns false for hidden layer", () => {
    expect(hitTestLayer({ x: 150, y: 150 }, makeLayer({ visible: false }))).toBe(false);
  });

  it("returns false for point in the gap of a rotated rect", () => {
    const layer = makeLayer({ transform: { ...makeLayer().transform, rotation: 45 } });
    const inside = hitTestLayer({ x: 260, y: 50 }, layer);
    expect(inside).toBe(false);
  });
});

describe("hitTestLayers", () => {
  it("returns topmost matching layer", () => {
    const top = makeLayer({ id: "top", transform: { x: 0, y: 0, scaleX: 1, scaleY: 1, rotation: 0, flipH: false, flipV: false } });
    const bottom = makeLayer({ id: "bottom", transform: { x: 100, y: 100, scaleX: 1, scaleY: 1, rotation: 0, flipH: false, flipV: false } });
    const layers = [top, bottom];
    const result = hitTestLayers({ x: 50, y: 50 }, layers);
    expect(result?.id).toBe("top");
  });

  it("skips hidden layers", () => {
    const hidden = makeLayer({ id: "hidden", visible: false, transform: { x: 0, y: 0, scaleX: 1, scaleY: 1, rotation: 0, flipH: false, flipV: false } });
    const visible = makeLayer({ id: "visible", transform: { x: 0, y: 0, scaleX: 1, scaleY: 1, rotation: 0, flipH: false, flipV: false } });
    const result = hitTestLayers({ x: 50, y: 50 }, [hidden, visible]);
    expect(result?.id).toBe("visible");
  });

  it("returns null when no layer is hit", () => {
    expect(hitTestLayers({ x: 999, y: 999 }, [makeLayer()])).toBeNull();
  });
});
