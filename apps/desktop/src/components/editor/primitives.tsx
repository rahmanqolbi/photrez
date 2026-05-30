import type { JSX } from "solid-js";
import { Show } from "solid-js";
import { clsx } from "clsx";
import { Icon } from "./icons";

export function NumField(props: {
  label?: string;
  value: string;
  class?: string;
}) {
  return (
    <div
      class={clsx(
        "flex h-[26px] items-center gap-1.5 rounded-[4px] border border-editor-field-border bg-editor-field px-2",
        props.class,
      )}
    >
      <Show when={props.label}>
        <span class="text-[11px] font-medium text-editor-text-dim">
          {props.label}
        </span>
      </Show>
      <span class="text-[12px] text-editor-text">{props.value}</span>
    </div>
  );
}

export function SelectField(props: { value: string; class?: string }) {
  return (
    <div
      class={clsx(
        "flex h-[26px] items-center justify-between rounded-[4px] border border-editor-field-border bg-editor-field px-2.5",
        props.class,
      )}
    >
      <span class="text-[12px] text-editor-text">{props.value}</span>
      <Icon
        name="chevron-down"
        class="size-3.5 text-editor-text-dim"
        strokeWidth={1.75}
      />
    </div>
  );
}

export function PropRow(props: { label: string; children: JSX.Element }) {
  return (
    <div class="flex items-center gap-2.5">
      <span class="w-[58px] shrink-0 text-[12px] text-editor-text-dim">
        {props.label}
      </span>
      <div class="flex flex-1 items-center gap-1.5">{props.children}</div>
    </div>
  );
}

export function Slider(props: {
  percent: number;
  accent?: boolean;
  gradient?: string;
  centerTick?: boolean;
}) {
  return (
    <div
      class={clsx(
        "relative h-[3px] flex-1 rounded-full",
        props.gradient ? "" : "bg-editor-field-border",
      )}
      style={
        props.gradient ? { "background-image": props.gradient } : undefined
      }
    >
      <Show when={!props.gradient}>
        <div
          class={clsx(
            "absolute inset-y-0 left-0 rounded-full",
            props.accent ? "bg-editor-accent" : "bg-editor-text/55",
          )}
          style={{ width: `${props.percent}%` }}
        />
      </Show>
      <Show when={props.centerTick}>
        <div class="absolute left-1/2 top-1/2 size-[3px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-white/40" />
      </Show>
      <div
        class="absolute top-1/2 size-[10px] -translate-y-1/2 rounded-full border border-black/40 bg-[#d4d4d4] shadow-[0_1px_2px_rgba(0,0,0,0.5)]"
        style={{ left: `calc(${props.percent}% - 5px)` }}
      />
    </div>
  );
}
