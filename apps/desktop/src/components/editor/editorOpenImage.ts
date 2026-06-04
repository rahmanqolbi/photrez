import { showOpenImageDialog, readFileBytes } from "@/tauri/native";
import { WorkspaceManager } from "@/engine/workspace";
import type { WebGL2Backend } from "@/renderer/webgl2";
import type { RenderScheduler } from "@/renderer/scheduler";

interface OpenImageParams {
  workspace: WorkspaceManager;
  renderer: WebGL2Backend;
  scheduler: RenderScheduler;
}

export async function openImage(params: OpenImageParams) {
  // 1. Web browser fallback check
  if (!(window as any).__TAURI_IPC__) {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/*";
    input.multiple = true;
    input.onchange = async (e: Event) => {
      const files = (e.target as HTMLInputElement).files;
      if (!files) return;

      for (const file of Array.from(files)) {
        if (params.workspace.isFull()) break;
        try {
          const bitmap = await createImageBitmap(file);
          const id = `doc-${crypto.randomUUID()}`;
          const session = WorkspaceManager.createDocumentFromImage(id, file.name, bitmap);
          
          params.workspace.addDocument(session);

          const bgLayerId = session.engine.getLayers()[0].id;
          params.renderer.uploadImage(bgLayerId, bitmap);
          params.scheduler.requestRender();
        } catch (err) {
          console.error("Failed to load image in browser fallback:", err);
        }
      }
    };
    input.click();
    return;
  }

  // 2. Tauri native environment
  try {
    const paths = await showOpenImageDialog();
    if (!paths || paths.length === 0) return;

    for (const path of paths) {
      if (params.workspace.isFull()) break;

      const bytes = await readFileBytes(path);
      const blob = new Blob([bytes as any]);
      const bitmap = await createImageBitmap(blob);

      const id = `doc-${crypto.randomUUID()}`;
      const name = path.split(/[/\\]/).pop() || "Image";
      const session = WorkspaceManager.createDocumentFromImage(id, name, bitmap);
      
      params.workspace.addDocument(session);

      const bgLayerId = session.engine.getLayers()[0].id;
      params.renderer.uploadImage(bgLayerId, bitmap);
      params.scheduler.requestRender();
    }
  } catch (e) {
    console.error("Failed to open image:", e);
  }
}
