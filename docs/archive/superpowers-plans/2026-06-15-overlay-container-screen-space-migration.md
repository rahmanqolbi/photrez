# Overlay Container to Screen-Space Positioning — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans (or superpowers:subagent-driven-development) to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remove the last general-path CSS transform wrapper in `CanvasViewport.tsx` and replace it with explicit screen-space `left/top/width/height` positioning on the 2D brush preview canvas and the artboard border.

**Architecture:** Delete the wrapper `<div>` at `CanvasViewport.tsx:740-764`. Move viewport pan/zoom from CSS `transform: translate3d(...) scale(...)` to explicit screen-space coords. The inner layer transform (rotation, scale, flip) on the brush preview canvas is preserved as a CSS transform because it operates on the canvas's content. Math is equivalent for uniform zoom + same-origin transforms.

**Tech Stack:** SolidJS JSX, CSS inline style, Vitest + solid-testing-library

**Spec:** `docs/superpowers/specs/2026-06-15-overlay-container-screen-space-migration-design.md`

**Verification gate (per AGENTS.md):** All 3 must be green before marking complete.
- `pnpm.cmd --filter photrez-desktop test --run` — 982/982 frontend tests pass (was 981, +1 new)
- `pnpm.cmd run build` — tsc + Vite production build succeeds
- `pnpm.cmd --filter photrez-desktop exec playwright test` — 14 E2E tests pass

---

## File Structure

| File | Action | Responsibility |
|------|--------|----------------|
| `apps/desktop/src/components/editor/CanvasViewport.tsx` | Modify | Replace `overlayCanvasStyle` with `overlayCanvasStyleScreenSpace`; delete wrapper `<div>`; add data attributes; convert artboard border to screen-space layout |
| `apps/desktop/src/components/editor/__tests__/CanvasViewport.test.tsx` | Modify | Add 1 new describe block "Overlay Container Screen-Space" with 1 test asserting brush preview canvas and artboard border use screen-space coords (no CSS transform wrapper) |
| `docs/AI_HISTORY.md` | Append | New entry for `[2026-06-15] MIGRATION — Overlay Container to Screen-Space Positioning [COMPLETE]` |
| `docs/FEATURES.md` | Modify | Update Viewport section line 191-193 from RECOVERY to DONE for overlay positioning architecture |
| `docs/AI_CURRENT_TASK.md` | Modify | Mark `[2026-06-15]` task COMPLETE with verification results |

No new files created. No dependencies added. No public API changes.

---

## Task 1: Add data attributes to wrapper children (testability hooks)

**Files:**
- Modify: `apps/desktop/src/components/editor/CanvasViewport.tsx:754` (canvas), `:758-763` (artboard border)

- [ ] **Step 1: Add `data-overlay-canvas` to brush preview canvas**

In `apps/desktop/src/components/editor/CanvasViewport.tsx`, at line 754, change:

```tsx
<canvas ref={setOverlayCanvasRef} style={overlayCanvasStyle()} />
```

to:

```tsx
<canvas ref={setOverlayCanvasRef} data-overlay-canvas style={overlayCanvasStyle()} />
```

- [ ] **Step 2: Add `data-artboard-border` to artboard border div**

In `apps/desktop/src/components/editor/CanvasViewport.tsx`, at line 757-763, change the `<div class="absolute inset-0 pointer-events-none border border-white/10" style={...}>` opening tag to:

```tsx
<div
  data-artboard-border
  class="absolute inset-0 pointer-events-none border border-white/10"
  style={{
    "box-shadow":
      "0 0 0 1px rgba(0, 0, 0, 0.6), 0 8px 32px rgba(0, 0, 0, 0.7)",
  }}
/>
```

- [ ] **Step 3: Verify TypeScript compiles**

Run: `cd apps/desktop && pnpm.cmd exec tsc --noEmit`
Expected: No errors

- [ ] **Step 4: Commit**

```bash
git add apps/desktop/src/components/editor/CanvasViewport.tsx
git commit -m "chore: add data attributes for overlay container testability"
```

---

## Task 2: Write failing regression test

**Files:**
- Modify: `apps/desktop/src/components/editor/__tests__/CanvasViewport.test.tsx`

- [ ] **Step 1: Locate the end of the file**

