# Save, Save As & Export Flow — Design Spec

> **Date**: 2026-07-02
> **Status**: Draft for review
> **Based on**: Research across Photoshop, GIMP, Krita, Inkscape, UX StackExchange & community forums

---

## 1. Problem Statement

Photrez currently has:

| Menu | Shortcut | Format | Behavior |
|---|---|---|---|
| Save Project | `Ctrl+S` | `.ptz` | Overwrite `.ptz` (or redirect) |
| Save As… | `Ctrl+Shift+S` | `.ptz` only | Native dialog → project save |
| Export… | `Ctrl+Alt+E` | PNG/JPEG/WebP | Custom dialog with quality slider |

**Problems:**
1. "Save As" only handles `.ptz` — user must use Export for flat formats
2. No workflow for single-layer documents (e.g., open `.jpg` → edit → quick save)
3. Unclear distinction between Save, Save As, and Export for non-experts

**Goal:** A unified file-saving UX that is comfortable for both professionals and casual users, following industry best practices while preventing accidental data loss.

---

## 2. Design Principles

1. **Safe by default**: Prevent accidental loss of layers/editing data
2. **Predictable**: Save As changes the working document; Export does not
3. **Fast path for simple workflows**: Single-layer → quick overwrite
4. **Guardrails, not walls**: Warning + optional `.ptz` backup instead of blocking
5. **Industry familiar**: Follow Photoshop/Krita conventions where they work

---

## 3. Proposed Flow

### 3.1 Menu Structure

```
File
├── Save             (Ctrl+S)        → see §3.2
├── Save As…         (Ctrl+Shift+S)  → see §3.3
├────────────────────
├── Export…          (Ctrl+Alt+E)    → see §3.4
├── Print…           (Ctrl+P)
```

### 3.2 Save (Ctrl+S)

#### Behavior

| Document state | Behavior |
|---|---|
| **Source file exists** (any format, single or multi-layer) | **Overwrite** the source file directly. No dialog. Composited to flat if source is image format; serialized to `.ptz` if source is `.ptz`. |
| **Source file exists BUT source is `.jpg`/`.png`/`.webp` with 2+ layers** | **Redirect to Save As** dialog. User must choose a format — because overwriting a flat format with the current document would discard layers. |
| **New/unsaved document** | **Redirect to Save As** dialog. |

> Rationale: Multi-layer redirect prevents accidentally stripping layers by overwriting a flat image file.

### 3.3 Save As (Ctrl+Shift+S)

Native OS save dialog with ALL supported formats:

| Format | Behavior | Warning | Quality Dialog |
|---|---|---|---|
| `.ptz` | Save project (all layers). Working doc switches to new `.ptz` | None | None |
| `.png` | Composite all visible layers → save as PNG. **Working doc switches to `.png`** | Only if 2+ layers | None |
| `.jpg` | Composite all visible layers → save as JPEG. **Working doc switches to `.jpg`** | Only if 2+ layers | ✅ Quality slider (1-100) |
| `.webp` | Composite all visible layers → save as WebP. **Working doc switches to `.webp`** | Only if 2+ layers | ✅ Quality slider (1-100) |

#### Warning (multi-layer → flat format only)

> **"Save as JPEG will flatten [X] layers into a single image.**
>
> Individual layers cannot be recovered after closing this document.
>
> ✅ Also save a project backup (.ptz) to preserve layers
>
> [Cancel] [Save as JPEG]"

- Checkbox is **ON by default**
- When ON: saves both the flat file AND a `.ptz` project file in the same directory (named `filename.ptz`)
- Warning is **NOT shown** for single-layer documents (even if format change, e.g., `.jpg` → `.png`)

#### Quality Dialog (JPEG/WebP only)

A simple modal, not the full Export dialog:

```
┌─────────────────────────────┐
│ JPEG Quality                │
│                             │
│ ───●─────────────────── 85% │
│                             │
│ [Cancel]  [Save as JPEG]    │
└─────────────────────────────┘
```

- No format description, no info card — keep it minimal
- Default quality: 92 (JPEG standard)

### 3.4 Export (Ctrl+Alt+E) — Existing Behavior with Tweaks

**Unchanged:** Custom dialog with format picker, quality slider, format description, document info card.

