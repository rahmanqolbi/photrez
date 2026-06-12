interface CropOverlayTooltipProps {
  x: number;
  y: number;
  w: number;
  h: number;
  zoom: number;
  cropRotation: number;
  isRotate: boolean;
}

export function CropOverlayTooltip(props: CropOverlayTooltipProps) {
  return (
    <g
      transform={`translate(${props.x} ${props.y}) scale(${1 / props.zoom})`}
      style={{ "pointer-events": "none" }}
    >
      <rect
        x={12}
        y={-24}
        width={props.isRotate ? 70 : 120}
        height={22}
        rx={4}
        fill="rgba(20,20,20,0.9)"
        stroke="rgba(255,255,255,0.15)"
        stroke-width={1}
      />
      <text
        x={20}
        y={-9}
        fill="#E15A17"
        font-size="11"
        font-weight="bold"
        font-family="monospace"
        style={{ "user-select": "none" }}
      >
        {props.isRotate
          ? `${props.cropRotation.toFixed(1)}°`
          : `${Math.round(props.w)} × ${Math.round(props.h)} px`}
      </text>
    </g>
  );
}