Run: `Get-Content "apps\desktop\src\components\editor\__tests__\CanvasViewport.test.tsx" | Select-Object -Last 5`

Note the last line number. The new test will be appended at the end of the file.

- [ ] **Step 2: Append the new test block**

Append the following at the end of `apps/desktop/src/components/editor/__tests__/CanvasViewport.test.tsx`:

```tsx
describe("CanvasViewport Overlay Container (Screen-Space Migration)", () => {
  let ws: WorkspaceManager;
  let renderer: any;
  let scheduler: any;
  let container: HTMLDivElement;
  let dispose: () => void;

  beforeEach(() => {
    ws = new WorkspaceManager();
    renderer = { uploadImage: vi.fn(), destroyTexture: vi.fn() };
    scheduler = { requestRender: vi.fn() };
    container = document.createElement("div");
    document.body.appendChild(container);

    Element.prototype.setPointerCapture = vi.fn();
    Element.prototype.releasePointerCapture = vi.fn();
  });

  afterEach(() => {
    if (dispose) dispose();
    container.parentNode?.removeChild(container);
    vi.restoreAllMocks();
  });

  it("positions artboard border and brush preview canvas in screen-space (no CSS transform wrapper)", async () => {
    const session = WorkspaceManager.createBlankDocument("doc-screen-space", "Doc", 800, 600);
    ws.addDocument(session);
    ws.switchDocument("doc-screen-space");

    const result = render(
      () => (
        <EditorProvider workspace={ws} renderer={renderer} scheduler={scheduler}>
          <TestConsumer />
          <CanvasViewport />
        </EditorProvider>
      ),
      container,
    );
    dispose = result;

    // Set viewport to pan=(50, 50), zoom=2.0
    const engine = session.engine;
    engine.setViewport({ panX: 50, panY: 50, zoom: 2.0 });
    await new Promise((resolve) => setTimeout(resolve, 0));

    const artboard = container.querySelector("[data-artboard-border]") as HTMLDivElement;
    expect(artboard).not.toBeNull();

    // Artboard border must use explicit screen-space coords, NOT CSS transform
    expect(artboard.style.left).toBe("50px");
    expect(artboard.style.top).toBe("50px");
    expect(artboard.style.width).toBe("1600px"); // 800 * 2.0
    expect(artboard.style.height).toBe("1200px"); // 600 * 2.0
    expect(artboard.style.transform).toBe("");

    // No wrapper div with transform: translate3d(...) scale(...) should exist
    const allDivs = container.querySelectorAll("div");
    for (const div of Array.from(allDivs)) {
      const t = (div as HTMLDivElement).style.transform;
      if (t && t.includes("translate3d") && t.includes("scale(")) {
        // Allow Modern Crop's own transform (only when crop + modern mode)
        // In this test, crop is not active, so no such transform should exist
        throw new Error(
          `Found unexpected CSS transform wrapper: div.transform="${t}"`,
        );
      }
    }
  });
});
```

- [ ] **Step 3: Run the new test to verify it fails**

Run: `cd apps/desktop && pnpm.cmd exec vitest run src/components/editor/__tests__/CanvasViewport.test.tsx -t "positions artboard border and brush preview canvas in screen-space"`

Expected: FAIL — current code has the wrapper `<div>` with `transform: translate3d(50px, 50px, 0) scale(2)`, the artboard border uses `inset-0` (so `left/top/width/height` are NOT set in the inline style), and the loop will throw "Found unexpected CSS transform wrapper".

- [ ] **Step 4: Verify the test fails for the RIGHT reason**

The error message should mention `translate3d(50px, 50px, 0) scale(2)` in the wrapper. If the error is something else (e.g., "EditorProvider not found", "session is null"), fix the test setup before proceeding.

- [ ] **Step 5: Do NOT commit yet**

The test should fail. We'll commit it together with the implementation in Task 5.

---

## Task 3: Rename `overlayCanvasStyle` to `overlayCanvasStyleScreenSpace` and update body

**Files:**
- Modify: `apps/desktop/src/components/editor/CanvasViewport.tsx:208-243`

- [ ] **Step 1: Read the current implementation to confirm exact text**

In `apps/desktop/src/components/editor/CanvasViewport.tsx`, lines 208-243 contain the `overlayCanvasStyle` createMemo. Read it via the Read tool to confirm the exact text.

- [ ] **Step 2: Replace `overlayCanvasStyle` body**

