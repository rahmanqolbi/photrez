import { Show, For, createMemo } from "solid-js";
import { NumField, EditableNumField } from "./primitives";
import { useEditor } from "./EditorContext";
import { CROP_PRESETS } from "@/viewport/cropPresets";
import { toUnit, fromUnit } from "@/viewport/unitConversion";
import { fitCropRectToAspect } from "@/viewport/cropAutoFit";
import { ToggleBtn, Divider } from "./OptionBarShared";

export function CropOptionBar() {
  const {
    workspace,
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
  } = useEditor();

  const activePreset = createMemo(() => {
    if (cropMode() !== "ratio") return undefined;
    const a = cropAspect();
    if (!a) return undefined;
    for (const p of CROP_PRESETS) {
      if (p.aspect.w === a.w && p.aspect.h === a.h) return p.value;
    }
    return "custom";
  });

  const handlePresetChange = (value: string) => {
    if (value === "custom") {
      setCropMode("ratio");
      if (!cropAspect()) setCropAspect({ w: 16, h: 9 });
      return;
    }
    const preset = CROP_PRESETS.find(p => p.value === value);
    if (preset) {
      setCropMode("ratio");
      setCropAspect({ w: preset.aspect.w, h: preset.aspect.h });
      const rect = cropRect();
      if (rect) {
        setCropRect(fitCropRectToAspect(rect, preset.aspect));
      }
    }
  };

  return (
    <>
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

      <Show when={cropMode() === "free"}>
        <div class="flex shrink-0 items-center gap-1">
          <NumField label="W" value={`${Math.round(cropRect()?.w ?? 0)} px`} class="w-[78px]" />
          <NumField label="H" value={`${Math.round(cropRect()?.h ?? 0)} px`} class="w-[78px]" />
        </div>
      </Show>

      <Show when={cropMode() === "ratio"}>
        <div class="flex h-[24px] shrink-0 items-center gap-1 rounded-[3px] border border-editor-field-border bg-editor-field px-1.5">
          <select
            value={activePreset()}
            onChange={(e) => handlePresetChange(e.currentTarget.value)}
            class="bg-transparent text-[11px] text-editor-text outline-none"
          >
            <For each={CROP_PRESETS}>
              {(p) => <option value={p.value}>{p.label}</option>}
            </For>
            <option value="custom">Custom</option>
          </select>
        </div>
        <Show when={activePreset() === "custom"}>
          <div class="flex shrink-0 items-center gap-1">
            <EditableNumField label="W" value={cropAspect()?.w ?? 1} onSubmit={(v) => setCropAspect({ w: v, h: cropAspect()?.h ?? 1 })} class="w-[62px]" />
            <span class="text-[11px] text-editor-text-dim">:</span>
            <EditableNumField label="H" value={cropAspect()?.h ?? 1} onSubmit={(v) => setCropAspect({ w: cropAspect()?.w ?? 1, h: v })} class="w-[62px]" />
          </div>
        </Show>
      </Show>

      <Show when={cropMode() === "size"}>
        <div class="flex shrink-0 items-center gap-1">
          <EditableNumField label="W" value={toUnit(cropSizeTarget()?.w ?? 800, cropSizeUnit())} onSubmit={(v) => setCropSizeTarget({ w: fromUnit(v, cropSizeUnit()), h: cropSizeTarget()?.h ?? 600 })} class="w-[60px]" />
          <EditableNumField label="H" value={toUnit(cropSizeTarget()?.h ?? 600, cropSizeUnit())} onSubmit={(v) => setCropSizeTarget({ w: cropSizeTarget()?.w ?? 800, h: fromUnit(v, cropSizeUnit()) })} class="w-[60px]" />
          <div class="flex h-[24px] shrink-0 items-center gap-1 rounded-[3px] border border-editor-field-border bg-editor-field px-1.5">
            <select
              value={cropSizeUnit()}
              onChange={(e) => setCropSizeUnit(e.currentTarget.value as any)}
              class="bg-transparent text-[11px] text-editor-text outline-none"
            >
              <option value="px">px</option>
              <option value="cm">cm</option>
              <option value="mm">mm</option>
              <option value="in">in</option>
            </select>
          </div>
        </div>
      </Show>

      <EditableNumField
        label="Angle"
        value={cropRotation()}
        suffix="°"
        onSubmit={setCropRotation}
        class="w-[58px]"
      />

      <button
        onClick={() => setCropRotation(cropRotation() - 90)}
        class="flex h-[24px] shrink-0 items-center rounded-[3px] border border-transparent px-1 text-[11px] text-editor-text-dim hover:border-editor-field-border hover:text-editor-text"
        aria-label="Rotate 90 degrees counter-clockwise"
      >
        ↺
      </button>
      <button
        onClick={() => setCropRotation(cropRotation() + 90)}
        class="flex h-[24px] shrink-0 items-center rounded-[3px] border border-transparent px-1 text-[11px] text-editor-text-dim hover:border-editor-field-border hover:text-editor-text"
        aria-label="Rotate 90 degrees clockwise"
      >
        ↻
      </button>

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

      <ToggleBtn
        active={cropDeletePixels()}
        onChange={setCropDeletePixels}
        icon="trash"
        label="Delete"
      />

      <Divider />

      <button
        onClick={() => {
          const engine = workspace.getActiveEngine();
          if (engine) {
            setCropRect({ x: 0, y: 0, w: engine.getWidth(), h: engine.getHeight() });
            setCropRotation(0);
          }
        }}
        class="flex h-[24px] shrink-0 items-center rounded-[3px] border border-transparent px-2 text-[11px] text-editor-text-dim hover:border-editor-field-border hover:text-editor-text"
      >
        Reset
      </button>

      <button
        onClick={() => {
          setCropRect(null);
          setActiveTool("move");
        }}
        class="flex h-[24px] shrink-0 items-center rounded-[3px] border border-editor-field-border bg-editor-field px-2 text-[11px] text-editor-text hover:bg-white/5"
      >
        Cancel
      </button>

      <button
        onClick={() => {
          const engine = workspace.getActiveEngine();
          const rect = cropRect();
          if (engine && rect) {
            const history = workspace.getActiveHistory();
            history?.commit(engine.snapshot());
            engine.applyCrop(rect.x, rect.y, rect.w, rect.h, {
              deleteCroppedPixels: cropDeletePixels(),
              targetSize: cropMode() === "size" ? cropSizeTarget() : null,
              rotation: cropRotation(),
            });
            scheduler.requestRender();
            setCropRect(null);
            setActiveTool("move");
          }
        }}
        class="flex h-[26px] shrink-0 items-center rounded-[4px] bg-editor-accent text-white font-medium px-4 text-[12px] hover:bg-editor-accent/90"
      >
        APPLY
      </button>
    </>
  );
}
