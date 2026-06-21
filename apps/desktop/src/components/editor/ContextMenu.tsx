import { For, Show, createEffect, createSignal } from "solid-js";
import type { JSX } from "solid-js";
import { Portal } from "solid-js/web";
import { clsx } from "clsx";

export type ContextMenuEntry =
  | {
      kind: "item";
      label: string;
      shortcut?: string;
      disabled?: boolean;
      danger?: boolean;
      onSelect: (event: MouseEvent) => void;
    }
  | { kind: "separator" };

interface ContextMenuProps {
  open: boolean;
  x: number;
  y: number;
  ariaLabel: string;
  items: readonly ContextMenuEntry[];
  restoreFocusTo?: HTMLElement | null;
  onClose: () => void;
  testId?: string;
}

export function ContextMenu(props: ContextMenuProps) {
  let menuRef!: HTMLDivElement;
  const [position, setPosition] = createSignal({ x: props.x, y: props.y });

  const enabledItems = () => Array.from(
    menuRef?.querySelectorAll<HTMLButtonElement>('[role="menuitem"]:not(:disabled)') ?? [],
  );

  const focusItem = (index: number) => {
    const items = enabledItems();
    if (items.length === 0) return;
    items[(index + items.length) % items.length].focus();
  };

  createEffect(() => {
    if (!props.open) return;
    const anchor = { x: props.x, y: props.y };
    setPosition(anchor);
    queueMicrotask(() => {
      if (!menuRef) return;
      const bounds = menuRef.getBoundingClientRect();
      setPosition({
        x: Math.max(4, Math.min(anchor.x, window.innerWidth - bounds.width - 4)),
        y: Math.max(4, Math.min(anchor.y, window.innerHeight - bounds.height - 4)),
      });
      focusItem(0);
    });
  });

  const closeAndRestoreFocus = () => {
    props.onClose();
    queueMicrotask(() => props.restoreFocusTo?.focus());
  };

  const handleKeyDown: JSX.EventHandler<HTMLDivElement, KeyboardEvent> = (event) => {
    const items = enabledItems();
    const index = items.indexOf(document.activeElement as HTMLButtonElement);
    if (event.key === "ArrowDown") {
      event.preventDefault();
      focusItem(index + 1);
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      focusItem(index - 1);
    } else if (event.key === "Home") {
      event.preventDefault();
      focusItem(0);
    } else if (event.key === "End") {
      event.preventDefault();
      focusItem(items.length - 1);
    } else if (event.key === "Escape") {
      event.preventDefault();
      closeAndRestoreFocus();
    } else if (event.key === "Tab") {
      props.onClose();
    }
  };

  return (
    <Show when={props.open}>
      <Portal mount={document.body}>
        <div
          class="fixed inset-0 z-[79]"
          data-context-menu-backdrop
          onPointerDown={() => props.onClose()}
          onContextMenu={(event) => {
            event.preventDefault();
            props.onClose();
          }}
        />
        <div
          ref={menuRef}
          role="menu"
          aria-label={props.ariaLabel}
          data-testid={props.testId}
          class="fixed z-[80] min-w-[210px] overflow-hidden rounded-[6px] border border-editor-divider bg-editor-panel py-1 shadow-[0_8px_24px_rgba(0,0,0,0.45)]"
          style={{ left: `${position().x}px`, top: `${position().y}px` }}
          onKeyDown={handleKeyDown}
          onContextMenu={(event) => event.preventDefault()}
        >
          <For each={props.items}>
            {(entry) => (
              <Show
                when={entry.kind === "item" ? entry : null}
                fallback={<div role="separator" class="my-1 border-t border-editor-divider" />}
              >
                {(item) => (
                  <button
                    type="button"
                    role="menuitem"
                    disabled={item().disabled}
                    class={clsx(
                      "flex min-h-7 w-full items-center justify-between gap-6 px-3 text-left text-[12px] outline-none transition-colors",
                      item().danger
                        ? "text-editor-text hover:bg-editor-accent/15 hover:text-editor-accent focus-visible:bg-editor-accent/15 focus-visible:text-editor-accent"
                        : "text-editor-text hover:bg-white/[0.06] focus-visible:bg-editor-accent/15 focus-visible:text-editor-text",
                      "disabled:pointer-events-none disabled:opacity-35",
                    )}
                    onClick={(event) => {
                      if (item().disabled) return;
                      item().onSelect(event);
                      props.onClose();
                    }}
                  >
                    <span>{item().label}</span>
                    <Show when={item().shortcut}>
                      <span class="text-[10px] text-editor-text-dim">{item().shortcut}</span>
                    </Show>
                  </button>
                )}
              </Show>
            )}
          </For>
        </div>
      </Portal>
    </Show>
  );
}
