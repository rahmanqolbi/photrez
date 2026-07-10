export function smoothingToWindowSize(value: number): number {
  if (value <= 0) return 1;
  if (value <= 30) return 2 + Math.floor(((value - 1) / 29) * 1);
  if (value <= 70) return 4 + Math.floor(((value - 31) / 39) * 2);
  return 7 + Math.floor(((value - 71) / 29) * 3);
}

const BUFFER_CAPACITY = 10;

export class PaintSmoother {
  // Pre-allocated ring buffer — zero allocations per event, no GC pressure.
  private xs = new Float64Array(BUFFER_CAPACITY);
  private ys = new Float64Array(BUFFER_CAPACITY);
  private head = 0;   // next write index
  private size = 0;   // number of valid entries (0..BUFFER_CAPACITY)
  private windowSize = 2;

  setWindowSize(size: number): void {
    this.windowSize = Math.max(1, Math.min(BUFFER_CAPACITY, Math.round(size)));
  }

  reset(): void {
    this.head = 0;
    this.size = 0;
  }

  addPoint(x: number, y: number): { x: number; y: number } {
    this.xs[this.head] = x;
    this.ys[this.head] = y;
    this.head = (this.head + 1) % BUFFER_CAPACITY;
    if (this.size < BUFFER_CAPACITY) this.size++;

    const n = Math.min(this.size, this.windowSize);
    if (n <= 1) return { x, y };

    // Weighted average over the last n points (oldest → newest, matching
    // the original slice-based order: relevant[0]=oldest, relevant[n-1]=newest).
    // Newest point gets the highest weight (2^(n-1)).
    let totalWeight = 0;
    let wx = 0;
    let wy = 0;
    for (let i = 0; i < n; i++) {
      // Oldest = head - n, newest = head - 1
      const idx = (this.head - n + i + BUFFER_CAPACITY * 2) % BUFFER_CAPACITY;
      const weight = Math.pow(2, i);
      totalWeight += weight;
      wx += this.xs[idx] * weight;
      wy += this.ys[idx] * weight;
    }

    return { x: wx / totalWeight, y: wy / totalWeight };
  }
}
