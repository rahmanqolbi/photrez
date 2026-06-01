# FEATURES.md — Photrez

> Update file ini setiap ada fitur baru yang selesai atau sedang dikerjakan.
> AI harus membaca file ini sebelum menyentuh kode apapun.
> Baca juga: `AI_CONTEXT.md` (aturan), `AI_CURRENT_TASK.md` (status), `AI_HISTORY.md` (riwayat), `ARCHITECTURE.md` (arsitektur)

---

## 🎨 Layer System

| Status       | Fitur                                      |
| ------------ | ------------------------------------------ |
| ✅ DONE      | Buat layer baru (via IPC command)          |
| ✅ DONE      | Hapus layer (guard: tidak bisa hapus terakhir) |
| ✅ DONE      | Reorder layer (z-index)                    |
| ✅ DONE      | Layer visibility toggle                    |
| ✅ DONE      | Layer locking                              |
| ✅ DONE      | Layer opacity (0.0–1.0)                    |
| ✅ DONE      | Layer rename                               |
| ✅ DONE      | Blend mode property (stored, Normal only MVP) |
| ✅ DONE      | Bitmap data per layer (pixel buffer)       |
| ✅ DONE      | MAX_PIXEL_BUDGET (256MB) memory limits    |
| ✅ DONE      | Layer reordering controls in UI (ChevronUp/Down) |

---

## 🖱️ Selection + Move + Transform

| Status       | Fitur                                      |
| ------------ | ------------------------------------------ |
| ✅ DONE      | Rectangular selection (marquee)            |
| ✅ DONE      | Move selection/layer                       |
| ✅ DONE      | Scale transform (bounding box resize handles) |
| ✅ DONE      | Rotate transform (rotation handle drag)    |
| ✅ DONE      | Flip horizontal/vertical (buttons + Ctrl+G / Ctrl+Shift+G) |
| ✅ DONE      | Transform handles UI (8 resize + 1 rotation) |
| ✅ DONE      | Commit/cancel transform (ESC key deselect) |
| ✅ DONE      | Rotation angle snapping (15-degree with Shift) |
| ✅ DONE      | Move tool snapping — layer edges/centers + canvas edges/centers (5px threshold, nearest-wins per axis) |
| ⬜ TODO      | Move tool Alt-key hold to disable snap       |

---

## ✂️ Crop + Resize

| Status       | Fitur                                      |
| ------------ | ------------------------------------------ |
| ✅ DONE      | Crop image (with bounds validation)        |
| ✅ DONE      | Resize image/canvas                        |
| ⬜ TODO      | Aspect ratio lock toggle                   |
| ✅ DONE      | Crop overlay/guide UI                      |

---

## 🖌️ Brush + Eraser

| Status       | Fitur                                      |
| ------------ | ------------------------------------------ |
| ✅ DONE      | Brush stroke drawing                       |
| ✅ DONE      | Eraser stroke                              |
| ✅ DONE      | Size control                               |
| ✅ DONE      | Opacity control                            |
| ✅ DONE      | Hardness control                           |
| ✅ DONE      | Cursor size preview                        |

---

## 📤 Export

| Status       | Fitur                                      |
| ------------ | ------------------------------------------ |
| ✅ DONE      | Export JPG (quality setting)               |
| ✅ DONE      | Export PNG                                 |
| ✅ DONE      | Export WebP (quality setting)              |
| ✅ DONE      | Export dialog UI                           |
| ✅ DONE      | File save dialog (Tauri)                   |

---

## ↩️ History (Undo/Redo)

| Status       | Fitur                                      |
| ------------ | ------------------------------------------ |
| ✅ DONE      | Undo (Ctrl+Z)                              |
| ✅ DONE      | Redo (Ctrl+Y)                              |
| ✅ DONE      | Snapshot-based history (max 50)            |
| ✅ DONE      | Redo branch discard on new mutation        |
| ⬜ TODO      | History panel UI (list of operations)      |

---

## 🖼️ Viewport

| Status       | Fitur                                      |
| ------------ | ------------------------------------------ |
| ✅ DONE      | Zoom in/out (scroll wheel + keyboard shortcuts, slider removed) |
| ✅ DONE      | Zoom level display (status bar)            |
| ✅ DONE      | Zoom via scroll wheel (Ctrl+scroll)        |
| ✅ DONE      | Pan canvas (Space+drag)                    |
| ✅ DONE      | Fit to screen (Ctrl+0)                     |
| ✅ DONE      | Pixel-level canvas rendering (wgpu canvas) |
| ✅ DONE      | On-demand rendering (dirty flag system)    |
| ✅ DONE      | CSS transform viewport (GPU-accelerated)  |
| ✅ DONE      | Hover highlight (purple outline)           |
| ✅ DONE      | Smart guides (magenta snap lines)          |
| ✅ DONE      | Brush cursor overlay (size preview)        |
| ✅ DONE      | Handle-aware cursor resolver               |
| ✅ DONE      | Crop overlay with composition guides       |
| ✅ DONE      | Crop mode indicator bar                    |
| ✅ DONE      | Dimension tooltip (px/in/cm/mm)            |
| ✅ DONE      | Transformation HUD near cursor             |
| ✅ DONE      | Status bar tool hints + zoom readout       |
| ✅ DONE      | HiDPI/Retina sharpness (canvas pixel buffer = docW × zoom × dpr) |
| ✅ DONE      | Smooth zoom (150ms tween) + snap fit-to-screen (instant) |
| ✅ DONE      | View matrix bug fix (documentSize, not canvasSize) |
| ✅ DONE      | Cursor style reactive binding (style:cursor for Space-grab visual feedback) |
| ✅ DONE      | Cursor imperative sync (createEffect for guaranteed reactivity in canvas) |
| ✅ DONE      | SelectionTransformOverlay navigation mode (pointer-events-none + cursor pass-through when Space held) |
| ✅ DONE      | Unit test: getRenderState returns documentSize matching model |

