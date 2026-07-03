import { afterEach, describe, expect, it, vi } from "vitest";
import { createSignal } from "solid-js";
import { render } from "solid-js/web";
import { DialogProvider, useDialog } from "../DialogProvider";

function ConfirmHarness() {
  const dialog = useDialog();
  const [result, setResult] = createSignal("pending");
  return (
    <>
      <button
        data-open-confirm
        onClick={() => void dialog.confirm({
          title: "Delete Layer",
          message: "Delete the active layer?",
          confirmLabel: "Delete",
          tone: "danger",
        }).then((accepted) => setResult(String(accepted)))}
      >
        Open
      </button>
      <output data-dialog-result>{result()}</output>
    </>
  );
}

describe("DialogProvider", () => {
  afterEach(() => {
    document.body.innerHTML = "";
    vi.restoreAllMocks();
  });

  it("renders an accessible destructive dialog and focuses Cancel by default", async () => {
    const root = document.createElement("div");
    document.body.appendChild(root);
    const dispose = render(() => <DialogProvider><ConfirmHarness /></DialogProvider>, root);
    const opener = root.querySelector<HTMLButtonElement>("[data-open-confirm]")!;
    opener.focus();
    opener.click();
    await new Promise<void>((resolve) => queueMicrotask(resolve));

    const dialog = document.querySelector<HTMLElement>('[role="alertdialog"]')!;
    const cancel = document.querySelector<HTMLButtonElement>("[data-dialog-cancel]")!;
    expect(dialog).toHaveAttribute("aria-modal", "true");
    expect(dialog).toHaveAttribute("data-dialog-tone", "danger");
    expect(dialog.querySelector("[data-dialog-titlebar]")).not.toBeNull();
    expect(dialog.querySelector("[data-dialog-body]")).not.toBeNull();
    expect(dialog.querySelector("[data-dialog-actions]")).not.toBeNull();
    expect(dialog.textContent).toContain("Delete the active layer?");
    expect(document.activeElement).toBe(cancel);

    cancel.click();
    await new Promise<void>((resolve) => queueMicrotask(resolve));
    expect(root.querySelector("[data-dialog-result]")).toHaveTextContent("false");
    expect(document.activeElement).toBe(opener);
    dispose();
  });

  it("traps focus and accepts the dialog from the confirm action", async () => {
    const root = document.createElement("div");
    document.body.appendChild(root);
    const dispose = render(() => <DialogProvider><ConfirmHarness /></DialogProvider>, root);
    root.querySelector<HTMLButtonElement>("[data-open-confirm]")!.click();
    await new Promise<void>((resolve) => queueMicrotask(resolve));

    const dialog = document.querySelector<HTMLElement>('[role="alertdialog"]')!;
    const cancel = document.querySelector<HTMLButtonElement>("[data-dialog-cancel]")!;
    const confirm = document.querySelector<HTMLButtonElement>("[data-dialog-confirm]")!;
    cancel.focus();
    dialog.dispatchEvent(new KeyboardEvent("keydown", { key: "Tab", shiftKey: true, bubbles: true }));
    expect(document.activeElement).toBe(confirm);

    confirm.click();
    await new Promise<void>((resolve) => queueMicrotask(resolve));
    expect(root.querySelector("[data-dialog-result]")).toHaveTextContent("true");
    dispose();
  });

  it("cancels on Escape", async () => {
    const root = document.createElement("div");
    document.body.appendChild(root);
    const dispose = render(() => <DialogProvider><ConfirmHarness /></DialogProvider>, root);
    root.querySelector<HTMLButtonElement>("[data-open-confirm]")!.click();
    await new Promise<void>((resolve) => queueMicrotask(resolve));
    document.querySelector<HTMLElement>('[role="alertdialog"]')!
      .dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
    await new Promise<void>((resolve) => queueMicrotask(resolve));

    expect(document.querySelector('[role="alertdialog"]')).toBeNull();
    expect(root.querySelector("[data-dialog-result]")).toHaveTextContent("false");
    dispose();
  });

  it("renders informational alerts with a single action", async () => {
    function AlertHarness() {
      const dialog = useDialog();
      return <button onClick={() => void dialog.alert({ title: "About", message: "Photrez 0.2.0" })}>About</button>;
    }
    const root = document.createElement("div");
    document.body.appendChild(root);
    const dispose = render(() => <DialogProvider><AlertHarness /></DialogProvider>, root);
    root.querySelector("button")!.click();
    await new Promise<void>((resolve) => queueMicrotask(resolve));

    expect(document.querySelector('[role="dialog"]')).toHaveTextContent("Photrez 0.2.0");
    expect(document.querySelector("[data-dialog-cancel]")).toBeNull();
    expect(document.querySelectorAll("[data-dialog-confirm]")).toHaveLength(1);
    dispose();
  });

  it("renders quality dialog with slider at default value", async () => {
    function QualityHarness() {
      const dialog = useDialog();
      const [result, setResult] = createSignal("pending");
      return (
        <>
          <button
            data-open-quality
            onClick={() => void dialog.quality({ title: "JPEG Quality", format: "jpeg", defaultQuality: 85 })
              .then((v) => setResult(String(v)))}
          >
            Open Quality
          </button>
          <output data-dialog-result>{result()}</output>
        </>
      );
    }
    const root = document.createElement("div");
    document.body.appendChild(root);
    const dispose = render(() => <DialogProvider><QualityHarness /></DialogProvider>, root);
    root.querySelector<HTMLButtonElement>("[data-open-quality]")!.click();
    await new Promise<void>((resolve) => queueMicrotask(resolve));

    const dialog = document.querySelector<HTMLElement>('[role="dialog"]')!;
    expect(dialog).toBeTruthy();
    expect(dialog.textContent).toContain("JPEG Quality");
    const slider = dialog.querySelector<HTMLInputElement>('input[type="range"]');
    expect(slider).toBeTruthy();
    expect(slider!.value).toBe("85");
    expect(dialog.textContent).toContain("85%");
    expect(dialog.textContent).toContain("90-95% recommended");
    dispose();
  });

  it("cancels quality dialog via Cancel button resolves null", async () => {
    function QualityHarness() {
      const dialog = useDialog();
      const [result, setResult] = createSignal("pending");
      return (
        <>
          <button data-open-quality onClick={() => void dialog.quality({ title: "Quality", format: "webp", defaultQuality: 90 }).then((v) => setResult(String(v)))}>Open</button>
          <output data-dialog-result>{result()}</output>
        </>
      );
    }
    const root = document.createElement("div");
    document.body.appendChild(root);
    const dispose = render(() => <DialogProvider><QualityHarness /></DialogProvider>, root);
    root.querySelector<HTMLButtonElement>("[data-open-quality]")!.click();
    await new Promise<void>((resolve) => queueMicrotask(resolve));

    const cancel = document.querySelector<HTMLButtonElement>("[data-dialog-cancel]")!;
    expect(cancel).toBeTruthy();
    cancel.click();
    await new Promise<void>((resolve) => queueMicrotask(resolve));

    expect(root.querySelector("[data-dialog-result]")).toHaveTextContent("null");
    dispose();
  });

  it("accepts quality dialog via Save button resolves with slider value", async () => {
    function QualityHarness() {
      const dialog = useDialog();
      const [result, setResult] = createSignal("pending");
      return (
        <>
          <button data-open-quality onClick={() => void dialog.quality({ title: "Quality", format: "jpeg", defaultQuality: 75 }).then((v) => setResult(String(v)))}>Open</button>
          <output data-dialog-result>{result()}</output>
        </>
      );
    }
    const root = document.createElement("div");
    document.body.appendChild(root);
    const dispose = render(() => <DialogProvider><QualityHarness /></DialogProvider>, root);
    root.querySelector<HTMLButtonElement>("[data-open-quality]")!.click();
    await new Promise<void>((resolve) => queueMicrotask(resolve));

    const save = document.querySelector<HTMLButtonElement>("[data-dialog-confirm]")!;
    expect(save).toHaveTextContent("Save");
    save.click();
    await new Promise<void>((resolve) => queueMicrotask(resolve));

    expect(root.querySelector("[data-dialog-result]")).toHaveTextContent("75");
    dispose();
  });

  it("cancels quality dialog on Escape resolves null", async () => {
    function QualityHarness() {
      const dialog = useDialog();
      const [result, setResult] = createSignal("pending");
      return (
        <>
          <button data-open-quality onClick={() => void dialog.quality({ title: "Quality", format: "jpeg", defaultQuality: 80 }).then((v) => setResult(String(v)))}>Open</button>
          <output data-dialog-result>{result()}</output>
        </>
      );
    }
    const root = document.createElement("div");
    document.body.appendChild(root);
    const dispose = render(() => <DialogProvider><QualityHarness /></DialogProvider>, root);
    root.querySelector<HTMLButtonElement>("[data-open-quality]")!.click();
    await new Promise<void>((resolve) => queueMicrotask(resolve));

    document.querySelector<HTMLElement>('[role="dialog"]')!
      .dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
    await new Promise<void>((resolve) => queueMicrotask(resolve));

    expect(document.querySelector('[role="dialog"]')).toBeNull();
    expect(root.querySelector("[data-dialog-result]")).toHaveTextContent("null");
    dispose();
  });
});
