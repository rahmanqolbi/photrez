# Governance

Photrez is maintained through lightweight maintainer-led governance.

## Roles

- Maintainers approve roadmap, architecture, releases, and policy changes.
- Contributors propose changes through issues, discussions, and pull requests.
- Reviewers help validate correctness, accessibility, test coverage, and maintainability.

## Decision Flow

1. Open a proposal, issue, or pull request with scope and rationale.
2. Review it against `docs/spec/product-scope.md`, `docs/ARCHITECTURE.md`, and relevant reference docs.
3. For cross-module, breaking, or long-lived architectural decisions, record the decision in `docs/decisions/`.
4. Maintainer approval is required before merge.

## Technical Authority

- Product scope defines what belongs in the project.
- Architecture docs define runtime ownership and boundaries.
- Decision records define accepted tradeoffs.
- Release gates define publish readiness.

## Conflict Resolution

- Prefer written technical reasoning over preference arguments.
- Optimize for scoped, testable, maintainable changes.
- If discussion remains unresolved, maintainers make the final decision and document the rationale when appropriate.
