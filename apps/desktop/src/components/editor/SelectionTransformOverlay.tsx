import { Show, For, createMemo } from "solid-js";
import { useEditor } from "./EditorContext";
import type { HudMode } from "./TransformHud";
import type { SnapRect, SnapResult } from "@/viewport/smartGuides";
import { getCursorForHandle } from "@/viewport/transformGeometry";
import { useSelectionTransformDrag } from "./useSelectionTransformDrag";

interface SelectionTransformOverlayProps {
  isNavigationMode?: boolean;
  onHudUpdate?: (hud: {
    mode: HudMode;
    clientX: number;
    clientY: number;
    deltaX: number;
    deltaY: number;
    width: number;
    height: number;
    scalePercent: number;
    angle: number;
    snapActive: boolean;
  } | null) => void;
  onComputeSnap?: (rect: SnapRect) => SnapResult;
  onSnapClear?: () => void;
  onScreenToDoc?: (clientX: number, clientY: number) => { x: number; y: number };
  snapActive?: boolean;
  moveSnapEnabled?: boolean;
}

const HANDLE_SIZE = 8;
const HANDLE_HIT = 20;
const ROTATE_OUTER = 44;
const HANDLE_TYPES = ["nw", "n", "ne", "e", "se", "s", "sw", "w"] as const;

export function getRotatePath(type: string, cx: number, cy: number, ro: number, ri: number): string {
  if (type === "nw") {
    return `M ${cx} ${cy + ro} A ${ro} ${ro} 0 1 1 ${cx + ro} ${cy} L ${cx + ri} ${cy} A ${ri} ${ri} 0 1 0 ${cx} ${cy + ri} Z`;
  }
  if (type === "ne") {
    return `M ${cx - ro} ${cy} A ${ro} ${ro} 0 1 1 ${cx} ${cy + ro} L ${cx} ${cy + ri} A ${ri} ${ri} 0 1 0 ${cx - ri} ${cy} Z`;
  }
  if (type === "se") {
    return `M ${cx} ${cy - ro} A ${ro} ${ro} 0 1 1 ${cx - ro} ${cy} L ${cx - ri} ${cy} A ${ri} ${ri} 0 1 0 ${cx} ${cy - ri} Z`;
  }
  if (type === "sw") {
    return `M ${cx + ro} ${cy} A ${ro} ${ro} 0 1 1 ${cx} ${cy - ro} L ${cx} ${cy - ri} A ${ri} ${ri} 0 1 0 ${cx + ri} ${cy} Z`;
  }
  return "";
}

