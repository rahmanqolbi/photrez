import type { JSX } from "solid-js";
import { Icon, type IconName } from "../icons";

interface SectionHeaderProps {
  icon: IconName;
  iconClass: string;
  label: string;
  trailing?: JSX.Element;
}

export function SectionHeader(props: SectionHeaderProps) {
  return (
    <div class="flex items-center justify-between">
      <div class="flex items-center gap-2">
        <span class="flex size-4 items-center justify-center">
          <Icon
            name={props.icon}
            class={`size-[15px] ${props.iconClass}`}
            strokeWidth={1.75}
          />
        </span>
        <span class="text-[12.5px] font-medium text-editor-text">
          {props.label}
        </span>
      </div>
      {props.trailing}
    </div>
  );
}
