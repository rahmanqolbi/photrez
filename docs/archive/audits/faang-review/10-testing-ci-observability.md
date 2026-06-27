# Testing, CI, and Observability Review

## Likely Rejections

| ID | Rating | Finding | Evidence | Expected remediation |
| --- | --- | --- | --- | --- |
| FRR-TEST-001 | Mitigated | No visible CI pipeline despite docs requiring CI gates | 2026-06-18: `.github/workflows/ci.yml` runs type-check, lint, frontend tests, build, browser E2E, Rust tests, and dependency audit. | Keep workflow aligned with local gate scripts as they evolve. |
| FRR-TEST-002 | Mitigated | E2E contains non-asserting placeholder behavior | 2026-06-18: the old constant cascade placeholder is gone; drag/drop E2E now asserts tab hover switching and invalid-zone no-op behavior. | Keep E2E assertions concrete; put native-only caveats in release checklist docs. |
| FRR-TEST-003 | Must Fix | Test suite uses many `as any` casts in high-risk interaction tests | Scan found high counts in input-handler and overlay tests. | Introduce typed fake builders for engine/history/context/renderers. |
| FRR-TEST-004 | Mitigated | Browser tests cannot cover native Tauri-only flows | 2026-06-18: `2026-06-18-native-runtime-smoke-checklist.md` defines required release evidence for OS drag/drop, native save dialog, file-on-disk verification, and app launch. | Fill the checklist or attach equivalent automation output for each release candidate. |
| FRR-TEST-005 | Mitigated | No visible lint script | Root and desktop `lint` / `type-check` scripts exist and CI runs them. | Replace current TypeScript-only lint with ESLint later if the project adopts it. |
| FRR-TEST-006 | Mitigated | Security audit policy is not executable | Root `audit` script exists and CI audit job installs `cargo-audit` before running it. | Capture successful remote audit output for release evidence. |
| FRR-TEST-007 | Should Fix | Feature/test counts in docs can go stale | `FEATURES.md` still has older frontend/E2E test counts while AI_HISTORY records newer counts. | Add generated test count summary or stop recording exact counts in long-lived docs. |
| FRR-TEST-008 | Should Fix | Observability is mostly console/toast based | `console.error` appears in UI paths; no structured logging envelope or debug export. | Add user-safe diagnostic logging plan for desktop release. |
| FRR-TEST-009 | Should Fix | Existing pre-commit discipline is strong but local-only | AI_HISTORY references green pre-commit, but reviewers want reproducible CI. | Mirror local gates in CI. |

## 2026-06-18 Execution Update

- FRR-TEST-002: mitigated. Placeholder drag/drop E2E assertions were replaced with real tab-hover and invalid-zone behavior checks.
- FRR-TEST-005: mitigated. Root `type-check` and `lint` scripts now run the desktop TypeScript static gate.
- FRR-TEST-006: script gap mitigated. Root `audit` script now exists, but successful execution still requires network/tooling access.
- FRR-TEST-001: mitigated by `.github/workflows/ci.yml`.
- FRR-TEST-004: mitigated by `2026-06-18-native-runtime-smoke-checklist.md`; actual filled evidence remains a release-candidate requirement.
- FRR-TEST-003, FRR-TEST-007, FRR-TEST-008, and FRR-TEST-009 remain open follow-ups.

## Merge Bar

- CI exists and runs build, frontend tests, Rust tests, E2E subset, lint, and audits.
- Placeholder tests are removed or marked as docs, not tests.
- Tauri-only behaviors have native-runtime verification.
