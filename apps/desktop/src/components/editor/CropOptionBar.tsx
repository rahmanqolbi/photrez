import { Show, For, createMemo, createSignal, createEffect, untrack } from "solid-js";
import { NumField, EditableNumField } from "./primitives";
import { useEditor } from "./EditorContext";
import { CROP_PRESETS } from "@/viewport/cropPresets";
import { toUnit, fromUnit } from "@/viewport/unitConversion";
import { fitCropRectToAspect } from "@/viewport/cropAutoFit";
import { ToggleBtn, Divider } from "./OptionBarShared";
import { Icon } from "./icons";
import { discardCropSession, resetCropPreviewToCanvas, applyCropPreview } from "./cropToolActions";

export function CropOptionBar() {
  const {
    workspace,
    renderer,
    setActiveTool,
    scheduler,
    cropRect, setCropRect,
    cropMode, setCropMode,
    cropGuideMode, setCropGuideMode,
    cropDeletePixels, setCropDeletePixels,
    cropAspect, setCropAspect,
    cropSizeTarget, setCropSizeTarget,
    cropSizeUnit, setCropSizeUnit,
    cropRotation, setCropRotation,
    hiddenCropPreview, setHiddenCropPreview,
    docWidth, docHeight,
    activeDocumentId,
    commitCropState,
  } = useEditor();

  const initialPreset = () => {
    if (cropMode() !== "ratio") return "custom";
    const a = cropAspect();
    if (!a) return "custom";
    const match = CROP_PRESETS.find(p => p.aspect.w === a.w && p.aspect.h === a.h);
    return match ? match.value : "custom";
  };

  const [selectedPreset, setSelectedPreset] = createSignal(initialPreset());

  createEffect(() => {
    activeDocumentId();
    setSelectedPreset(untrack(() => initialPreset()));
  });

  const cropModeLabel = () => {
    const m = cropMode();
    return m === "free" ? "Free" : m === "ratio" ? "Ratio" : "Size";
  };

  const presetLabel = () => {
    const pVal = selectedPreset();
    if (pVal === "custom") return "Custom";
    const preset = CROP_PRESETS.find(p => p.value === pVal);
    return preset ? preset.label : "Custom";
  };

  const guideModeLabel = () => {
    const g = cropGuideMode();
    return g === "none" ? "None"
         : g === "thirds" ? "Thirds"
         : g === "grid" ? "Grid"
         : g === "diagonal" ? "Diagonal"
         : g === "golden" ? "Golden"
         : "None";
  };

  const unitLabel = () => cropSizeUnit();

  const handlePresetChange = (value: string) => {
    setSelectedPreset(value);
    if (value === "custom") {
      setCropMode("ratio");
      const aspect = cropAspect() ?? { w: 16, h: 9 };
      setCropAspect(aspect);
      if (cropRect()) {
        setCropRect(fitCropRectToAspect(aspect, docWidth(), docHeight(), cropRotation()));
      }
      return;
    }
    const preset = CROP_PRESETS.find(p => p.value === value);
    if (preset) {
      setCropMode("ratio");
      setCropAspect({ w: preset.aspect.w, h: preset.aspect.h });
      if (cropRect()) {
        setCropRect(fitCropRectToAspect(preset.aspect, docWidth(), docHeight(), cropRotation()));
      }
    }
  };

  return (
    <>
      {/* Crop Mode Selector */}
      <div class="relative flex h-[24px] shrink-0 items-center rounded-[3px] border border-editor-field-border bg-editor-field px-2 hover:border-editor-field-border/80 focus-within:border-editor-accent/50 focus-within:ring-1 focus-within:ring-editor-accent/30 transition-all cursor-pointer">
        <span class="text-[11px] text-editor-text mr-4 select-none">
          {cropModeLabel()}
        </span>
        <div class="ml-auto pointer-events-none text-editor-text-dim">
          <Icon name="chevron-down" class="size-3" strokeWidth={1.5} />
        </div>
        <select
          value={cropMode()}
          onChange={(e) => {
            const mode = e.currentTarget.value as any;
            setCropMode(mode);
            if (cropRect()) {
              if (mode === "ratio") {
                const aspect = cropAspect() ?? { w: 16, h: 9 };
                setCropAspect(aspect);
                const match = CROP_PRESETS.find(p => p.aspect.w === aspect.w && p.aspect.h === aspect.h);
                setSelectedPreset(match ? match.value : "custom");
                setCropRect(fitCropRectToAspect(aspect, docWidth(), docHeight(), cropRotation()));
              } else if (mode === "size") {
                const target = cropSizeTarget() ?? { w: 800, h: 600 };
                setCropRect(fitCropRectToAspect(target, docWidth(), docHeight(), cropRotation()));
              }
            }
          }}
          class="absolute inset-0 h-full w-full opacity-0 cursor-pointer text-[11px]"
        >
          <option value="free" class="bg-editor-panel text-editor-text">Free</option>
          <option value="ratio" class="bg-editor-panel text-editor-text">Ratio</option>
          <option value="size" class="bg-editor-panel text-editor-text">Size</option>
        </select>
      </div>

      <Divider />

      {/* Mode-specific Fields */}
      <Show when={cropMode() === "free"}>
        <div class="flex shrink-0 items-center gap-1.5">
          <NumField label="W" value={`${Math.round(cropRect()?.w ?? 0)} px`} class="w-[82px]" />
          <NumField label="H" value={`${Math.round(cropRect()?.h ?? 0)} px`} class="w-[82px]" />
        </div>
      </Show>

      <Show when={cropMode() === "ratio"}>
        <div class="flex items-center gap-1.5">
          <div class="relative flex h-[24px] shrink-0 items-center rounded-[3px] border border-editor-field-border bg-editor-field px-2 hover:border-editor-field-border/80 focus-within:border-editor-accent/50 focus-within:ring-1 focus-within:ring-editor-accent/30 transition-all cursor-pointer">
            <span class="text-[11px] text-editor-text mr-4 select-none">
              {presetLabel()}
            </span>
            <div class="ml-auto pointer-events-none text-editor-text-dim">
              <Icon name="chevron-down" class="size-3" strokeWidth={1.5} />
            </div>
            <select
              value={selectedPreset()}
              onChange={(e) => handlePresetChange(e.currentTarget.value)}
              class="absolute inset-0 h-full w-full opacity-0 cursor-pointer text-[11px]"
            >
              <For each={CROP_PRESETS}>
                {(p) => <option value={p.value} class="bg-editor-panel text-editor-text">{p.label}</option>}
              </For>
              <option value="custom" class="bg-editor-panel text-editor-text">Custom</option>
            </select>
          </div>
          <Show when={selectedPreset() === "custom"}>
            <div class="flex shrink-0 items-center gap-1">
              <EditableNumField
                label="W"
                value={cropAspect()?.w ?? 1}
                onSubmit={(v) => {
                  const nextAspect = { w: v, h: cropAspect()?.h ?? 1 };
                  setCropAspect(nextAspect);
                  if (cropRect()) {
                    setCropRect(fitCropRectToAspect(nextAspect, docWidth(), docHeight(), cropRotation()));
                  }
                }}
                class="w-[62px]"
              />
              <span class="text-[11px] text-editor-text-dim font-bold">:</span>
              <EditableNumField
                label="H"
                value={cropAspect()?.h ?? 1}
                onSubmit={(v) => {
                  const nextAspect = { w: cropAspect()?.w ?? 1, h: v };
                  setCropAspect(nextAspect);
                  if (cropRect()) {
                    setCropRect(fitCropRectToAspect(nextAspect, docWidth(), docHeight(), cropRotation()));
                  }
                }}
                class="w-[62px]"
              />
            </div>
          </Show>
        </div>
      </Show>

      <Show when={cropMode() === "size"}>
        <div class="flex shrink-0 items-center gap-1.5">
          <EditableNumField
            label="W"
            value={toUnit(cropSizeTarget()?.w ?? 800, cropSizeUnit())}
            onSubmit={(v) => {
              const valPx = fromUnit(v, cropSizeUnit());
              const nextTarget = { w: valPx, h: cropSizeTarget()?.h ?? 600 };
              setCropSizeTarget(nextTarget);
              if (cropRect()) {
                setCropRect(fitCropRectToAspect(nextTarget, docWidth(), docHeight(), cropRotation()));
              }
            }}
            class="w-[68px]"
          />
          <EditableNumField
            label="H"
            value={toUnit(cropSizeTarget()?.h ?? 600, cropSizeUnit())}
            onSubmit={(v) => {
              const valPx = fromUnit(v, cropSizeUnit());
              const nextTarget = { w: cropSizeTarget()?.w ?? 800, h: valPx };
              setCropSizeTarget(nextTarget);
              if (cropRect()) {
                setCropRect(fitCropRectToAspect(nextTarget, docWidth(), docHeight(), cropRotation()));
              }
            }}
            class="w-[68px]"
          />
          
          {/* Unit Selector */}
          <div class="relative flex h-[24px] shrink-0 items-center rounded-[3px] border border-editor-field-border bg-editor-field px-2 hover:border-editor-field-border/80 focus-within:border-editor-accent/50 focus-within:ring-1 focus-within:ring-editor-accent/30 transition-all cursor-pointer">
            <span class="text-[11px] text-editor-text mr-4 select-none">
              {unitLabel()}
            </span>
            <div class="ml-auto pointer-events-none text-editor-text-dim">
              <Icon name="chevron-down" class="size-3" strokeWidth={1.5} />
            </div>
            <select
              value={cropSizeUnit()}
              onChange={(e) => setCropSizeUnit(e.currentTarget.value as any)}
              class="absolute inset-0 h-full w-full opacity-0 cursor-pointer text-[11px]"
            >
              <option value="px" class="bg-editor-panel text-editor-text">px</option>
              <option value="cm" class="bg-editor-panel text-editor-text">cm</option>
              <option value="mm" class="bg-editor-panel text-editor-text">mm</option>
              <option value="in" class="bg-editor-panel text-editor-text">in</option>
            </select>
          </div>
        </div>
      </Show>

      {/* Angle Field */}
      <EditableNumField
        label="Angle"
        value={cropRotation()}
        suffix="°"
        onSubmit={(v) => {
          const r = cropRect();
          if (r) commitCropState(r, cropRotation());
          setCropRotation(v);
        }}
        class="w-[64px]"
      />

      {/* Rotation & Swap Buttons */}
      <div class="flex items-center gap-1">
        <button
          onClick={() => {
            const rect = cropRect();
            if (rect) {
              commitCropState(rect, cropRotation());
              const cx = rect.x + rect.w / 2;
              const cy = rect.y + rect.h / 2;
              setCropRect({ x: cx - rect.h / 2, y: cy - rect.w / 2, w: rect.h, h: rect.w });
            }
            setCropRotation(cropRotation() - 90);
          }}
          class="flex size-[24px] shrink-0 items-center justify-center rounded-[3px] border border-transparent text-editor-icon hover:border-editor-field-border hover:text-editor-text transition-colors"
          aria-label="Rotate 90 degrees counter-clockwise"
          title="Rotate 90° CCW"
        >
          <Icon name="rotate-ccw" class="size-4" strokeWidth={1.5} />
        </button>
        <button
          onClick={() => {
            const rect = cropRect();
            if (rect) {
              commitCropState(rect, cropRotation());
              const cx = rect.x + rect.w / 2;
              const cy = rect.y + rect.h / 2;
              setCropRect({ x: cx - rect.h / 2, y: cy - rect.w / 2, w: rect.h, h: rect.w });
            }
            setCropRotation(cropRotation() + 90);
          }}
          class="flex size-[24px] shrink-0 items-center justify-center rounded-[3px] border border-transparent text-editor-icon hover:border-editor-field-border hover:text-editor-text transition-colors"
          aria-label="Rotate 90 degrees clockwise"
          title="Rotate 90° CW"
        >
          <Icon name="rotate-cw" class="size-4" strokeWidth={1.5} />
        </button>
        <button
          onClick={() => {
            if (cropMode() === "ratio" && cropAspect()) {
              const nextAspect = { w: cropAspect()!.h, h: cropAspect()!.w };
              setCropAspect(nextAspect);
              const match = CROP_PRESETS.find(p => p.aspect.w === nextAspect.w && p.aspect.h === nextAspect.h);
              setSelectedPreset(match ? match.value : "custom");
              if (cropRect()) {
                setCropRect(fitCropRectToAspect(nextAspect, docWidth(), docHeight(), cropRotation()));
              }
            } else if (cropMode() === "size" && cropSizeTarget()) {
              const nextTarget = { w: cropSizeTarget()!.h, h: cropSizeTarget()!.w };
              setCropSizeTarget(nextTarget);
              if (cropRect()) {
                setCropRect(fitCropRectToAspect(nextTarget, docWidth(), docHeight(), cropRotation()));
              }
            } else {
              const rect = cropRect();
              if (rect) {
                const cx = rect.x + rect.w / 2;
                const cy = rect.y + rect.h / 2;
                const nw = rect.h;
                const nh = rect.w;
                setCropRect({
                  x: cx - nw / 2,
                  y: cy - nh / 2,
                  w: nw,
                  h: nh
                });
              }
            }
          }}
          class="flex size-[24px] shrink-0 items-center justify-center rounded-[3px] border border-transparent text-editor-icon hover:border-editor-field-border hover:text-editor-text transition-colors"
          aria-label="Swap width and height"
          title="Swap Width/Height"
        >
          <Icon name="swap" class="size-4" strokeWidth={1.5} />
        </button>
      </div>

      <Divider />

      {/* Composition Guide Mode */}
      <div class="relative flex h-[24px] shrink-0 items-center rounded-[3px] border border-editor-field-border bg-editor-field px-2 hover:border-editor-field-border/80 focus-within:border-editor-accent/50 focus-within:ring-1 focus-within:ring-editor-accent/30 transition-all cursor-pointer">
        <span class="text-[11px] text-editor-text mr-4 select-none">
          {guideModeLabel()}
        </span>
        <div class="ml-auto pointer-events-none text-editor-text-dim">
          <Icon name="chevron-down" class="size-3" strokeWidth={1.5} />
        </div>
        <select
          value={cropGuideMode()}
          onChange={(e) => setCropGuideMode(e.currentTarget.value as any)}
          class="absolute inset-0 h-full w-full opacity-0 cursor-pointer text-[11px]"
        >
          <option value="none" class="bg-editor-panel text-editor-text">None</option>
          <option value="thirds" class="bg-editor-panel text-editor-text">Thirds</option>
          <option value="grid" class="bg-editor-panel text-editor-text">Grid</option>
          <option value="diagonal" class="bg-editor-panel text-editor-text">Diagonal</option>
          <option value="golden" class="bg-editor-panel text-editor-text">Golden</option>
        </select>
      </div>

      <Divider />

      {/* Delete pixels toggle */}
      <ToggleBtn
        active={cropDeletePixels()}
        onChange={setCropDeletePixels}
        icon="trash"
        label="Delete Cropped"
        title={cropDeletePixels() ? "Delete Cropped Pixels (Destructive)" : "Keep Cropped Pixels (Non-Destructive)"}
      />

      <Divider />

      {/* Actions */}
      <button
        onClick={() => {
          resetCropPreviewToCanvas({
            engine: workspace.getActiveEngine(),
            setCropRect,
            setCropRotation,
            setHiddenCropPreview,
          });
        }}
        class="flex h-[24px] shrink-0 items-center rounded-[3px] border border-transparent px-2 text-[11px] text-editor-text-dim hover:border-editor-field-border hover:text-editor-text transition-colors"
      >
        Reset
      </button>

      <button
        onClick={() => {
          discardCropSession({
            cropRect: () => cropRect(),
            cropRotation: () => cropRotation(),
            hiddenCropPreview,
            setCropRect,
            setCropRotation,
            setHiddenCropPreview,
          });
        }}
        class="flex h-[24px] shrink-0 items-center rounded-[3px] border border-editor-field-border bg-editor-field px-2.5 text-[11px] text-editor-text hover:bg-white/5 transition-colors"
      >
        Cancel
      </button>

      <button
        onClick={() => {
          applyCropPreview({
            workspace,
            renderer,
            cropRect: cropRect(),
            cropMode: cropMode(),
            cropSizeTarget: cropSizeTarget(),
            cropDeletePixels: cropDeletePixels(),
            cropRotation: cropRotation(),
            scheduler,
            setCropRect,
            setCropRotation,
            setHiddenCropPreview,
            setActiveTool,
          });
        }}
        class="flex h-[24px] shrink-0 items-center rounded-[3px] bg-editor-accent text-white font-semibold px-3.5 text-[11px] hover:bg-editor-accent/90 shadow-[0_1px_2px_rgba(0,0,0,0.2)] tracking-wide transition-colors"
      >
        APPLY
      </button>
    </>
  );
}
