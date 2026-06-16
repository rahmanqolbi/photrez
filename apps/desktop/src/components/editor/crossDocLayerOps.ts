export const CASCADE_OFFSET_PX = 24;

export interface Point {
  x: number;
  y: number;
}

export function computeCascadePosition(base: Point, index: number): Point {
  return {
    x: base.x + index * CASCADE_OFFSET_PX,
    y: base.y + index * CASCADE_OFFSET_PX,
  };
}
