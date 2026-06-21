export const BRUSH_HARD_EDGE_THRESHOLD = 0.97;
export const MIN_RELIABLE_BRUSH_DIAMETER_PX = 22;
export const MIN_VISIBLE_ALPHA_8BIT = 0.5 / 255;

const HARDNESS_POINTS = [0, 0.1, 0.25, 0.5, 0.75, 0.9, 1] as const;
const SIGMA_POINTS = [0.661, 0.738, 0.83, 0.935, 0.99, 1.004, 1.006] as const;
const N_POINTS = [2, 2.68, 4.07, 8.23, 20.22, 51.2, 60] as const;

class MonotoneCubic {
  private readonly ms: number[];

  constructor(
    private readonly xs: readonly number[],
    private readonly ys: readonly number[],
  ) {
    const dxs: number[] = [];
    const slopes: number[] = [];

    for (let i = 0; i < xs.length - 1; i += 1) {
      const dx = xs[i + 1] - xs[i];
      dxs.push(dx);
      slopes.push((ys[i + 1] - ys[i]) / dx);
    }

    const ms = [slopes[0]];
    for (let i = 0; i < slopes.length - 1; i += 1) {
      const s0 = slopes[i];
      const s1 = slopes[i + 1];
      if (s0 * s1 <= 0) {
        ms.push(0);
      } else {
        const d0 = dxs[i];
        const d1 = dxs[i + 1];
        const c = d0 + d1;
        ms.push((3 * c) / ((c + d1) / s0 + (c + d0) / s1));
      }
    }
    ms.push(slopes[slopes.length - 1]);
    this.ms = ms;
  }

  interpolate(x: number): number {
    const last = this.xs.length - 1;
    if (x <= this.xs[0]) return this.ys[0];
    if (x >= this.xs[last]) return this.ys[last];

    let i = 0;
    while (x > this.xs[i + 1]) i += 1;

    const h = this.xs[i + 1] - this.xs[i];
    const t = (x - this.xs[i]) / h;
    const t2 = t * t;
    const t3 = t2 * t;
    const h00 = 2 * t3 - 3 * t2 + 1;
    const h10 = t3 - 2 * t2 + t;
    const h01 = -2 * t3 + 3 * t2;
    const h11 = t3 - t2;

    return h00 * this.ys[i]
      + h10 * h * this.ms[i]
      + h01 * this.ys[i + 1]
      + h11 * h * this.ms[i + 1];
  }
}

const sigmaCurve = new MonotoneCubic(HARDNESS_POINTS, SIGMA_POINTS);
const nCurve = new MonotoneCubic(HARDNESS_POINTS, N_POINTS);

function clampHardness(hardness: number): number {
  if (!Number.isFinite(hardness)) return 0;
  return Math.max(0, Math.min(1, hardness));
}

export function getBrushProfileParameters(
  hardness: number,
): { sigma: number; n: number } {
  const h = clampHardness(hardness);
  return {
    sigma: sigmaCurve.interpolate(h),
    n: nCurve.interpolate(h),
  };
}

export function brushAlpha(rNorm: number, hardness: number): number {
  const h = clampHardness(hardness);
  if (h >= BRUSH_HARD_EDGE_THRESHOLD) return rNorm <= 1 ? 1 : 0;

  const { sigma, n } = getBrushProfileParameters(h);
  const x = Math.max(rNorm, 0) / sigma;
  return Math.exp(-Math.pow(x, n));
}

export function getBrushProfileSupportNorm(hardness: number): number {
  const h = clampHardness(hardness);
  if (h >= BRUSH_HARD_EDGE_THRESHOLD) return 1;

  const { sigma, n } = getBrushProfileParameters(h);
  return Math.max(
    1,
    sigma * Math.pow(-Math.log(MIN_VISIBLE_ALPHA_8BIT), 1 / n),
  );
}
