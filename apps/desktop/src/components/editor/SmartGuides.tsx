import { For, Show } from "solid-js";
import type { SnapLine } from "@/viewport/smartGuides";

interface SmartGuidesProps {
  lines: SnapLine[];
}

export function SmartGuides(props: SmartGuidesProps) {
  return (
    <Show when={props.lines.length > 0}>
      <For each={props.lines}>
        {(line) => (
          <line
            x1={line.x1}
            y1={line.y1}
            x2={line.x2}
            y2={line.y2}
            stroke={line.color || "#ff00ff"}
            stroke-width={1}
            vector-effect="non-scaling-stroke"
            stroke-dasharray={line.color === "#00ffff" ? "4 2" : undefined}
            style={{ opacity: 0.8 }}
          />
        )}
      </For>
    </Show>
  );
}
