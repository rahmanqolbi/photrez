import { onMount, onCleanup } from "solid-js";
import { constrainCropRectToDocument } from "@/viewport/cropGeometry";
import { getModernCropApplyRotation, modernFrameToCropRect } from "@/viewport/modernCropGeometry";
import type { ToolType } from "@/viewport/input-handler";
import { useEditor } from "../shell/EditorContext";
import { flattenAllLayers, mergeActiveLayerDown } from "../layers/layerOperations";
import { cancelLayerTransformSession, commitLayerTransformSession } from "../transformSession";
import { discardCropSession, applyCropPreview } from "../cropToolActions";
import { PAINT_SIZE_STEP, PAINT_SIZE_STEP_HARDNESS, adjustPaintSize, adjustPaintHardness } from "../brushToolState";
import { SelectionOperations } from "@/features/selection/SelectionOperations";

interface CanvasKeyboardOptions {
  isSpacePressed: () => boolean;
  setIsSpacePressed: (pressed: boolean) => void;
  isAltPressed: () => boolean;
  setIsAltPressed: (pressed: boolean) => void;
  isPanning: () => boolean;
  setIsPanning: (panning: boolean) => void;
  stopMomentum: () => void;
  onSelectionChange?: () => void;
  fitToScreenAndRender: (animated?: boolean) => void;
  syncViewport: () => void;
  getCanvasContainerRef: () => HTMLDivElement | undefined;
}

