import { Show } from "solid-js";

export function TransformationHUD(props: { x: number; y: number; label: string }) {
  return (
    <Show when={props.label.length > 0}>
      <div class="absolute pointer-events-none whitespace-pre font-mono text-[11px] font-bold text-white rounded-sm border border-white/10"
        style={{ left: `${props.x + 15}px`, top: `${props.y + 15}px`, "background-color": "rgba(30,30,30,0.9)", padding: "2px 8px", "z-index": 30, "box-shadow": "0 2px 10px rgba(0,0,0,0.5)" }}>
        {props.label}
      </div>
    </Show>
  );
}
