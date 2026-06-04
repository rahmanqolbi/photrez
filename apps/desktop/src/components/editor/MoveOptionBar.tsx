import { Show, createMemo } from "solid-js";
import { Icon } from "./icons";
import { NumField, EditableNumField } from "./primitives";
import { clsx } from "clsx";
import { useEditor } from "./EditorContext";
import { ToggleBtn, Divider } from "./OptionBarShared";

export function MoveOptionBar() {
  const {
    workspace,
    activeTool,
    layers,
    activeLayerId,
    scheduler,
    moveAutoSelect,
    setMoveAutoSelect,
    moveSnapEnabled,
    setMoveSnapEnabled,
    hoveredLayerId,
    docWidth,
    docHeight,
  } = useEditor();

  const hoveredLayer = () => {
    const id = hoveredLayerId();
    if (!id) return null;
    return layers().find(l => l.id === id) || null;
  };

  const activeLayer = () => {
    const id = activeLayerId();
    if (!id) return null;
    return layers().find(l => l.id === id) || null;
  };

  const activeLayerSafe = () => {
    const id = activeLayerId();
    if (!id) return null;
    const engine = workspace.getActiveEngine();
    if (!engine) return null;
    return engine.getLayer(id) || null;
  };

  const isLocked = () => {
    const l = activeLayerSafe();
    return l ? l.locked : false;
  };

  const handleFlip = (axis: "h" | "v") => {
    if (isLocked()) return;
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
    if (isLocked()) return;
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

  const handlePositionField = (axis: "x" | "y") => (val: number) => {
    const engine = workspace.getActiveEngine();
    const id = activeLayerId();
    if (engine && id) {
      const layer = engine.getLayer(id);
      if (!layer || layer.locked) return;
      const history = workspace.getActiveHistory();
      history?.commit(engine.snapshot());
      const next = { ...layer.transform };
      next[axis] = val;
      engine.transformLayer(id, next);
      scheduler.requestRender();
    }
  };

  const handleRotateField = (val: number) => {
    const engine = workspace.getActiveEngine();
    const id = activeLayerId();
    if (engine && id) {
      const layer = engine.getLayer(id);
      if (!layer || layer.locked) return;
      const history = workspace.getActiveHistory();
      history?.commit(engine.snapshot());
      engine.transformLayer(id, { ...layer.transform, rotation: val });
      scheduler.requestRender();
    }
  };

  const handleAlign = (type: "left" | "center-h" | "right" | "top" | "center-v" | "bottom") => {
    const engine = workspace.getActiveEngine();
    const id = activeLayerId();
    if (engine && id) {
      const layer = engine.getLayer(id);
      if (!layer || layer.locked) return;
      const history = workspace.getActiveHistory();
      history?.commit(engine.snapshot());
      const next = { ...layer.transform };
      
      const layerW = Math.round(layer.width * layer.transform.scaleX);
      const layerH = Math.round(layer.height * layer.transform.scaleY);
      const docW = docWidth();
      const docH = docHeight();

      switch (type) {
        case "left":
          next.x = 0;
          break;
        case "center-h":
          next.x = Math.round((docW - layerW) / 2);
          break;
        case "right":
          next.x = docW - layerW;
          break;
        case "top":
          next.y = 0;
          break;
        case "center-v":
          next.y = Math.round((docH - layerH) / 2);
          break;
        case "bottom":
          next.y = docH - layerH;
          break;
      }
      engine.transformLayer(id, next);
      scheduler.requestRender();
    }
  };

  return (
    <>
      <div class="flex h-[24px] shrink-0 items-center rounded-[3px] border border-editor-field-border bg-editor-field px-2">
        <span class="text-[11px] text-editor-text capitalize">{activeTool()}</span>
      </div>

      <Divider />

      <ToggleBtn
        active={moveAutoSelect()}
        onChange={setMoveAutoSelect}
        icon="cursor"
        label="Auto"
      />

      <ToggleBtn
        active={moveSnapEnabled()}
        onChange={setMoveSnapEnabled}
        icon="align-h"
        label="Snap"
      />

      <Show when={moveAutoSelect() && hoveredLayer()}>
        {(hl) => (
          <div class="flex h-[24px] shrink-0 items-center gap-1.5 rounded-[4px] bg-editor-field border border-editor-field-border px-2 text-[11px] text-editor-text-dim max-w-[120px] overflow-hidden">
            <span class="text-[9px] text-editor-accent font-bold uppercase tracking-wider">Target:</span>
            <span class="text-editor-text font-medium truncate">{hl().name}</span>
          </div>
        )}
      </Show>

      <Divider />

      <Show when={isLocked()}>
        <div class="flex h-[24px] shrink-0 items-center gap-1 rounded-[3px] border border-editor-accent/20 bg-editor-accent/5 px-2 text-[11px] text-editor-accent/70">
          <Icon name="lock" class="size-3" strokeWidth={1.5} />
          Locked
        </div>
        <Divider />
      </Show>

      <Show when={activeLayer()}>
        {(layer) => {
          const d = isLocked();
          return (
            <>
              <div class="flex shrink-0 items-center gap-1">
                <EditableNumField
                  label="X"
                  value={layer().transform.x}
                  disabled={d}
                  onSubmit={handlePositionField("x")}
                  class="w-[62px]"
                />
                <EditableNumField
                  label="Y"
                  value={layer().transform.y}
                  disabled={d}
                  onSubmit={handlePositionField("y")}
                  class="w-[62px]"
                />
              </div>

              <div class="flex shrink-0 items-center gap-1">
                <NumField label="W" value={`${Math.round(layer().width * layer().transform.scaleX)}`} suffix="px" class="w-[70px]" />
                <NumField label="H" value={`${Math.round(layer().height * layer().transform.scaleY)}`} suffix="px" class="w-[70px]" />
              </div>

              <EditableNumField
                label="R"
                value={layer().transform.rotation}
                suffix="°"
                disabled={d}
                onSubmit={handleRotateField}
                class="w-[58px]"
              />
            </>
          );
        }}
      </Show>

      <Divider />

      <div class={clsx("flex shrink-0 items-center gap-1 text-editor-icon", isLocked() && "opacity-30 pointer-events-none")}>
        <span class="text-[11px] text-editor-text-dim">Align</span>
        <button onClick={() => handleAlign("left")} class="rounded-[3px] p-0.5 hover:text-editor-text" aria-label="Align left">
          <Icon name="align-left" class="size-4" strokeWidth={1.5} />
        </button>
        <button onClick={() => handleAlign("center-h")} class="rounded-[3px] p-0.5 hover:text-editor-text" aria-label="Align center horizontal">
          <Icon name="align-h" class="size-4" strokeWidth={1.5} />
        </button>
        <button onClick={() => handleAlign("right")} class="rounded-[3px] p-0.5 hover:text-editor-text" aria-label="Align right">
          <Icon name="align-right" class="size-4" strokeWidth={1.5} />
        </button>
        <button onClick={() => handleAlign("top")} class="rounded-[3px] p-0.5 hover:text-editor-text" aria-label="Align top">
          <Icon name="align-top" class="size-4" strokeWidth={1.5} />
        </button>
        <button onClick={() => handleAlign("center-v")} class="rounded-[3px] p-0.5 hover:text-editor-text" aria-label="Align center vertical">
          <Icon name="align-v" class="size-4" strokeWidth={1.5} />
        </button>
        <button onClick={() => handleAlign("bottom")} class="rounded-[3px] p-0.5 hover:text-editor-text" aria-label="Align bottom">
          <Icon name="align-bottom" class="size-4" strokeWidth={1.5} />
        </button>
      </div>

      <Divider />

      <div class={clsx("flex shrink-0 items-center gap-1 text-editor-icon", isLocked() && "opacity-30 pointer-events-none")}>
        <span class="text-[11px] text-editor-text-dim">Flip</span>
        <button onClick={() => handleFlip("h")} class="rounded-[3px] p-0.5 hover:text-editor-text" aria-label="Flip horizontal">
          <Icon name="flip-h" class="size-4" strokeWidth={1.5} />
        </button>
        <button onClick={() => handleFlip("v")} class="rounded-[3px] p-0.5 hover:text-editor-text" aria-label="Flip vertical">
          <Icon name="flip-v" class="size-4" strokeWidth={1.5} />
        </button>
      </div>

      <Divider />

      <button onClick={handleResetTransform} disabled={isLocked()} class={clsx(
        "flex h-[24px] shrink-0 items-center rounded-[3px] border border-transparent px-2 text-[11px]",
        isLocked()
          ? "text-editor-text-dim/30 cursor-default"
          : "text-editor-text-dim hover:border-editor-field-border hover:text-editor-text",
      )}>
        Reset
      </button>
    </>
  );
}
