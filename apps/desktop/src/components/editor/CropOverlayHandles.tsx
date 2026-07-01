import { For } from "solid-js";
import { getCursorForHandle } from "@/viewport/transformGeometry";

interface CropOverlayHandlesProps {
  isNavigationMode?: boolean;
  handles: { type: string; cx: number; cy: number; size: number }[];
  zoom: number;
  hitSize: number;
  activeHandle: string | null;
  hoverHandle: string | null;
  isDragging: boolean;
  startDrag: (e: PointerEvent, handle: string) => void;
  setHover: (handle: string | null) => void;
  setHoverPos: (pos: { x: number; y: number } | null) => void;
  cropRotation?: number;
}

export function CropOverlayHandles(props: CropOverlayHandlesProps) {
  const pe = () => props.isNavigationMode ? "none" as const : "all" as const;
  return (
    <For each={props.handles}>
      {(h) => {
        const cursor = () => getCursorForHandle(h.type, props.cropRotation ?? 0, 1, 1);
        return (
          <g>
            <rect
              x={h.cx - props.hitSize / 2}
              y={h.cy - props.hitSize / 2}
              width={props.hitSize}
              height={props.hitSize}
              fill="transparent"
              data-crop-handle={h.type}
              style={{ cursor: cursor(), "pointer-events": pe() }}
              onPointerDown={(e) => props.startDrag(e, h.type)}
              onPointerEnter={() => props.setHover(h.type)}
              onPointerLeave={() => { if (!props.isDragging) props.setHover(null); }}
            />
            <rect
              x={h.cx - h.size / 2}
              y={h.cy - h.size / 2}
              width={h.size}
              height={h.size}
              fill={props.activeHandle === h.type ? "var(--color-editor-accent)"
                : props.hoverHandle === h.type ? "#ccc"
                : "white"}
              stroke="#333"
              stroke-width={1 / props.zoom}
              vector-effect="non-scaling-stroke"
              style={{ "pointer-events": "none" }}
            />
          </g>
        );
      }}
    </For>
  );
}
