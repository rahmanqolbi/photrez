import { useEditor } from "./EditorContext";
import { useDragController } from "./DragController";

/**
 * ponytail: this hook used to host a *second*, pointer-based drag system
 * that fought LayerItem's `draggable=true` HTML5 drag. The two systems
 * raced to clear their own signals, leaving the source layer visually
 * "stuck" as dragged after release. Pass 14 collapses everything to
 * a single source of truth: `dragController.state().dragKind` plus the
 * payload's `layerId`. Visual state in LayerItem is bound directly to
 * `dragController` (via SolidJS reactivity), so `dragController.endDrag()`
 * is the only "drag ended" signal we ever need to react to.
 *
 * This hook now only exists to:
 *  1. Provide the list-ref so the panel can compute insertion
 *     positions from row bounding rects during `dragover`.
 *  2. Keep the import surface stable (LayersPanel.tsx still calls it).
 *
 * If a future feature needs panel-local signals, prefer deriving them
 * from `dragController.state()` via `createMemo` — never introduce a
 * parallel signal that can drift out of sync.
 */
export function useLayerDragReorder() {
  useEditor(); // validates provider scope at mount
  useDragController(); // ensures DragControllerProvider exists above
  let layerListRef: HTMLDivElement | undefined;

  return {
    setLayerListRef: (el: HTMLDivElement | undefined) => {
      layerListRef = el;
    },
    getLayerListRef: () => layerListRef,
  };
}