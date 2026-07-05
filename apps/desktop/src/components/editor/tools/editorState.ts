import { createSignal } from "solid-js";
import type { LayerNode, DocumentTabSummary, Transform2D, DocumentModel, SelectionState } from "@/engine/types";
import type { ToolId } from "./toolTypes";

export interface LayerTransformSession {
  documentId: string;
  layerId: string;
  originalSnapshot: DocumentModel;
  originalTransform: Transform2D;
  mode: "resize" | "rotate";
  lockRatio: boolean;
  startedAt: number;
}

export function createEditorState() {
  const [activeTool, setActiveTool] = createSignal<ToolId>("move");
  const [fgColor, setFgColor] = createSignal("#E15A17");
  const [bgColor, setBgColor] = createSignal("#FFFFFF");
  const [zoom, setZoom] = createSignal(1.0);
  const [pan, setPan] = createSignal({ x: 0, y: 0 });

  // Sync state signals
  const [documents, setDocuments] = createSignal<DocumentTabSummary[]>([]);
  const [activeDocumentId, setActiveDocumentId] = createSignal<string | null>(null);
  const [layers, setLayers] = createSignal<LayerNode[]>([]);
  const [activeLayerId, setActiveLayerId] = createSignal<string | null>(null);
  const [hoveredLayerId, setHoveredLayerId] = createSignal<string | null>(null);
  const [hoverHandle, setHoverHandle] = createSignal<string | null>(null);
  const [docWidth, setDocWidth] = createSignal(800);
  const [docHeight, setDocHeight] = createSignal(600);
  const [viewportWidth, setViewportWidth] = createSignal(800);
  const [viewportHeight, setViewportHeight] = createSignal(600);

  const [moveAutoSelect, setMoveAutoSelect] = createSignal(true);
  const [moveSnapEnabled, setMoveSnapEnabled] = createSignal(true);
  const [showTransformControls, setShowTransformControls] = createSignal(true);
  const [cropInteractionMode, setCropInteractionMode] = createSignal<"modern" | "classic">("modern");
  const [hoverPos, setHoverPos] = createSignal<{ x: number; y: number } | null>(null);
  const [layerTransformSession, setLayerTransformSession] = createSignal<LayerTransformSession | null>(null);

  const [brushSize, setBrushSize] = createSignal(20);
  const [brushHardness, setBrushHardness] = createSignal(0.8);
  const [brushOpacity, setBrushOpacity] = createSignal(1);
  const [eraserSize, setEraserSize] = createSignal(32);
  const [eraserHardness, setEraserHardness] = createSignal(1);
  const [eraserOpacity, setEraserOpacity] = createSignal(1);
  const [brushFlow, setBrushFlow] = createSignal(1);
  const [brushSmoothing, setBrushSmoothing] = createSignal(0);
  const [eraserFlow, setEraserFlow] = createSignal(1);
  const [eraserSmoothing, setEraserSmoothing] = createSignal(0);
  const [brushPresetId, setBrushPresetId] = createSignal<string | null>(null);
  const [eraserPresetId, setEraserPresetId] = createSignal<string | null>(null);

  const [selectedLayerId, setSelectedLayerId] = createSignal<string | null>(null);
  const [selection, setSelection] = createSignal<SelectionState | null>(null);
  const [selectionEditMode, setSelectionEditMode] = createSignal(false);
  const [selectionConstraintMode, setSelectionConstraintMode] = createSignal<"normal" | "ratio" | "size">("normal");
  const [selectionRatioW, setSelectionRatioW] = createSignal(1);
  const [selectionRatioH, setSelectionRatioH] = createSignal(1);
  const [selectionSizeW, setSelectionSizeW] = createSignal(100);
  const [selectionSizeH, setSelectionSizeH] = createSignal(100);
  const [showResizeDialog, setShowResizeDialog] = createSignal(false);
  const [showExportDialog, setShowExportDialog] = createSignal(false);
  const [showPrintDialog, setShowPrintDialog] = createSignal(false);
  const [loadingMessage, setLoadingMessage] = createSignal<string | null>(null);
  const [renamingLayerId, setRenamingLayerId] = createSignal<string | null>(null);
  const [renameLayerName, setRenameLayerName] = createSignal("");
  const [chromeVisible, setChromeVisible] = createSignal(true);

  return {
    activeTool, setActiveTool,
    selectedLayerId, setSelectedLayerId,
    selection, setSelection,
    selectionEditMode, setSelectionEditMode,
    selectionConstraintMode, setSelectionConstraintMode,
    selectionRatioW, setSelectionRatioW,
    selectionRatioH, setSelectionRatioH,
    selectionSizeW, setSelectionSizeW,
    selectionSizeH, setSelectionSizeH,
    fgColor, setFgColor,
    bgColor, setBgColor,
    zoom, setZoom,
    pan, setPan,
    documents, setDocuments,
    activeDocumentId, setActiveDocumentId,
    layers, setLayers,
    activeLayerId, setActiveLayerId,
    hoveredLayerId, setHoveredLayerId,
    hoverHandle, setHoverHandle,
    docWidth, setDocWidth,
    docHeight, setDocHeight,
    viewportWidth, setViewportWidth,
    viewportHeight, setViewportHeight,
    moveAutoSelect, setMoveAutoSelect,
    moveSnapEnabled, setMoveSnapEnabled,
    showTransformControls, setShowTransformControls,
    cropInteractionMode, setCropInteractionMode,
    hoverPos, setHoverPos,
    layerTransformSession, setLayerTransformSession,
    brushSize, setBrushSize,
    brushHardness, setBrushHardness,
    brushOpacity, setBrushOpacity,
    eraserSize, setEraserSize,
    eraserHardness, setEraserHardness,
    eraserOpacity, setEraserOpacity,
    brushFlow, setBrushFlow,
    brushSmoothing, setBrushSmoothing,
    eraserFlow, setEraserFlow,
    eraserSmoothing, setEraserSmoothing,
    brushPresetId, setBrushPresetId,
    eraserPresetId, setEraserPresetId,
    showResizeDialog, setShowResizeDialog,
    showExportDialog, setShowExportDialog,
    showPrintDialog, setShowPrintDialog,
    loadingMessage, setLoadingMessage,
    renamingLayerId, setRenamingLayerId,
    renameLayerName, setRenameLayerName,
    chromeVisible, setChromeVisible,
  };
}
