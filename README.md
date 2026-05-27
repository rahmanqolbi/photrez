# Photrez

Photrez is a lightweight desktop image editor for practical design work.

Current direction:

- Familiar editing workflow.
- Distinct product identity (not a Photoshop clone).
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

- [Docs Index](docs/README.md)
- [Vision and Strategy](docs/00-vision-and-strategy.md)
- [MVP Scope Lock](docs/00-product-scope.md)
- [PRD](docs/01-prd.md)
- [Architecture](docs/02-architecture.md)
- [TRD](docs/03-trd.md)
- [Decision Log (ID)](docs/01-id-decision-log.md)
- [Milestone 1 Execution Checklist](docs/08-milestone-1-execution.md)
- [Public Release Gate](docs/09-public-release-gate.md)
- [Desktop Behavior Spec](docs/10-b-desktop-behavior-spec.md)
- [Agent Context Pack](docs/12-agent-context-pack.md)
- [MVP Risk Register](docs/13-risk-register.md)
- [Definition of Ready](docs/14-definition-of-ready.md)
- [Command Contract Spec](docs/15-command-contract-spec.md)
- [Performance Measurement Protocol](docs/16-performance-measurement-protocol.md)
- [Test Matrix by Milestone](docs/17-test-matrix-by-milestone.md)
- [CI Verification Plan](docs/18-ci-verification-plan.md)
- [CI Job Template](docs/19-ci-job-template.md)
- [GitHub Actions M1 Template](docs/20-github-actions-m1-template.md)
- [M1 Command Mapping Checklist](docs/21-m1-command-mapping-checklist.md)
- [UI Style Guide](docs/22-ui-style-guide.md)
- [Design Tokens](docs/23-design-tokens.md)
- [UI Component Rules](docs/24-ui-component-rules.md)
- [Anti-Webapp Guidelines](docs/24-b-anti-webapp-guidelines.md)
- [UI Style Guide Preview (HTML)](docs/25-ui-style-guide-preview.html)
- [Wireframe Layout Spec](docs/26-wireframe-layout-spec.md)
- [Key User Flows](docs/27-key-user-flows.md)
- [UI Copy Guidelines](docs/28-ui-copy-guidelines.md)
- [UI Review Checklist](docs/29-ui-review-checklist.md)
- [Full UI Editor Mockup (HTML)](docs/30-ui-full-editor-mockup.html)
- [Dependency Inventory](docs/31-dependency-inventory.md)
- [Keyboard Shortcut Map](docs/32-keyboard-shortcut-map.md)
- [File Format Support](docs/33-file-format-support.md)
- [Save and Document Lifecycle](docs/34-save-and-document-lifecycle.md)
- [Error Code Registry](docs/35-error-code-registry.md)
- [Glossary](docs/36-glossary.md)
- [i18n Strategy Note](docs/37-i18n-strategy-note.md)

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
