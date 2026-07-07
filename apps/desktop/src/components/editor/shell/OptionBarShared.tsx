import { Icon, IconName } from "../icons";
import { clsx } from "clsx";
import { Show, createSignal, JSX } from "solid-js";
import { Tooltip } from "../Tooltip";

export function ToggleBtn(props: { active: boolean; onChange: (v: boolean) => void; icon: IconName; label: string; labelClass?: string; class?: string }) {
  return (
    <button
      onClick={() => props.onChange(!props.active)}
      class={clsx(
        "flex h-[24px] shrink-0 items-center gap-1 rounded-[4px] border px-2 text-[11px] font-medium transition-all duration-75 focus:outline-none focus-visible:outline focus-visible:outline-1 focus-visible:outline-offset-2 focus-visible:outline-editor-accent/70",
        props.active
          ? "border-editor-accent/80 bg-editor-accent/15 text-editor-text shadow-sm"
          : "border-transparent bg-transparent text-editor-text-dim hover:border-editor-field-border hover:bg-editor-field/40 hover:text-editor-text",
        props.class
      )}
    >
      <Icon name={props.icon} class={clsx("size-3", props.active && "text-editor-accent")} strokeWidth={1.5} />
      <span class={props.labelClass}>{props.label}</span>
    </button>
  );
}

export function OptionCheckbox(props: { checked: boolean; onChange: (v: boolean) => void; label: string; class?: string; labelClass?: string }) {
  return (
    <label class={clsx("flex h-[24px] cursor-pointer items-center gap-1.5 rounded-[4px] border border-transparent px-1.5 text-[11px] font-medium transition-colors hover:bg-editor-field/40 hover:border-editor-field-border", props.class)}>
      <input
        type="checkbox"
        class="peer sr-only"
        checked={props.checked}
        onChange={(e) => props.onChange(e.currentTarget.checked)}
      />
      <div class={clsx(
        "flex size-3.5 shrink-0 items-center justify-center rounded-[3px] border transition-colors",
        props.checked 
          ? "border-editor-accent bg-editor-accent text-white" 
          : "border-editor-field-border bg-editor-field/50 shadow-inner peer-focus-visible:outline peer-focus-visible:outline-1 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-editor-accent/70"
      )}>
        <Show when={props.checked}>
          <Icon name="check" class="size-3" strokeWidth={3.5} />
        </Show>
      </div>
      <span class={clsx("select-none", props.checked ? "text-editor-text" : "text-editor-text-dim", props.labelClass)}>{props.label}</span>
    </label>
  );
}


export function Divider() {
  return <div class="h-5 w-px shrink-0 bg-editor-divider" />;
}

export function ToolPill(props: { icon: IconName; label: string }) {
  return (
    <div class="flex h-[24px] shrink-0 items-center gap-1.5 rounded-[4px] border border-editor-field-border bg-editor-field px-2 text-[11px] font-medium text-editor-text-dim capitalize">
      <Icon name={props.icon} class="size-3" strokeWidth={1.5} />
      <span>{props.label}</span>
    </div>
  );
}

export function MoreDropdown(props: { children: JSX.Element }) {
  const [isOpen, setIsOpen] = createSignal(false);
  return (
    <div class="relative hidden @max-[880px]:flex">
      <Tooltip content="More Options" placement="top">
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen())}
          class="flex size-[24px] shrink-0 items-center justify-center rounded-[3px] border border-editor-field-border bg-editor-field text-editor-icon hover:border-editor-accent hover:text-editor-text transition-colors"
        >
          <Icon name="more" class="size-4" strokeWidth={1.5} />
        </button>
      </Tooltip>
      <Show when={isOpen()}>
        <div class="absolute right-0 top-full z-50 mt-1 flex flex-col gap-2 rounded-[4px] border border-editor-field-border bg-editor-panel p-2 shadow-lg min-w-[150px]">
          <div class="fixed inset-0 z-[-1]" onClick={() => setIsOpen(false)} />
          {props.children}
        </div>
      </Show>
    </div>
  );
}

