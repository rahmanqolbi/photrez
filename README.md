# Photrez

Photrez is a lightweight desktop image editor for practical design work.

Current direction:

- Familiar editing workflow.
- Distinct product identity with familiar editing workflows.
- Performance-first targets for low-end Windows devices.

## Project Status

Planning and documentation phase.

- MVP scope is locked.
- Architecture and technical requirements are defined.
- Implementation has not started yet.

## MVP v1 Scope

- Layer basic: add, delete, reorder, opacity.
- Selection + move + basic transform (scale, rotate, flip).
- Crop + resize image/canvas.
- Brush + eraser.
- Export JPG/PNG/WebP.

Out of scope for MVP:

- PSD workflow, print checker, plugin runtime, AI features, cloud collaboration.

## Performance Targets

- Installer `< 80 MB`
- Idle RAM `< 250 MB`
- Startup `< 2s`

## Planned Stack

- Desktop shell: Tauri 2
- Frontend: SolidJS + TypeScript + Vite
- Core: Rust
- Renderer: wgpu

## Documentation Entry Points

### Core AI Documents (Root of `docs/`)
- [Docs Index](docs/INDEX.md)
- [Strict AI Rules](docs/AI_CONTEXT.md)
- [Active Tasks](docs/AI_CURRENT_TASK.md)
- [Change History Log](docs/AI_HISTORY.md)
- [Feature Status Tracker](docs/FEATURES.md)
- [Runtime Architecture Reference](docs/ARCHITECTURE.md)
- [Code Conventions](docs/CONVENTIONS.md)
- [UI Style Guide & Design Tokens](docs/UI_GUIDE.md)

### Specifications (`docs/spec/`)
- [MVP Scope Lock](docs/spec/product-scope.md)
- [PRD](docs/spec/prd.md)
- [TRD](docs/spec/trd.md)
- [Data Model Schema](docs/spec/data-model.md)
- [Build Plan](docs/spec/build-plan.md)

### Decisions (`docs/decisions/`)
- [Architectural Decision Log](docs/decisions/id-decision-log.md)
- [MVP Risk Register](docs/decisions/risk-register.md)

### Reference & Inventories (`docs/reference/`)
- [Command Contract Spec](docs/reference/command-contract-spec.md)
- [Performance Measurement Protocol](docs/reference/performance-measurement-protocol.md)
- [Design Tokens Spec](docs/reference/design-tokens.md)
- [Dependency Inventory](docs/reference/dependency-inventory.md)
- [Keyboard Shortcut Map](docs/reference/keyboard-shortcut-map.md)
- [File Format Support](docs/reference/file-format-support.md)
- [Save and Document Lifecycle](docs/reference/save-and-document-lifecycle.md)
- [Error Code Registry](docs/reference/error-code-registry.md)
- [Glossary](docs/reference/glossary.md)

## Governance

- [AGENTS.md](AGENTS.md)
- [CONTRIBUTING.md](CONTRIBUTING.md)
- [SECURITY.md](SECURITY.md)
- [TRADEMARKS.md](TRADEMARKS.md)
- [GOVERNANCE.md](GOVERNANCE.md)
- [CHANGELOG.md](CHANGELOG.md)

## License

AGPL-3.0-or-later.
See [LICENSE](LICENSE) and [NOTICE](NOTICE).
