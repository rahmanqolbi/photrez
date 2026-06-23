import { For, Show, createSignal } from "solid-js";
import { Icon, type IconName } from "./icons";
import { NumField, PropRow, SelectField, Slider } from "./primitives";
import { useEditor } from "./EditorContext";
import { SectionHeader } from "./SectionHeader";
import { CanvasProperties } from "./CanvasProperties";
import type { BasicAdjustment } from "@/engine/layerAdjustments";

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

  const activeLayer = () => {
    const id = selectedLayerId();
    if (!id) return null;
    return layers().find(l => l.id === id) || null;
  };

  const handleOpacityChange = (val: number) => {
    const engine = workspace.getActiveEngine();
    const id = selectedLayerId();
    if (engine && id) {
      // Direct update for live performance (no history commit on every drag segment, just update)
      engine.setLayerOpacity(id, val / 100);
      scheduler.requestRender();
    }
  };

  const setAdjustmentValue = (key: keyof BasicAdjustment, value: number) => {
    setBasicAdjustment((current) => ({ ...current, [key]: value }));
  };

  const hasPendingAdjustment = () => {
    const adjustment = basicAdjustment();
    return adjustment.brightness !== 0 || adjustment.contrast !== 0 || adjustment.saturation !== 0;
  };

  const canApplyBasicAdjustment = () => {
    const layer = activeLayer();
    return Boolean(layer?.imageBitmap && !layer.locked && hasPendingAdjustment());
  };

  const resetBasicAdjustment = () => {
    setBasicAdjustment({ brightness: 0, contrast: 0, saturation: 0 });
  };

  const applyBasicAdjustment = () => {
    const engine = workspace.getActiveEngine();
    const history = workspace.getActiveHistory();
    const layer = activeLayer();
    if (!engine || !history || !layer?.imageBitmap || layer.locked || !hasPendingAdjustment()) return;

    history.commit(engine.snapshot(), "Basic Adjustment");
    engine.applyBasicAdjustment(layer.id, basicAdjustment());
    const updated = engine.getLayer(layer.id);
    if (updated?.imageBitmap) {
      renderer.uploadImage(layer.id, updated.imageBitmap);
    }
    workspace.notifyVisualChange();
    scheduler.requestRender();
    resetBasicAdjustment();
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
                  <PropRow label="Position">
                    <NumField label="X" value={`${Math.round(layer().transform.x)} px`} class="flex-1" />
                    <NumField label="Y" value={`${Math.round(layer().transform.y)} px`} class="flex-1" />
                  </PropRow>
                  <PropRow label="Size">
                    <NumField label="W" value={`${Math.round(layer().width * layer().transform.scaleX)} px`} class="flex-1" />
                    <NumField label="H" value={`${Math.round(layer().height * layer().transform.scaleY)} px`} class="flex-1" />
                  </PropRow>
                  <PropRow label="Rotation">
                    <NumField value={`${layer().transform.rotation.toFixed(2)}°`} class="flex-1" />
                  </PropRow>
                  <PropRow label="Scale">
                    <NumField label="X" value={`${Math.round(layer().transform.scaleX * 100)} %`} class="flex-1" />
                    <NumField label="Y" value={`${Math.round(layer().transform.scaleY * 100)} %`} class="flex-1" />
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
                          type="range"
                          min="0"
                          max="100"
                          value={Math.round(layer().opacity * 100)}
                          onInput={(e) => handleOpacityChange(parseInt(e.currentTarget.value))}
                          class="absolute inset-0 w-full h-[14px] opacity-0 cursor-pointer"
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
              <button
                type="button"
                data-basic-adjustment-apply
                disabled={!canApplyBasicAdjustment()}
                onClick={applyBasicAdjustment}
                class="mt-1 flex h-[28px] items-center justify-center rounded-[4px] border border-editor-field-border bg-editor-field px-3 text-[12px] font-medium text-editor-text transition-colors hover:bg-white/[0.045] disabled:pointer-events-none disabled:opacity-45"
              >
                Apply to Layer
              </button>
              <Show when={activeLayer() && !activeLayer()?.imageBitmap}>
                <p class="text-[11px] leading-snug text-editor-text-dim">
                  Add image pixels to this layer before applying adjustments.
                </p>
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
