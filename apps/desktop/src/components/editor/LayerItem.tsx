import { Show } from "solid-js";
import { clsx } from "clsx";
import { Icon } from "./icons";
import { LayerNode } from "@/engine/types";
import { LayerThumb } from "./LayerThumb";
import { LAYER_DRAG_MIME, LayerDragPayload } from "./dragTypes";
import { useDragController } from "./DragController";

interface LayerItemProps {
  layer: LayerNode;
  idx: number;
  isActive: boolean;
  isDragged: boolean;
  isDragOver: boolean;
  dropPosition: "above" | "below" | null;
  isEditing: boolean;
  editName: string;
  setEditingLayerId: (id: string | null) => void;
  setEditName: (name: string) => void;
  onSelect: (id: string) => void;
  onPointerDragStart: (e: PointerEvent, idx: number) => void;
  onToggleVisibility: (e: MouseEvent, id: string) => void;
  onToggleLock: (e: MouseEvent, id: string) => void;
  onMoveUp: (e: MouseEvent, idx: number) => void;
  onMoveDown: (e: MouseEvent, idx: number) => void;
  layersLength: number;
  workspace: any;
  scheduler: any;
  activeDocumentId: string;
}

export function LayerItem(props: LayerItemProps) {
  const dragController = useDragController();

  const commitRename = () => {
    const nextName = props.editName.trim();
    if (!nextName || nextName === props.layer.name) {
      props.setEditingLayerId(null);
      return;
    }

    const engine = props.workspace.getActiveEngine();
    if (engine) {
      const history = props.workspace.getActiveHistory();
      history?.commit(engine.snapshot());
      engine.setLayerName(props.layer.id, nextName);
      props.scheduler.requestRender();
    }
    props.setEditingLayerId(null);
  };

  const onLayerDragStart = (e: DragEvent) => {
    if (props.layer.locked) {
      e.preventDefault();
      return;
    }
    const dt = e.dataTransfer;
    if (!dt) return;
    const payload: LayerDragPayload = {
      version: 1,
      sourceDocId: props.activeDocumentId,
      layerId: props.layer.id,
      sourceName: props.layer.name,
      isAltPressed: e.altKey,
    };
    dt.setData(LAYER_DRAG_MIME, JSON.stringify(payload));
    dt.effectAllowed = e.altKey ? "move" : "copy";
    dragController.beginLayerDrag(payload, null);
  };

  const onLayerDragEnd = () => {
    dragController.endDrag();
  };

  return (
    <div
      data-layer-idx={props.idx}
      draggable={!props.layer.locked}
      onDragStart={onLayerDragStart}
      onDragEnd={onLayerDragEnd}
      onClick={() => props.onSelect(props.layer.id)}
      onPointerDown={(e) => !props.layer.locked && props.onPointerDragStart(e, props.idx)}
      class={clsx(
        "flex h-[50px] items-center gap-2.5 px-3.5 cursor-pointer select-none group border-b border-editor-divider/10 relative transition-all duration-100 touch-auto",
        props.isActive ? "bg-editor-row-active" : "hover:bg-white/[0.03]",
        props.isDragged && "opacity-25 bg-editor-divider/10 scale-[0.98] border-dashed border-editor-accent/40",
        props.isDragOver && props.dropPosition === "above" && "before:absolute before:top-0 before:left-0 before:right-0 before:h-[3px] before:bg-editor-accent before:z-20",
        props.isDragOver && props.dropPosition === "below" && "after:absolute after:bottom-0 after:left-0 after:right-0 after:h-[3px] after:bg-editor-accent after:z-20"
      )}
    >
      {/* Eye toggle button */}
      <button
        data-layer-visibility
        onClick={(e) => props.onToggleVisibility(e, props.layer.id)}
        class="text-editor-icon hover:text-editor-text size-6 flex items-center justify-center z-10"
        title={props.layer.visible ? "Hide Layer" : "Show Layer"}
      >
        <Icon
          name="eye"
          class={clsx("size-4 shrink-0", !props.layer.visible && "opacity-30")}
          strokeWidth={1.75}
        />
      </button>

      {/* Layer Thumbnail */}
      <Show
        when={props.layer.type === "adjustment"}
        fallback={
          <LayerThumb layer={props.layer} isActive={props.isActive} />
        }
      >
        {/* Adjustment Layer: Standard Black-and-White circular icon */}
        <div class="size-[34px] shrink-0 rounded-[3px] border border-black/40 bg-black flex items-center justify-center">
          <div
            class="size-[20px] rounded-full border border-white/20"
            style={{
              background: "conic-gradient(#fff 180deg, #222 180deg)",
              transform: "rotate(-45deg)"
            }}
          />
        </div>
      </Show>

      {/* Optional Layer Mask Thumbnail for Mountain layer (Matching high-fidelity mockup) */}
      <Show when={props.layer.name === "Mountain"}>
        <div class="size-[34px] shrink-0 rounded-[3px] border border-black/40 bg-black flex items-center justify-center relative overflow-hidden">
          <div class="absolute inset-[6px] bg-white rounded-full blur-[1px]" />
        </div>
      </Show>

      <Show
        when={props.isEditing}
        fallback={
          <span
            onDblClick={(e: MouseEvent) => {
              if (props.layer.locked) return;
              e.stopPropagation();
              props.setEditingLayerId(props.layer.id);
              props.setEditName(props.layer.name);
            }}
            class="flex-1 text-[12.5px] text-editor-text truncate select-none"
          >
            {props.layer.name}
          </span>
        }
      >
        <input
          type="text"
          value={props.editName}
          onInput={(e) => props.setEditName(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              commitRename();
            } else if (e.key === "Escape") {
              props.setEditingLayerId(null);
            }
          }}
          onClick={(e) => e.stopPropagation()}
          onBlur={commitRename}
          class="flex-1 text-[12.5px] text-editor-text bg-editor-field border border-editor-field-border rounded px-1.5 focus:outline-none focus-visible:border-editor-accent h-[22px] min-w-0"
          ref={(el) => setTimeout(() => el?.focus(), 10)}
        />
      </Show>

      {/* Up and Down Chevrons for Reordering */}
      <div class="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-100 pr-1">
        <button
          disabled={props.idx === 0}
          onClick={(e) => props.onMoveUp(e, props.idx)}
          class="size-[22px] flex items-center justify-center hover:bg-white/10 rounded disabled:opacity-20 disabled:hover:bg-transparent"
          title="Move Layer Up"
        >
          <Icon name="chevron-up" class="size-3.5" />
        </button>
        <button
          disabled={props.idx === props.layersLength - 1}
          onClick={(e) => props.onMoveDown(e, props.idx)}
          class="size-[22px] flex items-center justify-center hover:bg-white/10 rounded disabled:opacity-20 disabled:hover:bg-transparent"
          title="Move Layer Down"
        >
          <Icon name="chevron-down" class="size-3.5" />
        </button>
      </div>

      {/* Lock Indicator */}
      <button
        onClick={(e) => props.onToggleLock(e, props.layer.id)}
        class="text-editor-icon hover:text-editor-text size-6 flex items-center justify-center"
      >
        <Icon
          name={props.layer.locked ? "lock" : "unlock"}
          class="size-3.5 shrink-0"
          strokeWidth={1.75}
        />
      </button>
    </div>
  );
}
