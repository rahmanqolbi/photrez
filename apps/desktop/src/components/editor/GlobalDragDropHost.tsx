import { useEditor } from "./EditorContext";
import { useDragController } from "./DragController";
import { useTauriDragDrop } from "./useTauriDragDrop";
import { dispatchTauriFileDrop, findDropZoneAtPoint } from "./crossDocDropDispatch";

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
      void dispatchTauriFileDrop(paths, position, {
        workspace: workspace as unknown as Parameters<typeof dispatchTauriFileDrop>[2]["workspace"],
        renderer,
        scheduler,
        camera: camera as unknown as Parameters<typeof dispatchTauriFileDrop>[2]["camera"],
      });
    },
    onLeave: () => {
      dragController.setDropTarget(null);
    },
  });

  return null;
}
