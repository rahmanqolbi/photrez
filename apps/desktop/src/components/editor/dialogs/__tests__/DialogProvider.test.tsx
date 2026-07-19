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
      return <button onClick={() => void dialog.alert({ title: "About", message: "Photrez 0.1.0" })}>About</button>;
    }
    const root = document.createElement("div");
    document.body.appendChild(root);
    const dispose = render(() => <DialogProvider><AlertHarness /></DialogProvider>, root);
    root.querySelector("button")!.click();
    await new Promise<void>((resolve) => queueMicrotask(resolve));

    expect(document.querySelector('[role="dialog"]')).toHaveTextContent("Photrez 0.1.0");
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

  describe("newDocument dialog", () => {
    function NewDocHarness() {
      const dialog = useDialog();
      const [result, setResult] = createSignal<any>("pending");
      return (
        <>
          <button
            data-open-new-doc
            onClick={() => void dialog.newDocument({ title: "Create Document" })
              .then((v) => setResult(v))}
          >
            Open
          </button>
          <output data-dialog-result>{result() === "pending" ? "pending" : JSON.stringify(result())}</output>
        </>
      );
    }

    it("renders with default state and categories", async () => {
      const root = document.createElement("div");
      document.body.appendChild(root);
      const dispose = render(() => <DialogProvider><NewDocHarness /></DialogProvider>, root);
      root.querySelector<HTMLButtonElement>("[data-open-new-doc]")!.click();
      await new Promise<void>((resolve) => queueMicrotask(resolve));

      const dialog = document.querySelector<HTMLElement>('[data-dialog-kind="new-document"]')!;
      expect(dialog).toBeTruthy();
      expect(dialog.textContent).toContain("Create Document");
      expect(dialog.textContent).toContain("Social Media");
      expect(dialog.textContent).toContain("Web & Video");

      // Verify default values in inputs
      const nameInput = dialog.querySelector<HTMLInputElement>('input[type="text"]');
      expect(nameInput?.value).toBe("New Project");

      const numInputs = dialog.querySelectorAll<HTMLInputElement>('input[type="number"]');
      expect(numInputs[0].value).toBe("1080"); // Width
      expect(numInputs[1].value).toBe("1080"); // Height

      dispose();
    });

    it("updates form fields when a preset card is clicked", async () => {
      const root = document.createElement("div");
      document.body.appendChild(root);
      const dispose = render(() => <DialogProvider><NewDocHarness /></DialogProvider>, root);
      root.querySelector<HTMLButtonElement>("[data-open-new-doc]")!.click();
      await new Promise<void>((resolve) => queueMicrotask(resolve));

      // Switch to Social Media tab (default tab is now Paper)
      const socialTab = Array.from(document.querySelectorAll("button"))
        .find((btn) => btn.textContent?.trim() === "Social Media");
      expect(socialTab).toBeTruthy();
      socialTab!.click();
      await new Promise<void>((resolve) => queueMicrotask(resolve));

      // Click the "Facebook Cover" preset button
      const fbCoverBtn = Array.from(document.querySelectorAll("button"))
        .find((btn) => btn.textContent?.includes("Facebook Cover"));
      expect(fbCoverBtn).toBeTruthy();
      fbCoverBtn!.click();
      await new Promise<void>((resolve) => queueMicrotask(resolve));

      const dialog = document.querySelector<HTMLElement>('[data-dialog-kind="new-document"]')!;
      const nameInput = dialog.querySelector<HTMLInputElement>('input[type="text"]');
      const numInputs = dialog.querySelectorAll<HTMLInputElement>('input[type="number"]');

      expect(nameInput?.value).toBe("Facebook Cover");
      expect(numInputs[0].value).toBe("1640");
      expect(numInputs[1].value).toBe("664");

      dispose();
    });

    it("switches category tabs to display different presets", async () => {
      const root = document.createElement("div");
      document.body.appendChild(root);
      const dispose = render(() => <DialogProvider><NewDocHarness /></DialogProvider>, root);
      root.querySelector<HTMLButtonElement>("[data-open-new-doc]")!.click();
      await new Promise<void>((resolve) => queueMicrotask(resolve));

      // Click "Web & Video" category tab
      const webVideoTab = Array.from(document.querySelectorAll("button"))
        .find((btn) => btn.textContent?.trim() === "Web & Video");
      expect(webVideoTab).toBeTruthy();
      webVideoTab!.click();
      await new Promise<void>((resolve) => queueMicrotask(resolve));

      // Check that "HD" and "4K" are present
      expect(document.body.textContent).toContain("HD");
      expect(document.body.textContent).toContain("4K");
      expect(document.body.textContent).not.toContain("Facebook Cover"); // Social Media tab should be inactive

      dispose();
    });

    it("resolves with form values when Create is clicked", async () => {
      const root = document.createElement("div");
      document.body.appendChild(root);
      const dispose = render(() => <DialogProvider><NewDocHarness /></DialogProvider>, root);
      root.querySelector<HTMLButtonElement>("[data-open-new-doc]")!.click();
      await new Promise<void>((resolve) => queueMicrotask(resolve));

      // Click Create button
      const createBtn = Array.from(document.querySelectorAll("button"))
        .find((btn) => btn.textContent?.trim() === "Create");
      expect(createBtn).toBeTruthy();
      createBtn!.click();
      await new Promise<void>((resolve) => queueMicrotask(resolve));

      expect(root.querySelector("[data-dialog-result]")?.textContent).toContain('"name":"New Project"');
      expect(root.querySelector("[data-dialog-result]")?.textContent).toContain('"width":1080');
      expect(root.querySelector("[data-dialog-result]")?.textContent).toContain('"height":1080');
      expect(root.querySelector("[data-dialog-result]")?.textContent).toContain('"backgroundColor":"white"');

      dispose();
    });

    it("resolves null when Cancel is clicked", async () => {
      const root = document.createElement("div");
      document.body.appendChild(root);
      const dispose = render(() => <DialogProvider><NewDocHarness /></DialogProvider>, root);
      root.querySelector<HTMLButtonElement>("[data-open-new-doc]")!.click();
      await new Promise<void>((resolve) => queueMicrotask(resolve));

      // Click Cancel button
      const cancelBtn = Array.from(document.querySelectorAll("button"))
        .find((btn) => btn.textContent?.trim() === "Cancel");
      expect(cancelBtn).toBeTruthy();
      cancelBtn!.click();
      await new Promise<void>((resolve) => queueMicrotask(resolve));

      expect(root.querySelector("[data-dialog-result]")).toHaveTextContent("null");
      dispose();
    });

    it("resolves null on Escape key press", async () => {
      const root = document.createElement("div");
      document.body.appendChild(root);
      const dispose = render(() => <DialogProvider><NewDocHarness /></DialogProvider>, root);
      root.querySelector<HTMLButtonElement>("[data-open-new-doc]")!.click();
      await new Promise<void>((resolve) => queueMicrotask(resolve));

      const dialog = document.querySelector<HTMLElement>('[data-dialog-kind="new-document"]')!;
      dialog.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
      await new Promise<void>((resolve) => queueMicrotask(resolve));

      expect(document.querySelector('[data-dialog-kind="new-document"]')).toBeNull();
      expect(root.querySelector("[data-dialog-result]")).toHaveTextContent("null");
      dispose();
    });

    it("resolves with custom values when inputs are manually changed", async () => {
      const root = document.createElement("div");
      document.body.appendChild(root);
      const dispose = render(() => <DialogProvider><NewDocHarness /></DialogProvider>, root);
      root.querySelector<HTMLButtonElement>("[data-open-new-doc]")!.click();
      await new Promise<void>((resolve) => queueMicrotask(resolve));

      const dialog = document.querySelector<HTMLElement>('[data-dialog-kind="new-document"]')!;
      const nameInput = dialog.querySelector<HTMLInputElement>('input[type="text"]')!;
      const numInputs = dialog.querySelectorAll<HTMLInputElement>('input[type="number"]');
      const widthInput = numInputs[0];
      const heightInput = numInputs[1];
      const bgSelect = dialog.querySelector<HTMLSelectElement>('select')!;

      // Change values
      nameInput.value = "Custom Name";
      nameInput.dispatchEvent(new Event("input", { bubbles: true }));
      widthInput.value = "800";
      widthInput.dispatchEvent(new FocusEvent("blur", { bubbles: false }));
      heightInput.value = "600";
      heightInput.dispatchEvent(new FocusEvent("blur", { bubbles: false }));
      bgSelect.value = "white";
      bgSelect.dispatchEvent(new Event("change", { bubbles: true }));

      await new Promise<void>((resolve) => queueMicrotask(resolve));

      // Click Create button
      const createBtn = Array.from(document.querySelectorAll("button"))
        .find((btn) => btn.textContent?.trim() === "Create")!;
      createBtn.click();
      await new Promise<void>((resolve) => queueMicrotask(resolve));

      expect(root.querySelector("[data-dialog-result]")?.textContent).toContain('"name":"Custom Name"');
      expect(root.querySelector("[data-dialog-result]")?.textContent).toContain('"width":800');
      expect(root.querySelector("[data-dialog-result]")?.textContent).toContain('"height":600');
      expect(root.querySelector("[data-dialog-result]")?.textContent).toContain('"backgroundColor":"white"');

      dispose();
    });

    it("sanitizes invalid or empty numeric inputs to 1", async () => {
      const root = document.createElement("div");
      document.body.appendChild(root);
      const dispose = render(() => <DialogProvider><NewDocHarness /></DialogProvider>, root);
      root.querySelector<HTMLButtonElement>("[data-open-new-doc]")!.click();
      await new Promise<void>((resolve) => queueMicrotask(resolve));

      const dialog = document.querySelector<HTMLElement>('[data-dialog-kind="new-document"]')!;
      const numInputs = dialog.querySelectorAll<HTMLInputElement>('input[type="number"]');
      const widthInput = numInputs[0];

      // Enter empty values (which parse to NaN)
      widthInput.value = "";
      widthInput.dispatchEvent(new FocusEvent("blur", { bubbles: false }));

      await new Promise<void>((resolve) => queueMicrotask(resolve));

      // Click Create button
      const createBtn = Array.from(document.querySelectorAll("button"))
        .find((btn) => btn.textContent?.trim() === "Create")!;
      createBtn.click();
      await new Promise<void>((resolve) => queueMicrotask(resolve));

      // Empty input resolves to fallback value 1.
      expect(root.querySelector("[data-dialog-result]")?.textContent).toContain('"width":1');

      dispose();
    });

    it("applies active CSS classes when a preset matches the current state", async () => {
      const root = document.createElement("div");
      document.body.appendChild(root);
      const dispose = render(() => <DialogProvider><NewDocHarness /></DialogProvider>, root);
      root.querySelector<HTMLButtonElement>("[data-open-new-doc]")!.click();
      await new Promise<void>((resolve) => queueMicrotask(resolve));

      // Switch to Social Media tab (default tab is Paper)
      const socialTab = Array.from(document.querySelectorAll("button"))
        .find((btn) => btn.textContent?.trim() === "Social Media");
      expect(socialTab).toBeTruthy();
      socialTab!.click();
      await new Promise<void>((resolve) => queueMicrotask(resolve));

      const fbCoverBtn = Array.from(document.querySelectorAll("button"))
        .find((btn) => btn.textContent?.includes("Facebook Cover"))!;
      
      // Initially, it should not have the active border style
      expect(fbCoverBtn.className.split(" ")).not.toContain("border-editor-accent");

      // Click to select it
      fbCoverBtn.click();
      await new Promise<void>((resolve) => queueMicrotask(resolve));

      // Should now have active border class
      expect(fbCoverBtn.className.split(" ")).toContain("border-editor-accent");

      // Modify the text input to make the state custom
      const nameInput = document.querySelector<HTMLInputElement>('input[type="text"]')!;
      nameInput.value = "Custom Name Override";
      nameInput.dispatchEvent(new Event("input", { bubbles: true }));
      await new Promise<void>((resolve) => queueMicrotask(resolve));

      // It should revert to the default border style
      expect(fbCoverBtn.className.split(" ")).not.toContain("border-editor-accent");

      dispose();
    });
  });
});
