import { For, Show } from "solid-js";
import { clsx } from "clsx";
import fjord from "@/assets/fjord.jpg";
import { Icon } from "./icons";
import { useEditor } from "./EditorContext";

export function LayersPanel() {
  const {
    workspace,
    layers,
    activeLayerId,
    scheduler,
    zoom,
    activeDocumentId
  } = useEditor();

  const activeLayer = () => {
    const id = activeLayerId();
    if (!id) return null;
    return layers().find(l => l.id === id) || null;
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
      engine.setLayerVisibility(id, !layer.visible);
      scheduler.requestRender();
    }
  };

  const handleToggleLock = (e: MouseEvent, id: string) => {
    e.stopPropagation();
    const engine = workspace.getActiveEngine();
    const layer = engine?.getLayer(id);
    if (engine && layer) {
      engine.setLayerLocked(id, !layer.locked);
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

  return (
    <section class="flex flex-1 shrink-0 flex-col overflow-hidden bg-editor-panel">
      <div class="flex h-[46px] shrink-0 border-b border-editor-divider">
        <button class="relative flex h-full items-center px-6 text-[12px] font-medium text-editor-text after:absolute after:bottom-0 after:inset-x-0 after:h-[2px] after:bg-editor-text-dim">
          Layers
        </button>
        <button class="flex h-full items-center px-6 text-[12px] font-medium text-editor-text-dim transition-colors hover:text-editor-text hover:bg-white/[0.02]">
          History
        </button>
      </div>

      <div class={clsx("flex items-center gap-2 px-3.5 pt-3", !activeDocumentId() && "opacity-50 pointer-events-none")}>
        <div class="flex h-[26px] w-[120px] items-center justify-between rounded-[4px] border border-editor-field-border bg-editor-field px-2.5">
          <span class="text-[12px] text-editor-text">Normal</span>
          <Icon name="chevron-down" class="size-3.5 text-editor-text-dim" strokeWidth={1.75} />
        </div>
        <span class="ml-auto text-[12px] text-editor-text-dim">Opacity</span>
        <span class="text-[12px] text-editor-text">
          {activeLayer() ? Math.round(activeLayer()!.opacity * 100) : 100}%
        </span>
        <Icon name="chevron-down" class="size-3.5 text-editor-text-dim" strokeWidth={1.75} />
      </div>

      <div class={clsx("flex items-center gap-4 px-3.5 py-3", !activeDocumentId() && "opacity-50 pointer-events-none")}>
        <span class="text-[12px] text-editor-text-dim">Lock:</span>
        <div class="flex items-center gap-4 text-editor-icon">
          <Icon name="unlock" class="size-[15px]" strokeWidth={1.75} />
          <Icon name="paint-bucket" class="size-[15px]" strokeWidth={1.75} />
          <Icon name="maximize" class="size-[15px]" strokeWidth={1.75} />
          <Icon name="rotate" class="size-[15px]" strokeWidth={1.75} />
        </div>
      </div>

      {/* Dynamic Layer Stack List */}
      <div class="flex-1 overflow-y-auto border-y border-editor-divider">
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
            {(layer, idx) => {
              return (
                <div
                  onClick={() => handleSelectLayer(layer.id)}
                  class={clsx(
                    "flex h-[50px] items-center gap-2.5 px-3.5 cursor-pointer select-none group border-b border-editor-divider/10",
                    activeLayerId() === layer.id ? "bg-editor-row-active" : "hover:bg-white/[0.03]",
                  )}
                >
                  {/* Eye toggle button */}
                  <button
                    onClick={(e) => handleToggleVisibility(e, layer.id)}
                    class="text-editor-icon hover:text-editor-text size-6 flex items-center justify-center"
                  >
                    <Icon
                      name="eye"
                      class={clsx("size-4 shrink-0", !layer.visible && "opacity-30")}
                      strokeWidth={1.75}
                    />
                  </button>

                  {/* Layer Thumbnail */}
                  <Show
                    when={layer.type === "adjustment"}
                    fallback={
                      <div
                        class="size-[34px] shrink-0 rounded-[3px] border border-black/40 bg-cover"
                        style={{
                          "background-image": layer.imageBitmap ? "none" : `url(${fjord})`,
                          "background-color": layer.imageBitmap ? "rgba(255,255,255,0.05)" : "transparent",
                          "background-position": "center"
                        }}
                      >
                        {layer.imageBitmap && (
                          <div class="w-full h-full flex items-center justify-center text-[10px] text-editor-accent/80 font-bold bg-editor-accent/10">
                            IMG
                          </div>
                        )}
                      </div>
                    }
                  >
                    {/* Adjustment Layer: Standard Black-and-White circular icon */}
                    <div class="size-[34px] shrink-0 rounded-[3px] border border-black/40 bg-black flex items-center justify-center">
                      <div
                        class="size-[20px] rounded-full border border-white/20"
                        style={{
                          background: "conic-gradient(#fff 180deg, #222 180deg)",
                          transform: "rotate(-45deg)"
                        }}
                      />
                    </div>
                  </Show>

                  {/* Optional Layer Mask Thumbnail for Mountain layer (Matching high-fidelity mockup) */}
                  <Show when={layer.name === "Mountain"}>
                    <div class="size-[34px] shrink-0 rounded-[3px] border border-black/40 bg-black flex items-center justify-center relative overflow-hidden">
                      <div class="absolute inset-[6px] bg-white rounded-full blur-[1px]" />
                    </div>
                  </Show>

                  <span class="flex-1 text-[12.5px] text-editor-text truncate">
                    {layer.name}
                  </span>

                  {/* Up and Down Chevrons for Reordering */}
                  <div class="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-100 pr-1">
                    <button
                      disabled={idx() === 0}
                      onClick={(e) => handleMoveUp(e, idx())}
                      class="size-[22px] flex items-center justify-center hover:bg-white/10 rounded disabled:opacity-20 disabled:hover:bg-transparent"
                      title="Move Layer Up"
                    >
                      <Icon name="chevron-up" class="size-3.5" />
                    </button>
                    <button
                      disabled={idx() === layers().length - 1}
                      onClick={(e) => handleMoveDown(e, idx())}
                      class="size-[22px] flex items-center justify-center hover:bg-white/10 rounded disabled:opacity-20 disabled:hover:bg-transparent"
                      title="Move Layer Down"
                    >
                      <Icon name="chevron-down" class="size-3.5" />
                    </button>
                  </div>

                  {/* Lock Indicator */}
                  <button
                    onClick={(e) => handleToggleLock(e, layer.id)}
                    class="text-editor-icon hover:text-editor-text size-6 flex items-center justify-center"
                  >
                    <Icon
                      name={layer.locked ? "lock" : "unlock"}
                      class="size-3.5 shrink-0"
                      strokeWidth={1.75}
                    />
                  </button>
                </div>
              );
            }}
          </For>
        </Show>
      </div>

      {/* Layer Actions footer */}
      <div class={clsx("flex shrink-0 items-center gap-5 border-t border-editor-divider bg-editor-panel px-4 py-2.5 text-editor-icon", !activeDocumentId() && "opacity-50 pointer-events-none")}>
        <button onClick={handleAddLayer} class="hover:text-editor-text" title="New Layer">
          <Icon name="plus" class="size-[17px]" strokeWidth={1.75} />
        </button>
        <Icon name="folder-plus" class="size-[17px]" strokeWidth={1.75} />
        <Icon name="copy" class="size-[17px]" strokeWidth={1.75} />
        <Icon name="square-dashed" class="size-[17px]" strokeWidth={1.75} />
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
        <div class="flex h-[46px] items-center justify-between border-b border-editor-divider px-4">
          <h3 class="text-[13px] font-medium text-editor-text">Navigator</h3>
          <Icon name="maximize" class="size-3.5 text-editor-text-dim hover:text-editor-text" strokeWidth={1.75} />
        </div>
        <div class="px-4 pt-4">
          <Show
            when={activeDocumentId()}
            fallback={
              <div class="flex h-[88px] flex-col items-center justify-center gap-2 rounded-[3px] border border-dashed border-editor-divider/50 text-center">
                <Icon name="crop" class="size-5 text-editor-text-dim opacity-50" strokeWidth={1.5} />
                <span class="text-[12px] text-editor-text-dim">No image open</span>
              </div>
            }
          >
            <div class="overflow-hidden rounded-[3px] border border-editor-divider">
              <img
                src={fjord}
                alt="Navigator preview"
                width={1920}
                height={1080}
                class="h-[88px] w-full object-cover"
              />
            </div>
          </Show>
        </div>
        <div class={clsx("flex items-center gap-2.5 px-4 py-3", !activeDocumentId() && "opacity-50 pointer-events-none")}>
          <span class="text-[14px] text-editor-text-dim">▴</span>
          <div class="relative h-[3px] flex-1 rounded-full bg-editor-field-border">
            <div
              class="absolute top-1/2 size-[11px] -translate-y-1/2 rounded-full border border-black/40 bg-editor-text"
              style={{ left: `${Math.round(zoom() * 100 / 2)}%` }}
            />
          </div>
          <span class="text-[12px] text-editor-text">{Math.round(zoom() * 100)}%</span>
        </div>
      </div>
    </section>
  );
}
