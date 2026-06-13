# AI_CONTEXT.md â€” Photrez (STRICT AI RULES)

> **This document contains absolute rules for AI agents.**
> Violations cause regressions, bugs, and PR rejections.
>
> **Stack (MVP runtime):** **Tauri 2 (shell)**, **SolidJS + TypeScript (Frontend)**, **TypeScript DocumentEngine (Core)**, **WebGL2 (Renderer)**, **Tailwind CSS v4**
> **Future target:** **Rust Core (photrez-core)** + **wgpu (photrez-render)** â€” not active in MVP hot-path
> Always use Context7 for library API docs without being asked.

---

## 1. PRE-CODING PROTOCOL (MANDATORY)

Before modifying any file, AI MUST:

1. **Read & update `AI_CURRENT_TASK.md`** with what you're doing. Never work undocumented.
2. **Log changes to `AI_HISTORY.md`** grouped by category (FEATURE / BUG FIX) and sub-grouped by module (Shell, Core, Renderer, UI/Frontend). Bug fixes MUST include **Root Cause** and **Fix Rationale**.
3. **Update `FEATURES.md`** after completing a feature.
4. **Verify paths exist** â€” use CodeGraph (`codegraph` CLI) and search tools (`grep`/`glob`). **NEVER GUESS.**
   - CodeGraph Index: âš ï¸ Stale â€” last indexed at 103 files, 61 nodes, 224 edges (v0.9.7, 2026-06-02). Many files added since; run `codegraph index` to refresh.
5. **Blast radius analysis** â€” understand if changed components/types are used elsewhere via CodeGraph.
6. **Use Context7 for all external API lookups** (Tauri, SolidJS, WebGL2, Tailwind v4, wgpu). Never guess API signatures.
   - Context7 v0.4.4 configured via MCP remote. Always `resolve-library-id` before `query-docs`.
7. **Document integrity (ANTI-TRUNCATE)** â€” NEVER delete old history in `AI_HISTORY.md` or `AI_CURRENT_TASK.md`. Use `replace_file_content` to append. `write_to_file` with `Overwrite: true` on large doc files is FORBIDDEN except for initial creation.
   - **MUST use UTF-8** (no BOM). FORBIDDEN: `Set-Content -Encoding Unicode` for markdown files.
   - After editing docs, check `git diff -- docs/*.md`. If `Binary files differ` appears, STOP and fix encoding.
8. **NO destructive file deletion** without explicit user approval. Discuss before deleting any file/folder/asset.

> Cross-reference map, read order, and auto-read protocol â†’ see **`AGENTS.md`**
> Verification pipeline (build/test commands) â†’ see **`AGENTS.md`**

---

## 2. TAURI 2 â€” CORE RULES

This project uses **Tauri 2** (NOT Electron). Key rules:

- All frontendâ†”backend interaction via `invoke()` â†’ `#[tauri::command]`. **No Node.js APIs** (fs, path, child_process).
- All commands return **response envelope** `{ ok, contract_version, data/error }`. Spec: `docs/reference/command-contract-spec.md`.
- State managed via `tauri::State<'_, T>` with Mutex. No Electron patterns.
- Use `@tauri-apps/plugin-dialog` for file dialogs, `@tauri-apps/api/window` for window API.

> Full IPC code examples and Tauri vs Electron comparison â†’ see **`docs/CONVENTIONS.md` Â§2**
> Registered commands and data flow â†’ see **`ARCHITECTURE.md`**

---

## 3. SOLIDJS â€” CRITICAL PITFALLS

This project uses **SolidJS** (NOT React). These are the most common AI errors:

### âŒ React Patterns That WILL Break SolidJS

```tsx
useState(0);              // âŒ Use createSignal(0)
useEffect(() => {});       // âŒ Use createEffect(() => {})
React.FC                   // âŒ No React types exist
<div key={id}>             // âŒ Use <For>/<Index> components
layers.map(l => <X />)     // âŒ Use <For each={layers()}>{...}</For>
```

### âœ… Signal Access â€” MUST Call As Function

```tsx
const [count, setCount] = createSignal(0);
console.log(count());      // â† MUST call as function!
if (count()) { ... }       // â† evaluates actual value

// âŒ count (without parens) = always truthy function reference
```

### âœ… Control Flow Components

```tsx
<For each={layers()}>{(layer) => <LayerItem layer={layer} />}</For>
<Show when={isVisible()} fallback={<Fallback />}><Content /></Show>
```

