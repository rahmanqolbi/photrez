import { Show, For, createMemo } from "solid-js";

interface CropOverlayGuidesProps {
  x: number;
  y: number;
  w: number;
  h: number;
  zoom: number;
  guideMode: "none" | "thirds" | "grid" | "diagonal" | "golden";
}

function GridLines(props: { x: number; y: number; w: number; h: number; zoom: number }) {
  const n = () => Math.max(1, Math.ceil(Math.sqrt(props.w * props.h) / 64));
  const z = props.zoom;
  // brand-new array reference on every reactive evaluation. SolidJS
  // <For> uses referential equality to decide whether to reuse or
  // recreate children, so the entire grid re-renders every time any
  // tracked signal (zoom, w, h) changes. The createMemo caches the
  // array until n() actually changes, keeping the grid static while
  // zoom/size updates flow through the existing line elements.
  const indices = createMemo(() =>
    Array.from({ length: Math.max(0, n() - 1) }, (_, i) => i + 1),
  );
  return (
    <For each={indices()}>
      {(i) => (
        <>
          <line x1={props.x + (props.w * i) / n()} y1={props.y} x2={props.x + (props.w * i) / n()} y2={props.y + props.h} stroke="rgba(255,255,255,0.3)" stroke-width={1 / z} vector-effect="non-scaling-stroke" style={{ "pointer-events": "none" }} />
          <line x1={props.x} y1={props.y + (props.h * i) / n()} x2={props.x + props.w} y2={props.y + (props.h * i) / n()} stroke="rgba(255,255,255,0.3)" stroke-width={1 / z} vector-effect="non-scaling-stroke" style={{ "pointer-events": "none" }} />
        </>
      )}
    </For>
  );
}

export function CropOverlayGuides(props: CropOverlayGuidesProps) {
  return (
    <>
      <Show when={props.guideMode === "thirds"}>
        <line x1={props.x + props.w / 3} y1={props.y} x2={props.x + props.w / 3} y2={props.y + props.h} stroke="rgba(255,255,255,0.3)" stroke-width={1 / props.zoom} vector-effect="non-scaling-stroke" style={{ "pointer-events": "none" }} />
        <line x1={props.x + 2 * props.w / 3} y1={props.y} x2={props.x + 2 * props.w / 3} y2={props.y + props.h} stroke="rgba(255,255,255,0.3)" stroke-width={1 / props.zoom} vector-effect="non-scaling-stroke" style={{ "pointer-events": "none" }} />
        <line x1={props.x} y1={props.y + props.h / 3} x2={props.x + props.w} y2={props.y + props.h / 3} stroke="rgba(255,255,255,0.3)" stroke-width={1 / props.zoom} vector-effect="non-scaling-stroke" style={{ "pointer-events": "none" }} />
        <line x1={props.x} y1={props.y + 2 * props.h / 3} x2={props.x + props.w} y2={props.y + 2 * props.h / 3} stroke="rgba(255,255,255,0.3)" stroke-width={1 / props.zoom} vector-effect="non-scaling-stroke" style={{ "pointer-events": "none" }} />
      </Show>
      <Show when={props.guideMode === "grid"}>
        <GridLines x={props.x} y={props.y} w={props.w} h={props.h} zoom={props.zoom} />
      </Show>
      <Show when={props.guideMode === "diagonal"}>
        <line x1={props.x} y1={props.y} x2={props.x + props.w} y2={props.y + props.h} stroke="rgba(255,255,255,0.3)" stroke-width={1 / props.zoom} vector-effect="non-scaling-stroke" style={{ "pointer-events": "none" }} />
        <line x1={props.x + props.w} y1={props.y} x2={props.x} y2={props.y + props.h} stroke="rgba(255,255,255,0.3)" stroke-width={1 / props.zoom} vector-effect="non-scaling-stroke" style={{ "pointer-events": "none" }} />
      </Show>
      <Show when={props.guideMode === "golden"}>
        <line x1={props.x + props.w * 0.382} y1={props.y} x2={props.x + props.w * 0.382} y2={props.y + props.h} stroke="rgba(255,255,255,0.3)" stroke-width={1 / props.zoom} vector-effect="non-scaling-stroke" style={{ "pointer-events": "none" }} />
        <line x1={props.x + props.w * 0.618} y1={props.y} x2={props.x + props.w * 0.618} y2={props.y + props.h} stroke="rgba(255,255,255,0.3)" stroke-width={1 / props.zoom} vector-effect="non-scaling-stroke" style={{ "pointer-events": "none" }} />
        <line x1={props.x} y1={props.y + props.h * 0.382} x2={props.x + props.w} y2={props.y + props.h * 0.382} stroke="rgba(255,255,255,0.3)" stroke-width={1 / props.zoom} vector-effect="non-scaling-stroke" style={{ "pointer-events": "none" }} />
        <line x1={props.x} y1={props.y + props.h * 0.618} x2={props.x + props.w} y2={props.y + props.h * 0.618} stroke="rgba(255,255,255,0.3)" stroke-width={1 / props.zoom} vector-effect="non-scaling-stroke" style={{ "pointer-events": "none" }} />
      </Show>
    </>
  );
}
