# ADR 0002: Command Contract Versioning and Error Shape

## Status

Accepted

## Context

Milestone 1 requires a minimal shell-core command bridge.
Without a stable contract, command behavior may drift and create brittle coupling between frontend shell and Rust core.

## Decision

Adopt an explicit command contract model with:

- Versioned command schema (`contract_version`).
- Deterministic success payload shape.
- Deterministic error payload shape.
- Validation at shell boundary and core boundary.

Baseline response model:

- Success:
`{ ok: true, contract_version: "<version>", data: <payload> }`
- Error:
`{ ok: false, contract_version: "<version>", error: { code, message, details? } }`

## Consequences

### Positive

- Reduces accidental breakage across shell/core integration.
- Makes test assertions stable and repeatable.
- Enables safe evolution of command payloads over milestones.

### Negative

- Adds early discipline overhead.
- Requires synchronized updates across docs and tests when schema evolves.

## Follow-up

- Reflect command contract rules in `docs/spec/trd.md`.
- Add contract tests in Milestone 1 baseline.
- Require ADR updates for breaking command schema changes.
