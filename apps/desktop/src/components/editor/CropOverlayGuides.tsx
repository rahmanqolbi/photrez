import { Show, For } from "solid-js";

interface CropOverlayGuidesProps {
  x: number;
  y: number;
  w: number;
  h: number;
  zoom: number;
  guideMode: "none" | "thirds" | "grid" | "diagonal" | "golden";
}

const BRACKET_LENGTH = 12;

function CornerBrackets(props: { x: number; y: number; w: number; h: number; zoom: number }) {
  const z = props.zoom;
  const L = BRACKET_LENGTH / z;
  return (
    <>
      <path d={`M ${props.x - L} ${props.y} L ${props.x} ${props.y} L ${props.x} ${props.y - L}`} fill="none" stroke="white" stroke-width={1.5 / z} vector-effect="non-scaling-stroke" style={{ "pointer-events": "none" }} />
      <path d={`M ${props.x + props.w + L} ${props.y} L ${props.x + props.w} ${props.y} L ${props.x + props.w} ${props.y - L}`} fill="none" stroke="white" stroke-width={1.5 / z} vector-effect="non-scaling-stroke" style={{ "pointer-events": "none" }} />
      <path d={`M ${props.x - L} ${props.y + props.h} L ${props.x} ${props.y + props.h} L ${props.x} ${props.y + props.h + L}`} fill="none" stroke="white" stroke-width={1.5 / z} vector-effect="non-scaling-stroke" style={{ "pointer-events": "none" }} />
      <path d={`M ${props.x + props.w + L} ${props.y + props.h} L ${props.x + props.w} ${props.y + props.h} L ${props.x + props.w} ${props.y + props.h + L}`} fill="none" stroke="white" stroke-width={1.5 / z} vector-effect="non-scaling-stroke" style={{ "pointer-events": "none" }} />
    </>
  );
}

function GridLines(props: { x: number; y: number; w: number; h: number; zoom: number }) {
  const n = () => Math.max(1, Math.ceil(Math.sqrt(props.w * props.h) / 64));
  const z = props.zoom;
  return (
    <For each={Array.from({ length: n() - 1 }, (_, i) => i + 1)}>
      {(i) => (
        <>
          <line x1={props.x + (props.w * i) / n()} y1={props.y} x2={props.x + (props.w * i) / n()} y2={props.y + props.h} stroke="rgba(255,255,255,0.2)" stroke-width={1 / z} vector-effect="non-scaling-stroke" style={{ "pointer-events": "none" }} />
          <line x1={props.x} y1={props.y + (props.h * i) / n()} x2={props.x + props.w} y2={props.y + (props.h * i) / n()} stroke="rgba(255,255,255,0.2)" stroke-width={1 / z} vector-effect="non-scaling-stroke" style={{ "pointer-events": "none" }} />
        </>
      )}
    </For>
  );
}

export function CropOverlayGuides(props: CropOverlayGuidesProps) {
  return (
    <>
      <CornerBrackets x={props.x} y={props.y} w={props.w} h={props.h} zoom={props.zoom} />
      <Show when={props.guideMode === "thirds"}>
        <line x1={props.x + props.w / 3} y1={props.y} x2={props.x + props.w / 3} y2={props.y + props.h} stroke="rgba(255,255,255,0.35)" stroke-width={1 / props.zoom} vector-effect="non-scaling-stroke" style={{ "pointer-events": "none" }} />
        <line x1={props.x + 2 * props.w / 3} y1={props.y} x2={props.x + 2 * props.w / 3} y2={props.y + props.h} stroke="rgba(255,255,255,0.35)" stroke-width={1 / props.zoom} vector-effect="non-scaling-stroke" style={{ "pointer-events": "none" }} />
        <line x1={props.x} y1={props.y + props.h / 3} x2={props.x + props.w} y2={props.y + props.h / 3} stroke="rgba(255,255,255,0.35)" stroke-width={1 / props.zoom} vector-effect="non-scaling-stroke" style={{ "pointer-events": "none" }} />
        <line x1={props.x} y1={props.y + 2 * props.h / 3} x2={props.x + props.w} y2={props.y + 2 * props.h / 3} stroke="rgba(255,255,255,0.35)" stroke-width={1 / props.zoom} vector-effect="non-scaling-stroke" style={{ "pointer-events": "none" }} />
      </Show>
      <Show when={props.guideMode === "grid"}>
        <GridLines x={props.x} y={props.y} w={props.w} h={props.h} zoom={props.zoom} />
      </Show>
      <Show when={props.guideMode === "diagonal"}>
        <line x1={props.x} y1={props.y} x2={props.x + props.w} y2={props.y + props.h} stroke="rgba(255,255,255,0.3)" stroke-width={1 / props.zoom} vector-effect="non-scaling-stroke" style={{ "pointer-events": "none" }} />
        <line x1={props.x + props.w} y1={props.y} x2={props.x} y2={props.y + props.h} stroke="rgba(255,255,255,0.3)" stroke-width={1 / props.zoom} vector-effect="non-scaling-stroke" style={{ "pointer-events": "none" }} />
      </Show>
      <Show when={props.guideMode === "golden"}>
        <line x1={props.x + props.w * 0.382} y1={props.y} x2={props.x + props.w * 0.382} y2={props.y + props.h} stroke="rgba(255,255,255,0.35)" stroke-width={1 / props.zoom} vector-effect="non-scaling-stroke" style={{ "pointer-events": "none" }} />
        <line x1={props.x + props.w * 0.618} y1={props.y} x2={props.x + props.w * 0.618} y2={props.y + props.h} stroke="rgba(255,255,255,0.35)" stroke-width={1 / props.zoom} vector-effect="non-scaling-stroke" style={{ "pointer-events": "none" }} />
        <line x1={props.x} y1={props.y + props.h * 0.382} x2={props.x + props.w} y2={props.y + props.h * 0.382} stroke="rgba(255,255,255,0.35)" stroke-width={1 / props.zoom} vector-effect="non-scaling-stroke" style={{ "pointer-events": "none" }} />
        <line x1={props.x} y1={props.y + props.h * 0.618} x2={props.x + props.w} y2={props.y + props.h * 0.618} stroke="rgba(255,255,255,0.35)" stroke-width={1 / props.zoom} vector-effect="non-scaling-stroke" style={{ "pointer-events": "none" }} />
      </Show>
    </>
  );
}
