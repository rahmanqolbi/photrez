import { useEditor } from "./EditorContext";
import { Icon } from "./icons";
import { PropRow, SelectField } from "./primitives";
import { SectionHeader } from "./SectionHeader";

export function CanvasProperties() {
  const {
    workspace,
    scheduler,
    zoom,
    docWidth,
    docHeight,
    syncViewport,
    viewportWidth,
    viewportHeight,
    setShowResizeDialog,
  } = useEditor();

  const engine = () => workspace.getActiveEngine();
  const w = () => docWidth();
  const h = () => docHeight();

  const handleFitToScreen = () => {
    const e = engine();
    if (!e) return;
    e.fitToScreen(viewportWidth(), viewportHeight());
    syncViewport();
    scheduler.requestRender();
  };

  const handleResizeCanvas = () => {
    setShowResizeDialog(true);
  };

  return (
    <>
      <div class="border-b border-editor-divider px-4 py-3.5">
        <SectionHeader
          icon="image"
          iconClass="text-editor-text-dim"
          label="Canvas"
        />

        <div class="mt-3 flex flex-col gap-2.5">
          <PropRow label="Size">
            <SelectField value={`${w()} × ${h()} px`} class="flex-1" />
          </PropRow>

          <PropRow label="Mode">
            <SelectField value="RGB / 8" class="flex-1" />
          </PropRow>

          <PropRow label="Profile">
            <SelectField value="sRGB IEC61966-2.1" class="flex-1" />
          </PropRow>

          <PropRow label="Zoom">
            <SelectField value={`${Math.round(zoom() * 100)} %`} class="flex-1" />
          </PropRow>
        </div>
      </div>

      <div class="border-b border-editor-divider px-4 py-3.5">
        <SectionHeader
          icon="maximize"
          iconClass="text-editor-text-dim"
          label="Quick Actions"
        />

        <div class="mt-3 flex flex-col gap-2">
          <ActionButton
            icon="maximize"
            label="Fit to Screen"
            onClick={handleFitToScreen}
          />
          <ActionButton
            icon="crop"
            label="Resize Canvas"
            onClick={handleResizeCanvas}
          />
        </div>
      </div>
    </>
  );
}

function ActionButton(props: {
  icon: "maximize" | "crop";
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={props.onClick}
      class="flex h-[30px] items-center gap-2 rounded-[4px] border border-editor-field-border bg-editor-field px-2.5 text-[12px] text-editor-text hover:bg-editor-field-border transition-colors"
    >
      <Icon name={props.icon} class="size-3.5 text-editor-text-dim" strokeWidth={1.75} />
      <span>{props.label}</span>
    </button>
  );
}
