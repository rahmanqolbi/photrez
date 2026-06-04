import { batch } from "solid-js";
import type { WorkspaceManager } from "@/engine/workspace";
import type { RenderScheduler } from "@/renderer/scheduler";
import type { DocumentTabSummary, LayerNode } from "@/engine/types";

interface SyncStateParams {
  workspace: WorkspaceManager;
  setDocuments: (docs: DocumentTabSummary[]) => void;
  setActiveDocumentId: (id: string | null) => void;
  setLayers: (layers: LayerNode[]) => void;
  setActiveLayerId: (id: string | null) => void;
  setDocWidth: (width: number) => void;
  setDocHeight: (height: number) => void;
  setZoom: (zoom: number) => void;
  setPan: (pan: { x: number; y: number }) => void;
  scheduler: RenderScheduler;
}

export function setupWorkspaceSync(params: SyncStateParams) {
  const syncState = () => {
    batch(() => {
      params.setDocuments(params.workspace.getTabSummaries());
      const activeId = params.workspace.getActiveDocumentId();
      params.setActiveDocumentId(activeId);

      const engine = params.workspace.getActiveEngine();
      if (engine) {
        params.setLayers(engine.getLayers().map(l => ({ ...l, transform: { ...l.transform } })));
        params.setActiveLayerId(engine.getActiveLayerId());
        params.setDocWidth(engine.getWidth());
        params.setDocHeight(engine.getHeight());
      } else {
        params.setLayers([]);
        params.setActiveLayerId(null);
      }
    });
  };

  const syncViewport = () => {
    const engine = params.workspace.getActiveEngine();
    if (engine) {
      const vp = engine.getViewport();
      params.setZoom(vp.zoom);
      params.setPan({ x: vp.panX, y: vp.panY });
    }
  };

  params.workspace.onChange(() => {
    syncState();
    syncViewport();
  });

  params.workspace.onVisualChange(() => {
    syncState();
    params.scheduler.requestRender();
  });

  return {
    syncState,
    syncViewport,
  };
}
