import { describe, expect, it } from "vitest";
import { render } from "solid-js/web";
import { TransformHud } from "../TransformHud";

describe("TransformHud", () => {
  it("keeps text and panel size in screen pixels instead of scaling with viewport zoom", () => {
    const container = document.createElement("div");
    document.body.appendChild(container);

    const dispose = render(
      () => (
        <svg>
          <TransformHud
            mode="resize"
            clientX={100}
            clientY={120}
            zoom={0.5}
            width={320}
            height={240}
            scalePercent={125}
          />
        </svg>
      ),
      container,
    );

    const text = container.querySelector("text");
    const rect = container.querySelector("rect");

    expect(text?.getAttribute("font-size")).toBe("12");
    expect(text?.getAttribute("x")).toBe("8");
    expect(text?.getAttribute("y")).toBe("14");
    expect(rect?.getAttribute("height")).toBe("20");
    expect(rect?.getAttribute("rx")).toBe("4");

    dispose();
    container.parentNode?.removeChild(container);
  });
});
