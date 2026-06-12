# 06 - Agent Skill Spec

Define how AI agents should work in this repo to keep output consistent.

## Objectives

- Enforce MVP scope.
- Preserve architecture boundaries.
- Keep performance budgets visible in every implementation phase.

## Required Agent Rules

- Do not add features outside PRD MVP without explicit approval.
- Do not place domain image logic in shell/UI layer.
- Every feature PR must include:
  - tests,
  - perf impact note,
  - scope check against PRD.

## Review Checklist for AI Output

- Requirement mapped to PRD section.
- Architecture boundary respected.
- TRD contract updated if command/payload changes.
- ADR added if major technical decision is introduced.

## Deliverable Format

- Clear file change summary.
- Verification commands + results.
- Remaining risks and next-step recommendations.
