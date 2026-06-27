import { createSignal, onMount, onCleanup, Show, createEffect, createMemo } from "solid-js";
import { useEditor } from "./shell/EditorContext";
import { getActivePaintToolSettings } from "./brushToolState";
import { getBrushCursorRadiusScale } from "./brushHardnessProfile";

export function BrushCursorOverlay(props?: {
  forceVisibleForTest?: boolean;
  cursorPosForTest?: { x: number; y: number };
  isAltPressed?: boolean;
  isPanning?: boolean;
}) {
  const {
    workspace,
    activeTool,
    zoom,
    pan,
    camera,
    brushSize,
    brushHardness,
    brushOpacity,
    eraserSize,
    eraserHardness,
    eraserOpacity,
  } = useEditor();

  const [cursorPos, setCursorPos] = createSignal({ x: 0, y: 0 });
  const [visible, setVisible] = createSignal(false);
  const isBrushTool = () => activeTool() === "brush" || activeTool() === "eraser";

  const settings = () => getActivePaintToolSettings(activeTool(), {
    brushSize: brushSize(),
    brushHardness: brushHardness(),
    brushOpacity: brushOpacity(),
    brushFlow: 1,
    brushSmoothing: 0,
    eraserSize: eraserSize(),
    eraserHardness: eraserHardness(),
    eraserOpacity: eraserOpacity(),
    eraserFlow: 1,
    eraserSmoothing: 0,
  });

  const radius = () => {
    const activeSettings = settings();
    return (activeSettings.size / 2)
      * getBrushCursorRadiusScale(activeSettings.hardness)
      * zoom();
  };

  let lastClientX = 0;
  let lastClientY = 0;
  let hasValidPosition = false;
  let containerEl: HTMLElement | null = null;

  const updatePosition = () => {
    if (!isBrushTool() && !props?.forceVisibleForTest) {
      setVisible(false);
      return;
    }
    if (props?.cursorPosForTest) return;
    if (!hasValidPosition) return;
    if (!containerEl) {
      containerEl = document.querySelector("[data-viewport-container]");
      if (!containerEl) return;
    }
    const rect = containerEl.getBoundingClientRect();
    const doc = camera.screenToDocument(lastClientX - rect.left, lastClientY - rect.top);
    setCursorPos({ x: doc.x, y: doc.y });
    setVisible(true);
  };

  // React to zoom and pan changes automatically to update document-space mouse coordinate
  createEffect(() => {
    zoom();
    if (typeof pan === "function") {
      pan();
    }
    updatePosition();
  });

  onMount(() => {
    const handleMove = (e: PointerEvent) => {
      lastClientX = e.clientX;
      lastClientY = e.clientY;
      hasValidPosition = true;
      updatePosition();
    };
    const handleLeave = () => {
      hasValidPosition = false;
      if (!props?.forceVisibleForTest) setVisible(false);
    };
    window.addEventListener("pointermove", handleMove);
    // ponytail: `pointerleave` does not fire on `window` — that event only
    // applies to elements. The previous listener was a no-op and let the
    // brush ring stay painted at the last cursor position when the user
    // moved outside the window. `mouseleave` is the matching window-level
    // event for cursor-out-of-window.
    window.addEventListener("mouseleave", handleLeave);
    onCleanup(() => {
      window.removeEventListener("pointermove", handleMove);
      window.removeEventListener("mouseleave", handleLeave);
    });
  });

  const show = () => props?.forceVisibleForTest || (isBrushTool() && visible() && !props?.isAltPressed && !props?.isPanning);

  const screenPos = createMemo(() => {
    const docPos = props?.cursorPosForTest || cursorPos();
    const z = zoom();
    const p = typeof pan === "function" ? pan() : { x: 0, y: 0 };
    return { x: docPos.x * z + p.x, y: docPos.y * z + p.y };
  });

  return (
    <Show when={show()}>
      <g
        transform={`translate(${screenPos().x}, ${screenPos().y})`}
        pointer-events="none"
      >
        <circle
          cx={0}
          cy={0}
          r={radius()}
          fill="none"
          stroke="rgba(0,0,0,0.5)"
          stroke-width={1.5}
        />
        <circle
          data-paint-cursor-outer
          cx={0}
          cy={0}
          r={radius()}
          fill="none"
          stroke="white"
          stroke-width={1}
        />
        <line x1={-4} y1={0} x2={4} y2={0} stroke="white" stroke-width={1} />
        <line x1={0} y1={-4} x2={0} y2={4} stroke="white" stroke-width={1} />
      </g>
    </Show>
  );
}
