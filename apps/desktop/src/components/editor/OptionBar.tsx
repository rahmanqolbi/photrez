import { Show } from "solid-js";
import { Icon } from "./icons";
import { NumField, EditableNumField } from "./primitives";
import { clsx } from "clsx";
import { useEditor } from "./EditorContext";

export function OptionBar() {
  const {
    workspace,
    activeTool,
    setActiveTool,
    layers,
    activeLayerId,
    scheduler,
    moveAutoSelect,
    setMoveAutoSelect,
    moveSnapEnabled,
    setMoveSnapEnabled,
    cropRect, setCropRect,
    cropMode, setCropMode,
    cropGuideMode, setCropGuideMode,
    cropDeletePixels, setCropDeletePixels,
    cropAspect, setCropAspect,
    cropSizeTarget, setCropSizeTarget,
  } = useEditor();

  const activeLayer = () => {
    const id = activeLayerId();
    if (!id) return null;
    return layers().find(l => l.id === id) || null;
  };

  // ─── Move / Transform actions ───
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

  return (
    <div class="flex h-[44px] shrink-0 items-center gap-1.5 overflow-x-auto border-b border-editor-divider bg-editor-toolbar px-3">
      {/* ─── Move & Transform options ─── */}
      <Show when={activeTool() === "move" || activeTool() === "selection"}>
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
      </Show>

      {/* ─── Crop options ─── */}
      <Show when={activeTool() === "crop"}>
        {/* Mode dropdown */}
        <div class="flex h-[24px] shrink-0 items-center gap-1 rounded-[3px] border border-editor-field-border bg-editor-field px-1.5">
          <select
            value={cropMode()}
            onChange={(e) => setCropMode(e.currentTarget.value as any)}
            class="bg-transparent text-[11px] text-editor-text outline-none"
          >
            <option value="free">Free</option>
            <option value="ratio">Ratio</option>
            <option value="size">Size</option>
          </select>
        </div>

        <Divider />

        {/* W / H fields (contextual) */}
        <Show when={cropMode() === "free"}>
          <div class="flex shrink-0 items-center gap-1">
            <NumField label="W" value={`${Math.round(cropRect()?.w ?? 0)} px`} class="w-[78px]" />
            <NumField label="H" value={`${Math.round(cropRect()?.h ?? 0)} px`} class="w-[78px]" />
          </div>
        </Show>

        <Show when={cropMode() === "ratio"}>
          <div class="flex shrink-0 items-center gap-1">
            <EditableNumField label="W" value={cropAspect()?.w ?? 1} onSubmit={(v) => setCropAspect({ w: v, h: cropAspect()?.h ?? 1 })} class="w-[62px]" />
            <span class="text-[11px] text-editor-text-dim">:</span>
            <EditableNumField label="H" value={cropAspect()?.h ?? 1} onSubmit={(v) => setCropAspect({ w: cropAspect()?.w ?? 1, h: v })} class="w-[62px]" />
          </div>
        </Show>

        <Show when={cropMode() === "size"}>
          <div class="flex shrink-0 items-center gap-1">
            <EditableNumField label="W" value={cropSizeTarget()?.w ?? 800} suffix="px" onSubmit={(v) => setCropSizeTarget({ w: v, h: cropSizeTarget()?.h ?? 600 })} class="w-[70px]" />
            <EditableNumField label="H" value={cropSizeTarget()?.h ?? 600} suffix="px" onSubmit={(v) => setCropSizeTarget({ w: cropSizeTarget()?.w ?? 800, h: v })} class="w-[70px]" />
          </div>
        </Show>

        {/* Swap button */}
        <button
          onClick={() => {
            const rect = cropRect();
            if (rect) {
              setCropRect({ x: rect.x, y: rect.y, w: rect.h, h: rect.w });
            }
            if (cropAspect()) {
              setCropAspect({ w: cropAspect()!.h, h: cropAspect()!.w });
            }
            if (cropSizeTarget()) {
              setCropSizeTarget({ w: cropSizeTarget()!.h, h: cropSizeTarget()!.w });
            }
          }}
          class="flex h-[24px] shrink-0 items-center rounded-[3px] border border-transparent px-1 text-[11px] text-editor-text-dim hover:border-editor-field-border hover:text-editor-text"
          aria-label="Swap width and height"
        >
          ↔
        </button>

        <Divider />

        {/* Guide dropdown */}
        <div class="flex h-[24px] shrink-0 items-center gap-1 rounded-[3px] border border-editor-field-border bg-editor-field px-1.5">
          <select
            value={cropGuideMode()}
            onChange={(e) => setCropGuideMode(e.currentTarget.value as any)}
            class="bg-transparent text-[11px] text-editor-text outline-none"
          >
            <option value="none">None</option>
            <option value="thirds">Thirds</option>
            <option value="grid">Grid</option>
            <option value="diagonal">Diagonal</option>
            <option value="golden">Golden</option>
          </select>
        </div>

        <Divider />

        {/* Delete cropped pixels toggle */}
        <ToggleBtn
          active={cropDeletePixels()}
          onChange={setCropDeletePixels}
          icon="trash"
          label="Delete"
        />

        <Divider />

        {/* Reset */}
        <button
          onClick={() => {
            const engine = workspace.getActiveEngine();
            if (engine) {
              setCropRect({ x: 0, y: 0, w: engine.getWidth(), h: engine.getHeight() });
            }
          }}
          class="flex h-[24px] shrink-0 items-center rounded-[3px] border border-transparent px-2 text-[11px] text-editor-text-dim hover:border-editor-field-border hover:text-editor-text"
        >
          Reset
        </button>

        {/* Cancel */}
        <button
          onClick={() => {
            setCropRect(null);
            setActiveTool("move");
          }}
          class="flex h-[24px] shrink-0 items-center rounded-[3px] border border-editor-field-border bg-editor-field px-2 text-[11px] text-editor-text hover:bg-white/5"
        >
          Cancel
        </button>

        {/* Apply */}
        <button
          onClick={() => {
            const engine = workspace.getActiveEngine();
            const rect = cropRect();
            if (engine && rect) {
              const history = workspace.getActiveHistory();
              history?.commit(engine.snapshot());
              engine.cropCanvas(rect.x, rect.y, rect.w, rect.h);
              scheduler.requestRender();
              setCropRect(null);
              setActiveTool("move");
            }
          }}
          class="flex h-[26px] shrink-0 items-center rounded-[4px] bg-editor-accent text-white font-medium px-4 text-[12px] hover:bg-editor-accent/90"
        >
          APPLY
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

function ToggleBtn(props: { active: boolean; onChange: (v: boolean) => void; icon: string; label: string }) {
  return (
    <button
      onClick={() => props.onChange(!props.active)}
      class={clsx(
        "flex h-[24px] shrink-0 items-center gap-0.5 rounded-[3px] border px-1.5 text-[11px]",
        props.active
          ? "border-editor-accent/50 bg-editor-field text-editor-text-dim shadow-[inset_0_0_0_1px_rgba(225,90,23,0.12)]"
          : "border-transparent bg-transparent text-editor-text-dim hover:border-editor-field-border hover:bg-editor-field/60 hover:text-editor-text",
      )}
    >
      <Icon name={props.icon as any} class={clsx("size-3", props.active && "text-editor-accent")} strokeWidth={1.5} />
      {props.label}
    </button>
  );
}

function Divider() {
  return <div class="h-5 w-px shrink-0 bg-editor-divider" />;
}
