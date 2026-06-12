---
phase: 1
plan: 3
wave: 2
depends_on:
  - plan-1
  - plan-2
files_modified:
  - apps/desktop/src/components/editor/__tests__/ResizeCanvasModal.test.tsx (NEW)
  - apps/desktop/src/components/editor/__tests__/DeleteLayerConfirm.test.tsx (NEW)
  - apps/desktop/src/components/editor/__tests__/editor-smoke.spec.ts (or similar)
  - docs/FEATURES.md
  - docs/AI_CURRENT_TASK.md
  - docs/AI_HISTORY.md
autonomous: true
user_setup: []

must_haves:
  truths:
    - Unit tests exist for resize dialog render, input interaction, aspect ratio lock calculation
    - Unit tests exist for layer delete confirmation behavior
    - FEATURES.md updated: Resize canvas + aspect ratio lock marked DONE, layer delete confirmation marked DONE
    - AI_CURRENT_TASK.md records Phase 1 as current task
    - AI_HISTORY.md appended with Phase 1 changes
  artifacts:
    - Test files pass in CI
    - Doc files updated with correct status
---

# Plan 3: Focused Tests + Docs Updates

<objective>
Add unit tests for Phase 1 changes and update project documentation.

Purpose: Tests ensure the resize dialog and layer confirmation work correctly. Docs keep the AI and team synchronized on project status.

Output:
- ResizeCanvasModal test file
- Delete layer confirmation test file
- Updated FEATURES.md, AI_CURRENT_TASK.md, AI_HISTORY.md
</objective>

<context>
Load for context:
- apps/desktop/src/components/editor/__tests__/AppTitleBar.test.tsx — test pattern for editor components
- apps/desktop/src/components/editor/__tests__/LayersPanel.test.tsx — test pattern for layer actions
- docs/FEATURES.md — feature status tracking
- docs/AI_CURRENT_TASK.md — current task tracking
- docs/AI_HISTORY.md — change history

Note: For the aspect ratio math test, the logic is:
- If locked, aspect ratio derived as docWidth / docHeight (fixed at dialog open)
- Changing width: newHeight = Math.round(newWidth / aspectRatio)
- Changing height: newWidth = Math.round(newHeight * aspectRatio)
</context>

<tasks>

<task type="auto">
  <name>Write unit tests for ResizeCanvasModal</name>
  <files>
    apps/desktop/src/components/editor/__tests__/ResizeCanvasModal.test.tsx (NEW)
  </files>
  <action>
    Create a test file following the existing pattern (see AppTitleBar.test.tsx):

    1. Test setup: render ResizeCanvasModal within EditorProvider with mock workspace/renderer/scheduler
       - WorkspaceManager with a document containing 2 layers (800x600)
       - Mock renderer with vi.fn() for resize, uploadImage
       - Mock scheduler with requestRender vi.fn()
       - Provider with showResizeDialog = true initially

    Use the same helper pattern:
    ```ts
    import { afterEach, describe, expect, it, vi } from "vitest";
    import { render } from "solid-js/web";
    import { EditorProvider } from "../EditorContext";
    import { ResizeCanvasModal } from "../ResizeCanvasModal";
    import { WorkspaceManager } from "@/engine/workspace";

    function tick(): Promise<void> {
      return new Promise((resolve) => setTimeout(resolve, 0));
    }
    ```

    2. Test: "renders nothing when showResizeDialog is false"
       - Provider with showResizeDialog = false
       - Expect container.textContent to be ""

    3. Test: "renders dialog with current document dimensions pre-filled"
       - showResizeDialog = true
       - Expect two number inputs visible
       - Expect width input value = "800"
       - Expect height input value = "600"

    4. Test: "aspect ratio lock maintains ratio when width changes"
       - Find width and height inputs
       - Change width to "400"
       - Expect height input value to be "300" (600 * 400/800 = 300)
       - Use fireEvent or dispatch input event on the width input

    5. Test: "aspect ratio lock maintains ratio when height changes"
       - Change height to "300"
       - Expect width input value to be "400"

    6. Test: "unlocking aspect ratio stops auto-calculation"
       - Click the aspect ratio lock toggle button
       - Change width to "400"
       - Expect height to remain "600"

    7. Test: "Apply calls engine.resizeCanvas and renderer.resize"
       - Fill width=400, height=300
       - Click the "Image Size" button (by text content)
       - Expect mock renderer.resize to have been called with (400, 300, zoom, dpr)
       - Expect setShowResizeDialog(false) was called (check via signal or mock)

    8. Test: "Cancel closes dialog without changes"
       - Set showResizeDialog to true
       - Change width to "400"
       - Click Cancel button
       - Expect renderer.resize NOT called

    AVOID:
    - Do not test actual engine.resizeCanvas — test that it was called
    - Do not test renderer WebGL internals — mock them
    - Use `afterEach` to clean up: dispose render, unstub globals, restore mocks
    - Follow the exact test patterns from existing test files (vi.fn(), tick(), etc.)
  </action>
  <verify>`pnpm.cmd --filter photrez-desktop test -- --pool=forks` passes</verify>
  <done>All resize dialog tests pass</done>
</task>

