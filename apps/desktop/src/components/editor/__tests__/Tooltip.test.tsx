import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render } from "solid-js/web";
import { Tooltip, resetTooltipWarmState } from "../Tooltip";

describe("Tooltip Component", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    resetTooltipWarmState();
  });

  afterEach(() => {
    vi.useRealTimers();
    document.body.innerHTML = "";
  });

  it("renders children correctly and does not show tooltip initially", () => {
    const root = document.createElement("div");
    document.body.appendChild(root);

    const dispose = render(
      () => (
        <Tooltip content="Test Tooltip" shortcut="T">
          <button id="trigger">Hover Me</button>
        </Tooltip>
      ),
      root
    );

    const trigger = root.querySelector("#trigger")!;
    expect(trigger).not.toBeNull();
    expect(trigger.textContent).toBe("Hover Me");

    // Tooltip should not be in the document initially
    expect(document.querySelector('[role="tooltip"]')).toBeNull();

    dispose();
    root.remove();
  });

  it("shows tooltip after 400ms hover delay", () => {
    const root = document.createElement("div");
    document.body.appendChild(root);

    const dispose = render(
      () => (
        <Tooltip content="Test Tooltip" shortcut="T">
          <button id="trigger">Hover Me</button>
        </Tooltip>
      ),
      root
    );

    const trigger = root.querySelector("#trigger")!;

    // Simulate mouseenter
    trigger.dispatchEvent(new MouseEvent("mouseenter"));

    // Immediately it shouldn't show
    expect(document.querySelector('[role="tooltip"]')).toBeNull();

    // Advance 300ms, still shouldn't show
    vi.advanceTimersByTime(300);
    expect(document.querySelector('[role="tooltip"]')).toBeNull();

    // Advance to 400ms
    vi.advanceTimersByTime(100);
    
    // Now it should show
    const tooltip = document.querySelector('[role="tooltip"]')!;
    expect(tooltip).not.toBeNull();
    expect(tooltip.textContent).toContain("Test Tooltip");
    expect(tooltip.textContent).toContain("T");

    // Check ARIA describedby association
    expect(trigger.getAttribute("aria-describedby")).toBe(tooltip.id);

    // Simulate mouseleave
    trigger.dispatchEvent(new MouseEvent("mouseleave"));
    
    // It should close instantly
    expect(document.querySelector('[role="tooltip"]')).toBeNull();
    expect(trigger.getAttribute("aria-describedby")).toBeNull();

    dispose();
    root.remove();
  });

  it("cancels hover timer if mouse leaves before delay", () => {
    const root = document.createElement("div");
    document.body.appendChild(root);

    const dispose = render(
      () => (
        <Tooltip content="Test Tooltip">
          <button id="trigger">Hover Me</button>
        </Tooltip>
      ),
      root
    );

    const trigger = root.querySelector("#trigger")!;

    trigger.dispatchEvent(new MouseEvent("mouseenter"));
    vi.advanceTimersByTime(200);
    expect(document.querySelector('[role="tooltip"]')).toBeNull();

    trigger.dispatchEvent(new MouseEvent("mouseleave"));
    vi.advanceTimersByTime(300); // Exceeds the initial 400ms delay total
    
    expect(document.querySelector('[role="tooltip"]')).toBeNull();

    dispose();
    root.remove();
  });

  it("shows tooltip instantly on focus and hides on blur", () => {
    const root = document.createElement("div");
    document.body.appendChild(root);

    const dispose = render(
      () => (
        <Tooltip content="Test Tooltip">
          <button id="trigger">Focus Me</button>
        </Tooltip>
      ),
      root
    );

    const trigger = root.querySelector("#trigger")!;

    // Focus target
    trigger.dispatchEvent(new FocusEvent("focusin"));

    // Should show instantly (no timer advance needed)
    const tooltip = document.querySelector('[role="tooltip"]')!;
    expect(tooltip).not.toBeNull();
    expect(trigger.getAttribute("aria-describedby")).toBe(tooltip.id);

    // Blur target
    trigger.dispatchEvent(new FocusEvent("focusout"));
    expect(document.querySelector('[role="tooltip"]')).toBeNull();

    dispose();
    root.remove();
  });

  it("hides immediately on Escape key down", () => {
    const root = document.createElement("div");
    document.body.appendChild(root);

    const dispose = render(
      () => (
        <Tooltip content="Test Tooltip">
          <button id="trigger">Escape Me</button>
        </Tooltip>
      ),
      root
    );

    const trigger = root.querySelector("#trigger")!;

    trigger.dispatchEvent(new FocusEvent("focusin"));
    expect(document.querySelector('[role="tooltip"]')).not.toBeNull();

    // Fire Escape keydown
    window.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }));
    expect(document.querySelector('[role="tooltip"]')).toBeNull();

    dispose();
    root.remove();
  });
});
