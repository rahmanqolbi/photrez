import { For, Show } from "solid-js";
import { clsx } from "clsx";
import fjord from "@/assets/fjord.jpg";
import { Icon } from "./icons";

import { LAYERS } from "./editorData";

export function LayersPanel() {
  return (
    <section class="flex flex-1 shrink-0 flex-col overflow-hidden bg-editor-panel">
      <div class="flex h-[46px] shrink-0 border-b border-editor-divider">
        <button class="relative flex h-full items-center px-6 text-[12px] font-medium text-editor-text after:absolute after:bottom-0 after:inset-x-0 after:h-[2px] after:bg-editor-text-dim">
          Layers
        </button>
        <button class="flex h-full items-center px-6 text-[12px] font-medium text-editor-text-dim transition-colors hover:text-editor-text hover:bg-white/[0.02]">
          History
        </button>
      </div>

      <div class="flex items-center gap-2 px-3.5 pt-3">
        <div class="flex h-[26px] w-[120px] items-center justify-between rounded-[4px] border border-editor-field-border bg-editor-field px-2.5">
          <span class="text-[12px] text-editor-text">Normal</span>
          <Icon
            name="chevron-down"
            class="size-3.5 text-editor-text-dim"
            strokeWidth={1.75}
          />
        </div>
        <span class="ml-auto text-[12px] text-editor-text-dim">Opacity</span>
        <span class="text-[12px] text-editor-text">100%</span>
        <Icon
          name="chevron-down"
          class="size-3.5 text-editor-text-dim"
          strokeWidth={1.75}
        />
      </div>

      <div class="flex items-center gap-4 px-3.5 py-3">
        <span class="text-[12px] text-editor-text-dim">Lock:</span>
        <div class="flex items-center gap-4 text-editor-icon">
          <Icon name="unlock" class="size-[15px]" strokeWidth={1.75} />
          <Icon name="paint-bucket" class="size-[15px]" strokeWidth={1.75} />
          <Icon name="maximize" class="size-[15px]" strokeWidth={1.75} />
          <Icon name="rotate" class="size-[15px]" strokeWidth={1.75} />
        </div>
      </div>

      <div class="flex-1 overflow-y-auto border-y border-editor-divider">
        <For each={LAYERS}>
          {(layer) => (
            <div
              class={clsx(
                "flex h-[50px] items-center gap-2.5 px-3.5",
                layer.active ? "bg-editor-row-active" : "hover:bg-white/[0.03]",
              )}
            >
              {layer.adjustment ? (
                <Icon
                  name="sun"
                  class="size-4 shrink-0 text-editor-text-dim"
                  strokeWidth={1.75}
                />
              ) : (
                <Icon
                  name="eye"
                  class="size-4 shrink-0 text-editor-icon"
                  strokeWidth={1.75}
                />
              )}

              {layer.adjustment ? (
                <div
                  class="size-[34px] shrink-0 rounded-[3px] bg-black"
                  style={{
                    "background-image":
                      "repeating-conic-gradient(from 0deg at 50% 50%, rgba(255,255,255,0.92) 0deg 4deg, transparent 4deg 14deg)",
                  }}
                />
              ) : (
                <div
                  class="size-[34px] shrink-0 rounded-[3px] border border-black/40 bg-cover"
                  style={{
                    "background-image": `url(${fjord})`,
                    "background-position": layer.thumbnailPosition,
                  }}
                />
              )}

              <Show when={layer.mask}>
                <div class="flex size-[34px] shrink-0 items-center justify-center rounded-[3px] bg-black">
                  <div class="size-4 rounded-full bg-white" />
                </div>
              </Show>

              <span class="flex-1 text-[12.5px] text-editor-text">
                {layer.name}
              </span>

              <Show when={layer.locked}>
                <Icon
                  name="lock"
                  class="size-3.5 shrink-0 text-editor-text-dim"
                  strokeWidth={1.75}
                />
              </Show>
            </div>
          )}
        </For>
      </div>

      <div class="flex shrink-0 items-center gap-5 border-t border-editor-divider bg-editor-panel px-4 py-2.5 text-editor-icon">
        <Icon name="plus" class="size-[17px]" strokeWidth={1.75} />
        <Icon name="folder-plus" class="size-[17px]" strokeWidth={1.75} />
        <Icon name="copy" class="size-[17px]" strokeWidth={1.75} />
        <Icon name="square-dashed" class="size-[17px]" strokeWidth={1.75} />
        <Icon name="trash" class="ml-auto size-[17px]" strokeWidth={1.75} />
      </div>

      <div class="shrink-0 border-t border-editor-divider bg-editor-panel">
        <div class="flex h-[46px] items-center justify-between border-b border-editor-divider px-4">
          <h3 class="text-[13px] font-medium text-editor-text">Navigator</h3>
          <Icon
            name="maximize"
            class="size-3.5 text-editor-text-dim hover:text-editor-text"
            strokeWidth={1.75}
          />
        </div>
        <div class="px-4 pt-4">
          <div class="overflow-hidden rounded-[3px] border border-editor-divider">
            <img
              src={fjord}
              alt="Navigator preview"
              width={1920}
              height={1080}
              class="h-[88px] w-full object-cover"
            />
          </div>
        </div>
        <div class="flex items-center gap-2.5 px-4 py-3">
          <span class="text-[14px] text-editor-text-dim">▴</span>
          <div class="relative h-[3px] flex-1 rounded-full bg-editor-field-border">
            <div class="absolute left-[40%] top-1/2 size-[11px] -translate-y-1/2 rounded-full border border-black/40 bg-editor-text" />
          </div>
          <span class="text-[12px] text-editor-text">41%</span>
        </div>
      </div>
    </section>
  );
}
