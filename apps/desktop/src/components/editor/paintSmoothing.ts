export function smoothingToWindowSize(value: number): number {
  if (value <= 0) return 1;
  if (value <= 30) return 2 + Math.floor(((value - 1) / 29) * 1);
  if (value <= 70) return 4 + Math.floor(((value - 31) / 39) * 2);
  return 7 + Math.floor(((value - 71) / 29) * 3);
}

export class PaintSmoother {
  private buffer: { x: number; y: number }[] = [];
  private windowSize = 2;

  setWindowSize(size: number): void {
    this.windowSize = Math.max(1, Math.min(10, Math.round(size)));
  }

  reset(): void {
    this.buffer = [];
  }

  addPoint(x: number, y: number): { x: number; y: number } {
    this.buffer.push({ x, y });
    if (this.buffer.length > 10) {
      this.buffer = this.buffer.slice(-10);
    }

    const n = Math.min(this.buffer.length, this.windowSize);
    if (n <= 1) return { x, y };

    const relevant = this.buffer.slice(-n);
    let totalWeight = 0;
    let wx = 0;
    let wy = 0;
    for (let i = 0; i < n; i++) {
      const weight = Math.pow(2, i);
      totalWeight += weight;
      wx += relevant[i].x * weight;
      wy += relevant[i].y * weight;
    }

    return { x: wx / totalWeight, y: wy / totalWeight };
  }
}
