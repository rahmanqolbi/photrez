# Contributing to Photrez

Thanks for contributing.

## Ground Rules

- Keep changes aligned with MVP scope in `docs/00-product-scope.md`.
- Follow architecture boundaries in `docs/02-architecture.md`.
- Follow technical constraints in `docs/03-trd.md`.
- Do not introduce non-MVP features without explicit approval.

## Pull Request Requirements

- Clear summary of what changed and why.
- Tests added or updated for behavior changes.
- Brief performance impact note for runtime-facing changes.
- Any command schema change documented in TRD and ADR.

## Code and Docs Quality

- Keep modules focused by capability.
- Avoid cross-layer coupling (`shell`, `core`, `renderer`).
- Update docs in `docs/` when behavior or decisions change.

## Review Process

- PR must pass agreed checks (tests, lint/type-check when available).
- High-risk changes require at least one additional reviewer.
- Breaking changes require an ADR entry under `docs/05-adr/`.
