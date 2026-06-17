# Testing, CI, and Observability Review

## Likely Rejections

| ID | Rating | Finding | Evidence | Expected remediation |
| --- | --- | --- | --- | --- |
| FRR-TEST-001 | Reject | No visible CI pipeline despite docs requiring CI gates | `FEATURES.md` still has CI pipeline TODO; root package scripts only expose build/e2e/tauri/prepare. | Add GitHub Actions or equivalent documented local gate. |
| FRR-TEST-002 | Reject | E2E contains non-asserting placeholder behavior | Drag/drop E2E has tests that state no-op cannot be easily tested and constant cascade assertion. | Remove placeholder tests or replace with real assertions. |
| FRR-TEST-003 | Must Fix | Test suite uses many `as any` casts in high-risk interaction tests | Scan found high counts in input-handler and overlay tests. | Introduce typed fake builders for engine/history/context/renderers. |
| FRR-TEST-004 | Must Fix | Browser tests cannot cover native Tauri-only flows | OS drag/drop, native save dialog, and file-on-disk verification are manual or browser-simulated. | Add a Tauri-runtime test plan with evidence artifacts. |
| FRR-TEST-005 | Must Fix | No visible lint script | `package.json` has build/test/e2e but no lint/type-check beyond build. | Add lint and type-check scripts and make them required. |
| FRR-TEST-006 | Must Fix | Security audit policy is not executable | Dependency inventory requires `cargo audit` and `npm audit`; scripts do not expose them. | Add scripts/CI and document expected failure policy. |
| FRR-TEST-007 | Should Fix | Feature/test counts in docs can go stale | `FEATURES.md` still has older frontend/E2E test counts while AI_HISTORY records newer counts. | Add generated test count summary or stop recording exact counts in long-lived docs. |
| FRR-TEST-008 | Should Fix | Observability is mostly console/toast based | `console.error` appears in UI paths; no structured logging envelope or debug export. | Add user-safe diagnostic logging plan for desktop release. |
| FRR-TEST-009 | Should Fix | Existing pre-commit discipline is strong but local-only | AI_HISTORY references green pre-commit, but reviewers want reproducible CI. | Mirror local gates in CI. |

## Merge Bar

- CI exists and runs build, frontend tests, Rust tests, E2E subset, lint, and audits.
- Placeholder tests are removed or marked as docs, not tests.
- Tauri-only behaviors have native-runtime verification.

