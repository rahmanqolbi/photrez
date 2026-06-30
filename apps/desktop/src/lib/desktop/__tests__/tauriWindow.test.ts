import { describe, it, expect, vi, afterEach, beforeEach } from "vitest";
import { runTauriWindowAction, isTauriRuntime } from "../tauriWindow";

describe("isTauriRuntime", () => {
  afterEach(() => {
    delete (window as any).__TAURI_INTERNALS__;
  });

  it("returns false when __TAURI_INTERNALS__ is absent", () => {
    expect(isTauriRuntime()).toBe(false);
  });

  it("returns true when __TAURI_INTERNALS__ is present", () => {
    (window as any).__TAURI_INTERNALS__ = {};
    expect(isTauriRuntime()).toBe(true);
  });
});

describe("runTauriWindowAction", () => {
  afterEach(() => {
    delete (window as any).__TAURI_INTERNALS__;
  });

  it("no-ops without throwing when Tauri is absent", async () => {
    await expect(runTauriWindowAction("minimize")).resolves.toBeUndefined();
  });

  it("no-ops without throwing for all action types when Tauri is absent", async () => {
    await expect(runTauriWindowAction("close")).resolves.toBeUndefined();
    await expect(runTauriWindowAction("toggleMaximize")).resolves.toBeUndefined();
    await expect(runTauriWindowAction("startDragging")).resolves.toBeUndefined();
  });
});
