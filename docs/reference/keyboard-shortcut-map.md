# 32 - Keyboard Shortcut Map (MVP)

This document defines the baseline keyboard shortcuts for Photrez MVP.

Shortcuts follow familiar desktop editor conventions where applicable,
but Photrez reserves the right to diverge for unique product identity.

## 1) Design Principles

1. Single-key shortcuts for tool switching.
2. `Ctrl+key` for commands (save, undo, selection, etc.).
3. `Shift+key` to cycle sub-tools within a tool group.
4. Modifier keys (`Space`, `Alt`, `Shift`) for temporary mode changes.
5. Shortcuts must not conflict with OS-level shortcuts on Windows.

## 2) Tool Shortcuts (Single Key)

| Key | Tool | Shift+Key (Cycle) |
| --- | --- | --- |
| `V` | Move | — |
| `M` | Rectangular Selection | Cycle: Rect → Ellipse (post-MVP) |
| `C` | Crop | — |
| `B` | Brush | — |
| `E` | Eraser | — |
| `I` | Eyedropper | — |
| `Z` | Zoom | — |
| `H` | Hand (Pan) | — |

### Temporary Mode Keys

| Key | Behavior | Notes |
| --- | --- | --- |
| `Space` (hold) | Temporary hand/pan mode | Release returns to previous tool |
| `Alt` (hold) | Eyedropper sample mode (while brush/eraser) | Context-dependent |
| `Shift` (hold) | Constrain movement/selection to axis | 45° snap for lines |
| `Shift` (hold during rotation) | Snap rotation to 15° increments | Quantizes rotation angle |
| `Escape` | Deselect layer / cancel transform | Clears selection and transform drag state |

## 3) Command Shortcuts

### File Operations

| Shortcut | Action | Notes |
| --- | --- | --- |
| `Ctrl+N` | New Document | Opens new document dialog |
| `Ctrl+O` | Open File | Opens file dialog |
| `Ctrl+S` | Save | Triggers save action |
| `Ctrl+Shift+S` | Save As / Export | Opens export dialog |
| `Ctrl+Alt+E` | Export… | Opens export dialog |
| `Ctrl+W` | Close Document | Blocked if unsaved changes (confirmation) |

### Edit Operations

| Shortcut | Action | Notes |
| --- | --- | --- |
| `Ctrl+Z` | Undo | Single step undo |
| `Ctrl+Shift+Z` | Redo | Alternative: `Ctrl+Y` |
| `Ctrl+X` | Cut | Cut selection to clipboard |
| `Ctrl+C` | Copy | Copy selection to clipboard |
| `Ctrl+V` | Paste | Paste as new layer |
| `Delete` / `Backspace` | Delete selection content | Fills with transparent |
| `Ctrl+Delete` | Fill selection with background color | |
| `Alt+Delete` | Fill selection with foreground color | |

### Selection Operations

| Shortcut | Action | Notes |
| --- | --- | --- |
| `Ctrl+A` | Select All | Selects entire canvas |
| `Ctrl+D` | Deselect | Clears selection |
| `Ctrl+Shift+I` | Invert Selection | |

### Layer Operations

| Shortcut | Action | Notes |
| --- | --- | --- |
| `Ctrl+Shift+N` | Add New Layer | |
| `Ctrl+J` | Duplicate Layer / Layer via Copy | If selection exists: Layer via Copy |
| `F2` | Rename Active Layer | Shows inline rename editor |
| `Ctrl+]` | Move Layer Up | In layer stack |
| `Ctrl+[` | Move Layer Down | In layer stack |
| `Ctrl+Shift+]` | Move Layer to Top | Brings layer to top of stack |
| `Ctrl+Shift+[` | Move Layer to Bottom | Sends layer to bottom of stack |
| `Ctrl+G` | Flip Horizontal | Flips selected layer horizontally |
| `Ctrl+Shift+G` | Flip Vertical | Flips selected layer vertically |
| `Ctrl+E` | Merge Down | Merges the active layer into the layer below |
| `Ctrl+Shift+Alt+E` | Stamp Visible | Composites all visible layers into a new top layer |
| `Ctrl+Shift+E` | Flatten Image | Flattens all document layers |
| `0-9` (no modifier) | Set Layer Opacity | `0` = 100%, `1` = 10%, ..., `9` = 90% |

### View Operations

| Shortcut | Action | Notes |
| --- | --- | --- |
| `Ctrl+Shift+T` | Toggle UI Panels | Hides/shows LeftToolRail, OptionBar, RightDock, StatusBar |
| `Ctrl+Shift+P` | Toggle Right Dock | Toggles only the right side panels |
| `Ctrl+=` / `Ctrl++` | Zoom In | Also: `Ctrl+ArrowUp` |
| `Ctrl+-` | Zoom Out | Also: `Ctrl+ArrowDown` |
| `Ctrl+0` | Fit to Screen | |

### Canvas Navigation

| Shortcut | Action | Notes |
| --- | --- | --- |
| `Arrow Keys` | Move layer/selection by 1px | With Move or Selection tool active |
| `Shift+Arrow Keys` | Move layer/selection by 10px | |
| `Escape` | Cancel current operation | Deactivate crop, close dialog, etc. |
| `Enter` | Commit current operation | Apply crop, commit transform, etc. |

