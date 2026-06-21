import { createContext, useContext, onMount, createEffect, createSignal, batch } from "solid-js";
import { WorkspaceManager } from "@/engine/workspace";
import { WebGL2Backend } from "@/renderer/webgl2";
import { RenderScheduler } from "@/renderer/scheduler";
import { LayerNode, DocumentTabSummary, SelectionState } from "@/engine/types";
import { Accessor, Setter } from "solid-js";
import { createEditorState, LayerTransformSession } from "./editorState";
import type { ToolId } from "./toolTypes";
import { createCropState, CropPreview, CropFillSource } from "./cropState";
import {
  createModernCropState,
  type ModernCropFrame,
  type ModernCropImageTransform,
  type ModernCropSnapshot,
} from "./modernCropState";
import { setupWorkspaceSync } from "./workspaceSync";
import { openImage } from "./editorOpenImage";
import { ViewportCamera } from "../../viewport/viewportCamera";
import { DragControllerProvider } from "./DragController";
import { showToast as showToastImpl } from "./Toast";
import { runToolSwitchCleanup } from "./toolLifecycle";
import { DialogProvider } from "./DialogProvider";



export interface EditorContextValue {
  workspace: WorkspaceManager;
  renderer: WebGL2Backend;
  scheduler: RenderScheduler;
  camera: ViewportCamera;
  setViewportState: (next: { x: number; y: number; zoom: number }) => void;
  syncFromCamera: () => void;
  
  openImage: () => Promise<void>;
  
  // UI Signals
  activeTool: Accessor<ToolId>;
  setActiveTool: Setter<ToolId>;
  
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
  selectedLayerId: Accessor<string | null>;
  setSelectedLayerId: Setter<string | null>;
  selection: Accessor<SelectionState | null>;
  setSelection: Setter<SelectionState | null>;
  selectionEditMode: Accessor<boolean>;
  setSelectionEditMode: Setter<boolean>;
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

  // Crop interaction mode
  cropInteractionMode: Accessor<"modern" | "classic">;
  setCropInteractionMode: Setter<"modern" | "classic">;

  // Crop Tool options
  cropRect: Accessor<{ x: number; y: number; w: number; h: number } | null>;
  setCropRect: Setter<{ x: number; y: number; w: number; h: number } | null>;
  cropMode: Accessor<"free" | "ratio" | "size">;
  setCropMode: Setter<"free" | "ratio" | "size">;
  cropGuideMode: Accessor<"none" | "thirds" | "grid" | "diagonal" | "golden">;
  setCropGuideMode: Setter<"none" | "thirds" | "grid" | "diagonal" | "golden">;
  cropDeletePixels: Accessor<boolean>;
  setCropDeletePixels: Setter<boolean>;
  cropFillEnabled: Accessor<boolean>;
  setCropFillEnabled: Setter<boolean>;
  cropFillSource: Accessor<CropFillSource>;
  setCropFillSource: Setter<CropFillSource>;
  cropFillCustomColor: Accessor<string>;
  setCropFillCustomColor: Setter<string>;
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
  modernCropFrame: Accessor<ModernCropFrame | null>;
  setModernCropFrame: Setter<ModernCropFrame | null>;
  modernCropImageTransform: Accessor<ModernCropImageTransform>;
  setModernCropImageTransform: Setter<ModernCropImageTransform>;
  resetModernCrop: () => void;
  commitModernCropState: () => void;
  canModernCropUndo: Accessor<boolean>;
  canModernCropRedo: Accessor<boolean>;
  undoModernCrop: () => ModernCropSnapshot | null;
  redoModernCrop: () => ModernCropSnapshot | null;
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

  // Paint tool settings
  brushSize: Accessor<number>;
  setBrushSize: Setter<number>;
  brushHardness: Accessor<number>;
  setBrushHardness: Setter<number>;
  brushOpacity: Accessor<number>;
  setBrushOpacity: Setter<number>;
  eraserSize: Accessor<number>;
  setEraserSize: Setter<number>;
  eraserHardness: Accessor<number>;
  setEraserHardness: Setter<number>;
  eraserOpacity: Accessor<number>;
  setEraserOpacity: Setter<number>;
  brushFlow: Accessor<number>;
  setBrushFlow: Setter<number>;
  brushSmoothing: Accessor<number>;
  setBrushSmoothing: Setter<number>;
  eraserFlow: Accessor<number>;
  setEraserFlow: Setter<number>;
  eraserSmoothing: Accessor<number>;
  setEraserSmoothing: Setter<number>;
  brushPresetId: Accessor<string | null>;
  setBrushPresetId: Setter<string | null>;
  eraserPresetId: Accessor<string | null>;
  setEraserPresetId: Setter<string | null>;

