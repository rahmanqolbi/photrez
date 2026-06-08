import { describe, expect, it } from "vitest";
import { createModernCropState } from "../components/editor/modernCropState";

describe("modern crop undo/redo", () => {
  it("commits current state to undo stack", () => {
    const state = createModernCropState();
    state.setModernCropFrame({ w: 400, h: 300 });

    expect(state.canModernCropUndo()).toBe(false);

    state.commitModernCropState();

    expect(state.canModernCropUndo()).toBe(true);
  });

  it("undo restores previous frame and transform", () => {
    const state = createModernCropState();
    state.setModernCropFrame({ w: 400, h: 300 });
    state.commitModernCropState();

    state.setModernCropFrame({ w: 500, h: 400 });
    state.setModernCropImageTransform((prev) => ({ ...prev, offsetX: 50 }));

    const entry = state.undoModernCrop();
    expect(entry).not.toBeNull();
    expect(state.modernCropFrame()).toEqual({ w: 400, h: 300 });
    expect(state.modernCropImageTransform().offsetX).toBe(0);
  });

  it("can redo after undo", () => {
    const state = createModernCropState();
    state.setModernCropFrame({ w: 400, h: 300 });
    state.commitModernCropState();
    state.setModernCropFrame({ w: 500, h: 400 });
    state.undoModernCrop();

    expect(state.canModernCropRedo()).toBe(true);

    const entry = state.redoModernCrop();
    expect(entry).not.toBeNull();
    expect(state.modernCropFrame()).toEqual({ w: 500, h: 400 });
  });

  it("clears redo stack on new commit", () => {
    const state = createModernCropState();
    state.setModernCropFrame({ w: 400, h: 300 });
    state.commitModernCropState();
    state.setModernCropFrame({ w: 500, h: 400 });
    state.undoModernCrop();

    expect(state.canModernCropRedo()).toBe(true);

    state.setModernCropFrame({ w: 600, h: 500 });
    state.commitModernCropState();

    expect(state.canModernCropRedo()).toBe(false);
    expect(state.modernCropFrame()).toEqual({ w: 600, h: 500 });
  });

  it("reset modern crop clears undo/redo stacks", () => {
    const state = createModernCropState();
    state.setModernCropFrame({ w: 400, h: 300 });
    state.commitModernCropState();
    state.resetModernCrop();

    expect(state.canModernCropUndo()).toBe(false);
    expect(state.canModernCropRedo()).toBe(false);
    expect(state.modernCropFrame()).toBeNull();
  });

  it("commits transform changes to undo", () => {
    const state = createModernCropState();
    state.setModernCropFrame({ w: 400, h: 300 });
    state.commitModernCropState();

    state.setModernCropImageTransform((prev) => ({ ...prev, rotation: 45 }));
    state.undoModernCrop();

    expect(state.modernCropImageTransform().rotation).toBe(0);
  });

  it("multiple undos step back through history", () => {
    const state = createModernCropState();
    state.setModernCropFrame({ w: 400, h: 300 });
    state.commitModernCropState();

    state.setModernCropFrame({ w: 500, h: 400 });
    state.commitModernCropState();

    state.setModernCropFrame({ w: 600, h: 500 });
    state.commitModernCropState();

    state.undoModernCrop();
    expect(state.modernCropFrame()).toEqual({ w: 600, h: 500 });

    state.undoModernCrop();
    expect(state.modernCropFrame()).toEqual({ w: 500, h: 400 });

    state.undoModernCrop();
    expect(state.modernCropFrame()).toEqual({ w: 400, h: 300 });
  });

  it("returns null when no undo available", () => {
    const state = createModernCropState();
    expect(state.undoModernCrop()).toBeNull();
  });

  it("returns null when no redo available", () => {
    const state = createModernCropState();
    expect(state.redoModernCrop()).toBeNull();
  });
});