### âœ… Cleanup Rule

Every `createEffect` that sets up a listener **MUST** have a matching `onCleanup()`.

> Full SolidJS patterns (Store, Untrack, Batch, Lifecycle) â†’ see **`docs/CONVENTIONS.md` Â§1**

---

## 4. STRICT TYPESCRIPT

- **`strict: true`** â€” no exceptions.
- **NO `.js` or `.jsx` files** in `src/`. Detection = critical failure.
- **NO `any`** â€” use `unknown` + type guard / type narrowing.
- **Use `satisfies` operator** for type validation, `import type` for type-only imports.

> Full TypeScript + Tailwind styling rules â†’ see **`GEMINI.md`**

---

## 5. RENDERER (MVP + Future)

### MVP Runtime (current)

- **WebGL2** backend (`apps/desktop/src/renderer/webgl2.ts`) for canvas rendering.
- Document state in **TypeScript DocumentEngine** (`apps/desktop/src/engine/document.ts`).
- Renderer ONLY owns: frame rendering, texture upload, compositing, viewport transforms.
- Renderer does NOT own: persistence, document state, product-level rules.
- Shaders in `apps/desktop/src/renderer/shaders.ts` (GLSL ES 3.0).

### Future Target (Rust wgpu)

- `photrez-render` crate (`crates/render/`) â€” **not active** in MVP hot-path.
- Renderer tests have pre-existing `STATUS_ENTRYPOINT_NOT_FOUND` â€” not blocking MVP.

> GPU resource lifecycle patterns â†’ see **`docs/CONVENTIONS.md` Â§4**

---

## 6. DEVELOPMENT RULES (DOs & DON'Ts)

### ðŸ”´ FORBIDDEN (NO EXCEPTIONS)

1. **NO** React patterns (useState, useEffect, React.FC, key prop) in SolidJS.
2. **NO** response envelope changes without updating `docs/reference/command-contract-spec.md` and ADR.
3. **NO** image business logic in shell/frontend layer â€” must be in Core. **MVP exception:** editing hot-path (move, transform, brush, selection) may be in TypeScript `DocumentEngine` with test coverage. Migration to Rust Core on explicit task.
4. **NO** Node.js API access (fs, path, child_process) â€” this is Tauri, NOT Electron.
5. **NO** blocking UI thread with heavy computation â€” use Web Worker or async Rust.
6. **NO** assuming work is done without running build verification.
7. **NO** `.js` or `.jsx` file extensions in `src/`.
8. **NO** `any` type â€” use `unknown` + type guard.
9. **NO** new dependencies without updating `docs/reference/dependency-inventory.md`.
10. **NO** features outside MVP scope without explicit user approval.
11. **NO** modifying UI/UX design, layout, colors, borders, or aesthetics without explicit user instruction.

### ðŸŸ¢ MANDATORY

1. **History commit**: Every state-mutating command MUST `history.commit()` BEFORE mutation.
2. **Response envelope**: All Tauri commands return `ok_response()` or `err_response()`.
3. **Input validation**: Always validate command parameters in Rust before processing.
4. **Cleanup**: Every `createEffect` with listeners MUST have `onCleanup()`.
5. **Signal access**: Always call signal as function: `count()`, NOT `count`.
6. **Type-safe IPC**: Define TypeScript interfaces matching Rust structs.
7. **Update docs**: After implementing features, update `FEATURES.md` and `AI_HISTORY.md`.

> History/undo-redo code patterns â†’ see **`docs/CONVENTIONS.md` Â§3**
> Move Tool runtime assumptions â†’ see **`docs/CONVENTIONS.md` Â§5**

---

## 7. MVP SCOPE (GUARDRAIL)

### âœ… In Scope (MVP v1)

- Layer basic (add/delete/reorder/opacity)
- Selection + move + basic transform (scale/rotate/flip)
- Crop + resize image/canvas
- Brush + eraser
- Export JPG/PNG/WebP

### âŒ Out of Scope â€” DO NOT IMPLEMENT

- PSD workflow, print checker, plugin runtime, AI features
- Cloud collaboration, command palette, native project format

> Full scope reference: **`docs/spec/product-scope.md`** and **`docs/spec/prd.md`**
> Performance budgets (installer <80MB, RAM <250MB, startup <2s) â†’ see **`AGENTS.md`** and **`ARCHITECTURE.md`**