<task type="auto">
  <name>Write unit tests for layer delete confirmation</name>
  <files>
    apps/desktop/src/components/editor/__tests__/DeleteLayerConfirm.test.tsx (NEW)
  </files>
  <action>
    Create a test file that verifies the confirm dialog behavior:

    1. Test setup: render a component that calls handleDeleteActiveLayer, or directly test the module
    
    Simpler approach: test useLayerActions behavior by rendering LayersPanel 
    (which uses handleDeleteActiveLayer) and triggering the delete button click.
    
    Follow the test pattern from LayersPanel.test.tsx:
    - Create mock workspace with a document having 2 layers
    - Mock window.confirm with vi.fn()
    - Render LayersPanel within EditorProvider

    2. Test: "delete button calls confirm with layer name"
       - Mock window.confirm to return true
       - Click delete button
       - Expect confirm was called with a string containing the second layer's name
       - Expect engine.deleteLayer was called

    3. Test: "cancelling confirm does not delete layer"
       - Mock window.confirm to return false
       - Click delete button
       - Expect engine.deleteLayer NOT called

    4. Test: "confirm is not shown for last layer"
       - Set document to have only 1 layer
       - Click delete button
       - Expect confirm NOT called
       - Expect engine.deleteLayer NOT called

    AVOID:
    - Do not test the full layer action flow — mock confirm
    - Use vi.spyOn(window, "confirm") for mocking
    - Use `afterEach` to restore mocks
  </action>
  <verify>`pnpm.cmd --filter photrez-desktop test -- --pool=forks` passes</verify>
  <done>All delete layer confirmation tests pass</done>
</task>

<task type="auto">
  <name>Update project documentation</name>
  <files>
    docs/FEATURES.md
    docs/AI_CURRENT_TASK.md
    docs/AI_HISTORY.md
  </files>
  <action>
    FEATURES.md:
    - In "✂️ Crop + Resize" section: change "⬜ TODO Aspect ratio lock toggle" to "✅ DONE Resize canvas dialog + aspect ratio lock toggle"
    - In "Layer System" section: change "✅ DONE Hapus layer (guard: tidak bisa hapus terakhir)" to "✅ DONE Hapus layer (guard: tidak bisa hapus terakhir, konfirmasi dialog)"

    AI_CURRENT_TASK.md:
    - Prepend a new section at the top (ANTI-TRUNCATE: do not delete existing sections):
      ```
      ---

      ## Current Task - MVP Release Blockers Phase 1 [IN PROGRESS]

      **Date:** 2026-06-06

      ### Scope
      1. Resize Canvas dialog with W/H inputs + aspect ratio lock toggle + unit selector.
      2. Layer delete confirmation dialog.
      3. Focused unit tests for both features.
      4. Documentation updates.

      ### Status
      - P0 gap C2/C6 (Resize Canvas dialog + aspect ratio lock) — FIXED
      - P0 gap L2 (Layer delete confirmation) — FIXED
      - Community: tests passing, docs updated

      ### Verification Results
      - PASS: `pnpm.cmd run build`
      - PASS: `pnpm.cmd --filter photrez-desktop test -- --pool=forks` (N tests)
      ```
      (Fill actual test count after running)

    AI_HISTORY.md:
    - Append new entry:
      ```
      ---

      ## 2026-06-06 — MVP Release Blockers Phase 1

      ### FEATURE: Resize Canvas Dialog + Aspect Ratio Lock
      - **Module:** UI/Frontend
      - Built ResizeCanvasModal dialog with width/height number inputs, aspect ratio lock toggle (chain-link icon), px unit selector.
      - Wired into Image menu (AppTitleBar) and Canvas Properties panel.
      - Apply calls engine.resizeCanvas() + renderer.resize() + re-uploads layer textures.

      ### FEATURE: Layer Delete Confirmation
      - **Module:** UI/Frontend
      - Added window.confirm() before handleDeleteActiveLayer with layer name and "can be undone" note.
      - Existing last-layer guard preserved.

      ### FEATURE: Focused Unit Tests
      - **Module:** Testing
      - Added tests for ResizeCanvasModal (render, aspect ratio locking, apply/cancel).
      - Added tests for delete layer confirmation (confirm called, cancel aborts, last-layer guard).

      ### DOCS: Updated documentation
      - FEATURES.md: Resize canvas + aspect ratio lock marked DONE; layer delete with confirmation marked DONE.
      - AI_CURRENT_TASK.md: MVP Blockers Phase 1 current task.
      - AI_HISTORY.md: This entry.
      ```

    AVOID:
    - Use UTF-8 encoding (no BOM). Use `Set-Content -Encoding utf8` or `Out-File -Encoding utf8`.
    - Do NOT use `Set-Content -Encoding Unicode` for markdown files.
    - Do NOT truncate or overwrite existing history — only append.
  </action>
  <verify>Check git diff shows text changes, not binary</verify>
  <done>FEATURES.md, AI_CURRENT_TASK.md, AI_HISTORY.md all updated correctly</done>
</task>

</tasks>

<verification>
After all tasks, verify:
- [ ] `pnpm run build` passes
- [ ] `pnpm.cmd --filter photrez-desktop test -- --pool=forks` passes (all existing + new tests)
- [ ] FEATURES.md shows both features as DONE
- [ ] AI_CURRENT_TASK.md has MVP Blockers Phase 1 section
- [ ] AI_HISTORY.md has correct new entry
</verification>

<success_criteria>
- [ ] All tasks verified
- [ ] Must-haves confirmed
- [ ] Build + full test suite pass
</success_criteria>
