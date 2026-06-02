import { Show, createMemo } from "solid-js";

export type HudMode = "move" | "resize" | "rotate";

interface TransformHudProps {
  mode: HudMode;
  clientX: number;
  clientY: number;
  zoom: number;
  deltaX?: number;
  deltaY?: number;
  width?: number;
  height?: number;
  scalePercent?: number;
  angle?: number;
  snapActive?: boolean;
}

export function TransformHud(props: TransformHudProps) {
  const label = createMemo(() => {
    switch (props.mode) {
      case "move": {
        let s = `ΔX ${Math.round(props.deltaX ?? 0)}  ΔY ${Math.round(props.deltaY ?? 0)}`;
        if (props.snapActive) s += "  snap";
        return s;
      }
      case "resize": {
        let s = `W ${Math.round(props.width ?? 0)}  H ${Math.round(props.height ?? 0)}  ${Math.round(props.scalePercent ?? 100)}%`;
        if (props.snapActive) s += "  snap";
        return s;
      }
      case "rotate": {
        let s = `${Math.round(props.angle ?? 0)}°`;
        if (props.snapActive) s += "  snap";
        return s;
      }
      default:
        return "";
    }
  });

  const padX = 16;
  const padY = 24;

  return (
    <Show when={label().length > 0}>
      <g transform={`translate(${props.clientX + padX / props.zoom}, ${props.clientY + padY / props.zoom})`}>
        <rect
          x={0}
          y={0}
          width={label().length * 7 + 16}
          height={20 / props.zoom}
          rx={4 / props.zoom}
          fill="rgba(20,20,20,0.85)"
          stroke="rgba(255,255,255,0.08)"
          stroke-width={1 / props.zoom}
        />
        <text
          x={8 / props.zoom}
          y={14 / props.zoom}
          fill="#E15A17"
          font-size={`${12 / props.zoom}`}
          font-weight="bold"
          text-anchor="start"
          style={{ "user-select": "none", "font-family": "monospace", "pointer-events": "none" }}
        >
          {label()}
        </text>
      </g>
    </Show>
  );
}
