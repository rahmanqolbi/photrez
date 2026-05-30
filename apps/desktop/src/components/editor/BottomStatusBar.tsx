import { For, Show } from "solid-js";
import { clsx } from "clsx";
import { Icon } from "./icons";
import {
  STATUS_CENTER_ITEMS,
  STATUS_LEFT_ITEMS,
  STATUS_RIGHT_ITEMS,
} from "./editorData";
import type { StatusItem } from "./types";

function StatusText(props: { item: StatusItem }) {
  return (
    <span
      class={clsx(
        "flex shrink-0 items-center gap-1.5",
        props.item.id === "size" && "text-editor-text/80",
        props.item.hideBelow === "sm" && "hidden sm:inline-flex",
        props.item.hideBelow === "md" && "hidden md:inline-flex",
      )}
    >
      <Show when={props.item.icon}>
        {(icon) => <Icon name={icon()} class="size-3.5" strokeWidth={1.75} />}
      </Show>
      {props.item.label}
    </span>
  );
}

export function BottomStatusBar() {
  return (
    <footer class="flex h-[32px] shrink-0 items-center justify-between gap-4 overflow-x-auto border-t border-editor-divider bg-editor-topbar px-4 text-[12px] text-editor-text-dim">
      <div class="flex shrink-0 items-center gap-5">
        <For each={STATUS_LEFT_ITEMS}>
          {(item) => <StatusText item={item} />}
        </For>
      </div>

      <div class="hidden shrink-0 items-center gap-7 md:flex">
        <For each={STATUS_CENTER_ITEMS}>
          {(item) => <StatusText item={item} />}
        </For>
      </div>

      <div class="flex shrink-0 items-center gap-5">
        <For each={STATUS_RIGHT_ITEMS}>
          {(item) => <StatusText item={item} />}
        </For>
      </div>
    </footer>
  );
}
