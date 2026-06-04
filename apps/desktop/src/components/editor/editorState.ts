import { createSignal } from "solid-js";
import type { LayerNode, DocumentTabSummary } from "@/engine/types";

export function createEditorState() {
  const [activeTool, setActiveTool] = createSignal("move");
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
  const [hoverPos, setHoverPos] = createSignal<{ x: number; y: number } | null>(null);

  return {
    activeTool, setActiveTool,
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
    hoverPos, setHoverPos,
  };
}
