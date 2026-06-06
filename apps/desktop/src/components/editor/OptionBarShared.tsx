import { Icon } from "./icons";
import { clsx } from "clsx";

export function ToggleBtn(props: { active: boolean; onChange: (v: boolean) => void; icon: string; label: string; title?: string }) {
  return (
    <button
      onClick={() => props.onChange(!props.active)}
      title={props.title}
      class={clsx(
        "flex h-[24px] shrink-0 items-center gap-1 rounded-[4px] border px-2 text-[11px] font-medium transition-all duration-75",
        props.active
          ? "border-editor-accent/40 bg-editor-accent/10 text-editor-text shadow-[inset_0_1px_2px_rgba(225,90,23,0.15)]"
          : "border-transparent bg-transparent text-editor-text-dim hover:border-editor-field-border hover:bg-editor-field/60 hover:text-editor-text",
      )}
    >
      <Icon name={props.icon as any} class={clsx("size-3", props.active && "text-editor-accent")} strokeWidth={1.5} />
      {props.label}
    </button>
  );
}

export function Divider() {
  return <div class="h-5 w-px shrink-0 bg-editor-divider" />;
}
