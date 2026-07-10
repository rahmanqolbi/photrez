/**
 * Lightweight keyboard shortcut registry.
 *
 * Detects when two or more hooks register the same shortcut, preventing the
 * duplicate-handler bug that affected Ctrl+0 (registered by both
 * useEditorCommands and useCanvasKeyboard).
 *
 * Usage — call once per shortcut at registration/init time:
 *   registerShortcut("Ctrl+0", "useCanvasKeyboard");
 *
 * Intentional overlaps (e.g. Ctrl+Z handled by useCanvasKeyboard for
 * transform undo with fallthrough to useEditorCommands for global undo) are
 * explicitly acknowledged by passing `{ intentional: true }` — no warning.
 * Unacknowledged overlaps (potential bugs) still warn.
 */

const registry = new Map<string, string[]>();

/**
 * Register a keyboard shortcut.
 * @param keys — Human-readable key combo, e.g. "Ctrl+Z", "B", "Ctrl+Shift+T"
 * @param owner — Name of the hook/component that owns this shortcut
 * @param options — Optional. `{ intentional: true }` suppresses the conflict
 *                  warning for deliberately overlapping shortcuts (e.g.
 *                  capture-phase canvas handler with bubble-phase fallthrough).
 */
export function registerShortcut(
  keys: string,
  owner: string,
  options?: { intentional?: boolean },
): void {
  const existing = registry.get(keys);
  if (existing && !existing.includes(owner)) {
    if (!options?.intentional) {
      console.warn(
        `[KeyboardRegistry] Shortcut "${keys}" already registered by: [${existing.join(", ")}] — now also registered by: "${owner}". ` +
        `If this is intentional (e.g. chain-of-responsibility pattern), pass { intentional: true } to registerShortcut.`
      );
    }
  }
  registry.set(keys, [...new Set([...(existing || []), owner])]);
}

/** Clear all registered shortcuts (useful in tests). */
export function clearRegistry(): void {
  registry.clear();
}

/** Return a snapshot of the current registry (read-only copy). */
export function getRegistry(): ReadonlyMap<string, readonly string[]> {
  return new Map(registry);
}
