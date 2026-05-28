# 32 - Keyboard Shortcut Map (MVP)

This document defines the baseline keyboard shortcuts for Photrez MVP.

Shortcuts follow Photoshop-familiar conventions where applicable,
but Photrez reserves the right to diverge for unique product identity.

Reference: Existing implementation in `aplikasi-cetak-massal` studio.

## 1) Design Principles

1. Single-key shortcuts for tool switching (Photoshop convention).
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

## 3) Command Shortcuts

### File Operations

| Shortcut | Action | Notes |
| --- | --- | --- |
| `Ctrl+N` | New Document | Opens new document dialog |
| `Ctrl+O` | Open File | Opens file dialog |
| `Ctrl+S` | Save | Triggers save action |
| `Ctrl+Shift+S` | Save As / Export | Opens export dialog |
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
| `Ctrl+]` | Move Layer Up | In layer stack |
| `Ctrl+[` | Move Layer Down | In layer stack |
| `0-9` (no modifier) | Set Layer Opacity | `0` = 100%, `1` = 10%, ..., `9` = 90% |

### View Operations

| Shortcut | Action | Notes |
| --- | --- | --- |
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

## 4) Crop Tool Shortcuts

| Shortcut | Action | Notes |
| --- | --- | --- |
| `Enter` | Apply crop | |
| `Escape` | Cancel crop | Returns to Move tool |
| `X` (while crop active) | Swap crop width/height | |
| `Arrow Keys` | Nudge crop bounds | With Crop tool active |

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

## 7) Customization (Post-MVP)

- MVP uses hardcoded shortcuts only.
- Post-MVP: implement `ShortcutRegistry` pattern (see existing reference project).
- Post-MVP: allow user shortcut customization with conflict detection.

## 8) Change Control

- Adding or changing a shortcut requires updating this document first.
- Conflicts with existing shortcuts must be explicitly resolved.
- Reference: `docs/22-ui-style-guide.md` section 6 (keyboard and focus flow).
