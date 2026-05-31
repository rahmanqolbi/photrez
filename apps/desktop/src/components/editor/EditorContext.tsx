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

  // Derived / Sync signals
  documents: Accessor<DocumentTabSummary[]>;
  activeDocumentId: Accessor<string | null>;
  layers: Accessor<LayerNode[]>;
  activeLayerId: Accessor<string | null>;
  hoveredLayerId: Accessor<string | null>;
  setHoveredLayerId: Setter<string | null>;
  docWidth: Accessor<number>;
  docHeight: Accessor<number>;
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
  const [docWidth, setDocWidth] = createSignal(800);
  const [docHeight, setDocHeight] = createSignal(600);

  // Synchronization logic
  const syncState = () => {
    batch(() => {
      setDocuments(props.workspace.getTabSummaries());
      const activeId = props.workspace.getActiveDocumentId();
      setActiveDocumentId(activeId);

      const engine = props.workspace.getActiveEngine();
      if (engine) {
        setLayers([...engine.getLayers()]);
        setActiveLayerId(engine.getActiveLayerId());
        setZoom(engine.getViewport().zoom);
        setPan({ x: engine.getViewport().panX, y: engine.getViewport().panY });
        setDocWidth(engine.getWidth());
        setDocHeight(engine.getHeight());
      } else {
        setLayers([]);
        setActiveLayerId(null);
        setZoom(1.0);
        setPan({ x: 0, y: 0 });
      }
    });
  };

  props.workspace.onChange(syncState);

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
    documents,
    activeDocumentId,
    layers,
    activeLayerId,
    hoveredLayerId,
    setHoveredLayerId,
    docWidth,
    docHeight
  };

  return (
    <EditorContext.Provider value={value}>
      {props.children}
    </EditorContext.Provider>
  );
}
