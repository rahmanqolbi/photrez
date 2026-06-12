import { Show, createMemo } from "solid-js";
import { useEditor } from "./EditorContext";
import type { LayerNode } from "@/engine/types";

export function HoverHighlight() {
  const { hoveredLayerId, layers, activeLayerId, zoom } = useEditor();

  const hoveredLayer = createMemo(() => {
    const id = hoveredLayerId();
    if (!id || id === activeLayerId()) return null;
    return layers().find((l) => l.id === id) ?? null;
  });

  return (
    <Show when={hoveredLayer()}>
      {(layer) => {
        const l = layer() as LayerNode;
        const x = l.transform.x;
        const y = l.transform.y;
        const w = Math.abs(l.width * l.transform.scaleX);
        const h = Math.abs(l.height * l.transform.scaleY);
        return (
          <rect
            x={x}
            y={y}
            width={w}
            height={h}
            fill="none"
            stroke="#8b5cf6"
            stroke-width={1 / zoom()}
            style={{ opacity: 0.8 }}
          />
        );
      }}
    </Show>
  );
}