**Key difference from Save As:**
- Export does **NOT** change the working document
- Export is for producing output files while continuing to work on the project
- Export does **NOT** show the warning (user explicitly chose "Export" — they know what they're doing)



## 4. Working Document Switch Semantics

This is the core behavioral rule:

| Action | Working doc path/format changes? | Next Ctrl+S goes to? |
|---|---|---|
| **Save** | No change | Same as before |
| **Save As → `.ptz`** | ✅ Switches to new `.ptz` | New `.ptz` |
| **Save As → `.jpg`** | ✅ Switches to new `.jpg` | New `.jpg` |
| **Export** | ❌ No change | Original document |
| **Save a Copy** | ❌ No change | Original document |

**Tab title updates after Save As:**
- Before: `photo.jpg *`
- After Save As `.png`: `photo.png` (clean — just saved)
- User edits more: `photo.png *`

---

## 5. Edge Cases

### 5.1 Open `.jpg` → Add Layers → Save

- Save redirects to Save As dialog (can't overwrite a flat file with a multi-layer doc)
- User picks format they want

### 5.2 Open `.jpg` → Add Layers → Save As `.jpg` with Backup

- Warning appears (2+ layers → flat format)
- Checkbox "Also save .ptz" is ON
- Result: `photo.jpg` (flat) + `photo.ptz` (backup with all layers)
- Working doc: `photo.jpg`
- If user next time opens `photo.jpg`: only 1 layer (the composite). They must open `photo.ptz` to get layers back.

### 5.3 New Document (Untitled) → Save

- Redirect to Save As
- Default name: `Untitled-1.ptz`
- User can change format

### 5.4 Save As → Same Path as Existing Project File

- Native OS dialog handles overwrite confirmation
- No additional Photrez logic needed

### 5.5 Undo After Save As Flat Format

- Undo works within the session (engine state unchanged)
- After close + reopen: flat file has no layers, undo history is lost
- The `.ptz` backup (if checkbox was ON) preserves full editing capability

---

## 6. Implementation Sketch

### 6.1 Components to Modify

| File | Change |
|---|---|
| `useEditorCommands.ts` | Refactor `file.save` and `file.save-as` logic per decision matrix |
| `exportDocument.ts` | Optionally reuse `encodeComposite` for Save As flat formats |
| `ExportDialog.tsx` | Minor tweaks, no major changes |
| `AppMenuBar.tsx` | Add "Save a Copy" menu item (optional) |
| `editorState.ts` | Possibly add `saveAsBackupPtz` signal for checkbox |
| `projectSerialize.ts` | Already has `serializeAndSaveProject` — reusable |

### 6.2 Key Logic: `execute("file.save")`

```typescript
case "file.save": {
  const session = editor.workspace.getActiveSession();
  if (!session) break;

  // New/unsaved → redirect to Save As
  if (!session.sourcePath || session.sourcePath === "") {
    execute("file.save-as");
    break;
  }

  // Multi-layer with non-.ptz source → redirect to Save As
  const engine = editor.workspace.getActiveEngine();
  const layerCount = engine?.getLayers().length ?? 0;
  const ext = session.sourcePath.split(".").pop()?.toLowerCase();
  if (layerCount > 1 && ext !== "ptz") {
    execute("file.save-as");
    break;
  }

  // Single-layer or .ptz → fast overwrite
  if (ext === "ptz") {
    // Quick .ptz save
    await serializeAndSaveProject(engine, session.sourcePath);
  } else {
    // Flat composite + overwrite
    const format = ext === "jpg" || ext === "jpeg" ? "jpeg" : ext as ExportFormat;
    const bytes = await encodeComposite(engine, format, 92);
    await writeFileBytes(session.sourcePath, bytes);
  }
  break;
}
```

### 6.3 Key Logic: `execute("file.save-as")`

```typescript
case "file.save-as": {
  const session = editor.workspace.getActiveSession();
  if (!session) break;

  const path = await showSaveDialog(defaultName); // ALL formats
  if (!path) return;

  const ext = path.split(".").pop()?.toLowerCase();

  if (ext === "ptz") {
    // Project save — working doc switches
    await serializeAndSaveProject(engine, path);
    session.sourcePath = path;
    session.displayName = /* new name */;
    // Clear dirty
  } else {
    // Flat format save
    const layerCount = engine?.getLayers().length ?? 0;
    if (layerCount > 1) {
      // Show warning dialog with "Also save .ptz" checkbox
      const result = await showSaveAsWarning(layerCount, format);
      if (!result.confirmed) return;
      if (result.saveBackup) {
        const backupPath = path.replace(/\.[^.]+$/, ".ptz");
        await serializeAndSaveProject(engine, backupPath);
      }
    }

    // Quality dialog for JPEG/WebP
    const quality = (ext === "jpg" || ext === "jpeg" || ext === "webp")
      ? await showQualityDialog(format)
      : 100;

    const bytes = await encodeComposite(engine, format, quality);
    await writeFileBytes(path, bytes);

    // Working doc switches to flat format
    session.sourcePath = path;
    session.displayName = /* new name */;
    // Clear dirty
  }
  break;
}
```

---

## 7. Resolved Questions

1. **"Save a Copy"** — **Deferred (YAGNI).** Export covers the use case.
2. **Quality dialog for Save As** — **Native OS dialog** (simple, no custom UI needed).
3. **Tab dirty indicator** — Single-layer: clean (output = all data). Multi-layer with backup `.ptz`: clean. Multi-layer without backup `.ptz`: stays dirty (layers in memory not persisted).

---

## 8. References

- [Adobe Photoshop — Save your work](https://helpx.adobe.com/photoshop/desktop/save-and-export/save-files/save-your-work.html)
- [GIMP GUI Redesign — Save + export specification](https://gui.gimp.org/index.php?title=Save_+_export_specification)
- [Krita Artists — Export vs Save As discussion](https://krita-artists.org/t/export-vs-save-as/42406)
- [UX StackExchange — Distinction between saving and exporting](https://ux.stackexchange.com/questions/72779/distinction-between-saving-and-exporting)
- [StackOverflow — Is File Export always redundant when you have Save As](https://stackoverflow.com/questions/764879/is-file-export-always-redundant-when-you-have-file-save-as)
- [GIMP docs — Getting Images out of GIMP](https://docs.gimp.org/2.10/en/gimp-images-out.html)
- [Inkscape Wiki — Save as vs export](https://wiki.inkscape.org/wiki/Save_as_vs_export)
