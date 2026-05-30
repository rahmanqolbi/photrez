import { Icon } from "./icons";
import { NumField } from "./primitives";

export function OptionBar() {
  return (
    <div class="flex h-[44px] shrink-0 items-center gap-2.5 overflow-x-auto border-b border-editor-divider bg-editor-toolbar px-3">
      <div class="flex h-[26px] w-[88px] shrink-0 items-center justify-between rounded-[4px] border border-editor-field-border bg-editor-field px-2.5">
        <span class="text-[12px] text-editor-text">Move</span>
        <Icon
          name="chevron-down"
          class="size-3.5 text-editor-text-dim"
          strokeWidth={1.75}
        />
      </div>

      <div class="flex shrink-0 items-center gap-1.5">
        <NumField label="X" value="120 px" class="w-[78px]" />
        <NumField label="Y" value="-35 px" class="w-[78px]" />
      </div>

      <div class="flex shrink-0 items-center gap-1.5">
        <NumField label="W" value="1920 px" class="w-[86px]" />
        <NumField label="H" value="1280 px" class="w-[86px]" />
        <button
          class="flex size-[26px] items-center justify-center rounded-[4px] border border-editor-field-border bg-editor-field text-editor-icon hover:text-editor-text"
          aria-label="Lock ratio"
        >
          <Icon name="link" class="size-3.5" strokeWidth={1.75} />
        </button>
      </div>

      <div class="flex shrink-0 items-center gap-2">
        <span class="text-[12px] text-editor-text-dim">Rotate</span>
        <div class="flex h-[26px] w-[72px] items-center justify-between rounded-[4px] border border-editor-field-border bg-editor-field px-2">
          <span class="text-[12px] text-editor-text">0.00°</span>
          <Icon
            name="chevron-down"
            class="size-3 text-editor-text-dim"
            strokeWidth={1.75}
          />
        </div>
      </div>

      <Divider />

      <div class="flex shrink-0 items-center gap-2 text-editor-icon">
        <span class="text-[12px] text-editor-text-dim">Align</span>
        <button
          class="hover:text-editor-text"
          aria-label="Align vertical center"
        >
          <Icon name="align-v" class="size-[17px]" strokeWidth={1.6} />
        </button>
        <button
          class="hover:text-editor-text"
          aria-label="Align horizontal center"
        >
          <Icon name="align-h" class="size-[17px]" strokeWidth={1.6} />
        </button>
        <button class="hover:text-editor-text" aria-label="Stretch horizontal">
          <Icon name="stretch-h" class="size-[17px]" strokeWidth={1.6} />
        </button>
      </div>

      <Divider />

      <div class="flex shrink-0 items-center gap-2 text-editor-icon">
        <span class="text-[12px] text-editor-text-dim">Flip</span>
        <button class="hover:text-editor-text" aria-label="Flip horizontal">
          <Icon name="flip-h" class="size-[17px]" strokeWidth={1.6} />
        </button>
        <button class="hover:text-editor-text" aria-label="Flip vertical">
          <Icon name="flip-v" class="size-[17px]" strokeWidth={1.6} />
        </button>
      </div>

      <Divider />

      <button class="flex h-[26px] shrink-0 items-center rounded-[4px] border border-editor-field-border bg-editor-field px-3.5 text-[12px] text-editor-text hover:bg-white/5">
        Reset
      </button>
    </div>
  );
}

function Divider() {
  return <div class="h-5 w-px shrink-0 bg-editor-divider" />;
}
