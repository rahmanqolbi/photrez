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
| ⬜ TODO      | Bitmap data per layer (pixel buffer)       |
| ⬜ TODO      | Layer drag-drop reorder di UI              |

---

## 🖱️ Selection + Move + Transform

| Status       | Fitur                                      |
| ------------ | ------------------------------------------ |
| ⬜ TODO      | Rectangular selection (marquee)            |
| ⬜ TODO      | Move selection/layer                       |
| ⬜ TODO      | Scale transform                            |
| ⬜ TODO      | Rotate transform                           |
| ⬜ TODO      | Flip (horizontal/vertical)                 |
| ⬜ TODO      | Transform handles UI                       |
| ⬜ TODO      | Commit/cancel transform                    |

---

## ✂️ Crop + Resize

| Status       | Fitur                                      |
| ------------ | ------------------------------------------ |
| ⬜ TODO      | Crop image (with bounds validation)        |
| ⬜ TODO      | Resize image/canvas                        |
| ⬜ TODO      | Aspect ratio lock toggle                   |
| ⬜ TODO      | Crop overlay/guide UI                      |

---

## 🖌️ Brush + Eraser

| Status       | Fitur                                      |
| ------------ | ------------------------------------------ |
| ⬜ TODO      | Brush stroke drawing                       |
| ⬜ TODO      | Eraser stroke                              |
| ⬜ TODO      | Size control                               |
| ⬜ TODO      | Opacity control                            |
| ⬜ TODO      | Hardness control                           |
| ⬜ TODO      | Cursor size preview                        |

---

## 📤 Export

| Status       | Fitur                                      |
| ------------ | ------------------------------------------ |
| ⬜ TODO      | Export JPG (quality setting)               |
| ⬜ TODO      | Export PNG                                 |
| ⬜ TODO      | Export WebP (quality setting)              |
| ⬜ TODO      | Export dialog UI                           |
| ⬜ TODO      | File save dialog (Tauri)                   |

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
| ✅ DONE      | Zoom in/out (UI buttons)                   |
| ✅ DONE      | Zoom level display (status bar)            |
| ⬜ TODO      | Zoom via scroll wheel                      |
| ⬜ TODO      | Pan canvas (hand tool / space+drag)        |
| ⬜ TODO      | Fit to screen                              |
| ⬜ TODO      | Pixel-level canvas rendering (wgpu)        |

---

## 🎨 Color

| Status       | Fitur                                      |
| ------------ | ------------------------------------------ |
| ✅ DONE      | Foreground & background color swatches UI  |
| ⬜ TODO      | Color picker dialog                        |
| ⬜ TODO      | Eyedropper tool                            |
| ⬜ TODO      | Swap fg/bg color                           |

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
| ⬜ TODO      | File open dialog                           |
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
| ✅ DONE      | Docked panel layout (no floating shadows)  |
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
| ⬜ TODO      | Unit tests (core crate)                    |
| ⬜ TODO      | Contract tests (IPC commands)              |
| ⬜ TODO      | Frontend tests                             |
