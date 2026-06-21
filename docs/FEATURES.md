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
| ✅ DONE      | Layer row context menu — target activation, new/duplicate/rename, visibility, lock, ordering, merge/flatten, and guarded delete |
| ✅ DONE      | Photoshop-style Opacity Popover Slider     |
| ✅ DONE      | Inline double-click renaming input         |
| ✅ DONE      | Live Canvas Row Thumbnails (checkerboard background) |
| ✅ DONE      | Canvas checkerboard pattern (transparent-pixel indicator behind layers — Photopea-style light/dark gray grid, always on, no toggle) |
| ✅ DONE      | Layer keyboard shortcuts — Ctrl+Shift+N (new layer), Ctrl+J (duplicate), Ctrl+E / Ctrl+Shift+E (merge down / flatten), Ctrl+] / Ctrl+[ (move up / down stack), Ctrl+G / Ctrl+Shift+G (flip H / V), Delete / Backspace (delete active layer), 0–9 (set opacity, 0=100%) |

---

## 🖱️ Selection + Move + Transform

| Status       | Fitur                                      |
| ------------ | ------------------------------------------ |
| ✅ DONE      | Rectangular selection (marquee)            |
| ✅ DONE      | True inverted selection — canvas-minus-rectangle state, complement-aware cut/copy/delete, dual-boundary marquee, and authoritative engine-to-viewport synchronization |
| ✅ DONE      | Selection draw with Shift (constrain square) and Alt (draw from center) modifiers |
| ✅ DONE      | Move selection boundary (click+drag inside marquee) |
| ✅ DONE      | Rotate selection marquee (rotation handle drag) |
| ✅ DONE      | Selection OptionBar — editable X/Y/W/H/Angle, Invert, Deselect buttons |
| ✅ DONE      | Selection keyboard shortcuts — Ctrl+D (deselect), Ctrl+I (invert), Ctrl+T (transform toggle), Ctrl+X (cut), Ctrl+C (copy), Ctrl+V (paste), Delete/Backspace (delete pixels), Escape (cancel) |
| ✅ DONE      | Selection cut/copy/paste/delete (real pixel ops on active layer — in-memory clipboard; cut=copy+clear, delete=clear pixels, paste=creates new "Pasted Layer") |
| ✅ DONE      | Selection option bar — Cut / Copy / Paste / Delete buttons in addition to Invert / Deselect |
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
| ✅ DONE      | Transform HUD fixed screen-size metrics during zoom (resize W/H tooltip does not scale with viewport zoom) |
| ✅ DONE      | HUD "snap" label when snap lines active       |
| ✅ DONE      | Dynamic rotate cursor (SVG data-URI, angle-based, cached per degree) |
| ✅ DONE      | Rotate broad hit area (outside-core + expanded bounds matching reference) |
| ✅ DONE      | Continuous hover tracking via detectHandle (updates every pointer move) |
| ✅ DONE      | Rotation normalization ([-180, 180] range matching reference) |
| ✅ DONE      | Move tool option bar visual polish (high-contrast active state for toggles) |
| ✅ DONE      | Pasteboard click deselect — clicking outside artboard deselects active layer (handles SVG overlay z-index 40 and full-viewport WebGL canvas targets, works at all zoom levels) |
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
| ✅ DONE      | Crop Fill BG — defaults to editor Background Color, supports crop-local custom color override, previews fill in Modern/Classic crop (with viewport panning support in both modes), and bakes fill into empty crop output areas on apply |
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
| ✅ DONE      | Ratio Dropdown Selector — Unified presets dropdown (Free, custom, size, lock shape, recents, presets) with Swap button repositioned between W & H input fields. |
| ✅ DONE      | Smart Guides (Crop) — Snap to document edges, center, rule-of-thirds during drag-create + cyan dashed snap lines (Classic + Modern) |
| ✅ DONE      | Center-Out Drag — Alt = center-out (compensation=0, center stays fixed), Shift = square, Alt+Shift = both. Mid-drag modifier flip. Classic and Modern both verified + 9 regression tests |
| ✅ DONE      | Modern mode pasteboard drag-create — drag from outside canvas creates new crop frame in Modern mode. SVG overlay clicks routed to drag handler. Crosshair cursor on pasteboard when no frame |
| ✅ DONE      | Modern mode frame can exceed canvas bounds — `clampFrameToProjectedBounds` no longer caps at projected canvas size. Frame dimensions from viewport selection preserved (min size enforced). Enables canvas expansion workflow |
| ✅ DONE      | Modern mode drag-create clears existing frame — frame removed once drag exceeds threshold, providing clear visual feedback that a new crop is being created |
| ✅ DONE      | Canvas Expansion — Directional expansion when crop frame > canvas. Auto-trigger, expand on apply. Engine handles negative x/y crop rects (+ fill bg). Visual indicator: dashed canvas boundary + subtle expansion fill in frame overlay. Tested with fill/transparent expansion |
| ✅ DONE      | Viewport-Aware Crop Frame Position — Modern crop frame moves along with viewport during scroll, pan, shift+scroll, space+drag, and momentum. Frame position stored explicitly in `{x,y,w,h}`. Reset via fit-to-screen recenters frame. Cancel/reset restores centered position |

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
| ✅ DONE      | Soft edge rendering via deterministic per-pixel distance-field alpha mask (within-stroke max-alpha, no accumulation, bounds-clipped) |
| ✅ DONE      | Brush-tip mask engine replacement for faster editor-like soft brush UX |
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
| ✅ DONE      | Brush visual calibration: Photoshop-like hardness 0 soft-round profile with broader dense center, dense soft spacing, subpixel bilinear stamping, opacity/flow-independent alpha scale, and pixel-profile regression tests |
| ✅ DONE      | Photoshop-style hardness falloff — brush/eraser size remains the fixed outer diameter; hardness controls the fully opaque core and feather rim width inside that diameter |
| ✅ DONE      | Fixed brush/eraser footprint — every hardness uses the exact displayed Size radius; softness is contained inside the cursor circle |
| ✅ DONE      | Inverse-quadratic soft feather — after the hardness-defined solid core, alpha follows `1 - t²` to the fixed zero-alpha Size boundary so the visible feather fills more of the cursor without expanding its footprint |
| ✅ DONE      | Brush hardness curve retune — hardness 0 uses a lighter airier radial fade, while 80% hardness maps to a larger solid body with a narrow Photoshop-like feather rim |
| ✅ DONE      | Alt-Hold Eyedropper modifier for sampling colors from active canvas |
| ✅ DONE      | Shift-Click Straight Lines interpolation connecting last painted dab |
| ✅ DONE      | Shift-Drag Axis Locking constraining stroke to horizontal/vertical |
| ✅ DONE      | Regression guard: Brush/Eraser still paint/erase after Move Tool pasteboard deselect hides the transform box |
| ✅ DONE      | Photoshop-style brush behavior — 25% × size dab spacing (visible individual dabs), hardness 100% routes through the mask engine (no `ctx.lineCap=round` shortcut), and per-dab pre-multiplied source-over accumulation so opacity/flow behave like Photoshop (multiple passes darken toward saturation) |
| ✅ DONE      | Editor-style bounded soft round mask — smoothstep core+feather model with a fixed support radius; hardness changes the solid core and feather width without changing geometric area |
| ✅ DONE      | Brush cursor-paint alignment — the sharp cursor circle marks the exact support boundary; soft alpha reaches zero at that boundary with only subpixel antialiasing on the boundary sample |
| ✅ DONE      | Photoshop-style full-size brush cursor (experimental) — earlier tried an SVG soft filled circle (radial gradient matching the brush alpha profile) but reverted to a simple sharp stroke because the soft fill caused color-inversion artifacts (mix-blend-mode: difference) on the canvas. The paint behavior alone matches the brush size and feather profile, so the cursor just marks the boundary. |

---

## 🖱️ Drag & Drop

| Status       | Fitur                                      |
| ------------ | ------------------------------------------ |
| ✅ DONE      | Drag layer between documents (Copy default, Alt = Move) |
| ✅ DONE      | Hover-to-switch document tab (500ms with countdown) |
| ✅ DONE      | Canvas layer drag to document tab freezes at the last dragged visual position while waiting for hover-to-switch, with cleanup restore on cancel/copy |
| ✅ DONE      | Drop image file from OS (Tauri 2 onDragDropEvent) |
| ✅ DONE      | Multi-file cascade (24px offset) |
| ✅ DONE      | Context-sensitive drop zones (tab/canvas/layers-panel/tab-empty/outside) |
| ✅ DONE      | Minimal toast notification system |

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
| ✅ DONE | Blend mode parity gate: UI exposes only the typed MVP registry (`Normal`, `Multiply`, `Screen`, `Overlay`), export compositing uses the same registry mapping, and unsupported shader-only modes are blocked until parity tests exist (`docs/reference/render-export-parity-matrix.md`). |
| ✅ DONE      | Rust unit tests: write_file_bytes creates file, read_file_bytes roundtrip, error handling (7 tests) |
| ✅ DONE      | E2E data flow test: encodeComposite → base64 → decode → byte-for-byte match + valid PNG image |
| ✅ RELEASE GATE | Native Tauri smoke checklist for app launch, OS drag/drop, cross-doc drag, native export/save, cancel export, and window controls: `docs/faang-review-rejections/2026-06-18-native-runtime-smoke-checklist.md` |

---

## ↩️ History (Undo/Redo)

| Status       | Fitur                                      |
| ------------ | ------------------------------------------ |
| ✅ DONE      | Undo (Ctrl+Z)                              |
| ✅ DONE      | Redo (Ctrl+Y / Ctrl+Shift+Z)               |
| ✅ DONE      | Snapshot-based history (max 50)            |
| ✅ DONE      | Redo branch discard on new mutation        |
| 🗓️ PLANNED (POST-MVP) | History panel UI (list of operations)      |

---

## 🖼️ Viewport

| Status       | Fitur                                      |
| ------------ | ------------------------------------------ |
| ✅ DONE      | Zoom in/out (Ctrl+wheel + keyboard shortcuts, 1.25x in / 0.8x out, slider removed) |
| ✅ DONE      | Zoom level display (status bar)            |
| ✅ DONE      | Zoom via scroll wheel (Ctrl+scroll)        |
| ✅ DONE      | Pan canvas (Space+drag)                    |
| ✅ DONE      | Fit to screen (Ctrl+0, instant viewport reset) |
| ✅ DONE      | Pixel-level canvas rendering (WebGL2 canvas) |
| ✅ DONE      | On-demand rendering (dirty flag system)    |
| ✅ DONE      | WebGL2 projection-matrix-driven camera viewport with recovered reactive overlay alignment |
| ✅ DONE      | WebGL final-pass document clipping — transformed layer pixels are clipped to artboard/document bounds |
| ✅ DONE      | Overlay container migrated to screen-space positioning — last general-path CSS transform wrapper removed; 2D brush preview canvas + artboard border now use explicit `left/top/width/height` for pan/zoom. Phase 1 of 3-phase recovery from the original GPU smooth zoom migration. Modern Crop CSS path and animation smoothness remain as documented future phases. |
| ✅ DONE      | Pointer-anchored instant scroll wheel zoom (no transition delay, pixel-accurate) |
| ✅ DONE      | Brush cursor overlay (size preview)        |
| ✅ DONE      | Handle-aware cursor resolver               |
| ✅ DONE      | Crop overlay with composition guides       |
| ✅ DONE      | Crop mode indicator bar                    |
| ✅ DONE      | Dimension tooltip (px/in/cm/mm)            |
| ✅ DONE      | Transformation HUD near cursor             |
| ✅ DONE      | Status bar tool hints + zoom readout       |
| ✅ DONE      | HiDPI/Retina sharpness (canvas pixel buffer = docW × zoom × dpr) |
| ✅ DONE      | Snappy, instant zoom & tool switching (keyboard zoom and Ctrl+0 are immediate; no CSS transition delay/jiggle) |
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
| ✅ DONE      | E2E regression coverage for Move Tool transform box alignment after fit-to-screen, keyboard zoom, and Space+drag pan |

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
| ✅ DONE      | Functional custom dropdown menus (File/Edit/Image/Layer/View/Window/Help) |
| ✅ DONE      | Selection-aware Edit menu and history-safe Layer menu operations |
| ✅ DONE      | Accessible menu lifecycle (keyboard, focus restore, click-outside, disabled states) |
| ✅ DONE      | Status bar (dimensions, cursor pos, zoom, RAM) |
| ✅ DONE      | Tauri bridge IPC (`invoke` → `#[tauri::command]`) |
| ✅ DONE      | Response envelope contract (v2.0.0 Tauri shell runtime: ping, contract info, file read/write) |
| ✅ DONE      | File open dialog (Ctrl+O)                  |
| ✅ DONE      | Native menu integration (mirrors custom menu; shared command routing) |
| ✅ DONE      | Window state persistence (size/position/maximized, manual core-API impl in `main.rs`) |

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
| ✅ DONE      | Docked Precision layout (panels flush to window edges, inner rounding only) |
| ✅ DONE      | Responsive RightDock layout (stacks vertically below 1024px to preserve canvas, side-by-side columns above 1024px) |
| ✅ DONE      | Visual De-cluttering & Airy/Lightweight UI Polishing |
| ✅ DONE      | Flush-Left Anchor active tool indicator (Option A) |
| ✅ DONE      | Segmented Transform matrix coordinate grid (Figma-style) |
| ✅ DONE      | Segmented Tab Bar (Pill tabs) & Unified Properties |
| ✅ DONE      | Right Inspector Recessed Compartments (Idea A sunken well) |
| ✅ DONE      | Mockup UI Slicing (Compact, Flat Docked 5x3 Grid, Photon Amber) |
| ✅ DONE      | Titlebar Reference Matching (hamburger, photrez brand spacing, right action separator) |
| ✅ DONE      | LeftToolRail Reference Matching (continuous stack, monochrome active, ellipsis button) |
| ✅ DONE      | photrez High-Fidelity Reference Slice (static SolidJS shell, exact 5x3 grid, fjord image viewport) |
| ✅ DONE      | Style Guide & Design Tokens Synchronization (Tailwind v4, OKLCH, double-dock layout, custom sliders) |
| ✅ DONE      | Root DESIGN.md — Precision Workbench visual contract + machine-readable Impeccable sidecar |
| ✅ DONE      | UI/UX Polish: Diagonal Swatches, Tab Typography & LeftToolRail layout |
| ✅ DONE      | Crop overlay dengan mask shield + 8 handles + corner brackets + interactive resize/move (+ guide lines: thirds/grid/diagonal/golden) |
| ✅ DONE      | Crop mode Free (corner free by default, Shift = lock aspect) |
| ✅ DONE      | Crop mode Ratio (aspect-locked corner, Shift = free) + editable aspect W/H |
| ✅ DONE      | Crop mode Size (target W/H constraint, Shift = free) + editable target W/H + Apply resizes canvas |
| ✅ DONE      | Delete Cropped Pixels toggle (ON = destructive bitmap crop, OFF = offset-based) |
| ✅ DONE      | Crop Enter/Esc keyboard shortcuts |
| ✅ DONE      | General accessible context menu system — reusable clamped surface, keyboard focus/navigation, canvas actions, layer actions, and preserved Brush/Eraser settings menu |
| ✅ DONE      | Accessible Tooltip System with keyboard focus, hover delay, warm start, and custom shortcuts |
| ✅ DONE      | Precision Workbench dialog system — shared confirm/alert API, safe destructive focus, menu focus restoration, and automated browser QA |

---

## 🔧 Infrastructure

| Status       | Fitur                                      |
| ------------ | ------------------------------------------ |
| ✅ DONE      | Monorepo (pnpm workspace)                  |
| ✅ DONE      | Tauri 2 desktop app                        |
| ✅ DONE      | SolidJS + TypeScript + Vite                |
| ✅ DONE      | Rust workspace (core + render crates)      |
| ✅ DONE      | Tailwind CSS v4                            |
| ✅ DONE      | Restructured documentation suite (organized into spec/, reference/, decisions/) |
| ✅ DONE      | CI pipeline (GitHub Actions: type-check, lint, frontend tests, build, browser E2E, Rust tests, dependency audit) |
| ✅ DONE      | Unit tests (core crate) — 85 tests, 92 workspace total |
| ✅ DONE      | Desktop shell contract tests — 8 Tauri command tests |
| ✅ DONE      | Frontend tests — 1297 passing tests (92 files), latest recorded 2026-06-21 |
| ✅ DONE      | Split Vitest feedback paths — 783 pure-Node tests (~6.5s), 478 isolated jsdom tests, full 1261-test gate 37.48s (83.6% faster than 228.33s baseline) |
| ✅ DONE      | E2E browser tests — 23 Playwright tests, including dialog screenshots and keyboard/focus contracts |
| ✅ DONE      | E2E visible-pixel sampling compatible with `preserveDrawingBuffer: false` — checkerboard, brush/eraser, and selection undo/redo tests sample composited screenshots instead of an undefined default WebGL framebuffer |
| ✅ DONE      | M6 Perf Gate (all metrics PASS)            |
| ✅ DONE      | Native Vite tsconfig paths (removed `vite-tsconfig-paths` plugin) |
| ✅ DONE      | Release candidate (MSI + NSIS installers)  |
---

## Maintenance / Architecture Planning

| Status | Item |
| ------ | ---- |
| PLANNED | Post-MVP UI backlog preserved with entry gates and delivery order: `docs/plans/2026-06-20-post-mvp-ui-backlog.md` |
| PARTIAL | Native Tauri release smoke evidence: NATIVE-001 launch passed with retry warning; NATIVE-002 through NATIVE-007 remain pending interactive verification |
| DONE | FAANG review pointer capture helper: canvas pointer tools now use shared safe capture/release helpers with focused pointer regression tests |
| DONE | FAANG review paint command boundary: brush/eraser bitmap commits now share `commitPaintBitmap()` for history snapshot, engine mutation, texture upload, and render scheduling |
| DONE | FAANG review paint history budget gate: `perf:paint-history` now quantifies full-layer snapshot retention vs dirty-region undo/redo patch estimates for paint-heavy workflows |
| DONE | FAANG review paint transformed-layer guard: brush/eraser strokes now use explicit paint coordinate helpers backed by rotate/scale/flip mask tests |
| DONE | FAANG review tool cleanup lifecycle: active-tool switches now run through a typed `ToolId` cleanup registry instead of hardcoded cleanup inside `EditorContext` |
| DONE | FAANG review render/export blend parity gate: blend mode UI/export now share `BLEND_MODE_OPTIONS`, and shader-only modes are documented as blocked until parity proof exists |
| DONE | FAANG review WebGL context-loss lifecycle: renderer now pauses GPU work on `webglcontextlost`, rebuilds resources on `webglcontextrestored`, and triggers active-document texture re-upload |
| DONE | FAANG review WebGL context policy: renderer now initializes with `preserveDrawingBuffer: false` by default, with a regression test for the context options |
| DONE | FAANG review WebGL uniform validation: required layer shader uniforms now throw explicit missing-uniform errors instead of relying on non-null assertions |
| DONE | FAANG review architecture diagram split: `ARCHITECTURE.md` now separates active MVP runtime ownership from historical/future-target reference diagrams |
| DONE | FAANG review shell path policy: Tauri file IO now enforces import/export image extension allowlists before read/write, with Rust contract tests |
| DONE | FAANG review cross-doc Alt-move guard: moving the last layer out of a source document now aborts before target mutation, preventing copy-as-move ambiguity |
| DONE | FAANG review file-drop mutation hardening: `addFilesAsLayers` decodes the dropped-file batch before history commit/layer creation, preventing empty layer creation on file read/decode failure |
| DONE | FAANG review typed cross-doc facade hardening: `crossDocLayerOps.ts` now uses a narrow `DocumentEngine`/`WorkspaceManager`-compatible interface with no production `any` casts, backed by type-check, focused drag/drop tests, full frontend tests, and build |
| DONE | FAANG review rejection Phase 0 execution: contract drift, production context fallback, shell response panics, file IO size guard, and root static-analysis scripts addressed with green build/test/type gates |
| DONE | Production risk register hardening executed: closed drag/drop, layer reorder, export, debug-surface, and verification-script gaps with green automated gates |
| DONE | Cross-doc layer drag tab hover regression fixed: 500ms tab switch now works through real EditorProvider workspace and canvas pointer-drag tab detection |
| DONE | Ponytail refactor-from-scratch doctrine created: `docs/ponytail-refactor-doctrine/` with anti-overengineering rules, per-area playbooks, roadmap, and review checklists |
| DONE | 6-month maintainability risk register created: `docs/maintainability-risk-register/` with per-area ownership, refactor, and governance risks |
| DONE | FAANG-style review rejection register created: `docs/faang-review-rejections/` with per-area quality gate findings and remediation roadmap |
| DONE | Production bug risk register created: `docs/production-risk-register/` with release gates and per-feature/tool risk checklists |
| DONE | Viewport tool alignment browser QA hardened: Playwright smoke now covers Move Tool transform geometry across fit, zoom, and pan |
| DONE | Viewport camera regression recovery executed: one viewport adapter + reactive overlay alignment fixes |
| DONE | Viewport camera regression recovery todo created: `docs/plans/2026-06-13-viewport-camera-regression-recovery-todo.md` |
| SUPERSEDED | GPU-Accelerated smooth zoom viewport camera implementation plan: `docs/plans/2026-06-13-gpu-smooth-zoom-transitions-design.md` |
| DONE | Brush visual calibration and pixel QA plan executed: `docs/superpowers/plans/2026-06-11-brush-visual-calibration-and-qa.md` |
| DONE | Brush-tip mask engine implementation plan executed: `docs/superpowers/plans/2026-06-11-brush-tip-mask-engine.md` |
| DONE | Brush hardness distance-field soft-edge implementation: `docs/superpowers/plans/2026-06-11-brush-hardness-distance-field-soft-edge.md` |
| DONE | Brush and Eraser tool improvement plan created: `docs/superpowers/plans/2026-06-06-brush-eraser-tool-improvements.md` |
| DONE | Crop Hidden Preview Restore correction plan created: `docs/superpowers/plans/2026-06-05-crop-interaction-model-plan.md` |
| DONE | Scalability and maintainability refactor plan created: `docs/plans/2026-06-04-scalability-maintainability-refactor-plan.md` |
