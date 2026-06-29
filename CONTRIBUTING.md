# Contributing to Photrez

Thanks for helping improve Photrez. This project is still pre-release, so the best contributions are focused, well-tested, and easy to review.

## Ground Rules

- Keep changes aligned with the locked product scope in `docs/spec/product-scope.md`.
- Preserve the existing desktop editor layout unless a change explicitly requires UI structure work.
- Follow the runtime architecture in `docs/ARCHITECTURE.md`.
- Avoid broad rewrites when a narrow fix solves the problem.
- Do not introduce new dependencies without explaining why the existing stack is insufficient.

## Development Setup

This project uses **pnpm** (not npm or yarn). The required version is specified in `package.json` under `"packageManager"`.

If you have pnpm installed, it will auto-detect the correct version. If not:

```bash
npm install -g pnpm
# or enable Corepack (Node.js built-in):
corepack enable
pnpm install
```

Install dependencies and start the desktop app:

Run the main verification gate:

```bash
pnpm run verify
```

Focused checks:

```bash
pnpm --filter photrez-desktop test --run
pnpm run build
cargo test -p photrez-core
cargo test --workspace
```

## Pull Request Requirements

- Explain what changed and why.
- Include tests for behavior changes.
- Include wiring tests for UI event paths, not only pure function tests.
- Update relevant docs when behavior, shortcuts, architecture, or user-facing scope changes.
- Note performance impact for rendering, paint, export, import, and history changes.
- Keep unrelated refactors out of feature and bug-fix PRs.

## Code Style

- Frontend code uses SolidJS, not React.
- TypeScript is strict. Avoid `any`; prefer explicit types and narrowing.
- Keep document state changes history-safe: commit undo history before mutation.
- Use existing editor commands, layer actions, and selection operations instead of adding parallel mutation paths.
- Keep UI compact and consistent with `docs/DESIGN.md`.

## Review Process

- Maintainers review for scope, correctness, tests, accessibility, and architecture fit.
- High-risk changes may require extra review or a focused design note.
- Breaking changes should be documented in `docs/decisions/`.
- Native runtime behavior should be verified in Tauri when the change touches shell, dialogs, file I/O, drag and drop, or window behavior.
