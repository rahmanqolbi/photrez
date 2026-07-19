# Changelog

All notable changes to Photrez will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this project aims to follow [Semantic Versioning](https://semver.org/spec/v2.0.0.html) once stable releases begin.

## [0.1.0-alpha.1] — 2026-07-19

### ⚠️ Pre-Release Notice

This is an **alpha release** for early testing and feedback. Expect bugs,
breaking changes, and incomplete features. Not recommended for production use.

### ✨ Added

- Tauri 2 desktop shell with custom title bar, native menu, dialogs, file open/export flows.
- SolidJS editor UI: tool rail, document tabs, canvas viewport, inspector, layers panel, history panel, navigator, context menus, status bar.
- Multi-document workspace with cross-document drag-and-drop.
- Layer operations: create, duplicate, delete, reorder, visibility, lock, opacity, merge down, flatten, blend modes (Normal/Multiply/Screen/Overlay), basic adjustments (brightness/contrast/saturation, non-destructive).
- Selection: rectangular marquee, invert, cut/copy/paste/delete, move, rotate.
- Transform: scale, rotate, flip, snapping, keyboard nudges, aspect-ratio constraint.
- Crop: classic and modern modes, aspect-ratio presets, canvas expansion.
- Brush and eraser: calibrated round-tip with hardness, flow, smoothing, presets.
- Eyedropper, color picker, fill shortcuts.
- Export: PNG, JPEG, WebP with quality settings.
- Native print dialog integration (Windows).
- History: undo/redo with VRAM-aware disposal.
- Save/load project format (`.ptz` — zip archive with document.json + layer PNGs).
- Window state persistence across launches.
- WebGL2 renderer with context-loss recovery.
- Rust `photrez-core` domain crate (reference implementation).
- Automated frontend tests (2499 cases), Rust tests (113: 84 core + 29 desktop), Playwright E2E specs.
- Public documentation: architecture, features, PRD, TRD, design system, contributing, security, governance.

### 🐛 Known Issues

See `KNOWN_ISSUES.md` for the full list. Highlights:

- Startup time on cold launch is ~3.7s (target: <2s). Optimization planned for beta.
- High-zoom canvas preview may appear pixelated due to 4096px backing-buffer clamp.
- WebGL2 `readPixels` is synchronous — brief hitch possible on first "Apply & Paint" for large layers.
- macOS and Linux are not yet tested in CI — Windows is the only supported platform for alpha.
- Blend modes beyond Normal/Multiply/Screen/Overlay are blocked from UI (parity tests pending).
- Selection is rectangular only (lasso/magic wand not in MVP scope).
- PSD import is not supported (non-goal for MVP).

### 🔒 Security

- Path-traversal validation: canonicalize + symlink check + extension allowlist (`validate_path_safe`).
- `delete_file` restricted to the OS temp directory.
- `print_image` allowlist narrowed to PNG/JPEG (PDF dropped — non-MVP).
- File-size cap: 256 MB per IPC operation.
- Project file (`.ptz`) zip-bomb protection: per-entry decompressed size limit.
- CSP enabled with `script-src 'self'` (no inline scripts).

### 📦 Distribution

- Windows MSI / NSIS installer (built via `bun run tauri build`).
- Available on GitHub Releases (pre-release flag enabled).

### 🔗 Links

- Source: https://github.com/rahmanqolbi/photrez
- Issues: https://github.com/rahmanqolbi/photrez/issues
- Security: see SECURITY.md

---

## [Unreleased]

### Added

- Tauri 2 desktop shell with custom title bar, native menu integration, dialogs, file open, and export flows.
- SolidJS editor UI with tool rail, document tabs, canvas viewport, inspector, layers, history, navigator, menus, context menus, and status bar.
- Multi-document workspace and cross-document drag and drop.
- Layer operations: create, duplicate, delete, reorder, visibility, lock, opacity, merge down, flatten, and thumbnails.
- Selection, move, transform, crop, resize, brush, eraser, eyedropper, color, and export workflows.
- WebGL2 renderer for active MVP presentation.
- Rust `photrez-core` domain crate with tests.
- Automated frontend, Rust, browser, dialog, export, and paint regression checks.
- Public project docs for architecture, features, product scope, contribution, security, governance, and design system.

### Changed

- Public repository hygiene: local agent workflows, personal tool configs, prompt databases, AI task logs, local binaries, and build artifacts are ignored and no longer tracked.

### Notes

- Photrez is still pre-release software. Public APIs, internal document structures, and UI details may change before the first stable release.
