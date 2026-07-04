import { describe, it, expect, vi } from "vitest";
import { render } from "solid-js/web";
import { EditableNumField } from "../primitives";

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
