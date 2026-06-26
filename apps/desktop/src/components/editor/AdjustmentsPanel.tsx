import { For, Show, createSignal, createEffect, batch } from "solid-js";
import { Icon, type IconName } from "./icons";
import { useEditor } from "./EditorContext";
import { SectionHeader } from "./SectionHeader";
import { LayerThumb } from "./LayerThumb";
import type { BasicAdjustment } from "@/engine/layerAdjustments";

const COMING_SOON_SECTIONS: readonly {
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

const COMING_SOON_DESCRIPTIONS: Record<string, string> = {
  "Tone Curve": "Non-destructive spline-based RGB tone and contrast adjustment.",
  "HSL / Color": "Selective color tuning for Hue, Saturation, and Luminance channels.",
  "Color Grading": "Three-way color wheels control for shadows, midtones, and highlights.",
  "Detail": "Unsharp masking, high-pass sharpening, and bilateral noise reduction.",
  "Lens Corrections": "Chromatic aberration control, barrel distortion, and vignette corrections.",
};

export function AdjustmentsPanel() {
  const { workspace, layers, selectedLayerId, scheduler, activeDocumentId, renderer } = useEditor();
  const [basicAdjustment, setBasicAdjustment] = createSignal<BasicAdjustment>({
    brightness: 0,
    contrast: 0,
    saturation: 0,
  });
  const [adjustmentBase, setAdjustmentBase] = createSignal<{
    layerId: string;
  } | null>(null);

  // Reset slider values whenever the selected layer changes
  createEffect(() => {
    selectedLayerId();
    batch(() => {
      setBasicAdjustment({ brightness: 0, contrast: 0, saturation: 0 });
      setAdjustmentBase(null);
    });
  });

  // Sync slider values from layer adjustments (for undo/redo)
  createEffect(() => {
    const layer = activeLayer();
    if (!layer) return;
    
    // Only sync if not currently adjusting (to avoid fighting with live preview)
    const base = adjustmentBase();
    if (base && base.layerId === layer.id) return;
    
    // Sync from layer or reset to zero if no adjustments
    if (layer.basicAdjustment) {
      setBasicAdjustment({ ...layer.basicAdjustment });
    } else {
      setBasicAdjustment({ brightness: 0, contrast: 0, saturation: 0 });
    }
  });

  const activeLayer = () => {
    const id = selectedLayerId();
    if (!id) return null;
    return layers().find(l => l.id === id) || null;
  };

  const previewBasicAdjustment = (next: BasicAdjustment, label: string) => {
    const engine = workspace.getActiveEngine();
    const history = workspace.getActiveHistory();
    const layer = activeLayer();
    if (!engine || !history || !layer?.imageBitmap || layer.locked) return;

    let base = adjustmentBase();
    if (!base || base.layerId !== layer.id) {
      base = { layerId: layer.id };
      setAdjustmentBase(base);
      history.commit(engine.snapshot(), label);
    }

    engine.applyBasicAdjustment(layer.id, next);
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

  const basicStatusText = () => {
    const layer = activeLayer();
    if (!layer) return null;
    if (layer.locked) return "Layer is locked. Unlock it before applying pixel adjustments.";
    if (!layer.imageBitmap) return "This layer has no pixels yet. Add image pixels before adjusting tone.";
    return null;
  };

  const resetBasicAdjustment = () => {
    const engine = workspace.getActiveEngine();
    const layer = activeLayer();
    if (engine && layer) {
      try {
        engine.clearBasicAdjustments(layer.id);
        const updated = engine.getLayer(layer.id);
        if (updated?.imageBitmap) {
          renderer.uploadImage(layer.id, updated.imageBitmap);
        }
        workspace.notifyVisualChange();
        scheduler.requestRender();
      } catch (e) {
        console.error("Failed to reset adjustments:", e);
      }
    }
    setAdjustmentBase(null);
    setBasicAdjustment({ brightness: 0, contrast: 0, saturation: 0 });
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
                <p class="text-[12px] text-editor-text-dim leading-snug">Open or create an image to adjust pixels.</p>
              </div>
            </div>
          }
        >
          <Show
            when={activeLayer()}
            fallback={
              <div class="flex h-full flex-col items-center justify-center gap-3 text-center px-6">
                <Icon name="sun" class="size-6 text-editor-text-dim opacity-50" strokeWidth={1.5} />
                <div class="space-y-1">
                  <p class="text-[13px] font-medium text-editor-text">No layer selected</p>
                  <p class="text-[12px] text-editor-text-dim leading-snug">Select a layer to adjust its pixels.</p>
                </div>
              </div>
            }
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

                <For each={COMING_SOON_SECTIONS}>
                  {(section) => (
                    <CollapsibleSection
                      icon={section.icon}
                      iconClass={section.iconClass}
                      label={section.label}
                    />
                  )}
                </For>
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

function CollapsibleSection(props: {
  icon: IconName;
  iconClass: string;
  label: string;
}) {
  const [open, setOpen] = createSignal(false);

  return (
    <div class="border-b border-editor-divider">
      <button
        onClick={() => setOpen(!open())}
        class="flex h-[42px] w-full items-center justify-between px-4 hover:bg-white/[0.03]"
      >
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
          name={open() ? "chevron-up" : "chevron-right"}
          class="size-4 text-editor-text-dim"
          strokeWidth={1.75}
        />
      </button>
      <Show when={open()}>
        <div class="px-4 pb-3">
          <div class="flex flex-col gap-2 rounded-[4px] border border-editor-field-border bg-editor-field p-2.5">
            <div class="flex items-center gap-1.5 text-editor-accent text-[10px] font-semibold uppercase tracking-wider">
              <Icon name="sparkles" class="size-3" strokeWidth={2} />
              <span>In Development</span>
            </div>
            <p class="text-[11px] leading-relaxed text-editor-text-dim">
              {COMING_SOON_DESCRIPTIONS[props.label] || "This professional adjustment tool is currently in development."}
            </p>
          </div>
        </div>
      </Show>
    </div>
  );
}
