import { createSignal, onMount, onCleanup, Show } from "solid-js";
import { useEditor } from "./EditorContext";

export function BrushCursorOverlay() {
  const { activeTool, zoom } = useEditor();
  const [cursorPos, setCursorPos] = createSignal({ x: 0, y: 0 });
  const [visible, setVisible] = createSignal(false);
  const isBrushTool = () => activeTool() === "brush" || activeTool() === "eraser";

  onMount(() => {
    const handleMove = (e: PointerEvent) => {
      if (!isBrushTool()) {
        setVisible(false);
        return;
      }
      const target = document.querySelector("[data-editor-container]");
      if (!target) return;
      const rect = target.getBoundingClientRect();
      setCursorPos({ x: e.clientX - rect.left, y: e.clientY - rect.top });
      setVisible(true);
    };
    const handleLeave = () => setVisible(false);
    window.addEventListener("pointermove", handleMove);
    window.addEventListener("pointerleave", handleLeave);
    onCleanup(() => {
      window.removeEventListener("pointermove", handleMove);
      window.removeEventListener("pointerleave", handleLeave);
    });
  });

  return (
    <Show when={isBrushTool() && visible()}>
      <g
        transform={`translate(${cursorPos().x}, ${cursorPos().y})`}
        pointer-events="none"
      >
        <circle
          cx={0}
          cy={0}
          r={20 / zoom()}
          fill="none"
          stroke="rgba(0,0,0,0.4)"
          stroke-width={2 / zoom()}
        />
        <circle
          cx={0}
          cy={0}
          r={20 / zoom()}
          fill="none"
          stroke="white"
          stroke-width={1 / zoom()}
        />
        <line
          x1={-4 / zoom()}
          y1={0}
          x2={4 / zoom()}
          y2={0}
          stroke="white"
          stroke-width={1 / zoom()}
        />
        <line
          x1={0}
          y1={-4 / zoom()}
          x2={0}
          y2={4 / zoom()}
          stroke="white"
          stroke-width={1 / zoom()}
        />
      </g>
    </Show>
  );
}
