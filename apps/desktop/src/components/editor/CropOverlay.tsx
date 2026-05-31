import { Show } from "solid-js";

interface CropOverlayProps {
  cropRect: { x: number; y: number; w: number; h: number } | null;
  guideMode: "none" | "thirds" | "grid" | "diagonal" | "golden";
  canvasWidth: number;
  canvasHeight: number;
}

export function CropOverlay(props: CropOverlayProps) {
  return (
    <Show when={props.cropRect}>
      {(rect) => {
        const r = rect();
        return (
          <>
            <rect x={0} y={0} width={props.canvasWidth} height={props.canvasHeight} fill="rgba(0,0,0,0.5)" />
            <rect x={r.x} y={r.y} width={r.w} height={r.h} fill="none" stroke="white" stroke-width={1} vector-effect="non-scaling-stroke" />
            <Show when={props.guideMode === "thirds"}>
              <line x1={r.x + r.w / 3} y1={r.y} x2={r.x + r.w / 3} y2={r.y + r.h} stroke="rgba(255,255,255,0.35)" stroke-width={1} vector-effect="non-scaling-stroke" />
              <line x1={r.x + (2 * r.w) / 3} y1={r.y} x2={r.x + (2 * r.w) / 3} y2={r.y + r.h} stroke="rgba(255,255,255,0.35)" stroke-width={1} vector-effect="non-scaling-stroke" />
              <line x1={r.x} y1={r.y + r.h / 3} x2={r.x + r.w} y2={r.y + r.h / 3} stroke="rgba(255,255,255,0.35)" stroke-width={1} vector-effect="non-scaling-stroke" />
              <line x1={r.x} y1={r.y + (2 * r.h) / 3} x2={r.x + r.w} y2={r.y + (2 * r.h) / 3} stroke="rgba(255,255,255,0.35)" stroke-width={1} vector-effect="non-scaling-stroke" />
            </Show>
          </>
        );
      }}
    </Show>
  );
}
