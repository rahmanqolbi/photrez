import { useEditor } from "./EditorContext";
import { flattenAllLayers, mergeActiveLayerDown } from "./layerOperations";
import { cancelLayerTransformSession } from "./transformSession";
import { useDialog } from "./DialogProvider";

export function useLayerActions() {
  const dialog = useDialog();
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
      history.commit(engine.snapshot(), "Duplicate Layer");
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
      history?.commit(engine.snapshot(), "Toggle Visibility");
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
      history?.commit(engine.snapshot(), "Toggle Lock");
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
      history?.commit(engine.snapshot(), "Toggle Lock");
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
      history?.commit(engine.snapshot(), "Toggle Lock");
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
      history?.commit(engine.snapshot(), "Toggle Lock");
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
        history.commit(engine.snapshot(), "Reorder Layer");
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
        history.commit(engine.snapshot(), "Reorder Layer");
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
      history.commit(engine.snapshot(), "New Layer");
      engine.addLayer(`Layer ${engine.getLayers().length + 1}`);
      scheduler.requestRender();
    }
  };

  const handleDeleteActiveLayer = async () => {
    cancelActiveTransformSession();
    const engine = workspace.getActiveEngine();
    const activeId = activeLayerId();
    const documentId = workspace.getActiveDocumentId();
    if (engine && activeId && documentId) {
      if (engine.getLayers().length <= 1) return;
      const layer = engine.getLayer(activeId);
      const name = layer?.name || "Untitled";
      const accepted = await dialog.confirm({
        title: "Delete Layer",
        message: `Delete layer "${name}"? This action can be undone.`,
        confirmLabel: "Delete",
        tone: "danger",
      });
      if (!accepted || workspace.getActiveDocumentId() !== documentId) return;
      const currentEngine = workspace.getActiveEngine();
      const currentHistory = workspace.getActiveHistory();
      if (
        !currentEngine
        || !currentHistory
        || currentEngine.getActiveLayerId() !== activeId
        || currentEngine.getLayers().length <= 1
        || !currentEngine.getLayer(activeId)
      ) return;
      currentHistory.commit(currentEngine.snapshot(), "Delete Layer");
      currentEngine.deleteLayer(activeId);
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
