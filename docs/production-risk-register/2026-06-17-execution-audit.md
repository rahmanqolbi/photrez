# 2026-06-17 Production Risk Execution Audit

Status: automated hardening pass complete.

This audit executed the urgent P0 production-risk-register pass with Ponytail constraints: close confirmed gaps with existing mechanisms, add missing wiring/contract tests, and avoid new architecture.

## Closed This Pass

| Risk | Result | Evidence |
| --- | --- | --- |
| `PBR-LAYER-002` | Added UI/hook-level layer reorder index coverage for top-first layer rows vs internal engine order. | `useLayerDragReorder.test.tsx` covers top -> bottom and bottom -> top drag outcomes with history commit. |
| `PBR-DND-005` | Hardened browser E2E for tab hover during layer drag. | `cross-doc-drag-drop.spec.ts` now simulates active HTML5 layer drag, hovers a target tab for 500ms, and asserts the target tab becomes active. |
| `PBR-DND-008` | Replaced placeholder invalid-drop test with a real no-op assertion. | `cross-doc-drag-drop.spec.ts` verifies dropping a layer on the tool rail does not create documents or mutate layer count. |
| `PBR-EXPORT-002` | Added encoded-byte format assertions. | `exportDocument.test.ts` checks PNG/JPEG/WebP magic-byte signatures from `encodeComposite`. |
| `PBR-EXPORT-003` | Added save-dialog cancel protection. | `exportDocument.test.ts` verifies cancel returns `null` and does not call `writeFileBytes`. |
| `PBR-TEST-001` | Removed placeholder-style E2E assertions in touched drag/drop spec. | Code search found no `test.skip`, placeholder expectations, or "can't easily test" comments under `apps/desktop`. |
| `PBR-TEST-004` | Added a root verification script for the local release gate subset. | `package.json` now exposes `pnpm run verify` for frontend tests, build, core Rust tests, and workspace Rust tests. |
| Debug surface hardening | Restricted `window.__photrezEditor` to dev/test/explicit debug builds. | `EditorContextDebug.test.ts` covers dev, test, production, and explicit override behavior. |
| Browser/Tauri split noise | Guarded Tauri drag-drop subscription outside the Tauri runtime while preserving Vitest mocks. | Full Playwright no longer logs `useTauriDragDrop` subscription errors in browser mode. |

## Existing P0 Evidence Reused

| Risk group | Existing evidence |
| --- | --- |
| Global pointer/history/signal sync | `CanvasViewport.test.tsx`, `engine-signal-contract.test.tsx`, and full frontend suite. |
| OS file drop global host wiring | `crossDocDragDropWiring.test.tsx` mounts `GlobalDragDropHost` with an active document and verifies Tauri drop zones. |
| Move/viewport/export browser behavior | Full Playwright suite covers transform alignment through fit/zoom/pan, brush paint, export dialog, export headers, export parity, and write roundtrip. |
| Rust document/workspace contracts | `cargo test -p photrez-core` and `cargo test --workspace` cover layer, history, crop/resize, export, workspace, and desktop command contracts. |

## Verification Run

- `pnpm.cmd --filter photrez-desktop test --run` - PASS, 77 files / 1078 tests.
- `pnpm.cmd run build` - PASS.
- `cargo test -p photrez-core` - PASS, 85 tests.
- `cargo test --workspace` - PASS, 92 tests total across Rust crates.
- `pnpm.cmd --filter photrez-desktop exec playwright test` - PASS, 21 browser E2E tests.
- `pnpm.cmd run verify` - PASS.

## Remaining Release-Only Gate

`PBR-TEST-002` still requires a Tauri runtime smoke before a public release candidate: app launch, OS file drop, native export dialog, file write, and close. This pass did not change Tauri commands or Rust file IO behavior; the automated browser/unit/Rust gates are green, but the native manual smoke remains a release checklist item.
