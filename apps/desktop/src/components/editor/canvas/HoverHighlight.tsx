import { Show, createMemo } from "solid-js";
import { useEditor } from "../shell/EditorContext";
import type { LayerNode } from "@/engine/types";

export function HoverHighlight() {
  const { hoveredLayerId, layers, activeLayerId, zoom, pan } = useEditor();

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

        const screenTL = createMemo(() => {
          const z = zoom();
          const p = pan();
          return { x: x * z + p.x, y: y * z + p.y };
        });
        const screenW = createMemo(() => w * zoom());
        const screenH = createMemo(() => h * zoom());

        return (
          <rect
            x={screenTL().x}
            y={screenTL().y}
            width={screenW()}
            height={screenH()}
            fill="none"
            stroke="#8b5cf6"
            stroke-width={1}
            style={{ opacity: 0.8 }}
          />
        );
      }}
    </Show>
  );
}
