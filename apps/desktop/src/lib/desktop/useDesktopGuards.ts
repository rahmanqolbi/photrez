import { onCleanup, onMount } from "solid-js";
import { isEditableTarget } from "@/lib/dom";

export function useDesktopGuards() {
  onMount(() => {
    const preventBrowserContextMenu = (event: MouseEvent) => {
      if (isEditableTarget(event.target)) return;
      event.preventDefault();
    };

    const preventBrowserDrag = (event: DragEvent) => {
      event.preventDefault();
    };

    document.addEventListener("contextmenu", preventBrowserContextMenu);
    document.addEventListener("dragstart", preventBrowserDrag);

    onCleanup(() => {
      document.removeEventListener("contextmenu", preventBrowserContextMenu);
      document.removeEventListener("dragstart", preventBrowserDrag);
    });
  });
}
