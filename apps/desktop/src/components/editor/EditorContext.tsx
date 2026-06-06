import { createContext, useContext, onMount } from "solid-js";
import { WorkspaceManager } from "@/engine/workspace";
import { WebGL2Backend } from "@/renderer/webgl2";
import { RenderScheduler } from "@/renderer/scheduler";
import { LayerNode, DocumentTabSummary } from "@/engine/types";
import { Accessor, Setter } from "solid-js";
import { createEditorState, LayerTransformSession } from "./editorState";
import { createCropState, CropPreview } from "./cropState";
import { setupWorkspaceSync } from "./workspaceSync";
import { openImage } from "./editorOpenImage";


export interface EditorContextValue {
  workspace: WorkspaceManager;
  renderer: WebGL2Backend;
  scheduler: RenderScheduler;
  
  openImage: () => Promise<void>;
  
  // UI Signals
  activeTool: Accessor<string>;
  setActiveTool: Setter<string>;
  
  fgColor: Accessor<string>;
  setFgColor: Setter<string>;
  
  bgColor: Accessor<string>;
  setBgColor: Setter<string>;
  
  zoom: Accessor<number>;
  setZoom: Setter<number>;
  
  pan: Accessor<{ x: number; y: number }>;
  setPan: Setter<{ x: number; y: number }>;

  syncViewport: () => void;

  // Derived / Sync signals
  documents: Accessor<DocumentTabSummary[]>;
  activeDocumentId: Accessor<string | null>;
  layers: Accessor<LayerNode[]>;
  activeLayerId: Accessor<string | null>;
  hoveredLayerId: Accessor<string | null>;
  setHoveredLayerId: Setter<string | null>;
  hoverHandle: Accessor<string | null>;
  setHoverHandle: Setter<string | null>;
  docWidth: Accessor<number>;
  docHeight: Accessor<number>;
  viewportWidth: Accessor<number>;
  setViewportWidth: Setter<number>;
  viewportHeight: Accessor<number>;
  setViewportHeight: Setter<number>;

  // Move Tool options
  moveAutoSelect: Accessor<boolean>;
  setMoveAutoSelect: Setter<boolean>;
  moveSnapEnabled: Accessor<boolean>;
  setMoveSnapEnabled: Setter<boolean>;

  // Crop Tool options
  cropRect: Accessor<{ x: number; y: number; w: number; h: number } | null>;
  setCropRect: Setter<{ x: number; y: number; w: number; h: number } | null>;
  cropMode: Accessor<"free" | "ratio" | "size">;
  setCropMode: Setter<"free" | "ratio" | "size">;
  cropGuideMode: Accessor<"none" | "thirds" | "grid" | "diagonal" | "golden">;
  setCropGuideMode: Setter<"none" | "thirds" | "grid" | "diagonal" | "golden">;
  cropDeletePixels: Accessor<boolean>;
  setCropDeletePixels: Setter<boolean>;
  cropAspect: Accessor<{ w: number; h: number } | null>;
  setCropAspect: Setter<{ w: number; h: number } | null>;
  cropSizeTarget: Accessor<{ w: number; h: number } | null>;
  setCropSizeTarget: Setter<{ w: number; h: number } | null>;
  cropSizeUnit: Accessor<"px" | "cm" | "mm" | "in">;
  setCropSizeUnit: Setter<"px" | "cm" | "mm" | "in">;
  cropRotation: Accessor<number>;
  setCropRotation: Setter<number>;
  hiddenCropPreview: Accessor<CropPreview | null>;
  setHiddenCropPreview: Setter<CropPreview | null>;
  commitCropState: (rect: { x: number; y: number; w: number; h: number }, rotation: number) => void;
  canCropUndo: Accessor<boolean>;
  canCropRedo: Accessor<boolean>;
  undoLastCrop: () => { rect: { x: number; y: number; w: number; h: number }; rotation: number } | null;
  redoCrop: () => { rect: { x: number; y: number; w: number; h: number }; rotation: number } | null;
  clearCropStacks: () => void;

  // Rotate cursor hover position (screen-space)
  hoverPos: Accessor<{ x: number; y: number } | null>;
  setHoverPos: Setter<{ x: number; y: number } | null>;

  // Transform Session
  layerTransformSession: Accessor<LayerTransformSession | null>;
  setLayerTransformSession: Setter<LayerTransformSession | null>;
}


const EditorContext = createContext<EditorContextValue>();

export function useEditor() {
  const context = useContext(EditorContext);
  if (!context) {
    throw new Error("useEditor must be used within an EditorProvider");
  }
  return context;
}

export function EditorProvider(props: {
  workspace: WorkspaceManager;
  renderer: WebGL2Backend;
  scheduler: RenderScheduler;
  children: any;
}) {
  const editorState = createEditorState();
  const cropState = createCropState();

  const { syncState, syncViewport } = setupWorkspaceSync({
    workspace: props.workspace,
    setDocuments: editorState.setDocuments,
    setActiveDocumentId: editorState.setActiveDocumentId,
    setLayers: editorState.setLayers,
    setActiveLayerId: editorState.setActiveLayerId,
    setDocWidth: editorState.setDocWidth,
    setDocHeight: editorState.setDocHeight,
    setZoom: editorState.setZoom,
    setPan: editorState.setPan,
    scheduler: props.scheduler,
  });

  const handleOpenImage = () => openImage({
    workspace: props.workspace,
    renderer: props.renderer,
    scheduler: props.scheduler,
  });

  onMount(() => {
    try {
      syncState();
    } catch (e) {
      console.error("Workspace sync failed during bootstrap:", e);
    }
  });

  const value: EditorContextValue = {
    workspace: props.workspace,
    renderer: props.renderer,
    scheduler: props.scheduler,
    openImage: handleOpenImage,
    ...editorState,
    ...cropState,
    syncViewport,
  };

  return (
    <EditorContext.Provider value={value}>
      {props.children}
    </EditorContext.Provider>
  );
}
