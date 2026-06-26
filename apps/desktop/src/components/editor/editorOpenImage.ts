import { showOpenImageDialog, readFileBytes, loadProject } from "@/tauri/native";
import { WorkspaceManager, DocumentSession } from "@/engine/workspace";
import { DocumentEngine } from "@/engine/document";
import { CommandHistory } from "@/engine/history";
import { DocumentModel } from "@/engine/types";
import type { WebGL2Backend } from "@/renderer/webgl2";
import type { RenderScheduler } from "@/renderer/scheduler";

interface OpenImageParams {
  workspace: WorkspaceManager;
  renderer: WebGL2Backend;
  scheduler: RenderScheduler;
  // ponytail: optional error reporter so failed reads/decode surface
  // to the user via the existing Toast host instead of console.error only.
  // Keeping it optional preserves the existing call sites and tests.
  onError?: (message: string) => void;
}

// ponytail: Tauri 2 does not ship a typed `__TAURI_IPC__` global, so the
// runtime check has to widen the window object locally. Kept to one
// helper instead of `as any` so the cast has a single point of truth
// and the rest of the file stays typed.
function isTauriRuntime(): boolean {
  return typeof window !== "undefined" && "__TAURI_IPC__" in window;
}

export async function openImage(params: OpenImageParams) {
  const reportError = (message: string) => {
    console.error(message);
    params.onError?.(message);
  };

  // 1. Web browser fallback check
  if (!isTauriRuntime()) {
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
          reportError(`Failed to load image in browser fallback: ${err}`);
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

      if (path.toLowerCase().endsWith(".ptz")) {
        await loadProjectFile(path, params);
        continue;
      }

      const bytes = await readFileBytes(path);
      const buffer = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;
      const blob = new Blob([buffer]);
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
    reportError(`Failed to open image: ${e}`);
  }
}

async function loadProjectFile(path: string, params: OpenImageParams) {
  const result = await loadProject(path);
  const model = JSON.parse(result.document_json) as DocumentModel;

  for (const layer of model.layers) {
    const base64Data = result.layers[layer.id];
    if (base64Data) {
      const binaryString = atob(base64Data);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
      const blob = new Blob([bytes], { type: "image/png" });
      layer.imageBitmap = await createImageBitmap(blob);
    } else {
      layer.imageBitmap = null;
    }
  }

  const engine = new DocumentEngine(model.id, model.name, model.width, model.height);
  engine.restore(model, { restoreViewport: true });
  engine.clearDirty();

  const session: DocumentSession = {
    engine,
    history: new CommandHistory(),
    displayName: model.name,
    sourcePath: path,
    dirty: false,
  };

  params.workspace.addDocument(session);

  for (const layer of engine.getLayers()) {
    if (layer.imageBitmap) {
      params.renderer.uploadImage(layer.id, layer.imageBitmap);
    }
  }

  params.scheduler.requestRender();
}
