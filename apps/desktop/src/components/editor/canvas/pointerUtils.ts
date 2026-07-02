export const rgbToHex = (r: number, g: number, b: number): string => {
  const toHex = (c: number) => {
    const hex = Math.max(0, Math.min(255, Math.round(c))).toString(16);
    return hex.length === 1 ? "0" + hex : hex;
  };
  return "#" + toHex(r) + toHex(g) + toHex(b);
};

export const interpolateLinePoints = (
  p1: { x: number; y: number },
  p2: { x: number; y: number },
): { x: number; y: number }[] => {
  const points: { x: number; y: number }[] = [];
  const dx = p2.x - p1.x;
  const dy = p2.y - p1.y;
  const distance = Math.hypot(dx, dy);
  const steps = Math.max(1, Math.round(distance));
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    points.push({
      x: p1.x + dx * t,
      y: p1.y + dy * t,
    });
  }
  return points;
};
