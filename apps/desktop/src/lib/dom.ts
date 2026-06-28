export function isEditableTarget(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) return false;

  // ponytail: <input type="range"> is not a text-editable target — excluding it
  // lets Ctrl+Z/Y work while a slider retains focus after dragging.
  return Boolean(
    target.closest("input:not([type='range']), textarea, select, [contenteditable='true']"),
  );
}
