import { createSignal } from "solid-js";
import { useEditor } from "./EditorContext";
import { useDragController } from "./DragController";
import { addLayerFromCrossDoc } from "./crossDocLayerOps";
import type { LayerNode } from "@/engine/types";

interface CanvasLayerDrag {
  layerId: string;
  startDocX: number;
  startDocY: number;
  startTransformX: number;
  startTransformY: number;
  rect: { left: number; top: number };
}

export interface CanvasLayerDragApi {
  handlePointerDown: (e: PointerEvent) => void;
  isDragging: () => boolean;
}

/**
 * Canvas layer drag gesture: click+drag in the canvas (Move tool) to
 * translate a layer. If released over a different document's tab, copies
 * the layer to that doc (cross-doc drag). Otherwise the layer stays at
 * the new position in the current doc.
 *
 * Hit testing: walks the topmost layer stack from top to bottom and
 * picks the first non-locked, non-background, visible layer whose
 * axis-aligned bounding box contains the pointer. Rotation is ignored
 * for simplicity (matches the existing layer-helpers).
 */
export function useCanvasLayerDrag(): CanvasLayerDragApi {
  const { workspace, camera, activeDocumentId, activeTool, scheduler } = useEditor();
  const dragController = useDragController();

  const [drag, setDrag] = createSignal<CanvasLayerDrag | null>(null);

  function findLayerAt(docX: number, docY: number): LayerNode | null {
    const engine = workspace.getActiveEngine();
    if (!engine) return null;
    const ls = engine.getLayers();
    // Engine: addLayer inserts at index 0 (newest at front). Renderer draws
    // from end to start, so index 0 is the topmost visible layer. Hit-test
    // must also start at index 0 — otherwise the Background (which covers
    // the whole canvas) gets returned for every click and canvas drag does
    // nothing visible.
    for (let i = 0; i < ls.length; i++) {
      const layer = ls[i];
      if (layer.locked || !layer.visible) continue;
      // Skip the background — it covers the whole canvas and can't be moved.
      if (layer.name === "Background") continue;
      const halfW = (layer.width * Math.abs(layer.transform.scaleX)) / 2;
      const halfH = (layer.height * Math.abs(layer.transform.scaleY)) / 2;
      const localX = docX - layer.transform.x;
      const localY = docY - layer.transform.y;
      if (Math.abs(localX) <= halfW && Math.abs(localY) <= halfH) {
        return layer;
      }
    }
    return null;
  }

  function onPointerMove(e: PointerEvent) {
    const d = drag();
    if (!d) return;
    const engine = workspace.getActiveEngine();
    if (!engine) return;
    const layer = engine.getLayer(d.layerId);
    if (!layer) return;

    const docPos = camera.screenToDocument(
      e.clientX - d.rect.left,
      e.clientY - d.rect.top,
    );
    const dx = docPos.x - d.startDocX;
    const dy = docPos.y - d.startDocY;

    const newX = d.startTransformX + dx;
    const newY = d.startTransformY + dy;
    engine.transformLayer(d.layerId, {
      x: newX,
      y: newY,
    });
    scheduler.requestRender();

    // Highlight tab when hovering a different document's tab
    const el = document.elementFromPoint(e.clientX, e.clientY);
    const tabEl = el?.closest("[data-document-tab]") as HTMLElement | null;
    const tabId = tabEl?.getAttribute("data-document-tab") ?? null;
    if (tabId && tabId !== activeDocumentId()) {
      dragController.setDropTarget({ type: "tab", docId: tabId });
    } else {
      const tabBarEl = el?.closest("[data-tab-bar-empty]") as HTMLElement | null;
      if (tabBarEl) {
        dragController.setDropTarget({ type: "tab-empty" });
      } else {
        dragController.setDropTarget(null);
      }
    }

    scheduler.requestRender();
  }

  function onPointerUp(e: PointerEvent) {
    const d = drag();
    if (!d) return;

    document.removeEventListener("pointermove", onPointerMove);
    document.removeEventListener("pointerup", onPointerUp);
    document.removeEventListener("pointercancel", onPointerCancel);

    const dropTarget = dragController.state().dropTarget;
    const src = activeDocumentId();
    console.log("[useCanvasLayerDrag] pointerup", { dropTarget, src, layerId: d.layerId });

    if (dropTarget && dropTarget.type === "tab" && dropTarget.docId !== src) {
      // Cross-doc copy logic (unchanged) ...
      const engine = workspace.getEngine(src!);
      const sourceLayer = engine?.getLayer(d.layerId);
      if (sourceLayer && engine) {
        addLayerFromCrossDoc(
          {
            version: 1,
            sourceDocId: src!,
            layerId: d.layerId,
            sourceName: sourceLayer.name,
            isAltPressed: e.altKey,
          },
          { type: "tab", docId: dropTarget.docId },
          { x: sourceLayer.transform.x, y: sourceLayer.transform.y },
          workspace as unknown as Parameters<typeof addLayerFromCrossDoc>[3],
        );
        scheduler.requestRender();
      }
    } else if (dropTarget && dropTarget.type === "tab" && dropTarget.docId === src) {
      const engine = workspace.getEngine(src!);
      if (engine) {
        engine.transformLayer(d.layerId, {
          x: d.startTransformX,
          y: d.startTransformY,
        });
        scheduler.requestRender();
      }
    }

    dragController.setDropTarget(null);
    setDrag(null);
  }

  function onPointerCancel() {
    const d = drag();
    if (!d) return;
    document.removeEventListener("pointermove", onPointerMove);
    document.removeEventListener("pointerup", onPointerUp);
    // Revert position on cancel
    const src = activeDocumentId();
    if (src) {
      const engine = workspace.getEngine(src);
      if (engine) {
        engine.transformLayer(d.layerId, {
          x: d.startTransformX,
          y: d.startTransformY,
        });
        scheduler.requestRender();
      }
    }
    dragController.setDropTarget(null);
    setDrag(null);
  }

  function handlePointerDown(e: PointerEvent) {
    if (activeTool() !== "move") return;
    if (e.button !== 0) return;

    // Ignore if the click was on a transform handle or rotate path
    // (useSelectionTransformDrag handles those and stops propagation, but
    // guard defensively in case any future SVG element forgets to)
    const target = e.target as HTMLElement;
    if (target.closest("[data-handle], [data-overlay-svg] [path]")) {
      return;
    }

    const container = e.currentTarget as HTMLElement;
    const rect = container.getBoundingClientRect();
    const screenX = e.clientX - rect.left;
    const screenY = e.clientY - rect.top;
    const docPos = camera.screenToDocument(screenX, screenY);
    const layer = findLayerAt(docPos.x, docPos.y);
    console.log(
      `[useCanvasLayerDrag] hit layer=${layer?.name} ` +
      `locked=${layer?.locked} lockPosition=${layer?.lockPosition} ` +
      `pos=(${docPos?.x?.toFixed(1)},${docPos?.y?.toFixed(1)}) ` +
      `screen=(${screenX.toFixed(0)},${screenY.toFixed(0)})`,
    );
    if (!layer) return;
    if (layer.locked || layer.lockPosition) {
      console.warn(`[useCanvasLayerDrag] BLOCKED: layer "${layer.name}" is position-locked (locked=${layer.locked}, lockPosition=${layer.lockPosition})`);
    }

    setDrag({
      layerId: layer.id,
      startDocX: docPos.x,
      startDocY: docPos.y,
      startTransformX: layer.transform.x,
      startTransformY: layer.transform.y,
      rect: { left: rect.left, top: rect.top },
    });

    document.addEventListener("pointermove", onPointerMove);
    document.addEventListener("pointerup", onPointerUp);
    document.addEventListener("pointercancel", onPointerCancel);
  }

  return {
    handlePointerDown,
    isDragging: () => drag() !== null,
  };
}
