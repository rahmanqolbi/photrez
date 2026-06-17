# Architecture And Ownership Boundaries

## MRR-ARCH-001: Editor Ownership Is Concentrated In A Few Large Modules

Severity: M1

Likely hard-to-maintain path:

- `CanvasViewport.tsx` owns canvas presentation, pointer entry points, pasteboard behavior, crop overlay hosting, smart guides, layer drag hooks, and drag/drop surfaces.
- `useCanvasPointerTools.ts` owns dispatch for multiple editing tools.
- `DocumentEngine` owns layer operations, selection, viewport state, crop, resize, render state, dirty tracking, snapshots, and memory calculation.

Why this becomes painful in 6 months:

- Every new tool needs edits in shared files that already carry many behaviors.
- Reviews become slower because a change can affect unrelated tools.
- Refactors become scary because test failures do not clearly map to ownership boundaries.

Recommended direction:

- Split by stable user workflow, not by arbitrary helper size.
- Introduce typed feature adapters such as `ViewportInteractionController`, `ToolCommandRouter`, and `DocumentMutationFacade`.
- Keep `DocumentEngine` as the public MVP facade, but move internal domains behind smaller modules with contract tests.

## MRR-ARCH-002: Source Of Truth Is Spread Across Docs, TypeScript, Rust, And Tests

Severity: M1

Likely hard-to-maintain path:

- `docs/reference/command-contract-spec.md` describes contract version `1.0.0`.
- Rust `get_contract_info()` returns version `2.0.0`.
- TypeScript native wrapper assumes the current envelope shape.
- Tests verify some runtime commands, but docs are not generated from runtime metadata.

Why this becomes painful in 6 months:

- Native command changes will require manual updates in several locations.
- New contributors can implement against stale reference docs.
- Debugging IPC issues will start with "which contract is real?"

Recommended direction:

- Make one contract source authoritative.
- Generate or test docs against runtime metadata.
- Add a small contract parity test that reads the reference version and asserts the runtime version intentionally matches or has an ADR migration note.

## MRR-ARCH-003: Architecture Has Recovery Plans But No Enforced Guardrail

Severity: M2

Likely hard-to-maintain path:

- Existing docs already record a viewport camera regression recovery.
- There is a maintainability refactor plan from 2026-06-04.
- The code still has large shared modules and multiple state ownership paths.

Why this becomes painful in 6 months:

- The team can repeatedly document the same class of issue without reducing its surface.
- Future work may accidentally reopen known failure modes.

Recommended direction:

- Convert the recovery lessons into checkable architecture gates.
- Add a short "touching this file requires" section at the top of high-risk docs.
- Track M1/M2 maintainability items as normal backlog work, not optional cleanup.

## MRR-ARCH-004: Dependency And Release Governance Are Thin

Severity: M2

Likely hard-to-maintain path:

- Root package scripts expose build and E2E, but no lint/type/audit script at root.
- `FEATURES.md` still lists CI pipeline as TODO.
- Dependency policy exists in docs, but dependency drift enforcement is not visible in package scripts.

Why this becomes painful in 6 months:

- Quality gates depend on humans remembering commands.
- Dependency upgrades can silently affect renderer, tests, and desktop packaging.
- Release confidence becomes uneven across machines.

Recommended direction:

- Add a root `verify` script once implementation work resumes.
- Add CI with at least build, frontend tests, Rust tests, and doc contract checks.
- Keep dependency inventory synchronized with package changes.

