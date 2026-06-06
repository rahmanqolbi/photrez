import { onMount, onCleanup } from "solid-js";
import { constrainCropRectToDocument } from "@/viewport/cropGeometry";
import type { ToolType } from "@/viewport/input-handler";
import { useEditor } from "./EditorContext";
import { flattenAllLayers, mergeActiveLayerDown } from "./layerOperations";
import { cancelLayerTransformSession, commitLayerTransformSession } from "./transformSession";
import { discardCropSession, applyCropPreview } from "./cropToolActions";
import { PAINT_SIZE_STEP, adjustPaintSize } from "./brushToolState";

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
    cropDeletePixels,
    layerTransformSession,
    setLayerTransformSession,
    brushSize,
    setBrushSize,
    eraserSize,
    setEraserSize,
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
        if (e.key === "Enter") {
          e.preventDefault();
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
          });
          return;
        }
        if (e.key === "Escape") {
          e.preventDefault();
          discardCropSession({
            cropRect: () => cropRect(),
            cropRotation: () => cropRotation(),
            hiddenCropPreview,
            setCropRect,
            setCropRotation,
            setHiddenCropPreview,
          });
          return;
        }
        if (e.key.startsWith("Arrow") && cropRect()) {
          e.preventDefault();
          const step = e.shiftKey ? 10 : 1;
          let dx = 0;
          let dy = 0;
          if (e.key === "ArrowUp") dy = -step;
          else if (e.key === "ArrowDown") dy = step;
          else if (e.key === "ArrowLeft") dx = -step;
          else if (e.key === "ArrowRight") dx = step;

          const rect = cropRect()!;
          const newRect = constrainCropRectToDocument(
            { ...rect, x: rect.x + dx, y: rect.y + dy },
            docWidth(),
            docHeight()
          );

          // Re-calculate actual offset delta (in case constraints blocked it)
          const actualDx = newRect.x - rect.x;
          const actualDy = newRect.y - rect.y;

          setCropRect(newRect);

          // Pan viewport in opposite direction so the crop box remains visually stationary
          const vp = engine.getViewport();
          engine.setViewport({
            panX: vp.panX - actualDx * zoom(),
            panY: vp.panY - actualDy * zoom(),
          });
          options.syncViewport();
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
        const delta = e.key === "[" ? -PAINT_SIZE_STEP : PAINT_SIZE_STEP;
        const next = adjustPaintSize(activeTool(), {
          brushSize: brushSize(),
          brushHardness: 1,
          brushOpacity: 1,
          brushFlow: 1,
          brushSmoothing: 0,
          eraserSize: eraserSize(),
          eraserHardness: 1,
          eraserOpacity: 1,
          eraserFlow: 1,
          eraserSmoothing: 0,
        }, delta);
        setBrushSize(next.brushSize);
        setEraserSize(next.eraserSize);
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
