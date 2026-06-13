# 14 - Definition of Ready (DoR) for Execution Tasks

This document defines when a task is ready to be executed by an AI coding agent.

## Purpose

- Reduce ambiguous instructions.
- Prevent scope drift.
- Ensure verification can be executed.
- Keep implementation aligned with architecture and TRD.

## Readiness Checklist (Mandatory)

A task is `Ready` only if all items below are satisfied.

1. Task type is explicit: `Docs-only`, `Planning-only`, `Implementation-approved`, or `Review/audit`.
2. Objective is singular and concrete.
3. Scope boundary is explicit (`in scope` and `out of scope`).
4. Target files are listed (or target module area is clearly defined).
5. Acceptance criteria are testable (not vague).
6. Verification commands are provided (or justified if temporarily unavailable).
7. Dependencies/blocked-by items are identified.
8. Relevant source-of-truth docs are referenced.
9. Risk impact is checked against `docs/decisions/risk-register.md`.
10. Output format is defined (summary, files changed, verification, risks/blockers).

If one item is missing, task status must remain `Not Ready`.

## Ready Template (Quick Fill)

```md
Task Type: <Docs-only | Planning-only | Implementation-approved | Review/audit>

Objective:
<single clear objective>

Scope Boundary:
- In scope: <explicit list>
- Out of scope: <explicit list>

Target Files / Modules:
<paths or module area>

Acceptance Criteria:
1. <testable result 1>
2. <testable result 2>

Verification:
1. <command 1>
2. <command 2>

Dependencies / Blockers:
- <dependency or blocker>

References:
- AGENTS.md
- <relevant docs path list>

Output Format:
1. Summary of changes
2. Files changed
3. Verification results
4. Remaining risks/blockers
```

## Not Ready Anti-Patterns

- "Benerin ini ya" without scope detail.
- "Optimize performance" without metric target.
- "Tambahin fitur export" without format list and acceptance checks.
- No verification command and no justification.
- Request conflicts with locked MVP scope but no explicit approval.

## Ready Gate by Task Type

### Docs-only

- Allowed files are docs-only.
- No runtime code modification requested.
- Cross-doc consistency target is stated.

### Planning-only

- Decision area is explicit.
- Trade-off expectation is explicit.
- No code scaffolding requested.

### Implementation-approved

- User approval to implement is explicit.
- Acceptance criteria and verification commands exist.
- Risk check references `docs/decisions/risk-register.md`.
- Scope matches `docs/spec/product-scope.md`.

### Review/audit

- Review area is bounded (feature/files).
- Severity-first output required.
- Findings format requires actionable references.

## Ready Status Labels

- `Ready`: all checklist items complete.
- `Ready-with-Risk`: ready, but explicit risk accepted by owner.
- `Not Ready`: missing one or more mandatory items.

## Handoff Rule

Before execution, use:

- `docs/archive/planning/12-agent-context-pack.md` for quick context.
- `docs/archive/planning/11-implementation-handoff.md` for task prompt template.
