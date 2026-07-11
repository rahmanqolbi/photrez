// apps/desktop/src/__tests__/input-handler-eyedropper.test.ts
//
// Unit tests for the eyedropper sampling logic in viewport/input-handler.
// These cases were previously UNREACHABLE because useCanvasPointerTools
// early-returned for the eyedropper tool (AGENTS.md "every new tool fails"
// pattern). Now that the dispatcher routes eyedropper into handlePointerDown /
// handlePointerMove, this logic must stay correct and undo-safe.

import { describe, it, expect, vi } from "vitest";
import { handlePointerDown, handlePointerMove, handlePointerUp } from "../viewport/input-handler";
import { createMockEngine, createMockHistory, createToolContext } from "./test-builders";

describe("input-handler: eyedropper tool", () => {
  it("samples the pixel under the cursor and sets fg color on pointer down", () => {
    const engine = createMockEngine(["samplePixel"]);
    engine.samplePixel = vi.fn((): [number, number, number, number] => [128, 255, 64, 255]);
    const ctx = createToolContext();

    handlePointerDown("eyedropper", 10, 20, engine, createMockHistory(), vi.fn(), ctx);

    expect(engine.samplePixel).toHaveBeenCalledWith(10, 20);
    expect(ctx.setFgColor).toHaveBeenCalledWith("#80ff40");
  });

  it("live-samples while dragging on pointer move", () => {
    const engine = createMockEngine(["samplePixel"]);
    engine.samplePixel = vi.fn((): [number, number, number, number] => [10, 20, 30, 255]);
    const ctx = createToolContext({ isDragging: true });

    handlePointerMove("eyedropper", 5, 5, engine, vi.fn(), ctx);

    expect(engine.samplePixel).toHaveBeenCalledWith(5, 5);
    expect(ctx.setFgColor).toHaveBeenCalledWith("#0a141e");
  });

  it("does NOT commit history (sampling must not create an undo entry)", () => {
    const engine = createMockEngine(["samplePixel"]);
    engine.samplePixel = vi.fn((): [number, number, number, number] => [0, 0, 0, 255]);
    const ctx = createToolContext();
    const history = createMockHistory();

    handlePointerDown("eyedropper", 10, 20, engine, history, vi.fn(), ctx);
    handlePointerUp("eyedropper", 10, 20, engine, history, vi.fn(), ctx);

    expect(history.commit).not.toHaveBeenCalled();
  });

  it("ignores move events when not dragging (no stale sampling)", () => {
    const engine = createMockEngine(["samplePixel"]);
    engine.samplePixel = vi.fn((): [number, number, number, number] => [200, 100, 50, 255]);
    const ctx = createToolContext({ isDragging: false });

    handlePointerMove("eyedropper", 5, 5, engine, vi.fn(), ctx);

    expect(engine.samplePixel).not.toHaveBeenCalled();
    expect(ctx.setFgColor).not.toHaveBeenCalled();
  });
});
