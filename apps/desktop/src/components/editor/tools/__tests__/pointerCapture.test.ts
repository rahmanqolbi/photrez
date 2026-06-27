import { describe, expect, it, vi } from "vitest";
import { tryReleasePointerCapture, trySetPointerCapture, type PointerCaptureElement } from "../pointerCapture";

function makeTarget(overrides: Partial<PointerCaptureElement> = {}): PointerCaptureElement {
  return {
    setPointerCapture: vi.fn(),
    releasePointerCapture: vi.fn(),
    ...overrides,
  };
}

describe("pointer capture helpers", () => {
  it("sets pointer capture and reports success", () => {
    const target = makeTarget();

    expect(trySetPointerCapture(target, 7)).toBe(true);
    expect(target.setPointerCapture).toHaveBeenCalledWith(7);
  });

  it("releases pointer capture and reports success", () => {
    const target = makeTarget();

    expect(tryReleasePointerCapture(target, 9)).toBe(true);
    expect(target.releasePointerCapture).toHaveBeenCalledWith(9);
  });

  it("returns false for missing targets", () => {
    expect(trySetPointerCapture(null, 1)).toBe(false);
    expect(tryReleasePointerCapture(undefined, 1)).toBe(false);
  });

  it("swallows browser capture errors and reports failure", () => {
    const target = makeTarget({
      setPointerCapture: vi.fn(() => {
        throw new Error("not active");
      }),
      releasePointerCapture: vi.fn(() => {
        throw new Error("already released");
      }),
    });

    expect(trySetPointerCapture(target, 2)).toBe(false);
    expect(tryReleasePointerCapture(target, 2)).toBe(false);
  });
});
