import { For, Show, createSignal, createEffect } from "solid-js";
import { clsx } from "clsx";
import fjord from "@/assets/fjord.jpg";
import { Icon } from "../icons";
import { useEditor } from "../shell/EditorContext";
import { useDragController } from "../DragController";
import { addLayerFromCrossDoc, addFilesAsLayers, addFilesAsLayersFromFileDrop } from "../crossDocLayerOps";
import { LayerNode } from "@/engine/types";
import type { DocumentModel } from "@/engine/types";
import { BLEND_MODE_OPTIONS, isBlendMode } from "@/engine/blendModes";
import { Navigator } from "../Navigator";
import { HistoryPanel } from "../HistoryPanel";
import { LayerItem } from "./LayerItem";
import { useLayerActions } from "./useLayerActions";
import { cancelLayerTransformSession } from "../transformSession";
import { ContextMenu, type ContextMenuEntry } from "../ContextMenu";

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
    setLayerTransformSession,
    rightDockPanel,
    setRightDockPanel,
  } = useEditor();

  const dragController = useDragController();

  const [showOpacitySlider, setShowOpacitySlider] = createSignal(false);
  const [opacityHistorySnapshot, setOpacityHistorySnapshot] = createSignal<DocumentModel | null>(null);
  const [editingLayerId, setEditingLayerId] = createSignal<string | null>(null);
  const [editName, setEditName] = createSignal("");
  const [navigatorCollapsed, setNavigatorCollapsed] = createSignal(false);
  const [layerContextMenu, setLayerContextMenu] = createSignal<{
    x: number;
    y: number;
    layerId: string;
    focusTarget: HTMLElement | null;
  } | null>(null);

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

  const openLayerContextMenu = (event: MouseEvent, layer: LayerNode) => {
    event.preventDefault();
    event.stopPropagation();
    handleSelectLayer(layer.id);
    setLayerContextMenu({
      x: event.clientX,
      y: event.clientY,
      layerId: layer.id,
      focusTarget: event.currentTarget instanceof HTMLElement ? event.currentTarget : null,
    });
  };

  const layerContextItems = (): ContextMenuEntry[] => {
    const state = layerContextMenu();
    const layer = state ? layers().find((candidate) => candidate.id === state.layerId) : null;
    const index = layer ? layers().findIndex((candidate) => candidate.id === layer.id) : -1;
    if (!layer) return [];
    return [
      { kind: "item", label: "New Layer", shortcut: "Ctrl+Shift+N", onSelect: handleAddLayer },
      { kind: "item", label: "Duplicate Layer", shortcut: "Ctrl+J", onSelect: handleDuplicateActiveLayer },
      {
        kind: "item",
        label: "Rename Layer",
        disabled: layer.locked,
        onSelect: () => {
          setEditingLayerId(layer.id);
          setEditName(layer.name);
        },
      },
      { kind: "separator" },
      {
        kind: "item",
        label: layer.visible ? "Hide Layer" : "Show Layer",
        onSelect: (event) => handleToggleVisibility(event, layer.id),
      },
      {
        kind: "item",
        label: layer.locked ? "Unlock Layer" : "Lock Layer",
        onSelect: (event) => handleToggleLock(event, layer.id),
      },
      { kind: "separator" },
      {
        kind: "item",
        label: "Move Layer Up",
        disabled: index <= 0,
        onSelect: (event) => handleMoveUp(event, index),
      },
      {
        kind: "item",
        label: "Move Layer Down",
        disabled: index < 0 || index >= layers().length - 1,
        onSelect: (event) => handleMoveDown(event, index),
      },
      {
        kind: "item",
        label: "Merge Down",
        shortcut: "Ctrl+E",
        disabled: index < 0 || index >= layers().length - 1,
        onSelect: handleMergeActiveLayerDown,
      },
      {
        kind: "item",
        label: "Flatten Image",
        shortcut: "Ctrl+Shift+E",
        disabled: layers().length <= 1,
        onSelect: handleFlattenAllLayers,
      },
      { kind: "separator" },
      {
        kind: "item",
        label: "Delete Layer",
        danger: true,
        disabled: layers().length <= 1,
        onSelect: handleDeleteActiveLayer,
      },
    ];
  };

  // Compute insertion position from pointer Y. Reads row bounding
  // rects during `dragover` (~60Hz max). Cheap because the panel
  // re-renders only on layer changes, not every frame.
  const computeInsertionHint = (
    clientY: number,
  ): { insertAt: number; insertPosition: "above" | "below" } | null => {
    const root = document.querySelector<HTMLDivElement>("[data-layers-panel-drop-zone]");
    if (!root) return null;
    const rows = root.querySelectorAll<HTMLElement>("[data-layer-idx]");
    if (rows.length === 0) return null;

    // Pointer above the first row →drop at the top of the stack.
    const firstRect = rows[0].getBoundingClientRect();
    if (clientY < firstRect.top) {
      return {
        insertAt: parseInt(rows[0].dataset.layerIdx!, 10),
        insertPosition: "above",
      };
    }

    for (const row of rows) {
      const rect = row.getBoundingClientRect();
      if (clientY >= rect.top && clientY <= rect.bottom) {
        const idx = parseInt(row.dataset.layerIdx!, 10);
        const position = clientY - rect.top < rect.height / 2 ? "above" : "below";
        return { insertAt: idx, insertPosition: position };
      }
    }

    // Pointer below the last row →drop at the bottom of the stack.
    const lastIdx = parseInt(rows[rows.length - 1].dataset.layerIdx!, 10);
    return { insertAt: lastIdx, insertPosition: "below" };
  };

  const cancelActiveTransformSession = () => {
    const engine = workspace.getActiveEngine();
    if (cancelLayerTransformSession(layerTransformSession(), engine)) {
      setLayerTransformSession(null);
      scheduler.requestRender();
    }
  };

  return (
    <div
      id="right-dock-layers-panel"
      role="tabpanel"
      data-layers-panel-content
      class="flex min-h-0 flex-1 flex-col overflow-hidden bg-editor-panel"
    >
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
              history?.commit(engine.snapshot(), "Layer Blend Mode");
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
                    history.commit(snapshot, "Layer Opacity");
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
        data-layers-panel-drop-zone
        data-drag-over={dragController.state().dropTarget?.type === "layers-panel" ? "layers-panel" : null}
        onDragOver={(e) => {
          // ponytail: ALWAYS preventDefault so the cursor stays "copy"
          // (matching LayerItem's effectAllowed="copy"), even when
          // dragKind is null (e.g. dragstart hasn't fired yet because
          // the user hasn't moved past the native threshold). Without
          // this the browser falls back to the "forbidden" cursor
          // because it can't confirm a drop target accepts the drag.
          e.preventDefault();
          if (dragController.state().dragKind === null) return;
          // Track insertion position so the drop handler can land
          // the layer exactly where the user aimed.
          const hint = computeInsertionHint(e.clientY);
          if (hint) {
            dragController.setDropTarget({ type: "layers-panel", ...hint });
          } else {
            dragController.setDropTarget({ type: "layers-panel" });
          }
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
            // ponytail: pass the tracked dropTarget (with insertAt +
            // insertPosition) so the same-doc reorder lands at the
            // exact row the user aimed at. A bare `{ type: "layers-panel" }`
            // here would silently fall back to "move to end".
            const target = state.dropTarget?.type === "layers-panel"
              ? state.dropTarget
              : { type: "layers-panel" as const };
            addLayerFromCrossDoc(state.payload, target, { x: 0, y: 0 }, workspace);
          } else if (state.dragKind === "file") {
            if (state.filePaths && state.filePaths.length > 0) {
              // In-app file drag — pre-resolved file paths
              const created = await addFilesAsLayers(state.filePaths, { type: "layers-panel" }, { x: 0, y: 0 }, workspace);
              for (const { layerId, bitmap } of created) {
                renderer.uploadImage(layerId, bitmap);
              }
              if (created.length) scheduler.requestRender();
            } else if (e.dataTransfer?.files && e.dataTransfer.files.length > 0) {
              // OS file drop (Explorer / Finder) — read File objects directly
              const files = Array.from(e.dataTransfer.files);
              const created = await addFilesAsLayersFromFileDrop(files, { type: "layers-panel" }, { x: 0, y: 0 }, workspace);
              for (const { layerId, bitmap } of created) {
                renderer.uploadImage(layerId, bitmap);
              }
              if (created.length) scheduler.requestRender();
            }
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
                isEditing={editingLayerId() === layer.id}
                editName={editName()}
                setEditingLayerId={setEditingLayerId}
                setEditName={setEditName}
                onSelect={handleSelectLayer}
                onContextMenu={openLayerContextMenu}
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

      <ContextMenu
        open={layerContextMenu() !== null}
        x={layerContextMenu()?.x ?? 0}
        y={layerContextMenu()?.y ?? 0}
        ariaLabel="Layer actions"
        items={layerContextItems()}
        restoreFocusTo={layerContextMenu()?.focusTarget}
        onClose={() => setLayerContextMenu(null)}
        testId="layer-context-menu"
      />

      {/* Layer Actions footer */}
      <div class={clsx("flex shrink-0 items-center gap-5 border-t border-editor-divider bg-editor-panel px-4 py-2.5 text-editor-icon", !activeDocumentId() && "opacity-50 pointer-events-none")}>
        <button
          onClick={handleAddLayer}
          class="hover:text-editor-text"
          aria-label="New Layer"
          title="New Layer"
        >
          <Icon name="plus" class="size-[17px]" strokeWidth={1.75} />
        </button>
        <button
          onClick={handleDuplicateActiveLayer}
          disabled={!activeLayer()}
          class="hover:text-editor-text disabled:opacity-30"
          aria-label="Duplicate Layer"
          title="Duplicate Layer"
        >
          <Icon name="copy" class="size-[17px]" strokeWidth={1.75} />
        </button>
        <button
          onClick={handleMergeActiveLayerDown}
          disabled={!activeLayer() || layers().indexOf(activeLayer()!) === layers().length - 1}
          class="hover:text-editor-text disabled:opacity-30"
          aria-label="Merge Down"
          title="Merge Down"
        >
          <Icon name="chevron-down" class="size-[17px]" strokeWidth={1.75} />
        </button>
        <button
          onClick={handleFlattenAllLayers}
          disabled={layers().length <= 1}
          class="hover:text-editor-text disabled:opacity-30"
          aria-label="Flatten All Layers"
          title="Flatten All Layers"
        >
          <Icon name="square-dashed" class="size-[17px]" strokeWidth={1.75} />
        </button>
        <button
          disabled={layers().length <= 1}
          onClick={handleDeleteActiveLayer}
          class="ml-auto hover:text-editor-accent disabled:opacity-30 disabled:hover:text-editor-icon"
          aria-label="Delete Layer"
          title="Delete Layer"
        >
          <Icon name="trash" class="size-[17px]" strokeWidth={1.75} />
        </button>
      </div>
    </div>
  );
}
