import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { render, screen } from "@solidjs/testing-library";
import { ToastHost, showToast, resetToasts } from "../Toast";

describe("Toast", () => {
  beforeEach(() => {
    resetToasts();
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it("renders info toast with role=status", () => {
    render(() => <ToastHost />);
    showToast("Hello", "info");
    expect(screen.getByRole("status")).toHaveTextContent("Hello");
  });

  it("renders error toast with role=alert", () => {
    render(() => <ToastHost />);
    showToast("Failed", "error");
    expect(screen.getByRole("alert")).toHaveTextContent("Failed");
  });

  it("auto-dismisses info after 3.5s", () => {
    render(() => <ToastHost />);
    showToast("Bye", "info");
    vi.advanceTimersByTime(3500);
    expect(screen.queryByRole("status")).toBeNull();
  });

  it("keeps error toast for 5s", () => {
    render(() => <ToastHost />);
    showToast("Big problem", "error");
    vi.advanceTimersByTime(3500);
    expect(screen.getByRole("alert")).toBeInTheDocument();
    vi.advanceTimersByTime(1500);
    expect(screen.queryByRole("alert")).toBeNull();
  });

  it("stacks max 3 toasts (FIFO eviction)", () => {
    render(() => <ToastHost />);
    showToast("First", "info");
    showToast("Second", "info");
    showToast("Third", "info");
    showToast("Fourth", "info");
    expect(screen.queryByText("First")).toBeNull();
    expect(screen.getByText("Second")).toBeInTheDocument();
    expect(screen.getByText("Third")).toBeInTheDocument();
    expect(screen.getByText("Fourth")).toBeInTheDocument();
  });
});
