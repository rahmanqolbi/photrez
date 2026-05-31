import { createSignal, createMemo, For, Show, onMount, onCleanup } from "solid-js";
import { useEditor } from "./EditorContext";
import type { Transform2D } from "@/engine/types";

export function SelectionTransformOverlay() {
  const { workspace, activeLayerId, layers, zoom, pan, scheduler } = useEditor();

  const activeLayer = createMemo(() => {
    const id = activeLayerId();
    if (!id) return null;
    return layers().find((l) => l.id === id) || null;
  });

  // Active dragging state
  const [dragState, setDragState] = createSignal<{
    type: string;
    startX: number;
    startY: number;
    startTransform: Transform2D;
    startWidth: number;
    startHeight: number;
  } | null>(null);

  // Screen coordinates bounds calculations
  const left = createMemo(() => {
    const layer = activeLayer();
    if (!layer) return 0;
    return layer.transform.x * zoom() + pan().x;
  });

  const top = createMemo(() => {
    const layer = activeLayer();
    if (!layer) return 0;
    return layer.transform.y * zoom() + pan().y;
  });

  const width = createMemo(() => {
    const layer = activeLayer();
    if (!layer) return 0;
    return layer.width * layer.transform.scaleX * zoom();
  });

  const height = createMemo(() => {
    const layer = activeLayer();
    if (!layer) return 0;
    return layer.height * layer.transform.scaleY * zoom();
  });

  const handles = [
    { type: "tl", cursor: "nwse-resize", style: "left: 0%; top: 0%;" },
    { type: "t", cursor: "ns-resize", style: "left: 50%; top: 0%;" },
    { type: "tr", cursor: "nesw-resize", style: "left: 100%; top: 0%;" },
    { type: "r", cursor: "ew-resize", style: "left: 100%; top: 50%;" },
    { type: "br", cursor: "nwse-resize", style: "left: 100%; top: 100%;" },
    { type: "b", cursor: "ns-resize", style: "left: 50%; top: 100%;" },
    { type: "bl", cursor: "nesw-resize", style: "left: 0%; top: 100%;" },
    { type: "l", cursor: "ew-resize", style: "left: 0%; top: 50%;" },
  ];

  // Pointer event handlers
  const handlePointerDown = (e: PointerEvent, type: string) => {
    e.stopPropagation();
    const engine = workspace.getActiveEngine();
    const history = workspace.getActiveHistory();
    const layer = activeLayer();
    if (!engine || !history || !layer || layer.locked || !layer.visible) return;

    const target = e.currentTarget as HTMLElement;
    target.setPointerCapture(e.pointerId);

    // Commit snapshot to history BEFORE dragging mutations begin
    history.commit(engine.snapshot());

    setDragState({
      type,
      startX: e.clientX,
      startY: e.clientY,
      startTransform: { ...layer.transform },
      startWidth: layer.width,
      startHeight: layer.height,
    });
  };

  const handlePointerMove = (e: PointerEvent) => {
    const drag = dragState();
    if (!drag) return;

    const engine = workspace.getActiveEngine();
    const layer = activeLayer();
    if (!engine || !layer) return;

    const z = zoom();
    const dx = (e.clientX - drag.startX) / z;
    const dy = (e.clientY - drag.startY) / z;

    const newTransform = { ...drag.startTransform };
    const w = drag.startWidth;
    const h = drag.startHeight;

    const startW = w * drag.startTransform.scaleX;
    const startH = h * drag.startTransform.scaleY;

    if (drag.type === "move") {
      newTransform.x = drag.startTransform.x + dx;
      newTransform.y = drag.startTransform.y + dy;
    } else if (drag.type === "r") {
      const nextW = Math.max(5, startW + dx);
      newTransform.scaleX = nextW / w;
    } else if (drag.type === "l") {
      const nextW = Math.max(5, startW - dx);
      newTransform.scaleX = nextW / w;
      newTransform.x = drag.startTransform.x + (startW - nextW);
    } else if (drag.type === "b") {
      const nextH = Math.max(5, startH + dy);
      newTransform.scaleY = nextH / h;
    } else if (drag.type === "t") {
      const nextH = Math.max(5, startH - dy);
      newTransform.scaleY = nextH / h;
      newTransform.y = drag.startTransform.y + (startH - nextH);
    } else if (drag.type === "br" || drag.type === "bl" || drag.type === "tr" || drag.type === "tl") {
      // Proportional aspect-ratio locked scaling when Shift is held
      if (e.shiftKey) {
        const aspect = startW / startH;
        let nextW = startW;
        let nextH = startH;

        if (drag.type === "br") {
          if (Math.abs(dx) > Math.abs(dy)) {
            nextW = Math.max(5, startW + dx);
            nextH = nextW / aspect;
          } else {
            nextH = Math.max(5, startH + dy);
            nextW = nextH * aspect;
          }
          newTransform.scaleX = nextW / w;
          newTransform.scaleY = nextH / h;
        } else if (drag.type === "bl") {
          if (Math.abs(dx) > Math.abs(dy)) {
            nextW = Math.max(5, startW - dx);
            nextH = nextW / aspect;
          } else {
            nextH = Math.max(5, startH + dy);
            nextW = nextH * aspect;
          }
          newTransform.scaleX = nextW / w;
          newTransform.scaleY = nextH / h;
          newTransform.x = drag.startTransform.x + (startW - nextW);
        } else if (drag.type === "tr") {
          if (Math.abs(dx) > Math.abs(dy)) {
            nextW = Math.max(5, startW + dx);
            nextH = nextW / aspect;
          } else {
            nextH = Math.max(5, startH - dy);
            nextW = nextH * aspect;
          }
          newTransform.scaleX = nextW / w;
          newTransform.scaleY = nextH / h;
          newTransform.y = drag.startTransform.y + (startH - nextH);
        } else if (drag.type === "tl") {
          if (Math.abs(dx) > Math.abs(dy)) {
            nextW = Math.max(5, startW - dx);
            nextH = nextW / aspect;
          } else {
            nextH = Math.max(5, startH - dy);
            nextW = nextH * aspect;
          }
          newTransform.scaleX = nextW / w;
          newTransform.scaleY = nextH / h;
          newTransform.x = drag.startTransform.x + (startW - nextW);
          newTransform.y = drag.startTransform.y + (startH - nextH);
        }
      } else {
        // Free scale coordinates
        if (drag.type === "br") {
          const nextW = Math.max(5, startW + dx);
          const nextH = Math.max(5, startH + dy);
          newTransform.scaleX = nextW / w;
          newTransform.scaleY = nextH / h;
        } else if (drag.type === "bl") {
          const nextW = Math.max(5, startW - dx);
          const nextH = Math.max(5, startH + dy);
          newTransform.scaleX = nextW / w;
          newTransform.scaleY = nextH / h;
          newTransform.x = drag.startTransform.x + (startW - nextW);
        } else if (drag.type === "tr") {
          const nextW = Math.max(5, startW + dx);
          const nextH = Math.max(5, startH - dy);
          newTransform.scaleX = nextW / w;
          newTransform.scaleY = nextH / h;
          newTransform.y = drag.startTransform.y + (startH - nextH);
        } else if (drag.type === "tl") {
          const nextW = Math.max(5, startW - dx);
          const nextH = Math.max(5, startH - dy);
          newTransform.scaleX = nextW / w;
          newTransform.scaleY = nextH / h;
          newTransform.x = drag.startTransform.x + (startW - nextW);
          newTransform.y = drag.startTransform.y + (startH - nextH);
        }
      }
    }

    engine.transformLayer(layer.id, newTransform);
    scheduler.requestRender();
  };

  const handlePointerUp = (e: PointerEvent) => {
    const drag = dragState();
    if (!drag) return;

    const target = e.currentTarget as HTMLElement;
    target.releasePointerCapture(e.pointerId);
    setDragState(null);
  };

  // Keyboard shortcut support (Escape cancels drag transformation)
  onMount(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const drag = dragState();
      if (e.key === "Escape" && drag) {
        const engine = workspace.getActiveEngine();
        const layer = activeLayer();
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
    <Show when={activeLayer()}>
      {(layer) => (
        <div
          class="absolute border border-dashed border-[#E15A17] select-none cursor-move z-40"
          style={{
            left: `${left()}px`,
            top: `${top()}px`,
            width: `${width()}px`,
            height: `${height()}px`,
            "box-shadow": "0 0 0 1px rgba(0,0,0,0.5)",
          }}
          onPointerDown={(e) => handlePointerDown(e, "move")}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
        >
          {/* Custom Center Crosshair Indicator */}
          <div class="absolute left-1/2 top-1/2 size-1.5 bg-[#E15A17] rounded-full -translate-x-1/2 -translate-y-1/2 pointer-events-none opacity-80" />

          {/* Interactive Bounding Handles */}
          <For each={handles}>
            {(h) => (
              <div
                class="absolute size-[8px] bg-white border border-[#E15A17] rounded-sm hover:scale-125 hover:bg-[#E15A17] transition-all duration-75 shadow-sm pointer-events-auto z-50"
                style={{
                  ...parseStyleString(h.style),
                  cursor: h.cursor,
                  transform: "translate(-50%, -50%)",
                }}
                onPointerDown={(e) => handlePointerDown(e, h.type)}
                onPointerMove={handlePointerMove}
                onPointerUp={handlePointerUp}
              />
            )}
          </For>
        </div>
      )}
    </Show>
  );
}

// Utility to parse mini style string back to solid compatible styling object
function parseStyleString(styleStr: string): Record<string, string> {
  const obj: Record<string, string> = {};
  const pairs = styleStr.split(";");
  for (const pair of pairs) {
    if (!pair.trim()) continue;
    const [key, val] = pair.split(":");
    if (key && val) {
      obj[key.trim()] = val.trim();
    }
  }
  return obj;
}
