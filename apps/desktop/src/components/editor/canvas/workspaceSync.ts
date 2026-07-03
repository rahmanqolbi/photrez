import { batch } from "solid-js";
import type { WorkspaceManager } from "@/engine/workspace";
import type { RenderScheduler } from "@/renderer/scheduler";
import type { DocumentTabSummary, LayerNode, SelectionState } from "@/engine/types";
import { ViewportCamera } from "@/viewport/viewportCamera";
import type { HistoryItem } from "@/engine/history";

interface SyncStateParams {
  workspace: WorkspaceManager;
  camera: ViewportCamera;
  setDocuments: (docs: DocumentTabSummary[]) => void;
  setActiveDocumentId: (id: string | null) => void;
  setLayers: (layers: LayerNode[]) => void;
  setActiveLayerId: (id: string | null) => void;
  setSelectedLayerId: (id: string | null) => void;
  setSelection: (sel: SelectionState | null) => void;
  setSelectionEditMode: (edit: boolean) => void;
  setDocWidth: (width: number) => void;
  setDocHeight: (height: number) => void;
  setZoom: (zoom: number) => void;
  setPan: (pan: { x: number; y: number }) => void;
  scheduler: RenderScheduler;
  setHistoryItems: (items: HistoryItem[]) => void;
  setActiveHistoryIndex: (index: number) => void;
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
        params.setSelectedLayerId(engine.getActiveLayerId());
        const activeId = engine.getActiveLayerId();
        if (activeId) {
          console.log("[DBG] syncState: setSelectedLayerId(" + activeId + ")", new Error().stack?.split("\n").slice(2,6).join(" | "));
        }
        const newSel = engine.getSelection() ? { ...engine.getSelection()! } : null;
        params.setSelection(newSel);
        // Auto-disable edit mode when selection is cleared
        if (!newSel) {
          params.setSelectionEditMode(false);
        }
        params.setDocWidth(engine.getWidth());
        params.setDocHeight(engine.getHeight());
      } else {
        params.setLayers([]);
        params.setActiveLayerId(null);
        params.setSelectedLayerId(null);
        params.setSelection(null);
        params.setSelectionEditMode(false);
      }

      const history = params.workspace.getActiveHistory();
      if (history) {
        params.setHistoryItems(history.getHistoryStack());
        params.setActiveHistoryIndex(history.getUndoCount());
      } else {
        params.setHistoryItems([]);
        params.setActiveHistoryIndex(0);
      }
    });
  };

  const syncViewport = () => {
    const engine = params.workspace.getActiveEngine();
    if (engine) {
      const vp = engine.getViewport();
      params.camera.setState({ x: vp.panX, y: vp.panY, zoom: vp.zoom });
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
