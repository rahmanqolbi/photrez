import { Show } from "solid-js";
import { clsx } from "clsx";
import { Icon } from "./icons";
import { LayerNode, DocumentModel } from "@/engine/types";
import { LayerThumb } from "./LayerThumb";
import { LAYER_DRAG_MIME, LayerDragPayload } from "./dragTypes";
import { useDragController } from "./DragController";

// ponytail: narrow façade for the workspace/scheduler surface LayerItem
// actually touches. Avoids the production `any` while staying decoupled
// from the full WorkspaceManager/Scheduler types — LayerItem only needs
// the read-and-request paths, not the document lifecycle.
interface LayerItemWorkspaceFacade {
  getActiveEngine: () => {
    snapshot: () => DocumentModel;
    setLayerName: (id: string, name: string) => void;
  } | null;
  getActiveHistory: () => {
    commit: (snapshot: DocumentModel, label?: string) => void;
  } | null;
}

interface LayerItemSchedulerFacade {
  requestRender: () => void;
}

interface LayerItemProps {
  layer: LayerNode;
  idx: number;
  isActive: boolean;
  isEditing: boolean;
  editName: string;
  setEditingLayerId: (id: string | null) => void;
  setEditName: (name: string) => void;
  onSelect: (id: string) => void;
  onContextMenu?: (event: MouseEvent, layer: LayerNode, idx: number) => void;
  onToggleVisibility: (e: MouseEvent, id: string) => void;
  onToggleLock: (e: MouseEvent, id: string) => void;
  onMoveUp: (e: MouseEvent, idx: number) => void;
  onMoveDown: (e: MouseEvent, idx: number) => void;
  layersLength: number;
  workspace: LayerItemWorkspaceFacade;
  scheduler: LayerItemSchedulerFacade;
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
      history?.commit(engine.snapshot(), "Rename Layer");
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
    // ponytail: tell the browser the drag is a "move" operation.
    // Cross-doc drop creates a copy + (optionally with Alt) deletes
    // the source; same-doc drop reorders. Both are semantically
    // moves of the layer to a new position, not user-visible copies,
    // so the cursor should match the user's mental model.
    dt.effectAllowed = "move";
    dragController.beginLayerDrag(payload, null);
  };

  const onLayerDragEnd = () => {
    dragController.endDrag();
  };

  // ponytail: bind visual state directly to dragController so the
  // "drag ended" signal is unambiguous. `dragController.endDrag()` is
  // the only path that clears `dragKind`, so the source layer's
  // "being dragged" highlight disappears at the same instant the
  // drop or cancel completes — no parallel signal system to drift.
  const isThisLayerBeingDragged = () => {
    const state = dragController.state();
    if (state.dragKind !== "layer") return false;
    const payload = state.payload;
    return payload !== null && payload.layerId === props.layer.id;
  };

  // ponytail: insertion-bar highlight is also driven by dragController
  // state. The panel-level `dragover` handler keeps `dropTarget` in sync
  // with the pointer position so this accessor stays reactive without
  // any per-row subscription.
  const dropPositionForThisRow = () => {
    const state = dragController.state();
    if (state.dragKind !== "layer") return null;
    const target = state.dropTarget;
    if (!target || target.type !== "layers-panel") return null;
    if (target.insertAt !== props.idx) return null;
    return target.insertPosition ?? "above";
  };

  return (
    <div
      data-layer-idx={props.idx}
      draggable={!props.layer.locked}
      onDragStart={onLayerDragStart}
      onDragEnd={onLayerDragEnd}
      onClick={() => props.onSelect(props.layer.id)}
      onContextMenu={(event) => props.onContextMenu?.(event, props.layer, props.idx)}
      class={clsx(
        "flex h-[50px] items-center gap-2.5 px-3.5 cursor-grab select-none group border-b border-editor-divider/10 relative transition-all duration-100 touch-auto active:cursor-grabbing",
        props.isActive ? "bg-editor-row-active" : "hover:bg-white/[0.03]",
        // Source layer being dragged: dimmed + amber ring + subtle scale.
        isThisLayerBeingDragged() && "opacity-40 ring-2 ring-editor-accent/60 ring-inset scale-[0.98] border-dashed border-editor-accent/50 bg-editor-divider/20",
        // Drop insertion bar above this row.
        dropPositionForThisRow() === "above" && "before:absolute before:top-[-2px] before:left-0 before:right-0 before:h-[4px] before:bg-editor-accent before:shadow-[0_0_8px_rgba(225,90,23,0.6)] before:z-20 before:rounded-full",
        // Drop insertion bar below this row.
        dropPositionForThisRow() === "below" && "after:absolute after:bottom-[-2px] after:left-0 after:right-0 after:h-[4px] after:bg-editor-accent after:shadow-[0_0_8px_rgba(225,90,23,0.6)] after:z-20 after:rounded-full"
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

      {/* Adjustments Indicator */}
      <Show when={props.layer.hasAdjustments}>
        <div
          class="text-editor-accent size-6 flex items-center justify-center mr-1"
          title="Layer has basic adjustments (brightness/contrast/saturation) applied"
        >
          <Icon name="sliders" class="size-3.5 shrink-0" strokeWidth={1.75} />
        </div>
      </Show>

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