import { For, Show, createSignal, onCleanup, onMount } from "solid-js";
import { MENU_ITEMS } from "./editorData";
import type { MenuItem } from "./types";
import type { EditorCommand } from "./useEditorCommands";
import { useEditor } from "./EditorContext";

type MenuEntry =
  | { kind: "item"; label: string; command: EditorCommand; shortcut?: string }
  | { kind: "separator" };

const MENU_DEFINITIONS: Record<MenuItem, readonly MenuEntry[]> = {
  File: [
    { kind: "item", label: "New Document", command: "file.new", shortcut: "Ctrl+N" },
    { kind: "item", label: "Open Image…", command: "file.open", shortcut: "Ctrl+O" },
    { kind: "separator" },
    { kind: "item", label: "Export…", command: "file.export", shortcut: "Ctrl+S" },
  ],
  Edit: [
    { kind: "item", label: "Undo", command: "edit.undo", shortcut: "Ctrl+Z" },
    { kind: "item", label: "Redo", command: "edit.redo", shortcut: "Ctrl+Shift+Z" },
    { kind: "separator" },
    { kind: "item", label: "Cut", command: "edit.cut", shortcut: "Ctrl+X" },
    { kind: "item", label: "Copy", command: "edit.copy", shortcut: "Ctrl+C" },
    { kind: "item", label: "Paste", command: "edit.paste", shortcut: "Ctrl+V" },
    { kind: "separator" },
    { kind: "item", label: "Select All", command: "edit.select-all", shortcut: "Ctrl+A" },
    { kind: "item", label: "Deselect", command: "edit.deselect", shortcut: "Ctrl+D" },
    { kind: "item", label: "Invert Selection", command: "edit.invert-selection", shortcut: "Ctrl+Shift+I" },
  ],
  Image: [
    { kind: "item", label: "Resize Canvas…", command: "image.resize" },
  ],
  Layer: [
    { kind: "item", label: "New Layer", command: "layer.new", shortcut: "Ctrl+Shift+N" },
    { kind: "item", label: "Duplicate Layer", command: "layer.duplicate", shortcut: "Ctrl+J" },
    { kind: "item", label: "Delete Layer", command: "layer.delete" },
    { kind: "separator" },
    { kind: "item", label: "Merge Down", command: "layer.merge-down", shortcut: "Ctrl+E" },
    { kind: "item", label: "Flatten Image", command: "layer.flatten", shortcut: "Ctrl+Shift+E" },
  ],
  View: [
    { kind: "item", label: "Zoom In", command: "view.zoom-in", shortcut: "Ctrl++" },
    { kind: "item", label: "Zoom Out", command: "view.zoom-out", shortcut: "Ctrl+-" },
    { kind: "item", label: "Actual Size", command: "view.actual-size", shortcut: "Ctrl+1" },
    { kind: "item", label: "Fit Canvas", command: "view.fit-canvas", shortcut: "Ctrl+0" },
    { kind: "separator" },
    { kind: "item", label: "Toggle Side Panels", command: "view.toggle-side-panels", shortcut: "Ctrl+Shift+P" },
    { kind: "item", label: "Use Stacked Side Dock", command: "view.toggle-right-dock-layout" },
  ],
  Window: [
    { kind: "item", label: "Minimize", command: "window.minimize" },
    { kind: "item", label: "Maximize / Restore", command: "window.toggle-maximize" },
    { kind: "separator" },
    { kind: "item", label: "Close Window", command: "window.close", shortcut: "Alt+F4" },
  ],
  Help: [
    { kind: "item", label: "About Photrez", command: "help.about" },
  ],
};

type AppMenuBarProps = {
  execute: (command: EditorCommand) => void;
  isEnabled: (command: EditorCommand) => boolean;
  isRightDockOpen: boolean;
};

