import { createSignal } from "solid-js";
import { useEditor } from "./EditorContext";

export function useLayerDragReorder() {
  const { workspace, scheduler } = useEditor();

  const [draggedIndex, setDraggedIndex] = createSignal<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = createSignal<number | null>(null);
  const [dropPosition, setDropPosition] = createSignal<"above" | "below" | null>(null);

  let layerListRef: HTMLDivElement | undefined;
  let dragStartY = 0;
  let dragActive = false;
  let dragSourceIndex: number | null = null;

  const handlePointerDragStart = (e: PointerEvent, index: number) => {
    // Only primary button (left click)
    if (e.button !== 0) return;
    // Don't drag if clicking on a button or input inside the layer row
    const target = e.target as HTMLElement;
    if (target.closest("button") || target.closest("input") || target.closest("select")) return;

    dragStartY = e.clientY;
    dragSourceIndex = index;
    dragActive = false;

    const onPointerMove = (ev: PointerEvent) => {
      // Dead-zone: require 5px movement before starting drag
      if (!dragActive && Math.abs(ev.clientY - dragStartY) < 5) return;

      if (!dragActive) {
        dragActive = true;
        setDraggedIndex(dragSourceIndex);
      }

      // Find which layer item the pointer is over
      if (!layerListRef) return;
      const items = layerListRef.querySelectorAll<HTMLElement>("[data-layer-idx]");
      let foundIdx: number | null = null;
      let foundPosition: "above" | "below" = "above";

      for (const item of items) {
        const rect = item.getBoundingClientRect();
        if (ev.clientY >= rect.top && ev.clientY <= rect.bottom) {
          const idx = parseInt(item.dataset.layerIdx!, 10);
          foundIdx = idx;
          foundPosition = (ev.clientY - rect.top) < rect.height / 2 ? "above" : "below";
          break;
        }
      }

      if (foundIdx !== null && foundIdx !== dragSourceIndex) {
        setDragOverIndex(foundIdx);
        setDropPosition(foundPosition);
      } else {
        setDragOverIndex(null);
        setDropPosition(null);
      }
    };

    const onPointerUp = () => {
      document.removeEventListener("pointermove", onPointerMove);
      document.removeEventListener("pointerup", onPointerUp);

      if (dragActive && dragSourceIndex !== null) {
        const toIdx = dragOverIndex();
        const pos = dropPosition();
        if (toIdx !== null && toIdx !== dragSourceIndex) {
          const engine = workspace.getActiveEngine();
          const history = workspace.getActiveHistory();
          if (engine && history) {
            history.commit(engine.snapshot());
            let targetIdx = toIdx;
            if (pos === "below") {
              targetIdx = toIdx + 1;
            }
            if (dragSourceIndex < targetIdx) {
              targetIdx = Math.max(0, targetIdx - 1);
            }
            engine.reorderLayer(dragSourceIndex, targetIdx);
            scheduler.requestRender();
          }
        }
      }

      // Reset state
      dragActive = false;
      dragSourceIndex = null;
      setDraggedIndex(null);
      setDragOverIndex(null);
      setDropPosition(null);
    };

    document.addEventListener("pointermove", onPointerMove);
    document.addEventListener("pointerup", onPointerUp);
  };

  return {
    draggedIndex,
    dragOverIndex,
    dropPosition,
    handlePointerDragStart,
    setLayerListRef: (el: HTMLDivElement | undefined) => { layerListRef = el; },
    getLayerListRef: () => layerListRef,
  };
}
