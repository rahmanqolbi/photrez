# Remediation Roadmap

This is the suggested order to address FAANG-style review blockers without turning the project into a rewrite.

## Phase 0: Stop The Bleeding

| Priority | Work | Why first |
| --- | --- | --- |
| P0 | Fix IPC contract docs/runtime mismatch | Reviewers cannot trust any shell contract while version and command list disagree. |
| P0 | Remove placeholder E2E tests or replace with real assertions | Tests that assert constants are worse than no test because they create false confidence. |
| P0 | Guard/remove `window.__photrezEditor` in production | Release/debug boundary is a merge-blocking concern. |
| P0 | Add lint/type-check/audit scripts | Makes the documented review bar executable. |

2026-06-18 status: Phase 0 is mostly closed in code/docs. Contract docs now match the Tauri runtime, placeholder drag/drop E2E had already been replaced, the debug handle is guarded, and root lint/type-check/audit scripts exist. Audit execution still needs network/tooling proof, and CI wiring remains Phase 3.

## Phase 1: Type Safety and Test Realism

| Priority | Work | Expected result |
| --- | --- | --- |
| P1 | Replace production `any` facades in `crossDocLayerOps.ts` | Cross-doc drag/drop becomes type-checkable. |
| P1 | Remove `useEditor()` fallback and create typed test providers | Missing providers fail loudly in production. |
| P1 | Add typed test builders for engine/history/editor context | Reduces brittle `as any` mocks. |
| P1 | Type `activeTool` as a union | Tool wiring failures become compile-time visible. |

## Phase 2: Ownership Splits

| Priority | Work | Expected result |
| --- | --- | --- |
| P1 | Split `CanvasViewport.tsx` orchestration | Smaller reviews, lower regression risk. |
| P1 | Split `useCanvasPointerTools.ts` by tool state machine | Tool bugs localize to one module. |
| P1 | Extract Crop controller/state machine | Modern/Classic parity becomes easier to prove. |
| P1 | Split WebGL2 resource management from draw/composite logic | Renderer failures become diagnosable. |

## Phase 3: Native Runtime and Release Gate

| Priority | Work | Expected result |
| --- | --- | --- |
| P1 | Add Tauri-runtime smoke checklist or automation | Mitigated 2026-06-18 with `2026-06-18-native-runtime-smoke-checklist.md`; filled evidence remains required for release candidates. |
| P1 | Add CI pipeline mirroring local gates | Mitigated 2026-06-18 with `.github/workflows/ci.yml`; keep it aligned as gates evolve. |
| P2 | Add performance budget scripts | Startup/RAM/export regressions become visible. |
| P2 | Add structured diagnostic logging | Production bug reports become actionable. |

## Phase 4: Scale Readiness

| Priority | Work | Expected result |
| --- | --- | --- |
| P2 | Evaluate dirty-rect history for paint-heavy workflows | Large documents avoid snapshot memory pressure. |
| P2 | Clarify Rust core/WebGL2/TS engine migration plan | Future architecture stops drifting. |
| P2 | Add generated docs for command/test/dependency inventories | Long-lived docs stay accurate. |
