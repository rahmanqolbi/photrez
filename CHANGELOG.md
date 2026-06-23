# Changelog

All notable changes to Photrez will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this project aims to follow [Semantic Versioning](https://semver.org/spec/v2.0.0.html) once stable releases begin.

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
