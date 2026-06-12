# Governance

## Scope

This document defines how decisions are made for Photrez.

## Roles

- Maintainers:
approve roadmap, architecture, release gates, and policy changes.
- Contributors:
propose changes through pull requests and discussion.

## Decision Flow

1. Proposal is opened with scope and rationale.
2. Proposal is reviewed against `docs/00-product-scope.md`, `docs/02-architecture.md`, and `docs/03-trd.md`.
3. If cross-module or breaking, add/update ADR in `docs/05-adr/`.
4. Maintainer approval is required before merge.

## Technical Authority

- PRD/TRD define product and technical constraints.
- ADRs define architectural decisions.
- Release gates define publish readiness.

## Conflict Resolution

- Prefer written technical reasoning over preference arguments.
- If unresolved, maintainers make the final decision and record it in ADR or decision log.