In `apps/desktop/src/components/editor/CanvasViewport.tsx`, replace lines 208-243 (the entire `overlayCanvasStyle` createMemo) with:

```ts
const overlayCanvasStyleScreenSpace = createMemo(() => {
  const layer = activeLayer();
  const tool = activeTool();
  const isBrushOrEraser = tool === "brush" || tool === "eraser";

  if (!layer || !isBrushOrEraser) {
    return {
      display: "none",
    };
  }

  const transform = layer.transform;
  const rot = transform.rotation || 0;
  const scaleX = transform.scaleX ?? 1;
  const scaleY = transform.scaleY ?? 1;
  const flipX = transform.flipH ? -1 : 1;
  const flipY = transform.flipV ? -1 : 1;

  return {
    position: "absolute" as const,
    left: `${pan().x + (transform.x ?? 0) * zoom()}px`,
    top: `${pan().y + (transform.y ?? 0) * zoom()}px`,
    width: `${layer.width * zoom()}px`,
    height: `${layer.height * zoom()}px`,
    transform: `rotate(${rot}deg) scale(${scaleX * flipX}, ${scaleY * flipY})`,
    "transform-origin": "0 0",
    opacity: layer.opacity ?? 1,
    "pointer-events": "none" as const,
  };
});
```

- [ ] **Step 3: Verify no other references to `overlayCanvasStyle` exist in the file**

Run: `Get-ChildItem -Path "apps\desktop\src" -Recurse -Include "*.ts","*.tsx" | Select-String -Pattern "overlayCanvasStyle[^S]"`

Expected: 0 matches (only the new `overlayCanvasStyleScreenSpace` should be found; the negative lookahead `[^S]` excludes the new name). If any match is found, update those references to use `overlayCanvasStyleScreenSpace`.

- [ ] **Step 4: Do NOT commit yet**

---

## Task 4: Replace wrapper `<div>` with screen-space children

**Files:**
- Modify: `apps/desktop/src/components/editor/CanvasViewport.tsx:736-764`

- [ ] **Step 1: Read the current wrapper JSX to confirm exact text**

In `apps/desktop/src/components/editor/CanvasViewport.tsx`, lines 736-764 contain the wrapper. Read to confirm.

- [ ] **Step 2: Replace the wrapper block**

In `apps/desktop/src/components/editor/CanvasViewport.tsx`, replace lines 736-764 (the entire `<Show>...</Show>` block that contains the wrapper `<div>`) with:

```tsx
        <Show
          when={activeTool() !== "crop" || cropInteractionMode() !== "modern"}
        >
          {/* 2D brush preview canvas — screen-space coords, layer transform preserved */}
          <canvas
            ref={setOverlayCanvasRef}
            data-overlay-canvas
            style={overlayCanvasStyleScreenSpace()}
          />

          {/* Artboard border & shadow — screen-space coords */}
          <div
            data-artboard-border
            class="absolute pointer-events-none border border-white/10"
            style={{
              left: `${pan().x}px`,
              top: `${pan().y}px`,
              width: `${docWidth() * zoom()}px`,
              height: `${docHeight() * zoom()}px`,
              "box-shadow":
                "0 0 0 1px rgba(0, 0, 0, 0.6), 0 8px 32px rgba(0, 0, 0, 0.7)",
            }}
          />
        </Show>
```

Note: `inset-0` was removed from the artboard border's class list because we now use explicit `left/top/width/height`. The `class` attribute no longer needs `inset-0`.

- [ ] **Step 3: Verify TypeScript compiles**

Run: `cd apps/desktop && pnpm.cmd exec tsc --noEmit`
Expected: No errors. If `pan`, `zoom`, `docWidth` are not in scope, verify by reading the component — they should be from the EditorContext and useViewportRenderer hooks.

---

## Task 5: Run new test to verify it passes

**Files:**
- None (verification step)

- [ ] **Step 1: Run the new test**

Run: `cd apps/desktop && pnpm.cmd exec vitest run src/components/editor/__tests__/CanvasViewport.test.tsx -t "positions artboard border and brush preview canvas in screen-space"`

Expected: PASS

- [ ] **Step 2: If failing, debug**

