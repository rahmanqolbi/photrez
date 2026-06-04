import { useEditor } from "./EditorContext";
import { flattenAllLayers, mergeActiveLayerDown } from "./layerOperations";

export function useLayerActions() {
  const {
    workspace,
    renderer,
    layers,
    activeLayerId,
    scheduler,
  } = useEditor();

  const handleDuplicateActiveLayer = () => {
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
  };

  const handleToggleVisibility = (e: MouseEvent, id: string) => {
    e.stopPropagation();
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
    const engine = workspace.getActiveEngine();
    const history = workspace.getActiveHistory();
    if (engine && history) {
      history.commit(engine.snapshot());
      engine.addLayer(`Layer ${engine.getLayers().length + 1}`);
      scheduler.requestRender();
    }
  };

  const handleDeleteActiveLayer = () => {
    const engine = workspace.getActiveEngine();
    const history = workspace.getActiveHistory();
    const activeId = activeLayerId();
    if (engine && history && activeId) {
      if (engine.getLayers().length <= 1) return; // prevent last
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
