import { For, Show, createSignal } from "solid-js";
import { Icon } from "./icons";
import { EditableNumField, PropRow, SelectField, Slider } from "./primitives";
import { useEditor } from "./shell/EditorContext";
import { SectionHeader } from "./layers/SectionHeader";
import { CanvasProperties } from "./canvas/CanvasProperties";
import { LayerThumb } from "./layers/LayerThumb";
import type { Transform2D } from "@/engine/types";

const ANCHOR_POSITIONS = ["top-left", "top-center", "top-right", "middle-left", "center", "middle-right", "bottom-left", "bottom-center", "bottom-right"] as const;

export function PropertiesPanel() {
  const { workspace, layers, selectedLayerId, scheduler, activeDocumentId } = useEditor();
  const [opacityEditLayerId, setOpacityEditLayerId] = createSignal<string | null>(null);
  const [anchor, setAnchor] = createSignal<string>("center");
  const [lockScale, setLockScale] = createSignal(false);

  const activeLayer = () => {
    const id = selectedLayerId();
    if (!id) return null;
    return layers().find(l => l.id === id) || null;
  };

  const handleOpacityChange = (val: number) => {
    const engine = workspace.getActiveEngine();
    const id = selectedLayerId();
    if (engine && id) {
      const layer = engine.getLayer(id);
      if (!layer || layer.locked) return;
      if (Math.abs(layer.opacity - val / 100) < 0.0001) return;
      if (opacityEditLayerId() !== id) {
        workspace.getActiveHistory()?.commit(engine.snapshot(), "Adjust Opacity");
        setOpacityEditLayerId(id);
      }
      engine.setLayerOpacity(id, val / 100);
      scheduler.requestRender();
      workspace.notifyVisualChange();
    }
  };

  const finishOpacityEdit = () => {
    setOpacityEditLayerId(null);
  };

  const commitTransform = (patch: Partial<Transform2D>, label: string) => {
    const engine = workspace.getActiveEngine();
    const id = selectedLayerId();
    if (!engine || !id) return false;
    const layer = engine.getLayer(id);
    if (!layer || layer.locked) return false;

    const next = { ...layer.transform, ...patch };
    if (
      next.x === layer.transform.x &&
      next.y === layer.transform.y &&
      next.scaleX === layer.transform.scaleX &&
      next.scaleY === layer.transform.scaleY &&
      next.rotation === layer.transform.rotation &&
      next.flipH === layer.transform.flipH &&
      next.flipV === layer.transform.flipV
    ) {
      return false;
    }

    const history = workspace.getActiveHistory();
    history?.commit(engine.snapshot(), label);
    engine.transformLayer(id, next);
    scheduler.requestRender();
    workspace.notifyVisualChange();
    return true;
  };

  const handlePositionField = (axis: "x" | "y") => (val: number) => {
    const layer = activeLayer();
    if (!layer || layer.lockPosition) return;
    commitTransform({ [axis]: val }, "Move Layer");
  };

  const handleSizeField = (axis: "w" | "h") => (val: number) => {
    const layer = activeLayer();
    if (!layer || val <= 0) return;
    const nextScale = axis === "w" ? val / layer.width : val / layer.height;
    commitTransform(axis === "w" ? { scaleX: nextScale } : { scaleY: nextScale }, "Resize Layer");
  };

  const handleRotationField = (val: number) => {
    const layer = activeLayer();
    if (!layer || layer.lockRotation) return;
    commitTransform({ rotation: val }, "Rotate Layer");
  };

  const handleScaleField = (axis: "x" | "y") => (val: number) => {
    if (val <= 0) return;
    commitTransform(axis === "x" ? { scaleX: val / 100 } : { scaleY: val / 100 }, "Resize Layer");
  };

  const transformStatusText = () => {
    const layer = activeLayer();
    if (!layer) return null;
    if (layer.locked) return "Layer is locked. Unlock it in Layers to edit transform values.";
    if (layer.lockPosition && layer.lockRotation) return "Position and rotation are locked for this layer.";
    if (layer.lockPosition) return "Position fields are locked for this layer.";
    if (layer.lockRotation) return "Rotation is locked for this layer.";
    return null;
  };

  return (
    <section class="flex flex-1 shrink-0 flex-col overflow-hidden bg-editor-panel">
      <div class="flex-1 overflow-y-auto">
        <Show
          when={activeDocumentId()}
          fallback={
            <div class="flex h-full flex-col items-center justify-center gap-3 text-center px-6">
              <Icon name="sliders" class="size-6 text-editor-text-dim opacity-50" strokeWidth={1.5} />
              <div class="space-y-1">
                <p class="text-[13px] font-medium text-editor-text">No image open</p>
                <p class="text-[12px] text-editor-text-dim leading-snug">Open or create an image to view and edit properties.</p>
              </div>
            </div>
          }
        >
          <Show
            when={activeLayer()}
            fallback={<CanvasProperties />}
          >
            {(layer) => (
              <>
                <div class="border-b border-editor-divider px-4 py-3.5">
                  <SectionHeader
                    icon="layers"
                    iconClass="text-editor-text-dim"
                    label="Selected Layer"
                  />
                  <div class="mt-3 flex items-center gap-3 rounded-[4px] border border-editor-divider bg-editor-field p-2.5">
                    <LayerThumb layer={layer()} isActive={true} />
                    <div class="min-w-0 flex-1">
                      <p class="truncate text-[12.5px] font-medium text-editor-text leading-tight" title={layer().name}>
                        {layer().name}
                      </p>
                      <p class="truncate text-[11px] text-editor-text-dim leading-snug mt-0.5">
                        {layer().type === "raster" ? "Image layer" : `${layer().type.charAt(0).toUpperCase()}${layer().type.slice(1)} layer`} · {layer().width} × {layer().height} px
                      </p>
                    </div>
                  </div>
                </div>

                <div class="border-b border-editor-divider px-4 py-3.5">
                  <SectionHeader
                    icon="move"
                    iconClass="text-editor-text-dim"
                    label="Transform"
                    trailing={
                      <Icon
                        name="chevron-up"
                        class="size-4 text-editor-text-dim"
                        strokeWidth={1.75}
                      />
                    }
                  />

                  <div class="mt-3 flex flex-col gap-2.5">
                    <Show when={transformStatusText()}>
                      {(message) => <StatusHint>{message()}</StatusHint>}
                    </Show>
                    <PropRow label="Position">
                      <EditableNumField label="X" value={layer().transform.x} suffix="px" onSubmit={handlePositionField("x")} disabled={layer().lockPosition || layer().locked} class="flex-1" />
                      <EditableNumField label="Y" value={layer().transform.y} suffix="px" onSubmit={handlePositionField("y")} disabled={layer().lockPosition || layer().locked} class="flex-1" />
                    </PropRow>
                    <PropRow label="Size">
                      <EditableNumField label="W" value={layer().width * layer().transform.scaleX} suffix="px" onSubmit={handleSizeField("w")} disabled={layer().locked} class="flex-1" />
                      <EditableNumField label="H" value={layer().height * layer().transform.scaleY} suffix="px" onSubmit={handleSizeField("h")} disabled={layer().locked} class="flex-1" />
                    </PropRow>
                    <PropRow label="Rotation">
                      <EditableNumField label="R" value={layer().transform.rotation} suffix="deg" onSubmit={handleRotationField} disabled={layer().lockRotation || layer().locked} class="flex-1" />
                    </PropRow>
                    <PropRow label="Scale">
                      <EditableNumField label="X" value={layer().transform.scaleX * 100} suffix="%" onSubmit={handleScaleField("x")} disabled={layer().locked} class="flex-1" />
                      <EditableNumField label="Y" value={layer().transform.scaleY * 100} suffix="%" onSubmit={handleScaleField("y")} disabled={layer().locked} class="flex-1" />
                      <button
                        class={`flex size-[26px] shrink-0 items-center justify-center ${lockScale() ? "text-editor-accent" : "text-editor-text-dim"}`}
                        aria-label="Lock scale"
                        onClick={() => setLockScale(!lockScale())}
                      >
                        <Icon name="link" class="size-3.5" strokeWidth={1.75} />
                      </button>
                    </PropRow>
                    <PropRow label="Opacity">
                      <div class="flex-grow flex items-center gap-2.5">
                        <div class="relative flex-grow flex items-center h-[14px]">
                          <Slider
                            percent={Math.round(layer().opacity * 100)}
                            type="opacity"
                          />
                          <input
                            aria-label="Opacity"
                            type="range"
                            min="0"
                            max="100"
                            value={Math.round(layer().opacity * 100)}
                            disabled={layer().locked}
                            onInput={(e) => handleOpacityChange(parseInt(e.currentTarget.value))}
                            onPointerUp={finishOpacityEdit}
                            onBlur={finishOpacityEdit}
                            onChange={finishOpacityEdit}
                            class="absolute inset-0 w-full h-[14px] opacity-0 cursor-pointer disabled:pointer-events-none"
                          />
                        </div>
                        <span class="w-[44px] shrink-0 text-right text-[12px] text-editor-text">
                          {Math.round(layer().opacity * 100)} %
                        </span>
                      </div>
                    </PropRow>

                    <div class="flex items-start gap-2.5 pt-1">
                      <span class="w-[58px] shrink-0 text-[12px] text-editor-text-dim">
                        Anchor
                      </span>
                      <AnchorGrid value={anchor()} onSelect={setAnchor} />
                    </div>

                    <PropRow label="Constrain">
                      <SelectField value="Lock Aspect Ratio" class="flex-1" />
                    </PropRow>
                  </div>
                </div>
              </>
            )}
          </Show>
        </Show>
      </div>
    </section>
  );
}

