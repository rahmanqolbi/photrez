import { For, Show } from "solid-js";
import { SelectionState } from "./SelectionTypes";

interface SelectionRendererProps {
  selection: SelectionState | null;
  zoom: number;
  pan: { x: number; y: number };
  onHandlePointerDown?: (handleId: string) => void;
  onRotatePointerDown?: () => void;
}

const HANDLE_IDS = ["nw", "n", "ne", "e", "se", "s", "sw", "w"];

export function SelectionRenderer(props: SelectionRendererProps) {
  return (
    <Show when={props.selection}>
      {(sel) => {
        const screenX = () => sel().x * props.zoom + props.pan.x;
        const screenY = () => sel().y * props.zoom + props.pan.y;
        const screenW = () => sel().width * props.zoom;
        const screenH = () => sel().height * props.zoom;
        const centerX = () => screenX() + screenW() / 2;
        const centerY = () => screenY() + screenH() / 2;
        const angle = () => sel().angle;

        const handlePos = (id: string) => {
          "use strict";
          const x = screenX();
          const y = screenY();
          const w = screenW();
          const h = screenH();
          switch (id) {
            case "nw": return { cx: x, cy: y };
            case "n": return { cx: x + w / 2, cy: y };
            case "ne": return { cx: x + w, cy: y };
            case "e": return { cx: x + w, cy: y + h / 2 };
            case "se": return { cx: x + w, cy: y + h };
            case "s": return { cx: x + w / 2, cy: y + h };
            case "sw": return { cx: x, cy: y + h };
            case "w": return { cx: x, cy: y + h / 2 };
            default: return { cx: x, cy: y };
          }
        };

        const rotationHandlePos = () => ({
          cx: centerX(),
          cy: screenY() - 20,
        });

        return (
          <g
            transform={`rotate(${angle()}, ${centerX()}, ${centerY()})`}
          >
            <rect
              x={screenX()}
              y={screenY()}
              width={screenW()}
              height={screenH()}
              fill="none"
              stroke="#E15A17"
              stroke-width={1}
              stroke-dasharray="4 4"
              class="animate-dash"
              style={{ "pointer-events": "none" }}
            />
            <For each={HANDLE_IDS}>
              {(id) => {
                const pos = handlePos(id);
                return (
                  <circle
                    cx={pos.cx}
                    cy={pos.cy}
                    r={4}
                    fill="white"
                    stroke="#E15A17"
                    stroke-width={1}
                    data-handle-id={id}
                    onPointerDown={(e) => {
                      e.stopPropagation();
                      props.onHandlePointerDown?.(id);
                    }}
                  />
                );
              }}
            </For>
            <circle
              cx={rotationHandlePos().cx}
              cy={rotationHandlePos().cy}
              r={4}
              fill="white"
              stroke="#E15A17"
              stroke-width={1}
              data-rotation-handle=""
              onPointerDown={(e) => {
                e.stopPropagation();
                props.onRotatePointerDown?.();
              }}
            />
          </g>
        );
      }}
    </Show>
  );
}
