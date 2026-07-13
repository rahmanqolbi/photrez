import { addLayerFromCrossDoc, addFilesAsLayers, addFilesAsLayersFromFileDrop, type WorkspaceFacade } from "../crossDocLayerOps";
import { dragDropEffect, type DragController } from "../DragController";
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
    const payload = dragController.state().payload;
    if (payload && e.dataTransfer) {
      const activeId = workspace.getActiveDocumentId();
      e.dataTransfer.dropEffect = dragDropEffect(payload, payload.sourceDocId !== activeId);
    }
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
    // `screenToDocument` expects coordinates relative to the canvas
    // container (it subtracts the camera pan, which lives in that space).
    // `DragEvent.clientX/Y` are window-absolute, and the canvas is NOT at
    // window (0,0) — there is a topbar/sidebar offset. Offset by the
    // canvas container's position, otherwise OS/file/layer drops land
    // shifted by that offset (bug for drops originating outside the app).
    const dropEl = e.currentTarget as HTMLElement | null;
    const rect = dropEl?.getBoundingClientRect();
    const toDoc = (cx: number, cy: number) =>
      camera.screenToDocument(cx - (rect?.left ?? 0), cy - (rect?.top ?? 0));
    if (state.dragKind === "layer" && state.payload) {
      const docPos = toDoc(e.clientX, e.clientY);
      const { newLayerId } = addLayerFromCrossDoc(state.payload, { type: "canvas" }, docPos, workspace);
      // Same-doc → reorder (same layer id, bitmap already uploaded).
      if (newLayerId && newLayerId !== state.payload.layerId) {
        const activeDocId = workspace.getActiveDocumentId();
        if (activeDocId) {
          const targetEngine = workspace.getEngine(activeDocId);
          const newLayer = targetEngine?.getLayer(newLayerId);
          if (newLayer?.imageBitmap) renderer.uploadImage(newLayerId, newLayer.imageBitmap);
        }
      }
      scheduler.requestRender();
    } else if (state.dragKind === "file") {
      if (state.filePaths && state.filePaths.length > 0) {
        // In-app file drag — pre-resolved file paths
        const docPos = toDoc(e.clientX, e.clientY);
        const created = await addFilesAsLayers(state.filePaths, { type: "canvas" }, docPos, workspace, true);
        for (const { layerId, bitmap } of created) {
          renderer.uploadImage(layerId, bitmap);
        }
        if (created.length) scheduler.requestRender();
      } else if (e.dataTransfer?.files && e.dataTransfer.files.length > 0) {
        // OS file drop (Explorer / Finder) — read File objects directly
        const files = Array.from(e.dataTransfer.files);
        const docPos = toDoc(e.clientX, e.clientY);
        const created = await addFilesAsLayersFromFileDrop(files, { type: "canvas" }, docPos, workspace, true);
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
