import { createSignal } from "solid-js";
import { useEditor } from "./EditorContext";
import { useDragController } from "./DragController";
import { cancelLayerTransformSession } from "./transformSession";

export function useLayerDragReorder() {
  const { workspace, scheduler, layerTransformSession, setLayerTransformSession } = useEditor();
  const dragController = useDragController();

  const cancelActiveTransformSession = () => {
    const engine = workspace.getActiveEngine();
    if (cancelLayerTransformSession(layerTransformSession(), engine)) {
      setLayerTransformSession(null);
      scheduler.requestRender();
    }
  };

  const [draggedIndex, setDraggedIndex] = createSignal<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = createSignal<number | null>(null);
  const [dropPosition, setDropPosition] = createSignal<"above" | "below" | null>(null);
  // ponytail: exposed as signal so LayerItem can flip cursor to
  // "grabbing" while a drag is active. Using a signal (not a plain
  // boolean) keeps it reactive — Solid re-evaluates the class binding
  // when the value flips true/false.
  const [dragActive, setDragActive] = createSignal(false);

  let layerListRef: HTMLDivElement | undefined;
  let dragStartY = 0;
  let dragSourceIndex: number | null = null;

  const handlePointerDragStart = (e: PointerEvent, index: number) => {
    // Only primary button (left click)
    if (e.button !== 0) return;
    // Don't drag if clicking on a button or input inside the layer row
    const target = e.target as HTMLElement;
    if (target.closest("button") || target.closest("input") || target.closest("select")) return;

    // If HTML5 cross-doc drag is already active, don't interfere. This was
    // the root cause of dragstart not firing: the in-panel pointermove
    // listener was running on every move and triggering Solid re-renders
    // that cancelled the HTML5 drag before it could start.
    if (dragController.state().dragKind !== null) return;

    dragStartY = e.clientY;
    dragSourceIndex = index;
    setDragActive(false);

    const onPointerMove = (ev: PointerEvent) => {
      // If HTML5 drag started in the meantime, abandon in-panel reorder.
      // ponytail: clear all drag signals before removing listeners —
      // otherwise the source layer stays visually "stuck" as dragged
      // until the next pointerup cycle. The pointerup listener is
      // removed here, so its cleanup block never runs.
      if (dragController.state().dragKind !== null) {
        setDragActive(false);
        dragSourceIndex = null;
        setDraggedIndex(null);
        setDragOverIndex(null);
        setDropPosition(null);
        document.removeEventListener("pointermove", onPointerMove);
        document.removeEventListener("pointerup", onPointerUp);
        return;
      }
      // Dead-zone: require 5px movement before starting drag
      if (!dragActive() && Math.abs(ev.clientY - dragStartY) < 5) return;

      if (!dragActive()) {
        setDragActive(true);
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

      // If HTML5 drag took over, don't do in-panel reorder
      if (dragController.state().dragKind !== null) {
        setDragActive(false);
        dragSourceIndex = null;
        setDraggedIndex(null);
        setDragOverIndex(null);
        setDropPosition(null);
        return;
      }

      if (dragActive() && dragSourceIndex !== null) {
        const toIdx = dragOverIndex();
        const pos = dropPosition();
        if (toIdx !== null && toIdx !== dragSourceIndex) {
          if (layerTransformSession()) {
            cancelActiveTransformSession();
          }
          const engine = workspace.getActiveEngine();
          const history = workspace.getActiveHistory();
          if (engine && history) {
            history.commit(engine.snapshot(), "Reorder Layer");
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
      setDragActive(false);
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
    dragActive,
    handlePointerDragStart,
    setLayerListRef: (el: HTMLDivElement | undefined) => { layerListRef = el; },
    getLayerListRef: () => layerListRef,
  };
}