  showResizeDialog: Accessor<boolean>;
  setShowResizeDialog: Setter<boolean>;
  showExportDialog: Accessor<boolean>;
  setShowExportDialog: Setter<boolean>;

  // Feature flag: GPU camera image transform for Modern Crop
  useGPUCameraForModernCrop: Accessor<boolean>;
  setUseGPUCameraForModernCrop: Setter<boolean>;

  // Toast notifications
  showToast: (message: string, severity?: "info" | "warn" | "error") => void;
}


const EditorContext = createContext<EditorContextValue>();

interface EditorDebugEnv {
  DEV?: boolean;
  MODE?: string;
  VITE_PHOTREZ_DEBUG_EDITOR?: string;
}

export function shouldExposeEditorDebugHandle(env: EditorDebugEnv = import.meta.env): boolean {
  return env.DEV === true || env.MODE === "test" || env.VITE_PHOTREZ_DEBUG_EDITOR === "1";
}

// Module-level signal so render callbacks outside the provider
// (e.g., EditorShell's RenderScheduler) can read the same flag.
const [useGPUCameraForModernCrop, setUseGPUCameraForModernCrop] = createSignal(true);
export { useGPUCameraForModernCrop, setUseGPUCameraForModernCrop };

export function useEditor(): EditorContextValue {
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
  camera?: ViewportCamera;
  children: any;
}) {
  const camera = props.camera || new ViewportCamera();
  const editorState = createEditorState();
  const cropState = createCropState();
  const modernCropState = createModernCropState();

  const setViewportState = (next: { x: number; y: number; zoom: number }) => {
    camera.setState(next);
    batch(() => {
      editorState.setZoom(next.zoom);
      editorState.setPan({ x: next.x, y: next.y });
    });
    const engine = props.workspace.getActiveEngine();
    if (engine) {
      engine.setViewport({
        panX: next.x,
        panY: next.y,
        zoom: next.zoom,
      });
    }
  };

  const syncFromCamera = () => {
    setViewportState(camera.getState());
  };

  const { syncState, syncViewport } = setupWorkspaceSync({
    workspace: props.workspace,
    camera,
    setDocuments: editorState.setDocuments,
    setActiveDocumentId: editorState.setActiveDocumentId,
    setLayers: editorState.setLayers,
    setActiveLayerId: editorState.setActiveLayerId,
    setSelectedLayerId: editorState.setSelectedLayerId,
    setSelection: editorState.setSelection,
    setSelectionEditMode: editorState.setSelectionEditMode,
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

  let prevActiveLayerId: string | null = null;
  createEffect(() => {
    const id = editorState.activeLayerId();
    const sel = editorState.selectedLayerId();
    if (id && id !== prevActiveLayerId) {
      editorState.setSelectedLayerId(id);
    }
    prevActiveLayerId = id;
  });

  // Tool switch cleanup is registered per ToolId in toolLifecycle.ts.
  // That makes new tool additions declare their cleanup behavior at compile time.
  let prevActiveTool: ToolId | null = null;
  createEffect(() => {
    const tool = editorState.activeTool();
    if (prevActiveTool !== null && tool !== prevActiveTool) {
      runToolSwitchCleanup(prevActiveTool, tool, {
        setHoverHandle: editorState.setHoverHandle,
        setHoverPos: editorState.setHoverPos,
        setLayerTransformSession: editorState.setLayerTransformSession,
        setSelectionEditMode: editorState.setSelectionEditMode,
      });
    }
    prevActiveTool = tool;
  });

  const value: EditorContextValue = {
    workspace: props.workspace,
    renderer: props.renderer,
    scheduler: props.scheduler,
    camera,
    setViewportState,
    syncFromCamera,
    openImage: handleOpenImage,
    ...editorState,
    ...cropState,
    ...modernCropState,
    syncViewport,
    useGPUCameraForModernCrop,
    setUseGPUCameraForModernCrop,
    showToast: (message, severity = "info") => showToastImpl(message, severity),
  };

  // Expose editor on window only in dev/test builds for E2E introspection.
  if (typeof window !== "undefined" && shouldExposeEditorDebugHandle()) {
    (window as unknown as { __photrezEditor: EditorContextValue }).__photrezEditor =
      value;
  }

  return (
    <EditorContext.Provider value={value}>
      <DialogProvider>
        <DragControllerProvider>
          {props.children}
        </DragControllerProvider>
      </DialogProvider>
    </EditorContext.Provider>
  );
}
