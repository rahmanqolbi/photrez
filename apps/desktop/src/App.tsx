import { createSignal, createEffect, onMount, onCleanup, For, Show, Switch, Match } from "solid-js";
import { invoke } from "@tauri-apps/api/core";
import {
  PenTool, Move, Brush, Eraser, Type, Crop,
  ZoomIn, ZoomOut, Settings,
  ChevronDown, ChevronRight, ChevronUp, Share, Plus,
  Eye, EyeOff, Lock, LockOpen, Trash2,
  SlidersHorizontal, Layers, Clock, SquareMousePointer,
  FlipHorizontal, FlipVertical,
} from "lucide-solid";

export default function App() {
  // Safe Tauri Window access
  let appWindow: any;
  onMount(async () => {
    try {
      const { getCurrentWindow } = await import("@tauri-apps/api/window");
      appWindow = getCurrentWindow();
    } catch (e) {
      console.warn("Running outside of Tauri context");
    }
  });
  const [activeTool, setActiveTool] = createSignal("pen");
  const [activeTab, setActiveTab] = createSignal("layers");
  const [zoom, setZoom] = createSignal(100);
  const [fileMenuOpen, setFileMenuOpen] = createSignal(false);
  const [ramUsage, setRamUsage] = createSignal(112);
  const [mousePos, setMousePos] = createSignal({ x: 0, y: 0 });
  const [fgColor, setFgColor] = createSignal("#E15A17"); // Photon Amber
  const [bgColor, setBgColor] = createSignal("#FFFFFF"); // Default White
  const [showExportModal, setShowExportModal] = createSignal(false);
  const [exportFormat, setExportFormat] = createSignal("PNG");
  const [exportQuality, setExportQuality] = createSignal(85);
  const [exportStatusText, setExportStatusText] = createSignal("");

  const [layers, setLayers] = createSignal<any[]>([]);
  const [docWidth, setDocWidth] = createSignal(800);
  const [docHeight, setDocHeight] = createSignal(600);
  const [selection, setSelection] = createSignal<any>(null);
  const [selectedLayerId, setSelectedLayerId] = createSignal<string | null>(null);
  const [transformOpen, setTransformOpen] = createSignal(true);

  // ── Viewport State ──
  const [pan, setPan] = createSignal({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = createSignal(false);
  const [panStart, setPanStart] = createSignal({ x: 0, y: 0 });
  const [panStartOffset, setPanStartOffset] = createSignal({ x: 0, y: 0 });
  const [isSpaceDown, setIsSpaceDown] = createSignal(false);

  // ── Transform Drag State ──
  const [transformDragging, setTransformDragging] = createSignal(false);
  const [transformDragType, setTransformDragType] = createSignal<string | null>(null);
  const [transformDragStart, setTransformDragStart] = createSignal({ x: 0, y: 0 });
  const [transformDragOriginal, setTransformDragOriginal] = createSignal({
    x: 0, y: 0, width: 0, height: 0,
    scaleX: 1, scaleY: 1, rotation: 0, flipH: false, flipV: false
  });
  const [opacityOpen, setOpacityOpen] = createSignal(true);
  
  // ── Selection & Canvas Interaction State ──
  const [isSelecting, setIsSelecting] = createSignal(false);
  const [selStart, setSelStart] = createSignal({ x: 0, y: 0 });
  const [selEnd, setSelEnd] = createSignal({ x: 0, y: 0 });
  const selectionOverlay = () => {
    if (!isSelecting()) return null;
    const s = selStart(), e = selEnd();
    const w = Math.abs(e.x - s.x), h = Math.abs(e.y - s.y);
    if (w < 2 && h < 2) return null;
    return { x: Math.min(s.x, e.x), y: Math.min(s.y, e.y), w, h };
  };
  const [isDraggingCrop, setIsDraggingCrop] = createSignal(false);
  const [cropStart, setCropStart] = createSignal({ x: 0, y: 0 });
  const [cropEnd, setCropEnd] = createSignal({ x: 0, y: 0 });
  const cropOverlay = () => {
    if (!isDraggingCrop() && cropStart().x === cropEnd().x) return null;
    const s = cropStart(), e = cropEnd();
    const w = Math.abs(e.x - s.x), h = Math.abs(e.y - s.y);
    if (w < 5 && h < 5) return null;
    return { x: Math.min(s.x, e.x), y: Math.min(s.y, e.y), w, h };
  };
  const [isDraggingLayer, setIsDraggingLayer] = createSignal(false);
  const [layerDragOffset, setLayerDragOffset] = createSignal({ x: 0, y: 0 });
  let artboardRef: HTMLDivElement | undefined;

  const getArtboardCoords = (clientX: number, clientY: number) => {
    const el = artboardRef;
    if (!el) return { x: 0, y: 0 };
    const rect = el.getBoundingClientRect();
    const z = zoom() / 100;
    return { x: (clientX - rect.left) / z, y: (clientY - rect.top) / z };
  };

  const handleSampleColor = (cx: number, cy: number) => {
    invoke("sample_pixel", { x: cx, y: cy })
      .then((res: any) => {
        if (res && res.ok) {
          const [r, g, b, _a] = res.data;
          const hex = "#" + [r, g, b].map(x => x.toString(16).padStart(2, "0")).join("").toUpperCase();
          setFgColor(hex);
        }
      })
      .catch(console.error);
  };

  const handleExport = () => {
    setExportStatusText("Preparing export...");
    invoke("export_document", {
      format: exportFormat(),
      quality: exportQuality(),
    })
    .then((res: any) => {
      if (res?.ok) {
        setExportStatusText(`Exported successfully to: ${res.data.path}`);
        setTimeout(() => { setShowExportModal(false); setExportStatusText(""); }, 3000);
      }
    })
    .catch((err: any) => {
      setExportStatusText(err?.error?.message || "Export failed");
    });
  };

  const handleOpenFile = async () => {
    try {
      const { open } = await import("@tauri-apps/plugin-dialog");
      const selected = await open({
        multiple: false,
        filters: [{
          name: "Images",
          extensions: ["png", "jpg", "jpeg", "webp", "bmp", "gif"]
        }]
      });

      if (selected) {
        const path = typeof selected === "string" ? selected : selected;
        const result = await invoke("open_image", { path }) as any;
        if (result?.ok) {
          syncDocumentState();
        }
      }
    } catch (err) {
      console.error("Failed to open file:", err);
    }
  };

  const handleArtboardMouseDown = (e: MouseEvent) => {
    if (e.button !== 0) return;

    if (isSpaceDown()) {
      setIsPanning(true);
      setPanStart({ x: e.clientX, y: e.clientY });
      setPanStartOffset({ x: pan().x, y: pan().y });
      return;
    }

    const coords = getArtboardCoords(e.clientX, e.clientY);

    if (activeTool() === "eyedropper") {
      handleSampleColor(coords.x, coords.y);
    } else if (activeTool() === "move" && selectedLayerId()) {
      const layer = layers().find(l => l.id === selectedLayerId());
      if (layer) {
        setIsDraggingLayer(true);
        setLayerDragOffset({ x: coords.x - layer.x, y: coords.y - layer.y });
      }
    } else if (activeTool() === "selection") {
      setIsSelecting(true);
      setSelStart({ x: coords.x, y: coords.y });
      setSelEnd({ x: coords.x, y: coords.y });
    } else if (activeTool() === "crop") {
      setIsDraggingCrop(true);
      setCropStart({ x: coords.x, y: coords.y });
      setCropEnd({ x: coords.x, y: coords.y });
    } else if ((activeTool() === "brush" || activeTool() === "eraser") && selectedLayerId()) {
      const layer = layers().find(l => l.id === selectedLayerId());
      if (layer && !layer.locked && layer.visible) {
        setIsDrawingStroke(true);
        const lx = coords.x - layer.x;
        const ly = coords.y - layer.y;
        setStrokePoints([{ x: lx, y: ly }]);

        const canvas = strokeCanvasRef;
        if (canvas) {
          const ctx = canvas.getContext("2d");
          ctx?.clearRect(0, 0, canvas.width, canvas.height);
          ctx?.beginPath();
          ctx?.moveTo(coords.x, coords.y);
        }
      }
    }
  };

  const handleArtboardMouseMove = (e: MouseEvent) => {
    if (isPanning()) {
      const dx = e.clientX - panStart().x;
      const dy = e.clientY - panStart().y;
      setPan({
        x: panStartOffset().x + dx,
        y: panStartOffset().y + dy
      });
      return;
    }

    const coords = getArtboardCoords(e.clientX, e.clientY);
    setCanvasHoverPos({ x: coords.x, y: coords.y });

    if (activeTool() === "eyedropper" && e.buttons === 1) {
      handleSampleColor(coords.x, coords.y);
    } else if (isDraggingLayer() && selectedLayerId()) {
      const layer = layers().find(l => l.id === selectedLayerId());
      if (layer) {
        const newX = coords.x - layerDragOffset().x;
        const newY = coords.y - layerDragOffset().y;
        invoke("move_layer", { id: selectedLayerId(), x: newX, y: newY })
          .then((res: any) => { if (res?.ok) syncDocumentState(); })
          .catch(console.error);
      }
    } else if (isSelecting()) {
      setSelEnd({ x: coords.x, y: coords.y });
    } else if (isDraggingCrop()) {
      setCropEnd({ x: coords.x, y: coords.y });
    } else if (isDrawingStroke() && selectedLayerId()) {
      const layer = layers().find(l => l.id === selectedLayerId());
      if (layer) {
        const lx = coords.x - layer.x;
        const ly = coords.y - layer.y;
        setStrokePoints(pts => [...pts, { x: lx, y: ly }]);
        drawStrokeSegment(coords.x, coords.y);
      }
    }

    // Transform handle drag
    if (transformDragging() && transformDragType() && selectedLayerId()) {
      const current = getArtboardCoords(e.clientX, e.clientY);
      const start = transformDragStart();
      const orig = transformDragOriginal();
      const dx = current.x - start.x;
      const dy = current.y - start.y;
      const handle = transformDragType();
      
      if (handle === "rotate") {
        const centerX = orig.x + orig.width / 2;
        const centerY = orig.y + orig.height / 2;
        const angle = Math.atan2(current.y - centerY, current.x - centerX) * (180 / Math.PI);
        let newRotation = (angle + 90) % 360;
        
        // Snap to 15-degree increments if Shift held
        if (e.shiftKey) {
          newRotation = Math.round(newRotation / 15) * 15;
        }
        
        invoke("transform_layer", {
          id: selectedLayerId(),
          scaleX: orig.scaleX,
          scaleY: orig.scaleY,
          rotation: newRotation,
          flipH: orig.flipH,
          flipV: orig.flipV
        }).then((res: any) => {
          if (res?.ok) syncDocumentState();
        }).catch(console.error);
      } else {
        let newX = orig.x;
        let newY = orig.y;
        let newW = orig.width;
        let newH = orig.height;
        
        if (handle === "se") {
          newW = Math.max(10, orig.width + dx);
          newH = Math.max(10, orig.height + dy);
        } else if (handle === "sw") {
          newW = Math.max(10, orig.width - dx);
          newH = Math.max(10, orig.height + dy);
          newX = orig.x + (orig.width - newW);
        } else if (handle === "ne") {
          newW = Math.max(10, orig.width + dx);
          newH = Math.max(10, orig.height - dy);
          newY = orig.y + (orig.height - newH);
        } else if (handle === "nw") {
          newW = Math.max(10, orig.width - dx);
          newH = Math.max(10, orig.height - dy);
          newX = orig.x + (orig.width - newW);
          newY = orig.y + (orig.height - newH);
        } else if (handle === "n") {
          newH = Math.max(10, orig.height - dy);
          newY = orig.y + (orig.height - newH);
        } else if (handle === "s") {
          newH = Math.max(10, orig.height + dy);
        } else if (handle === "e") {
          newW = Math.max(10, orig.width + dx);
        } else if (handle === "w") {
          newW = Math.max(10, orig.width - dx);
          newX = orig.x + (orig.width - newW);
        }
        
        const scaleX = newW / orig.width;
        const scaleY = newH / orig.height;
        
        invoke("transform_layer", {
          id: selectedLayerId(),
          scaleX,
          scaleY,
          rotation: orig.rotation,
          flipH: orig.flipH,
          flipV: orig.flipV
        }).then((res: any) => {
          if (res?.ok) syncDocumentState();
        }).catch(console.error);
      }
    }
  };

  const handleArtboardMouseUp = (_e: MouseEvent) => {
    if (isPanning()) {
      setIsPanning(false);
      return;
    }

    if (isSelecting()) {
      const overlay = selectionOverlay();
      if (overlay && overlay.w > 5 && overlay.h > 5) {
        invoke("create_selection", { x: overlay.x, y: overlay.y, width: overlay.w, height: overlay.h })
          .then((res: any) => { if (res?.ok) syncDocumentState(); })
          .catch(console.error);
      } else {
        invoke("clear_selection").catch(console.error);
      }
      setIsSelecting(false);
    } else if (isDraggingCrop()) {
      setIsDraggingCrop(false);
    } else if (isDrawingStroke() && selectedLayerId()) {
      setIsDrawingStroke(false);
      
      const pts = strokePoints();
      if (pts.length > 0) {
        const hex = fgColor();
        const r = parseInt(hex.slice(1, 3), 16) / 255.0;
        const g = parseInt(hex.slice(3, 5), 16) / 255.0;
        const b = parseInt(hex.slice(5, 7), 16) / 255.0;
        
        const path_args = pts.map(p => [p.x, p.y]);
        
        invoke("draw_brush_stroke", {
          layerId: selectedLayerId(),
          path: path_args,
          size: strokeWidth(),
          hardness: brushHardness(),
          color: [r, g, b, brushOpacity()],
          isEraser: activeTool() === "eraser",
        })
        .then((res: any) => { if (res?.ok) syncDocumentState(); })
        .catch(console.error)
        .finally(() => {
          const canvas = strokeCanvasRef;
          const ctx = canvas?.getContext("2d");
          ctx?.clearRect(0, 0, canvas?.width || 0, canvas?.height || 0);
        });
      }
    }

    // End transform handle drag
    if (transformDragging()) {
      setTransformDragging(false);
      setTransformDragType(null);
    }

    setIsDraggingLayer(false);
  };


  const handleNudgeLayer = (dx: number, dy: number) => {
    if (!selectedLayerId()) return;
    const layer = layers().find(l => l.id === selectedLayerId());
    if (!layer) return;
    invoke("move_layer", { id: selectedLayerId(), x: layer.x + dx, y: layer.y + dy })
      .then((res: any) => { if (res?.ok) syncDocumentState(); })
      .catch(console.error);
  };

  const handleTransformHandleMouseDown = (e: MouseEvent, handleName: string) => {
    e.stopPropagation();
    if (!selectedLayerId()) return;
    
    const layer = layers().find(l => l.id === selectedLayerId());
    if (!layer) return;
    
    const coords = getArtboardCoords(e.clientX, e.clientY);
    
    setTransformDragging(true);
    setTransformDragType(handleName);
    setTransformDragStart(coords);
    setTransformDragOriginal({
      x: layer.x,
      y: layer.y,
      width: layer.width,
      height: layer.height,
      scaleX: layer.transform?.scale_x ?? 1,
      scaleY: layer.transform?.scale_y ?? 1,
      rotation: layer.transform?.rotation ?? 0,
      flipH: layer.transform?.flip_h ?? false,
      flipV: layer.transform?.flip_v ?? false
    });
  };

  const [strokeWidth, setStrokeWidth] = createSignal(2.5);
  const [strokeStyle, setStrokeStyle] = createSignal("solid");
  const [brushHardness, setBrushHardness] = createSignal(0.8);
  const [brushOpacity, setBrushOpacity] = createSignal(1.0);
  const [inspectorOpen, setInspectorOpen] = createSignal(true);

  const [strokePoints, setStrokePoints] = createSignal<{x: number, y: number}[]>([]);
  const [isDrawingStroke, setIsDrawingStroke] = createSignal(false);
  const [canvasHoverPos, setCanvasHoverPos] = createSignal({ x: -999, y: -999 });
  let strokeCanvasRef: HTMLCanvasElement | undefined;

  const drawStrokeSegment = (x: number, y: number) => {
    const canvas = strokeCanvasRef;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.strokeStyle = activeTool() === "eraser" ? "rgba(22,22,24,0.7)" : fgColor();
    ctx.lineWidth = strokeWidth();
    ctx.lineCap = "round";
    ctx.lineJoin = "round";

    ctx.lineTo(x, y);
    ctx.stroke();
  };


  const syncDocumentState = () => {
    invoke("get_document_state")
      .then((res: any) => {
        if (res && res.ok) {
          const doc = res.data;
          setLayers(doc.layers || []);
          setDocWidth(doc.width || 800);
          setDocHeight(doc.height || 600);
          setSelection(doc.selection || null);
          if (doc.layers && doc.layers.length > 0 && !selectedLayerId()) {
            setSelectedLayerId(doc.layers[0].id);
          }
        }
      })
      .catch((err) => console.error("Sync state err:", err));
  };

  const handleWheel = (e: WheelEvent) => {
    e.preventDefault();
    const el = artboardRef;
    if (!el) return;

    const rect = el.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    if (e.ctrlKey || e.metaKey) {
      const factor = e.deltaY < 0 ? 1.1 : 0.9;
      const oldZoom = zoom() / 100;
      const newZoom = Math.min(5, Math.max(0.1, oldZoom * factor));
      const zoomRatio = newZoom / oldZoom;

      setPan({
        x: mouseX - (mouseX - pan().x) * zoomRatio,
        y: mouseY - (mouseY - pan().y) * zoomRatio
      });
      setZoom(Math.round(newZoom * 100));
    } else {
      setPan({
        x: pan().x - e.deltaX,
        y: pan().y - e.deltaY
      });
    }
  };

  const fitToScreen = () => {
    const container = artboardRef?.parentElement?.parentElement;
    if (!container) return;

    const rect = container.getBoundingClientRect();
    const padding = 80;
    const docW = docWidth();
    const docH = docHeight();

    if (docW === 0 || docH === 0) return;

    const fitZoom = Math.min(
      (rect.width - padding) / docW,
      (rect.height - padding) / docH,
      1
    );

    setZoom(Math.round(fitZoom * 100));
    setPan({
      x: (rect.width - docW * fitZoom) / 2,
      y: (rect.height - docH * fitZoom) / 2
    });
  };

  onMount(() => {
    // Load initial document state
    syncDocumentState();

    // Call stable Tauri bridge ping command for confirmation
    invoke("ping")
      .then((res: any) => {
        console.log("Tauri Bridge Ping Res:", res);
      })
      .catch((err) => {
        console.error("Tauri Bridge Ping Err:", err);
      });

    // Register wheel event for zoom/pan
    const artboardEl = artboardRef;
    if (artboardEl) {
      artboardEl.addEventListener("wheel", handleWheel, { passive: false });
    }

    // Space key handlers for pan mode
    const handleKeyDownGlobal = (e: KeyboardEvent) => {
      if (e.code === "Space" && !e.repeat) {
        setIsSpaceDown(true);
      }
    };
    const handleKeyUpGlobal = (e: KeyboardEvent) => {
      if (e.code === "Space") {
        setIsSpaceDown(false);
        setIsPanning(false);
      }
    };
    window.addEventListener("keydown", handleKeyDownGlobal);
    window.addEventListener("keyup", handleKeyUpGlobal);

    // Custom keyboard shortcuts: Ctrl+Z and Ctrl+Y
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore shortcuts if focusing an input or textarea
      const target = e.target as HTMLElement;
      if (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable) {
        return;
      }

      const isMac = navigator.platform.toUpperCase().indexOf("MAC") >= 0;
      const isCmdOrCtrl = isMac ? e.metaKey : e.ctrlKey;
      
      if (isCmdOrCtrl && e.key.toLowerCase() === "z") {
        e.preventDefault();
        handleUndo();
      } else if (isCmdOrCtrl && e.key.toLowerCase() === "y") {
        e.preventDefault();
        handleRedo();
      } else if (e.key.toLowerCase() === "x") {
        e.preventDefault();
        const temp = fgColor();
        setFgColor(bgColor());
        setBgColor(temp);
      } else if (e.key.toLowerCase() === "d") {
        e.preventDefault();
        setFgColor("#E15A17");
        setBgColor("#FFFFFF");
      } else if (e.key.toLowerCase() === "v") {
        e.preventDefault();
        setActiveTool("move");
      } else if (e.key.toLowerCase() === "m") {
        e.preventDefault();
        setActiveTool("selection");
      } else if (e.key.toLowerCase() === "c") {
        e.preventDefault();
        setActiveTool("crop");
      } else if (e.key.toLowerCase() === "b") {
        e.preventDefault();
        setActiveTool("brush");
      } else if (e.key.toLowerCase() === "e") {
        e.preventDefault();
        setActiveTool("eraser");
      } else if (e.key.toLowerCase() === "i") {
        e.preventDefault();
        setActiveTool("eyedropper");
      } else if (isCmdOrCtrl && e.key.toLowerCase() === "a") {
        e.preventDefault();
        invoke("select_all")
          .then((res: any) => { if (res?.ok) syncDocumentState(); })
          .catch(console.error);
      } else if (isCmdOrCtrl && e.key === "0") {
        e.preventDefault();
        fitToScreen();
      } else if (isCmdOrCtrl && e.key.toLowerCase() === "o") {
        e.preventDefault();
        handleOpenFile();
      } else if (!isCmdOrCtrl && e.key.toLowerCase() === "escape") {
        e.preventDefault();
        invoke("clear_selection")
          .then((res: any) => { if (res?.ok) syncDocumentState(); })
          .catch(console.error);
        if (selectedLayerId()) {
          setSelectedLayerId(null);
          setTransformDragging(false);
          setTransformDragType(null);
        }
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        handleNudgeLayer(0, -(e.shiftKey ? 10 : 1));
      } else if (e.key === "ArrowDown") {
        e.preventDefault();
        handleNudgeLayer(0, e.shiftKey ? 10 : 1);
      } else if (e.key === "ArrowLeft") {
        e.preventDefault();
        handleNudgeLayer(-(e.shiftKey ? 10 : 1), 0);
      } else if (e.key === "ArrowRight") {
        e.preventDefault();
        handleNudgeLayer(e.shiftKey ? 10 : 1, 0);
      } else if ((e.ctrlKey || e.metaKey) && e.key === "g" && !e.shiftKey) {
        e.preventDefault();
        handleFlip("h");
      } else if ((e.ctrlKey || e.metaKey) && e.key === "g" && e.shiftKey) {
        e.preventDefault();
        handleFlip("v");
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("mousemove", handleArtboardMouseMove);
    window.addEventListener("mouseup", handleArtboardMouseUp);

    // Initial fit to screen
    requestAnimationFrame(() => {
      fitToScreen();
    });
  });

  onCleanup(() => {
    const artboardEl = artboardRef;
    if (artboardEl) {
      artboardEl.removeEventListener("wheel", handleWheel);
    }
    window.removeEventListener("mousemove", handleArtboardMouseMove);
    window.removeEventListener("mouseup", handleArtboardMouseUp);
  });

  createEffect(() => {
    layers();
    selectedLayerId();
    zoom();
    pan();
    invoke("trigger_render").catch(console.error);
  });



  const handleToolChange = (tool: string) => {
    setActiveTool(tool);
  };

  const handleAddLayer = () => {
    invoke("add_layer", { name: `Vector Layer ${layers().length + 1}` })
      .then((res: any) => {
        if (res && res.ok) {
          const doc = res.data;
          setLayers(doc.layers || []);
          if (doc.layers && doc.layers.length > 0) {
            setSelectedLayerId(doc.layers[0].id);
          }
          syncDocumentState();
        }
      })
      .catch((err) => console.error("Add layer err:", err));
  };

  const handleDeleteLayer = (id: string, e: Event) => {
    e.stopPropagation();
    invoke("delete_layer", { id })
      .then((res: any) => {
        if (res && res.ok) {
          const doc = res.data;
          setLayers(doc.layers || []);
          if (selectedLayerId() === id) {
            setSelectedLayerId(doc.layers && doc.layers.length > 0 ? doc.layers[0].id : null);
          }
          syncDocumentState();
        }
      })
      .catch((err) => console.error("Delete layer err:", err));
  };

  const handleToggleVisibility = (id: string, visible: boolean, e: Event) => {
    e.stopPropagation();
    invoke("update_layer", { id, visible: !visible })
      .then((res: any) => {
        if (res && res.ok) {
          syncDocumentState();
        }
      })
      .catch((err) => console.error("Visibility toggle err:", err));
  };

  const handleToggleLock = (id: string, locked: boolean, e: Event) => {
    e.stopPropagation();
    invoke("update_layer", { id, locked: !locked })
      .then((res: any) => {
        if (res && res.ok) {
          syncDocumentState();
        }
      })
      .catch((err) => console.error("Lock toggle err:", err));
  };

  const handleOpacityChange = (id: string, opacity: number) => {
    invoke("update_layer", { id, opacity })
      .then((res: any) => {
        if (res && res.ok) {
          syncDocumentState();
        }
      })
      .catch((err) => console.error("Opacity change err:", err));
  };

  const handleMoveLayer = (fromIdx: number, toIdx: number, e: Event) => {
    e.stopPropagation();
    invoke("reorder_layer", { fromIdx, toIdx })
      .then((res: any) => {
        if (res && res.ok) {
          syncDocumentState();
        }
      })
      .catch((err) => console.error("Reorder layer err:", err));
  };

  const getLayerCurrentTransform = (layer: any) => ({
    scaleX: layer.transform?.scale_x ?? 1,
    scaleY: layer.transform?.scale_y ?? 1,
    rotation: layer.transform?.rotation ?? 0,
    flipH: layer.transform?.flip_h ?? false,
    flipV: layer.transform?.flip_v ?? false
  });

  const handleTransformChange = (field: string, value: number) => {
    if (!selectedLayerId()) return;
    const layer = layers().find(l => l.id === selectedLayerId());
    if (!layer) return;
    
    const currentTransform = getLayerCurrentTransform(layer);
    let newTransform = { ...currentTransform };
    
    if (field === "width") {
      newTransform.scaleX = value / layer.width;
    } else if (field === "height") {
      newTransform.scaleY = value / layer.height;
    } else if (field === "rotation") {
      newTransform.rotation = value;
    }
    
    invoke("transform_layer", {
      id: selectedLayerId(),
      scaleX: newTransform.scaleX,
      scaleY: newTransform.scaleY,
      rotation: newTransform.rotation,
      flipH: newTransform.flipH,
      flipV: newTransform.flipV
    }).then((res: any) => {
      if (res?.ok) syncDocumentState();
    }).catch(console.error);
  };

  const handleFlip = (axis: "h" | "v") => {
    if (!selectedLayerId()) return;
    const layer = layers().find(l => l.id === selectedLayerId());
    if (!layer) return;
    
    const currentTransform = getLayerCurrentTransform(layer);
    const newTransform = { ...currentTransform };
    if (axis === "h") {
      newTransform.flipH = !newTransform.flipH;
    } else {
      newTransform.flipV = !newTransform.flipV;
    }
    
    invoke("transform_layer", {
      id: selectedLayerId(),
      scaleX: newTransform.scaleX,
      scaleY: newTransform.scaleY,
      rotation: newTransform.rotation,
      flipH: newTransform.flipH,
      flipV: newTransform.flipV
    }).then((res: any) => {
      if (res?.ok) syncDocumentState();
    }).catch(console.error);
  };

  const handleUndo = () => {
    invoke("undo")
      .then((res: any) => {
        if (res && res.ok) {
          syncDocumentState();
        }
      })
      .catch((err) => console.error("Undo err:", err));
  };

  const handleRedo = () => {
    invoke("redo")
      .then((res: any) => {
        if (res && res.ok) {
          syncDocumentState();
        }
      })
      .catch((err) => console.error("Redo err:", err));
  };

  const handleMinimize = () => {
    if (appWindow) appWindow.minimize().catch((err: any) => console.error("Minimize err:", err));
  };

  const handleMaximize = () => {
    if (appWindow) appWindow.toggleMaximize().catch((err: any) => console.error("Maximize err:", err));
  };

  const handleClose = () => {
    if (appWindow) appWindow.close().catch((err: any) => console.error("Close err:", err));
  };

  return (
    <div class="app grid grid-rows-[44px_40px_1fr_28px] h-screen overflow-hidden text-[13px] font-medium bg-studio-bg text-text-primary">
      
      {/* 1. TOP WINDOW HEADER & MENUBAR */}
      <header data-tauri-drag-region class="menubar flex items-center justify-between pl-3 pr-0 bg-studio-bg h-[44px] relative select-none">
        <div data-tauri-drag-region class="flex items-center h-full">
          {/* Logo */}
          <div class="flex items-center gap-2 mr-4 text-[13px] text-text-primary">
            <div class="w-5 h-5 bg-gradient-to-tr from-accent to-accent-hover rounded-md flex items-center justify-center text-[12px] font-black text-white">
              P
            </div>
            <span class="font-bold tracking-wide">Photrez</span>
          </div>
 
          {/* Windows Style Flat Menu Bar */}
          <nav class="flex items-center h-full text-text-primary" aria-label="Main menu">
            <div class="relative h-full flex items-center">
              <button 
                onClick={() => setFileMenuOpen(!fileMenuOpen())}
                class="px-3 h-full hover:bg-white/5 transition-colors duration-100 text-[13px] cursor-default"
              >
                File
              </button>
              {fileMenuOpen() && (
                <div class="absolute left-0 top-[36px] bg-studio-elevated border border-studio-border rounded-md shadow-lg py-1.5 w-60 z-50">
                  <a href="#" class="flex items-center justify-between px-4 py-1.5 hover:bg-accent hover:text-white text-text-primary text-[13px] no-underline">
                    <span>New Document...</span>
                    <span class="font-mono text-[11px] opacity-70">Ctrl+N</span>
                  </a>
                  <a href="#" onClick={(e) => { e.preventDefault(); handleOpenFile(); setFileMenuOpen(false); }} class="flex items-center justify-between px-4 py-1.5 hover:bg-accent hover:text-white text-text-primary text-[13px] no-underline">
                    <span>Open Image...</span>
                    <span class="font-mono text-[11px] opacity-70">Ctrl+O</span>
                  </a>
                  <div class="h-[1px] bg-studio-border my-1 mx-2.5"></div>
                  <a href="#" class="flex items-center justify-between px-4 py-1.5 hover:bg-accent hover:text-white text-text-primary text-[13px] no-underline">
                    <span>Export Graphic...</span>
                    <span class="font-mono text-[11px] opacity-70">Ctrl+E</span>
                  </a>
                </div>
              )}
            </div>
            <button class="px-3 h-full hover:bg-white/5 transition-colors duration-100 text-[13px] cursor-default">Edit</button>
            <button class="px-3 h-full hover:bg-white/5 transition-colors duration-100 text-[13px] cursor-default">View</button>
            <button class="px-3 h-full hover:bg-white/5 transition-colors duration-100 text-[13px] cursor-default">Window</button>
            <button class="px-3 h-full hover:bg-white/5 transition-colors duration-100 text-[13px] cursor-default">Help</button>
          </nav>
        </div>
 
        {/* Dynamic App Title */}
        <div class="absolute left-1/2 -translate-x-1/2 flex items-center gap-2 pointer-events-none">
          <span class="font-mono text-[11px] text-text-secondary tracking-tight">banner-client-v4.qanvas</span>
          <span class="w-1 h-1 rounded-full bg-text-secondary"></span>
          <span class="text-[11px] text-text-muted font-normal">Photrez Core v1.0</span>
        </div>
 
        {/* Windows Native Title Bar Controls */}
        <div class="flex items-center h-full text-text-secondary">
          <button 
            onClick={handleMinimize} 
            class="h-full w-[46px] flex items-center justify-center hover:bg-white/5 hover:text-white transition-colors" 
            title="Minimize"
          >
            <svg width="10" height="1" viewBox="0 0 10 1"><rect width="10" height="1" fill="currentColor"></rect></svg>
          </button>
          <button 
            onClick={handleMaximize} 
            class="h-full w-[46px] flex items-center justify-center hover:bg-white/5 hover:text-white transition-colors" 
            title="Maximize"
          >
            <svg width="10" height="10" viewBox="0 0 10 10"><rect x="1" y="1" width="8" height="8" fill="none" stroke="currentColor" stroke-width="1"></rect></svg>
          </button>
          <button 
            onClick={handleClose} 
            class="h-full w-[46px] flex items-center justify-center hover:bg-close hover:text-white transition-colors" 
            title="Close"
          >
            <svg width="10" height="10" viewBox="0 0 10 10"><path d="M1,1 L9,9 M9,1 L1,9" stroke="currentColor" stroke-width="1" stroke-linecap="round"></path></svg>
          </button>
        </div>
      </header>
 
      {/* 2. CONTEXTUAL TOOL OPTIONS BAR */}
      <section class="toolbar flex items-center justify-between px-4 bg-studio-bg border-b border-studio-border h-10 text-[13px] text-text-secondary select-none" aria-label="Tool options bar">
        <div class="flex items-center gap-4">
          {/* Active Tool Group */}
          <div class="flex items-center gap-2 pr-4 h-[26px]">
            <Show when={activeTool() === "crop"} fallback={
              <Switch>
                <Match when={activeTool() === "brush"}><Brush size={15} class="text-accent" /></Match>
                <Match when={activeTool() === "eraser"}><Eraser size={15} class="text-accent" /></Match>
                <Match when={activeTool() === "text"}><Type size={15} class="text-accent" /></Match>
                <Match when={activeTool() === "move"}><Move size={15} class="text-accent" /></Match>
                <Match when={activeTool() === "pen"}><PenTool size={15} class="text-accent" /></Match>
                <Match when={activeTool() === "eyedropper"}>
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="text-accent">
                    <path d="m2 22 1-1c1.5-1.5 1.5-4 .5-5.5L14 5l4 4-10.5 10.5c-1.5-1-4-1-5.5.5Z" />
                    <path d="M14 5 19 2l3 3-3 5-5-5Z" />
                  </svg>
                </Match>
              </Switch>
            }>
              <Crop size={15} class="text-accent animate-pulse" />
            </Show>
            <span class="font-bold text-text-primary text-[11px] uppercase tracking-wider select-none">{activeTool()} tool</span>
          </div>
          
          <Show when={activeTool() === "crop"} fallback={
            <Show when={activeTool() === "brush" || activeTool() === "eraser"} fallback={
              <>
                {/* Divider */}
                <div class="h-4 border-r border-studio-border self-center"></div>

                {/* Fill Color Option */}
                <div class="flex items-center gap-2">
                  <span class="text-text-muted text-[10px] font-bold uppercase select-none">Fill</span>
                  <button class="h-[26px] bg-studio-input border border-studio-border hover:bg-studio-elevated rounded-md px-2.5 flex items-center gap-1.5 cursor-default transition-colors duration-75">
                    <span class="w-2.5 h-2.5 rounded-[1px] bg-gradient-to-tr from-accent to-accent-hover border border-white/20 flex-shrink-0"></span>
                    <span class="text-[12px] font-semibold text-text-primary">Photon Amber</span>
                    <ChevronDown size={12} class="text-text-muted" />
                  </button>
                </div>

                {/* Divider */}
                <div class="h-4 border-r border-studio-border self-center"></div>

                {/* Stroke Option with Spinners */}
                <div class="flex items-center gap-2">
                  <div class="flex items-center bg-studio-input border border-studio-border rounded-md overflow-hidden h-[26px] focus-within:border-accent transition-colors duration-100">
                    <span class="text-[10px] font-bold text-text-muted px-2.5 select-none border-r border-studio-border/50 h-full flex items-center bg-white/[1%]">STROKE</span>
                    <input 
                      type="text" 
                      class="w-10 text-center text-[12px] font-semibold text-text-primary bg-transparent border-none outline-none tabular-nums px-1" 
                      value={strokeWidth().toFixed(1)} 
                      onInput={(e: any) => {
                        const val = parseFloat(e.currentTarget.value);
                        if (!isNaN(val)) setStrokeWidth(Math.max(0, val));
                      }}
                    />
                    <span class="text-[10px] font-bold text-text-muted select-none pr-1.5 pointer-events-none">px</span>
                    
                    {/* Micro-Spinner step triggers */}
                    <div class="w-4 h-full flex flex-col divide-y divide-studio-border border-l border-studio-border">
                      <button 
                        onClick={() => setStrokeWidth(w => w + 0.5)}
                        class="flex-1 flex items-center justify-center hover:bg-white/10 hover:text-white transition-colors cursor-default text-[7px]"
                        title="Increase Stroke"
                      >
                        ▲
                      </button>
                      <button 
                        onClick={() => setStrokeWidth(w => Math.max(0, w - 0.5))}
                        class="flex-1 flex items-center justify-center hover:bg-white/10 hover:text-white transition-colors cursor-default text-[7px]"
                        title="Decrease Stroke"
                      >
                        ▼
                      </button>
                    </div>
                  </div>
                </div>

                {/* Divider */}
                <div class="h-4 border-r border-studio-border self-center"></div>

                {/* Stroke Style Option */}
                <div class="flex items-center gap-2">
                  <span class="text-text-muted text-[10px] font-bold uppercase select-none">Style</span>
                  <div class="bg-studio-input border border-studio-border rounded-md p-0.5 h-[26px] flex items-center gap-0.5 select-none">
                    <button 
                      onClick={() => setStrokeStyle("solid")}
                      class={`px-2 h-full flex items-center justify-center rounded cursor-default transition-all duration-75 ${
                        strokeStyle() === "solid"
                          ? "bg-studio-elevated text-accent border border-studio-border-strong shadow-sm"
                          : "text-text-muted hover:text-text-primary"
                      }`}
                      title="Solid Stroke"
                    >
                      <div class="w-4 h-[2px] bg-current"></div>
                    </button>
                    <button 
                      onClick={() => setStrokeStyle("dashed")}
                      class={`px-2 h-full flex items-center justify-center rounded cursor-default transition-all duration-75 ${
                        strokeStyle() === "dashed"
                          ? "bg-studio-elevated text-accent border border-studio-border-strong shadow-sm"
                          : "text-text-muted hover:text-text-primary"
                      }`}
                      title="Dashed Stroke"
                    >
                      <div class="w-4 h-[2px] border-b-2 border-dashed border-current"></div>
                    </button>
                    <button 
                      onClick={() => setStrokeStyle("dotted")}
                      class={`px-2 h-full flex items-center justify-center rounded cursor-default transition-all duration-75 ${
                        strokeStyle() === "dotted"
                          ? "bg-studio-elevated text-accent border border-studio-border-strong shadow-sm"
                          : "text-text-muted hover:text-text-primary"
                      }`}
                      title="Dotted Stroke"
                    >
                      <div class="w-4 h-[2px] border-b-2 border-dotted border-current"></div>
                    </button>
                  </div>
                </div>
              </>
            }>
              <>
                {/* Brush size option */}
                <div class="h-4 border-r border-studio-border self-center"></div>
                <div class="flex items-center gap-2">
                  <div class="flex items-center bg-studio-input border border-studio-border rounded-md overflow-hidden h-[26px] focus-within:border-accent">
                    <span class="text-[10px] font-bold text-text-muted px-2.5 select-none border-r border-studio-border/50 h-full flex items-center bg-white/[1%]">SIZE</span>
                    <input 
                      type="number"
                      class="w-10 text-center text-[12px] font-semibold text-text-primary bg-transparent border-none outline-none px-1"
                      value={strokeWidth()}
                      onInput={(e: any) => {
                        const val = parseFloat(e.currentTarget.value);
                        if (!isNaN(val)) setStrokeWidth(Math.max(1, val));
                      }}
                    />
                    <span class="text-[10px] font-bold text-text-muted select-none pr-1.5 pointer-events-none">px</span>
                  </div>
                </div>

                {/* Brush Hardness option */}
                <div class="h-4 border-r border-studio-border self-center"></div>
                <div class="flex items-center gap-2">
                  <div class="flex items-center bg-studio-input border border-studio-border rounded-md overflow-hidden h-[26px] focus-within:border-accent">
                    <span class="text-[10px] font-bold text-text-muted px-2.5 select-none border-r border-studio-border/50 h-full flex items-center bg-white/[1%]">HARDNESS</span>
                    <input 
                      type="number"
                      step="0.1" min="0" max="1"
                      class="w-10 text-center text-[12px] font-semibold text-text-primary bg-transparent border-none outline-none px-1"
                      value={brushHardness()}
                      onInput={(e: any) => setBrushHardness(Math.max(0.0, Math.min(1.0, parseFloat(e.currentTarget.value) || 0.8)))}
                    />
                  </div>
                </div>

                {/* Brush Opacity option */}
                <div class="h-4 border-r border-studio-border self-center"></div>
                <div class="flex items-center gap-2">
                  <div class="flex items-center bg-studio-input border border-studio-border rounded-md overflow-hidden h-[26px] focus-within:border-accent">
                    <span class="text-[10px] font-bold text-text-muted px-2.5 select-none border-r border-studio-border/50 h-full flex items-center bg-white/[1%]">OPACITY</span>
                    <input 
                      type="number"
                      step="0.1" min="0" max="1"
                      class="w-10 text-center text-[12px] font-semibold text-text-primary bg-transparent border-none outline-none px-1"
                      value={brushOpacity()}
                      onInput={(e: any) => setBrushOpacity(Math.max(0.0, Math.min(1.0, parseFloat(e.currentTarget.value) || 1.0)))}
                    />
                  </div>
                </div>
              </>
            </Show>
          }>
            {/* Crop tool dynamic options */}
            <>
              <div class="h-4 border-r border-studio-border self-center"></div>
              
              <button 
                onClick={() => {
                  const crop = cropOverlay();
                  if (crop) {
                    invoke("crop_canvas", { x: crop.x, y: crop.y, width: Math.round(crop.w), height: Math.round(crop.h) })
                      .then((res: any) => {
                        if (res?.ok) {
                          setCropStart({ x: 0, y: 0 });
                          setCropEnd({ x: 0, y: 0 });
                          syncDocumentState();
                          setActiveTool("move");
                        }
                      })
                      .catch(console.error);
                  }
                }}
                disabled={!cropOverlay()}
                class={`h-[26px] px-3 bg-yellow-600 hover:bg-yellow-500 active:bg-yellow-700 text-white font-bold rounded-md flex items-center gap-1.5 transition-colors cursor-default ${!cropOverlay() ? "opacity-40 cursor-not-allowed" : ""}`}
              >
                <span>APPLY CROP</span>
              </button>

              <button 
                onClick={() => {
                  setCropStart({ x: 0, y: 0 });
                  setCropEnd({ x: 0, y: 0 });
                  setActiveTool("move");
                }}
                class="h-[26px] px-3 bg-studio-input border border-studio-border hover:bg-studio-elevated text-text-secondary font-bold rounded-md flex items-center gap-1.5 transition-colors cursor-default"
              >
                <span>CANCEL</span>
              </button>

              <div class="h-4 border-r border-studio-border self-center"></div>

              {/* Quick Resize controls inside Crop view */}
              <div class="flex items-center gap-2">
                <span class="text-text-muted text-[10px] font-bold uppercase select-none">Canvas size</span>
                <div class="flex items-center bg-studio-input border border-studio-border rounded-md overflow-hidden h-[26px] focus-within:border-accent">
                  <span class="text-[10px] font-bold text-text-muted px-2 select-none border-r border-studio-border/50 h-full flex items-center bg-white/[1%]">W</span>
                  <input 
                    type="number"
                    class="w-14 text-center text-[12px] font-semibold text-text-primary bg-transparent border-none outline-none px-1"
                    value={docWidth()}
                    onChange={(e: any) => {
                      const val = parseInt(e.currentTarget.value);
                      if (!isNaN(val) && val > 0) {
                        invoke("resize_canvas", { width: val, height: docHeight() })
                          .then((res: any) => { if (res?.ok) syncDocumentState(); })
                          .catch(console.error);
                      }
                    }}
                  />
                  <span class="text-[10px] font-bold text-text-muted select-none border-l border-r border-studio-border/50 h-full flex items-center bg-white/[1%] px-2 ml-1">H</span>
                  <input 
                    type="number"
                    class="w-14 text-center text-[12px] font-semibold text-text-primary bg-transparent border-none outline-none px-1"
                    value={docHeight()}
                    onChange={(e: any) => {
                      const val = parseInt(e.currentTarget.value);
                      if (!isNaN(val) && val > 0) {
                        invoke("resize_canvas", { width: docWidth(), height: val })
                          .then((res: any) => { if (res?.ok) syncDocumentState(); })
                          .catch(console.error);
                      }
                    }}
                  />
                </div>
              </div>
            </>
          </Show>
        </div>
 
        {/* Right Action buttons */}
        <div class="flex items-center gap-3">
          {/* Transform Controls */}
          <Show when={(activeTool() === "move" || activeTool() === "selection") && selectedLayerId()}>
            <div class="flex items-center gap-1 ml-auto">
              <button
                class="tool-btn-raw px-2 py-1 text-[10px] text-text-secondary hover:text-text-primary hover:bg-white/5 rounded"
                title="Flip Horizontal"
                onClick={() => handleFlip("h")}
              >
                <FlipHorizontal size={14} />
              </button>
              <button
                class="tool-btn-raw px-2 py-1 text-[10px] text-text-secondary hover:text-text-primary hover:bg-white/5 rounded"
                title="Flip Vertical"
                onClick={() => handleFlip("v")}
              >
                <FlipVertical size={14} />
              </button>
            </div>
          </Show>

          {/* Inspector toggle with state representation */}
          <button 
            onClick={() => setInspectorOpen(!inspectorOpen())}
            class={`h-[26px] px-2.5 flex items-center gap-1.5 border rounded-md text-[11px] font-bold tracking-wider cursor-default transition-all duration-75 select-none ${
              inspectorOpen()
                ? "bg-studio-bg border-accent/40 text-accent shadow-[inset_0_1.5px_3px_rgba(0,0,0,0.5)]"
                : "bg-studio-input border-studio-border text-text-secondary hover:text-white hover:bg-studio-elevated"
            }`}
            title="Toggle Inspector Panel"
          >
            <SlidersHorizontal size={13} />
            <span>INSPECTOR</span>
          </button>
 
          {/* Export Action */}
          <div class="relative">
            <button 
              onClick={() => setShowExportModal(!showExportModal())}
              class={`h-[26px] px-3 flex items-center gap-1.5 text-[11px] font-bold tracking-wider rounded-md shadow-sm cursor-default transition-all duration-75 ${
                showExportModal() 
                  ? "bg-accent-active text-white border border-accent/40 shadow-[inset_0_1.5px_3px_rgba(0,0,0,0.5)]" 
                  : "bg-accent hover:bg-accent-hover active:bg-accent-active text-white"
              }`}
            >
              <Share size={13} />
              <span>EXPORT</span>
            </button>

            <Show when={showExportModal()}>
              <div class="absolute right-0 top-[30px] bg-studio-panel border border-studio-border rounded-lg shadow-lg p-4 w-72 z-[10005] flex flex-col gap-3">
                <span class="text-[11px] font-bold text-text-muted uppercase tracking-wider">Export Settings</span>
                
                {/* Format selectors */}
                <div class="flex items-center gap-2">
                  <span class="text-text-secondary text-[11px] w-14 font-semibold">Format</span>
                  <div class="bg-studio-input border border-studio-border rounded-md p-0.5 h-[26px] flex-1 flex gap-0.5">
                    <For each={["PNG", "JPEG", "WEBP"]}>
                      {(fmt) => (
                        <button
                          onClick={() => setExportFormat(fmt)}
                          class={`flex-1 text-center text-[10px] font-bold rounded cursor-default transition-all duration-75 ${
                            exportFormat() === fmt
                              ? "bg-studio-elevated text-accent border border-studio-border-strong shadow-sm"
                              : "text-text-muted hover:text-text-primary"
                          }`}
                        >
                          {fmt}
                        </button>
                      )}
                    </For>
                  </div>
                </div>

                {/* Quality selector (Only shown for JPEG/WEBP) */}
                <Show when={exportFormat() !== "PNG"}>
                  <div class="flex items-center gap-2">
                    <span class="text-text-secondary text-[11px] w-14 font-semibold">Quality</span>
                    <input 
                      type="range" 
                      min="1" max="100" 
                      class="flex-grow accent-accent"
                      value={exportQuality()}
                      onInput={(e: any) => setExportQuality(parseInt(e.currentTarget.value))}
                    />
                    <span class="text-[11px] font-mono w-8 text-right font-semibold text-white">{exportQuality()}%</span>
                  </div>
                </Show>

                <button 
                  onClick={handleExport}
                  class="bg-accent hover:bg-accent-hover text-white text-[11px] font-bold tracking-wider py-1.5 rounded-md mt-1 transition-colors cursor-default text-center"
                >
                  CONFIRM & EXPORT
                </button>

                <Show when={exportStatusText() !== ""}>
                  <div class="text-[10px] text-accent font-semibold text-center select-none truncate">
                    {exportStatusText()}
                  </div>
                </Show>
              </div>
            </Show>
          </div>
        </div>
      </section>

      {/* 3. WORKSPACE */}
      <div class={`workspace grid ${inspectorOpen() ? "grid-cols-[48px_1fr_320px]" : "grid-cols-[48px_1fr]"} min-h-0 h-full overflow-hidden bg-studio-bg p-1.5 gap-1.5`}>
        
        {/* 3.1 LEFT TOOL RAIL (RAW PRO) */}
        <aside class="tool-rail bg-studio-panel border border-studio-border rounded-[8px] flex flex-col items-center justify-between z-10 relative h-full shadow-pro w-[48px] overflow-hidden">
          <div class="tool-rail-raw w-full">
            {/* Nav Group */}
            <button 
              onClick={() => handleToolChange("move")}
              class={`tool-btn-raw ${activeTool() === "move" ? "active" : ""}`} 
              title="Move Tool (V)"
            >
              <Move size={18} />
            </button>

            <button 
              onClick={() => handleToolChange("selection")}
              class={`tool-btn-raw ${activeTool() === "selection" ? "active" : ""}`} 
              title="Selection Tool (M)"
            >
              <SquareMousePointer size={18} />
            </button>

            <div class="tool-divider"></div>

            <button 
              onClick={() => handleToolChange("pen")}
              class={`tool-btn-raw sub-hint ${activeTool() === "pen" ? "active" : ""}`} 
              title="Pen Tool (P)"
            >
              <PenTool size={18} />
            </button>

            <button 
              onClick={() => handleToolChange("brush")}
              class={`tool-btn-raw sub-hint ${activeTool() === "brush" ? "active" : ""}`} 
              title="Brush Tool (B)"
            >
              <Brush size={18} />
            </button>

            <button 
              onClick={() => handleToolChange("eraser")}
              class={`tool-btn-raw ${activeTool() === "eraser" ? "active" : ""}`} 
              title="Eraser Tool (E)"
            >
              <Eraser size={18} />
            </button>

            <button 
              onClick={() => handleToolChange("eyedropper")}
              class={`tool-btn-raw ${activeTool() === "eyedropper" ? "active" : ""}`} 
              title="Eyedropper Tool (I)"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="m2 22 1-1c1.5-1.5 1.5-4 .5-5.5L14 5l4 4-10.5 10.5c-1.5-1-4-1-5.5.5Z" />
                <path d="M14 5 19 2l3 3-3 5-5-5Z" />
              </svg>
            </button>

            <div class="tool-divider"></div>

            <button 
              onClick={() => handleToolChange("text")}
              class={`tool-btn-raw sub-hint ${activeTool() === "text" ? "active" : ""}`} 
              title="Text Tool (T)"
            >
              <Type size={18} />
            </button>

            <button 
              onClick={() => handleToolChange("crop")}
              class={`tool-btn-raw ${activeTool() === "crop" ? "active" : ""}`} 
              title="Crop Tool (C)"
            >
              <Crop size={18} />
            </button>
          </div>

          <div class="flex flex-col gap-3 w-full items-center pb-4">
            {/* Professional Color Swatches (Photoshop Style Overlapping Swatches) */}
            <div class="relative w-11 h-11 select-none cursor-default" title="Color Swatches (Primary / Secondary)">
              {/* Background Color Swatch */}
              <div 
                class="absolute right-1 bottom-1 w-6 h-6 rounded-sm border border-studio-border-strong z-0 shadow-[0_1px_4px_rgba(0,0,0,0.5)] transition-all duration-75 relative overflow-hidden"
                style={`background-color: ${bgColor()};`}
                title="Secondary Color (Background) - Click to change"
              >
                <input 
                  type="color"
                  class="absolute inset-0 opacity-0 w-full h-full cursor-pointer"
                  value={bgColor()}
                  onInput={(e: any) => setBgColor(e.currentTarget.value)}
                />
              </div>
              {/* Foreground Color Swatch */}
              <div 
                class="absolute left-1 top-1 w-6 h-6 rounded-sm border border-white/10 z-10 shadow-md transition-all duration-75 relative overflow-hidden"
                style={`background-color: ${fgColor()};`}
                title="Primary Color (Foreground) - Click to change"
              >
                <input 
                  type="color"
                  class="absolute inset-0 opacity-0 w-full h-full cursor-pointer"
                  value={fgColor()}
                  onInput={(e: any) => setFgColor(e.currentTarget.value)}
                />
              </div>
              {/* Swap Colors Action */}
              <button
                onClick={() => {
                  const temp = fgColor();
                  setFgColor(bgColor());
                  setBgColor(temp);
                }}
                class="absolute top-0 right-0 w-3.5 h-3.5 flex items-center justify-center text-text-muted hover:text-white transition-colors duration-75 cursor-default z-20"
                title="Swap Colors (X)"
              >
                <svg width="9" height="9" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M12 4v4H8M4 12v-4h4" />
                  <path d="M4 8a8 8 0 0 1 8-8M12 8a8 8 0 0 1-8 8" />
                </svg>
              </button>
              {/* Default Colors Action */}
              <button
                onClick={() => {
                  setFgColor("#E15A17");
                  setBgColor("#FFFFFF");
                }}
                class="absolute bottom-0 left-0 w-3 h-3 flex items-center justify-center text-text-muted hover:text-white transition-colors duration-75 cursor-default z-20"
                title="Default Colors (D)"
              >
                <svg width="9" height="9" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5">
                  <rect x="6" y="1" width="9" height="9" fill="#FFFFFF" stroke="currentColor" stroke-width="1" />
                  <rect x="1" y="6" width="9" height="9" fill="#E15A17" stroke="currentColor" stroke-width="1" />
                </svg>
              </button>
            </div>

            <div class="tool-divider"></div>

            {/* Zoom Controls */}
            <div class="flex flex-col gap-1 items-center">
              <button 
                onClick={() => setZoom(z => Math.min(200, z + 10))}
                class="tool-btn-raw" 
                title="Zoom In"
              >
                <ZoomIn size={18} />
              </button>
              <button 
                onClick={() => setZoom(z => Math.max(10, z - 10))}
                class="tool-btn-raw" 
                title="Zoom Out"
              >
                <ZoomOut size={18} />
              </button>
            </div>
            
            <button class="tool-btn-raw mt-1" title="Settings">
              <Settings size={18} />
            </button>
          </div>
        </aside>
 
        {/* 3.2 CANVAS VIEWPORT */}
        <main 
          class="canvas-wrap relative bg-studio-canvas border border-studio-border rounded-[8px] shadow-pro overflow-hidden flex flex-col h-full"
          onMouseMove={(e) => setMousePos({ x: e.offsetX, y: e.offsetY })}
        >
          <div class="h-[22px] bg-studio-bg border-b border-studio-border relative">
            <div class="absolute inset-0 font-mono text-[11px] text-text-muted leading-none pt-1 pointer-events-none">
              <For each={[0, 100, 200, 300, 400, 500]}>
                {(val) => (
                  <span class="absolute -translate-x-1/2" style={`left: ${val + 18}px;`}>{val}</span>
                )}
              </For>
            </div>
          </div>
          
          <div class="flex flex-row h-full min-h-0 w-full">
            <div class="w-[22px] bg-studio-bg border-r border-studio-border relative"></div>
            <div class="flex-1 h-full flex items-center justify-center relative bg-studio-canvas overflow-auto">
              <div 
                class="artboard border border-studio-border shadow-pro relative overflow-hidden bg-studio-canvas"
                style={`width: ${docWidth()}px; height: ${docHeight()}px; transform: translate(${pan().x}px, ${pan().y}px) scale(${zoom() / 100}); transform-origin: 0 0;`}
                ref={artboardRef}
                onMouseDown={handleArtboardMouseDown}
                onMouseLeave={() => setCanvasHoverPos({ x: -999, y: -999 })}
              >
                {/* ── Background Grid representation ── */}
                <div class="absolute inset-0 bg-[radial-gradient(#27272a_1px,transparent_1px)] [background-size:16px_16px] pointer-events-none" />

                {/* ── Render Layers stack in document order ── */}
                <For each={layers()}>
                  {(layer, index) => (
                    <Show when={layer.visible}>
                      <div 
                        class={`absolute transition-shadow duration-75 select-none`}
                        style={`
                          left: ${layer.x}px;
                          top: ${layer.y}px;
                          width: ${layer.width}px;
                          height: ${layer.height}px;
                          opacity: ${layer.opacity};
                          z-index: ${layers().length - index()};
                          background-color: ${layer.id.includes("bg") ? "#232324" : "rgba(225,90,23,0.12)"};
                          border: ${layer.id.includes("bg") ? "none" : "1px dashed rgba(225,90,23,0.3)"};
                        `}
                      >
                        {/* Layer label inside canvas */}
                        <div class="absolute inset-0 flex items-center justify-center pointer-events-none select-none">
                          <span class="text-[9px] text-text-muted font-mono opacity-50 uppercase tracking-widest">{layer.name}</span>
                        </div>
                      </div>
                    </Show>
                  )}
                </For>

                {/* ── Active Selection Marquee Overlay ── */}
                {(() => {
                  const sel = selection();
                  return sel ? (
                    <div 
                      class="absolute border-2 border-dashed border-accent pointer-events-none z-[9999]"
                      style={`
                        left: ${sel.x}px;
                        top: ${sel.y}px;
                        width: ${sel.width}px;
                        height: ${sel.height}px;
                        animation: dash 1s linear infinite;
                      `}
                    />
                  ) : null;
                })()}

                {/* ── Active Mouse Drag Selection Preview Overlay ── */}
                {(() => {
                  const overlay = selectionOverlay();
                  return overlay ? (
                    <div 
                      class="absolute border border-accent bg-accent/10 pointer-events-none z-[10000]"
                      style={`
                        left: ${overlay.x}px;
                        top: ${overlay.y}px;
                        width: ${overlay.w}px;
                        height: ${overlay.h}px;
                      `}
                    />
                  ) : null;
                })()}

                {/* ── Crop Boundaries dragging overlay ── */}
                {(() => {
                  const crop = cropOverlay();
                  return crop ? (
                    <div 
                      class="absolute border-2 border-dashed border-yellow-500 bg-black/30 pointer-events-none z-[10001] shadow-[0_0_0_9999px_rgba(0,0,0,0.5)]"
                      style={`
                        left: ${crop.x}px;
                        top: ${crop.y}px;
                        width: ${crop.w}px;
                        height: ${crop.h}px;
                      `}
                    />
                  ) : null;
                })()}

                {/* ── Bounding box + handles for selected layer ── */}
                {selectedLayerId() && (() => {
                  const layer = layers().find(l => l.id === selectedLayerId());
                  if (!layer || layer.locked) return null;

                  const handleSize = 8;
                  const half = handleSize / 2;

                  const handles: [string, string, string, string][] = [
                    ["nw", "0%", "0%", "cursor-nwse-resize"],
                    ["n", "50%", "0%", "cursor-ns-resize"],
                    ["ne", "100%", "0%", "cursor-nesw-resize"],
                    ["e", "100%", "50%", "cursor-ew-resize"],
                    ["se", "100%", "100%", "cursor-nwse-resize"],
                    ["s", "50%", "100%", "cursor-ns-resize"],
                    ["sw", "0%", "100%", "cursor-nesw-resize"],
                    ["w", "0%", "50%", "cursor-ew-resize"],
                  ];

                  return (
                    <div
                      class="absolute pointer-events-none z-[9998]"
                      style={`
                        left: ${layer.x - 1}px;
                        top: ${layer.y - 1}px;
                        width: ${layer.width + 2}px;
                        height: ${layer.height + 2}px;
                      `}
                    >
                      <div class="absolute inset-0 border border-accent/70 pointer-events-none" />

                      <For each={handles}>
                        {([name, left, top, cursor]) => (
                          <div
                            class={`absolute bg-white border border-accent pointer-events-auto ${cursor}`}
                            style={`
                              width: ${handleSize}px;
                              height: ${handleSize}px;
                              left: calc(${left} - ${half}px);
                              top: calc(${top} - ${half}px);
                              z-index: 9999;
                            `}
                            data-handle={name}
                            onMouseDown={(e) => handleTransformHandleMouseDown(e, name)}
                          />
                        )}
                      </For>

                      {/* Rotation handle */}
                      <div
                        class="absolute pointer-events-auto cursor-rotate"
                        style={`
                          left: calc(50% - 6px);
                          top: -24px;
                          width: 12px;
                          height: 12px;
                          z-index: 9999;
                        `}
                        data-handle="rotate"
                        onMouseDown={(e) => handleTransformHandleMouseDown(e, "rotate")}
                      >
                        <div class="absolute left-1/2 -translate-x-1/2 top-[10px] w-[1px] h-[14px] bg-accent/70" />
                        <div class="w-3 h-3 rounded-full bg-white border border-accent" />
                      </div>
                    </div>
                  );
                })()}

                {/* ── Zero-Latency Overlay Canvas for Brush Strokes dragging preview ── */}
                <canvas 
                  ref={strokeCanvasRef}
                  width={docWidth()}
                  height={docHeight()}
                  class="absolute inset-0 pointer-events-none z-[10002]"
                />

                {/* ── Brush / Eraser Circular Preview Cursor ── */}
                <Show when={(activeTool() === "brush" || activeTool() === "eraser") && canvasHoverPos().x >= 0 && canvasHoverPos().x <= docWidth() && canvasHoverPos().y >= 0 && canvasHoverPos().y <= docHeight()}>
                  <div 
                    class="absolute bg-transparent border border-accent/80 rounded-full pointer-events-none z-[10003] -translate-x-1/2 -translate-y-1/2"
                    style={`
                      left: ${canvasHoverPos().x}px;
                      top: ${canvasHoverPos().y}px;
                      width: ${strokeWidth()}px;
                      height: ${strokeWidth()}px;
                    `}
                  />
                </Show>
              </div>
            </div>
          </div>
        </main>
 
        {/* 3.3 RIGHT INSPECTOR PANEL */}
        <Show when={inspectorOpen()}>
          <aside class="inspector bg-studio-panel border border-studio-border rounded-[8px] shadow-pro flex flex-col min-h-0 overflow-hidden h-full">

          {/* ── COLLAPSIBLE: PROPERTIES ── */}
          <div class="border-b border-studio-border pb-1">
            <button
              onClick={() => setTransformOpen(!transformOpen())}
              class="flex items-center h-8 px-3 gap-2 w-full cursor-default hover:bg-white/5 transition-colors duration-75"
            >
              <ChevronRight size={14} class={`text-text-muted transition-transform duration-100 ${transformOpen() ? "rotate-90" : ""}`} />
              <span class="text-[11px] font-semibold text-text-secondary">Properties</span>
            </button>
            <Show when={transformOpen()}>
              <div class="py-3 px-3 flex flex-col gap-3.5">
                {/* 2x2 Segmented Matrix Grid */}
                {(() => {
                  const selectedLayer = selectedLayerId() ? layers().find(l => l.id === selectedLayerId()) : null;
                  return (
                    <div class="border border-studio-border rounded-md overflow-hidden bg-studio-input grid grid-cols-2 grid-rows-2 divide-x divide-y divide-studio-border select-none focus-within:border-accent transition-colors duration-100">
                      {/* X Cell */}
                      <div class="flex items-center px-2.5 h-[28px] focus-within:bg-white/[2%] transition-colors duration-75">
                        <span class="text-[10px] font-bold text-text-muted select-none w-3.5 flex-shrink-0">X</span>
                        <input 
                          type="number"
                          class="w-full bg-transparent border-none outline-none text-white text-[12px] font-semibold text-left tabular-nums px-1 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none" 
                          value={selectedLayer ? Math.round(selectedLayer.x) : 0} 
                          disabled={!selectedLayer || selectedLayer.locked}
                          onChange={(e: any) => {
                            if (selectedLayer) {
                              const val = parseFloat(e.currentTarget.value);
                              if (!isNaN(val)) {
                                invoke("move_layer", { id: selectedLayer.id, x: val, y: selectedLayer.y })
                                  .then((res: any) => { if (res?.ok) syncDocumentState(); })
                                  .catch(console.error);
                              }
                            }
                          }}
                        />
                      </div>
                      {/* Y Cell */}
                      <div class="flex items-center px-2.5 h-[28px] focus-within:bg-white/[2%] transition-colors duration-75">
                        <span class="text-[10px] font-bold text-text-muted select-none w-3.5 flex-shrink-0">Y</span>
                        <input 
                          type="number"
                          class="w-full bg-transparent border-none outline-none text-white text-[12px] font-semibold text-left tabular-nums px-1 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none" 
                          value={selectedLayer ? Math.round(selectedLayer.y) : 0} 
                          disabled={!selectedLayer || selectedLayer.locked}
                          onChange={(e: any) => {
                            if (selectedLayer) {
                              const val = parseFloat(e.currentTarget.value);
                              if (!isNaN(val)) {
                                invoke("move_layer", { id: selectedLayer.id, x: selectedLayer.x, y: val })
                                  .then((res: any) => { if (res?.ok) syncDocumentState(); })
                                  .catch(console.error);
                              }
                            }
                          }}
                        />
                      </div>
                      {/* W Cell - EDITABLE */}
                      <div class="flex items-center px-2.5 h-[28px] focus-within:bg-white/[2%] transition-colors duration-75">
                        <span class="text-[10px] font-bold text-text-muted select-none w-3.5 flex-shrink-0">W</span>
                        <input 
                          type="number"
                          class="w-full bg-transparent border-none outline-none text-white text-[12px] font-semibold text-left tabular-nums px-1 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none" 
                          value={selectedLayer ? Math.round(selectedLayer.width) : 0} 
                          disabled={!selectedLayer || selectedLayer.locked}
                          onChange={(e: any) => {
                            if (selectedLayer) {
                              const val = parseInt(e.currentTarget.value);
                              if (!isNaN(val) && val > 0) handleTransformChange("width", val);
                            }
                          }}
                        />
                      </div>
                      {/* H Cell - EDITABLE */}
                      <div class="flex items-center px-2.5 h-[28px] focus-within:bg-white/[2%] transition-colors duration-75">
                        <span class="text-[10px] font-bold text-text-muted select-none w-3.5 flex-shrink-0">H</span>
                        <input 
                          type="number"
                          class="w-full bg-transparent border-none outline-none text-white text-[12px] font-semibold text-left tabular-nums px-1 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none" 
                          value={selectedLayer ? Math.round(selectedLayer.height) : 0} 
                          disabled={!selectedLayer || selectedLayer.locked}
                          onChange={(e: any) => {
                            if (selectedLayer) {
                              const val = parseInt(e.currentTarget.value);
                              if (!isNaN(val) && val > 0) handleTransformChange("height", val);
                            }
                          }}
                        />
                      </div>
                    </div>
                  );
                })()}

                {/* In-Line Opacity Row (if layer selected) */}
                {selectedLayerId() && (() => {
                  const selectedLayer = layers().find(l => l.id === selectedLayerId());
                  return selectedLayer ? (
                    <div class="flex items-center gap-3 px-1">
                      <span class="text-[10px] font-bold text-text-muted select-none w-14 flex-shrink-0">OPACITY</span>
                      <input
                        type="range"
                        min="0" max="1" step="0.01"
                        value={selectedLayer.opacity}
                        onInput={(e: any) => handleOpacityChange(selectedLayer.id, parseFloat(e.currentTarget.value))}
                        class="flex-1 outline-none block"
                      />
                      <span class="text-[12px] font-semibold text-text-primary tabular-nums w-8 text-right select-none">{Math.round(selectedLayer.opacity * 100)}%</span>
                    </div>
                  ) : null;
                })()}

                {/* Rotation Input */}
                {selectedLayerId() && (() => {
                  const selectedLayer = layers().find(l => l.id === selectedLayerId());
                  return selectedLayer ? (
                    <div class="flex items-center gap-3 px-1">
                      <span class="text-[10px] font-bold text-text-muted w-[50px] uppercase">Rotate</span>
                      <input type="number"
                        class="studio-input w-[60px] text-[11px]"
                        value={Math.round(selectedLayer.transform?.rotation ?? 0)}
                        disabled={selectedLayer.locked}
                        onChange={(e: any) => {
                          const val = parseFloat(e.currentTarget.value);
                          if (!isNaN(val)) handleTransformChange("rotation", val);
                        }}
                      />
                      <span class="text-[10px] text-text-muted">deg</span>
                    </div>
                  ) : null;
                })()}
              </div>
            </Show>
          </div>

          {/* ── TABS: LAYERS / HISTORY (macOS Segmented Pill Style) ── */}
          <div class="p-1 bg-studio-canvas flex rounded-lg mx-3 my-2 gap-1 select-none">
            <button
              onClick={() => setActiveTab("layers")}
              class={`flex-1 flex items-center justify-center gap-1.5 h-[26px] text-[11px] font-bold tracking-wider cursor-default transition-all duration-100 rounded-md ${
                activeTab() === "layers"
                  ? "bg-studio-elevated text-white shadow-sm"
                  : "text-text-muted hover:text-text-primary"
              }`}
            >
              <Layers size={13} />
              <span>LAYERS</span>
            </button>
            <button
              onClick={() => setActiveTab("history")}
              class={`flex-1 flex items-center justify-center gap-1.5 h-[26px] text-[11px] font-bold tracking-wider cursor-default transition-all duration-100 rounded-md ${
                activeTab() === "history"
                  ? "bg-studio-elevated text-white shadow-sm"
                  : "text-text-muted hover:text-text-primary"
              }`}
            >
              <Clock size={13} />
              <span>HISTORY</span>
            </button>
          </div>

          {/* ── LAYERS TAB CONTENT ── */}
          <div class={`flex-1 min-h-0 flex flex-col ${activeTab() === "layers" ? "" : "hidden"}`}>
            <div class="mx-3 mb-3 bg-studio-canvas border border-studio-border rounded-lg flex-1 flex flex-col overflow-hidden shadow-[inset_0_2px_6px_rgba(0,0,0,0.6)]">
              <header class="panel-header bg-transparent border-b border-studio-border flex-shrink-0 select-none">
                <span>Layers stack</span>
                <button onClick={handleAddLayer} class="text-text-secondary hover:text-white transition-colors flex items-center gap-1 cursor-default text-[11px]" title="Add Layer">
                  <Plus size={16} class="text-accent" />
                </button>
              </header>
              <div class="flex-grow overflow-y-auto select-none">
                <div class="flex flex-col">
                  <For each={layers()}>
                    {(layer, index) => (
                      <div
                        onClick={() => setSelectedLayerId(layer.id)}
                        class={`h-8 flex items-center justify-between px-3 cursor-default transition-colors duration-75 group ${
                          selectedLayerId() === layer.id
                            ? "bg-accent/10 border-l-[2.5px] border-l-accent text-white"
                            : "hover:bg-white/5 border-l-[2.5px] border-l-transparent text-text-secondary"
                        }`}
                      >
                        <div class="flex items-center gap-3 flex-1 min-w-0">
                          <button
                            onClick={(e) => handleToggleVisibility(layer.id, layer.visible, e)}
                            class="text-text-primary hover:text-white flex items-center justify-center transition-colors"
                            title={layer.visible ? "Hide layer" : "Show layer"}
                          >
                            <Show when={layer.visible} fallback={<EyeOff size={16} class="text-text-muted" />}>
                              <Eye size={16} />
                            </Show>
                          </button>

                          <div class="w-[20px] h-[20px] rounded-[1px] border border-accent/30 flex items-center justify-center bg-accent/20 flex-shrink-0">
                            <PenTool size={12} class="text-accent" />
                          </div>

                          <span class="text-[13px] font-semibold truncate flex-1">{layer.name}</span>
                        </div>

                        <div class="flex items-center gap-1">
                          {/* Move Up Trigger */}
                          <button
                            onClick={(e) => handleMoveLayer(index(), index() - 1, e)}
                            class={`transition-all duration-100 flex items-center justify-center ${
                              index() === 0
                                ? "text-text-muted opacity-0 translate-x-1 group-hover:opacity-15 group-hover:translate-x-0 cursor-not-allowed"
                                : "text-text-muted hover:text-white opacity-0 translate-x-1 group-hover:opacity-100 group-hover:translate-x-0"
                            }`}
                            disabled={index() === 0}
                            title="Move Layer Up"
                          >
                            <ChevronUp size={14} />
                          </button>

                          {/* Move Down Trigger */}
                          <button
                            onClick={(e) => handleMoveLayer(index(), index() + 1, e)}
                            class={`transition-all duration-100 flex items-center justify-center ${
                              index() === layers().length - 1
                                ? "text-text-muted opacity-0 translate-x-1 group-hover:opacity-15 group-hover:translate-x-0 cursor-not-allowed"
                                : "text-text-muted hover:text-white opacity-0 translate-x-1 group-hover:opacity-100 group-hover:translate-x-0"
                            }`}
                            disabled={index() === layers().length - 1}
                            title="Move Layer Down"
                          >
                            <ChevronDown size={14} />
                          </button>

                          <button
                            onClick={(e) => handleToggleLock(layer.id, layer.locked, e)}
                            class={`transition-all duration-100 flex items-center justify-center ${
                              layer.locked
                                ? "text-accent"
                                : "text-text-muted opacity-0 translate-x-1 group-hover:opacity-100 group-hover:translate-x-0"
                            }`}
                            title={layer.locked ? "Unlock layer" : "Lock layer"}
                          >
                            <Show when={layer.locked} fallback={<LockOpen size={14} />}>
                              <Lock size={14} />
                            </Show>
                          </button>

                          <button
                            onClick={(e) => handleDeleteLayer(layer.id, e)}
                            class="text-text-muted hover:text-red-500 opacity-0 translate-x-1 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-100 flex items-center justify-center"
                            disabled={layers().length <= 1}
                            title="Delete layer"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>
                    )}
                  </For>
                </div>
              </div>
            </div>
          </div>

          {/* ── HISTORY TAB CONTENT ── */}
          <div class={`flex-1 min-h-0 flex flex-col ${activeTab() === "history" ? "" : "hidden"}`}>
            <div class="mx-3 mb-3 bg-studio-canvas border border-studio-border rounded-lg flex-1 flex flex-col items-center justify-center overflow-hidden shadow-[inset_0_2px_6px_rgba(0,0,0,0.6)]">
              <div class="flex flex-col items-center gap-3 px-6 select-none">
                <Clock size={32} class="text-text-muted opacity-20" />
                <div class="flex flex-col items-center gap-1">
                  <span class="text-[13px] font-semibold text-text-primary">No history yet</span>
                  <span class="text-[12px] text-text-muted text-center">Start editing to track your changes.</span>
                </div>
              </div>
            </div>
          </div>
        </aside>
        </Show>
      </div>
 
      {/* 4. BOTTOM STATUS BAR */}
      <footer class="statusbar flex items-center justify-between px-4 bg-studio-bg border-t border-studio-border h-[28px] text-[12px] text-text-muted select-none">
        <div class="flex items-center gap-3">
          <span class="text-text-primary">680 x 425 px</span>
          <span class="opacity-30">•</span>
          <div class="flex items-center gap-2 font-mono tabular-nums">
            <span class="opacity-50">X:</span> <span class="text-text-primary w-10">{mousePos().x}</span>
            <span class="opacity-50">Y:</span> <span class="text-text-primary w-10">{mousePos().y}</span>
          </div>
          <span class="opacity-30">•</span>
          <span>Zoom: <span class="text-accent font-semibold tabular-nums">{zoom()}%</span></span>
          <span class="opacity-30">•</span>
          <span>RAM: <span class="text-success font-mono tabular-nums">{ramUsage()} MB</span></span>
        </div>
        <div class="flex items-center gap-2">
          <span class="text-[10px] uppercase font-bold tracking-widest text-accent">SolidJS Renderer Active</span>
        </div>
      </footer>
    </div>
  );
}
