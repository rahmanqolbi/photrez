import { showOpenImageDialog, readFileBytes, loadProject } from "@/tauri/native";
import { WorkspaceManager, DocumentSession } from "@/engine/workspace";
import { DocumentEngine } from "@/engine/document";
import { CommandHistory } from "@/engine/history";
import { DocumentModel } from "@/engine/types";
import type { WebGL2Backend } from "@/renderer/webgl2";
import type { RenderScheduler } from "@/renderer/scheduler";
import { isTauriRuntime } from "@/lib/desktop/tauriWindow";
import { showToast } from "./Toast";
import { tick } from "@/lib/dom";

interface OpenImageParams {
  workspace: WorkspaceManager;
  renderer: WebGL2Backend;
  scheduler: RenderScheduler;
  // Callback for UI error reporting. EditorContext passes showToast here.
  onError?: (message: string) => void;
  // Callback for loading state. Called with a message string when loading starts,
  // and with null when loading finishes.
  onLoading?: (message: string | null) => void;
}

export async function openImage(params: OpenImageParams) {
  const reportError = (message: string) => {
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

    params.onLoading?.(`Opening ${paths.length} file${paths.length > 1 ? "s" : ""}...`);

    try {
      for (const path of paths) {
        await openSingleFile(path, params);
      }

      showToast("File(s) loaded", "info");
    } finally {
      params.onLoading?.(null);
    }
  } catch (e) {
    reportError(`Failed to open image: ${e}`);
  }
}

/** Open a single image or .ptz project file by path. */
export async function openSingleFile(path: string, params: OpenImageParams): Promise<void> {
  if (params.workspace.isFull()) return;

  if (path.toLowerCase().endsWith(".ptz")) {
    await loadProjectFile(path, params);
    return;
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

  await tick();
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
      await tick(); // yield so UI stays responsive during project load
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
