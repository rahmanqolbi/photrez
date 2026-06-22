/**
 * Checkerboard pattern configuration for the canvas artboard.
 *
 * The pattern shows through any transparent pixel of the active layer stack
 * so the user can tell at a glance where the artboard ends and where the
 * layer has alpha = 0. Standard editor behavior (established image editors).
 *
 * Colors are exposed as a pure function so they can be unit-tested for
 * contrast and luminance without booting WebGL.
 */

export type CheckerColor = readonly [number, number, number, number];

/** Light gray, ~80% luminance. Reads as the "white" cell of the pattern. */
export const CHECKER_COLOR_LIGHT: CheckerColor = [0.78, 0.78, 0.78, 1.0];

/** Mid gray, ~50% luminance. Reads as the "black" cell of the pattern. */
export const CHECKER_COLOR_DARK: CheckerColor = [0.55, 0.55, 0.55, 1.0];

/**
 * Returns the two colors that make up the checkerboard pattern.
 * The renderer draws a `u_checkSize`-sized grid in screen space; cell at
 * `(floor(x) + floor(y)) mod 2 == 0` uses `color1`, the other uses `color2`.
 */
export function getCheckerboardColors(): {
  color1: CheckerColor;
  color2: CheckerColor;
} {
  return {
    color1: CHECKER_COLOR_LIGHT,
    color2: CHECKER_COLOR_DARK,
  };
}
