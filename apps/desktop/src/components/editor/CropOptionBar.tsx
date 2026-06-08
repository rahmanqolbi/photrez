import { Show, For, createMemo, createSignal, createEffect, onMount, on, untrack } from "solid-js";
import { NumField, EditableNumField } from "./primitives";
import { useEditor } from "./EditorContext";
import { CROP_PRESETS } from "@/viewport/cropPresets";
import { toUnit, fromUnit } from "@/viewport/unitConversion";
import { fitCropRectToAspect } from "@/viewport/cropAutoFit";
import { getDefaultModernCropFrame, getModernCropApplyRotation, modernFrameToCropRect } from "@/viewport/modernCropGeometry";
import { ToggleBtn, Divider } from "./OptionBarShared";
import { Icon } from "./icons";
import { discardCropSession, resetCropPreviewToCanvas, applyCropPreview } from "./cropToolActions";

export function CropOptionBar() {
  const {
    workspace,
    renderer,
    setActiveTool,
    scheduler,
    syncViewport,
    cropRect, setCropRect,
    cropInteractionMode, setCropInteractionMode,
    cropMode, setCropMode,
    cropGuideMode, setCropGuideMode,
    cropDeletePixels, setCropDeletePixels,
    cropAspect, setCropAspect,
    cropSizeTarget, setCropSizeTarget,
    cropSizeUnit, setCropSizeUnit,
    cropRotation, setCropRotation,
    modernCropFrame, setModernCropFrame,
    modernCropImageTransform, setModernCropImageTransform,
    resetModernCrop,
    hiddenCropPreview, setHiddenCropPreview,
    docWidth, docHeight,
    viewportWidth, viewportHeight,
    zoom, pan,
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

  // Local display values for Size mode — preserve user-entered physical values
  // without round-trip through pixel conversion (avoids drift like 3 cm → 2.99 cm)
  const [sizeWVal, setSizeWVal] = createSignal(800);
  const [sizeHVal, setSizeHVal] = createSignal(600);

  // Initialize from pixel state on mount; re-sync only when unit changes
  onMount(() => {
    const t = cropSizeTarget();
    const unit = cropSizeUnit();
    setSizeWVal(toUnit(t?.w ?? 800, unit));
    setSizeHVal(toUnit(t?.h ?? 600, unit));
  });

  createEffect(on(
    () => cropSizeUnit(),
    (unit) => {
      const t = cropSizeTarget();
      setSizeWVal(toUnit(t?.w ?? 800, unit));
      setSizeHVal(toUnit(t?.h ?? 600, unit));
    },
  ));

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

  const displayedFrame = () => cropInteractionMode() === "modern"
    ? modernCropFrame()
    : cropRect();

  const maxModernFrame = () => ({
    w: Math.min(viewportWidth(), docWidth() * zoom()),
    h: Math.min(viewportHeight(), docHeight() * zoom()),
  });

  const fitFrameToMaxBounds = (w: number, h: number) => {
    const max = maxModernFrame();
    if (w <= max.w && h <= max.h) return { w, h };
    const scale = Math.min(max.w / w, max.h / h);
    return { w: w * scale, h: h * scale };
  };

  const setModernFrameToAspect = (aspect: { w: number; h: number }) => {
    const fitted = getDefaultModernCropFrame({
      viewportWidth: viewportWidth(),
      viewportHeight: viewportHeight(),
      docWidth: docWidth(),
      docHeight: docHeight(),
      zoom: zoom(),
      aspect,
    });
    setModernCropFrame(fitted);
  };

  const setCropFrameToAspect = (aspect: { w: number; h: number }) => {
    if (cropInteractionMode() === "modern") {
      setModernFrameToAspect(aspect);
    } else if (cropRect()) {
      setCropRect(fitCropRectToAspect(aspect, docWidth(), docHeight(), cropRotation()));
    }
  };

  const applyCurrentCrop = () => {
    const modernFrame = modernCropFrame();
    const modernTransform = modernCropImageTransform();
    applyCropPreview({
      workspace,
      renderer,
      cropRect: cropInteractionMode() === "modern" && modernFrame
        ? modernFrameToCropRect({
            frame: modernFrame,
            viewport: {
              width: viewportWidth(),
              height: viewportHeight(),
              panX: pan().x,
              panY: pan().y,
              zoom: zoom(),
            },
            transform: modernTransform,
          })
        : cropRect(),
      cropMode: cropMode(),
      cropSizeTarget: cropSizeTarget(),
      cropDeletePixels: cropDeletePixels(),
      cropRotation: cropInteractionMode() === "modern" ? getModernCropApplyRotation(modernTransform.rotation) : cropRotation(),
      scheduler,
      setCropRect,
      setCropRotation,
      setHiddenCropPreview,
      setActiveTool,
      recenterViewport: () => {
        const engine = workspace.getActiveEngine();
        if (!engine) return;
        engine.fitToScreen(viewportWidth(), viewportHeight());
        syncViewport();
      },
    });
    if (cropInteractionMode() === "modern") resetModernCrop();
  };

  const handlePresetChange = (value: string) => {
    setSelectedPreset(value);
    if (value === "custom") {
      setCropMode("ratio");
      const aspect = cropAspect() ?? { w: 16, h: 9 };
      setCropAspect(aspect);
      if (cropInteractionMode() === "modern" && modernCropFrame()) {
        setModernFrameToAspect(aspect);
      } else if (cropRect()) {
        setCropRect(fitCropRectToAspect(aspect, docWidth(), docHeight(), cropRotation()));
      }
      return;
    }
      const preset = CROP_PRESETS.find(p => p.value === value);
      if (preset) {
        setCropMode("ratio");
        setCropAspect({ w: preset.aspect.w, h: preset.aspect.h });
      setCropFrameToAspect(preset.aspect);
    }
  };

  return (
    <>
      {/* Interaction Mode Toggle */}
      <div class="flex h-[24px] shrink-0 items-center rounded-[3px] border border-editor-field-border bg-editor-field p-[1px] overflow-hidden">
        <button
          onClick={() => setCropInteractionMode("modern")}
          class={`flex h-full items-center rounded-[2px] px-2 text-[11px] font-medium transition-colors ${
            cropInteractionMode() === "modern"
              ? "bg-editor-accent text-white shadow-[0_1px_2px_rgba(0,0,0,0.2)]"
              : "text-editor-text-dim hover:text-editor-text"
          }`}
        >
          Modern
        </button>
        <button
          onClick={() => setCropInteractionMode("classic")}
          class={`flex h-full items-center rounded-[2px] px-2 text-[11px] font-medium transition-colors ${
            cropInteractionMode() === "classic"
              ? "bg-editor-accent text-white shadow-[0_1px_2px_rgba(0,0,0,0.2)]"
              : "text-editor-text-dim hover:text-editor-text"
          }`}
        >
          Classic
        </button>
      </div>

      <Divider />

      {/* Crop Mode Selector */}
      <div class="relative flex h-[24px] shrink-0 items-center rounded-[3px] border border-editor-field-border bg-editor-field px-2 hover:border-editor-field-border/80 transition-all cursor-pointer focus-ring-within">
        <span class="text-[11px] text-editor-text mr-4 select-none">
          {cropModeLabel()}
        </span>
        <div class="ml-auto pointer-events-none text-editor-text-dim">
          <Icon name="chevron-down" class="size-3" strokeWidth={1.5} />
        </div>
        <select
          value={cropMode()}
          onChange={(e) => {
            const mode = e.currentTarget.value as "free" | "ratio" | "size";
            setCropMode(mode);

            if (mode === "free") {
              setSelectedPreset("custom");
              if (cropInteractionMode() === "modern" && modernCropFrame()) {
                setModernCropFrame(fitFrameToMaxBounds(modernCropFrame()!.w, modernCropFrame()!.h));
              }
              return;
            }

            if (mode === "ratio") {
              const aspect = cropAspect() ?? { w: 16, h: 9 };
              setCropAspect(aspect);
              const match = CROP_PRESETS.find(p => p.aspect.w === aspect.w && p.aspect.h === aspect.h);
              setSelectedPreset(match ? match.value : "custom");

              if (cropInteractionMode() === "modern" && modernCropFrame()) {
                setModernFrameToAspect(aspect);
              } else if (cropRect()) {
                setCropRect(fitCropRectToAspect(aspect, docWidth(), docHeight(), cropRotation()));
              }
              return;
            }

            if (mode === "size") {
              const target = cropSizeTarget() ?? { w: 800, h: 600 };
              setCropSizeTarget(target);

              if (cropInteractionMode() === "modern") {
                setModernFrameToAspect({ w: target.w, h: target.h });
              } else if (cropRect()) {
                setCropRect(fitCropRectToAspect(target, docWidth(), docHeight(), cropRotation()));
              }
              return;
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
          <NumField label="W" value={`${Math.round(displayedFrame()?.w ?? 0)} px`} class="w-[82px]" />
          <NumField label="H" value={`${Math.round(displayedFrame()?.h ?? 0)} px`} class="w-[82px]" />
        </div>
      </Show>

      <Show when={cropMode() === "ratio"}>
        <div class="flex items-center gap-1.5">
          <div class="relative flex h-[24px] shrink-0 items-center rounded-[3px] border border-editor-field-border bg-editor-field px-2 hover:border-editor-field-border/80 transition-all cursor-pointer focus-ring-within">
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
                  setCropFrameToAspect(nextAspect);
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
                  setCropFrameToAspect(nextAspect);
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
            value={sizeWVal()}
            onSubmit={(v) => {
              setSizeWVal(v);
              const valPx = fromUnit(v, cropSizeUnit());
              const nextTarget = { w: valPx, h: cropSizeTarget()?.h ?? 600 };
              setCropSizeTarget(nextTarget);
              if (cropInteractionMode() === "modern") {
                setModernFrameToAspect({ w: nextTarget.w, h: nextTarget.h });
              } else if (cropRect()) {
                setCropRect(fitCropRectToAspect(nextTarget, docWidth(), docHeight(), cropRotation()));
              }
            }}
            class="w-[68px]"
          />
          <EditableNumField
            label="H"
            value={sizeHVal()}
            onSubmit={(v) => {
              setSizeHVal(v);
              const valPx = fromUnit(v, cropSizeUnit());
              const nextTarget = { w: cropSizeTarget()?.w ?? 800, h: valPx };
              setCropSizeTarget(nextTarget);
              if (cropInteractionMode() === "modern") {
                setModernFrameToAspect({ w: nextTarget.w, h: nextTarget.h });
              } else if (cropRect()) {
                setCropRect(fitCropRectToAspect(nextTarget, docWidth(), docHeight(), cropRotation()));
              }
            }}
            class="w-[68px]"
          />
          
          {/* Unit Selector */}
          <div class="relative flex h-[24px] shrink-0 items-center rounded-[3px] border border-editor-field-border bg-editor-field px-2 hover:border-editor-field-border/80 transition-all cursor-pointer focus-ring-within">
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
        value={cropInteractionMode() === "modern" ? modernCropImageTransform().rotation : cropRotation()}
        suffix="°"
        onSubmit={(v) => {
          if (cropInteractionMode() === "modern") {
            setModernCropImageTransform((prev) => ({ ...prev, rotation: v }));
          } else {
            const r = cropRect();
            if (r) commitCropState(r, cropRotation());
            setCropRotation(v);
          }
        }}
        class="w-[64px]"
      />

      {/* Rotation & Swap Buttons */}
      <div class="flex items-center gap-1">
        <button
          onClick={() => {
            if (cropInteractionMode() === "modern") {
              setModernCropImageTransform((prev) => ({ ...prev, rotation: prev.rotation - 90 }));
            } else {
              const rect = cropRect();
              if (rect) {
              commitCropState(rect, cropRotation());
              const cx = rect.x + rect.w / 2;
              const cy = rect.y + rect.h / 2;
              setCropRect({ x: cx - rect.h / 2, y: cy - rect.w / 2, w: rect.h, h: rect.w });
            }
            setCropRotation(cropRotation() - 90);
            }
          }}
          class="flex size-[24px] shrink-0 items-center justify-center rounded-[3px] border border-transparent text-editor-icon hover:border-editor-field-border hover:text-editor-text transition-colors"
          aria-label="Rotate 90 degrees counter-clockwise"
          title="Rotate 90° CCW"
        >
          <Icon name="rotate-ccw" class="size-4" strokeWidth={1.5} />
        </button>
        <button
          onClick={() => {
            if (cropInteractionMode() === "modern") {
              setModernCropImageTransform((prev) => ({ ...prev, rotation: prev.rotation + 90 }));
            } else {
              const rect = cropRect();
              if (rect) {
              commitCropState(rect, cropRotation());
              const cx = rect.x + rect.w / 2;
              const cy = rect.y + rect.h / 2;
              setCropRect({ x: cx - rect.h / 2, y: cy - rect.w / 2, w: rect.h, h: rect.w });
            }
            setCropRotation(cropRotation() + 90);
            }
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
              setCropFrameToAspect(nextAspect);
            } else if (cropMode() === "size" && cropSizeTarget()) {
              const nextTarget = { w: cropSizeTarget()!.h, h: cropSizeTarget()!.w };
              setCropSizeTarget(nextTarget);
              const sw = sizeWVal(), sh = sizeHVal();
              setSizeWVal(sh);
              setSizeHVal(sw);
              if (cropInteractionMode() === "modern") {
                setModernFrameToAspect({ w: nextTarget.w, h: nextTarget.h });
              } else if (cropRect()) {
                setCropRect(fitCropRectToAspect(nextTarget, docWidth(), docHeight(), cropRotation()));
              }
            } else {
              if (cropInteractionMode() === "modern" && modernCropFrame()) {
                const fitted = fitFrameToMaxBounds(modernCropFrame()!.h, modernCropFrame()!.w);
                setModernCropFrame(fitted);
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
      <div class="relative flex h-[24px] shrink-0 items-center rounded-[3px] border border-editor-field-border bg-editor-field px-2 hover:border-editor-field-border/80 transition-all cursor-pointer focus-ring-within">
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
          if (cropInteractionMode() === "modern") {
            resetModernCrop();
            setModernCropFrame(getDefaultModernCropFrame({
              viewportWidth: viewportWidth(),
              viewportHeight: viewportHeight(),
              docWidth: docWidth(),
              docHeight: docHeight(),
              zoom: zoom(),
              aspect: cropMode() === "ratio" ? cropAspect() : null,
            }));
          } else {
            resetCropPreviewToCanvas({
              engine: workspace.getActiveEngine(),
              setCropRect,
              setCropRotation,
              setHiddenCropPreview,
            });
          }
        }}
        class="flex h-[24px] shrink-0 items-center rounded-[3px] border border-transparent px-2 text-[11px] text-editor-text-dim hover:border-editor-field-border hover:text-editor-text transition-colors"
      >
        Reset
      </button>

      <button
        onClick={() => {
          if (cropInteractionMode() === "modern") resetModernCrop();
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
          applyCurrentCrop();
        }}
        class="flex h-[24px] shrink-0 items-center rounded-[3px] bg-editor-accent text-white font-semibold px-3.5 text-[11px] hover:bg-editor-accent/90 shadow-[0_1px_2px_rgba(0,0,0,0.2)] tracking-wide transition-colors"
      >
        APPLY
      </button>
    </>
  );
}
