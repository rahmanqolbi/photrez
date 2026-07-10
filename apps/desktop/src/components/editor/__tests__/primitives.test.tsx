import { describe, it, expect, vi } from "vitest";
import { render } from "solid-js/web";
import { createSignal } from "solid-js";
import { EditableNumField, Slider } from "../primitives";

describe("EditableNumField", () => {
  it("renders with initial value and suffix", () => {
    const container = document.createElement("div");
    const dispose = render(() => (
      <EditableNumField
        label="R"
        value={15}
        suffix="°"
        onSubmit={() => {}}
      />
    ), container);

    expect(container.textContent).toContain("R");
    expect(container.textContent).toContain("°");
    const input = container.querySelector("input") as HTMLInputElement;
    expect(input).not.toBeNull();
    expect(input.value).toBe("15");

    dispose();
  });

  it("handles ArrowUp and ArrowDown increments with live updates", async () => {
    const onSubmitSpy = vi.fn();
    const container = document.createElement("div");
    document.body.appendChild(container);
    const dispose = render(() => (
      <EditableNumField
        label="X"
        value={50}
        onSubmit={onSubmitSpy}
      />
    ), container);

    const input = container.querySelector("input") as HTMLInputElement;
    expect(input).not.toBeNull();

    const sleep = (ms = 0) => new Promise(r => setTimeout(r, ms));

    // Focus first to initiate editing
    input.focus();
    input.dispatchEvent(new FocusEvent("focus"));
    await sleep();

    // Press ArrowUp (should increment by 1)
    input.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowUp", bubbles: true }));
    await sleep();
    expect(input.value).toBe("51");
    expect(onSubmitSpy).toHaveBeenCalledWith(51);

    // Press ArrowDown (should decrement by 1)
    input.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowDown", bubbles: true }));
    await sleep();
    expect(input.value).toBe("50");
    expect(onSubmitSpy).toHaveBeenCalledWith(50);

    // Press Shift + ArrowUp (should increment by 10)
    input.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowUp", shiftKey: true, bubbles: true }));
    await sleep();
    expect(input.value).toBe("60");
    expect(onSubmitSpy).toHaveBeenCalledWith(60);

    // Press Shift + ArrowDown (should decrement by 10)
    input.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowDown", shiftKey: true, bubbles: true }));
    await sleep();
    expect(input.value).toBe("50");
    expect(onSubmitSpy).toHaveBeenCalledWith(50);

    dispose();
    container.parentNode?.removeChild(container);
  });
});

describe("Slider CSS positioning", () => {
  it("renders thumb with left: X% and translate(-50%, -50%) for centering", () => {
    const container = document.createElement("div");
    const dispose = render(() => (
      <Slider percent={65} />
    ), container);

    const sliderDiv = container.firstElementChild as HTMLElement;
    expect(sliderDiv).not.toBeNull();

    // Find the thumb div (the one with size-[12px])
    const thumb = sliderDiv.querySelector("div.absolute.size-\\[12px\\]");
    // Alternatively locate by attribute
    const allChildren = sliderDiv.querySelectorAll("div");
    const thumbFound = Array.from(allChildren).find(
      (el) => el.className.includes("size-[12px]") && el.className.includes("rounded-full")
    );
    expect(thumbFound).not.toBeNull();
    const style = thumbFound?.getAttribute("style") || "";
    expect(style).toContain("left: 65%");
    expect(style).toContain("translate(-50%, -50%)");

    dispose();
  });

  it("updates left position when percent changes", () => {
    const container = document.createElement("div");
    const [pct, setPct] = createSignal(25);
    const dispose = render(() => (
      <Slider percent={pct()} />
    ), container);

    const sliderDiv = container.firstElementChild as HTMLElement;
    const allChildren = sliderDiv.querySelectorAll("div");
    const thumb = Array.from(allChildren).find(
      (el) => el.className.includes("size-[12px]") && el.className.includes("rounded-full")
    );
    expect(thumb?.getAttribute("style")).toContain("left: 25%");

    setPct(75);
    // SolidJS batches signal writes; flush by reading the style
    expect(thumb?.getAttribute("style")).toContain("left: 75%");

    dispose();
  });
});