function StatusHint(props: { children: string }) {
  return (
    <div class="flex items-start gap-2 rounded-[4px] border border-editor-divider bg-editor-field px-2.5 py-2 text-[11px] leading-snug text-editor-text-dim">
      <Icon name="sliders" class="mt-0.5 size-3.5 shrink-0 text-editor-text-dim" strokeWidth={1.75} />
      <span>{props.children}</span>
    </div>
  );
}

function AnchorGrid(props: { value: string; onSelect: (value: string) => void }) {
  return (
    <div class="relative h-[42px] w-[88px]">
      <div class="absolute left-1/2 top-1/2 h-[1px] w-[72px] -translate-x-1/2 -translate-y-1/2 bg-editor-field-border" />
      <div class="absolute left-1/2 top-1/2 h-[34px] w-[1px] -translate-x-1/2 -translate-y-1/2 bg-editor-field-border" />
      <div class="relative grid h-full grid-cols-3 grid-rows-3">
        <For each={ANCHOR_POSITIONS}>
          {(pos) => (
            <button
              type="button"
              aria-label={`Anchor ${pos}`}
              onClick={() => props.onSelect(pos)}
              class="flex items-center justify-center hover:bg-white/[0.05] rounded-[2px]"
            >
              {pos === props.value ? (
                <div class="size-2.5 rounded-[2px] border border-editor-text bg-editor-panel" />
              ) : (
                <div class="size-[3px] rounded-full bg-editor-text-dim" />
              )}
            </button>
          )}
        </For>
      </div>
    </div>
  );
}
