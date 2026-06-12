import { Show, createMemo } from "solid-js";
import { Icon } from "./icons";
import { NumField, EditableNumField } from "./primitives";
import { clsx } from "clsx";
import { useEditor } from "./EditorContext";
import { ToggleBtn, Divider } from "./OptionBarShared";
import { cancelLayerTransformSession, commitLayerTransformSession, resetLayerTransformPreview } from "./transformSession";
import type { Transform2D } from "@/engine/types";

export function TransformOptionBar() {
  const {
    workspace,
    scheduler,
    activeLayerId,
    layerTransformSession,
    setLayerTransformSession,
  } = useEditor();

  const session = () => layerTransformSession();
  const engine = () => workspace.getActiveEngine();

  const activeLayer = () => {
    const current = engine();
    const id = activeLayerId();
    return current && id ? current.getLayer(id) || null : null;
  };

  const isLocked = () => {
    const l = activeLayer();
    return l ? l.locked : false;
  };

  const apply = () => {
    const current = engine();
    const history = workspace.getActiveHistory();
    if (commitLayerTransformSession(session(), current, history)) {
      setLayerTransformSession(null);
      scheduler.requestRender();
    }
  };

  const cancel = () => {
    const current = engine();
    if (cancelLayerTransformSession(session(), current)) {
      setLayerTransformSession(null);
      scheduler.requestRender();
    }
  };

  const resetPreview = () => {
    const current = engine();
    if (resetLayerTransformPreview(session(), current)) {
      scheduler.requestRender();
    }
  };

  const updateTransform = (patch: Partial<Transform2D>) => {
    const current = engine();
    const currentSession = session();
    if (!current || !currentSession) return;
    const layer = current.getLayer(currentSession.layerId);
    if (!layer || layer.locked) return;
    current.transformLayer(currentSession.layerId, { ...layer.transform, ...patch });
    scheduler.requestRender();
  };

  const handlePositionField = (axis: "x" | "y") => (val: number) => {
    updateTransform({ [axis]: val });
  };

  const handleRotateField = (val: number) => {
    updateTransform({ rotation: val });
  };

  const setPreviewWidth = (nextWidth: number) => {
    const current = engine();
    const currentSession = session();
    if (!current || !currentSession) return;
    const layer = current.getLayer(currentSession.layerId);
    if (!layer || layer.locked || layer.width <= 0) return;
    if (!Number.isFinite(nextWidth) || nextWidth <= 0) return;
    const currentSign = Math.sign(layer.transform.scaleX || 1);
    const nextScaleX = currentSign * (nextWidth / layer.width);
    const next: Partial<Transform2D> = { scaleX: nextScaleX };
    if (currentSession.lockRatio && layer.height > 0) {
      const ratioScale = Math.sign(layer.transform.scaleY || 1) * Math.abs(nextScaleX);
      next.scaleY = ratioScale;
    }
    current.transformLayer(currentSession.layerId, next);
    scheduler.requestRender();
  };

  const setPreviewHeight = (nextHeight: number) => {
    const current = engine();
    const currentSession = session();
    if (!current || !currentSession) return;
    const layer = current.getLayer(currentSession.layerId);
    if (!layer || layer.locked || layer.height <= 0) return;
    if (!Number.isFinite(nextHeight) || nextHeight <= 0) return;
    const currentSign = Math.sign(layer.transform.scaleY || 1);
    const nextScaleY = currentSign * (nextHeight / layer.height);
    const next: Partial<Transform2D> = { scaleY: nextScaleY };
    if (currentSession.lockRatio && layer.width > 0) {
      const ratioScale = Math.sign(layer.transform.scaleX || 1) * Math.abs(nextScaleY);
      next.scaleX = ratioScale;
    }
    current.transformLayer(currentSession.layerId, next);
    scheduler.requestRender();
  };

  const setLockRatio = (next: boolean) => {
    const currentSession = session();
    if (!currentSession) return;
    setLayerTransformSession({ ...currentSession, lockRatio: next });
  };

  return (
    <>
      <div class="flex h-[24px] shrink-0 items-center rounded-[3px] border border-editor-accent/20 bg-editor-accent/10 px-2 text-[11px] text-editor-accent font-semibold">
        Transform
      </div>

      <Show when={session()}>
        {(s) => (
          <div class="flex h-[24px] shrink-0 items-center rounded-[3px] border border-editor-field-border bg-editor-field px-2 text-[10px] text-editor-text-dim uppercase font-mono">
            {s().mode}
          </div>
        )}
      </Show>

      <Divider />

      <Show when={activeLayer()}>
        {(layer) => {
          const d = isLocked();
          const curW = () => Math.round(layer().width * Math.abs(layer().transform.scaleX));
          const curH = () => Math.round(layer().height * Math.abs(layer().transform.scaleY));

          return (
            <>
              <div class="flex shrink-0 items-center gap-1">
                <EditableNumField
                  label="X"
                  value={layer().transform.x}
                  disabled={d}
                  onSubmit={handlePositionField("x")}
                  class="w-[62px]"
                />
                <EditableNumField
                  label="Y"
                  value={layer().transform.y}
                  disabled={d}
                  onSubmit={handlePositionField("y")}
                  class="w-[62px]"
                />
              </div>

              <div class="flex shrink-0 items-center gap-1">
                <EditableNumField
                  label="W"
                  value={curW()}
                  disabled={d}
                  onSubmit={setPreviewWidth}
                  class="w-[70px]"
                />
                <EditableNumField
                  label="H"
                  value={curH()}
                  disabled={d}
                  onSubmit={setPreviewHeight}
                  class="w-[70px]"
                />
              </div>

              <EditableNumField
                label="R"
                value={layer().transform.rotation}
                suffix="°"
                disabled={d}
                onSubmit={handleRotateField}
                class="w-[58px]"
              />
            </>
          );
        }}
      </Show>

      <Show when={session()}>
        {(s) => (
          <ToggleBtn
            active={s().lockRatio}
            onChange={setLockRatio}
            icon="link"
            label="Ratio"
          />
        )}
      </Show>

      <Divider />

      <button
        onClick={resetPreview}
        disabled={isLocked()}
        class={clsx(
          "flex h-[24px] shrink-0 items-center rounded-[3px] border border-transparent px-2 text-[11px]",
          isLocked()
            ? "text-editor-text-dim/30 cursor-default"
            : "text-editor-text-dim hover:border-editor-field-border hover:text-editor-text",
        )}
        title="Reset preview transform values"
      >
        Reset Preview
      </button>

      <Divider />

      <button
        type="button"
        class="h-6 px-2.5 rounded-[4px] border border-editor-accent/50 bg-editor-accent/15 text-editor-text text-[11px] font-semibold"
        onClick={apply}
        title="Apply transform (Enter)"
      >
        Apply
      </button>
      <button
        type="button"
        class="h-6 px-2.5 rounded-[4px] border border-editor-border bg-editor-surface-2 text-editor-text-dim text-[11px] font-semibold hover:text-editor-text"
        onClick={cancel}
        title="Cancel transform (Esc)"
      >
        Cancel
      </button>
    </>
  );
}
