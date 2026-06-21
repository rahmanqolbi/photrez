import { afterEach, describe, expect, it, vi } from "vitest";
import { createSignal } from "solid-js";
import { render } from "solid-js/web";
import { ContextMenu, type ContextMenuEntry } from "../ContextMenu";

describe("ContextMenu", () => {
  afterEach(() => {
    document.body.innerHTML = "";
    vi.restoreAllMocks();
  });

  it("renders menu semantics and skips disabled items during keyboard navigation", async () => {
    const first = vi.fn();
    const disabled = vi.fn();
    const last = vi.fn();
    const items: ContextMenuEntry[] = [
      { kind: "item", label: "First", onSelect: first },
      { kind: "item", label: "Disabled", disabled: true, onSelect: disabled },
      { kind: "separator" },
      { kind: "item", label: "Last", onSelect: last },
    ];
    const root = document.createElement("div");
    document.body.appendChild(root);
    const dispose = render(() => (
      <ContextMenu open x={20} y={30} ariaLabel="Test actions" items={items} onClose={vi.fn()} />
    ), root);
    await new Promise<void>((resolve) => queueMicrotask(resolve));

    const menu = document.querySelector<HTMLElement>('[role="menu"]')!;
    const enabled = document.querySelectorAll<HTMLButtonElement>('[role="menuitem"]:not(:disabled)');
    expect(menu).toHaveAttribute("aria-label", "Test actions");
    expect(document.querySelector('[role="separator"]')).not.toBeNull();
    expect(document.activeElement).toBe(enabled[0]);

    menu.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowDown", bubbles: true }));
    expect(document.activeElement).toBe(enabled[1]);
    dispose();
  });

  it("closes on Escape and restores focus to the invocation target", async () => {
    const trigger = document.createElement("button");
    document.body.appendChild(trigger);
    const root = document.createElement("div");
    document.body.appendChild(root);
    const [open, setOpen] = createSignal(true);
    const dispose = render(() => (
      <ContextMenu
        open={open()}
        x={20}
        y={30}
        ariaLabel="Test actions"
        items={[{ kind: "item", label: "Action", onSelect: vi.fn() }]}
        restoreFocusTo={trigger}
        onClose={() => setOpen(false)}
      />
    ), root);
    await new Promise<void>((resolve) => queueMicrotask(resolve));

    document.querySelector<HTMLElement>('[role="menu"]')!
      .dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
    await new Promise<void>((resolve) => queueMicrotask(resolve));

    expect(document.querySelector('[role="menu"]')).toBeNull();
    expect(document.activeElement).toBe(trigger);
    dispose();
  });

  it("executes an enabled action once and closes", () => {
    const action = vi.fn();
    const close = vi.fn();
    const root = document.createElement("div");
    document.body.appendChild(root);
    const dispose = render(() => (
      <ContextMenu
        open
        x={20}
        y={30}
        ariaLabel="Test actions"
        items={[{ kind: "item", label: "Action", onSelect: action }]}
        onClose={close}
      />
    ), root);

    (document.querySelector('[role="menuitem"]') as HTMLButtonElement).click();
    expect(action).toHaveBeenCalledOnce();
    expect(close).toHaveBeenCalledOnce();
    dispose();
  });
});
