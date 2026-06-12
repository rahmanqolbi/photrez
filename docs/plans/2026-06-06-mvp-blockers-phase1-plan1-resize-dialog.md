---
phase: 1
plan: 1
wave: 1
depends_on: []
files_modified:
  - apps/desktop/src/components/editor/ResizeCanvasModal.tsx (NEW)
  - apps/desktop/src/components/editor/editorState.ts
  - apps/desktop/src/components/editor/EditorContext.tsx
  - apps/desktop/src/components/editor/AppTitleBar.tsx
  - apps/desktop/src/components/editor/CanvasProperties.tsx
  - apps/desktop/src/components/editor/EditorShell.tsx
autonomous: true
user_setup: []

must_haves:
  truths:
    - User can open Resize Canvas dialog from Image menu and from Canvas panel
    - Dialog shows current document width/height pre-filled
    - User can type new width or height
    - Aspect ratio lock toggle maintains ratio when either dimension changes
    - Applying resize calls engine.resizeCanvas() + renderer.resize() + re-uploads layer textures
    - Cancelling/dismissing dialog does nothing
  artifacts:
    - ResizeCanvasModal.tsx exists with W/H inputs, ratio lock toggle, Apply/Cancel buttons
    - editorState has showResizeDialog signal
    - EditorContext exposes showResizeDialog/setShowResizeDialog
    - AppTitleBar handleMenuClick opens dialog on "Image" > "Image Size"
    - CanvasProperties "Resize Canvas" button opens dialog instead of entering crop mode
---

# Plan 1: Resize Canvas Dialog + Aspect Ratio Lock

<objective>
Build the Resize Canvas dialog with aspect ratio lock toggle and wire it into the UI.

Purpose: This is a P0 release blocker — there is currently no way to resize the canvas except via crop.

Output:
- ResizeCanvasModal.tsx component
- Updated editorState/EditorContext with dialog visibility signal
- Wired menu and panel entry points
</objective>

<context>
Load for context:
- apps/desktop/src/components/editor/editorState.ts — add `showResizeDialog` signal
- apps/desktop/src/components/editor/EditorContext.tsx — expose dialog signal
- apps/desktop/src/components/editor/AppTitleBar.tsx — add Image > Image Size menu handler
- apps/desktop/src/components/editor/CanvasProperties.tsx — change Resize Canvas button
- apps/desktop/src/components/editor/EditorShell.tsx — mount ResizeCanvasModal
- apps/desktop/src/engine/document.ts:507 — resizeCanvas(width, height) API

Design reference:
- Use same field/button styling as existing components (primitives.tsx)
- Dialog is a centered overlay with backdrop (semi-transparent dark)
- Width/height inputs: number type, min=1, step=1
- Aspect ratio lock: link icon button (chain link / broken chain)
- Unit selector: px (only for MVP — cm/mm/in deferred)
- Apply calls: engine.resizeCanvas(w, h); renderer.resize(w, h, zoom, dpr); re-upload all layer textures; syncViewport
</context>

<tasks>

<task type="auto">
  <name>Add showResizeDialog signal to editorState and EditorContext</name>
  <files>
    apps/desktop/src/components/editor/editorState.ts
    apps/desktop/src/components/editor/EditorContext.tsx
  </files>
  <action>
    In editorState.ts:
    - Add `const [showResizeDialog, setShowResizeDialog] = createSignal(false);`
    - Add to return object

    In EditorContext.tsx:
    - Add to EditorContextValue interface: `showResizeDialog: Accessor<boolean>; setShowResizeDialog: Setter<boolean>;`
    - In EditorProvider, destructure from editorState and pass in value object

    AVOID: Adding this to workspaceSync or cropState — it's pure UI state.
  </action>
  <verify>Build passes: `pnpm run build`</verify>
  <done>showResizeDialog signal exists, accessible via useEditor()</done>
</task>

