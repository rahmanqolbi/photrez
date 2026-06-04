# 10 - AI Execution Playbook

This runbook helps AI agents execute tasks consistently without scope drift.

## 1) Task Intake

When user gives a task, classify it first:

- `Docs-only`
- `Planning-only`
- `Implementation-approved`
- `Review/audit`

If not implementation-approved, do not write app code.

Use `docs/11-implementation-handoff.md` as the standard instruction template.

## 2) Mandatory Context Load

Always load:

1. `AGENTS.md`
2. `docs/00-product-scope.md`
3. `docs/01-prd.md`
4. `docs/02-architecture.md`
5. `docs/03-trd.md`
6. `docs/01-id-decision-log.md`
7. `docs/13-risk-register.md`
8. `docs/14-definition-of-ready.md`
9. `docs/15-command-contract-spec.md` (for implementation/review tasks touching IPC)
10. `docs/16-performance-measurement-protocol.md` (for tasks touching startup/RAM/size)
11. `docs/17-test-matrix-by-milestone.md` (for milestone-specific test gate mapping)
12. `docs/18-ci-verification-plan.md` (for merge/release verification expectations)
13. `docs/19-ci-job-template.md` (for practical CI scaffolding tasks)
14. `docs/20-github-actions-m1-template.md` (for GitHub-based M1 CI setup)
15. `docs/21-m1-command-mapping-checklist.md` (for replacing M1 CI placeholders)
16. `docs/22-ui-style-guide.md` (for UI consistency guardrail)
17. `docs/23-design-tokens.md` (for UI token usage rules)
18. `docs/24-ui-component-rules.md` (for component behavior/state consistency)
19. `docs/26-wireframe-layout-spec.md` (for shell layout decisions)
20. `docs/27-key-user-flows.md` (for UX flow consistency in MVP)
21. `docs/28-ui-copy-guidelines.md` (for consistent UI wording)
22. `docs/29-ui-review-checklist.md` (for UI design gate before implementation)
23. `docs/30-ui-full-editor-mockup.html` (for full-shell visual implementation reference)
24. `docs/31-dependency-inventory.md` (for dependency audit and policy before adding new deps)
25. `docs/32-keyboard-shortcut-map.md` (for keyboard shortcut consistency)
26. `docs/33-file-format-support.md` (for import/export format decisions)
27. `docs/34-save-and-document-lifecycle.md` (for save/open/new/close flows)
28. `docs/35-error-code-registry.md` (for error scenario to code+message mapping)
29. `docs/36-glossary.md` (for consistent terminology)
30. `docs/37-i18n-strategy-note.md` (for i18n architecture guardrails)

## 3) Output Contract by Task Type

### Docs-only

- Update docs only.
- Keep architecture and scope terms consistent.
- Report exactly which files changed.

### Planning-only

- Produce decisions, trade-offs, and updated plan/checklist docs.
- Do not scaffold runtime code.

### Implementation-approved

- Execute tasks according to `docs/08-milestone-1-execution.md` and `docs/07-build-plan.md`.
- Keep evidence logs for build/test/perf checks.

### Review/audit

- Report findings first.
- Order by severity.
- Include file references.

## 4) Scope and Change Control

- If request conflicts with MVP scope, ask for explicit approval to extend scope.
- If new technical decision impacts contracts or module boundaries, add/update ADR.
- Keep `docs/01-id-decision-log.md` synchronized after major decisions.
- Mark task as `Not Ready` if DoR in `docs/14-definition-of-ready.md` is not satisfied.

## 5) Naming and Release Gate

- Working name is `Photrez` until final lock.
- Before first public publish, enforce `docs/09-public-release-gate.md`.

## 6) Safety Checklist Before Final Response

- Confirm task type was respected.
- Confirm no out-of-scope feature was introduced.
- Confirm docs were updated for changed decisions.
- Confirm unresolved blockers are listed explicitly.
