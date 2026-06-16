import { describe, it, expect } from "vitest";
import { computeCascadePosition, CASCADE_OFFSET_PX } from "../crossDocLayerOps";

describe("computeCascadePosition", () => {
  it("returns exact base position for index 0", () => {
    expect(computeCascadePosition({ x: 100, y: 100 }, 0)).toEqual({ x: 100, y: 100 });
  });

  it("offsets by 24px per index", () => {
    expect(computeCascadePosition({ x: 100, y: 100 }, 4)).toEqual({ x: 196, y: 196 });
  });

  it("exports CASCADE_OFFSET_PX = 24", () => {
    expect(CASCADE_OFFSET_PX).toBe(24);
  });

  it("negative index returns negative offset (shouldn't happen in practice)", () => {
    expect(computeCascadePosition({ x: 100, y: 100 }, -2)).toEqual({ x: 52, y: 52 });
  });
});