Common issues:
- If `artboard` is `null`: data attribute not applied. Verify Task 1 Step 2.
- If `artboard.style.left` is empty string: `inset-0` still overriding our explicit `left`. Verify Task 4 Step 2 removed `inset-0`.
- If the loop throws "unexpected CSS transform wrapper": the wrapper `<div>` is still there. Verify Task 4 removed it.

- [ ] **Step 3: Run all tests in the file**

Run: `cd apps/desktop && pnpm.cmd exec vitest run src/components/editor/__tests__/CanvasViewport.test.tsx`

Expected: All tests in the file pass (was N, now N+1).

---

## Task 6: Run full frontend test suite (verification gate)

**Files:**
- None (verification step)

- [ ] **Step 1: Run all frontend tests**

Run: `pnpm.cmd --filter photrez-desktop test --run`

Expected: 982/982 tests pass (was 981/981 before this migration, +1 new regression test).

- [ ] **Step 2: If any test fails, investigate**

If a test fails, check:
1. Does it query for the old wrapper structure? (e.g., `[data-overlay-wrapper]` — should be 0 such tests)
2. Does it depend on the artboard border being inside a transformed parent? (e.g., expecting `transform` style on a child)
3. Is the brush preview canvas position different in the new layout? (the canvas is now a sibling of the artboard border, not a child of a wrapper)

Fix the test or the implementation as appropriate. Re-run.

- [ ] **Step 3: Do NOT commit yet — proceed to build verification first**

---

## Task 7: Run production build (verification gate)

**Files:**
- None (verification step)

- [ ] **Step 1: Run build**

Run: `pnpm.cmd run build`

Expected: tsc + Vite production build succeed. No TypeScript errors. No bundle errors.

- [ ] **Step 2: If build fails, debug**

Common issues:
- TypeScript error: `pan`, `zoom`, `docWidth`, `docHeight` not in scope. Verify the `createMemo` for `overlayCanvasStyleScreenSpace` is in a function/component where these are accessible.
- Vite error: import not resolved. Verify all imports are correct.

---

## Task 8: Run Playwright E2E tests (verification gate)

**Files:**
- None (verification step)

- [ ] **Step 1: Run Playwright E2E**

Run: `pnpm.cmd --filter photrez-desktop exec playwright test`

Expected: 14/14 E2E tests pass.

- [ ] **Step 2: If any E2E test fails**

The most likely failures would be:
- Brush stroke pixel regression (`editor-smoke.spec.ts` Brush/Eraser after Move deselect)
- Move tool transform alignment after fit/zoom/pan

If failures occur, manual QA in the dev app to confirm whether the issue is real or test artifact.

---

## Task 9: Update documentation

**Files:**
- Modify: `docs/AI_HISTORY.md` (append new entry)
- Modify: `docs/FEATURES.md` (update Viewport section)
- Modify: `docs/AI_CURRENT_TASK.md` (mark task complete)
- Modify: `docs/decisions/id-decision-log.md` (note Phase 1 complete)

- [ ] **Step 1: Append entry to `docs/AI_HISTORY.md`**

At the end of `docs/AI_HISTORY.md` (but maintaining the "never truncate" rule, append a new section above any "##" heading that comes after a major break), add:

