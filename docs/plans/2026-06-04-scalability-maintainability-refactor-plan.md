---
phase: 2026-06-04
plan: scalability-maintainability-refactor
wave: multi
depends_on:
  - docs/AI_CONTEXT.md
  - docs/AI_CURRENT_TASK.md
  - docs/FEATURES.md
  - docs/ARCHITECTURE.md
  - docs/AI_HISTORY.md
files_modified:
  - docs/AI_CURRENT_TASK.md
  - docs/AI_HISTORY.md
  - docs/decisions/id-decision-log.md
  - apps/desktop/src/engine/document.ts
  - apps/desktop/src/components/editor/CanvasViewport.tsx
  - apps/desktop/src/components/editor/CropOverlay.tsx
  - apps/desktop/src/components/editor/OptionBar.tsx
  - apps/desktop/src/components/editor/SelectionTransformOverlay.tsx
  - apps/desktop/src/components/editor/EditorContext.tsx
  - apps/desktop/src/components/editor/LayersPanel.tsx
  - apps/desktop/src/viewport/*
  - crates/core/src/document.rs
  - crates/core/src/workspace.rs
  - crates/render/src/lib.rs
autonomous: true
user_setup: []
must_haves:
  truths:
    - "DocumentEngine remains the MVP document source of truth and public facade."
    - "Frontend components are split by real ownership boundaries, not arbitrary line count."
    - "Small stable files remain small and are not over-abstracted."
    - "Each implementation wave is independently verifiable."
    - "No new dependency is introduced."
  artifacts:
    - "Dedicated engine helper modules for layer creation, compositing, crop application, snapshotting, and pixel sampling."
    - "CanvasViewport converted into a viewport shell that composes hooks and overlays."
    - "CropOverlay separated into drag interaction, handles, guides, and tooltip rendering."
    - "OptionBar split into tool-specific option bar components."
    - "Transform overlay interaction extracted and legacy HUD duplication resolved."
    - "AI docs and decision log updated append-only."
---

# Scalability and Maintainability Refactor Plan

## Objective

Create a staged refactor plan that makes Photrez easier to scale and maintain without changing user-visible behavior.

Purpose:
- Reduce high-complexity files that currently mix multiple responsibilities.
- Preserve the locked MVP architecture: SolidJS frontend, TypeScript DocumentEngine as MVP source of truth, WebGL2 runtime renderer, Rust core/render as reference and future migration target.
- Make future features easier to place: crop logic in crop modules, transform logic in transform modules, layer logic in layer modules, renderer logic in renderer modules.

Output:
- A wave-based execution plan with concrete file targets.
- Verification gates for each wave.
- Explicit rules for what to split, what to merge, and what to leave alone.

## Discovery Summary

Discovery level: Level 0, internal refactor.

Reason:
- No new external integration.
- No new package dependency.
- Current architecture and tests already exist.
- Work is restructuring existing modules while preserving behavior.

Relevant current large files:

| Area | File | Current concern |
| --- | --- | --- |
| TS engine | `apps/desktop/src/engine/document.ts` | Document facade, layer operations, crop, render state, dirty tracking, snapshot, sampling |
| Frontend viewport | `apps/desktop/src/components/editor/CanvasViewport.tsx` | Renderer lifecycle, pointer handling, crop init, snap state, HUD, overlay composition |
| Crop UI | `apps/desktop/src/components/editor/CropOverlay.tsx` | SVG rendering, handles, drag state, crop move/resize/rotate, snapping, tooltip |
| Tool options | `apps/desktop/src/components/editor/OptionBar.tsx` | Move, selection, crop, brush option UI and handlers |
| Transform UI | `apps/desktop/src/components/editor/SelectionTransformOverlay.tsx` | Transform handles, drag state, cursor, HUD interaction |
| Editor state | `apps/desktop/src/components/editor/EditorContext.tsx` | Signals, workspace sync, crop mini history, bootstrap/open image |
| Rust core reference | `crates/core/src/document.rs` | Reference document model plus tests |
| Rust workspace reference | `crates/core/src/workspace.rs` | Session/workspace state and naming |
| Rust render future target | `crates/render/src/lib.rs` | WGPU renderer, pipeline, textures, viewport state |

Known cleanup candidates:
- `apps/desktop/src/components/editor/TransformationHUD.tsx` appears legacy or duplicate. Active imports use `TransformHud.tsx`.
- Debug `console.log` calls exist in `document.ts`, `EditorContext.tsx`, and `useLayerActions.ts`.
- `OptionBar.tsx` still owns crop presets/unit conversion that belong in viewport/domain utilities.

## Non-Goals

- Do not migrate runtime document state from TypeScript to Rust.
- Do not activate or rewrite WGPU renderer runtime.
- Do not redesign UI visuals.
- Do not add new features such as history panel, context menu, tooltip system, dialog system, native menu, or window persistence.
- Do not add new dependencies.
- Do not rename public commands or response envelope contracts.

## Architecture Rules

1. `DocumentEngine` stays the public TypeScript facade.
2. UI code can call `DocumentEngine` methods, not internal helper modules directly, unless the helper is a pure viewport/UI utility.
3. `viewport/` modules must stay pure and free of SolidJS state.
4. `components/editor/` modules may own SolidJS signals and JSX.
5. `renderer/` modules own WebGL2 rendering concerns only.
6. Rust core remains reference/test coverage unless a future migration plan explicitly changes runtime ownership.
7. Refactor waves must preserve behavior. Any behavior change becomes a separate feature or bugfix plan.

## Wave Structure

| Wave | Name | Depends on | Main risk | Required verification |
| --- | --- | --- | --- | --- |
| 0 | Baseline and docs | none | stale baseline | `git status --short`, build, frontend tests, core tests |
| 1 | TypeScript engine split | 0 | document state regression | engine tests, frontend tests |
| 2 | Pure viewport/domain utilities | 1 | geometry/crop math drift | viewport/crop/transform tests |
| 3 | CanvasViewport shell | 1, 2 | pointer/render regression | renderer, keyboard, viewport tests |
| 4 | CropOverlay modularization | 2, 3 | crop drag/cursor regression | CropOverlay tests, crop tests |
| 5 | OptionBar per-tool split | 2 | handler/history regression | build, UI sanity, frontend tests |
| 6 | Transform overlay cleanup | 2, 3 | transform/cursor regression | transform overlay and geometry tests |
| 7 | EditorContext split | 1, 3, 5 | workspace sync regression | build, frontend tests |
| 8 | Rust reference organization | 1 | reference divergence | `cargo test -p photrez-core` |
| 9 | CSS/shared UI audit | 3, 5, 6 | visual drift | build and visual/manual sanity |
| 10 | Final docs and acceptance | all | incomplete closure | full mandatory pipeline where applicable |

## Wave 0: Baseline and Documentation

### Task 0.1: Record active refactor task

<task type="auto">
<name>Append active planning task</name>
<files>
docs/AI_CURRENT_TASK.md
</files>
<action>
Append a new section for "Scalability and Maintainability Refactor Plan". Include the plan file path, scope, non-goals, and verification intent. Use append-only edits. Do not truncate older entries.
</action>
<verify>
`rg -n "Scalability and Maintainability Refactor Plan" docs/AI_CURRENT_TASK.md`
</verify>
<done>
The current task document references this plan and states that implementation has not started yet.
</done>
</task>

### Task 0.2: Capture clean baseline

<task type="auto">
<name>Run baseline verification</name>
<files>
No file changes.
</files>
<action>
Run baseline checks before implementation. Prefer existing project commands.
</action>
<verify>
`git status --short`
`pnpm.cmd run build`
`pnpm.cmd --filter photrez-desktop test`
`cargo test -p photrez-core`
</verify>
<done>
Baseline command results are recorded in the implementation notes before any code moves.
</done>
</task>

## Wave 1: TypeScript Engine Split

### Intent

Make `apps/desktop/src/engine/document.ts` maintainable while preserving `DocumentEngine` as the stable API.

### Target structure

Create:
- `apps/desktop/src/engine/layerFactory.ts`
- `apps/desktop/src/engine/layerComposite.ts`
- `apps/desktop/src/engine/cropApply.ts`
- `apps/desktop/src/engine/snapshot.ts`
- `apps/desktop/src/engine/pixelSample.ts`

Keep:
- `apps/desktop/src/engine/document.ts` as facade class.
- `apps/desktop/src/engine/types.ts` as shared model types unless type growth requires a later dedicated type split.

### Task 1.1: Extract layer factory and composite helpers

<task type="auto">
<name>Extract layer creation and compositing</name>
<files>
apps/desktop/src/engine/document.ts
apps/desktop/src/engine/layerFactory.ts
apps/desktop/src/engine/layerComposite.ts
apps/desktop/src/engine/__tests__/document.test.ts
</files>
<action>
Move layer object creation and bitmap compositing helpers out of `DocumentEngine`.
`layerFactory.ts` should create blank, duplicate, merged, and flattened layer payloads where practical.
`layerComposite.ts` should own `drawLayerToContext` and any OffscreenCanvas composition helper.
Keep `DocumentEngine.addLayer`, `duplicateLayer`, `mergeDown`, and `flattenLayers` public methods unchanged.
Do not let UI import these helpers.
</action>
<verify>
`pnpm.cmd --filter photrez-desktop test -- --run apps/desktop/src/engine/__tests__/document.test.ts`
</verify>
<done>
Layer operations produce identical document models and all existing document tests pass.
</done>
</task>

### Task 1.2: Extract crop apply, snapshot, and sampling

<task type="auto">
<name>Extract crop, snapshot, and pixel sampling helpers</name>
<files>
apps/desktop/src/engine/document.ts
apps/desktop/src/engine/cropApply.ts
apps/desktop/src/engine/snapshot.ts
apps/desktop/src/engine/pixelSample.ts
apps/desktop/src/engine/__tests__/document.test.ts
</files>
<action>
Move destructive/non-destructive crop transform logic into `cropApply.ts`.
Move `snapshot` and `restore` object clone helpers into `snapshot.ts`.
Move `samplePixel` alpha composition and ImageBitmap readback into `pixelSample.ts`.
`DocumentEngine` should call helpers and remain the only mutable owner of `model`, `textureHandles`, and dirty tracking.
</action>
<verify>
`pnpm.cmd --filter photrez-desktop test -- --run apps/desktop/src/engine/__tests__/document.test.ts`
`pnpm.cmd --filter photrez-desktop test`
</verify>
<done>
`document.ts` is smaller and still exposes the same public methods with identical test behavior.
</done>
</task>

### Task 1.3: Remove engine debug logs

<task type="auto">
<name>Remove debug logging from hot engine paths</name>
<files>
apps/desktop/src/engine/document.ts
apps/desktop/src/components/editor/useLayerActions.ts
apps/desktop/src/components/editor/EditorContext.tsx
</files>
<action>
Remove development `console.log` statements from reorder/sync/layer action hot paths.
Keep `console.error` where it reports recoverable failures unless a local project logging pattern already exists.
</action>
<verify>
`rg -n "console\\.log" apps/desktop/src/engine apps/desktop/src/components/editor`
`pnpm.cmd --filter photrez-desktop test`
</verify>
<done>
No debug `console.log` remains in engine/editor hot paths.
</done>
</task>

## Wave 2: Pure Viewport and Domain Utilities

### Intent

Move math, presets, and pure domain helpers out of UI components so UI files only wire controls.

### Target structure

Create:
- `apps/desktop/src/viewport/cropPresets.ts`
- `apps/desktop/src/viewport/unitConversion.ts`
- `apps/desktop/src/viewport/cropAutoFit.ts`
- optional `apps/desktop/src/viewport/transformInteraction.ts` only if crop and transform share identical contracts.

### Task 2.1: Extract crop presets and unit conversion

<task type="auto">
<name>Extract crop option domain helpers</name>
<files>
apps/desktop/src/components/editor/OptionBar.tsx
apps/desktop/src/viewport/cropPresets.ts
apps/desktop/src/viewport/unitConversion.ts
apps/desktop/src/__tests__/crop-geometry.test.ts
</files>
<action>
Move crop presets, PPI constant, `toUnit`, and `fromUnit` from `OptionBar.tsx` into pure viewport/domain modules.
Add or extend focused tests for unit conversion and preset lookup if no suitable test already covers them.
</action>
<verify>
`pnpm.cmd --filter photrez-desktop test -- --run apps/desktop/src/__tests__/crop-geometry.test.ts`
`pnpm.cmd run build`
</verify>
<done>
`OptionBar.tsx` no longer owns crop preset or unit conversion constants.
</done>
</task>

### Task 2.2: Extract crop auto-fit behavior

<task type="auto">
<name>Extract crop auto-fit calculation</name>
<files>
apps/desktop/src/components/editor/OptionBar.tsx
apps/desktop/src/viewport/cropAutoFit.ts
apps/desktop/src/__tests__/crop-geometry.test.ts
</files>
<action>
Move aspect ratio auto-fit math from the crop option handler into a pure helper.
The helper should accept a crop rect and aspect ratio and return the next rect.
Do not read SolidJS signals inside the helper.
</action>
<verify>
`pnpm.cmd --filter photrez-desktop test -- --run apps/desktop/src/__tests__/crop-geometry.test.ts`
</verify>
<done>
Auto-fit behavior is testable without rendering `OptionBar`.
</done>
</task>

## Wave 3: CanvasViewport Shell

### Intent

Turn `CanvasViewport.tsx` into a composition shell for refs, hooks, and overlays.

### Target structure

Create:
- `apps/desktop/src/components/editor/useViewportRenderer.ts`
- `apps/desktop/src/components/editor/useCanvasPointerTools.ts`
- `apps/desktop/src/components/editor/useCanvasDerivedState.ts`

Keep:
- `useCanvasKeyboard.ts`
- `useBrushOverlay.ts`
- `usePanNavigation.ts`

### Task 3.1: Extract renderer lifecycle

<task type="auto">
<name>Extract renderer lifecycle from CanvasViewport</name>
<files>
apps/desktop/src/components/editor/CanvasViewport.tsx
apps/desktop/src/components/editor/useViewportRenderer.ts
apps/desktop/src/renderer/webgl2.ts
apps/desktop/src/renderer/__tests__/scheduler.test.ts
</files>
<action>
Move renderer initialization, container resize, fit-to-screen, render scheduling, and viewport sync orchestration into `useViewportRenderer`.
Do not change `WebGL2Backend` behavior.
</action>
<verify>
`pnpm.cmd --filter photrez-desktop test -- --run apps/desktop/src/renderer/__tests__/scheduler.test.ts apps/desktop/src/__tests__/renderer.test.ts apps/desktop/src/__tests__/viewport.test.ts`
`pnpm.cmd run build`
</verify>
<done>
`CanvasViewport.tsx` delegates renderer lifecycle to the hook and render tests pass.
</done>
</task>

### Task 3.2: Extract pointer tool orchestration

<task type="auto">
<name>Extract canvas pointer interactions</name>
<files>
apps/desktop/src/components/editor/CanvasViewport.tsx
apps/desktop/src/components/editor/useCanvasPointerTools.ts
apps/desktop/src/viewport/input-handler.ts
apps/desktop/src/__tests__/input-handler-snap.test.ts
</files>
<action>
Move `getDocCoords`, pointer down/move/up, double-click, auto-select, selection box updates, snap line updates, and HUD update plumbing into `useCanvasPointerTools`.
Keep low-level pure input behavior in `viewport/input-handler.ts`.
</action>
<verify>
`pnpm.cmd --filter photrez-desktop test -- --run apps/desktop/src/__tests__/input-handler-snap.test.ts apps/desktop/src/__tests__/keyboard-shortcuts.test.ts apps/desktop/src/__tests__/snap-adjustment.test.ts`
</verify>
<done>
Canvas pointer flow works through a hook and existing input tests pass.
</done>
</task>

### Task 3.3: Extract derived viewport state

<task type="auto">
<name>Extract active layer and crop derived state</name>
<files>
apps/desktop/src/components/editor/CanvasViewport.tsx
apps/desktop/src/components/editor/useCanvasDerivedState.ts
apps/desktop/src/viewport/cropSnap.ts
apps/desktop/src/viewport/transformGeometry.ts
</files>
<action>
Move derived memos for active layer lock, layer transform values, layer bounding box, crop snap targets, hover cursor state, and crop initialization helpers into `useCanvasDerivedState`.
Do not duplicate document state in the hook.
</action>
<verify>
`pnpm.cmd --filter photrez-desktop test -- --run apps/desktop/src/__tests__/crop-snap.test.ts apps/desktop/src/__tests__/transform-geometry.test.ts`
`pnpm.cmd run build`
</verify>
<done>
`CanvasViewport.tsx` primarily renders canvas/overlays and wires hook outputs.
</done>
</task>

## Wave 4: CropOverlay Modularization

### Intent

Separate crop overlay interaction from crop overlay presentation.

### Target structure

Create:
- `apps/desktop/src/components/editor/useCropOverlayDrag.ts`
- `apps/desktop/src/components/editor/CropOverlayGuides.tsx`
- `apps/desktop/src/components/editor/CropOverlayHandles.tsx`
- `apps/desktop/src/components/editor/CropOverlayTooltip.tsx`

### Task 4.1: Extract crop drag state machine

<task type="auto">
<name>Extract crop drag and rotate interaction</name>
<files>
apps/desktop/src/components/editor/CropOverlay.tsx
apps/desktop/src/components/editor/useCropOverlayDrag.ts
apps/desktop/src/components/editor/__tests__/CropOverlay.test.tsx
</files>
<action>
Move active handle state, drag state, SVG coordinate conversion, pointer move/up/cancel handling, rotation handling, snap application, pan compensation, and crop commit callbacks into `useCropOverlayDrag`.
Preserve pointer capture behavior and the existing rotate cursor fixes.
</action>
<verify>
`pnpm.cmd --filter photrez-desktop test -- --run apps/desktop/src/components/editor/__tests__/CropOverlay.test.tsx`
</verify>
<done>
Crop drag, resize, move, rotate, snap, and commit behaviors are unchanged.
</done>
</task>

### Task 4.2: Extract crop presentation components

<task type="auto">
<name>Extract crop handles, guides, and tooltip rendering</name>
<files>
apps/desktop/src/components/editor/CropOverlay.tsx
apps/desktop/src/components/editor/CropOverlayGuides.tsx
apps/desktop/src/components/editor/CropOverlayHandles.tsx
apps/desktop/src/components/editor/CropOverlayTooltip.tsx
apps/desktop/src/components/editor/__tests__/CropOverlay.test.tsx
</files>
<action>
Move guide SVG rendering, handle hit target rendering, corner bracket rendering, and dimension tooltip rendering into focused components.
Keep DOM/query behavior stable where tests depend on it, or update tests to use stable semantic/testable selectors.
</action>
<verify>
`pnpm.cmd --filter photrez-desktop test -- --run apps/desktop/src/components/editor/__tests__/CropOverlay.test.tsx apps/desktop/src/__tests__/crop-snap.test.ts`
`pnpm.cmd run build`
</verify>
<done>
`CropOverlay.tsx` composes hook output and child renderers instead of owning all details.
</done>
</task>

## Wave 5: OptionBar Per Tool

### Intent

Make tool option controls scalable by giving each tool its own option component.

### Target structure

Create:
- `apps/desktop/src/components/editor/MoveOptionBar.tsx`
- `apps/desktop/src/components/editor/CropOptionBar.tsx`
- `apps/desktop/src/components/editor/BrushOptionBar.tsx`
- `apps/desktop/src/components/editor/SelectionOptionBar.tsx`
- optional `apps/desktop/src/components/editor/useTransformActions.ts`

### Task 5.1: Extract move and selection option bars

<task type="auto">
<name>Extract move and selection option UI</name>
<files>
apps/desktop/src/components/editor/OptionBar.tsx
apps/desktop/src/components/editor/MoveOptionBar.tsx
apps/desktop/src/components/editor/SelectionOptionBar.tsx
apps/desktop/src/components/editor/useTransformActions.ts
</files>
<action>
Move active layer transform fields, flip/reset/position/rotation handlers, auto-select toggle, and snap toggle into move/selection-specific components.
If action handlers are shared, put them into `useTransformActions`.
Do not change history commit order: commit snapshot before mutation.
</action>
<verify>
`pnpm.cmd run build`
`pnpm.cmd --filter photrez-desktop test`
</verify>
<done>
Move and selection controls no longer live in the root `OptionBar.tsx`.
</done>
</task>

### Task 5.2: Extract crop and brush option bars

<task type="auto">
<name>Extract crop and brush option UI</name>
<files>
apps/desktop/src/components/editor/OptionBar.tsx
apps/desktop/src/components/editor/CropOptionBar.tsx
apps/desktop/src/components/editor/BrushOptionBar.tsx
apps/desktop/src/viewport/cropPresets.ts
apps/desktop/src/viewport/unitConversion.ts
apps/desktop/src/viewport/cropAutoFit.ts
</files>
<action>
Move crop mode, guide mode, delete pixels, aspect preset, unit target, reset/apply/cancel, and rotate-90 controls into `CropOptionBar`.
Move brush/eraser size, hardness, opacity, and color-related controls into `BrushOptionBar` if present in current root option bar.
Root `OptionBar.tsx` becomes a compact router over active tool.
</action>
<verify>
`pnpm.cmd run build`
`pnpm.cmd --filter photrez-desktop test`
</verify>
<done>
Adding another tool option set no longer grows a monolithic `OptionBar.tsx`.
</done>
</task>

## Wave 6: Transform Overlay Cleanup

### Intent

Make transform overlay interaction easier to test and remove HUD duplication.

### Target structure

Create:
- `apps/desktop/src/components/editor/useSelectionTransformDrag.ts`
- optional `apps/desktop/src/components/editor/TransformHandles.tsx`

Resolve:
- Keep `TransformHud.tsx`.
- Delete or merge `TransformationHUD.tsx` if confirmed unused.

### Task 6.1: Extract transform interaction hook

<task type="auto">
<name>Extract selection transform drag interaction</name>
<files>
apps/desktop/src/components/editor/SelectionTransformOverlay.tsx
apps/desktop/src/components/editor/useSelectionTransformDrag.ts
apps/desktop/src/components/editor/__tests__/SelectionTransformOverlay.test.ts
</files>
<action>
Move pointer down/move/up/cancel/lost-capture handling, active handle tracking, resize/rotate/move state, and key handling into `useSelectionTransformDrag`.
Keep geometry math in `viewport/transformGeometry.ts`.
</action>
<verify>
`pnpm.cmd --filter photrez-desktop test -- --run apps/desktop/src/components/editor/__tests__/SelectionTransformOverlay.test.ts apps/desktop/src/__tests__/transform-geometry.test.ts`
</verify>
<done>
Selection transform interaction remains identical and overlay component is smaller.
</done>
</task>

### Task 6.2: Resolve HUD duplication

<task type="auto">
<name>Remove or merge legacy transformation HUD</name>
<files>
apps/desktop/src/components/editor/TransformHud.tsx
apps/desktop/src/components/editor/TransformationHUD.tsx
apps/desktop/src/components/editor/CanvasViewport.tsx
apps/desktop/src/components/editor/SelectionTransformOverlay.tsx
</files>
<action>
Confirm usage with `rg "TransformationHUD|TransformHud"`.
If `TransformationHUD.tsx` has no active imports, delete it.
If it is still needed, merge its minimal label behavior into `TransformHud.tsx` and update imports.
</action>
<verify>
`rg -n "TransformationHUD" apps/desktop/src`
`pnpm.cmd run build`
</verify>
<done>
There is a single transform HUD concept in the editor.
</done>
</task>

## Wave 7: EditorContext Split

### Intent

Keep one `useEditor()` entry point while splitting provider internals into maintainable parts.

### Target structure

Create:
- `apps/desktop/src/components/editor/editorState.ts`
- `apps/desktop/src/components/editor/cropState.ts`
- `apps/desktop/src/components/editor/workspaceSync.ts`
- optional `apps/desktop/src/components/editor/editorOpenImage.ts`

### Task 7.1: Extract editor and crop state setup

<task type="auto">
<name>Extract signal setup and crop mini history</name>
<files>
apps/desktop/src/components/editor/EditorContext.tsx
apps/desktop/src/components/editor/editorState.ts
apps/desktop/src/components/editor/cropState.ts
</files>
<action>
Move signal declarations and crop mini-history helpers into focused factory functions.
`EditorContext.tsx` should assemble the provider value, not own every state implementation detail.
Keep the exported `EditorContextValue` stable.
</action>
<verify>
`pnpm.cmd run build`
`pnpm.cmd --filter photrez-desktop test`
</verify>
<done>
Consumers of `useEditor()` do not need broad import changes.
</done>
</task>

### Task 7.2: Extract workspace sync and open image flow

<task type="auto">
<name>Extract workspace sync and bootstrap/open image helpers</name>
<files>
apps/desktop/src/components/editor/EditorContext.tsx
apps/desktop/src/components/editor/workspaceSync.ts
apps/desktop/src/components/editor/editorOpenImage.ts
apps/desktop/src/tauri/native.ts
</files>
<action>
Move `syncState`, `syncViewport`, workspace bootstrap, fallback image decode, and `openImage` orchestration into focused helpers.
Do not move document truth into SolidJS state.
</action>
<verify>
`pnpm.cmd run build`
`pnpm.cmd --filter photrez-desktop test`
</verify>
<done>
Editor provider setup remains readable and workspace behavior is unchanged.
</done>
</task>

## Wave 8: Rust Reference and Future Renderer Organization

### Intent

Keep Rust code aligned with future migration goals without destabilizing MVP runtime.

### Task 8.1: Plan-only Rust core split

<task type="auto">
<name>Assess Rust core split after TS refactor</name>
<files>
crates/core/src/document.rs
crates/core/src/workspace.rs
crates/core/src/layers.rs
crates/core/src/selection.rs
crates/core/src/transform.rs
crates/core/src/export.rs
</files>
<action>
After TypeScript engine refactor is green, compare the resulting TS module boundaries with Rust core boundaries.
Only split Rust `document.rs` if it reduces duplication and keeps tests clear.
Candidate modules: `document/layer_ops.rs`, `document/canvas_ops.rs`, `document/pixel_ops.rs`.
</action>
<verify>
`cargo test -p photrez-core`
</verify>
<done>
Rust reference remains coherent and tested.
</done>
</task>

### Task 8.2: Plan-only render crate split

<task type="auto">
<name>Assess WGPU renderer module boundaries</name>
<files>
crates/render/src/lib.rs
crates/render/src/shader.wgsl
</files>
<action>
Do not rewrite render crate until a render migration or stabilization task exists.
If refactoring is approved later, split into `renderer.rs`, `pipeline.rs`, `texture.rs`, and `viewport.rs`.
</action>
<verify>
Document the decision in `docs/decisions/id-decision-log.md`.
</verify>
<done>
Render crate is not destabilized during frontend/TS maintainability work.
</done>
</task>

## Wave 9: CSS and Shared UI Audit

### Intent

Avoid CSS sprawl and accidental design drift after component splits.

### Task 9.1: Audit CSS ownership

<task type="auto">
<name>Audit global CSS and editor styles</name>
<files>
apps/desktop/src/index.css
apps/desktop/src/styles.css
docs/reference/design-tokens.md
docs/UI_GUIDE.md
</files>
<action>
Map which styles are tokens, base app styles, editor layout styles, component utilities, and overlay-specific styles.
Only split CSS if there is a clear ownership boundary.
</action>
<verify>
`pnpm.cmd run build`
Manual visual sanity if UI styles are changed.
</verify>
<done>
Style ownership is documented and no style split is performed solely for line count.
</done>
</task>

### Task 9.2: Audit shared primitives and icons

<task type="auto">
<name>Audit editor primitives and icons</name>
<files>
apps/desktop/src/components/editor/primitives.tsx
apps/desktop/src/components/editor/icons.tsx
apps/desktop/src/components/editor/editorData.ts
</files>
<action>
Keep small shared primitives together unless a file starts owning unrelated behavior.
Do not split icon definitions unless they become tool-domain-specific or hard to search.
</action>
<verify>
`pnpm.cmd run build`
</verify>
<done>
Shared UI files remain intentionally small and stable.
</done>
</task>

## Wave 10: Final Verification and Documentation Closure

### Task 10.1: Run mandatory verification pipeline

<task type="auto">
<name>Run final verification</name>
<files>
No file changes.
</files>
<action>
Run the mandatory pipeline relevant to refactor scope.
If a known pre-existing issue blocks a command, capture the exact failure and run the strongest narrower gate.
</action>
<verify>
`cargo test -p photrez-core`
`cargo test --workspace`
`pnpm.cmd run build`
`pnpm.cmd --filter photrez-desktop test`
For app-level changes, `pnpm.cmd tauri dev`
</verify>
<done>
All required checks pass or any pre-existing blocker is clearly documented with evidence.
</done>
</task>

### Task 10.2: Append docs closure

<task type="auto">
<name>Close refactor documentation</name>
<files>
docs/AI_CURRENT_TASK.md
docs/AI_HISTORY.md
docs/FEATURES.md
docs/decisions/id-decision-log.md
</files>
<action>
Append final results, changed file list, verification evidence, and any residual risk.
Update `FEATURES.md` only if the refactor changes a documented capability or infrastructure status.
Do not truncate old history.
</action>
<verify>
`rg -n "Scalability and Maintainability Refactor" docs/AI_CURRENT_TASK.md docs/AI_HISTORY.md docs/decisions/id-decision-log.md`
</verify>
<done>
Project documentation reflects the completed refactor accurately.
</done>
</task>

## File-by-File Classification

### Split first

| File | Action |
| --- | --- |
| `apps/desktop/src/engine/document.ts` | Split into internal helper modules, keep facade |
| `apps/desktop/src/components/editor/CanvasViewport.tsx` | Split renderer, pointer tools, derived state |
| `apps/desktop/src/components/editor/CropOverlay.tsx` | Split drag hook and SVG subcomponents |
| `apps/desktop/src/components/editor/OptionBar.tsx` | Split by active tool |
| `apps/desktop/src/components/editor/SelectionTransformOverlay.tsx` | Split transform interaction hook |
| `apps/desktop/src/components/editor/EditorContext.tsx` | Split provider internals while keeping `useEditor()` |

### Merge or remove candidates

| File | Action |
| --- | --- |
| `apps/desktop/src/components/editor/TransformationHUD.tsx` | Delete or merge into `TransformHud.tsx` if unused |
| Crop unit conversion inside `OptionBar.tsx` | Move to `viewport/unitConversion.ts` |
| Crop presets inside `OptionBar.tsx` | Move to `viewport/cropPresets.ts` |
| Crop auto-fit math inside `OptionBar.tsx` | Move to `viewport/cropAutoFit.ts` |

### Keep as-is unless future growth appears

| File | Reason |
| --- | --- |
| `BottomStatusBar.tsx` | Small UI component |
| `RightDock.tsx` | Small layout component |
| `DocumentTabsBar.tsx` | Small focused component |
| `EmptyWorkspace.tsx` | Small focused component |
| `BrushCursorOverlay.tsx` | Small focused overlay |
| `LayerThumb.tsx` | Small focused component |
| `HoverHighlight.tsx` | Small focused component |
| `SmartGuides.tsx` | Small focused renderer |
| `DimensionTooltip.tsx` | Small focused component |
| `renderer/scheduler.ts` | Small focused scheduler |
| `viewport/coords.ts` | Small pure utility |
| `tauri/native.ts` | Small bridge wrapper |

## Risk Register

| Risk | Area | Mitigation |
| --- | --- | --- |
| Behavior drift during extraction | Engine and crop | One wave at a time, targeted tests after each extraction |
| Public API churn | `DocumentEngine`, `useEditor()` | Keep facade exports stable |
| Over-abstraction | Small UI files | Explicit keep-as-is list |
| Geometry regression | Crop/transform | Preserve pure viewport tests and add helper tests |
| Hidden visual regression | Overlay/UI split | Build plus targeted component tests, manual visual sanity where needed |
| Rust reference divergence | Rust core | Defer Rust split until TS runtime boundaries are stable |
| Known workspace test issue | Render crate/toolchain | Run required command, document exact pre-existing failure if it remains |

## Acceptance Criteria

- [ ] Every wave changes only the files listed for that wave.
- [ ] No new dependency is introduced.
- [ ] `DocumentEngine` public methods remain stable.
- [ ] `useEditor()` remains the single editor context entry point.
- [ ] `viewport/` helpers remain pure and testable.
- [ ] `CanvasViewport.tsx`, `CropOverlay.tsx`, `OptionBar.tsx`, and `document.ts` are significantly smaller and clearer.
- [ ] Debug `console.log` statements are removed from hot paths.
- [ ] Legacy `TransformationHUD.tsx` is resolved.
- [ ] Mandatory verification is run before marking complete.
- [ ] AI docs are updated append-only.

## Recommended Execution Order

Start with:
1. Wave 0
2. Wave 1
3. Commit
4. Wave 2
5. Wave 3
6. Commit
7. Wave 4
8. Wave 5
9. Commit
10. Wave 6
11. Wave 7
12. Commit
13. Wave 8 to Wave 10

Rationale:
- Wave 1 gives the largest maintainability gain with strong engine tests.
- Wave 2 creates pure helpers before UI files depend on them.
- Wave 3 and Wave 4 are high-risk UI interaction work and should not be mixed with engine refactor.
- Rust/reference work should follow the stabilized TypeScript runtime boundaries.
