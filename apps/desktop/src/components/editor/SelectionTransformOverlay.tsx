import { createSignal, createMemo, Show, For, onMount, onCleanup } from "solid-js";
import { useEditor } from "./EditorContext";
import type { Transform2D } from "@/engine/types";
import type { HudMode } from "./TransformHud";
import type { SnapRect, SnapResult } from "@/viewport/smartGuides";
import {
  getLayerCenter,
  getLayerAabb,
  getCursorForHandle,
  applyResizeHandle,
  applyRotationDrag,
} from "@/viewport/transformGeometry";

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
const ROTATE_OUTER = 24;
const HANDLE_TYPES = ["nw", "n", "ne", "e", "se", "s", "sw", "w"] as const;

export function SelectionTransformOverlay(props: SelectionTransformOverlayProps = {}) {
  const { workspace, activeLayerId, layers, zoom, scheduler, setHoverHandle, moveSnapEnabled } = useEditor();

  let overlaySvgRef: SVGSVGElement | undefined;

  const activeLayer = createMemo(() => {
    const id = activeLayerId();
    if (!id) return null;
    return layers().find((l) => l.id === id) || null;
  });

  const [dragState, setDragState] = createSignal<{
    type: string;
    startX: number;
    startY: number;
    startTransform: Transform2D;
    pointerId: number;
  } | null>(null);

  const getLayer = () => {
    const layer = activeLayer();
    if (!layer || !layer.visible || layer.locked) return null;
    return layer;
  };

  const center = createMemo(() => {
    const layer = getLayer();
    if (!layer) return { x: 0, y: 0 };
    return getLayerCenter(layer.transform, layer.width, layer.height);
  });

  const aabb = createMemo(() => {
    const layer = getLayer();
    if (!layer) return null;
    return getLayerAabb(layer.transform, layer.width, layer.height);
  });

  const rotation = createMemo(() => {
    const layer = getLayer();
    return layer ? layer.transform.rotation : 0;
  });

  const z = createMemo(() => zoom());

  const hs = () => HANDLE_SIZE / z();
  const ht = () => HANDLE_HIT / z();
  const ro = () => ROTATE_OUTER / z();

  const scaleX = createMemo(() => {
    const layer = getLayer();
    return layer ? layer.transform.scaleX : 1;
  });

  const scaleY = createMemo(() => {
    const layer = getLayer();
    return layer ? layer.transform.scaleY : 1;
  });

  const layerX = createMemo(() => {
    const layer = getLayer();
    return layer ? layer.transform.x : 0;
  });

  const layerY = createMemo(() => {
    const layer = getLayer();
    return layer ? layer.transform.y : 0;
  });

  const effW = createMemo(() => {
    const layer = getLayer();
    return layer ? layer.width * Math.abs(scaleX()) : 0;
  });

  const effH = createMemo(() => {
    const layer = getLayer();
    return layer ? layer.height * Math.abs(scaleY()) : 0;
  });

  const handlePointerDown = (e: PointerEvent, type: string) => {
    if (props.isNavigationMode) return;
    e.stopPropagation();
    const engine = workspace.getActiveEngine();
    const history = workspace.getActiveHistory();
    const layer = getLayer();
    if (!engine || !history || !layer) return;

    // Capture on stable root SVG — handle elements can be replaced during
    // re-render (triggered by transformLayer → syncState), which would lose
    // the pointer capture and prevent subsequent pointermove/pointerup events.
    if (overlaySvgRef) {
      overlaySvgRef.setPointerCapture(e.pointerId);
    }

    history.commit(engine.snapshot());

    setDragState({
      type,
      startX: e.clientX,
      startY: e.clientY,
      startTransform: { ...layer.transform },
      pointerId: e.pointerId,
    });
  };

  const handlePointerMove = (e: PointerEvent) => {
    const drag = dragState();
    if (!drag || e.pointerId !== drag.pointerId) return;

    const engine = workspace.getActiveEngine();
    const layer = getLayer();
    if (!engine || !layer) return;

    const z = zoom();
    const dx = (e.clientX - drag.startX) / z;
    const dy = (e.clientY - drag.startY) / z;

    const cent = getLayerCenter(drag.startTransform, layer.width, layer.height);

    if (drag.type === "move") {
      let nextX = drag.startTransform.x + dx;
      let nextY = drag.startTransform.y + dy;
      let snapActive = false;
      const snapEnabled = props.moveSnapEnabled ?? moveSnapEnabled();
      if (!e.altKey && snapEnabled && props.onComputeSnap) {
        const aabb = getLayerAabb(drag.startTransform, layer.width, layer.height);
        const baseX = aabb.x;
        const baseY = aabb.y;
        const snap = props.onComputeSnap({
          x: baseX + (nextX - drag.startTransform.x),
          y: baseY + (nextY - drag.startTransform.y),
          w: aabb.width,
          h: aabb.height,
        });
        nextX += snap.dx;
        nextY += snap.dy;
        snapActive = snap.lines.length > 0;
      } else {
        props.onSnapClear?.();
      }
      engine.transformLayer(layer.id, { x: nextX, y: nextY });
      props.onHudUpdate?.({
        mode: "move",
        clientX: e.clientX,
        clientY: e.clientY,
        deltaX: nextX - drag.startTransform.x,
        deltaY: nextY - drag.startTransform.y,
        width: 0, height: 0, scalePercent: 0, angle: 0, snapActive,
      });
    } else if (drag.type === "rotate") {
      const toDoc = props.onScreenToDoc ?? ((cx, cy) => ({ x: cx / z, y: cy / z }));
      const startDoc = toDoc(drag.startX, drag.startY);
      const currDoc = toDoc(e.clientX, e.clientY);
      const newRot = applyRotationDrag(
        cent,
        startDoc,
        currDoc,
        drag.startTransform.rotation,
        e.shiftKey
      );
      engine.transformLayer(layer.id, { rotation: newRot });
      props.onHudUpdate?.({
        mode: "rotate",
        clientX: e.clientX,
        clientY: e.clientY,
        angle: newRot - drag.startTransform.rotation,
        deltaX: 0, deltaY: 0, width: 0, height: 0, scalePercent: 0, snapActive: props.snapActive ?? false,
      });
    } else {
      const newTransform = applyResizeHandle(
        drag.startTransform,
        layer.width,
        layer.height,
        drag.type,
        dx,
        dy,
        e.shiftKey,
        e.altKey
      );
      engine.transformLayer(layer.id, newTransform);
      const effW = layer.width * Math.abs(newTransform.scaleX);
      const effH = layer.height * Math.abs(newTransform.scaleY);
      props.onHudUpdate?.({
        mode: "resize",
        clientX: e.clientX,
        clientY: e.clientY,
        width: effW,
        height: effH,
        scalePercent: Math.abs(newTransform.scaleX) * 100,
        deltaX: 0, deltaY: 0, angle: 0, snapActive: props.snapActive ?? false,
      });
    }
    scheduler.requestRender();
  };

  const handlePointerUp = (e: PointerEvent) => {
    const drag = dragState();
    if (!drag || e.pointerId !== drag.pointerId) return;
    if (overlaySvgRef) {
      try { overlaySvgRef.releasePointerCapture(e.pointerId); } catch {}
    }
    props.onSnapClear?.();
    props.onHudUpdate?.(null);
    setDragState(null);
  };

  const handlePointerCancel = (e: PointerEvent) => {
    const drag = dragState();
    if (!drag || e.pointerId !== drag.pointerId) return;
    if (overlaySvgRef) {
      try { overlaySvgRef.releasePointerCapture(e.pointerId); } catch {}
    }
    props.onSnapClear?.();
    props.onHudUpdate?.(null);
    setDragState(null);
  };

  const handleLostPointerCapture = (e: PointerEvent) => {
    const drag = dragState();
    if (!drag || e.pointerId !== drag.pointerId) return;
    props.onSnapClear?.();
    props.onHudUpdate?.(null);
    setDragState(null);
  };

  onMount(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const drag = dragState();
      if (e.key === "Escape" && drag) {
        const engine = workspace.getActiveEngine();
        const layer = getLayer();
        if (engine && layer) {
          engine.transformLayer(layer.id, drag.startTransform);
          scheduler.requestRender();
        }
        if (overlaySvgRef) {
          try { overlaySvgRef.releasePointerCapture(drag.pointerId); } catch {}
        }
        props.onSnapClear?.();
        props.onHudUpdate?.(null);
        setDragState(null);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    onCleanup(() => {
      window.removeEventListener("keydown", handleKeyDown);
    });
  });

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
            "pointer-events": props.isNavigationMode ? "none" : "auto",
            "z-index": 40,
          }}
        >
          {/* Axis-aligned bounding box stroke (outside rotated group) */}
          <Show when={aabb()}>
            {(box) => (
              <rect
                x={box().x}
                y={box().y}
                width={box().width}
                height={box().height}
                fill="none"
                stroke="#E15A17"
                stroke-width={1 / z()}
                vector-effect="non-scaling-stroke"
                style={{ "pointer-events": "none" }}
              />
            )}
          </Show>

            {/* Rotated group for handles and interactions */}
            <g transform={`rotate(${rotation()} ${center().x} ${center().y})`}>
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
                style={{ cursor: "move", "pointer-events": "all" }}
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
                        d={`M ${hx()} ${hy() - ro()} 
                            A ${ro()} ${ro()} 0 1 1 ${hx()} ${hy() + ro()} 
                            A ${ro()} ${ro()} 0 1 1 ${hx()} ${hy() - ro()} Z
                            M ${hx()} ${hy() - ht()} 
                            A ${ht()} ${ht()} 0 1 0 ${hx()} ${hy() + ht()} 
                            A ${ht()} ${ht()} 0 1 0 ${hx()} ${hy() - ht()} Z`}
                        fill="transparent"
                        fill-rule="evenodd"
                        style={{ cursor: "crosshair", "pointer-events": "all" }}
                        onPointerDown={(e) => handlePointerDown(e, "rotate")}
                        onPointerEnter={() => setHoverHandle("rotate")}
                        onPointerLeave={() => setHoverHandle(null)}
                      />
                    </Show>

                    {/* Transparent hit zone for resize */}
                    <rect
                      x={hx() - ht() / 2}
                      y={hy() - ht() / 2}
                      width={ht()}
                      height={ht()}
                      fill="transparent"
                      style={{ cursor: cursor(), "pointer-events": "all" }}
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