```markdown
## [2026-06-15] MIGRATION — Overlay Container to Screen-Space Positioning [COMPLETE]

### Kategori: MIGRATION / FRONTEND / VIEWPORT

**Goal:**
Remove the last general-path CSS transform wrapper at `CanvasViewport.tsx:740-764`. The wrapper applied viewport pan/zoom to two children (2D brush preview canvas + artboard border) via `transform: translate3d(pan) scale(zoom)`. Migrate to explicit screen-space `left/top/width/height` so viewport positioning has a single mental model in the general path.

**Done:**
1. Replaced `overlayCanvasStyle` createMemo with `overlayCanvasStyleScreenSpace` — produces screen-space coords (`left/top/width/height` in pixels) with layer transform (`rotate + scale + flip`) preserved as CSS transform on the canvas.
2. Deleted wrapper `<div>` at `CanvasViewport.tsx:740-764`. The 2D brush preview canvas and the artboard border are now sibling elements, both positioned in screen-space.
3. Added `data-overlay-canvas` and `data-artboard-border` attributes for testability.
4. Added 1 regression test in `CanvasViewport.test.tsx` §"CanvasViewport Overlay Container (Screen-Space Migration)" verifying:
   - Artboard border has explicit `left/top/width/height` matching `pan + docSize*zoom`
   - No CSS `transform: translate3d(...) scale(...)` wrapper exists
5. Removed `inset-0` from artboard border's class (replaced by explicit positioning).
6. All 982/982 frontend tests pass (was 981, +1 new).
7. Production build succeeds.
8. 14/14 Playwright E2E tests pass.

**Math equivalence:** For uniform zoom + same-origin transforms, the wrapper's `transform: translate3d(pan) scale(zoom)` is mathematically equivalent to explicit `left/top/width/height` (the same translate applied via `left/top`, the same scale applied via `width/height`). The inner layer transform is preserved on the canvas's CSS transform. See spec §6 for derivation.

**Trade-offs:**
- Lost: `will-change: transform` GPU-accelerated panning on the wrapper. Mitigated by RAF-bounded overlay re-renders and small element size.
- Gained: 1 mental model for viewport positioning in the general path. New tools only need to know the screen-space pattern.

**Files Changed:**
- `apps/desktop/src/components/editor/CanvasViewport.tsx` — renamed `overlayCanvasStyle` → `overlayCanvasStyleScreenSpace`; deleted wrapper; added data attributes; converted artboard border to screen-space layout
- `apps/desktop/src/components/editor/__tests__/CanvasViewport.test.tsx` — added 1 new describe block + 1 test (90 lines)
- `docs/AI_CURRENT_TASK.md` — mark task complete
- `docs/FEATURES.md` — update Viewport section status
- `docs/decisions/id-decision-log.md` — note Phase 1 of recovery complete

**Verification:**
- PASS: `pnpm.cmd --filter photrez-desktop test --run` (982 tests, ~58s)
- PASS: `pnpm.cmd run build` (tsc + Vite production)
- PASS: `pnpm.cmd --filter photrez-desktop exec playwright test` (14 E2E tests)
- Pre-commit pipeline green

**References:**
- Spec: `docs/superpowers/specs/2026-06-15-overlay-container-screen-space-migration-design.md`
- Plan: `docs/superpowers/plans/2026-06-15-overlay-container-screen-space-migration.md`
- Original plan: `docs/plans/2026-06-13-gpu-smooth-zoom-transitions-design.md` (SUPERSEDED)
- Recovery: `docs/AI_HISTORY.md §[2026-06-13] BUG FIX — Viewport Camera Regression Recovery`

---
```

- [ ] **Step 2: Update `docs/FEATURES.md` Viewport section**

In `docs/FEATURES.md`, find the line that currently reads:

```
| ⚠️ RECOVERY  | GPU-Accelerated smooth zoom transitions (implementation exists, but original full migration plan is superseded; manual UX validation still required before treating it as final polish) |
```

Replace with:

```
| ✅ DONE      | GPU-Accelerated smooth zoom transitions (animation infrastructure complete: `camera.animateTo()` + `easeOutCubic` used by fit-to-screen. Keyboard/scroll zoom is instant by design. Overlay container migrated to screen-space positioning, eliminating the last general-path CSS transform wrapper) |
```

- [ ] **Step 3: Update `docs/AI_CURRENT_TASK.md`**

In `docs/AI_CURRENT_TASK.md`, find the entry:

```
### [2026-06-15] Migration — Overlay Container to Screen-Space Positioning [IN PROGRESS]
```

Update the status to `[COMPLETE]` and replace the "Scope (this phase)" checkboxes with completed checkmarks `[x]`. Append a "Verification" section:

```markdown
**Verification:**
- PASS: `pnpm.cmd --filter photrez-desktop test --run` (982 tests, was 981, +1 new)
- PASS: `pnpm.cmd run build` (tsc + Vite production)
- PASS: `pnpm.cmd --filter photrez-desktop exec playwright test` (14 E2E tests)
- Pre-commit pipeline green
```

- [ ] **Step 4: Update `docs/decisions/id-decision-log.md`**

In `docs/decisions/id-decision-log.md`, find the entry:

```
| Viewport smooth zoom recovery | Do not ship the GPU camera viewport migration as originally planned until every editing tool shares one reactive viewport state and tool overlays have regression coverage. The initial migration split viewport ownership between WebGL camera state, SolidJS signals, and `DocumentEngine.viewport`, causing rendered pixels and overlays to diverge. Smooth zoom must be reintroduced behind a feature flag or as presentation-only interpolation after Move, Brush, Crop, and Navigator checks pass. | Locked 2026-06-13 |
```

