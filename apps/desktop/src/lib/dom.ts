export function isEditableTarget(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) return false;

  // lets Ctrl+Z/Y work while a slider retains focus after dragging.
  return Boolean(
    target.closest("input:not([type='range']), textarea, select, [contenteditable='true']"),
  );
}

/** Returns true when an `aria-modal="true"` dialog is open in the DOM.
 * Window-level keyboard handlers should bail early when a modal is open
 * to prevent shortcuts (Delete, Ctrl+Z, tool switches, etc.) from
 * leaking through the dialog to the canvas underneath. */
export function isModalOpen(): boolean {
  return !!document.querySelector('[aria-modal="true"]');
}

/** Yield to the event loop so the browser can paint pending UI updates
 * (spinner, toast) before a CPU-bound operation. */
export function tick(): Promise<void> {
  return new Promise((r) => setTimeout(r, 0));
}
