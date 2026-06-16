import type { DropTarget } from "./dragTypes";
import { addFilesAsLayers, createNewDocsFromFiles, type WorkspaceFacade, type Point } from "./crossDocLayerOps";

export type ResolvedDropZone =
  | { type: "canvas" }
  | { type: "layers-panel" }
  | { type: "tab"; docId: string }
  | { type: "tab-empty" }
  | { type: "outside" };

export function findDropZoneAtPoint(x: number, y: number): ResolvedDropZone {
  const el = document.elementFromPoint(x, y) as HTMLElement | null;
  if (!el) return { type: "outside" };
  let current: HTMLElement | null = el;
  while (current) {
    if (current.hasAttribute("data-canvas-drop-zone")) return { type: "canvas" };
    if (current.hasAttribute("data-layers-panel-drop-zone")) return { type: "layers-panel" };
    const tabId = current.getAttribute("data-document-tab");
    if (tabId) return { type: "tab", docId: tabId };
    if (current.hasAttribute("data-tab-bar-empty")) return { type: "tab-empty" };
    current = current.parentElement;
  }
  return { type: "outside" };
}

export interface DropDispatchDeps {
  workspace: WorkspaceFacade;
  renderer: { uploadImage(layerId: string, bitmap: ImageBitmap): void };
  scheduler: { requestRender(): void };
  camera?: { screenToDocument(x: number, y: number): Point };
}

export interface DropDispatchResult {
  created: number;
  zone: ResolvedDropZone;
}

export async function dispatchTauriFileDrop(
  paths: string[],
  position: { x: number; y: number },
  deps: DropDispatchDeps
): Promise<DropDispatchResult> {
  const zone = findDropZoneAtPoint(position.x, position.y);

  if (zone.type === "canvas" || zone.type === "layers-panel" || zone.type === "tab") {
    const target: DropTarget = zone.type === "tab"
      ? { type: "tab", docId: zone.docId }
      : { type: zone.type };
    const basePos: Point = zone.type === "canvas" && deps.camera
      ? deps.camera.screenToDocument(position.x, position.y)
      : { x: 0, y: 0 };
    const created = await addFilesAsLayers(paths, target, basePos, deps.workspace);
    for (const { layerId, bitmap } of created) {
      deps.renderer.uploadImage(layerId, bitmap);
    }
    if (created.length) deps.scheduler.requestRender();
    return { created: created.length, zone };
  }

  // tab-empty / outside / no-zone → create new doc(s)
  const created = await createNewDocsFromFiles(paths, deps.workspace);
  for (const { backgroundLayerId, bitmap } of created) {
    deps.renderer.uploadImage(backgroundLayerId, bitmap);
  }
  if (created.length) deps.scheduler.requestRender();
  return { created: created.length, zone };
}
