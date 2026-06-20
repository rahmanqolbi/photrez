import { For, Show, createSignal, createEffect } from "solid-js";
import { clsx } from "clsx";
import fjord from "@/assets/fjord.jpg";
import { Icon } from "./icons";
import { useEditor } from "./EditorContext";
import { useDragController } from "./DragController";
import { addLayerFromCrossDoc, addFilesAsLayers } from "./crossDocLayerOps";
import { LayerNode } from "@/engine/types";
import type { DocumentModel } from "@/engine/types";
import { BLEND_MODE_OPTIONS, isBlendMode } from "@/engine/blendModes";
import { Navigator } from "./Navigator";
import { LayerItem } from "./LayerItem";
import { useLayerDragReorder } from "./useLayerDragReorder";
import { useLayerActions } from "./useLayerActions";
import { cancelLayerTransformSession } from "./transformSession";

export function LayersPanel() {
  const {
    workspace,
    renderer,
    layers,
    activeLayerId,
    selectedLayerId,
    scheduler,
    zoom,
    pan,
    setViewportState,
    activeDocumentId,
    syncViewport,
    layerTransformSession,
    setLayerTransformSession
  } = useEditor();

  const dragController = useDragController();

  const [showOpacitySlider, setShowOpacitySlider] = createSignal(false);
  const [opacityHistorySnapshot, setOpacityHistorySnapshot] = createSignal<DocumentModel | null>(null);
  const [activePanel, setActivePanel] = createSignal<"layers" | "history">("layers");

  const [editingLayerId, setEditingLayerId] = createSignal<string | null>(null);
  const [editName, setEditName] = createSignal("");
  const [navigatorCollapsed, setNavigatorCollapsed] = createSignal(false);

  const activeLayer = () => {
    const id = activeLayerId();
    if (!id) return null;
    return layers().find(l => l.id === id) || null;
  };

  const {
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
  } = useLayerActions();

  // ─── Pointer-based Drag Reorder (replaces HTML5 DnD for Tauri compatibility) ───
  const {
    draggedIndex,
    dragOverIndex,
    dropPosition,
    handlePointerDragStart,
    setLayerListRef,
  } = useLayerDragReorder();

  const historyStats = () => {
    activeDocumentId();
    layers();
    const history = workspace.getActiveHistory();
    return {
      undo: history?.getUndoCount() ?? 0,
      redo: history?.getRedoCount() ?? 0,
      canUndo: history?.canUndo() ?? false,
      canRedo: history?.canRedo() ?? false,
    };
  };

  const cancelActiveTransformSession = () => {
    const engine = workspace.getActiveEngine();
    if (cancelLayerTransformSession(layerTransformSession(), engine)) {
      setLayerTransformSession(null);
      scheduler.requestRender();
    }
  };

  const uploadCurrentLayerTextures = () => {
    const engine = workspace.getActiveEngine();
    if (!engine) return;
    for (const layer of engine.getLayers()) {
      if (layer.imageBitmap) {
        renderer.uploadImage(layer.id, layer.imageBitmap);
      }
    }
  };

  const handleHistoryUndo = () => {
    if (layerTransformSession()) {
      cancelActiveTransformSession();
    }
    const engine = workspace.getActiveEngine();
    const history = workspace.getActiveHistory();
    if (!engine || !history || !history.canUndo()) return;
    const previous = history.undo(engine.snapshot());
    if (!previous) return;
    // Default behavior preserves the user's current viewport (zoom/pan) so
    // undo/redo don't cause zoom-popping (per docs/AI_HISTORY.md 2026-06-11
    // fix). The drawing buffer is sized to the container via
    // renderer.resizeToViewport() and stays valid for the restored state.
    engine.restore(previous);
    uploadCurrentLayerTextures();
    scheduler.requestRender();
  };

  const handleHistoryRedo = () => {
    if (layerTransformSession()) {
      cancelActiveTransformSession();
    }
    const engine = workspace.getActiveEngine();
    const history = workspace.getActiveHistory();
    if (!engine || !history || !history.canRedo()) return;
    const next = history.redo(engine.snapshot());
    if (!next) return;
    engine.restore(next);
    uploadCurrentLayerTextures();
    scheduler.requestRender();
  };



  return (
    <section class="flex flex-1 shrink-0 flex-col overflow-hidden bg-editor-panel">
      <div class="flex h-[46px] shrink-0 border-b border-editor-divider">
        <button
          onClick={() => setActivePanel("layers")}
          class={clsx(
            "relative flex h-full items-center px-6 text-[12px] font-medium transition-colors",
            activePanel() === "layers"
              ? "text-editor-text after:absolute after:bottom-0 after:inset-x-0 after:h-[2px] after:bg-editor-text-dim"
              : "text-editor-text-dim hover:bg-white/[0.02] hover:text-editor-text"
          )}
        >
          Layers
        </button>
        <button
          onClick={() => setActivePanel("history")}
          class={clsx(
            "relative flex h-full items-center px-6 text-[12px] font-medium transition-colors",
            activePanel() === "history"
              ? "text-editor-text after:absolute after:bottom-0 after:inset-x-0 after:h-[2px] after:bg-editor-text-dim"
              : "text-editor-text-dim hover:bg-white/[0.02] hover:text-editor-text"
          )}
        >
          History
        </button>
      </div>

      <Show when={activePanel() === "history"}>
        <div class={clsx("flex flex-1 flex-col overflow-hidden", !activeDocumentId() && "opacity-50 pointer-events-none")}>
          <div class="grid grid-cols-2 gap-2 border-b border-editor-divider px-3.5 py-3">
            <div class="rounded-[4px] border border-editor-divider/70 bg-editor-field px-3 py-2">
              <div class="text-[11px] uppercase tracking-wide text-editor-text-dim">Undo steps</div>
              <div class="mt-1 font-mono text-[18px] text-editor-text">{historyStats().undo}</div>
            </div>
            <div class="rounded-[4px] border border-editor-divider/70 bg-editor-field px-3 py-2">
              <div class="text-[11px] uppercase tracking-wide text-editor-text-dim">Redo steps</div>
              <div class="mt-1 font-mono text-[18px] text-editor-text">{historyStats().redo}</div>
            </div>
          </div>
          <div class="flex gap-2 border-b border-editor-divider px-3.5 py-3">
            <button
              disabled={!historyStats().canUndo}
              onClick={handleHistoryUndo}
              class="h-[28px] flex-1 rounded-[4px] border border-editor-field-border bg-editor-field text-[12px] text-editor-text hover:bg-white/[0.045] disabled:opacity-40"
            >
              Undo
            </button>
            <button
              disabled={!historyStats().canRedo}
              onClick={handleHistoryRedo}
              class="h-[28px] flex-1 rounded-[4px] border border-editor-field-border bg-editor-field text-[12px] text-editor-text hover:bg-white/[0.045] disabled:opacity-40"
            >
              Redo
            </button>
          </div>
          <div class="flex flex-1 items-center justify-center px-4 text-center text-[12px] leading-snug text-editor-text-dim">
            Snapshot history is available for layer edits and canvas operations.
          </div>
        </div>
      </Show>

      <Show when={activePanel() === "layers"}>
      <div class={clsx("flex items-center gap-2 px-3.5 pt-3 relative", !activeDocumentId() && "opacity-50 pointer-events-none")}>
        <select
          disabled={!activeLayer() || activeLayer()!.locked}
          value={activeLayer()?.blendMode || "normal"}
          onChange={(e) => {
            const engine = workspace.getActiveEngine();
            const id = activeLayerId();
            const mode = e.currentTarget.value;
            if (!isBlendMode(mode) || activeLayer()?.blendMode === mode) return;

            if (engine && id) {
              if (layerTransformSession()) {
                cancelActiveTransformSession();
              }
              const history = workspace.getActiveHistory();
              history?.commit(engine.snapshot());
              engine.setLayerBlendMode(id, mode);
              scheduler.requestRender();
            }
          }}
          class="h-[26px] w-[120px] rounded-[4px] border border-editor-field-border bg-editor-field px-2 text-[12px] text-editor-text focus:outline-none focus-visible:border-editor-accent"
        >
          <For each={BLEND_MODE_OPTIONS}>
            {(option) => <option value={option.value}>{option.label}</option>}
          </For>
        </select>

        <div class="relative ml-auto flex items-center">
          <button
            data-layer-opacity-toggle
            disabled={!activeLayer()}
            onClick={() => setShowOpacitySlider(!showOpacitySlider())}
            class="flex items-center gap-1 hover:text-editor-text transition-colors text-editor-text-dim disabled:opacity-50"
          >
            <span class="text-[12px]">Opacity</span>
            <span class="text-[12px] font-medium text-editor-text">
              {activeLayer() ? Math.round(activeLayer()!.opacity * 100) : 100}%
            </span>
            <Icon name="chevron-down" class="size-3.5" strokeWidth={1.75} />
          </button>

          <Show when={showOpacitySlider()}>
            <div class="fixed inset-0 z-40" onClick={() => setShowOpacitySlider(false)} />
            <div class="absolute right-0 top-[30px] z-50 flex w-[150px] flex-col gap-2 rounded-[6px] border border-editor-divider bg-editor-panel p-3 shadow-[0_4px_12px_rgba(0,0,0,0.5)]">
              <div class="flex items-center justify-between text-[11px] text-editor-text-dim">
                <span>Opacity</span>
                <span class="font-mono text-editor-text">
                  {activeLayer() ? Math.round(activeLayer()!.opacity * 100) : 100}%
                </span>
              </div>
              <input
                data-layer-opacity
                type="range"
                min="0"
                max="100"
                disabled={activeLayer()?.locked}
                value={activeLayer() ? Math.round(activeLayer()!.opacity * 100) : 100}
                onInput={(e) => {
                  const engine = workspace.getActiveEngine();
                  const id = activeLayerId();
                  if (engine && id) {
                    if (layerTransformSession()) {
                      cancelActiveTransformSession();
                    }
                    if (!opacityHistorySnapshot()) {
                      setOpacityHistorySnapshot(engine.snapshot());
                    }
                    engine.setLayerOpacity(id, parseInt(e.target.value) / 100);
                    scheduler.requestRender();
                  }
                }}
                onChange={() => {
                  const history = workspace.getActiveHistory();
                  const snapshot = opacityHistorySnapshot();
                  if (history && snapshot) {
                    history.commit(snapshot);
                    setOpacityHistorySnapshot(null);
                  }
                }}
                class="h-[3px] w-full accent-editor-accent bg-editor-field-border rounded-full appearance-none cursor-pointer"
              />
            </div>
          </Show>
        </div>
      </div>

      <div class={clsx("flex items-center gap-4 px-3.5 py-3", !activeDocumentId() && "opacity-50 pointer-events-none")}>
        <span class="text-[12px] text-editor-text-dim">Lock:</span>
        <div class="flex items-center gap-4 text-editor-icon">
          <button
            disabled={!activeLayer()}
            onClick={(e) => activeLayer() && handleToggleLock(e, activeLayer()!.id)}
            class={clsx(
              "hover:text-editor-text transition-colors flex items-center justify-center size-4",
              activeLayer()?.locked ? "text-editor-accent" : "text-editor-text-dim"
            )}
            title={activeLayer()?.locked ? "Unlock layer" : "Lock layer"}
          >
            <Icon name={activeLayer()?.locked ? "lock" : "unlock"} class="size-[15px]" strokeWidth={1.75} />
          </button>
          <button
            disabled={!activeLayer() || activeLayer()?.locked}
            onClick={(e) => activeLayer() && handleToggleLockTransparency(e, activeLayer()!.id)}
            class={clsx(
              "hover:text-editor-text transition-colors flex items-center justify-center size-4 disabled:opacity-30",
              activeLayer()?.lockTransparency ? "text-editor-accent" : "text-editor-text-dim"
            )}
            title={activeLayer()?.lockTransparency ? "Unlock Transparency" : "Lock Transparency"}
          >
            <Icon name="paint-bucket" class="size-[15px]" strokeWidth={1.75} />
          </button>
          <button
            disabled={!activeLayer() || activeLayer()?.locked}
            onClick={(e) => activeLayer() && handleToggleLockPosition(e, activeLayer()!.id)}
            class={clsx(
              "hover:text-editor-text transition-colors flex items-center justify-center size-4 disabled:opacity-30",
              activeLayer()?.lockPosition ? "text-editor-accent" : "text-editor-text-dim"
            )}
            title={activeLayer()?.lockPosition ? "Unlock Position" : "Lock Position"}
          >
            <Icon name="maximize" class="size-[15px]" strokeWidth={1.75} />
          </button>
          <button
            disabled={!activeLayer() || activeLayer()?.locked}
            onClick={(e) => activeLayer() && handleToggleLockRotation(e, activeLayer()!.id)}
            class={clsx(
              "hover:text-editor-text transition-colors flex items-center justify-center size-4 disabled:opacity-30",
              activeLayer()?.lockRotation ? "text-editor-accent" : "text-editor-text-dim"
            )}
            title={activeLayer()?.lockRotation ? "Unlock Rotation" : "Lock Rotation"}
          >
            <Icon name="rotate" class="size-[15px]" strokeWidth={1.75} />
          </button>
        </div>
      </div>

      {/* Dynamic Layer Stack List */}
      <div
        ref={setLayerListRef}
        data-layers-panel-drop-zone
        data-drag-over={dragController.state().dropTarget?.type === "layers-panel" ? "layers-panel" : null}
        onDragOver={(e) => {
          if (dragController.state().dragKind === null) return;
          e.preventDefault();
          dragController.setDropTarget({ type: "layers-panel" });
          dragController.cancelTabHover();
        }}
        onDragLeave={(e) => {
          const target = e.currentTarget;
          if (target && target instanceof Element && target.contains(e.relatedTarget as Node)) return;
          if (dragController.state().dropTarget?.type === "layers-panel") {
            dragController.setDropTarget(null);
          }
        }}
        onDrop={async (e) => {
          e.preventDefault();
          const state = dragController.state();
          if (state.dragKind === "layer" && state.payload) {
            addLayerFromCrossDoc(state.payload, { type: "layers-panel" }, { x: 0, y: 0 }, workspace);
          } else if (state.dragKind === "file" && state.filePaths) {
            const created = await addFilesAsLayers(state.filePaths, { type: "layers-panel" }, { x: 0, y: 0 }, workspace);
            for (const { layerId, bitmap } of created) {
              renderer.uploadImage(layerId, bitmap);
            }
            if (created.length) scheduler.requestRender();
          }
          dragController.endDrag();
        }}
        class="flex-1 overflow-y-auto border-y border-editor-divider touch-auto"
      >
        <Show
          when={activeDocumentId()}
          fallback={
            <div class="flex h-full flex-col items-center justify-center p-4">
              <div class="flex w-full flex-1 flex-col items-center justify-center gap-3 rounded-lg border border-dashed border-editor-divider/50 text-center">
                <Icon name="layers" class="size-6 text-editor-text-dim opacity-50" strokeWidth={1.5} />
                <div class="space-y-1">
                  <p class="text-[13px] font-medium text-editor-text">No layers yet</p>
                  <p class="text-[12px] text-editor-text-dim leading-snug">Add an image to get started.</p>
                </div>
              </div>
            </div>
          }
        >
          <For each={layers()}>
            {(layer, idx) => (
              <LayerItem
                layer={layer}
                idx={idx()}
                isActive={selectedLayerId() === layer.id}
                isDragged={draggedIndex() === idx()}
                isDragOver={dragOverIndex() === idx()}
                dropPosition={dropPosition()}
                isEditing={editingLayerId() === layer.id}
                editName={editName()}
                setEditingLayerId={setEditingLayerId}
                setEditName={setEditName}
                onSelect={handleSelectLayer}
                onPointerDragStart={handlePointerDragStart}
                onToggleVisibility={handleToggleVisibility}
                onToggleLock={handleToggleLock}
                onMoveUp={handleMoveUp}
                onMoveDown={handleMoveDown}
                layersLength={layers().length}
                workspace={workspace}
                scheduler={scheduler}
                activeDocumentId={activeDocumentId() ?? ""}
              />
            )}
          </For>
        </Show>
      </div>

      {/* Layer Actions footer */}
      <div class={clsx("flex shrink-0 items-center gap-5 border-t border-editor-divider bg-editor-panel px-4 py-2.5 text-editor-icon", !activeDocumentId() && "opacity-50 pointer-events-none")}>
        <button onClick={handleAddLayer} class="hover:text-editor-text" title="New Layer">
          <Icon name="plus" class="size-[17px]" strokeWidth={1.75} />
        </button>
        <button
          onClick={handleDuplicateActiveLayer}
          disabled={!activeLayer()}
          class="hover:text-editor-text disabled:opacity-30"
          title="Duplicate Layer"
        >
          <Icon name="copy" class="size-[17px]" strokeWidth={1.75} />
        </button>
        <button
          onClick={handleMergeActiveLayerDown}
          disabled={!activeLayer() || layers().indexOf(activeLayer()!) === layers().length - 1}
          class="hover:text-editor-text disabled:opacity-30"
          title="Merge Down"
        >
          <Icon name="chevron-down" class="size-[17px]" strokeWidth={1.75} />
        </button>
        <button
          onClick={handleFlattenAllLayers}
          disabled={layers().length <= 1}
          class="hover:text-editor-text disabled:opacity-30"
          title="Flatten All Layers"
        >
          <Icon name="square-dashed" class="size-[17px]" strokeWidth={1.75} />
        </button>
        <button
          disabled={layers().length <= 1}
          onClick={handleDeleteActiveLayer}
          class="ml-auto hover:text-editor-accent disabled:opacity-30 disabled:hover:text-editor-icon"
          title="Delete Layer"
        >
          <Icon name="trash" class="size-[17px]" strokeWidth={1.75} />
        </button>
      </div>

      {/* Navigator panel */}
      <div class="shrink-0 border-t border-editor-divider bg-editor-panel">
        <div 
          class={clsx(
            "flex h-[46px] items-center justify-between px-4",
            !navigatorCollapsed() && "border-b border-editor-divider"
          )}
        >
          <button
            onClick={() => setNavigatorCollapsed(!navigatorCollapsed())}
            class="flex items-center gap-1.5 text-[13px] font-medium text-editor-text hover:text-editor-text-dim transition-colors"
          >
            <Icon
              name={navigatorCollapsed() ? "chevron-right" : "chevron-down"}
              class="size-3.5 text-editor-text-dim"
              strokeWidth={1.75}
            />
            <span>Navigator</span>
          </button>
          <Show when={!navigatorCollapsed()}>
            <button
              onClick={() => {
                const engine = workspace.getActiveEngine();
                if (engine) {
                  // Find main canvas container element to get container dimensions
                  const container = document.getElementById("canvas-container");
                  const rect = container?.getBoundingClientRect();
                  if (rect) {
                    engine.fitToScreen(rect.width, rect.height);
                    syncViewport();
                    const dpr = window.devicePixelRatio || 1;
                    renderer.resizeToViewport(rect.width, rect.height, dpr);
                    scheduler.requestRender();
                  }
                }
              }}
              class="text-editor-text-dim hover:text-editor-text transition-colors p-1 rounded hover:bg-white/5"
              title="Fit Screen"
            >
              <Icon name="maximize" class="size-3.5" strokeWidth={1.75} />
            </button>
          </Show>
        </div>
        
        <Show when={!navigatorCollapsed()}>
          <Navigator />

          <div class={clsx("flex items-center gap-2.5 px-4 py-3", !activeDocumentId() && "opacity-50 pointer-events-none")}>
            <button 
              onClick={() => {
                const engine = workspace.getActiveEngine();
                if (engine) {
                  setViewportState({
                    x: pan().x,
                    y: pan().y,
                    zoom: Math.max(0.05, zoom() - 0.1),
                  });
                  scheduler.requestRender();
                }
              }}
              class="text-[12px] text-editor-text-dim hover:text-editor-text px-1"
            >
              -
            </button>
            <input
              type="range"
              min="5"
              max="400"
              value={Math.round(zoom() * 100)}
              onInput={(e) => {
                const engine = workspace.getActiveEngine();
                if (engine) {
                  setViewportState({
                    x: pan().x,
                    y: pan().y,
                    zoom: parseInt(e.target.value) / 100,
                  });
                  scheduler.requestRender();
                }
              }}
              class="h-[3px] w-full accent-editor-accent bg-editor-field-border rounded-full appearance-none cursor-pointer"
            />
            <button 
              onClick={() => {
                const engine = workspace.getActiveEngine();
                if (engine) {
                  setViewportState({
                    x: pan().x,
                    y: pan().y,
                    zoom: Math.min(4.0, zoom() + 0.1),
                  });
                  scheduler.requestRender();
                }
              }}
              class="text-[12px] text-editor-text-dim hover:text-editor-text px-1"
            >
              +
            </button>
            <span class="text-[12px] text-editor-text min-w-[36px] text-right">{Math.round(zoom() * 100)}%</span>
          </div>
        </Show>
      </div>
      </Show>
    </section>
  );
}
