import { useEditor } from "./EditorContext";
import { flattenAllLayers, mergeActiveLayerDown } from "./layerOperations";
import { cancelLayerTransformSession } from "./transformSession";

export function useLayerActions() {
  const {
    workspace,
    renderer,
    layers,
    activeLayerId,
    scheduler,
    layerTransformSession,
    setLayerTransformSession,
    setSelectedLayerId,
  } = useEditor();

  const cancelActiveTransformSession = () => {
    const engine = workspace.getActiveEngine();
    if (cancelLayerTransformSession(layerTransformSession(), engine)) {
      setLayerTransformSession(null);
      scheduler.requestRender();
    }
  };

  const handleDuplicateActiveLayer = () => {
    cancelActiveTransformSession();
    const engine = workspace.getActiveEngine();
    const history = workspace.getActiveHistory();
    const activeId = activeLayerId();
    if (engine && history && activeId) {
      history.commit(engine.snapshot());
      const dup = engine.duplicateLayer(activeId);
      if (dup.imageBitmap) {
        renderer.uploadImage(dup.id, dup.imageBitmap);
      }
      scheduler.requestRender();
    }
  };

  const handleMergeActiveLayerDown = () => {
    cancelActiveTransformSession();
    const engine = workspace.getActiveEngine();
    const history = workspace.getActiveHistory();
    const activeId = activeLayerId();
    if (engine && history && activeId) {
      if (mergeActiveLayerDown(engine, history, renderer, activeId)) {
        scheduler.requestRender();
      }
    }
  };

  const handleFlattenAllLayers = () => {
    cancelActiveTransformSession();
    const engine = workspace.getActiveEngine();
    const history = workspace.getActiveHistory();
    if (engine && history) {
      if (flattenAllLayers(engine, history, renderer)) {
        scheduler.requestRender();
      }
    }
  };

  const handleSelectLayer = (id: string) => {
    const engine = workspace.getActiveEngine();
    engine?.setActiveLayer(id);
    setSelectedLayerId(id);
  };

  const handleToggleVisibility = (e: MouseEvent, id: string) => {
    e.stopPropagation();
    cancelActiveTransformSession();
    const engine = workspace.getActiveEngine();
    const layer = engine?.getLayer(id);
    if (engine && layer) {
      const history = workspace.getActiveHistory();
      history?.commit(engine.snapshot());
      engine.setLayerVisibility(id, !layer.visible);
      scheduler.requestRender();
    }
  };

  const handleToggleLock = (e: MouseEvent, id: string) => {
    e.stopPropagation();
    cancelActiveTransformSession();
    const engine = workspace.getActiveEngine();
    const layer = engine?.getLayer(id);
    if (engine && layer) {
      const history = workspace.getActiveHistory();
      history?.commit(engine.snapshot());
      engine.setLayerLocked(id, !layer.locked);
      scheduler.requestRender();
    }
  };

  const handleToggleLockTransparency = (e: MouseEvent, id: string) => {
    e.stopPropagation();
    cancelActiveTransformSession();
    const engine = workspace.getActiveEngine();
    const layer = engine?.getLayer(id);
    if (engine && layer) {
      const history = workspace.getActiveHistory();
      history?.commit(engine.snapshot());
      engine.setLayerLockTransparency(id, !layer.lockTransparency);
      scheduler.requestRender();
    }
  };

  const handleToggleLockPosition = (e: MouseEvent, id: string) => {
    e.stopPropagation();
    cancelActiveTransformSession();
    const engine = workspace.getActiveEngine();
    const layer = engine?.getLayer(id);
    if (engine && layer) {
      const history = workspace.getActiveHistory();
      history?.commit(engine.snapshot());
      engine.setLayerLockPosition(id, !layer.lockPosition);
      scheduler.requestRender();
    }
  };

  const handleToggleLockRotation = (e: MouseEvent, id: string) => {
    e.stopPropagation();
    cancelActiveTransformSession();
    const engine = workspace.getActiveEngine();
    const layer = engine?.getLayer(id);
    if (engine && layer) {
      const history = workspace.getActiveHistory();
      history?.commit(engine.snapshot());
      engine.setLayerLockRotation(id, !layer.lockRotation);
      scheduler.requestRender();
    }
  };

  const handleMoveUp = (e: MouseEvent, index: number) => {
    e.stopPropagation();
    cancelActiveTransformSession();
    if (index > 0) {
      const engine = workspace.getActiveEngine();
      const history = workspace.getActiveHistory();
      if (engine && history) {
        history.commit(engine.snapshot());
        engine.reorderLayer(index, index - 1);
        scheduler.requestRender();
      }
    }
  };

  const handleMoveDown = (e: MouseEvent, index: number) => {
    e.stopPropagation();
    cancelActiveTransformSession();
    if (index < layers().length - 1) {
      const engine = workspace.getActiveEngine();
      const history = workspace.getActiveHistory();
      if (engine && history) {
        history.commit(engine.snapshot());
        engine.reorderLayer(index, index + 1);
        scheduler.requestRender();
      }
    }
  };

  const handleAddLayer = () => {
    cancelActiveTransformSession();
    const engine = workspace.getActiveEngine();
    const history = workspace.getActiveHistory();
    if (engine && history) {
      history.commit(engine.snapshot());
      engine.addLayer(`Layer ${engine.getLayers().length + 1}`);
      scheduler.requestRender();
    }
  };

  const handleDeleteActiveLayer = () => {
    cancelActiveTransformSession();
    const engine = workspace.getActiveEngine();
    const history = workspace.getActiveHistory();
    const activeId = activeLayerId();
    if (engine && history && activeId) {
      if (engine.getLayers().length <= 1) return;
      const layer = engine.getLayer(activeId);
      const name = layer?.name || "Untitled";
      if (!confirm(`Delete layer "${name}"? This can be undone.`)) return;
      history.commit(engine.snapshot());
      engine.deleteLayer(activeId);
      scheduler.requestRender();
    }
  };

  return {
    handleDuplicateActiveLayer,
    handleMergeActiveLayerDown,
    handleFlattenAllLayers,
    handleSelectLayer,
    handleToggleVisibility,
    handleToggleLock,
    handleToggleLockTransparency,
    handleToggleLockPosition,
    handleToggleLockRotation,
    handleMoveUp,
    handleMoveDown,
    handleAddLayer,
    handleDeleteActiveLayer,
  };
}
