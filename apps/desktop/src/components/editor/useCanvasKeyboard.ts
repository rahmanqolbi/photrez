import { onMount, onCleanup } from "solid-js";
import { constrainCropRectToDocument } from "@/viewport/cropGeometry";
import { getModernCropApplyRotation, modernFrameToCropRect } from "@/viewport/modernCropGeometry";
import type { ToolType } from "@/viewport/input-handler";
import { useEditor } from "./EditorContext";
import { flattenAllLayers, mergeActiveLayerDown } from "./layerOperations";
import { cancelLayerTransformSession, commitLayerTransformSession } from "./transformSession";
import { discardCropSession, applyCropPreview } from "./cropToolActions";
import { PAINT_SIZE_STEP, PAINT_SIZE_STEP_HARDNESS, adjustPaintSize, adjustPaintHardness } from "./brushToolState";

interface CanvasKeyboardOptions {
  isSpacePressed: () => boolean;
  setIsSpacePressed: (pressed: boolean) => void;
  isAltPressed: () => boolean;
  setIsAltPressed: (pressed: boolean) => void;
  isPanning: () => boolean;
  setIsPanning: (panning: boolean) => void;
  stopMomentum: () => void;
  fitToScreenAndRender: () => void;
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
    modernCropFrame,
    modernCropImageTransform,
    setModernCropImageTransform,
    resetModernCrop,
    viewportWidth,
    viewportHeight,
    pan,
    layerTransformSession,
    setLayerTransformSession,
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
  } = useEditor();

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

      options.stopMomentum();

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
              cropRect: rect,
              cropMode: cropMode(),
              cropSizeTarget: cropSizeTarget(),
              cropDeletePixels: cropDeletePixels(),
              cropRotation: getModernCropApplyRotation(modernCropImageTransform().rotation),
              scheduler,
              setCropRect, setCropRotation, setHiddenCropPreview, setActiveTool,
              recenterViewport: options.fitToScreenAndRender,
            });
            resetModernCrop();
          } else {
            applyCropPreview({
              workspace,
              renderer,
              cropRect: cropRect(),
              cropMode: cropMode(),
              cropSizeTarget: cropSizeTarget(),
              cropDeletePixels: cropDeletePixels(),
              cropRotation: cropRotation(),
              scheduler,
              setCropRect,
              setCropRotation,
              setHiddenCropPreview,
              setActiveTool,
              recenterViewport: options.fitToScreenAndRender,
            });
          }
          return;
        }
        if (e.key === "Escape") {
          e.preventDefault();
          if (cropInteractionMode() === "modern") {
            resetModernCrop();
          } else {
            discardCropSession({
              cropRect: () => cropRect(),
              cropRotation: () => cropRotation(),
              hiddenCropPreview,
              setCropRect,
              setCropRotation,
              setHiddenCropPreview,
            });
          }
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

            const vp = engine.getViewport();
            engine.setViewport({
              panX: vp.panX - actualDx * zoom(),
              panY: vp.panY - actualDy * zoom(),
            });
            options.syncViewport();
          }
          scheduler.requestRender();
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
          history.commit(engine.snapshot());
          const dup = engine.duplicateLayer(activeId);
          if (dup.imageBitmap) {
            renderer.uploadImage(dup.id, dup.imageBitmap);
          }
          scheduler.requestRender();
        }
        return;
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
          history.commit(engine.snapshot());
        }
        engine.moveLayer(activeId, layer.transform.x + dx, layer.transform.y + dy);
        scheduler.requestRender();
        return;
      }

      // Zoom Shortcuts: Ctrl + Plus / Equal
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
          engine.zoom(1.2, rect.width / 2, rect.height / 2);
          options.syncViewport();
          scheduler.requestRender();
        }
        return;
      }

      // Zoom Shortcuts: Ctrl + Minus
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
          engine.zoom(0.8, rect.width / 2, rect.height / 2);
          options.syncViewport();
          scheduler.requestRender();
        }
        return;
      }

      // Fit Screen Shortcuts: Ctrl + 0
      if (
        ctrl &&
        (key === "0" || e.code === "Digit0" || e.code === "Numpad0")
      ) {
        e.preventDefault();
        e.stopPropagation();
        options.stopMomentum();
        options.fitToScreenAndRender();
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
