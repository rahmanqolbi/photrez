import { createSignal } from "solid-js";
import { useEditor } from "../shell/EditorContext";
import { useDragController } from "../DragController";
import { addLayerFromCrossDoc } from "../crossDocLayerOps";
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
  preDragSnapshot: import("@/engine/types").DocumentModel;
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
  const { workspace, renderer, camera, activeDocumentId, activeTool, scheduler, moveSnapEnabled } = useEditor();
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

    // Check for tab hover FIRST. A tab hover is a drop-target action, not
    // a canvas move action, so pause at the current visual position while
    // the user aims at a tab or waits for hover-to-switch.
    const el = document.elementFromPoint(e.clientX, e.clientY);
    const tabEl = el?.closest("[data-document-tab]") as HTMLElement | null;
    const tabId = tabEl?.getAttribute("data-document-tab") ?? null;
    const currentActive = activeDocumentId();

    if (tabId) {
      dragController.setDropTarget({ type: "tab", docId: tabId });
      if (tabId !== currentActive) {
        dragController.startTabHover(tabId);
      } else {
        dragController.cancelTabHover();
      }
      opts.onSnapLinesChange?.([]);
      return;
    }

    const engine = workspace.getActiveEngine();
    if (!engine) return;
    const layer = engine.getLayer(d.layerId);
    if (!layer) return;

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
    dragController.cancelTabHover();

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
    // activeDocumentId →the user may have switched tab during drag.
    const src = d.sourceDocId;
    const currentActive = activeDocumentId();

    let crossDocAdded = false;
    if (
      dropTarget &&
      dropTarget.type === "tab" &&
      dropTarget.docId !== src
    ) {
      const sourceEngine = workspace.getEngine(src);
      const sourceLayer = sourceEngine?.getLayer(d.layerId);
      if (sourceLayer && sourceEngine) {
        // Cancel any pending hover-to-switch timer →we're committing
        // the drop now, no need for the auto-switch anymore.
        dragController.cancelTabHover();

        // Switch the active doc FIRST so the camera is in the target's
        // coordinate system before we map the cursor to a doc position.
        // Otherwise we'd use the source's camera, place the layer at a
        // wrong point in the target, and the user would see the layer
        // off-screen (or at a wrong position) when the visual updates.
        if (currentActive !== dropTarget.docId) {
          workspace.switchDocument(dropTarget.docId);
        }
        // Camera is now at the target's state. Map cursor →target doc
        // coords so the new layer lands exactly under the cursor.
        const layerAabb = getLayerAabb(sourceLayer.transform, sourceLayer.width, sourceLayer.height);
        const cursorInCanvas = {
          x: e.clientX - d.rect.left,
          y: e.clientY - d.rect.top,
        };
        const targetDocPos = camera.screenToDocument(cursorInCanvas.x, cursorInCanvas.y);
        // Center the layer on the cursor (top-left = cursor - half-size).
        const targetPos = {
          x: targetDocPos.x - layerAabb.width / 2,
          y: targetDocPos.y - layerAabb.height / 2,
        };
        const { newLayerId } = addLayerFromCrossDoc(
          {
            version: 1,
            sourceDocId: src,
            layerId: d.layerId,
            sourceName: sourceLayer.name,
            isAltPressed: e.altKey,
          },
          { type: "tab", docId: dropTarget.docId },
          targetPos,
          workspace,
        );
        crossDocAdded = true;
        if (!e.altKey) {
          sourceEngine.transformLayer(d.layerId, {
            x: d.startTransformX,
            y: d.startTransformY,
          });
        }
        // Explicitly upload the new layer's bitmap to the renderer.
        // The createEffect on activeDocumentId change handles first-time
        // docs, but for already-seen docs the effect doesn't re-run
        // and the new layer's GPU texture is never created →so the
        // new layer would render as blank/empty even though it's in
        // the engine. Source layer's bitmap is the same reference
        // already set on the new layer by addLayerFromCrossDoc.
        if (newLayerId) {
          const targetEngine = workspace.getActiveEngine();
          const newLayer = targetEngine?.getLayer(newLayerId);
          if (newLayer?.imageBitmap) {
            renderer.uploadImage(newLayerId, newLayer.imageBitmap);
          }
        }
        scheduler.requestRender();
      }
    } else if (dropTarget && dropTarget.type === "tab" && dropTarget.docId === src) {
      // Dropped on the same doc's tab →revert position (treat as cancel)
      dragController.cancelTabHover();
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
    // Use the PRE-DRAG snapshot captured at pointerdown so undo restores the
    // original position. Capturing at pointerup would snapshot the post-drag
    // state and undo would appear to do nothing (regression 2026-06-19:
    // "first drag after open not recorded in history").
    if (src) {
      const sourceEngine = workspace.getEngine(src);
      const history = workspace.getHistory(src);
      if (sourceEngine && history) {
        const currentLayer = sourceEngine.getLayer(d.layerId);
        const positionChanged =
          currentLayer &&
          (currentLayer.transform.x !== d.startTransformX ||
            currentLayer.transform.y !== d.startTransformY);
        if (positionChanged || crossDocAdded) {
          history.commit(d.preDragSnapshot, "Move Layer");
        }
      }
    }

    dragController.setDropTarget(null);
    setDrag(null);
    dragController.endDrag();
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
    dragController.endDrag();
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
    const sourceEngine = workspace.getEngine(src);
    if (!sourceEngine) return;

    setDrag({
      layerId: layer.id,
      sourceDocId: src,
      startDocX: docPos.x,
      startDocY: docPos.y,
      startTransformX: layer.transform.x,
      startTransformY: layer.transform.y,
      rect: { left: rect.left, top: rect.top },
      preDragSnapshot: sourceEngine.snapshot(),
    });

    // Notify the DragController so cross-cutting subscribers
    // (DocumentTabsBar's pointerenter →500ms hover-to-switch timer,
    // drop-target tracking) know a drag is in progress. Without this,
    // the tab's onPointerEnter sees dragKind === null and skips the
    // timer entirely →even though the user is mid-drag with the
    // pointer over the tab.
    dragController.beginLayerDrag(
      {
        version: 1,
        sourceDocId: src,
        layerId: layer.id,
        sourceName: layer.name,
        isAltPressed: e.altKey,
      },
      null,
    );

    document.addEventListener("pointermove", onPointerMove);
    document.addEventListener("pointerup", onPointerUp);
    document.addEventListener("pointercancel", onPointerCancel);
  }

  return {
    handlePointerDown,
    isDragging: () => drag() !== null,
  };
}
