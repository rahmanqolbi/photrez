import { For, Show } from "solid-js";
import { getCursorForHandle } from "@/viewport/transformGeometry";

interface CropOverlayHandlesProps {
  handles: { type: string; cx: number; cy: number; size: number }[];
  zoom: number;
  hitSize: number;
  rotateOuter: number;
  activeHandle: string | null;
  hoverHandle: string | null;
  isDragging: boolean;
  startDrag: (e: PointerEvent, handle: string) => void;
  setHover: (handle: string | null) => void;
  setHoverPos: (pos: { x: number; y: number } | null) => void;
}

export function CropOverlayHandles(props: CropOverlayHandlesProps) {
  return (
    <For each={props.handles}>
      {(h) => {
        const cursor = getCursorForHandle(h.type, 0, 1, 1);
        return (
          <g>
            {/* Corner rotate zone ring (only for corners) */}
            <Show when={["nw", "ne", "se", "sw"].includes(h.type)}>
              <path
                d={`M ${h.cx} ${h.cy - props.rotateOuter} 
                    A ${props.rotateOuter} ${props.rotateOuter} 0 1 1 ${h.cx} ${h.cy + props.rotateOuter} 
                    A ${props.rotateOuter} ${props.rotateOuter} 0 1 1 ${h.cx} ${h.cy - props.rotateOuter} Z
                    M ${h.cx} ${h.cy - props.hitSize} 
                    A ${props.hitSize} ${props.hitSize} 0 1 0 ${h.cx} ${h.cy + props.hitSize} 
                    A ${props.hitSize} ${props.hitSize} 0 1 0 ${h.cx} ${h.cy - props.hitSize} Z`}
                fill="transparent"
                fill-rule="evenodd"
                style={{ "pointer-events": "all" }}
                onPointerDown={(e) => props.startDrag(e, `rotate-${h.type}`)}
                onPointerEnter={(e) => {
                  props.setHover(`rotate-${h.type}`);
                  props.setHoverPos({ x: e.clientX, y: e.clientY });
                }}
                onPointerLeave={() => {
                  if (props.isDragging) return;
                  props.setHover(null);
                  props.setHoverPos(null);
                }}
              />
            </Show>
            <rect
              x={h.cx - props.hitSize / 2}
              y={h.cy - props.hitSize / 2}
              width={props.hitSize}
              height={props.hitSize}
              fill="transparent"
              data-crop-handle={h.type}
              style={{ cursor, "pointer-events": "all" }}
              onPointerDown={(e) => props.startDrag(e, h.type)}
              onPointerEnter={() => props.setHover(h.type)}
              onPointerLeave={() => { if (!props.isDragging) props.setHover(null); }}
            />
            <rect
              x={h.cx - h.size / 2}
              y={h.cy - h.size / 2}
              width={h.size}
              height={h.size}
              fill={props.activeHandle === h.type ? "#E15A17"
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
