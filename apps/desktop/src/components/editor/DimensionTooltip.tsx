import { Show } from "solid-js";

export function DimensionTooltip(props: { x: number; y: number; w: number; h: number }) {
  const label = () => `${Math.round(props.w)} × ${Math.round(props.h)} px`;
  return (
    <Show when={props.w > 0 && props.h > 0}>
      <g transform={`translate(${props.x}, ${props.y})`}>
        <rect x={-60} y={-14} width={120} height={28} rx={6} fill="rgba(20,20,20,0.9)" stroke="rgba(255,255,255,0.1)" stroke-width={1} />
        <text y={4} fill="white" font-size="11" font-weight="bold" text-anchor="middle" style={{ "user-select": "none", "font-family": "monospace" }}>{label()}</text>
      </g>
    </Show>
  );
}
