import { For, Show } from "solid-js";
import { Icon, type IconName } from "./icons";
import { NumField, PropRow, SelectField, Slider } from "./primitives";
import { useEditor } from "./EditorContext";
import { SectionHeader } from "./SectionHeader";
import { CanvasProperties } from "./CanvasProperties";

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
  const { workspace, layers, activeLayerId, scheduler, activeDocumentId } = useEditor();

  const activeLayer = () => {
    const id = activeLayerId();
    if (!id) return null;
    return layers().find(l => l.id === id) || null;
  };

  const handleOpacityChange = (val: number) => {
    const engine = workspace.getActiveEngine();
    const id = activeLayerId();
    if (engine && id) {
      // Direct update for live performance (no history commit on every drag segment, just update)
      engine.setLayerOpacity(id, val / 100);
      scheduler.requestRender();
    }
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
                    <div class="flex-grow flex items-center gap-2">
                      <input
                        type="range"
                        min="0"
                        max="100"
                        value={Math.round(layer().opacity * 100)}
                        onInput={(e) => handleOpacityChange(parseInt(e.currentTarget.value))}
                        class="flex-grow accent-editor-accent"
                      />
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
                <Icon
                  name="x"
                  class="size-3.5 text-editor-text-dim"
                  strokeWidth={1.75}
                />
              }
            />

            <div class="mt-3 flex flex-col gap-2.5">
              <PropRow label="Profile">
                <SelectField value="Landscape" class="flex-1" />
              </PropRow>
              <PropRow label="WB">
                <SelectField value="As Shot" class="flex-1" />
                <button
                  class="flex size-[26px] shrink-0 items-center justify-center text-editor-icon hover:text-editor-text"
                  aria-label="White balance picker"
                >
                  <Icon name="pipette" class="size-3.5" strokeWidth={1.75} />
                </button>
              </PropRow>
              <SliderRow
                label="Temp"
                percent={40}
                value="5600"
                gradient="linear-gradient(to right, #3b82f6, #6b8db8, #d98a2b)"
                centerTick={true}
              />
              <SliderRow
                label="Tint"
                percent={50}
                value="+6"
                gradient="linear-gradient(to right, #5aa86a, #2b2b2b 50%, #b25fae)"
                centerTick={true}
              />
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

function SliderRow(props: {
  label: string;
  percent: number;
  value: string;
  gradient?: string;
  centerTick?: boolean;
}) {
  return (
    <div class="flex items-center gap-2.5">
      <span class="w-[58px] shrink-0 text-[12px] text-editor-text-dim">
        {props.label}
      </span>
      <div class="flex flex-1 items-center gap-2.5">
        <Slider
          percent={props.percent}
          gradient={props.gradient}
          centerTick={props.centerTick}
        />
        <span class="w-[28px] shrink-0 text-right text-[12px] text-editor-text">
          {props.value}
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
