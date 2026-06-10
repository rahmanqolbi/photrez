# FEATURES.md — Photrez

> Update file ini setiap ada fitur baru yang selesai atau sedang dikerjakan.
> AI harus membaca file ini sebelum menyentuh kode apapun.
> Baca juga: `AI_CONTEXT.md` (aturan), `AI_CURRENT_TASK.md` (status), `AI_HISTORY.md` (riwayat), `ARCHITECTURE.md` (arsitektur)

---

## 🎨 Layer System

| Status       | Fitur                                      |
| ------------ | ------------------------------------------ |
| ✅ DONE      | Buat layer baru (via IPC command)          |
| ✅ DONE      | Hapus layer (guard: tidak bisa hapus terakhir, konfirmasi dialog) |
| ✅ DONE      | Reorder layer (z-index)                    |
| ✅ DONE      | Layer visibility toggle                    |
| ✅ DONE      | Layer locking                              |
| ✅ DONE      | Layer opacity (0.0–1.0)                    |
| ✅ DONE      | Layer rename                               |
| ✅ DONE      | Blend mode property (stored, Normal only MVP) |
| ✅ DONE      | Bitmap data per layer (pixel buffer)       |
| ✅ DONE      | MAX_PIXEL_BUDGET (256MB) memory limits    |
| ✅ DONE      | Layer reordering controls in UI (ChevronUp/Down) |
| ✅ DONE      | Duplicate layer (Deep-cloning, Ctrl+J support) |
| ✅ DONE      | Merge Down layer (Document space composite) |
| ✅ DONE      | Flatten All layers (Collapses layer stack)  |
| ✅ DONE      | Contextual layer creation (inserts above active) |
| ✅ DONE      | HTML5 Drag & Drop layer list reordering    |
| ✅ DONE      | Photoshop-style Opacity Popover Slider     |
| ✅ DONE      | Inline double-click renaming input         |
| ✅ DONE      | Live Canvas Row Thumbnails (checkerboard background) |

---

## 🖱️ Selection + Move + Transform

| Status       | Fitur                                      |
| ------------ | ------------------------------------------ |
| ✅ DONE      | Rectangular selection (marquee)            |
| ✅ DONE      | Move selection/layer                       |
| ✅ DONE      | Post-crop Move Tool enters clean no-selection state (selectedLayerId independent from activeLayerId) |
| ✅ DONE      | Scale transform (bounding box resize handles) |
| ✅ DONE      | Rotate transform (rotation handle drag)    |
| ✅ DONE      | Flip horizontal/vertical (buttons + Ctrl+G / Ctrl+Shift+G) |
| ✅ DONE      | Transform handles UI (8 resize + 1 rotation) |
| ✅ DONE      | Commit/cancel transform (ESC key deselect) |
| ✅ DONE      | Rotation angle snapping (15-degree with Shift) |
| ✅ DONE      | Move tool snapping — layer edges/centers + canvas edges/centers (5px threshold, nearest-wins per axis) |
| ✅ DONE      | Canvas edge snap boost — 12px threshold, priority 3 for canvas edges; 6px priority 2 for center lines; layer-to-layer stays 5px priority 1 |
| ✅ DONE      | Move tool Alt-key hold to disable snap       |
| ✅ DONE      | Move tool option bar — Auto Select + Snap toggles, editable X/Y/Rotate, display W/H, Flip, Reset |
| ✅ DONE      | Keyboard nudge (Arrow=1px, Shift+Arrow=10px) |
| ✅ DONE      | Canvas auto-select (click-to-select visible layer under cursor) |
| ✅ DONE      | Transform HUD (ΔX/ΔY, W/H/%, angle near cursor) |
| ✅ DONE      | HUD "snap" label when snap lines active       |
| ✅ DONE      | Dynamic rotate cursor (SVG data-URI, angle-based, cached per degree) |
| ✅ DONE      | Rotate broad hit area (outside-core + expanded bounds matching reference) |
| ✅ DONE      | Continuous hover tracking via detectHandle (updates every pointer move) |
| ✅ DONE      | Rotation normalization ([-180, 180] range matching reference) |
| ✅ DONE      | Move tool option bar visual polish (high-contrast active state for toggles) |
| ✅ DONE      | Auto-Select hovered target indicator readout badge |
| ✅ DONE      | Quick Canvas Alignment actions in Option Bar (Align left/center/right/top/middle/bottom) |

---

## ✂️ Crop + Resize