---

## 🎨 Color

| Status       | Fitur                                      |
| ------------ | ------------------------------------------ |
| ✅ DONE      | Foreground & background color swatches UI  |
| ✅ DONE      | Color picker dialog                        |
| ✅ DONE      | Eyedropper tool                            |
| ✅ DONE      | Swap fg/bg color (interaktif, hotkey X/D)  |

---

## 🪟 Desktop Shell (Tauri 2)

| Status       | Fitur                                      |
| ------------ | ------------------------------------------ |
| ✅ DONE      | Custom title bar                           |
| ✅ DONE      | Window controls (minimize/maximize/close)  |
| ✅ DONE      | Menu bar (File/Edit/View/Window/Help)      |
| ✅ DONE      | File menu dropdown                         |
| ✅ DONE      | Status bar (dimensions, cursor pos, zoom, RAM) |
| ✅ DONE      | Tauri bridge IPC (`invoke` → `#[tauri::command]`) |
| ✅ DONE      | Response envelope contract (v1.0.0)        |
| ✅ DONE      | File open dialog (Ctrl+O)                  |
| ⬜ TODO      | Native menu integration                    |
| ⬜ TODO      | Window state persistence (size/position)   |

---

## 🎯 UI / Design System

| Status       | Fitur                                      |
| ------------ | ------------------------------------------ |
| ✅ DONE      | Photon Amber accent (#E15A17)              |
| ✅ DONE      | Zero-tint neutral gray surfaces            |
| ✅ DONE      | Tool Rail (Raw Pro with mechanical dividers) |
| ✅ DONE      | Inspector panel (properties + tabs)        |
| ✅ DONE      | Studio input styling (inset depth)         |
| ✅ DONE      | Range slider (Photon Amber thumb)          |
| ✅ DONE      | Panel headers                              |
| ✅ DONE      | Modular Hardware Chassis layout (rounded + gap-1.5) |
| ✅ DONE      | Visual De-cluttering & Airy/Lightweight UI Polishing |
| ✅ DONE      | Flush-Left Anchor active tool indicator (Option A) |
| ✅ DONE      | Segmented Transform matrix coordinate grid (Figma-style) |
| ✅ DONE      | macOS-style Segmented Tab Bar (Pill tabs) & Unified Properties |
| ✅ DONE      | Right Inspector Recessed Compartments (Idea A sunken well) |
| ✅ DONE      | Mockup UI Slicing (Compact, Flat Docked 5x3 Grid, Photon Amber) |
| ✅ DONE      | Titlebar Reference Matching (hamburger, photrez brand spacing, right action separator) |
| ✅ DONE      | LeftToolRail Reference Matching (continuous stack, monochrome active, ellipsis button) |
| ✅ DONE      | photrez High-Fidelity Reference Slice (static SolidJS shell, exact 5x3 grid, fjord image viewport) |
| ✅ DONE      | Style Guide & Design Tokens Synchronization (Tailwind v4, OKLCH, double-dock layout, custom sliders) |
| ✅ DONE      | UI/UX Polish: Diagonal Swatches, Tab Typography & LeftToolRail layout |
| ⬜ TODO      | Context menu                               |
| ⬜ TODO      | Tooltip system                             |
| ⬜ TODO      | Dialog system (modal)                      |

---

## 🔧 Infrastructure

| Status       | Fitur                                      |
| ------------ | ------------------------------------------ |
| ✅ DONE      | Monorepo (pnpm workspace)                  |
| ✅ DONE      | Tauri 2 desktop app                        |
| ✅ DONE      | SolidJS + TypeScript + Vite                |
| ✅ DONE      | Rust workspace (core + render crates)      |
| ✅ DONE      | Tailwind CSS v4                            |
| ✅ DONE      | Documentation suite (37+ docs)             |
| ⬜ TODO      | CI pipeline (GitHub Actions)               |
| ✅ DONE      | Unit tests (core crate) — 69 tests         |
| ✅ DONE      | Contract tests (IPC commands) — 13 tests   |
| ✅ DONE      | Frontend tests — 110 passing tests + 4 input-handler snap wiring tests intentionally red pending Task 4 |
| ✅ DONE      | M6 Perf Gate (all metrics PASS)            |
| ✅ DONE      | Release candidate (MSI + NSIS installers)  |
