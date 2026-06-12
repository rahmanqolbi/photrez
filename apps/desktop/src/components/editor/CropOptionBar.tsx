import { Show, For, createMemo, createSignal, createEffect, onMount, on, untrack } from "solid-js";
import { NumField, EditableNumField } from "./primitives";
import { useEditor } from "./EditorContext";
import { CROP_PRESETS, PILL_PRESETS } from "@/viewport/cropPresets";
import { toUnit, fromUnit } from "@/viewport/unitConversion";
import { fitCropRectToAspect } from "@/viewport/cropAutoFit";
import { getDefaultModernCropFrame, getModernCropApplyRotation, modernFrameToCropRect } from "@/viewport/modernCropGeometry";
import { ToggleBtn, Divider, ToolPill, MoreDropdown } from "./OptionBarShared";
import { Icon } from "./icons";
import { discardCropSession, resetCropPreviewToCanvas, applyCropPreview } from "./cropToolActions";

export function CropOptionBar() {
  const {
    workspace,
    renderer,
    setActiveTool,
    scheduler,
    syncViewport,
    bgColor,
    cropRect, setCropRect,
    cropInteractionMode, setCropInteractionMode,
    cropMode, setCropMode,
    cropGuideMode, setCropGuideMode,
    cropDeletePixels, setCropDeletePixels,
    cropFillEnabled, setCropFillEnabled,
    cropFillSource, setCropFillSource,
    cropFillCustomColor, setCropFillCustomColor,
    cropAspect, setCropAspect,
    cropSizeTarget, setCropSizeTarget,
    cropSizeUnit, setCropSizeUnit,
    cropRotation, setCropRotation,
    modernCropFrame, setModernCropFrame,
    modernCropImageTransform, setModernCropImageTransform,
    resetModernCrop,
    hiddenCropPreview, setHiddenCropPreview,
    setSelectedLayerId,
    docWidth, docHeight,
    viewportWidth, viewportHeight,
    zoom, pan,
    activeDocumentId,
    commitCropState,
  } = useEditor();

  const [showCustomRatio, setShowCustomRatio] = createSignal(false);

  const [customWVal, setCustomWVal] = createSignal(16);
  const [customHVal, setCustomHVal] = createSignal(9);

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

  const isActivePill = (preset: { w: number; h: number }) => {
    if (cropMode() !== "ratio") return false;
    const a = cropAspect();
    return a?.w === preset.w && a?.h === preset.h;
  };

  const isCustomActive = () => cropMode() === "ratio" && showCustomRatio();

  const handlePillClick = (preset: { w: number; h: number }) => {
    setShowCustomRatio(false);
    setCropMode("ratio");
    setCropAspect({ w: preset.w, h: preset.h });
    setCropFrameToAspect(preset);
  };

  const handleFreeClick = () => {
    setShowCustomRatio(false);
    setCropMode("free");
    if (cropInteractionMode() === "modern" && modernCropFrame()) {
      setModernCropFrame(fitFrameToMaxBounds(modernCropFrame()!.w, modernCropFrame()!.h));
    }
  };

  const handleSizeModeClick = () => {
    setShowCustomRatio(false);
    setCropMode("size");
    const target = cropSizeTarget() ?? { w: 800, h: 600 };
    setCropSizeTarget(target);
    if (cropInteractionMode() === "modern") {
      setModernFrameToAspect({ w: target.w, h: target.h });
    } else if (cropRect()) {
      setCropRect(fitCropRectToAspect(target, docWidth(), docHeight(), cropRotation()));
    }
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

  const resolvedCropFillColor = () => cropFillSource() === "background"
    ? (typeof bgColor === "function" ? bgColor() : "#ffffff")
    : cropFillCustomColor();

  const maxModernFrame = () => ({
    w: Math.min(viewportWidth(), docWidth() * zoom()),
    h: Math.min(viewportHeight(), docHeight() * zoom()),
  });

  const fitFrameToMaxBounds = (w: number, h: number) => {
    const max = maxModernFrame();
    if (w <= max.w && h <= max.h) return { x: 0, y: 0, w, h };
    const scale = Math.min(max.w / w, max.h / h);
    return { x: 0, y: 0, w: w * scale, h: h * scale };
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
      cropFillColor: cropFillEnabled() ? resolvedCropFillColor() : null,
      cropRotation: cropInteractionMode() === "modern" ? getModernCropApplyRotation(modernTransform.rotation) : cropRotation(),
      scheduler,
      setCropRect,
      setCropRotation,
      setHiddenCropPreview,
      setActiveTool,
      setSelectedLayerId,
      recenterViewport: () => {
        const engine = workspace.getActiveEngine();
        if (!engine) return;
        engine.fitToScreen(viewportWidth(), viewportHeight());
        syncViewport();
      },
    });
    if (cropInteractionMode() === "modern") resetModernCrop();
  };

  return (
    <>
      <ToolPill icon="crop" label="Crop" />

      <Divider />

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

      {/* Mode Toggle (always visible) */}
      <div class="flex shrink-0 items-center gap-0.5 overflow-x-auto">
        <button
          onClick={handleFreeClick}
          class={`flex h-[24px] shrink-0 items-center rounded-[3px] border px-2 text-[11px] transition-colors ${
            cropMode() === "free"
              ? "bg-editor-accent text-white border-editor-accent shadow-[0_1px_2px_rgba(0,0,0,0.2)]"
              : "border-dashed border-editor-field-border bg-editor-field text-editor-text-dim hover:text-editor-text hover:border-editor-field-border/80"
          }`}
        >
          Free
        </button>
        {/* Ratio pills — hidden in Size mode */}
        <Show when={cropMode() !== "size"}>
          <For each={PILL_PRESETS}>
            {(preset) => (
              <button
                onClick={() => handlePillClick(preset.aspect)}
                class={`flex h-[24px] shrink-0 items-center rounded-[3px] border px-2 text-[11px] transition-colors ${
                  isActivePill(preset.aspect)
                    ? "bg-editor-accent text-white border-editor-accent shadow-[0_1px_2px_rgba(0,0,0,0.2)]"
                    : "border-editor-field-border bg-editor-field text-editor-text-dim hover:text-editor-text hover:border-editor-field-border/80"
                }`}
              >
                {preset.label}
              </button>
            )}
          </For>
          <button
            onClick={() => {
              if (!showCustomRatio()) {
                const cur = cropAspect();
                setCustomWVal(cur?.w ?? 16);
                setCustomHVal(cur?.h ?? 9);
              }
              setShowCustomRatio(!showCustomRatio());
            }}
            class={`flex h-[24px] shrink-0 items-center rounded-[3px] border px-2 text-[11px] transition-colors ${
              showCustomRatio()
                ? "bg-editor-accent text-white border-editor-accent shadow-[0_1px_2px_rgba(0,0,0,0.2)]"
                : "border-editor-field-border bg-editor-field text-editor-text-dim hover:text-editor-text hover:border-editor-field-border/80"
            }`}
          >
            +
          </button>
        </Show>
        <button
          onClick={handleSizeModeClick}
          class={`flex h-[24px] shrink-0 items-center rounded-[3px] border px-2 text-[11px] transition-colors ${
            cropMode() === "size"
              ? "bg-editor-accent text-white border-editor-accent shadow-[0_1px_2px_rgba(0,0,0,0.2)]"
              : "border-editor-field-border bg-editor-field text-editor-text-dim hover:text-editor-text hover:border-editor-field-border/80"
          }`}
        >
          Size
        </button>
      </div>

      {/* Secondary Options on Main Bar (hidden under 650px, labels hidden under 900px) */}
      <div class="hidden @min-[650px]:flex items-center gap-1.5 shrink-0">
        {/* Custom W:H fields — visible when "+" is expanded */}
        <Show when={showCustomRatio()}>
          <div class="flex shrink-0 items-center gap-1">
            <EditableNumField
              label="W"
              value={customWVal()}
              onSubmit={(v) => {
                setCustomWVal(v);
                const aspect = { w: v, h: customHVal() };
                setCropAspect(aspect);
                setShowCustomRatio(false);
                setCropMode("ratio");
                setCropFrameToAspect(aspect);
              }}
              class="w-[62px]"
            />
            <span class="text-[11px] text-editor-text-dim font-bold">:</span>
            <EditableNumField
              label="H"
              value={customHVal()}
              onSubmit={(v) => {
                setCustomHVal(v);
                const aspect = { w: customWVal(), h: v };
                setCropAspect(aspect);
                setShowCustomRatio(false);
                setCropMode("ratio");
                setCropFrameToAspect(aspect);
              }}
              class="w-[62px]"
            />
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

        <Divider />

        {/* Angle Field */}
        <EditableNumField
          label="Angle"
          labelClass="@max-[900px]:hidden"
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
          label="Delete"
          labelClass="@max-[900px]:hidden"
          title={cropDeletePixels() ? "Delete Cropped Pixels (Destructive)" : "Keep Cropped Pixels (Non-Destructive)"}
        />

        <Divider />

        <ToggleBtn
          active={cropFillEnabled()}
          onChange={setCropFillEnabled}
          icon="paint-bucket"
          label="Fill BG"
          labelClass="@max-[900px]:hidden"
          title={cropFillEnabled() ? "Fill empty crop areas" : "Leave empty crop areas transparent"}
        />

        <Show when={cropFillEnabled()}>
          <div
            class="flex h-[24px] shrink-0 items-center gap-1 rounded-[3px] border border-editor-field-border bg-editor-field px-1"
            data-crop-fill-source={cropFillSource()}
          >
            <input
              data-crop-fill-color
              type="color"
              value={resolvedCropFillColor()}
              onInput={(e) => {
                setCropFillSource("custom");
                setCropFillCustomColor(e.currentTarget.value);
              }}
              class="h-[18px] w-[22px] cursor-pointer rounded-[2px] border border-editor-field-border bg-transparent p-0"
              title="Crop fill color"
            />
            <button
              data-crop-fill-use-bg
              type="button"
              onClick={() => setCropFillSource("background")}
              class="h-[18px] rounded-[2px] px-1.5 text-[10px] text-editor-text-dim hover:bg-editor-hover hover:text-editor-text"
              title="Use Background Color"
            >
              Use BG
            </button>
          </div>
        </Show>
      </div>

      <MoreDropdown>
        {/* Angle Field */}
        <div class="flex flex-col gap-1.5">
          <span class="text-[10px] font-bold text-editor-text-dim uppercase tracking-wider">Angle</span>
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
            class="w-full"
          />
        </div>

        {/* Rotation & Swap Buttons */}
        <div class="flex flex-col gap-1.5 mt-1.5">
          <span class="text-[10px] font-bold text-editor-text-dim uppercase tracking-wider">Rotate & Swap</span>
          <div class="flex items-center gap-1 bg-editor-field/30 p-1.5 rounded-[4px] border border-editor-field-border">
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
              class="flex flex-1 size-[24px] items-center justify-center rounded-[3px] hover:bg-editor-field/50 text-editor-icon hover:text-editor-text transition-colors"
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
              class="flex flex-1 size-[24px] items-center justify-center rounded-[3px] hover:bg-editor-field/50 text-editor-icon hover:text-editor-text transition-colors"
              title="Rotate 90° CW"
            >
              <Icon name="rotate-cw" class="size-4" strokeWidth={1.5} />
            </button>
            <button
              onClick={() => {
                if (cropMode() === "ratio" && cropAspect()) {
                  const nextAspect = { w: cropAspect()!.h, h: cropAspect()!.w };
                  setCropAspect(nextAspect);
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
              class="flex flex-1 size-[24px] items-center justify-center rounded-[3px] hover:bg-editor-field/50 text-editor-icon hover:text-editor-text transition-colors"
              title="Swap Width/Height"
            >
              <Icon name="swap" class="size-4" strokeWidth={1.5} />
            </button>
          </div>
        </div>

        {/* Composition Guide Mode */}
        <div class="flex flex-col gap-1.5 mt-1.5">
          <span class="text-[10px] font-bold text-editor-text-dim uppercase tracking-wider">Guide</span>
          <div class="relative flex h-[24px] w-full items-center rounded-[3px] border border-editor-field-border bg-editor-field px-2 hover:border-editor-field-border/80 transition-all cursor-pointer focus-ring-within">
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
        </div>

        <div class="h-px bg-editor-divider my-1.5" />

        {/* Delete pixels toggle */}
        <ToggleBtn
          active={cropDeletePixels()}
          onChange={setCropDeletePixels}
          icon="trash"
          label="Delete"
          labelClass="flex"
          class="w-full justify-center"
          title={cropDeletePixels() ? "Delete Cropped Pixels (Destructive)" : "Keep Cropped Pixels (Non-Destructive)"}
        />

        {/* Fill BG toggle */}
        <ToggleBtn
          active={cropFillEnabled()}
          onChange={setCropFillEnabled}
          icon="paint-bucket"
          label="Fill BG"
          labelClass="flex"
          class="w-full justify-center"
          title={cropFillEnabled() ? "Fill empty crop areas" : "Leave empty crop areas transparent"}
        />

        <Show when={cropFillEnabled()}>
          <div
            class="flex h-[24px] w-full items-center gap-1.5 rounded-[3px] border border-editor-field-border bg-editor-field px-1.5"
          >
            <input
              type="color"
              value={resolvedCropFillColor()}
              onInput={(e) => {
                setCropFillSource("custom");
                setCropFillCustomColor(e.currentTarget.value);
              }}
              class="h-[18px] w-[22px] cursor-pointer rounded-[2px] border border-editor-field-border bg-transparent p-0"
              title="Crop fill color"
            />
            <button
              type="button"
              onClick={() => setCropFillSource("background")}
              class="h-[18px] flex-1 rounded-[2px] px-1.5 text-[10px] text-editor-text-dim hover:bg-editor-hover hover:text-editor-text border border-editor-field-border bg-editor-field/50"
              title="Use Background Color"
            >
              Use BG
            </button>
          </div>
        </Show>
      </MoreDropdown>

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