export function SelectionTransformOverlay(props: SelectionTransformOverlayProps = {}) {
  const { zoom, activeTool, setHoverHandle, setHoverPos, layerTransformSession } = useEditor();

  let overlaySvgRef: SVGSVGElement | undefined;

  const {
    getLayer,
    center,
    rotation,
    scaleX,
    scaleY,
    layerX,
    layerY,
    effW,
    effH,
    resolvedCursor,
    handlePointerMove,
    handlePointerUp,
    handlePointerCancel,
    handleLostPointerCapture,
    handlePointerDown,
  } = useSelectionTransformDrag({
    isNavigationMode: props.isNavigationMode,
    onHudUpdate: props.onHudUpdate,
    onComputeSnap: props.onComputeSnap,
    onSnapClear: props.onSnapClear,
    onScreenToDoc: props.onScreenToDoc,
    snapActive: props.snapActive,
    moveSnapEnabled: props.moveSnapEnabled,
    getSvgRef: () => overlaySvgRef,
  });

  const z = createMemo(() => zoom());

  const hs = () => HANDLE_SIZE / z();
  const ht = () => HANDLE_HIT / z();
  const ro = () => ROTATE_OUTER / z();

  // Helper createMemo from solid-js since we need it locally
  // Wait, let's import createMemo!
  // Yes:
  // import { Show, For, createMemo } from "solid-js";
  // We can just add createMemo to imports.

  return (
    <Show when={getLayer()}>
      {(layer) => (
        <svg
          ref={overlaySvgRef}
          data-overlay-svg
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerCancel}
          onLostPointerCapture={handleLostPointerCapture}
          style={{
            position: "absolute",
            inset: "0",
            width: "100%",
            height: "100%",
            overflow: "visible",
            "pointer-events": props.isNavigationMode || activeTool() === "crop" ? "none" : "auto",
            "z-index": 40,
            cursor: resolvedCursor(),
          }}
        >
          {/* Rotated group for handles and interactions */}
          <g transform={`rotate(${rotation()} ${center().x} ${center().y})`}>
            {/* Rotated bounding box outline */}
            <rect
              x={layerX()}
              y={layerY()}
              width={effW()}
              height={effH()}
              fill="none"
              stroke={layerTransformSession()?.layerId === getLayer()?.id ? "#E15A17" : "rgba(255,255,255,0.72)"}
              stroke-width={1 / z()}
              vector-effect="non-scaling-stroke"
              style={{ "pointer-events": "none" }}
            />
            {/* Center pivot dot */}
            <circle
              cx={center().x}
              cy={center().y}
              r={3 / z()}
              fill="#E15A17"
              vector-effect="non-scaling-stroke"
              style={{ "pointer-events": "none" }}
            />

            {/* Move hit zone — rendered before handles so handles are on top */}
            <rect
              x={layerX()}
              y={layerY()}
              width={effW()}
              height={effH()}
              fill="transparent"
              style={{ "pointer-events": "all" }}
              data-move
              onPointerDown={(e) => handlePointerDown(e, "move")}
              onPointerEnter={() => setHoverHandle("move")}
              onPointerLeave={() => setHoverHandle(null)}
            />

            {/* 8 handles at unrotated edges, in layer-local coords */}
            <For each={HANDLE_TYPES}>
              {(type) => {
                const hx = () => type === "nw" || type === "sw" || type === "w" ? layerX()
                          : type === "ne" || type === "se" || type === "e" ? layerX() + effW()
                          : layerX() + effW() / 2;
                const hy = () => type === "nw" || type === "n" || type === "ne" ? layerY()
                          : type === "sw" || type === "s" || type === "se" ? layerY() + effH()
                          : layerY() + effH() / 2;
                const cursor = () => getCursorForHandle(type, rotation(), scaleX(), scaleY());
                return (
                  <g>
                    {/* Corner rotate zone ring (only for corners) */}
                    <Show when={["nw", "ne", "se", "sw"].includes(type)}>
                      <path
                        d={getRotatePath(type, hx(), hy(), ro(), ht())}
                        fill="transparent"
                        fill-rule="evenodd"
                        style={{ "pointer-events": "all" }}
                        onPointerDown={(e) => handlePointerDown(e, "rotate")}
                        onPointerEnter={(e) => {
                          setHoverPos({ x: e.clientX, y: e.clientY });
                        }}
                        onPointerLeave={() => {
                          setHoverPos(null);
                        }}
                      />
                    </Show>

                    {/* Transparent hit zone for resize */}
                    <rect
                      x={hx() - ht() / 2}
                      y={hy() - ht() / 2}
                      width={ht()}
                      height={ht()}
                      fill="transparent"
                      style={{ "pointer-events": "all" }}
                      data-handle={type}
                      onPointerDown={(e) => handlePointerDown(e, type)}
                      onPointerEnter={() => setHoverHandle(type)}
                      onPointerLeave={() => setHoverHandle(null)}
                    />

                    {/* Visual handle square */}
                    <rect
                      x={hx() - hs() / 2}
                      y={hy() - hs() / 2}
                      width={hs()}
                      height={hs()}
                      fill="white"
                      stroke="#E15A17"
                      stroke-width={1 / z()}
                      vector-effect="non-scaling-stroke"
                      style={{ "pointer-events": "none" }}
                    />
                  </g>
                );
              }}
            </For>
          </g>
        </svg>
      )}
    </Show>
  );
}
