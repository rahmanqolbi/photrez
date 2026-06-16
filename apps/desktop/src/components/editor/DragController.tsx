import { createContext, useContext, createSignal, ParentProps, Show } from "solid-js";
import type { LayerDragPayload, DropTarget } from "./dragTypes";

const HOVER_TAB_DURATION_MS = 500;

export interface DragState {
  dragKind: "layer" | "file" | null;
  payload: LayerDragPayload | null;
  filePaths: string[] | null;
  dragStartPosition: { x: number; y: number } | null;
  dropTarget: DropTarget;
  hoverTabId: string | null;
  cascadeIndex: number;
}

export interface DragController {
  state: () => DragState;
  beginLayerDrag(payload: LayerDragPayload, ghostEl: HTMLElement | null): void;
  beginFileDrag(paths: string[], position: { x: number; y: number }): void;
  endDrag(): void;
  setDropTarget(target: DropTarget): void;
  startTabHover(tabId: string): void;
  cancelTabHover(): void;
  isTabHovering(tabId: string): boolean;
}

export interface WorkspaceLike {
  switchDocument(id: string): void;
}

const DragControllerContext = createContext<DragController>();

export function DragControllerProvider(props: ParentProps<{ workspaceOverride?: WorkspaceLike }>) {
  const workspace = (): WorkspaceLike => {
    if (props.workspaceOverride) return props.workspaceOverride;
    // Lazy import to avoid circular dependency in test contexts
    const editor = requireEditor();
    return editor.workspace as unknown as WorkspaceLike;
  };

  const [state, setState] = createSignal<DragState>({
    dragKind: null,
    payload: null,
    filePaths: null,
    dragStartPosition: null,
    dropTarget: null,
    hoverTabId: null,
    cascadeIndex: 0,
  });

  let hoverTabTimerId: ReturnType<typeof setTimeout> | null = null;
  let cascadeCounter = 0;

  function cancelTabHoverInternal() {
    if (hoverTabTimerId !== null) {
      clearTimeout(hoverTabTimerId);
      hoverTabTimerId = null;
    }
    setState((s) => ({ ...s, hoverTabId: null }));
  }

  const api: DragController = {
    state,
    beginLayerDrag(payload, _ghostEl) {
      setState((s) => ({ ...s, dragKind: "layer", payload, dropTarget: null }));
    },
    beginFileDrag(paths, position) {
      cascadeCounter = 0;
      setState((s) => ({
        ...s,
        dragKind: "file",
        filePaths: paths,
        dragStartPosition: position,
        dropTarget: null,
        cascadeIndex: 0,
      }));
    },
    endDrag() {
      cancelTabHoverInternal();
      setState((s) => ({
        ...s,
        dragKind: null,
        payload: null,
        filePaths: null,
        dropTarget: null,
      }));
    },
    setDropTarget(target) {
      setState((s) => ({ ...s, dropTarget: target }));
    },
    startTabHover(tabId) {
      cancelTabHoverInternal();
      setState((s) => ({ ...s, hoverTabId: tabId }));
      hoverTabTimerId = setTimeout(() => {
        workspace().switchDocument(tabId);
        cancelTabHoverInternal();
      }, HOVER_TAB_DURATION_MS);
    },
    cancelTabHover: cancelTabHoverInternal,
    isTabHovering(tabId) {
      return state().hoverTabId === tabId;
    },
  };

  return (
    <DragControllerContext.Provider value={api}>
      {props.children}
    </DragControllerContext.Provider>
  );
}

export function useDragController(): DragController {
  const ctx = useContext(DragControllerContext);
  if (!ctx) throw new Error("useDragController must be used within DragControllerProvider");
  return ctx;
}

function requireEditor(): { workspace: unknown } {
  // Dynamic import to break circular dep: DragController <-> EditorContext
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const mod = require("./EditorContext");
  return mod.useEditor();
}
