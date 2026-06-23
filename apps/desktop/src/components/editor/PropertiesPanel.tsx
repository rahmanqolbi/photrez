import { For, Show, createSignal } from "solid-js";
import { Icon, type IconName } from "./icons";
import { EditableNumField, PropRow, SelectField, Slider } from "./primitives";
import { useEditor } from "./EditorContext";
import { SectionHeader } from "./SectionHeader";
import { CanvasProperties } from "./CanvasProperties";
import type { BasicAdjustment } from "@/engine/layerAdjustments";
import type { Transform2D } from "@/engine/types";

const COLLAPSED_SECTIONS: readonly {
  icon: IconName;
  iconClass: string;
  label: string;
}[] = [
  { icon: "spline", iconClass: "text-editor-text-dim", label: "Tone Curve" },
  { icon: "palette", iconClass: "text-sky-400", label: "HSL / Color" },
  { icon: "swatch", iconClass: "text-amber-400", label: "Color Grading" },
  { icon: "sparkles", iconClass: "text-sky-300", label: "Detail" },
  {
    icon: "aperture",
    iconClass: "text-emerald-400",
    label: "Lens Corrections",
  },
] as const;

export function PropertiesPanel() {
  const { workspace, layers, selectedLayerId, scheduler, activeDocumentId, renderer } = useEditor();
  const [basicAdjustment, setBasicAdjustment] = createSignal<BasicAdjustment>({
    brightness: 0,
    contrast: 0,
    saturation: 0,
  });
  const [adjustmentBase, setAdjustmentBase] = createSignal<{
    layerId: string;
    bitmap: ImageBitmap;
  } | null>(null);
  const [opacityEditLayerId, setOpacityEditLayerId] = createSignal<string | null>(null);

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

  const previewBasicAdjustment = (next: BasicAdjustment, label: string) => {
    const engine = workspace.getActiveEngine();
    const history = workspace.getActiveHistory();
    const layer = activeLayer();
    if (!engine || !history || !layer?.imageBitmap || layer.locked) return;

    let base = adjustmentBase();
    if (!base || base.layerId !== layer.id) {
      base = { layerId: layer.id, bitmap: layer.imageBitmap };
      setAdjustmentBase(base);
      history.commit(engine.snapshot(), label);
    }

    engine.applyBasicAdjustment(layer.id, next, base.bitmap);
    const updated = engine.getLayer(layer.id);
    if (updated?.imageBitmap) {
      renderer.uploadImage(layer.id, updated.imageBitmap);
    }
    workspace.notifyVisualChange();
    scheduler.requestRender();
  };

  const setAdjustmentValue = (key: keyof BasicAdjustment, value: number) => {
    const next = { ...basicAdjustment(), [key]: value };
    setBasicAdjustment(next);
    previewBasicAdjustment(next, key === "brightness" ? "Adjust Brightness" : key === "contrast" ? "Adjust Contrast" : "Adjust Saturation");
  };

  const hasPendingAdjustment = () => {
    const adjustment = basicAdjustment();
    return adjustment.brightness !== 0 || adjustment.contrast !== 0 || adjustment.saturation !== 0;
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

  const basicStatusText = () => {
    const layer = activeLayer();
    if (!layer) return null;
    if (layer.locked) return "Layer is locked. Unlock it before applying pixel adjustments.";
    if (!layer.imageBitmap) return "This layer has no pixels yet. Add image pixels before adjusting tone.";
    return null;
  };

  const resetBasicAdjustment = () => {
    const engine = workspace.getActiveEngine();
    const base = adjustmentBase();
    if (engine && base) {
      engine.setLayerImageBitmap(base.layerId, base.bitmap);
      renderer.uploadImage(base.layerId, base.bitmap);
      workspace.notifyVisualChange();
      scheduler.requestRender();
    }
    setAdjustmentBase(null);
    setBasicAdjustment({ brightness: 0, contrast: 0, saturation: 0 });
  };

  return (
    <section class="flex flex-1 shrink-0 flex-col overflow-hidden bg-editor-panel">
      <div class="flex h-[46px] shrink-0 items-center border-b border-editor-divider px-4">
        <h2 class="text-[13px] font-medium text-editor-text">Properties</h2>
      </div>

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
                      class="flex size-[26px] shrink-0 items-center justify-center text-editor-accent"
                      aria-label="Lock scale"
                    >
                      <Icon name="link" class="size-3.5" strokeWidth={1.75} />
                    </button>
                  </PropRow>
                  <PropRow label="Opacity">
                    <div class="flex-grow flex items-center gap-2.5">
                      <div class="relative flex-grow flex items-center h-[14px]">
                        <Slider
                          percent={Math.round(layer().opacity * 100)}
                          accent={true}
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
                    <AnchorGrid />
                  </div>

                  <PropRow label="Constrain">
                    <SelectField value="Lock Aspect Ratio" class="flex-1" />
                  </PropRow>
                </div>
              </div>
            )}
          </Show>

          <div class="border-b border-editor-divider px-4 py-3.5">
            <SectionHeader
              icon="sun"
              iconClass="text-editor-text-dim"
              label="Basic"
              trailing={
                <button
                  type="button"
                  aria-label="Reset basic adjustments"
                  disabled={!hasPendingAdjustment()}
                  onClick={resetBasicAdjustment}
                  class="flex size-5 items-center justify-center rounded-[3px] text-editor-text-dim hover:bg-white/[0.045] hover:text-editor-text disabled:pointer-events-none disabled:opacity-40"
                >
                  <Icon
                    name="x"
                    class="size-3.5"
                    strokeWidth={1.75}
                  />
                </button>
              }
            />

            <div class="mt-3 flex flex-col gap-2.5">
              <AdjustmentSliderRow
                label="Bright"
                value={basicAdjustment().brightness}
                onInput={(value) => setAdjustmentValue("brightness", value)}
              />
              <AdjustmentSliderRow
                label="Contrast"
                value={basicAdjustment().contrast}
                onInput={(value) => setAdjustmentValue("contrast", value)}
              />
              <AdjustmentSliderRow
                label="Saturate"
                value={basicAdjustment().saturation}
                onInput={(value) => setAdjustmentValue("saturation", value)}
              />
              <p class="mt-1 text-[11px] leading-snug text-editor-text-dim">
                Drag to preview directly on the active layer. Undo restores the previous pixels.
              </p>
              <Show when={basicStatusText()}>
                {(message) => <StatusHint>{message()}</StatusHint>}
              </Show>
            </div>
          </div>

          <For each={COLLAPSED_SECTIONS}>
            {(section) => (
              <CollapsedRow
                icon={section.icon}
                iconClass={section.iconClass}
                label={section.label}
              />
            )}
          </For>
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

function AdjustmentSliderRow(props: {
  label: string;
  value: number;
  onInput: (value: number) => void;
}) {
  const percent = () => props.value + 100;
  const displayValue = () => props.value > 0 ? `+${props.value}` : `${props.value}`;
  const trackFillStyle = () => {
    const position = percent() / 2;
    if (props.value >= 0) {
      return {
        left: "50%",
        width: `${position - 50}%`,
      };
    }
    return {
      left: `${position}%`,
      width: `${50 - position}%`,
    };
  };

  return (
    <div class="flex min-h-[28px] items-center gap-2.5">
      <span class="w-[58px] shrink-0 text-[12px] font-medium text-editor-text-dim">
        {props.label}
      </span>
      <div class="flex flex-1 items-center gap-2.5">
        <div class="relative flex h-[18px] flex-1 items-center">
          <div
            aria-hidden="true"
            class="absolute left-0 right-0 top-1/2 h-[4px] -translate-y-1/2 rounded-full border border-black/30 shadow-[inset_0_1px_1px_rgba(255,255,255,0.05)]"
            style={{
              "background-image": "linear-gradient(to right, rgba(59,130,246,0.56), rgba(114,114,122,0.56) 50%, rgba(245,158,11,0.58))",
            }}
          />
          <div
            aria-hidden="true"
            class="absolute top-1/2 h-[4px] -translate-y-1/2 rounded-full bg-editor-accent shadow-[0_0_10px_rgba(74,144,226,0.28)]"
            style={trackFillStyle()}
          />
          <div
            aria-hidden="true"
            class="absolute left-1/2 top-1/2 h-[12px] w-px -translate-x-1/2 -translate-y-1/2 bg-editor-text/45"
          />
          <div
            aria-hidden="true"
            class="absolute top-1/2 size-[12px] -translate-y-1/2 rounded-full border border-black/55 bg-[#d8dce2] shadow-[0_1px_2px_rgba(0,0,0,0.65),0_0_0_1px_rgba(255,255,255,0.18)]"
            style={{ left: `calc(${percent() / 2}% - 6px)` }}
          />
          <input
            aria-label={props.label}
            type="range"
            min="-100"
            max="100"
            value={props.value}
            onInput={(e) => props.onInput(parseInt(e.currentTarget.value, 10))}
            class="absolute inset-0 h-[18px] w-full cursor-pointer opacity-0"
          />
        </div>
        <span class="flex h-[22px] w-[40px] shrink-0 items-center justify-end rounded-[3px] border border-editor-field-border bg-editor-field px-1.5 text-right text-[11px] tabular-nums text-editor-text">
          {displayValue()}
        </span>
      </div>
    </div>
  );
}

function AnchorGrid() {
  return (
    <div class="relative h-[42px] w-[88px]">
      <div class="absolute left-1/2 top-1/2 h-[1px] w-[72px] -translate-x-1/2 -translate-y-1/2 bg-editor-field-border" />
      <div class="absolute left-1/2 top-1/2 h-[34px] w-[1px] -translate-x-1/2 -translate-y-1/2 bg-editor-field-border" />
      <div class="relative grid h-full grid-cols-3 grid-rows-3">
        <For each={Array.from({ length: 9 })}>
          {(_, index) => (
            <div class="flex items-center justify-center">
              {index() === 4 ? (
                <div class="size-2.5 rounded-[2px] border border-editor-text bg-editor-panel" />
              ) : (
                <div class="size-[3px] rounded-full bg-editor-text-dim" />
              )}
            </div>
          )}
        </For>
      </div>
    </div>
  );
}

function CollapsedRow(props: {
  icon: IconName;
  iconClass: string;
  label: string;
}) {
  return (
    <button class="flex h-[42px] w-full items-center justify-between border-b border-editor-divider px-4 hover:bg-white/[0.03]">
      <div class="flex items-center gap-2.5">
        <span class="flex size-4 items-center justify-center">
          <Icon
            name={props.icon}
            class={`size-[15px] ${props.iconClass}`}
            strokeWidth={1.75}
          />
        </span>
        <span class="text-[12.5px] text-editor-text">{props.label}</span>
      </div>
      <Icon
        name="chevron-right"
        class="size-4 text-editor-text-dim"
        strokeWidth={1.75}
      />
    </button>
  );
}
