import { For, Show, createMemo } from "solid-js";
import type { SnapLine } from "@/viewport/smartGuides";
import { useEditor } from "./EditorContext";

interface SmartGuidesProps {
  lines: SnapLine[];
}

export function SmartGuides(props: SmartGuidesProps) {
  const { zoom, pan } = useEditor();

  return (
    <Show when={props.lines.length > 0}>
      <For each={props.lines}>
        {(line) => {
          const screenStart = createMemo(() => {
            const z = zoom();
            const p = pan();
            return { x: line.x1 * z + p.x, y: line.y1 * z + p.y };
          });
          const screenEnd = createMemo(() => {
            const z = zoom();
            const p = pan();
            return { x: line.x2 * z + p.x, y: line.y2 * z + p.y };
          });
          return (
            <line
              x1={screenStart().x}
              y1={screenStart().y}
              x2={screenEnd().x}
              y2={screenEnd().y}
              stroke={line.color || "#ff00ff"}
              stroke-width={1}
              vector-effect="non-scaling-stroke"
              stroke-dasharray={line.color === "#00ffff" ? "4 2" : undefined}
              style={{ opacity: 0.8 }}
            />
          );
        }}
      </For>
    </Show>
  );
}
