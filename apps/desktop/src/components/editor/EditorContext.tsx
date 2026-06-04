import { createContext, useContext, createSignal, onMount, Accessor, Setter, batch } from "solid-js";
import { WorkspaceManager, DocumentSession } from "@/engine/workspace";
import { WebGL2Backend } from "@/renderer/webgl2";
import { RenderScheduler } from "@/renderer/scheduler";
import { LayerNode, DocumentTabSummary } from "@/engine/types";
import { showOpenImageDialog, readFileBytes } from "@/tauri/native";
import fjord from "@/assets/fjord.jpg";

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
  commitCropState: (rect: { x: number; y: number; w: number; h: number }, rotation: number) => void;
  canCropUndo: Accessor<boolean>;
  canCropRedo: Accessor<boolean>;
  undoLastCrop: () => { rect: { x: number; y: number; w: number; h: number }; rotation: number } | null;
  redoCrop: () => { rect: { x: number; y: number; w: number; h: number }; rotation: number } | null;

  // Rotate cursor hover position (screen-space)
  hoverPos: Accessor<{ x: number; y: number } | null>;
  setHoverPos: Setter<{ x: number; y: number } | null>;
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

  const [cropRect, setCropRect] = createSignal<{ x: number; y: number; w: number; h: number } | null>(null);
  const [cropMode, setCropMode] = createSignal<"free" | "ratio" | "size">("free");
  const [cropGuideMode, setCropGuideMode] = createSignal<"none" | "thirds" | "grid" | "diagonal" | "golden">("thirds");
  const [cropDeletePixels, setCropDeletePixels] = createSignal<boolean>(true);
  const [cropAspect, setCropAspect] = createSignal<{ w: number; h: number } | null>(null);
  const [cropSizeTarget, setCropSizeTarget] = createSignal<{ w: number; h: number } | null>(null);
  const [cropSizeUnit, setCropSizeUnit] = createSignal<"px" | "cm" | "mm" | "in">("px");
  const [cropRotation, setCropRotation] = createSignal<number>(0);

  // Crop mini undo/redo stack (UI-only; not part of engine DocumentModel)
  const [cropUndoStack, setCropUndoStack] = createSignal<{ rect: { x: number; y: number; w: number; h: number }; rotation: number }[]>([]);
  const [cropRedoStack, setCropRedoStack] = createSignal<{ rect: { x: number; y: number; w: number; h: number }; rotation: number }[]>([]);
  const commitCropState = (rect: { x: number; y: number; w: number; h: number }, rotation: number) => {
    setCropUndoStack(prev => [...prev, { rect, rotation }]);
    setCropRedoStack([]);
  };
  const canCropUndo = () => cropUndoStack().length > 0;
  const canCropRedo = () => cropRedoStack().length > 0;
  const undoLastCrop = () => {
    const stack = cropUndoStack();
    if (stack.length === 0) return null;
    const entry = stack[stack.length - 1];
    setCropUndoStack(prev => prev.slice(0, -1));
    setCropRedoStack(prev => [
      ...prev,
      { rect: cropRect()!, rotation: cropRotation() }
    ]);
    return entry;
  };
  const redoCrop = () => {
    const stack = cropRedoStack();
    if (stack.length === 0) return null;
    const entry = stack[stack.length - 1];
    setCropRedoStack(prev => prev.slice(0, -1));
    setCropUndoStack(prev => [
      ...prev,
      { rect: cropRect()!, rotation: cropRotation() }
    ]);
    return entry;
  };

  const [hoverPos, setHoverPos] = createSignal<{ x: number; y: number } | null>(null);

  // Synchronization logic
  const syncState = () => {
    console.log("[EditorContext] syncState called");
    batch(() => {
      setDocuments(props.workspace.getTabSummaries());
      const activeId = props.workspace.getActiveDocumentId();
      setActiveDocumentId(activeId);

      const engine = props.workspace.getActiveEngine();
      if (engine) {
        const layerNames = engine.getLayers().map(l => l.name);
        console.log("[EditorContext] setting layers:", layerNames);
        setLayers(engine.getLayers().map(l => ({ ...l, transform: { ...l.transform } })));
        setActiveLayerId(engine.getActiveLayerId());
        setDocWidth(engine.getWidth());
        setDocHeight(engine.getHeight());
      } else {
        console.log("[EditorContext] no engine, setting empty layers");
        setLayers([]);
        setActiveLayerId(null);
      }
    });
  };

  const syncViewport = () => {
    const engine = props.workspace.getActiveEngine();
    if (engine) {
      const vp = engine.getViewport();
      setZoom(vp.zoom);
      setPan({ x: vp.panX, y: vp.panY });
    }
  };

  props.workspace.onChange(() => {
    syncState();
    syncViewport();
  });
  props.workspace.onVisualChange(() => {
    props.scheduler.requestRender();
  });

  const openImage = async () => {
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
          if (props.workspace.isFull()) break;
          try {
            const bitmap = await createImageBitmap(file);
            const id = `doc-${crypto.randomUUID()}`;
            const session = WorkspaceManager.createDocumentFromImage(id, file.name, bitmap);
            
            props.workspace.addDocument(session);

            const bgLayerId = session.engine.getLayers()[0].id;
            props.renderer.uploadImage(bgLayerId, bitmap);
            props.scheduler.requestRender();
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
        if (props.workspace.isFull()) break;

        const bytes = await readFileBytes(path);
        const blob = new Blob([bytes as any]);
        const bitmap = await createImageBitmap(blob);

        const id = `doc-${crypto.randomUUID()}`;
        const name = path.split(/[/\\]/).pop() || "Image";
        const session = WorkspaceManager.createDocumentFromImage(id, name, bitmap);
        
        props.workspace.addDocument(session);

        const bgLayerId = session.engine.getLayers()[0].id;
        props.renderer.uploadImage(bgLayerId, bitmap);
        props.scheduler.requestRender();
      }
    } catch (e) {
      console.error("Failed to open image:", e);
    }
  };

  // Bootstrap mock files at launch
  onMount(() => {
    try {
      // 1. Create document sessions (Disabled for empty state testing)
      /*
      const doc1 = WorkspaceManager.createBlankDocument("portrait-retouch", "Portrait Retouch", 1200, 1600);
      const doc2 = WorkspaceManager.createBlankDocument("brand-poster", "Brand Poster", 1080, 1080);
      const doc3 = WorkspaceManager.createBlankDocument("fjord-edit", "Norway Fjord Edit", 1920, 1280);
      const doc4 = WorkspaceManager.createBlankDocument("landing-page", "Landing Page Mockup", 1440, 2560);

      // Add documents
      props.workspace.addDocument(doc1);
      props.workspace.addDocument(doc2);
      props.workspace.addDocument(doc3); // Norway Fjord Edit becomes active
      props.workspace.addDocument(doc4);

      // Focus Norway Fjord Edit as active document
      props.workspace.switchDocument("fjord-edit");

      const fjordEngine = doc3.engine;
      // Overwrite the background layer with layers matching the mockup
      // 6 layers: "Color Adjust 1", "Mountain", "Village", "Water Reflection", "Sky", "Background"
      fjordEngine.deleteLayer(fjordEngine.getLayers()[0].id); // Delete blank background
      
      const l1 = fjordEngine.addLayer("Color Adjust 1");
      l1.type = "adjustment";
      const l2 = fjordEngine.addLayer("Mountain");
      const l3 = fjordEngine.addLayer("Village");
      const l4 = fjordEngine.addLayer("Water Reflection");
      const l5 = fjordEngine.addLayer("Sky");
      const l6 = fjordEngine.addLayer("Background");
      
      l6.locked = true; // Lock background

      // Decode and upload fjord image to Background layer
      const img = new Image();
      img.src = fjord;
      img.onload = async () => {
        try {
          const bitmap = await createImageBitmap(img);
          fjordEngine.setLayerImageBitmap(l6.id, bitmap);
          props.renderer.uploadImage(l6.id, bitmap);
          props.scheduler.requestRender();
        } catch (e) {
          console.error("Failed to decode fjord ImageBitmap at bootstrap:", e);
        }
      };
      */

      syncState();
    } catch (e) {
      console.error("Workspace bootstrap failed:", e);
    }
  });

  const value: EditorContextValue = {
    workspace: props.workspace,
    renderer: props.renderer,
    scheduler: props.scheduler,
    openImage,
    activeTool,
    setActiveTool,
    fgColor,
    setFgColor,
    bgColor,
    setBgColor,
    zoom,
    setZoom,
    pan,
    setPan,
    syncViewport,
    documents,
    activeDocumentId,
    layers,
    activeLayerId,
    hoveredLayerId,
    setHoveredLayerId,
    hoverHandle,
    setHoverHandle,
    docWidth,
    docHeight,
    viewportWidth,
    setViewportWidth,
    viewportHeight,
    setViewportHeight,
    moveAutoSelect,
    setMoveAutoSelect,
    moveSnapEnabled,
    setMoveSnapEnabled,
    cropRect,
    setCropRect,
    cropMode,
    setCropMode,
    cropGuideMode,
    setCropGuideMode,
    cropDeletePixels,
    setCropDeletePixels,
    cropAspect,
    setCropAspect,
    cropSizeTarget,
    setCropSizeTarget,
    cropSizeUnit,
    setCropSizeUnit,
    cropRotation,
    setCropRotation,
    commitCropState,
    canCropUndo,
    canCropRedo,
    undoLastCrop,
    redoCrop,
    hoverPos,
    setHoverPos
  };

  return (
    <EditorContext.Provider value={value}>
      {props.children}
    </EditorContext.Provider>
  );
}
