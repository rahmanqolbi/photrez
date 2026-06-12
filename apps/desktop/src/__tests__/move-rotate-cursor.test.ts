import { describe, it, expect } from "vitest";
import { resolveCursor } from "@/viewport/cursorResolver";

describe("move rotate cursor reference behavior", () => {
  const baseCtx = {
    isSpacePressed: false,
    isPanning: false,
    activeTool: "move" as const,
    isAltPressed: false,
    hoverHandle: "rotate",
    isLayerLocked: false,
    eyedropperTarget: null,
    layerRotation: 0,
    layerScaleX: 1,
    layerScaleY: 1,
    layerBoundingBox: { x: 100, y: 100, w: 200, h: 100 },
  };

  it("uses an SVG rotate cursor instead of crosshair for rotate hover", () => {
    const cursor = resolveCursor({
      ...baseCtx,
      hoverPos: { x: 300, y: 150 },
    });

    expect(cursor).toContain("data:image/svg+xml");
    expect(cursor).not.toBe("crosshair");
  });

  it("changes rotate cursor when hover position changes", () => {
    const right = resolveCursor({
      ...baseCtx,
      hoverPos: { x: 300, y: 150 },
    });
    const bottom = resolveCursor({
      ...baseCtx,
      hoverPos: { x: 200, y: 250 },
    });

    expect(right).toContain("data:image/svg+xml");
    expect(bottom).toContain("data:image/svg+xml");
    expect(right).not.toBe(bottom);
  });

  it("falls back to static rotate cursor rather than crosshair if hover position is missing", () => {
    const cursor = resolveCursor({
      ...baseCtx,
      hoverPos: null,
    });

    expect(cursor).toContain("data:image/svg+xml");
    expect(cursor).not.toBe("crosshair");
  });
});
