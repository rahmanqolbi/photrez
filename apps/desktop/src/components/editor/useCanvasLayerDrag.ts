import { createSignal } from "solid-js";
import { useEditor } from "./EditorContext";
import { useDragController } from "./DragController";
import { addLayerFromCrossDoc } from "./crossDocLayerOps";
import type { LayerNode } from "@/engine/types";
import { computeSnapAdjustment, type SnapRect, type SnapLine } from "@/viewport/smartGuides";
import { getLayerAabb } from "@/viewport/transformGeometry";

interface CanvasLayerDrag {
  layerId: string;
  sourceDocId: string;
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

export interface CanvasLayerDragOptions {
  onSnapLinesChange?: (lines: SnapLine[]) => void;
}

/**
 * Canvas layer drag gesture: click+drag in the canvas (Move tool) to
 * translate a layer. If released over a different document's tab, copies
 * the layer to that doc (cross-doc drag). Otherwise the layer stays at
 * the new position in the current doc.
 *
 * Snapping: when the global `moveSnapEnabled` signal is on (and Alt is
 * not held), the layer snaps to the doc bounds, the doc center lines,
 * and other visible layers' edges.
 *
 * Tab switch on hover: when the cursor enters a different document's
 * tab, the workspace switches to that tab so the user sees the target
 * canvas in real time and can choose the landing position before
 * releasing. The source docId is captured at pointerdown so the
 * cross-doc add uses the original source even after the tab switch.
 *
 * Hit testing: walks the topmost layer stack from top to bottom and
 * picks the first non-locked, non-background, visible layer whose
 * axis-aligned bounding box contains the pointer. Rotation is ignored
 * for simplicity (matches the existing layer-helpers).
 */
export function useCanvasLayerDrag(opts: CanvasLayerDragOptions = {}): CanvasLayerDragApi {
  const { workspace, camera, activeDocumentId, activeTool, scheduler, moveSnapEnabled } = useEditor();
  const dragController = useDragController();

  const [drag, setDrag] = createSignal<CanvasLayerDrag | null>(null);

  function findLayerAt(docX: number, docY: number): LayerNode | null {
    const engine = workspace.getActiveEngine();
    if (!engine) return null;
    const ls = engine.getLayers();
    for (let i = 0; i < ls.length; i++) {
      const layer = ls[i];
      if (layer.locked || !layer.visible) continue;
      const w = layer.width * Math.abs(layer.transform.scaleX);
      const h = layer.height * Math.abs(layer.transform.scaleY);
      if (
        docX >= layer.transform.x &&
        docX <= layer.transform.x + w &&
        docY >= layer.transform.y &&
        docY <= layer.transform.y + h
      ) {
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

    // Check for cross-doc tab hover FIRST. A cross-doc drag is a copy
    // operation — the source layer must stay in place while the user
    // aims the cursor at the target tab.
    const el = document.elementFromPoint(e.clientX, e.clientY);
    const tabEl = el?.closest("[data-document-tab]") as HTMLElement | null;
    const tabId = tabEl?.getAttribute("data-document-tab") ?? null;
    const currentActive = activeDocumentId();
    const isCrossDocHover = !!(tabId && tabId !== currentActive);

    if (isCrossDocHover) {
      // Cross-doc drag is a copy: revert the source layer to its original
      // position so the source is unchanged on drop. This handles the
      // case where the user dragged through the source doc first (the
      // source moved), then crossed to another tab.
      const sourceEngine = workspace.getEngine(d.sourceDocId);
      if (sourceEngine) {
        const sourceLayer = sourceEngine.getLayer(d.layerId);
        if (
          sourceLayer &&
          (sourceLayer.transform.x !== d.startTransformX ||
            sourceLayer.transform.y !== d.startTransformY)
        ) {
          sourceEngine.transformLayer(d.layerId, {
            x: d.startTransformX,
            y: d.startTransformY,
          });
          scheduler.requestRender();
        }
      }
      dragController.setDropTarget({ type: "tab", docId: tabId });
      // Use the DragController's 500ms hover-to-switch timer (per the
      // cross-doc spec) so accidental tab-crossings don't switch docs.
      // The timer also drives the visual countdown on the tab.
      dragController.startTabHover(tabId);
      // No snap (irrelevant for copy).
      opts.onSnapLinesChange?.([]);
      return;
    }

    // Cursor is not over a different tab. Cancel any pending hover-to-
    // switch timer and update drop target for non-tab hover cases.
    if (dragController.state().hoverTabId) {
      dragController.cancelTabHover();
    }

    // Same-doc (or no tab): mutate the source layer with snap.
    const docPos = camera.screenToDocument(
      e.clientX - d.rect.left,
      e.clientY - d.rect.top,
    );
    const dx = docPos.x - d.startDocX;
    const dy = docPos.y - d.startDocY;

    let newX = d.startTransformX + dx;
    let newY = d.startTransformY + dy;

    const altHeld = e.altKey;
    if (!altHeld && moveSnapEnabled()) {
      const docW = engine.getWidth();
      const docH = engine.getHeight();
      const movingId = layer.id;
      const aabb = getLayerAabb(layer.transform, layer.width, layer.height);
      const baseX = aabb.x;
      const baseY = aabb.y;
      const targetAabbX = newX - layer.transform.x;
      const targetAabbY = newY - layer.transform.y;
      const rect: SnapRect = {
        x: baseX + targetAabbX,
        y: baseY + targetAabbY,
        w: aabb.width,
        h: aabb.height,
      };
      const otherLayers: SnapRect[] = engine
        .getLayers()
        .filter((l) => l.visible && l.id !== movingId && l.name !== "Background")
        .map((l) => {
          const laabb = getLayerAabb(l.transform, l.width, l.height);
          return { x: laabb.x, y: laabb.y, w: laabb.width, h: laabb.height };
        });
      const snapTargets: SnapRect[] = [
        { x: 0, y: 0, w: docW, h: docH, snapThreshold: 12, snapPriority: 3 },
        { x: docW / 2, y: -Infinity, w: 0, h: Infinity, snapThreshold: 6, snapPriority: 2 },
        { x: -Infinity, y: docH / 2, w: Infinity, h: 0, snapThreshold: 6, snapPriority: 2 },
        ...otherLayers,
      ];
      const result = computeSnapAdjustment(rect, snapTargets);
      newX += result.dx;
      newY += result.dy;
      opts.onSnapLinesChange?.(result.lines);
    } else {
      opts.onSnapLinesChange?.([]);
    }

    engine.transformLayer(d.layerId, { x: newX, y: newY });
    scheduler.requestRender();

    // Update drop target for non-cross-doc hover.
    const tabBarEl = el?.closest("[data-tab-bar-empty]") as HTMLElement | null;
    if (tabBarEl) {
      dragController.setDropTarget({ type: "tab-empty" });
    } else {
      dragController.setDropTarget(null);
    }

    scheduler.requestRender();
  }

  function onPointerUp(e: PointerEvent) {
    const d = drag();
    if (!d) return;

    document.removeEventListener("pointermove", onPointerMove);
    document.removeEventListener("pointerup", onPointerUp);
    document.removeEventListener("pointercancel", onPointerCancel);

    opts.onSnapLinesChange?.([]);

    const dropTarget = dragController.state().dropTarget;
    // Use the source docId captured at pointerdown, NOT the current
    // activeDocumentId — the user may have switched tab during drag.
    const src = d.sourceDocId;
    const currentActive = activeDocumentId();
    console.log("[useCanvasLayerDrag] pointerup", { dropTarget, src, currentActive, layerId: d.layerId });

    let crossDocAdded = false;
    if (
      dropTarget &&
      dropTarget.type === "tab" &&
      dropTarget.docId !== src
    ) {
      const sourceEngine = workspace.getEngine(src);
      const sourceLayer = sourceEngine?.getLayer(d.layerId);
      if (sourceLayer && sourceEngine) {
        // The user has been hovering the target canvas (tab already
        // switched during drag), so place the new layer at the cursor
        // position in the target doc's coordinate space.
        const targetEngine = workspace.getActiveEngine();
        let targetPos = { x: sourceLayer.transform.x, y: sourceLayer.transform.y };
        if (targetEngine) {
          const layerAabb = getLayerAabb(sourceLayer.transform, sourceLayer.width, sourceLayer.height);
          targetPos = {
            x: e.clientX - d.rect.left - layerAabb.width / 2,
            y: e.clientY - d.rect.top - layerAabb.height / 2,
          };
          const targetDocPos = camera.screenToDocument(
            e.clientX - d.rect.left,
            e.clientY - d.rect.top,
          );
          targetPos = { x: targetDocPos.x, y: targetDocPos.y };
        }
        addLayerFromCrossDoc(
          {
            version: 1,
            sourceDocId: src,
            layerId: d.layerId,
            sourceName: sourceLayer.name,
            isAltPressed: e.altKey,
          },
          { type: "tab", docId: dropTarget.docId },
          targetPos,
          workspace as unknown as Parameters<typeof addLayerFromCrossDoc>[3],
        );
        // Stay on the target tab so the user sees the new layer.
        if (currentActive !== dropTarget.docId) {
          workspace.switchDocument(dropTarget.docId);
        }
        crossDocAdded = true;
        scheduler.requestRender();
      }
    } else if (dropTarget && dropTarget.type === "tab" && dropTarget.docId === src) {
      // Dropped on the same doc's tab — revert position (treat as cancel)
      const sourceEngine = workspace.getEngine(src);
      if (sourceEngine) {
        sourceEngine.transformLayer(d.layerId, {
          x: d.startTransformX,
          y: d.startTransformY,
        });
        scheduler.requestRender();
      }
    }

    // Commit history for the SOURCE doc so the user can undo the drag.
    if (src) {
      const sourceEngine = workspace.getEngine(src);
      const history = workspace.getActiveHistory();
      if (sourceEngine && history) {
        const currentLayer = sourceEngine.getLayer(d.layerId);
        const positionChanged =
          currentLayer &&
          (currentLayer.transform.x !== d.startTransformX ||
            currentLayer.transform.y !== d.startTransformY);
        if (positionChanged || crossDocAdded) {
          history.commit(sourceEngine.snapshot());
        }
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
    document.removeEventListener("pointercancel", onPointerCancel);
    opts.onSnapLinesChange?.([]);

    const src = d?.sourceDocId ?? activeDocumentId();
    if (src) {
      const sourceEngine = workspace.getEngine(src);
      if (sourceEngine) {
        sourceEngine.transformLayer(d.layerId, {
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
    if (!layer) return;
    if (layer.locked || layer.lockPosition) {
      console.warn(`[useCanvasLayerDrag] BLOCKED: layer "${layer.name}" is position-locked`);
    }

    const src = activeDocumentId();
    if (!src) return;

    setDrag({
      layerId: layer.id,
      sourceDocId: src,
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