export function AppMenuBar(props: AppMenuBarProps) {
  const [openMenu, setOpenMenu] = createSignal<MenuItem | null>(null);
  const triggerRefs = new Map<MenuItem, HTMLButtonElement>();
  let navRef!: HTMLElement;

  const menuItems = (menu: MenuItem): HTMLButtonElement[] => {
    const popup = document.getElementById(`app-menu-${menu.toLowerCase()}`);
    return Array.from(popup?.querySelectorAll<HTMLButtonElement>('[role="menuitem"]:not(:disabled)') ?? []);
  };

  const focusItem = (menu: MenuItem, index: number) => {
    const items = menuItems(menu);
    if (items.length === 0) return;
    items[(index + items.length) % items.length].focus();
  };

  const open = (menu: MenuItem, focusFirst = false) => {
    setOpenMenu(menu);
    if (focusFirst) queueMicrotask(() => focusItem(menu, 0));
  };

  const close = (restoreFocus = false) => {
    const current = openMenu();
    setOpenMenu(null);
    if (restoreFocus && current) queueMicrotask(() => triggerRefs.get(current)?.focus());
  };

  const adjacentMenu = (menu: MenuItem, direction: -1 | 1) => {
    const currentIndex = MENU_ITEMS.indexOf(menu);
    const next = MENU_ITEMS[(currentIndex + direction + MENU_ITEMS.length) % MENU_ITEMS.length];
    open(next, true);
  };

  const handleTriggerKeyDown = (event: KeyboardEvent, menu: MenuItem) => {
    if (event.key === "ArrowDown" || event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      open(menu, true);
    } else if (event.key === "Escape" && openMenu()) {
      event.preventDefault();
      close(true);
    }
  };

  const handlePopupKeyDown = (event: KeyboardEvent, menu: MenuItem) => {
    const items = menuItems(menu);
    const index = items.indexOf(document.activeElement as HTMLButtonElement);

    if (event.key === "ArrowDown") {
      event.preventDefault();
      focusItem(menu, index + 1);
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      focusItem(menu, index - 1);
    } else if (event.key === "Home") {
      event.preventDefault();
      focusItem(menu, 0);
    } else if (event.key === "End") {
      event.preventDefault();
      focusItem(menu, items.length - 1);
    } else if (event.key === "ArrowLeft") {
      event.preventDefault();
      adjacentMenu(menu, -1);
    } else if (event.key === "ArrowRight") {
      event.preventDefault();
      adjacentMenu(menu, 1);
    } else if (event.key === "Escape") {
      event.preventDefault();
      close(true);
    } else if (event.key === "Tab") {
      close();
    }
  };

  const labelFor = (entry: Extract<MenuEntry, { kind: "item" }>) => {
    if (entry.command === "view.toggle-side-panels") {
      return props.isRightDockOpen ? "Hide Side Panels" : "Show Side Panels";
    }
    if (entry.command === "view.toggle-right-dock-layout") {
      try {
        const editor = useEditor();
        return editor.rightDockLayout() === "side-by-side" ? "Use Stacked Side Dock" : "Use Side-by-Side Side Dock";
      } catch (e) {
        return "Use Stacked Side Dock";
      }
    }
    return entry.label;
  };

  const activate = (command: EditorCommand) => {
    if (!props.isEnabled(command)) return;
    const current = openMenu();
    close();
    if (current) triggerRefs.get(current)?.focus();
    props.execute(command);
  };

  onMount(() => {
    const handlePointerDown = (event: PointerEvent) => {
      if (openMenu() && !navRef.contains(event.target as Node)) close();
    };
    document.addEventListener("pointerdown", handlePointerDown);
    onCleanup(() => document.removeEventListener("pointerdown", handlePointerDown));
  });

  return (
    <nav ref={navRef} class="hidden h-full items-center gap-0.5 md:flex" aria-label="Application menu">
      <For each={MENU_ITEMS}>
        {(menu) => (
          <div class="relative flex h-full items-center">
            <button
              ref={(element) => triggerRefs.set(menu, element)}
              type="button"
              class={`flex h-[26px] items-center justify-center rounded-[4px] px-2.5 text-[12.5px] tracking-wide transition-colors focus-visible:outline focus-visible:outline-1 focus-visible:outline-editor-accent ${
                openMenu() === menu
                  ? "bg-white/[0.075] text-editor-text"
                  : "text-editor-text/85 hover:bg-white/[0.045] hover:text-editor-text"
              }`}
              aria-haspopup="menu"
              aria-expanded={openMenu() === menu}
              aria-controls={`app-menu-${menu.toLowerCase()}`}
              onClick={() => openMenu() === menu ? close() : open(menu)}
              onPointerEnter={() => {
                if (openMenu() && openMenu() !== menu) open(menu);
              }}
              onKeyDown={(event) => handleTriggerKeyDown(event, menu)}
            >
              {menu}
            </button>

            <Show when={openMenu() === menu}>
              <div
                id={`app-menu-${menu.toLowerCase()}`}
                role="menu"
                aria-label={`${menu} menu`}
                class="absolute left-0 top-[38px] z-[80] min-w-56 rounded-[6px] border border-editor-divider bg-editor-panel py-1 text-[12px] text-editor-text shadow-xl"
                onKeyDown={(event) => handlePopupKeyDown(event, menu)}
              >
                <For each={MENU_DEFINITIONS[menu]}>
                  {(entry) => (
                    <Show
                      when={entry.kind === "item" ? entry : null}
                      fallback={<div role="separator" class="my-1 h-px bg-editor-divider" />}
                    >
                      {(item) => (
                        <button
                          type="button"
                          role="menuitem"
                          aria-label={labelFor(item())}
                          disabled={!props.isEnabled(item().command)}
                          class="flex h-7 w-full items-center justify-between gap-6 px-3 text-left outline-none hover:bg-editor-field/70 focus-visible:bg-editor-field/70 disabled:text-editor-text-dim/45 disabled:hover:bg-transparent"
                          onClick={() => activate(item().command)}
                        >
                          <span>{labelFor(item())}</span>
                          <Show when={item().shortcut}>
                            <span class="text-[11px] text-editor-text-dim">{item().shortcut}</span>
                          </Show>
                        </button>
                      )}
                    </Show>
                  )}
                </For>
              </div>
            </Show>
          </div>
        )}
      </For>
    </nav>
  );
}