| Status       | Fitur                                      |
| ------------ | ------------------------------------------ |
| ✅ DONE      | Crop image (with bounds validation)        |
| ✅ DONE      | Resize image/canvas                        |
| ✅ DONE      | Resize canvas dialog + aspect ratio lock toggle |
| ✅ DONE      | Crop overlay/guide UI                      |
| ✅ DONE      | Interactive crop option bar (mode dropdown, editable ratio/size, guide overlay selector, delete toggle, swap W/H, reset/apply/cancel) |
| ✅ DONE      | Crop Fill BG — defaults to editor Background Color, supports crop-local custom color override, previews fill in Modern/Classic crop, and bakes fill into empty crop output areas on apply |
| ✅ DONE      | Crop box resize reactivity (overlay updates live during drag) |
| ✅ DONE      | Crop snapping — canvas edges/centers + layer edges (Smart Guides, Alt disables) |
| ✅ DONE      | Crop rotation — rotatable crop boundaries with screen-aligned visual box (canvas rotates behind), dynamic cursor, snap to 15° with Shift, angle readout, layer offset/rotation update, and local-axis resize after rotation |
| ✅ DONE      | Desktop-editor crop moving & panning — crop box remains stationary while canvas pans behind (move & resize), aligned with professional editor behavior |
| ✅ DONE      | Draw new crop box from scratch by click-dragging outside the current crop box |
| ✅ DONE      | Arrow-key crop nudge (1px, 10px with Shift) with viewport pan compensation and undo commit via `!e.repeat` guard |
| ✅ DONE      | Crop intermediate undo/redo — dedicated mini undo stack for crop rect |
| ✅ DONE      | Aspect ratio preset dropdown (12 common ratios + custom, auto-fit on select) |
| ✅ DONE      | Size mode unit conversion (px/cm/mm/in at 96 PPI) |
| ✅ DONE      | Rotate 90° buttons (↺ CCW / ↻ CW) in crop option bar |
| ✅ DONE      | Crop cancel stays in Crop tool (Esc/Cancel clears crop box without switching to Move) |
| ✅ DONE      | Crop interaction model — pasteboard click hides crop box, canvas click restores hidden crop box, drag from inside or outside canvas replaces crop box, double-click inside crop box applies crop |
| ✅ DONE      | Crop apply geometry hardening — independent X/Y target-size scaling and WebGL texture re-upload after destructive crop |
| ✅ DONE      | Crop apply viewport recentering — after crop commit, the new canvas/artboard is fitted back to the viewport center before renderer resize/upload |
| ✅ DONE      | Crop mode pasteboard panning guard — Space+drag navigation stays available while Crop tool is active |
| ✅ DONE      | Crop interaction modes — Modern (dedicated viewport-fixed centered frame; frame size tracks projected canvas bounds `docWidth × zoom × scale`, clamped by viewport; frame recomputes on zoom changes; resize clamps to projected bounds; drag/rotate transforms the image under the frame; rotation pivots around the rendered cropbox center in screen coordinates so the frame center stays visually pinned; apply uses the visual frame size and pivot rather than a rotated AABB and converts preview rotation to the crop engine convention so committed orientation matches the visual preview; drag/resize compensation stays screen-aligned under rotation; Shift/Alt/Shift+Alt resize modifiers match Classic Crop conventions where applicable; Enter applies, Esc cancels, Arrow/Shift+Arrow nudges image with undo commit, Ctrl+Z/Ctrl+Y/Ctrl+Shift+Z undo/redo; resize changes frame size from center; size mode preserves target aspect ratio during resize; dedicated undo/redo stack for frame/transform operations; state resets on tool exit to prevent transform leak; canvas click creates default centered frame; canvas drag creates frame sized to selection with WYSIWYG preview; image shifts so selection content aligns with viewport-centered frame) and Classic (document-space crop box can move/resize/rotate over static image; pasteboard click creates/hides rect) toggleable via option bar |
| ✅ DONE      | Ratio Pill Bar — Replace mode selector + preset dropdown with pill bar in Option Bar. Pills: Free, 1:1, 16:9, 4:3, 3:2, 21:9 + Custom. Spec: `docs/superpowers/specs/2026-06-09-ratio-pill-bar-design.md` |
| ⬜ DESIGN    | Smart Guides (Crop) — Snap to document edges, center, rule-of-thirds during drag-create |
| ⬜ DESIGN    | Center-Out Drag — Alt = center-out, Shift = square, Alt+Shift = both. Mid-drag modifier flip |
| ⬜ DESIGN    | Canvas Expansion — Directional expansion when crop frame > canvas. Auto-trigger, expand on apply |


---

## 🖌️ Brush + Eraser

| Status       | Fitur                                      |
| ------------ | ------------------------------------------ |
| ✅ DONE      | Brush stroke drawing                       |
| ✅ DONE      | Eraser stroke                              |
| ✅ DONE      | Brush and eraser separate settings (size, hardness, strength) |
| ✅ DONE      | Interactive BrushOptionBar with real setting controls |
| ✅ DONE      | Brush/eraser cursor preview reflects active size and hardness |
| ✅ DONE      | Brush/eraser active-size shortcuts (`[` / `]`) |
| ✅ DONE      | Paint blocked-state feedback for locked, hidden, and protected layers |
| ✅ DONE      | Soft edge rendering via radial gradient falloff |
| ✅ DONE      | Hard brush (hardness=100%) solid fill (no gradient) |
| ✅ DONE      | Cursor overlay accounts for viewport pan and zoom |
| ✅ DONE      | Cursor radius matches stroke at any zoom level |
| ✅ DONE      | Pointer cancel / lost capture commits partial stroke |
| ✅ DONE      | Document-to-layer-local coordinate conversion for transformed layers |
| ✅ DONE      | Flow control — per-dab alpha multiplier (opacity × flow, 0–100%) |
| ✅ DONE      | Smoothing engine — weighted moving average (PaintSmoother, 0–100 maps to 2–10 point window) |
| ✅ DONE      | Brush presets — Hard Round, Soft Round, Detail, Large Soft, Hard Eraser, Soft Eraser |
| ✅ DONE      | Preset tracking — independent brush/eraser preset ID, manual edit clears to "Custom" |
| ✅ DONE      | Enhanced option bar — Flow input, Smoothing input, Preset dropdown |
| ✅ DONE      | Right-click context menu — Size/Hardness/Strength sliders, preset grid, Reset button, close on Escape/outside click |
| ✅ DONE      | Keyboard shortcuts — `[`/`]` for size, Shift+`[`/`]` for hardness |