export function useCanvasKeyboard(options: CanvasKeyboardOptions) {
  const {
    workspace,
    renderer,
    scheduler,
    activeTool,
    setActiveTool,
    zoom,
    docWidth,
    docHeight,
    bgColor,
    activeLayerId,
    cropRect,
    setCropRect,
    cropMode,
    cropSizeTarget,
    cropRotation,
    setCropRotation,
    hiddenCropPreview,
    setHiddenCropPreview,
    cropInteractionMode,
    undoLastCrop,
    redoCrop,
    canCropUndo,
    canCropRedo,
    undoModernCrop,
    redoModernCrop,
    commitModernCropState,
    commitCropState,
    cropDeletePixels,
    cropFillEnabled,
    cropFillSource,
    cropFillCustomColor,
    modernCropFrame,
    modernCropImageTransform,
    setModernCropImageTransform,
    resetModernCrop,
    viewportWidth,
    viewportHeight,
    pan,
    setViewportState,
    selectedLayerId,
    setSelectedLayerId,
    layerTransformSession,
    setLayerTransformSession,
    selectionEditMode,
    setSelectionEditMode,
    brushSize,
    setBrushSize,
    eraserSize,
    setEraserSize,
    brushHardness,
    setBrushHardness,
    eraserHardness,
    setEraserHardness,
    brushOpacity,
    brushFlow,
    brushSmoothing,
    eraserOpacity,
    eraserFlow,
    eraserSmoothing,
    camera,
    syncFromCamera,
  } = useEditor();

  const resolvedCropFillColor = () => (
    cropFillSource() === "background"
      ? (typeof bgColor === "function" ? bgColor() : "#ffffff")
      : cropFillCustomColor()
  );
  const isCropFillEnabled = () => (
    typeof cropFillEnabled === "function" ? cropFillEnabled() : false
  );

  onMount(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const active = document.activeElement;
      if (
        active &&
        (active.tagName === "INPUT" ||
          active.tagName === "TEXTAREA" ||
          (active as HTMLElement).isContentEditable)
      ) {
        return;
      }

      if (document.querySelector('[aria-modal="true"]')) return;

      options.stopMomentum();
      if (e.defaultPrevented) return;

      // Dev-only: F5 reloads the webview when HMR gets stuck
      if (import.meta.env.DEV && e.key === "F5") {
        e.preventDefault();
        window.location.reload();
        return;
      }

      const engine = workspace.getActiveEngine();
      if (!engine) return;

      const history = workspace.getActiveHistory();
      if (!history) return;

      // Layer transform session keyboard shortcuts (takes precedence over crop/tool shortcuts)
      if (layerTransformSession()) {
        if (e.key === "Enter") {
          e.preventDefault();
          e.stopPropagation();
          if (commitLayerTransformSession(layerTransformSession(), engine, history)) {
            setLayerTransformSession(null);
            scheduler.requestRender();
          }
          return;
        }

        if (e.key === "Escape") {
          e.preventDefault();
          e.stopPropagation();
          if (cancelLayerTransformSession(layerTransformSession(), engine)) {
            setLayerTransformSession(null);
            scheduler.requestRender();
          }
          return;
        }
      }

      // Crop tool keyboard shortcuts
      if (activeTool() === "crop") {
        const ctrl = e.ctrlKey || e.metaKey;
      const key = e.key.toLowerCase();
        if (ctrl && e.shiftKey && key === "z") {
          e.preventDefault();
          e.stopPropagation();
          if (cropInteractionMode() === "modern") {
            redoModernCrop();
          } else if (canCropRedo()) {
            const entry = redoCrop();
            if (entry) {
              setCropRect(entry.rect);
              setCropRotation(entry.rotation);
            }
          }
          return;
        }
        if (ctrl && key === "z") {
          e.preventDefault();
          e.stopPropagation();
          if (cropInteractionMode() === "modern") {
            undoModernCrop();
          } else if (canCropUndo()) {
            const entry = undoLastCrop();
            if (entry) {
              setCropRect(entry.rect);
              setCropRotation(entry.rotation);
            }
          }
          return;
        }
        if (ctrl && key === "y") {
          e.preventDefault();
          e.stopPropagation();
          if (cropInteractionMode() === "modern") {
            redoModernCrop();
          } else if (canCropRedo()) {
            const entry = redoCrop();
            if (entry) {
              setCropRect(entry.rect);
              setCropRotation(entry.rotation);
            }
          }
          return;
        }
        if (e.key === "Enter") {
          e.preventDefault();
          if (cropInteractionMode() === "modern" && modernCropFrame()) {
            const rect = modernFrameToCropRect({
              frame: modernCropFrame()!,
              viewport: {
                width: viewportWidth(),
                height: viewportHeight(),
                panX: pan().x,
                panY: pan().y,
                zoom: zoom(),
              },
              transform: modernCropImageTransform(),
            });
            applyCropPreview({
              workspace, renderer,
              viewport: { width: viewportWidth(), height: viewportHeight() },
              cropRect: rect,
              cropMode: cropMode(),
              cropSizeTarget: cropSizeTarget(),
              cropDeletePixels: cropDeletePixels(),
              cropFillColor: isCropFillEnabled() ? resolvedCropFillColor() : null,
              cropRotation: getModernCropApplyRotation(modernCropImageTransform().rotation),
              scheduler,
              setCropRect, setCropRotation, setHiddenCropPreview, setActiveTool,
              setSelectedLayerId,
              recenterViewport: options.fitToScreenAndRender,
            });
            resetModernCrop();
          } else {
            applyCropPreview({
              workspace,
              renderer,
              viewport: { width: viewportWidth(), height: viewportHeight() },
              cropRect: cropRect(),
              cropMode: cropMode(),
              cropSizeTarget: cropSizeTarget(),
              cropDeletePixels: cropDeletePixels(),
              cropFillColor: isCropFillEnabled() ? resolvedCropFillColor() : null,
              cropRotation: cropRotation(),
              scheduler,
              setCropRect,
              setCropRotation,
              setHiddenCropPreview,
              setActiveTool,
              setSelectedLayerId,
              recenterViewport: options.fitToScreenAndRender,
            });
          }
          return;
        }
        if (e.key === "Escape") {
          e.preventDefault();
          setCropRect(null);
          setCropRotation(0);
          setHiddenCropPreview(null);
          if (cropInteractionMode() === "modern") {
            resetModernCrop();
          }
          scheduler.requestRender();
          return;
        }
        if (e.key.startsWith("Arrow") && (cropRect() || modernCropFrame())) {
          e.preventDefault();
          const step = e.shiftKey ? 10 : 1;
          let dx = 0;
          let dy = 0;
          if (e.key === "ArrowUp") dy = -step;
          else if (e.key === "ArrowDown") dy = step;
          else if (e.key === "ArrowLeft") dx = -step;
          else if (e.key === "ArrowRight") dx = step;

          if (cropInteractionMode() === "modern" && modernCropFrame()) {
            if (!e.repeat) commitModernCropState();
            const t = modernCropImageTransform();
            setModernCropImageTransform({
              ...t,
              offsetX: t.offsetX + dx,
              offsetY: t.offsetY + dy,
            });
          } else {
            const rect = cropRect()!;
            if (!e.repeat) commitCropState(rect, cropRotation());
            const newRect = constrainCropRectToDocument(
              { ...rect, x: rect.x + dx, y: rect.y + dy },
              docWidth(),
              docHeight()
            );

            const actualDx = newRect.x - rect.x;
            const actualDy = newRect.y - rect.y;

            setCropRect(newRect);

            const currentPan = pan();
            setViewportState({
              x: currentPan.x - actualDx * zoom(),
              y: currentPan.y - actualDy * zoom(),
              zoom: zoom(),
            });
          }
          scheduler.requestRender();
          return;
        }
      }

      // Selection tool keyboard shortcuts
      if (activeTool() === "selection") {
        // Ctrl+D: Deselect
        if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "d") {
          e.preventDefault();
          e.stopPropagation();
          engine.clearSelection();
          setSelectionEditMode(false);
          options.onSelectionChange?.();
          scheduler.requestRender();
          return;
        }

        // Ctrl+I: Invert selection
        if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "i") {
          e.preventDefault();
          e.stopPropagation();
          engine.invertSelection();
          setSelectionEditMode(false);
          options.onSelectionChange?.();
          scheduler.requestRender();
          return;
        }

        // Ctrl+T: Toggle transform/edit mode (show resize/rotate handles)
        if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "t") {
          e.preventDefault();
          e.stopPropagation();
          if (engine.getSelection()) {
            setSelectionEditMode(!selectionEditMode());
            scheduler.requestRender();
          }
          return;
        }

        // Escape: Cancel drawing / deselect
        if (e.key === "Escape") {
          e.preventDefault();
          engine.clearSelection();
          setSelectionEditMode(false);
          options.onSelectionChange?.();
          scheduler.requestRender();
          return;
        }

        // Ctrl+X: Cut selection
        if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "x") {
          e.preventDefault();
          e.stopPropagation();
          if (engine.getSelection()) {
            // Commit pre-action snapshot so the cut is undoable AND redoable.
            // Without this, the post-cut state was never pushed to the undo
            // stack and redo had no entry to replay.
            history.commit(engine.snapshot(), "Cut");
            SelectionOperations.cutSelection(engine);
            // Re-upload the modified layer's bitmap to the renderer so the
            // canvas reflects the cut immediately (otherwise the GPU texture
            // still holds the pre-cut pixels until the next texture refresh).
            const activeId = engine.getActiveLayerId();
            if (activeId) {
              const layer = engine.getLayer(activeId);
              if (layer?.imageBitmap) {
                renderer.uploadImage(layer.id, layer.imageBitmap);
              }
            }
            options.onSelectionChange?.();
            scheduler.requestRender();
          }
          return;
        }

        // Ctrl+C: Copy selection
        if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "c") {
          e.preventDefault();
          e.stopPropagation();
          if (engine.getSelection()) {
            SelectionOperations.copySelection(engine);
            scheduler.requestRender();
          }
          return;
        }

        // Ctrl+V: Paste selection
        if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "v") {
          e.preventDefault();
          e.stopPropagation();
          // Commit pre-action snapshot so the new layer is undoable/redoable.
          history.commit(engine.snapshot(), "Paste");
          SelectionOperations.pasteSelection(engine);
          // Re-upload the newly-pasted layer's bitmap to the renderer. After
          // pasteSelection, engine.getActiveLayerId() points at the new
          // "Pasted Layer" (addLayer sets activeLayerId to the new layer).
          const pastedId = engine.getActiveLayerId();
          if (pastedId) {
            const pastedLayer = engine.getLayer(pastedId);
            if (pastedLayer?.imageBitmap) {
              renderer.uploadImage(pastedLayer.id, pastedLayer.imageBitmap);
            }
          }
          options.onSelectionChange?.();
          scheduler.requestRender();
          return;
        }

        // Delete / Backspace: Delete selection pixels
        if (e.key === "Delete" || e.key === "Backspace") {
          e.preventDefault();
          e.stopPropagation();
          const sel = engine.getSelection();
          if (sel) {
            // Commit pre-action snapshot so the deletion is undoable/redoable.
            history.commit(engine.snapshot(), "Delete Pixels");
            SelectionOperations.deleteSelection(engine);
            // Re-upload the modified layer's bitmap to the renderer so the
            // canvas reflects the deletion immediately.
            const activeId = engine.getActiveLayerId();
            if (activeId) {
              const layer = engine.getLayer(activeId);
              if (layer?.imageBitmap) {
                renderer.uploadImage(layer.id, layer.imageBitmap);
              }
            }
            options.onSelectionChange?.();
            scheduler.requestRender();
          }
          return;
        }
      }

      const key = e.key.toLowerCase();

      const ctrl = e.ctrlKey || e.metaKey;

      if (ctrl && key === "e") {
        e.preventDefault();
        e.stopPropagation();

        const actionApplied = e.shiftKey
          ? flattenAllLayers(engine, history, renderer)
          : (() => {
              const activeId = engine.getActiveLayerId();
              return activeId ? mergeActiveLayerDown(engine, history, renderer, activeId) : false;
            })();

        if (actionApplied) {
          scheduler.requestRender();
        }

        return;
      }

      if (ctrl && key === "j") {
        e.preventDefault();
        e.stopPropagation();
        const activeId = engine.getActiveLayerId();
        if (activeId) {
          history.commit(engine.snapshot(), "Duplicate Layer");
          const dup = engine.duplicateLayer(activeId);
          if (dup.imageBitmap) {
            renderer.uploadImage(dup.id, dup.imageBitmap);
          }
          scheduler.requestRender();
        }
        return;
      }

      // Layer: Ctrl+Shift+N - Add new layer
      if (ctrl && e.shiftKey && key === "n") {
        e.preventDefault();
        e.stopPropagation();
        history.commit(engine.snapshot(), "New Layer");
        engine.addLayer(`Layer ${engine.getLayers().length + 1}`);
        scheduler.requestRender();
        return;
      }

      // Layer: Ctrl+] - Move active layer up in stack (towards top, index 0)
      if (ctrl && !e.shiftKey && e.key === "]") {
        e.preventDefault();
        e.stopPropagation();
        const activeId = engine.getActiveLayerId();
        if (activeId) {
          const idx = engine.getLayers().findIndex((l) => l.id === activeId);
          if (idx > 0) {
            history.commit(engine.snapshot(), "Reorder Layer");
            engine.reorderLayer(idx, idx - 1);
            scheduler.requestRender();
          }
        }
        return;
      }

      // Layer: Ctrl+[ - Move active layer down in stack (towards bottom)
      if (ctrl && !e.shiftKey && e.key === "[") {
        e.preventDefault();
        e.stopPropagation();
        const activeId = engine.getActiveLayerId();
        if (activeId) {
          const stack = engine.getLayers();
          const idx = stack.findIndex((l) => l.id === activeId);
          if (idx >= 0 && idx < stack.length - 1) {
            history.commit(engine.snapshot(), "Reorder Layer");
            engine.reorderLayer(idx, idx + 1);
            scheduler.requestRender();
          }
        }
        return;
      }

      // Layer: Ctrl+G - Flip horizontal, Ctrl+Shift+G - Flip vertical
      if (ctrl && key === "g") {
        e.preventDefault();
        e.stopPropagation();
        const activeId = engine.getActiveLayerId();
        if (activeId) {
          const layer = engine.getLayer(activeId);
          if (layer && !layer.locked) {
            history.commit(engine.snapshot(), "Flip Layer");
            engine.flipLayer(activeId, e.shiftKey ? "v" : "h");
            scheduler.requestRender();
          }
        }
        return;
      }

      // Layer: Delete / Backspace - Delete active layer
      // (Selection tool handles this earlier when in selection mode.)
      if (e.key === "Delete" || e.key === "Backspace") {
        const activeId = engine.getActiveLayerId();
        if (activeId && engine.getLayers().length > 1) {
          e.preventDefault();
          e.stopPropagation();
          history.commit(engine.snapshot(), "Delete Layer");
          engine.deleteLayer(activeId);
          scheduler.requestRender();
        }
        return;
      }

      // Layer: 0-9 (no modifier) - Set active layer opacity
      // 0 = 100%, 1 = 10%, 2 = 20%, ..., 9 = 90%
      if (!ctrl && !e.shiftKey && !e.altKey && e.key.length === 1 && e.key >= "0" && e.key <= "9") {
        const activeId = engine.getActiveLayerId();
        if (activeId) {
          const layer = engine.getLayer(activeId);
          if (layer && !layer.locked) {
            e.preventDefault();
            e.stopPropagation();
            const digit = e.key.charCodeAt(0) - 48;
            const opacity = digit === 0 ? 1.0 : digit / 10;
            if (layer.opacity === opacity) return;
            history.commit(engine.snapshot(), "Layer Opacity");
            engine.setLayerOpacity(activeId, opacity);
            scheduler.requestRender();
            return;
          }
        }
      }

      // Paint tool shortcuts
      if (!ctrl && key === "b") {
        e.preventDefault();
        setActiveTool("brush");
        scheduler.requestRender();
        return;
      }

      if (!ctrl && key === "e") {
        e.preventDefault();
        setActiveTool("eraser");
        scheduler.requestRender();
        return;
      }

      // Tool selection shortcuts
      if (!ctrl && key === "v") {
        e.preventDefault();
        setActiveTool("move");
        scheduler.requestRender();
        return;
      }

      if (!ctrl && key === "m") {
        e.preventDefault();
        setActiveTool("selection");
        scheduler.requestRender();
        return;
      }

      if (!ctrl && key === "c") {
        e.preventDefault();
        setActiveTool("crop");
        scheduler.requestRender();
        return;
      }

      if (!ctrl && key === "i") {
        e.preventDefault();
        setActiveTool("eyedropper");
        scheduler.requestRender();
        return;
      }

      if (!ctrl && (e.key === "[" || e.key === "]") && (activeTool() === "brush" || activeTool() === "eraser")) {
        e.preventDefault();
        if (e.shiftKey) {
          const delta = e.key === "[" ? -PAINT_SIZE_STEP_HARDNESS : PAINT_SIZE_STEP_HARDNESS;
          const next = adjustPaintHardness(activeTool(), {
            brushSize: brushSize(),
            brushHardness: brushHardness(),
            brushOpacity: brushOpacity(),
            brushFlow: brushFlow(),
            brushSmoothing: brushSmoothing(),
            eraserSize: eraserSize(),
            eraserHardness: eraserHardness(),
            eraserOpacity: eraserOpacity(),
            eraserFlow: eraserFlow(),
            eraserSmoothing: eraserSmoothing(),
          }, delta);
          setBrushHardness(next.brushHardness);
          setEraserHardness(next.eraserHardness);
        } else {
          const delta = e.key === "[" ? -PAINT_SIZE_STEP : PAINT_SIZE_STEP;
          const next = adjustPaintSize(activeTool(), {
            brushSize: brushSize(),
            brushHardness: brushHardness(),
            brushOpacity: brushOpacity(),
            brushFlow: brushFlow(),
            brushSmoothing: brushSmoothing(),
            eraserSize: eraserSize(),
            eraserHardness: eraserHardness(),
            eraserOpacity: eraserOpacity(),
            eraserFlow: eraserFlow(),
            eraserSmoothing: eraserSmoothing(),
          }, delta);
          setBrushSize(next.brushSize);
          setEraserSize(next.eraserSize);
        }
        scheduler.requestRender();
        return;
      }

      // Alt key tracking for eyedropper shortcut
      if (e.key === "Alt") {
        e.preventDefault();
        options.setIsAltPressed(true);
      }

      // Spacebar panning toggle
      if (e.code === "Space") {
        e.preventDefault();
        options.stopMomentum();
        if (!options.isSpacePressed()) {
          options.setIsSpacePressed(true);
        }
        return;
      }

      // Escape deselects layer in Move tool
      if (activeTool() === "move" && e.key === "Escape" && selectedLayerId()) {
        e.preventDefault();
        engine.setActiveLayer(null);
        setSelectedLayerId(null);
        scheduler.requestRender();
        return;
      }

      // Keyboard nudge for Move Tool: Arrow = 1px, Shift+Arrow = 10px
      if (activeTool() === "move" && e.key.startsWith("Arrow")) {
        const activeId = engine.getActiveLayerId();
        if (!activeId) return;
        const layer = engine.getLayer(activeId);
        if (!layer || layer.locked) return;

        e.preventDefault();
        const step = e.shiftKey ? 10 : 1;
        let dx = 0, dy = 0;
        if (e.key === "ArrowUp") dy = -step;
        else if (e.key === "ArrowDown") dy = step;
        else if (e.key === "ArrowLeft") dx = -step;
        else if (e.key === "ArrowRight") dx = step;

        if (!e.repeat) {
          history.commit(engine.snapshot(), "Move Layer");
        }
        engine.moveLayer(activeId, layer.transform.x + dx, layer.transform.y + dy);
        scheduler.requestRender();
        return;
      }

      // Zoom Shortcuts: Ctrl + Plus / Equal
      // NOTE: Handled by useEditorCommands.ts with animation
      /*
      if (
        ctrl &&
        (key === "=" ||
          key === "+" ||
          e.code === "Equal" ||
          e.code === "NumpadAdd")
      ) {
        e.preventDefault();
        e.stopPropagation();
        options.stopMomentum();

        const canvasContainerRef = options.getCanvasContainerRef();
        if (canvasContainerRef) {
          const rect = canvasContainerRef.getBoundingClientRect();
          const centerX = rect.width / 2;
          const centerY = rect.height / 2;
          camera.zoomToPoint(1.25, centerX, centerY);
          syncFromCamera();
          scheduler.requestRender();
        }
        return;
      }
      */

      // Zoom Shortcuts: Ctrl + Minus
      // NOTE: Handled by useEditorCommands.ts with animation
      /*
      if (
        ctrl &&
        (key === "-" || e.code === "Minus" || e.code === "NumpadSubtract")
      ) {
        e.preventDefault();
        e.stopPropagation();
        options.stopMomentum();

        const canvasContainerRef = options.getCanvasContainerRef();
        if (canvasContainerRef) {
          const rect = canvasContainerRef.getBoundingClientRect();
          const centerX = rect.width / 2;
          const centerY = rect.height / 2;
          camera.zoomToPoint(0.8, centerX, centerY);
          syncFromCamera();
          scheduler.requestRender();
        }
        return;
      }
      */

      // Fit Screen Shortcuts: Ctrl + 0
      if (
        ctrl &&
        (key === "0" || e.code === "Digit0" || e.code === "Numpad0")
      ) {
        e.preventDefault();
        e.stopPropagation();
        options.stopMomentum();
        options.fitToScreenAndRender(false);
        return;
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code === "Space") {
        options.setIsSpacePressed(false);
      }
      if (e.key === "Alt") {
        options.setIsAltPressed(false);
      }
    };

    const handleWindowBlur = () => {
      options.setIsSpacePressed(false);
      options.setIsPanning(false);
      options.setIsAltPressed(false);
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);
    window.addEventListener("blur", handleWindowBlur);

    onCleanup(() => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
      window.removeEventListener("blur", handleWindowBlur);
    });
  });
}
