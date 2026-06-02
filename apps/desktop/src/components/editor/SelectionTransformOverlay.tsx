import { createSignal, createMemo, Show, For, onMount, onCleanup } from "solid-js";
import { useEditor } from "./EditorContext";
import type { Transform2D } from "@/engine/types";
import type { HudMode } from "./TransformHud";
import {
  getLayerCorners,
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
}

const HANDLE_SIZE = 8;
const HANDLE_HIT = 20;
const ROTATE_OUTER = 24;

export function SelectionTransformOverlay(props: SelectionTransformOverlayProps = {}) {
  const { workspace, activeLayerId, layers, zoom, scheduler, setHoverHandle } = useEditor();

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

    const target = e.currentTarget as HTMLElement;
    target.setPointerCapture(e.pointerId);

    history.commit(engine.snapshot());

    setDragState({
      type,
      startX: e.clientX,
      startY: e.clientY,
      startTransform: { ...layer.transform },
    });
  };

  const handlePointerMove = (e: PointerEvent) => {
    const drag = dragState();
    if (!drag) return;

    const engine = workspace.getActiveEngine();
    const layer = getLayer();
    if (!engine || !layer) return;

    const z = zoom();
    const dx = (e.clientX - drag.startX) / z;
    const dy = (e.clientY - drag.startY) / z;

    const cent = getLayerCenter(drag.startTransform, layer.width, layer.height);

    if (drag.type === "move") {
      engine.transformLayer(layer.id, {
        x: drag.startTransform.x + dx,
        y: drag.startTransform.y + dy,
      });
      props.onHudUpdate?.({
        mode: "move" as HudMode,
        clientX: e.clientX,
        clientY: e.clientY,
        deltaX: dx,
        deltaY: dy,
        width: 0, height: 0, scalePercent: 0, angle: 0, snapActive: false,
      });
    } else if (drag.type === "rotate") {
      const newRot = applyRotationDrag(
        cent,
        { x: drag.startX / z, y: drag.startY / z },
        { x: e.clientX / z, y: e.clientY / z },
        drag.startTransform.rotation,
        e.shiftKey
      );
      engine.transformLayer(layer.id, { rotation: newRot });
      props.onHudUpdate?.({
        mode: "rotate" as HudMode,
        clientX: e.clientX,
        clientY: e.clientY,
        angle: newRot - drag.startTransform.rotation,
        deltaX: 0, deltaY: 0, width: 0, height: 0, scalePercent: 0, snapActive: false,
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
        mode: "resize" as HudMode,
        clientX: e.clientX,
        clientY: e.clientY,
        width: effW,
        height: effH,
        scalePercent: Math.abs(newTransform.scaleX) * 100,
        deltaX: 0, deltaY: 0, angle: 0, snapActive: false,
      });
    }
    scheduler.requestRender();
  };

  const handlePointerUp = (e: PointerEvent) => {
    const drag = dragState();
    if (!drag) return;
    const target = e.currentTarget as HTMLElement;
    target.releasePointerCapture(e.pointerId);
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

            {/* 8 handles at unrotated edges, in layer-local coords */}
            <For each={[
              { type: "nw", x: layerX(), y: layerY() },
              { type: "n", x: layerX() + effW() / 2, y: layerY() },
              { type: "ne", x: layerX() + effW(), y: layerY() },
              { type: "e", x: layerX() + effW(), y: layerY() + effH() / 2 },
              { type: "se", x: layerX() + effW(), y: layerY() + effH() },
              { type: "s", x: layerX() + effW() / 2, y: layerY() + effH() },
              { type: "sw", x: layerX(), y: layerY() + effH() },
              { type: "w", x: layerX(), y: layerY() + effH() / 2 },
            ]}>
              {(h) => {
                const cursor = getCursorForHandle(h.type, rotation(), scaleX(), scaleY());
                return (
                  <g>
                    {/* Corner rotate zone ring (only for corners) */}
                    <Show when={["nw", "ne", "se", "sw"].includes(h.type)}>
                      <path
                        d={`M ${h.x} ${h.y - ro()} 
                            A ${ro()} ${ro()} 0 1 1 ${h.x} ${h.y + ro()} 
                            A ${ro()} ${ro()} 0 1 1 ${h.x} ${h.y - ro()} Z
                            M ${h.x} ${h.y - ht()} 
                            A ${ht()} ${ht()} 0 1 0 ${h.x} ${h.y + ht()} 
                            A ${ht()} ${ht()} 0 1 0 ${h.x} ${h.y - ht()} Z`}
                        fill="transparent"
                        fill-rule="evenodd"
                        style={{ cursor: "crosshair", "pointer-events": "all" }}
                        onPointerDown={(e) => handlePointerDown(e, "rotate")}
                        onPointerMove={handlePointerMove}
                        onPointerUp={handlePointerUp}
                        onPointerEnter={() => setHoverHandle("rotate")}
                        onPointerLeave={() => setHoverHandle(null)}
                      />
                    </Show>

                    {/* Transparent hit zone for resize */}
                    <rect
                      x={h.x - ht() / 2}
                      y={h.y - ht() / 2}
                      width={ht()}
                      height={ht()}
                      fill="transparent"
                      style={{ cursor, "pointer-events": "all" }}
                      onPointerDown={(e) => handlePointerDown(e, h.type)}
                      onPointerMove={handlePointerMove}
                      onPointerUp={handlePointerUp}
                      onPointerEnter={() => setHoverHandle(h.type)}
                      onPointerLeave={() => setHoverHandle(null)}
                    />

                    {/* Visual handle square */}
                    <rect
                      x={h.x - hs() / 2}
                      y={h.y - hs() / 2}
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

            {/* Move hit zone — unrotated rect, visually covers rotated layer */}
            <rect
              x={layerX()}
              y={layerY()}
              width={effW()}
              height={effH()}
              fill="transparent"
              style={{ cursor: "move", "pointer-events": "all" }}
              onPointerDown={(e) => handlePointerDown(e, "move")}
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerUp}
              onPointerEnter={() => setHoverHandle("move")}
              onPointerLeave={() => setHoverHandle(null)}
            />
          </g>
        </svg>
      )}
    </Show>
  );
}
