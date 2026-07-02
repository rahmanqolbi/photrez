import { screenToDocument } from "@/viewport/coords";
import type { ViewportState } from "@/engine/types";

export interface SelectionBox {
  x: number;
  y: number;
  w: number;
  h: number;
  angle: number;
  inverted?: boolean;
}

export function startSelectionRotation(
  getSelectionBox: () => SelectionBox | null,
  setSelectionBox: (box: SelectionBox | null) => void,
  getContainerRef: () => HTMLDivElement | undefined,
  getActiveEngine: () => { getViewport(): ViewportState } | null,
): void {
  const box = getSelectionBox();
  if (!box) return;
  const engine = getActiveEngine();
  if (!engine) return;

  const centerX = box.x + box.w / 2;
  const centerY = box.y + box.h / 2;
  const initialAngle = Math.atan2(0, -1) * (180 / Math.PI);

  const handleDocPointerMove = (e: PointerEvent) => {
    const rect = getContainerRef()?.getBoundingClientRect();
    if (!rect) return;
    const docPt = screenToDocument(e.clientX, e.clientY, rect, engine.getViewport());
    const currentAngle = Math.atan2(docPt.y - centerY, docPt.x - centerX) * (180 / Math.PI);
    let angle = currentAngle - initialAngle;
    if (e.shiftKey) {
      angle = Math.round(angle / 15) * 15;
    }
    angle = ((angle % 360) + 360) % 360;
    if (angle > 180) angle -= 360;
    setSelectionBox({ ...box, angle });
  };

  const handleDocPointerUp = () => {
    document.removeEventListener("pointermove", handleDocPointerMove);
    document.removeEventListener("pointerup", handleDocPointerUp);
  };

  document.addEventListener("pointermove", handleDocPointerMove);
  document.addEventListener("pointerup", handleDocPointerUp);
}
