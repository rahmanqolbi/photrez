# Migration Roadmap

This roadmap avoids a big-bang rewrite. Each phase must leave the app working.

## Phase 0: Lock The Rules

Goal: make refactor decisions consistent.

Tasks:

- Adopt this folder as the refactor doctrine.
- Add a planning requirement: every refactor task names what it deletes.
- Stop adding new production `as any`.
- Decide IPC contract source of truth.
- Label browser-only native-adjacent tests clearly.

Do not:

- start moving many files,
- create new architecture folders,
- add dependencies.

Exit criteria:

- new plans cite Ponytail ladder,
- new refactor tasks include "what this removes".

## Phase 1: Typed Fixtures Before More Extraction

Goal: make refactor safe.

Tasks:

- create typed editor provider fixture,
- create typed renderer/scheduler fixture,
- create pointer-chain helper,
- migrate one small test file,
- remove broad context fallback from one path if safe.

Do not:

- rewrite all tests,
- create a testing framework.

Exit criteria:

- one test file no longer needs broad `as any`,
- production behavior is unchanged.

## Phase 2: Command Discipline

Goal: make user-visible mutations harder to get wrong.

Tasks:

- create `CommandContext` type,
- implement one command: `moveLayerCommand`,
- route one UI entry point through it,
- test history, validation, render request.

Do not:

- create a command bus,
- migrate every mutation.

Exit criteria:

- one real mutation has explicit history policy.

## Phase 3: Tool Handler Extraction

Goal: shrink pointer dispatcher risk.

Tasks:

- define `ToolPointerHandler`,
- extract Move tool handler,
- keep dispatcher switch simple,
- add tool switch cleanup test.

Do not:

- build plugin runtime,
- extract all tools at once.

Exit criteria:

- Move tool is handled outside the giant dispatcher,
- CanvasViewport integration still passes.

## Phase 4: CanvasViewport Shell Split

Goal: reduce the main choke point.

Tasks:

- extract OverlayHost,
- extract PointerBridge,
- extract DropZoneHost if actively touched,
- keep layout and DOM behavior stable.

Do not:

- redesign viewport,
- change renderer behavior,
- move tool semantics into shell.

Exit criteria:

- `CanvasViewport.tsx` is smaller,
- production pointer path still works.

## Phase 5: Crop Intent Model

Goal: collapse crop complexity.

Tasks:

- add `CropIntent`,
- route apply path through `applyCropCommand`,
- keep old UI state as adapter until stable,
- test Free/Ratio/Size apply.

Do not:

- rewrite crop UI fully,
- introduce non-destructive crop stack.

Exit criteria:

- crop apply semantics are represented by one type.

## Phase 6: Native IO Policy

Goal: make trust boundary explicit.

Tasks:

- add native IO policy wrapper,
- add size/error mapping tests,
- route file open/export through wrapper,
- add Tauri runtime verification checklist.

Do not:

- build asset database,
- replace all file transfer mechanisms prematurely.

Exit criteria:

- raw file IO is no longer the default app API.

## Phase 7: Renderer Internal Split

Goal: make renderer lifecycle reviewable.

Tasks:

- extract internal texture registry,
- test upload/destroy/dispose,
- document `preserveDrawingBuffer` decision,
- add export parity case.

Do not:

- add WebGPU,
- add renderer backend framework.

Exit criteria:

- texture lifecycle is tested independently behind existing facade.

## Phase 8: CI And Verify

Goal: make quality repeatable.

Tasks:

- add root verify command,
- add CI job using existing project commands,
- add doc/runtime contract parity check if feasible,
- keep known toolchain exception documented.

Do not:

- make CI block on unstable optional local tools,
- add slow jobs without value.

Exit criteria:

- one command or CI workflow represents release confidence.

## Success Metrics

After the roadmap:

- fewer edits required for new tools,
- smaller main viewport and pointer files,
- fewer broad `as any` mocks,
- no user mutation without history decision,
- native/browser coverage boundaries are explicit,
- renderer lifecycle has visible tests,
- docs/runtime contract drift is caught.