### Brush/Eraser Shortcuts

| Shortcut | Action | Notes |
| --- | --- | --- |
| `[` | Decrease brush/eraser size | Step: 5px |
| `]` | Increase brush/eraser size | Step: 5px |
| `Shift+[` | Decrease brush hardness | Step: 10% |
| `Shift+]` | Increase brush hardness | Step: 10% |
| `X` | Swap foreground/background colors | |
| `D` | Reset colors to default (black/white) | |
| `Shift + Click` | Draw straight line from last painted point | Interpolates dabs between clicks |
| `Shift + Drag` | Constrain paint axis lock (horizontal/vertical) | Locks drawing direction to primary axis |
| `Alt` (hold) | Eyedropper color sampling | Temporarily samples color from canvas |

## 4) Crop Tool Shortcuts

| Shortcut | Action | Notes |
| --- | --- | --- |
| `Enter` | Apply crop | Applies crop frame to document |
| `Escape` | Cancel crop | Clears active crop box, stays in Crop tool |
| `X` (while crop active) | Swap crop width/height | Swaps custom ratio or size dimensions |
| `Arrow Keys` | Nudge crop bounds by 1px | Moves crop frame/image in viewport |
| `Shift+Arrow Keys` | Nudge crop bounds by 10px | Moves crop frame/image in viewport |
| `Ctrl+Z` / `Ctrl+Y` | Undo/Redo crop operations | Crop-local history stack for rect/transforms |

## 5) Reserved Shortcuts (Post-MVP)

These shortcuts are reserved for future features and must not be reassigned in MVP (UI button for Command Palette removed from toolbar — will be re-added when Layer B is implemented):

| Shortcut | Reserved For |
| --- | --- |
| `Ctrl+K` | Command Palette |
| `T` | Text Tool |
| `G` | Gradient / Fill Tool |
| `L` | Lasso Selection Tools |
| `W` | Quick Selection / Magic Wand |
| `S` | Clone Stamp |
| `J` | Healing Tools |
| `O` | Dodge / Burn / Sponge |
| `R` | Blur / Sharpen / Smudge |

## 6) Conflict Prevention Rules

- Do not bind `Ctrl+W` to close (prevent accidental window close in Tauri).
- Do not bind `F5`, `F11`, `F12` (OS/browser dev tools on Windows).
- Do not bind `Alt+F4` (OS-level close).
- Shortcuts must not fire when user is typing in text input or textarea.
- `Escape` always focuses the canvas container (blur active input first).
- `Tab` is reserved for default browser focus navigation (accessibility). UI panel toggle uses `Ctrl+Shift+T` instead.
- `Ctrl+Alt+E` for Export avoids conflict with `Ctrl+E` for Merge Down (canvas keyboard handler always wins for Ctrl+E).

## 7) Keyboard Registry (MVP)

The codebase uses a lightweight conflict-detection registry at
`src/components/editor/keyboardRegistry.ts` to prevent duplicate-shortcut bugs:

```typescript
registerShortcut("Ctrl+0", "useCanvasKeyboard");
// If another handler already registered "Ctrl+0":
// → console.warn("[KeyboardRegistry] Shortcut \"Ctrl+0\" already registered by: [useEditorCommands]")
```

### Architecture — Two keyboard handlers

Shortcuts are split across two hooks that both listen on `window.keydown`:

| Handler | Location | Scope |
|---|---|---|
| `useEditorCommands` | `AppTitleBar` (parent) | **Global commands** — file ops, zoom, undo/redo. Also wired to menu bar, context menu, and Tauri native menu. |
| `useCanvasKeyboard` | `CanvasViewport` (child) | **Canvas operations** — tool selection, layer ops, brush size, pan, crop shortcuts. |

Both hooks register `registerShortcut(...)` at the top of their `onMount` block.

### Intentional overlaps (chain-of-responsibility)

`Ctrl+Z` and `Ctrl+Y`/`Ctrl+Shift+Z` are handled by BOTH hooks intentionally:
1. `useCanvasKeyboard` tries transform/crop undo/redo first.
2. If the mini-stack is empty, it falls through (`e.defaultPrevented` is NOT set).
3. `useEditorCommands` then runs the global undo/redo.

### Adding a new shortcut

1. Update this document first (section 2-5).
2. Add the `registerShortcut(keys, owner)` call to the appropriate handler's `onMount` block.
3. If the shortcut is intentionally handled by both hooks (chain-of-responsibility), add an explicit `// intentional overlap` comment.
4. Run `bun run test` — the `keyboardRegistry.test.ts` unit tests verify conflict detection.

### Testing

- `keyboardRegistry.test.ts` — Unit tests for conflict warning, same-owner dedup, clear, snapshot.
- `CanvasKeyboardLayerShortcuts.test.tsx` — Integration tests for Ctrl+0 (keyboard path) and `dispatchEditorCommand('view.fit-canvas')` (menu path).
- All test files that mount keyboard hooks call `clearRegistry()` in `afterEach` to prevent cross-test pollution.

## 8) Change Control

- Adding or changing a shortcut requires updating this document first.
- Conflicts with existing shortcuts must be explicitly resolved.