<task type="auto">
  <name>Create ResizeCanvasModal component</name>
  <files>
    apps/desktop/src/components/editor/ResizeCanvasModal.tsx (NEW)
  </files>
  <action>
    Create a modal dialog component with the following specification:

    Structure:
    - Overlay: fixed inset-0, bg-black/60, z-50, flex items-center justify-center
    - Modal panel: bg-editor-panel, rounded-[8px], shadow-2xl, w-[320px], p-5
    - Header: "Image Size" title (text-[14px] font-medium), no close X (Escape to dismiss)
    
    Width/Height inputs:
    - Two rows, each with label + number input + "px" suffix
    - Labels: "Width:", "Height:"
    - Inputs: type="number", min={1}, step={1}, class matching editor field style
    - Pre-filled with current docWidth()/docHeight() from useEditor()
    - On input change: if aspectRatioLocked, auto-compute the other dimension

    Aspect ratio lock:
    - Button between the two rows, showing 🔗 when locked, 🔗 when unlocked (use chain-link/broken icons from Icon component)
    - Default: ON (locked)
    - Toggle: cycling between locked/unlocked
    - When locked: changing width recalculates height = width / aspectRatio (vice versa)
    - Aspect ratio derived from current docWidth/docHeight on dialog open

    Buttons:
    - Row at bottom with "Cancel" and "Image Size" buttons
    - "Cancel": closes dialog (setShowResizeDialog(false))
    - "Image Size" (primary, accent bg): validates inputs > 0, then:
      1. Get engine = workspace.getActiveEngine()
      2. Get history = workspace.getActiveHistory()
      3. history.commit(engine.snapshot()) // for undo
      4. engine.resizeCanvas(newW, newH)
      5. const dpr = window.devicePixelRatio || 1
      6. renderer.resize(newW, newH, engine.getViewport().zoom, dpr)
      7. For each layer: if layer.imageBitmap, renderer.uploadImage(layer.id, layer.imageBitmap)
      8. scheduler.requestRender()
      9. syncViewport()
      10. setShowResizeDialog(false)

    Keyboard:
    - Escape key closes dialog (onMount add keydown listener, onCleanup remove)

    Use these SolidJS patterns:
    - Local signals for internal state (w, h, aspectLocked)
    - createEffect to watch docWidth/docHeight for initial values
    - useEditor() for workspace, renderer, scheduler, docWidth, docHeight, showResizeDialog, setShowResizeDialog, syncViewport

    AVOID:
    - Do NOT use createEffect to reset w/h every render — only on dialog open
    - Do NOT import from outside @/components/editor or @/engine or @/renderer
  </action>
  <verify>Build passes: `pnpm run build`</verify>
  <done>ResizeCanvasModal.tsx created with all specified functionality</done>
</task>

<task type="auto">
  <name>Wire dialog into menu bar, CanvasProperties, and EditorShell</name>
  <files>
    apps/desktop/src/components/editor/AppTitleBar.tsx
    apps/desktop/src/components/editor/CanvasProperties.tsx
    apps/desktop/src/components/editor/EditorShell.tsx
  </files>
  <action>
    AppTitleBar.tsx:
    - In handleMenuClick, when item === "Image": setShowResizeDialog(true) (instead of or in addition to current behavior — currently File opens dialog; Image does nothing)
    - Import useEditor and destructure setShowResizeDialog

    CanvasProperties.tsx:
    - Change handleResizeCanvas from entering crop mode to: setShowResizeDialog(true)
    - Import setShowResizeDialog from useEditor (add to destructuring)

    EditorShell.tsx:
    - Import ResizeCanvasModal from "./ResizeCanvasModal"
    - Inside EditorLayout, add `<ResizeCanvasModal />` as a sibling after the main section (before BottomStatusBar)

    AVOID:
    - Do not remove the crop resize button — repurpose it
    - Do not add nested routing or state management libraries
  </action>
  <verify>Build passes: `pnpm run build`. Manual: click "Image" menu → dialog opens. Click "Resize Canvas" in Canvas panel → dialog opens. Type new value → apply → canvas resizes. Cancel → nothing changes.</verify>
  <done>Dialog reachable from Image menu + Canvas panel, works end-to-end</done>
</task>

</tasks>

<verification>
After all tasks, verify:
- [ ] `pnpm run build` passes
- [ ] `pnpm.cmd --filter photrez-desktop test` passes
- [ ] Image menu item opens dialog
- [ ] Canvas Properties "Resize Canvas" button opens dialog
- [ ] Aspect ratio lock correctly maintains ratio
- [ ] Apply resizes canvas, layers remain visible
- [ ] Cancel closes dialog without changes
- [ ] Escape key closes dialog
</verification>

<success_criteria>
- [ ] All tasks verified
- [ ] Must-haves confirmed
- [ ] Build + test pass
</success_criteria>
