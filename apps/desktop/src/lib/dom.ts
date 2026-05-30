export function isEditableTarget(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) return false;

  return Boolean(
    target.closest("input, textarea, select, [contenteditable='true']"),
  );
}
