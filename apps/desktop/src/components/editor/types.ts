import type { IconName } from "./icons";
import type { ToolId } from "./toolTypes";

export type MenuItem = "File" | "Edit" | "Image" | "Layer" | "View" | "Window" | "Help";

export type DocumentTab = {
  id: string;
  label: string;
  active?: boolean;
};

export type ToolItem = {
  id: ToolId;
  icon: IconName;
  label: string;
  active?: boolean;
};

export type LayerItem = {
  id: string;
  name: string;
  active?: boolean;
  adjustment?: boolean;
  mask?: boolean;
  locked?: boolean;
  thumbnailPosition: string;
};

export type InspectorTab = {
  id: string;
  label: string;
  active?: boolean;
};

export type StatusItem = {
  id: string;
  label: string;
  icon?: IconName;
  hideBelow?: "sm" | "md";
};