---

## 📤 Export

| Status       | Fitur                                      |
| ------------ | ------------------------------------------ |
| ✅ DONE      | Export JPG (quality setting)               |
| ✅ DONE      | Export PNG                                 |
| ✅ DONE      | Export WebP (quality setting)              |
| ✅ DONE      | Export dialog UI (format picker + quality slider) |
| ✅ DONE      | Export pipeline — composite → encode → write via Tauri |
| ✅ DONE      | Export button in RightDock                 |
| ✅ DONE      | Ctrl+S / Save shortcut opens export dialog |
| ✅ DONE      | Export compositing parity with renderer (layer order, opacity, transforms, blend modes via drawLayerToContext) |
| ✅ DONE      | E2E test: export dialog opens, format switch, quality slider |
| ✅ DONE      | E2E test: encodeComposite produces valid PNG/JPEG/WebP with correct headers/magic bytes |
| ✅ DONE      | E2E test: output dimensions match document, invisible layers excluded, transforms respected |
| ⬜ KNOWN LIMITATION | Blend mode parity: Canvas 2D globalCompositeOperation vs WebGL GLSL shader may differ slightly at alpha=0 or alpha=1 boundaries (pre-multiplied vs straight alpha edge cases). Visual difference is negligible for MVP. |
| ✅ DONE      | Rust unit tests: write_file_bytes creates file, read_file_bytes roundtrip, error handling (7 tests) |
| ✅ DONE      | E2E data flow test: encodeComposite → base64 → decode → byte-for-byte match + valid PNG image |
| ⬜ MANUAL    | Native save dialog UI + file-on-disk verification: run `pnpm tauri dev`, draw, Ctrl+S, save, open in external viewer |

---

## ↩️ History (Undo/Redo)

| Status       | Fitur                                      |
| ------------ | ------------------------------------------ |
| ✅ DONE      | Undo (Ctrl+Z)                              |
| ✅ DONE      | Redo (Ctrl+Y / Ctrl+Shift+Z)               |
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
| ✅ DONE      | Pixel-level canvas rendering (WebGL2 canvas) |
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
| ✅ DONE      | Live composition preview canvas in Navigator panel (scaled layer composite render) |
| ✅ DONE      | Interactive viewport frame (Red Box) representing visible artboard boundary |
| ✅ DONE      | Pointer-based drag-to-pan in Navigator (drag red box/click thumbnail to pan) |
| ✅ DONE      | Interactive Zoom Slider control in Navigator panel (with custom min/max bounds and quick +/- buttons) |
| ✅ DONE      | Navigator header 'maximize' button connected to Fit Screen action |

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
| ✅ DONE      | Crop overlay dengan mask shield + 8 handles + corner brackets + interactive resize/move (+ guide lines: thirds/grid/diagonal/golden) |
| ✅ DONE      | Crop mode Free (corner free by default, Shift = lock aspect) |
| ✅ DONE      | Crop mode Ratio (aspect-locked corner, Shift = free) + editable aspect W/H |
| ✅ DONE      | Crop mode Size (target W/H constraint, Shift = free) + editable target W/H + Apply resizes canvas |
| ✅ DONE      | Delete Cropped Pixels toggle (ON = destructive bitmap crop, OFF = offset-based) |
| ✅ DONE      | Crop Enter/Esc keyboard shortcuts |
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
| ✅ DONE      | Frontend tests — 762 passing tests (52 files) |
| ✅ DONE      | M6 Perf Gate (all metrics PASS)            |
| ✅ DONE      | Native Vite tsconfig paths (removed `vite-tsconfig-paths` plugin) |
| ✅ DONE      | Release candidate (MSI + NSIS installers)  |
---

## Maintenance / Architecture Planning

| Status | Item |
| ------ | ---- |
| DONE | Brush and Eraser tool improvement plan created: `docs/superpowers/plans/2026-06-06-brush-eraser-tool-improvements.md` |
| DONE | Crop Hidden Preview Restore correction plan created: `docs/superpowers/plans/2026-06-05-crop-interaction-model-plan.md` |
| DONE | Scalability and maintainability refactor plan created: `docs/plans/2026-06-04-scalability-maintainability-refactor-plan.md` |
