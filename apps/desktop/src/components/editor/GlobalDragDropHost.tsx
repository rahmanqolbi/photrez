import { useEditor } from "./EditorContext";
import { useDragController } from "./DragController";
import { useTauriDragDrop } from "./useTauriDragDrop";
import { dispatchTauriFileDrop, findDropZoneAtPoint, type DropDispatchDeps } from "./crossDocDropDispatch";

export function GlobalDragDropHost() {
  const { workspace, renderer, scheduler, camera } = useEditor();
  const dragController = useDragController();

  useTauriDragDrop({
    onOver: (position) => {
      const zone = findDropZoneAtPoint(position.x, position.y);
      if (zone.type === "canvas") dragController.setDropTarget({ type: "canvas" });
      else if (zone.type === "layers-panel") dragController.setDropTarget({ type: "layers-panel" });
      else if (zone.type === "tab") dragController.setDropTarget({ type: "tab", docId: zone.docId });
      else if (zone.type === "tab-empty") dragController.setDropTarget({ type: "tab-empty" });
      else dragController.setDropTarget(null);
    },
    onDrop: (paths, position) => {
      // ponytail: import the deps type directly instead of re-deriving it
      // via `Parameters<...>[2]` and double-asserting. The dep type is the
      // source of truth — anything else drifts on signature changes.
      const deps: DropDispatchDeps = { workspace, renderer, scheduler, camera };
      void dispatchTauriFileDrop(paths, position, deps);
    },
    onLeave: () => {
      dragController.setDropTarget(null);
    },
  });

  return null;
}
