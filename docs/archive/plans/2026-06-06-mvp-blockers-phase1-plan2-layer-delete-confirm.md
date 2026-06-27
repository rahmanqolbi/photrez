---
phase: 1
plan: 2
wave: 1
depends_on: []
files_modified:
  - apps/desktop/src/components/editor/useLayerActions.ts
autonomous: true
user_setup: []

must_haves:
  truths:
    - User is prompted before layer is deleted
    - Confirm dialog shows layer name
    - Confirm dialog mentions undo is possible
    - If user cancels, layer is not deleted
    - If user confirms, layer is deleted as before
    - Last-layer guard still prevents deleting the only layer
  artifacts:
    - useLayerActions.ts handleDeleteActiveLayer includes confirm() call
---

# Plan 2: Layer Delete Confirmation Dialog

<objective>
Add a confirmation dialog before deleting a layer.

Purpose: This is a P0 release blocker — accidental layer deletion currently has no confirmation. Even though it's undoable, professional tools confirm destructive actions.

Output:
- Modified handleDeleteActiveLayer in useLayerActions.ts
</objective>

<context>
Load for context:
- apps/desktop/src/components/editor/useLayerActions.ts:171-182 — handleDeleteActiveLayer function
</context>

<tasks>

<task type="auto">
  <name>Add confirm dialog before layer delete</name>
  <files>
    apps/desktop/src/components/editor/useLayerActions.ts
  </files>
  <action>
    Modify handleDeleteActiveLayer (line 171-182) to add a window.confirm() before deletion:

    Current logic:
    1. cancelActiveTransformSession()
    2. Get engine, history, activeId
    3. If engine.getLayers().length <= 1, return (prevent last)
    4. history.commit(engine.snapshot())
    5. engine.deleteLayer(activeId)
    6. scheduler.requestRender()

    New logic:
    1. cancelActiveTransformSession()
    2. Get engine, history, activeId
    3. If engine.getLayers().length <= 1, return
    4. Get the layer name: engine.getLayer(activeId)?.name || "Untitled"
    5. If !confirm(`Delete layer "${name}"? This can be undone.`), return
    6. history.commit(engine.snapshot())
    7. engine.deleteLayer(activeId)
    8. scheduler.requestRender()

    The confirm string should be: `Delete layer "${name}"? This can be undone.`

    Check the engine's getLayer method to ensure it returns a layer with a `name` property (confirmed in engine/document.ts layers have `.name`).
  </action>
  <verify>Build passes. Manual: open document with 2+ layers, click delete → confirm dialog appears with layer name. Cancel → layer not deleted. Confirm → layer deleted and undoable.</verify>
  <done>handleDeleteActiveLayer prompts user before deleting, cancellable</done>
</task>

</tasks>

<verification>
After all tasks, verify:
- [ ] `pnpm run build` passes
- [ ] `pnpm.cmd --filter photrez-desktop test -- --pool=forks` passes
- [ ] Delete layer button shows confirm dialog with layer name
- [ ] Cancel closes dialog without deleting
- [ ] Confirm deletes layer (undoable)
- [ ] Last layer cannot be deleted (existing guard still works)
</verification>

<success_criteria>
- [ ] All tasks verified
- [ ] Must-haves confirmed
- [ ] Build + test pass
</success_criteria>
