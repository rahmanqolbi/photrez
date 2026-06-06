import type { JSX } from "solid-js";
import { Show, createSignal, createEffect } from "solid-js";
import { clsx } from "clsx";
import { Icon } from "./icons";

export function NumField(props: {
  label?: string;
  value: string;
  suffix?: string;
  class?: string;
}) {
  return (
    <div
      class={clsx(
        "flex h-[24px] items-center gap-1 rounded-[3px] border border-editor-field-border bg-editor-field px-1.5",
        props.class,
      )}
    >
      <Show when={props.label}>
        <span class="text-[10px] font-medium text-editor-text-dim">
          {props.label}
        </span>
      </Show>
      <span class="text-[11px] text-editor-text">{props.value}</span>
      <Show when={props.suffix}>
        <span class="text-[10px] text-editor-text-dim">{props.suffix}</span>
      </Show>
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

export function EditableNumField(props: {
  label: string;
  value: number;
  suffix?: string;
  class?: string;
  disabled?: boolean;
  onSubmit: (val: number) => void;
}) {
  let inputRef: HTMLInputElement | undefined;

  const formatValue = (val: number) => {
    return `${Math.round(val * 100) / 100}`;
  };

  const [text, setText] = createSignal(formatValue(props.value));
  const [editing, setEditing] = createSignal(false);

  createEffect(() => {
    if (!editing()) {
      setText(formatValue(props.value));
    }
  });

  const commit = () => {
    if (!editing()) return;
    const val = text();
    setEditing(false);
    inputRef?.blur();

    const parsed = parseFloat(val);
    if (!isNaN(parsed)) {
      if (Math.abs(parsed - props.value) > 0.0001) {
        props.onSubmit(parsed);
      }
    } else {
      setText(formatValue(props.value));
    }
  };

  const revert = () => {
    setEditing(false);
    setText(formatValue(props.value));
    inputRef?.blur();
  };

  return (
    <div
      class={clsx(
        "flex h-[24px] items-center gap-1 rounded-[3px] border border-editor-field-border bg-editor-field px-1.5",
        props.disabled && "opacity-40 pointer-events-none",
        props.class,
      )}
    >
      <span class="text-[10px] font-medium text-editor-text-dim">
        {props.label}
      </span>
      <input
        ref={inputRef}
        type="text"
        value={text()}
        onFocus={() => {
          if (props.disabled) return;
          setEditing(true);
          setText(formatValue(props.value));
          inputRef?.select();
        }}
        onInput={(e) => {
          setText(e.currentTarget.value);
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter") { e.preventDefault(); commit(); }
          if (e.key === "Escape") { e.preventDefault(); revert(); }
        }}
        onBlur={commit}
        class="w-full min-w-0 bg-transparent text-[11px] text-editor-text outline-none"
      />
      <Show when={props.suffix}>
        <span class="text-[10px] text-editor-text-dim">{props.suffix}</span>
      </Show>
    </div>
  );
}
