import { Show, createSignal, createEffect } from "solid-js";
import { Icon } from "./icons";
import { NumField } from "./primitives";
import { useEditor } from "./EditorContext";

export function OptionBar() {
  const {
    workspace,
    activeTool,
    setActiveTool,
    layers,
    activeLayerId,
    scheduler
  } = useEditor();

  const activeLayer = () => {
    const id = activeLayerId();
    if (!id) return null;
    return layers().find(l => l.id === id) || null;
  };

  // Move / Transform actions
  const handleFlip = (axis: "h" | "v") => {
    const engine = workspace.getActiveEngine();
    const id = activeLayerId();
    if (engine && id) {
      const history = workspace.getActiveHistory();
      history?.commit(engine.snapshot());
      engine.flipLayer(id, axis);
      scheduler.requestRender();
    }
  };

  const handleResetTransform = () => {
    const engine = workspace.getActiveEngine();
    const id = activeLayerId();
    if (engine && id) {
      const history = workspace.getActiveHistory();
      history?.commit(engine.snapshot());
      engine.transformLayer(id, {
        x: 0,
        y: 0,
        scaleX: 1.0,
        scaleY: 1.0,
        rotation: 0,
        flipH: false,
        flipV: false
      });
      scheduler.requestRender();
    }
  };

  // Crop fields
  const [cropW, setCropW] = createSignal(800);
  const [cropH, setCropH] = createSignal(600);

  createEffect(() => {
    const engine = workspace.getActiveEngine();
    if (engine) {
      setCropW(engine.getWidth());
      setCropH(engine.getHeight());
    }
  });

  const handleApplyCrop = () => {
    const engine = workspace.getActiveEngine();
    if (engine) {
      const history = workspace.getActiveHistory();
      history?.commit(engine.snapshot());
      // Crop entire document to the specified dimensions centered
      engine.cropCanvas(0, 0, cropW(), cropH());
      scheduler.requestRender();
      setActiveTool("move"); // Switch back
    }
  };

  return (
    <div class="flex h-[44px] shrink-0 items-center gap-2.5 overflow-x-auto border-b border-editor-divider bg-editor-toolbar px-3">
      {/* ─── Move & Transform options ─── */}
      <Show when={activeTool() === "move" || activeTool() === "selection"}>
        <div class="flex h-[26px] w-[88px] shrink-0 items-center justify-between rounded-[4px] border border-editor-field-border bg-editor-field px-2.5">
          <span class="text-[12px] text-editor-text capitalize">{activeTool()}</span>
          <Icon name="chevron-down" class="size-3.5" strokeWidth={1.75} />
        </div>

        <Show when={activeLayer()}>
          {(layer) => (
            <>
              <div class="flex shrink-0 items-center gap-1.5">
                <NumField label="X" value={`${Math.round(layer().transform.x)} px`} class="w-[78px]" />
                <NumField label="Y" value={`${Math.round(layer().transform.y)} px`} class="w-[78px]" />
              </div>

              <div class="flex shrink-0 items-center gap-1.5">
                <NumField label="W" value={`${Math.round(layer().width * layer().transform.scaleX)} px`} class="w-[86px]" />
                <NumField label="H" value={`${Math.round(layer().height * layer().transform.scaleY)} px`} class="w-[86px]" />
              </div>

              <div class="flex shrink-0 items-center gap-2">
                <span class="text-[12px] text-editor-text-dim">Rotate</span>
                <div class="flex h-[26px] w-[72px] items-center justify-between rounded-[4px] border border-editor-field-border bg-editor-field px-2">
                  <span class="text-[12px] text-editor-text">{layer().transform.rotation}°</span>
                  <Icon name="chevron-down" class="size-3" strokeWidth={1.75} />
                </div>
              </div>
            </>
          )}
        </Show>

        <Divider />

        <div class="flex shrink-0 items-center gap-2 text-editor-icon">
          <span class="text-[12px] text-editor-text-dim">Flip</span>
          <button onClick={() => handleFlip("h")} class="hover:text-editor-text" aria-label="Flip horizontal">
            <Icon name="flip-h" class="size-[17px]" strokeWidth={1.6} />
          </button>
          <button onClick={() => handleFlip("v")} class="hover:text-editor-text" aria-label="Flip vertical">
            <Icon name="flip-v" class="size-[17px]" strokeWidth={1.6} />
          </button>
        </div>

        <Divider />

        <button onClick={handleResetTransform} class="flex h-[26px] shrink-0 items-center rounded-[4px] border border-editor-field-border bg-editor-field px-3.5 text-[12px] text-editor-text hover:bg-white/5">
          Reset
        </button>
      </Show>

      {/* ─── Crop options ─── */}
      <Show when={activeTool() === "crop"}>
        <div class="flex h-[26px] shrink-0 items-center gap-2.5 px-2.5">
          <span class="text-[12px] text-editor-text font-semibold uppercase text-editor-accent">Crop Canvas</span>
        </div>

        <div class="flex shrink-0 items-center gap-1.5">
          <NumField label="W" value={`${cropW()} px`} class="w-[86px]" />
          <NumField label="H" value={`${cropH()} px`} class="w-[86px]" />
        </div>

        <button onClick={handleApplyCrop} class="flex h-[26px] shrink-0 items-center rounded-[4px] bg-editor-accent text-white font-medium px-4 text-[12px] hover:bg-editor-accent/90">
          APPLY CROP
        </button>
        <button onClick={() => setActiveTool("move")} class="flex h-[26px] shrink-0 items-center rounded-[4px] border border-editor-field-border bg-editor-field px-3.5 text-[12px] text-editor-text hover:bg-white/5">
          Cancel
        </button>
      </Show>

      {/* ─── Brush & Eraser Options ─── */}
      <Show when={activeTool() === "brush" || activeTool() === "eraser"}>
        <div class="flex h-[26px] shrink-0 items-center gap-2.5 px-2.5">
          <span class="text-[12px] text-editor-text font-semibold uppercase text-editor-accent capitalize">{activeTool()} Options</span>
        </div>

        <div class="flex shrink-0 items-center gap-1.5">
          <NumField label="Size" value="20 px" class="w-[86px]" />
          <NumField label="Hard" value="80%" class="w-[86px]" />
          <NumField label="Opac" value="100%" class="w-[86px]" />
        </div>
      </Show>
    </div>
  );
}

function Divider() {
  return <div class="h-5 w-px shrink-0 bg-editor-divider" />;
}
