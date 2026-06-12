import { createSignal, onMount, onCleanup, Show } from "solid-js";
import { useEditor } from "./EditorContext";
import { getActivePaintToolSettings } from "./brushToolState";
import { screenToDocument } from "@/viewport/coords";

export function BrushCursorOverlay(props?: {
  forceVisibleForTest?: boolean;
  cursorPosForTest?: { x: number; y: number };
  isAltPressed?: boolean;
}) {
  const {
    workspace,
    activeTool,
    zoom,
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

  const radius = () => settings().size / 2;

  onMount(() => {
    let containerEl: HTMLElement | null = null;

    const handleMove = (e: PointerEvent) => {
      if (!isBrushTool() && !props?.forceVisibleForTest) {
        setVisible(false);
        return;
      }
      if (props?.cursorPosForTest) return;
      if (!containerEl) {
        containerEl = document.querySelector("[data-viewport-container]");
        if (!containerEl) return;
      }
      const rect = containerEl.getBoundingClientRect();
      const engine = workspace.getActiveEngine();
      if (!engine) return;
      const doc = screenToDocument(e.clientX, e.clientY, rect, engine.getViewport());
      setCursorPos({ x: doc.x, y: doc.y });
      setVisible(true);
    };
    const handleLeave = () => {
      if (!props?.forceVisibleForTest) setVisible(false);
    };
    window.addEventListener("pointermove", handleMove);
    window.addEventListener("pointerleave", handleLeave);
    onCleanup(() => {
      window.removeEventListener("pointermove", handleMove);
      window.removeEventListener("pointerleave", handleLeave);
    });
  });

  const show = () => props?.forceVisibleForTest || (isBrushTool() && visible() && !props?.isAltPressed);
  const pos = () => props?.cursorPosForTest || cursorPos();

  return (
    <Show when={show()}>
      <g
        transform={`translate(${pos().x}, ${pos().y})`}
        pointer-events="none"
      >
        <circle
          cx={0}
          cy={0}
          r={radius()}
          fill="none"
          stroke="rgba(0,0,0,0.4)"
          stroke-width={2 / zoom()}
        />
        <circle
          data-paint-cursor-outer
          cx={0}
          cy={0}
          r={radius()}
          fill="none"
          stroke="white"
          stroke-width={1 / zoom()}
        />
        <line x1={-4 / zoom()} y1={0} x2={4 / zoom()} y2={0} stroke="white" stroke-width={1 / zoom()} />
        <line x1={0} y1={-4 / zoom()} x2={0} y2={4 / zoom()} stroke="white" stroke-width={1 / zoom()} />
      </g>
    </Show>
  );
}
