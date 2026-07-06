import { afterEach, describe, expect, it, vi } from "vitest";
import { registerShortcut, clearRegistry, getRegistry } from "../keyboardRegistry";

describe("keyboardRegistry", () => {
  let warnSpy: ReturnType<typeof vi.spyOn> | null = null;

  afterEach(() => {
    warnSpy?.mockRestore();
    warnSpy = null;
    clearRegistry();
  });

  it("stores a registered shortcut with its owner", () => {
    registerShortcut("Ctrl+Z", "test");
    expect(getRegistry().get("Ctrl+Z")).toEqual(["test"]);
  });

  it("warns on conflict when a different owner registers the same shortcut", () => {
    warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    registerShortcut("Ctrl+0", "hookA");
    registerShortcut("Ctrl+0", "hookB");
    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining("Ctrl+0"),
    );
  });

  it("does NOT warn when the same owner re-registers the same shortcut", () => {
    warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    registerShortcut("Ctrl+G", "useCanvasKeyboard");
    registerShortcut("Ctrl+G", "useCanvasKeyboard");
    expect(warnSpy).not.toHaveBeenCalled();
  });

  it("tracks multiple owners for intentionally overlapped shortcuts", () => {
    registerShortcut("Ctrl+Z", "useEditorCommands");
    registerShortcut("Ctrl+Z", "useCanvasKeyboard");
    const registry = getRegistry();
    expect(registry.get("Ctrl+Z")).toEqual(["useEditorCommands", "useCanvasKeyboard"]);
  });

  it("clearRegistry empties all registered shortcuts", () => {
    registerShortcut("Ctrl+0", "test");
    registerShortcut("Ctrl+Z", "test");
    clearRegistry();
    expect(getRegistry().size).toBe(0);
  });

  it("getRegistry returns a snapshot that is not mutated by clearRegistry", () => {
    registerShortcut("Ctrl+S", "test");
    const snapshot = getRegistry();
    clearRegistry();
    // snapshot is a copy — still has the old data
    expect(snapshot.get("Ctrl+S")).toEqual(["test"]);
    expect(getRegistry().size).toBe(0);
  });
});
