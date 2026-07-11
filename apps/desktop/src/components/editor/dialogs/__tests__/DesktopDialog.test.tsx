// apps/desktop/src/components/editor/dialogs/__tests__/DesktopDialog.test.tsx
//
// Guards the non-modal change that lets the color picker stay open while the
// canvas behind it stays clickable: a non-modal dialog must render
// aria-modal="false" and a click-through (pointer-events:none) backdrop
// so canvas clicks reach the sampler instead of cancelling the dialog.

import { describe, it, expect, afterEach } from "vitest";
import { render } from "solid-js/web";
import { DesktopDialog } from "../DesktopDialog";

describe("DesktopDialog non-modal", () => {
  afterEach(() => {
    document.body.innerHTML = "";
  });

  it("renders click-through backdrop + aria-modal=false when modal=false", () => {
    const root = document.createElement("div");
    document.body.appendChild(root);
    const dispose = render(() => (
      <DesktopDialog
        title="T"
        modal={false}
        onDismiss={() => {}}
        onBackdropPointerDown={() => {}}
      >
        <span>body</span>
      </DesktopDialog>
    ), root);

    const dialog = document.querySelector<HTMLElement>('[role="dialog"]')!;
    expect(dialog).toHaveAttribute("aria-modal", "false");

    const backdrop = document.querySelector<HTMLElement>('[data-dialog-backdrop]')!;
    expect(backdrop.className).toContain("pointer-events-none");

    dispose();
  });

  it("defaults to modal: aria-modal=true and opaque-ish backdrop", () => {
    const root = document.createElement("div");
    document.body.appendChild(root);
    const dispose = render(() => (
      <DesktopDialog title="T" onBackdropPointerDown={() => {}}>
        <span>body</span>
      </DesktopDialog>
    ), root);

    const dialog = document.querySelector<HTMLElement>('[role="dialog"]')!;
    expect(dialog).toHaveAttribute("aria-modal", "true");

    const backdrop = document.querySelector<HTMLElement>('[data-dialog-backdrop]')!;
    expect(backdrop.className).toContain("bg-transparent");
    expect(backdrop.className).not.toContain("pointer-events-none");

    dispose();
  });
});
