import { onCleanup, onMount } from "solid-js";
import { isEditableTarget } from "@/lib/dom";

/**
 * Decide whether a dragstart event should be default-prevented.
 *
 * The default browser behavior for dragstart is to allow native image/link
 * dragging. We want to suppress that to avoid the "ghost" image drag
 * interfering with our app — but we MUST allow our custom layer drag
 * (LayerItem) to fire. LayerItem rows carry `data-layer-idx`; matching
 * elements and any of their descendants are exempt.
 */
export function shouldPreventDefaultDrag(event: DragEvent): boolean {
  const target = event.target as Element | null;
  if (target?.closest("[data-layer-idx]")) return false;
  return true;
}

export function useDesktopGuards() {
  onMount(() => {
    const preventBrowserContextMenu = (event: MouseEvent) => {
      if (isEditableTarget(event.target)) return;
      event.preventDefault();
    };

    const preventBrowserDrag = (event: DragEvent) => {
      if (!shouldPreventDefaultDrag(event)) return;
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

