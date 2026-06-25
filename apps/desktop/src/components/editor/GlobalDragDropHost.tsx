import { useEditor } from "./EditorContext";
import { useDragController } from "./DragController";
import { useTauriDragDrop } from "./useTauriDragDrop";
import { dispatchTauriFileDrop, findDropZoneAtPoint, type DropDispatchDeps } from "./crossDocDropDispatch";

// ponytail: `dragDropEnabled: false` in tauri.conf.json disables
// Tauri's native OS-level drag-drop events so HTML5 in-app drag
// (layer reorder) works on Windows WebView2. As a trade-off,
// `webview.onDragDropEvent` never fires, so this host is currently
// a no-op in production. File drop from Explorer must go through
// the regular file picker. When Tauri ships a "hybrid" mode
// (tracking issue tauri-apps/tauri#15138), re-enable here.
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
