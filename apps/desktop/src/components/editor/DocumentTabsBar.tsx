import { For, Show } from "solid-js";
import { clsx } from "clsx";
import { Icon } from "./icons";
import { DOCUMENT_TABS } from "./editorData";

export function DocumentTabsBar() {
  return (
    <div class="flex h-[44px] shrink-0 items-stretch overflow-x-auto border-b border-editor-divider bg-editor-topbar">
      <For each={DOCUMENT_TABS}>
        {(tab) => (
          <div
            class={clsx(
              "group relative flex shrink-0 items-center gap-3 border-r border-editor-divider pl-4 pr-3",
              tab.active ? "bg-editor-bg" : "bg-editor-topbar",
            )}
          >
            <span
              class={clsx(
                "whitespace-nowrap text-[13px]",
                tab.active ? "text-editor-accent" : "text-editor-text-dim",
              )}
            >
              {tab.label}
            </span>
            <button
              class="flex size-4 items-center justify-center rounded text-editor-text-dim hover:text-editor-text"
              aria-label={`Close ${tab.label}`}
            >
              <Icon name="x" class="size-3.5" strokeWidth={1.75} />
            </button>
            <Show when={tab.active}>
              <span class="absolute inset-x-0 bottom-0 h-[2px] bg-editor-accent" />
            </Show>
          </div>
        )}
      </For>
      <button
        class="flex w-11 shrink-0 items-center justify-center text-editor-icon hover:text-editor-text"
        aria-label="New document"
      >
        <Icon name="plus" class="size-[18px]" strokeWidth={1.75} />
      </button>
    </div>
  );
}
