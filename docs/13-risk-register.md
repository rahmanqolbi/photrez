# 13 - MVP Risk Register

This file tracks key risks for MVP execution and their mitigation plan.

## Usage

- Update this file when a risk is found, status changes, or mitigation changes.
- Keep risk IDs stable (`R-001`, `R-002`, ...).
- For major changes, sync `docs/01-id-decision-log.md`.

## Risk Scale

- Probability: `Low | Medium | High`
- Impact: `Low | Medium | High`
- Priority: `P0 | P1 | P2`

## Active Risks

| ID | Risk | Probability | Impact | Priority | Trigger / Signal | Mitigation | Owner | Status |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| R-001 | Startup time exceeds `< 2s` target | Medium | High | P0 | Cold start measurement over target in baseline environment | Follow `docs/16-performance-measurement-protocol.md`, keep shell bootstrap minimal, defer non-critical initialization, profile startup path early in Milestone 1 | Core + Shell | Open |
| R-002 | Idle RAM exceeds `< 250 MB` budget | Medium | High | P0 | Idle memory baseline over target with no open heavy document | Follow `docs/16-performance-measurement-protocol.md`, track memory baseline from Milestone 1, avoid unnecessary caches, document memory cost per module | Core + Renderer | Open |
| R-003 | Installer size exceeds `< 80 MB` budget | Medium | High | P0 | Package artifact above threshold | Follow `docs/16-performance-measurement-protocol.md`, strip debug artifacts from release, audit dependencies, avoid heavy optional bundles in MVP | Build/Release | Open |
| R-004 | Scope creep into out-of-scope features | High | Medium | P1 | Task request asks for PSD/print/plugin/AI before approval | Enforce `AGENTS.md` and handoff template; require explicit approval for scope extension | PM/Owner | Open |
| R-005 | Command contract drift between shell and core | Medium | High | P0 | IPC payload mismatch or non-deterministic error responses | Keep command envelope versioned per ADR-0002, add contract tests for success/failure paths | Core + Shell | Open |
| R-006 | Renderer and core boundaries blur (logic leak) | Medium | Medium | P1 | Business logic appears in renderer or frontend | Enforce module boundaries from `docs/02-architecture.md`, block PRs with architecture violations | Tech Lead | Open |
| R-007 | Crash/undefined behavior on malformed imported files | Medium | High | P0 | Import handler panics or hangs on invalid file inputs | Treat all input as untrusted, strict parser validation, fail-closed path, add negative tests | Core | Open |
| R-008 | Brush/Eraser baseline unstable on low-end devices | Medium | Medium | P1 | Stroke lag, stutter, or visible artifacts in baseline scenarios | Keep first implementation simple, add representative stroke benchmarks, tune later milestones | Core + Renderer | Open |
| R-009 | Export output inconsistency (JPG/PNG/WebP) | Medium | Medium | P1 | Different visual output for same document in repeated export runs | Deterministic export settings, golden output checks, failure-path tests in Milestone 5 | Export | Open |
| R-010 | Documentation and implementation diverge | Medium | Medium | P2 | Behavior differs from PRD/TRD/Scope without doc update | Make doc update part of Definition of Done, enforce handoff output format | All | Open |

## Closed Risks

Move resolved risks here with close date and evidence.

| ID | Close Date | Resolution Summary | Evidence |
| --- | --- | --- | --- |

## Risk Review Cadence

- Minimum review: once per milestone.
- Mandatory review moments:
1. Before Milestone start.
2. Before Milestone exit sign-off.
3. Before any public release gate decision.