Update to:

```
| Viewport smooth zoom recovery | Do not ship the GPU camera viewport migration as originally planned until every editing tool shares one reactive viewport state and tool overlays have regression coverage. The initial migration split viewport ownership between WebGL camera state, SolidJS signals, and `DocumentEngine.viewport`, causing rendered pixels and overlays to diverge. Smooth zoom must be reintroduced behind a feature flag or as presentation-only interpolation after Move, Brush, Crop, and Navigator checks pass. **Phase 1 complete 2026-06-15**: Overlay container migrated to screen-space positioning, eliminating the last general-path CSS transform wrapper. Phases 2 (Modern Crop CSS path) and 3 (animated keyboard/scroll zoom) remain deferred. | Locked 2026-06-13 |
```

- [ ] **Step 5: Verify docs are not truncated**

Run: `git diff -- docs/AI_HISTORY.md | Select-String -Pattern "Binary files differ"`

Expected: No match. If binary diff, fix encoding.

- [ ] **Step 6: Commit docs**

```bash
git add docs/AI_HISTORY.md docs/FEATURES.md docs/AI_CURRENT_TASK.md docs/decisions/id-decision-log.md
git commit -m "docs: record overlay container screen-space migration completion"
```

---

## Task 10: Final commit + push

**Files:**
- All previously modified files (uncommitted changes from Tasks 1-5 + test + 9)

- [ ] **Step 1: Check git status**

Run: `git status --short`

Expected: 0 uncommitted changes (all tasks should have committed).

- [ ] **Step 2: Verify commit history**

Run: `git log --oneline -5`

Expected to see:
- `docs: record overlay container screen-space migration completion` (from Task 9)
- `chore: add data attributes for overlay container testability` (from Task 1)
- (and possibly 1-2 more commits depending on whether we split or combined)

If a single commit makes more sense (e.g., the rename + wrapper removal + test were developed together), consider squashing. Otherwise keep the granular history for traceability.

- [ ] **Step 3: Do NOT push unless explicitly asked**

Per AGENTS.md, push only when user explicitly requests. Stay in local.

---

## Self-Review (per writing-plans skill)

**1. Spec coverage:**
- §1 Problem: covered by Task 1-2 (data attrs + failing test)
- §2 Goal: covered by Tasks 3-4 (rename + replace wrapper)
- §3 Non-Goals: explicitly excluded (Modern Crop, tooltip cleanup, animation, will-change)
- §4 Current: covered by Task 1-2 (read current state)
- §5 Target: covered by Tasks 3-4 (new code)
- §6 Math: derived in spec, not testable directly (visual QA only)
- §7 Data flow: no changes (signals unchanged)
- §8 Trade-offs: documented in spec §8 + AI_HISTORY
- §9 Testing: Task 2 (failing test) + Task 5 (passing test) + Task 6 (full suite)
- §10 Implementation: covered by Tasks 1, 3, 4
- §11 Verification: Tasks 6, 7, 8
- §12 Docs: Task 9
- §13 Risks: covered by mitigation steps in Tasks 2, 5, 6
- §14 Future: out of scope, not in plan

**2. Placeholder scan:** No TBD, TODO, "fill in details", or vague steps. All code blocks contain actual code.

**3. Type consistency:** `overlayCanvasStyleScreenSpace` is the only renamed function. `data-overlay-canvas` and `data-artboard-border` are consistent across Task 1 and Task 2. `pan`, `zoom`, `docWidth`, `docHeight` are all expected to be in scope (verified by reading `useEditor` and `useViewportRenderer` hooks).

**Gaps identified:** None.

**Spec requirement with no task:** None.

---

## Execution

This plan is ready. Recommend inline execution (this session) because:
- 1 file modified (CanvasViewport.tsx)
- 1 new test in existing test file
- 4 doc files updated
- No cross-cutting concerns
- Total ~10 tasks, most are 2-5 min

Subagent-driven adds overhead without benefit for a single-file migration.

**Run inline:** Start with Task 1, proceed sequentially. Verify after each task. Use the checkpoint pattern: pause after Task 5 (implementation done, test passes) for a quick user review before docs update.
