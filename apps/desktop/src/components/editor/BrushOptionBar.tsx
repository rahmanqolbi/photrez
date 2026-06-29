import { Show, createSignal, For } from "solid-js";
import { useEditor } from "./shell/EditorContext";
import { clampPaintPercent, clampPaintSize, clampPaintSmoothing, BRUSH_PRESETS, applyPaintPreset, sizeSliderToPaintSize, paintSizeToSizeSlider } from "./brushToolState";
import { ToolPill, MoreDropdown, Divider } from "./shell/OptionBarShared";
import { Icon } from "./icons";
import { Slider } from "./primitives";

function formatPercent(value: number): number {
  return Math.round(value * 100);
}

export function BrushOptionBar() {
  const {
    activeTool,
    brushSize, setBrushSize,
    brushHardness, setBrushHardness,
    brushOpacity, setBrushOpacity,
    brushFlow, setBrushFlow,
    brushSmoothing, setBrushSmoothing,
    eraserSize, setEraserSize,
    eraserHardness, setEraserHardness,
    eraserOpacity, setEraserOpacity,
    eraserFlow, setEraserFlow,
    eraserSmoothing, setEraserSmoothing,
    brushPresetId, setBrushPresetId,
    eraserPresetId, setEraserPresetId,
  } = useEditor();

  const isEraser = () => activeTool() === "eraser";
  const label = () => (isEraser() ? "Eraser Options" : "Brush Options");
  const size = () => (isEraser() ? eraserSize() : brushSize());
  const hardness = () => (isEraser() ? eraserHardness() : brushHardness());
  const opacity = () => (isEraser() ? eraserOpacity() : brushOpacity());
  const flow = () => (isEraser() ? eraserFlow() : brushFlow());
  const smoothing = () => (isEraser() ? eraserSmoothing() : brushSmoothing());
  const presetId = () => (isEraser() ? eraserPresetId() : brushPresetId());
  const setPresetId = isEraser() ? setEraserPresetId : setBrushPresetId;

  const clearPresetId = () => setPresetId(null);

  const setSize = (value: number) => {
    const next = clampPaintSize(value);
    clearPresetId();
    if (isEraser()) setEraserSize(next);
    else setBrushSize(next);
  };

  const setHardness = (value: number) => {
    const next = clampPaintPercent(value / 100);
    clearPresetId();
    if (isEraser()) setEraserHardness(next);
    else setBrushHardness(next);
  };

  const setOpacity = (value: number) => {
    const next = clampPaintPercent(value / 100);
    clearPresetId();
    if (isEraser()) setEraserOpacity(next);
    else setBrushOpacity(next);
  };

  const setFlowValue = (value: number) => {
    const next = clampPaintPercent(value / 100);
    clearPresetId();
    if (isEraser()) setEraserFlow(next);
    else setBrushFlow(next);
  };

  const setSmoothingValue = (value: number) => {
    const next = clampPaintSmoothing(value);
    clearPresetId();
    if (isEraser()) setEraserSmoothing(next);
    else setBrushSmoothing(next);
  };

  const applyPreset = (preset: typeof BRUSH_PRESETS[number]) => {
    const tool = isEraser() ? "eraser" : "brush";
    const changes = applyPaintPreset(preset, tool, {
      brushSize: brushSize(),
      brushHardness: brushHardness(),
      brushOpacity: brushOpacity(),
      brushFlow: brushFlow(),
      brushSmoothing: brushSmoothing(),
      eraserSize: eraserSize(),
      eraserHardness: eraserHardness(),
      eraserOpacity: eraserOpacity(),
      eraserFlow: eraserFlow(),
      eraserSmoothing: eraserSmoothing(),
    });
    if (isEraser()) {
      if (changes.eraserSize !== undefined) setEraserSize(changes.eraserSize);
      if (changes.eraserHardness !== undefined) setEraserHardness(changes.eraserHardness);
      if (changes.eraserOpacity !== undefined) setEraserOpacity(changes.eraserOpacity);
      if (changes.eraserFlow !== undefined) setEraserFlow(changes.eraserFlow);
      if (changes.eraserSmoothing !== undefined) setEraserSmoothing(changes.eraserSmoothing);
    } else {
      if (changes.brushSize !== undefined) setBrushSize(changes.brushSize);
      if (changes.brushHardness !== undefined) setBrushHardness(changes.brushHardness);
      if (changes.brushOpacity !== undefined) setBrushOpacity(changes.brushOpacity);
      if (changes.brushFlow !== undefined) setBrushFlow(changes.brushFlow);
      if (changes.brushSmoothing !== undefined) setBrushSmoothing(changes.brushSmoothing);
    }
    setPresetId(preset.id);
  };

  const [showPresets, setShowPresets] = createSignal(false);

  const currentPresetName = () => {
    const id = presetId();
    if (!id) return "Custom";
    const found = BRUSH_PRESETS.find(p => p.id === id);
    return found ? found.name : "Custom";
  };

  return (
    <>
      <ToolPill icon={isEraser() ? "eraser" : "brush"} label={label()} />

      <Divider />

      <div class="flex items-center gap-1.5 shrink-0">
        <label class="flex h-[24px] items-center gap-1 rounded-[3px] border border-editor-field-border bg-editor-field px-1.5">
          <span class="text-[10px] font-medium text-editor-text-dim">Size</span>
          <input
            data-paint-size
            type="number"
            min="1"
            max="2000"
            value={size()}
            onInput={(event) => setSize(Number(event.currentTarget.value))}
            class="w-12 bg-transparent text-[11px] text-editor-text outline-none"
          />
          <span class="text-[10px] text-editor-text-dim">px</span>
        </label>

        <div class="relative w-[72px] flex items-center h-[14px] @max-[900px]:hidden">
          <Slider
            percent={paintSizeToSizeSlider(size())}
            type="brush-size"
          />
          <input
            data-paint-size-slider
            type="range"
            min="0"
            max="100"
            value={paintSizeToSizeSlider(size())}
            onInput={(event) => setSize(sizeSliderToPaintSize(Number(event.currentTarget.value)))}
            class="absolute inset-0 w-full h-[14px] opacity-0 cursor-pointer"
          />
        </div>
      </div>

      {/* Secondary Options on Main Bar (always visible) */}
      <div class="flex items-center gap-1.5 shrink-0">
        <Divider />

        <label class="flex h-[24px] items-center gap-1 rounded-[3px] border border-editor-field-border bg-editor-field px-1.5">
          <span class="text-[10px] font-medium text-editor-text-dim">Hard</span>
          <input
            data-paint-hardness
            type="number"
            min="0"
            max="100"
            value={formatPercent(hardness())}
            onInput={(event) => setHardness(Number(event.currentTarget.value))}
            class="w-11 bg-transparent text-[11px] text-editor-text outline-none"
          />
          <span class="text-[10px] text-editor-text-dim">%</span>
        </label>

        <label class="flex h-[24px] items-center gap-1 rounded-[3px] border border-editor-field-border bg-editor-field px-1.5">
          <span class="text-[10px] font-medium text-editor-text-dim">Strength</span>
          <input
            data-paint-opacity
            type="number"
            min="0"
            max="100"
            value={formatPercent(opacity())}
            onInput={(event) => setOpacity(Number(event.currentTarget.value))}
            class="w-11 bg-transparent text-[11px] text-editor-text outline-none"
          />
          <span class="text-[10px] text-editor-text-dim">%</span>
        </label>

        <label class="flex h-[24px] items-center gap-1 rounded-[3px] border border-editor-field-border bg-editor-field px-1.5">
          <span class="text-[10px] font-medium text-editor-text-dim">Flow</span>
          <input
            data-paint-flow
            type="number"
            min="0"
            max="100"
            value={formatPercent(flow())}
            onInput={(event) => setFlowValue(Number(event.currentTarget.value))}
            class="w-11 bg-transparent text-[11px] text-editor-text outline-none"
          />
          <span class="text-[10px] text-editor-text-dim">%</span>
        </label>

        <label class="flex h-[24px] items-center gap-1 rounded-[3px] border border-editor-field-border bg-editor-field px-1.5">
          <span class="text-[10px] font-medium text-editor-text-dim">Smooth</span>
          <input
            data-paint-smoothing
            type="number"
            min="0"
            max="100"
            value={smoothing()}
            onInput={(event) => setSmoothingValue(Number(event.currentTarget.value))}
            class="w-11 bg-transparent text-[11px] text-editor-text outline-none"
          />
        </label>

        <div class="relative">
          <button
            type="button"
            data-paint-preset
            onClick={() => setShowPresets(!showPresets())}
            class="flex h-[24px] items-center gap-1 rounded-[3px] border border-editor-field-border bg-editor-field px-2 text-[11px] text-editor-text hover:border-editor-accent"
            title="Brush presets"
          >
            {currentPresetName()}
          </button>
          <Show when={showPresets()}>
            <div class="absolute top-full left-0 z-50 mt-1 flex flex-col rounded-[4px] border border-editor-field-border bg-editor-panel py-1 shadow-lg">
              <div class="fixed inset-0 z-[-1]" onClick={() => setShowPresets(false)} />
              <For each={BRUSH_PRESETS.filter(p => p.tool === "both" || p.tool === (isEraser() ? "eraser" : "brush"))}>
                {(preset) => (
                  <button
                    type="button"
                    class={`flex items-center gap-2 px-3 py-1.5 text-[11px] whitespace-nowrap hover:bg-editor-field/60 ${preset.id === presetId() ? "text-editor-accent font-medium" : "text-editor-text"}`}
                    onClick={() => { applyPreset(preset); setShowPresets(false); }}
                  >
                    {preset.name}
                  </button>
                )}
              </For>
            </div>
          </Show>
        </div>

        <Show when={isEraser()}>
          <button
            type="button"
            class="h-[24px] rounded-[3px] border border-editor-field-border bg-editor-field px-2 text-[11px] text-editor-text hover:border-editor-accent"
            aria-label="Set eraser to full hard strength"
            title="Set eraser to full hard strength"
            onClick={() => {
              setEraserHardness(1);
              setEraserOpacity(1);
              setEraserFlow(1);
              clearPresetId();
            }}
          >
            Hard 100
          </button>
        </Show>
      </div>

      {/* Overflow dropdown for narrow container */}
      <MoreDropdown>
        {/* Hardness */}
        <div class="flex flex-col gap-1">
          <span class="text-[10px] font-bold text-editor-text-dim uppercase tracking-wider">Hardness</span>
          <label class="flex h-[24px] items-center gap-1 rounded-[3px] border border-editor-field-border bg-editor-field px-1.5">
            <input
              type="number"
              min="0"
              max="100"
              value={formatPercent(hardness())}
              onInput={(event) => setHardness(Number(event.currentTarget.value))}
              class="w-full bg-transparent text-[11px] text-editor-text outline-none"
            />
            <span class="text-[10px] text-editor-text-dim">%</span>
          </label>
        </div>

        {/* Opacity */}
        <div class="flex flex-col gap-1">
          <span class="text-[10px] font-bold text-editor-text-dim uppercase tracking-wider">Strength</span>
          <label class="flex h-[24px] items-center gap-1 rounded-[3px] border border-editor-field-border bg-editor-field px-1.5">
            <input
              type="number"
              min="0"
              max="100"
              value={formatPercent(opacity())}
              onInput={(event) => setOpacity(Number(event.currentTarget.value))}
              class="w-full bg-transparent text-[11px] text-editor-text outline-none"
            />
            <span class="text-[10px] text-editor-text-dim">%</span>
          </label>
        </div>

        {/* Flow */}
        <div class="flex flex-col gap-1">
          <span class="text-[10px] font-bold text-editor-text-dim uppercase tracking-wider">Flow</span>
          <label class="flex h-[24px] items-center gap-1 rounded-[3px] border border-editor-field-border bg-editor-field px-1.5">
            <input
              type="number"
              min="0"
              max="100"
              value={formatPercent(flow())}
              onInput={(event) => setFlowValue(Number(event.currentTarget.value))}
              class="w-full bg-transparent text-[11px] text-editor-text outline-none"
            />
            <span class="text-[10px] text-editor-text-dim">%</span>
          </label>
        </div>

        {/* Smoothing */}
        <div class="flex flex-col gap-1">
          <span class="text-[10px] font-bold text-editor-text-dim uppercase tracking-wider">Smoothing</span>
          <label class="flex h-[24px] items-center gap-1 rounded-[3px] border border-editor-field-border bg-editor-field px-1.5">
            <input
              type="number"
              min="0"
              max="100"
              value={smoothing()}
              onInput={(event) => setSmoothingValue(Number(event.currentTarget.value))}
              class="w-full bg-transparent text-[11px] text-editor-text outline-none"
            />
          </label>
        </div>

        <div class="h-px bg-editor-divider my-1" />

        {/* Preset Selector */}
        <div class="flex flex-col gap-1">
          <span class="text-[10px] font-bold text-editor-text-dim uppercase tracking-wider">Presets</span>
          <div class="relative">
            <button
              type="button"
              onClick={() => setShowPresets(!showPresets())}
              class="flex h-[24px] w-full items-center justify-between rounded-[3px] border border-editor-field-border bg-editor-field px-2 text-[11px] text-editor-text hover:border-editor-accent"
              title="Brush presets"
            >
              <span>{currentPresetName()}</span>
              <Icon name="chevron-down" class="size-3" strokeWidth={1.5} />
            </button>
            <Show when={showPresets()}>
              <div class="absolute bottom-full right-0 z-50 mb-1 flex flex-col rounded-[4px] border border-editor-field-border bg-editor-panel py-1 shadow-lg max-h-[150px] overflow-y-auto">
                <div class="fixed inset-0 z-[-1]" onClick={() => setShowPresets(false)} />
                <For each={BRUSH_PRESETS.filter(p => p.tool === "both" || p.tool === (isEraser() ? "eraser" : "brush"))}>
                  {(preset) => (
                    <button
                      type="button"
                      class={`flex items-center gap-2 px-3 py-1.5 text-[11px] whitespace-nowrap hover:bg-editor-field/60 ${preset.id === presetId() ? "text-editor-accent font-medium" : "text-editor-text"}`}
                      onClick={() => { applyPreset(preset); setShowPresets(false); }}
                    >
                      {preset.name}
                    </button>
                  )}
                </For>
              </div>
            </Show>
          </div>
        </div>

        {/* Eraser hard-100 helper */}
        <Show when={isEraser()}>
          <button
            type="button"
            class="h-[24px] w-full rounded-[3px] border border-editor-field-border bg-editor-field px-2 text-[11px] text-editor-text hover:bg-editor-field/85 transition-colors mt-1"
            aria-label="Set eraser to full hard strength"
            title="Set eraser to full hard strength"
            onClick={() => {
              setEraserHardness(1);
              setEraserOpacity(1);
              setEraserFlow(1);
              clearPresetId();
            }}
          >
            Hard 100
          </button>
        </Show>
      </MoreDropdown>
    </>
  );
}
