import { describe, it, expect, vi, afterEach, beforeEach } from "vitest";
import { render } from "solid-js/web";
import { useDesktopShortcuts } from "../useDesktopShortcuts";

function ShortcutsHarness(props: {
  onToggleRightDock: () => void;
  onCloseDocument?: () => void;
}) {
  useDesktopShortcuts({
    onToggleRightDock: props.onToggleRightDock,
    onCloseDocument: props.onCloseDocument,
  });
  return null;
}

function fireKey(init: KeyboardEventInit) {
  window.dispatchEvent(new KeyboardEvent("keydown", { bubbles: true, ...init }));
}

describe("useDesktopShortcuts", () => {
  let container: HTMLDivElement;
  let dispose: () => void;

  beforeEach(() => {
    container = document.createElement("div");
  });

  afterEach(() => {
    dispose?.();
    container.remove();
  });

  it("Ctrl+Shift+P calls onToggleRightDock", () => {
    const onToggleRightDock = vi.fn();
    dispose = render(() => ShortcutsHarness({ onToggleRightDock }), container);

    fireKey({ key: "p", ctrlKey: true, shiftKey: true });

    expect(onToggleRightDock).toHaveBeenCalledTimes(1);
  });

  it("Cmd+Shift+P calls onToggleRightDock (Mac meta key)", () => {
    const onToggleRightDock = vi.fn();
    dispose = render(() => ShortcutsHarness({ onToggleRightDock }), container);

    fireKey({ key: "p", metaKey: true, shiftKey: true });

    expect(onToggleRightDock).toHaveBeenCalledTimes(1);
  });

  it("Ctrl+W calls onCloseDocument", () => {
    const onCloseDocument = vi.fn();
    dispose = render(() =>
      ShortcutsHarness({ onToggleRightDock: vi.fn(), onCloseDocument }),
      container,
    );

    fireKey({ key: "w", ctrlKey: true });

    expect(onCloseDocument).toHaveBeenCalledTimes(1);
  });

  it("Ctrl+W without onCloseDocument handler does not throw", () => {
    dispose = render(() => ShortcutsHarness({ onToggleRightDock: vi.fn() }), container);

    expect(() => fireKey({ key: "w", ctrlKey: true })).not.toThrow();
  });

  it("Ctrl+Shift+P does not fire when target is editable (input)", () => {
    const onToggleRightDock = vi.fn();
    const input = document.createElement("input");
    container.appendChild(input);
    dispose = render(() => ShortcutsHarness({ onToggleRightDock }), container);

    // Dispatch on the input element, not on window
    input.dispatchEvent(
      new KeyboardEvent("keydown", { key: "p", ctrlKey: true, shiftKey: true, bubbles: true }),
    );

    expect(onToggleRightDock).not.toHaveBeenCalled();
  });

  it("Ctrl+F5 is prevented (no handler called)", () => {
    const onToggleRightDock = vi.fn();
    dispose = render(() => ShortcutsHarness({ onToggleRightDock }), container);

    const ev = new KeyboardEvent("keydown", { key: "F5", ctrlKey: true, cancelable: true });
    const prevented = !window.dispatchEvent(ev);

    expect(prevented).toBe(true);
    expect(onToggleRightDock).not.toHaveBeenCalled();
  });

  it("cleans up listener on unmount", () => {
    const onToggleRightDock = vi.fn();
    dispose = render(() => ShortcutsHarness({ onToggleRightDock }), container);
    dispose(); // unmount
    dispose = () => {}; // prevent double-dispose in afterEach

    fireKey({ key: "p", ctrlKey: true, shiftKey: true });

    expect(onToggleRightDock).not.toHaveBeenCalled();
  });
});
