import { addLayerFromCrossDoc, addFilesAsLayers, addFilesAsLayersFromFileDrop, type WorkspaceFacade } from "../crossDocLayerOps";
import type { DragController } from "../DragController";
import type { ViewportCamera } from "@/viewport/viewportCamera";

interface SchedulerLike {
  requestRender(): void;
}

interface RendererLike {
  uploadImage(layerId: string, source: ImageBitmap): void;
}

export interface UseCanvasDropOptions {
  dragController: DragController;
  camera: ViewportCamera;
  workspace: WorkspaceFacade;
  renderer: RendererLike;
  scheduler: SchedulerLike;
}

export function useCanvasDrop(options: UseCanvasDropOptions) {
  const { dragController, camera, workspace, renderer, scheduler } = options;

  const onDragOver = (e: DragEvent) => {
    // preventDefault needed even for OS file drags (dragKind may be null
    // at first dragover). Without this the browser shows the no-drop cursor
    // and blocks the drop event entirely.
    e.preventDefault();
    if (dragController.state().dragKind === null) return;
    dragController.setDropTarget({ type: "canvas" });
    dragController.cancelTabHover();
  };

  const onDragLeave = (e: DragEvent) => {
    const target = e.currentTarget;
    if (target && target instanceof Element && target.contains(e.relatedTarget as Node)) return;
    if (dragController.state().dropTarget?.type === "canvas") {
      dragController.setDropTarget(null);
    }
  };

  const onDrop = async (e: DragEvent) => {
    e.preventDefault();
    const state = dragController.state();
    if (state.dragKind === "layer" && state.payload) {
      const docPos = camera.screenToDocument(e.clientX, e.clientY);
      addLayerFromCrossDoc(state.payload, { type: "canvas" }, docPos, workspace);
    } else if (state.dragKind === "file") {
      if (state.filePaths && state.filePaths.length > 0) {
        // In-app file drag — pre-resolved file paths
        const docPos = camera.screenToDocument(e.clientX, e.clientY);
        const created = await addFilesAsLayers(state.filePaths, { type: "canvas" }, docPos, workspace);
        for (const { layerId, bitmap } of created) {
          renderer.uploadImage(layerId, bitmap);
        }
        if (created.length) scheduler.requestRender();
      } else if (e.dataTransfer?.files && e.dataTransfer.files.length > 0) {
        // OS file drop (Explorer / Finder) — read File objects directly
        const files = Array.from(e.dataTransfer.files);
        const docPos = camera.screenToDocument(e.clientX, e.clientY);
        const created = await addFilesAsLayersFromFileDrop(files, { type: "canvas" }, docPos, workspace);
        for (const { layerId, bitmap } of created) {
          renderer.uploadImage(layerId, bitmap);
        }
        if (created.length) scheduler.requestRender();
      }
    }
    dragController.endDrag();
  };

  return { onDragOver, onDragLeave, onDrop };
}
