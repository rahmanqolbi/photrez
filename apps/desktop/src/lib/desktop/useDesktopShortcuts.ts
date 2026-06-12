import { onCleanup, onMount } from "solid-js";
import { isEditableTarget } from "@/lib/dom";

type DesktopShortcutHandlers = {
  onToggleRightDock: () => void;
  onCloseDocument?: () => void;
};

export function useDesktopShortcuts(handlers: DesktopShortcutHandlers) {
  onMount(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (isEditableTarget(event.target)) return;

      const key = event.key.toLowerCase();
      const command = event.ctrlKey || event.metaKey;

      if (key === "f5" || (command && key === "r")) {
        event.preventDefault();
        return;
      }

      if (command && event.shiftKey && key === "p") {
        event.preventDefault();
        handlers.onToggleRightDock();
        return;
      }

      if (command && key === "w") {
        event.preventDefault();
        handlers.onCloseDocument?.();
      }
    };

    window.addEventListener("keydown", onKeyDown);

    onCleanup(() => {
      window.removeEventListener("keydown", onKeyDown);
    });
  });
}
