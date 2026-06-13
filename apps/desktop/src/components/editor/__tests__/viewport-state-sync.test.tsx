import { describe, expect, it } from "vitest";
import { ViewportCamera } from "@/viewport/viewportCamera";

describe("viewport state synchronization", () => {
  it("keeps camera state numerically stable for pan and zoom", () => {
    const camera = new ViewportCamera();

    camera.setState({ x: 120, y: 80, zoom: 0.6 });

    expect(camera.getState()).toEqual({ x: 120, y: 80, zoom: 0.6 });
    expect(camera.documentToScreen(0, 0)).toEqual({ x: 120, y: 80 });
    expect(camera.screenToDocument(120, 80)).toEqual({ x: 0, y: 0 });
  });
});
