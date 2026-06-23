# Photrez

Photrez is a lightweight desktop image editor for practical image work. It is built with Tauri, SolidJS, TypeScript, and WebGL2, with Rust crates maintained for core domain logic and future renderer work.

Photrez is currently in active development. The editor has a working desktop shell, multi-document workspace, layer operations, selection and transform tools, crop and resize workflows, brush and eraser tools, export flows, and an automated regression suite. It is not yet a stable end-user release.

## Highlights

- Familiar desktop image-editor layout: tool rail, canvas, inspector, layers, history, menus, and status bar.
- Layer workflow: create, duplicate, delete, reorder, opacity, visibility, lock, merge down, flatten, drag and drop.
- Selection and transform tools: marquee selection, inverted selection, move, scale, rotate, flip, snapping, keyboard nudges.
- Crop and resize workflows with classic and modern crop modes.
- Brush and eraser tools with calibrated round-tip hardness, flow, smoothing, presets, and visual regression coverage.
- Export to PNG, JPEG, and WebP through the desktop file flow.
- Automated tests for engine logic, component wiring, pointer chains, dialogs, export, and browser-level editor smoke checks.

## Project Status

Photrez is pre-release software. APIs, document internals, and UI details may change before the first stable release.

Current focus:

- Polish public repository documentation.
- Remove internal workflow artifacts from the public source tree.
- Keep native desktop runtime smoke evidence current.
- Improve first-run and empty-state polish before public showcase.

## Tech Stack

- Desktop shell: Tauri 2
- Frontend: SolidJS, TypeScript, Vite
- Styling: Tailwind CSS v4
- Current renderer: WebGL2
- Current editor state: TypeScript document engine
- Rust crates: `photrez-core` and `photrez-render`

## Getting Started

Requirements:

- Node.js and pnpm
- Rust stable toolchain
- Tauri platform prerequisites for your operating system

Install dependencies:

```bash
pnpm install
```

Run the desktop app in development:

```bash
pnpm dev
```

Build the frontend:

```bash
pnpm build
```

Run the main verification gate:

```bash
pnpm run verify
```

Useful focused checks:

```bash
pnpm --filter photrez-desktop test --run
cargo test -p photrez-core
cargo test --workspace
```

## Repository Layout

```text
apps/desktop/       Tauri desktop app and SolidJS editor UI
crates/core/        Rust core domain model and tests
crates/render/      Future Rust renderer crate
docs/spec/          Product and technical specifications
docs/reference/     Runtime contracts, shortcuts, file formats, and inventories
docs/decisions/     Architecture and project decision records
docs/ARCHITECTURE.md
docs/FEATURES.md
DESIGN.md           Visual design system
PRODUCT.md          Product context
```

## Documentation

- [Architecture](docs/ARCHITECTURE.md)
- [Feature Status](docs/FEATURES.md)
- [Product Scope](docs/spec/product-scope.md)
- [Product Requirements](docs/spec/prd.md)
- [Technical Requirements](docs/spec/trd.md)
- [Command Contract](docs/reference/command-contract-spec.md)
- [Keyboard Shortcuts](docs/reference/keyboard-shortcut-map.md)
- [File Format Support](docs/reference/file-format-support.md)
- [Design System](DESIGN.md)
- [Contributing](CONTRIBUTING.md)
- [Security Policy](SECURITY.md)

## Contributing

Photrez is open source and welcomes careful, scoped contributions. Please read [CONTRIBUTING.md](CONTRIBUTING.md) before opening a pull request.

High-value contributions right now include documentation cleanup, reproducible bug reports, focused tests, accessibility fixes, and small UI polish that preserves the existing editor layout.

## License

Photrez is licensed under AGPL-3.0-or-later. See [LICENSE](LICENSE) and [NOTICE](NOTICE).
