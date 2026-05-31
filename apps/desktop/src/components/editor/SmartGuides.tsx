import { For, Show } from "solid-js";

interface SmartGuidesProps {
  lines: { x1: number; y1: number; x2: number; y2: number }[];
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
            stroke="#ff00ff"
            stroke-width={1}
            vector-effect="non-scaling-stroke"
            style={{ opacity: 0.8 }}
          />
        )}
      </For>
    </Show>
  );
}
