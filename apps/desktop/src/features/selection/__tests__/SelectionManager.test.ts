import { describe, it, expect, beforeEach } from "vitest";
import { SelectionManager } from "../SelectionManager";
import { SelectionState } from "../SelectionTypes";

describe("SelectionManager", () => {
  let manager: SelectionManager;

  beforeEach(() => {
    manager = new SelectionManager();
  });

  describe("initial state", () => {
    it("starts with no selection", () => {
      expect(manager.getState()).toBeNull();
      expect(manager.hasSelection()).toBe(false);
    });
  });

  describe("create", () => {
    it("creates a valid selection", () => {
      manager.create(10, 20, 100, 200);
      const state = manager.getState();
      expect(state).not.toBeNull();
      expect(state!.x).toBe(10);
      expect(state!.y).toBe(20);
      expect(state!.width).toBe(100);
      expect(state!.height).toBe(200);
      expect(state!.angle).toBe(0);
    });

    it("creates selection with angle", () => {
      manager.create(0, 0, 100, 100, 45);
      expect(manager.getState()!.angle).toBe(45);
    });

    it("normalizes negative width on create", () => {
      manager.create(100, 0, -200, 100);
      const state = manager.getState()!;
      expect(state.x).toBe(-100);
      expect(state.width).toBe(200);
    });

    it("normalizes negative height on create", () => {
      manager.create(0, 100, 100, -200);
      const state = manager.getState()!;
      expect(state.y).toBe(-100);
      expect(state.height).toBe(200);
    });

    it("throws on invalid selection (NaN)", () => {
      expect(() => manager.create(NaN, 0, 100, 100)).toThrow("invalid selection");
    });

    it("throws on invalid selection (Infinity)", () => {
      expect(() => manager.create(Infinity, 0, 100, 100)).toThrow("invalid selection");
    });
  });

  describe("clear", () => {
    it("clears existing selection", () => {
      manager.create(0, 0, 100, 100);
      manager.clear();
      expect(manager.getState()).toBeNull();
      expect(manager.hasSelection()).toBe(false);
    });

    it("is idempotent when already cleared", () => {
      manager.clear();
      expect(manager.getState()).toBeNull();
    });
  });

  describe("move", () => {
    it("moves selection by delta", () => {
      manager.create(10, 20, 100, 100);
      manager.move(50, 30);
      const state = manager.getState()!;
      expect(state.x).toBe(60);
      expect(state.y).toBe(50);
    });

    it("throws when no selection to move", () => {
      expect(() => manager.move(10, 10)).toThrow("no selection");
    });

    it("moves by negative delta", () => {
      manager.create(100, 100, 50, 50);
      manager.move(-20, -30);
      const state = manager.getState()!;
      expect(state.x).toBe(80);
      expect(state.y).toBe(70);
    });
  });

  describe("rotate", () => {
    it("sets rotation angle", () => {
      manager.create(0, 0, 100, 100);
      manager.rotate(45);
      expect(manager.getState()!.angle).toBe(45);
    });

    it("throws when no selection to rotate", () => {
      expect(() => manager.rotate(45)).toThrow("no selection");
    });

    it("normalizes large angle", () => {
      manager.create(0, 0, 100, 100);
      manager.rotate(450);
      expect(manager.getState()!.angle).toBe(90);
    });

    it("accepts negative angle", () => {
      manager.create(0, 0, 100, 100);
      manager.rotate(-90);
      expect(manager.getState()!.angle).toBe(-90);
    });
  });

  describe("snapshot history", () => {
    it("snapshots before mutation on create", () => {
      manager.create(0, 0, 100, 100);
      const state = manager.getSnapshot();
      expect(state).not.toBeNull();
      expect(state!.width).toBe(100);
      expect(state!.height).toBe(100);
    });

    it("snapshots are immutable copies", () => {
      manager.create(0, 0, 100, 100);
      const state = manager.getState()!;
      const snapshot = manager.getSnapshot()!;
      state.x = 999;
      expect(snapshot.x).not.toBe(999);
    });
  });
});
