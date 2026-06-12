import { Icon } from "./icons";
import { clsx } from "clsx";
import { Show, createSignal, JSX } from "solid-js";

export function ToggleBtn(props: { active: boolean; onChange: (v: boolean) => void; icon: string; label: string; title?: string; labelClass?: string; class?: string }) {
  return (
    <button
      onClick={() => props.onChange(!props.active)}
      title={props.title}
      class={clsx(
        "flex h-[24px] shrink-0 items-center gap-1 rounded-[4px] border px-2 text-[11px] font-medium transition-all duration-75",
        props.active
          ? "border-editor-accent/40 bg-editor-accent/10 text-editor-text shadow-[inset_0_1px_2px_rgba(225,90,23,0.15)]"
          : "border-transparent bg-transparent text-editor-text-dim hover:border-editor-field-border hover:bg-editor-field/60 hover:text-editor-text",
        props.class
      )}
    >
      <Icon name={props.icon as any} class={clsx("size-3", props.active && "text-editor-accent")} strokeWidth={1.5} />
      <span class={props.labelClass}>{props.label}</span>
    </button>
  );
}

export function Divider() {
  return <div class="h-5 w-px shrink-0 bg-editor-divider" />;
}

export function ToolPill(props: { icon: string; label: string }) {
  return (
    <div class="flex h-[24px] shrink-0 items-center gap-1.5 rounded-[4px] border border-editor-field-border bg-editor-field px-2 text-[11px] font-medium text-editor-text-dim capitalize">
      <Icon name={props.icon as any} class="size-3" strokeWidth={1.5} />
      <span>{props.label}</span>
    </div>
  );
}

export function MoreDropdown(props: { children: JSX.Element }) {
  const [isOpen, setIsOpen] = createSignal(false);
  return (
    <div class="relative hidden @max-[650px]:flex">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen())}
        class="flex size-[24px] shrink-0 items-center justify-center rounded-[3px] border border-editor-field-border bg-editor-field text-editor-icon hover:border-editor-accent hover:text-editor-text transition-colors"
        title="More Options"
      >
        <Icon name="more" class="size-4" strokeWidth={1.5} />
      </button>
      <Show when={isOpen()}>
        <div class="absolute right-0 top-full z-50 mt-1 flex flex-col gap-2 rounded-[4px] border border-editor-field-border bg-editor-panel p-2 shadow-lg min-w-[150px]">
          <div class="fixed inset-0 z-[-1]" onClick={() => setIsOpen(false)} />
          {props.children}
        </div>
      </Show>
    </div>
  );
}

