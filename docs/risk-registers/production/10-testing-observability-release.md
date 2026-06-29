# Testing, Observability, and Release Risks

Hotspots:

- `apps/desktop/src/components/editor/__tests__/`
- `apps/desktop/src/__tests__/`
- `apps/desktop/e2e/`
- `apps/desktop/vite.config.ts`
- `apps/desktop/playwright.config.ts`
- `scripts/validate-all.ps1`
- `docs/archive/plans/2026-06-14-test-overhaul-reference.md`
- `AGENTS.md`

## Potential Production Bugs

| ID           | Severity | Potential production symptom                                          | Trigger / root cause                                           | Guard / mitigation                                                |
| ------------ | -------- | --------------------------------------------------------------------- | -------------------------------------------------------------- | ----------------------------------------------------------------- |
| PBR-TEST-001 | P0       | Pure unit tests pass but production feature no-ops                    | Test covers helper function, not mounted event path            | Mandatory wiring test from real entry component                   |
| PBR-TEST-002 | P0       | Browser E2E passes but Tauri app fails                                | Native dialog, OS drag/drop, or file IO mocked/not exercised   | Manual or automated Tauri smoke for native features               |
| PBR-TEST-003 | P1       | Test suite count is stale in docs, hiding missing coverage            | Docs not updated after large test changes                      | Update `FEATURES.md`, `AI_HISTORY.md`, and task status every time |
| PBR-TEST-004 | P1       | CI/release misses regression because local-only command was run       | No GitHub Actions pipeline yet                                 | Implement CI or use `scripts/validate-all.ps1` before release     |
| PBR-TEST-005 | P1       | Playwright test passes in browser subset but not full desktop runtime | Tauri runtime not covered by browser-testable subset           | Add explicit release note for Tauri-only manual smoke             |
| PBR-TEST-006 | P1       | Performance regression ships unnoticed                                | No routine startup/RAM/export-size measurement                 | Follow `docs/reference/performance-measurement-protocol.md`       |
| PBR-TEST-007 | P1       | Long-running async or RAF loop remains active after test/user action  | Missing scheduler/listener cleanup not asserted                | Cleanup tests for RAF, timers, and window listeners               |
| PBR-TEST-008 | P2       | Mocks mask pointer capture or layout behavior                         | JSDOM mocks too permissive or global mocks differ from browser | Prefer browser E2E for geometry-sensitive behavior                |
| PBR-TEST-009 | P2       | Snapshot/state tests miss user-perceived visual bug                   | Assertions only inspect state, not pixels or DOM geometry      | Pair state tests with pixel/geometry checks for renderer/viewport |
| PBR-TEST-010 | P2       | Regression test names do not explain the production risk              | Future maintainers remove/modify test accidentally             | Include bug class and symptom in test name                        |
| PBR-TEST-011 | P2       | Known limitation becomes accidental scope                             | Limitation documented in feature table but not guarded         | Add explicit tests or docs when limitation changes                |
| PBR-TEST-012 | P3       | Logs/toasts lack enough detail for triage                             | Error messages do not include command/path/context             | Improve user-safe diagnostics when fixing related path            |

## Release Checklist

Before public release:

1. `pnpm.cmd run type-check`
2. `pnpm.cmd run lint`
3. `pnpm.cmd --filter photrez-desktop test`
4. `pnpm.cmd run build`
5. `cargo test -p photrez-core`
6. `cargo test --workspace`
7. `pnpm.cmd --filter photrez-desktop exec playwright test`
8. `pnpm.cmd tauri dev` smoke for app launch, open, edit, export, OS file drop, close
9. Performance measurement for startup, idle RAM, installer size
10. Manual visual pass for Move, Crop, Brush/Eraser, Drag/Drop, Export

## Observability Notes

Photrez is a desktop editor, so production triage depends heavily on reproducible steps. Every high-priority bug report should capture:

- OS and display scale.
- Input method: mouse, trackpad, pen, keyboard.
- Active tool and active document count.
- Zoom/pan state.
- Whether the document contains transformed, hidden, locked, or transparent layers.
- Whether the action uses native Tauri behavior: dialog, OS drag/drop, file write.
