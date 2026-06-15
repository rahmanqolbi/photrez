# AGENTS.md

Project-wide instructions for AI coding agents.

## Primary Objective

Build Photrez according to the locked MVP scope and architecture documents.

## Required Read Order (Before Any Task)

1. `docs/AI_CONTEXT.md` â€” **START HERE** (master AI rules + cross-reference map)
2. `docs/AI_CURRENT_TASK.md` â€” Active task status
3. `docs/FEATURES.md` â€” Feature implementation status
4. `docs/ARCHITECTURE.md` â€” Runtime architecture reference
5. `docs/AI_HISTORY.md` â€” Change history log

## AI Documentation Protocol

- When **any** AI doc is mentioned (`AI_CONTEXT`, `AI_CURRENT_TASK`, `AI_HISTORY`, `FEATURES`, `ARCHITECTURE`), read **ALL 5** automatically.
- Before modifying code: update `AI_CURRENT_TASK.md` with what you're doing.
- After completing work: update `AI_HISTORY.md` and `FEATURES.md` with results.
- Never truncate or overwrite history in these files â€” only append.

## Working Mode

- If user says focus on docs, do not start implementation code.
- If user says wait for command, do not execute build implementation.
- Keep decisions synchronized in `docs/decisions/id-decision-log.md`.

## Definition of Done for Any Delivery

- Changes match locked scope.
- Relevant docs are updated.
- Risks and blockers are clearly reported.

## Definition of Done for a New Tool

Sebelum declare tool baru selesai, SEMUA item di bawah harus hijau. Pattern ini didokumentasikan setelah investigasi "every new tool passes test but fails in frontend" (lihat `docs/AI_HISTORY.md` §`[2026-06-14] BUG FIX` + `docs/plans/2026-06-14-test-overhaul-reference.md`).

### Code wiring (9 langkah wajib)

- [ ] Tool type ditambahkan ke union type di `editorState.ts`
- [ ] Keyboard shortcut di `useCanvasKeyboard.ts`
- [ ] Pointer handler di `useCanvasPointerTools` dispatcher (**paling sering lupa — tanpa ini tool tidak respond ke click**)
- [ ] Toolbar button di `AppTitleBar.tsx` atau tool rail
- [ ] Option bar component (jika ada settings) di `components/editor/`
- [ ] Cursor behavior di CSS atau cursor resolver
- [ ] Undo/redo integration via `history.commit()` SEBELUM mutation
- [ ] Status bar integration (jika ada status info)
- [ ] Register di `EditorContext` state (jika tool butuh state tambahan)

### Test coverage (wajib untuk tool baru)

- [ ] **Unit tests** untuk logic murni (manager, operations, geometry) — minimum 1 test per public method
- [ ] **1 contract test** untuk state machine: minimal `idle → <action> → committed → <cleanup>` transisi. Lihat pattern di `CanvasViewport.test.tsx` §"Phase 3 Tool Switch Contracts"
- [ ] **1 CanvasViewport integration test** dengan real pointer chain (`pointerdown → pointermove → pointerup`) di `CanvasViewport.test.tsx`. Mock `useViewportRenderer`, `useBrushOverlay`, `usePanNavigation` sesuai pattern existing.
- [ ] Test **tool switch round-trip**: tool A → tool B → tool A, verify no orphan state (signals, engine state, DOM)
- [ ] Test **existing 957 tests tetap pass** — verify tidak ada regression

### Verification (wajib run semua)

- [ ] `pnpm --filter photrez-desktop test --run` hijau
- [ ] `pnpm run build` hijau
- [ ] Tambah 1 entry di `docs/AI_HISTORY.md` dengan Root Cause + Fix Rationale (atau Goal + Done untuk FEATURE)
- [ ] Update `docs/FEATURES.md` jika tool baru
- [ ] Update `docs/AI_CURRENT_TASK.md` — status COMPLETE

### Cek "Every new tool fails" anti-pattern

Sebelum commit, tanya:
1. Apakah tool respond ke click di canvas? (kalau tidak, step 3 wiring lupa)
2. Apakah option bar muncul saat tool aktif? (kalau tidak, step 5 wiring lupa)
3. Apakah cursor berubah sesuai tool? (kalau tidak, step 6 wiring lupa)
4. Apakah undo/redo bekerja untuk aksi tool ini? (kalau tidak, step 7 wiring lupa)

Kalau ada yang jawab "tidak", STOP — fix wiring dulu sebelum lanjut test.

## Verification Pipeline (MANDATORY)

**Run ALL steps below BEFORE marking any task as COMPLETE.**

### Rust Changes

```
cargo test -p photrez-core              # Core unit tests
cargo test --workspace                  # All Rust workspace tests
```

### Frontend Changes

```
pnpm.cmd run build                      # TypeScript + Vite build
pnpm.cmd --filter photrez-desktop test  # Frontend unit tests
```

### Binary / App-Level Changes (main.rs, Tauri commands)

```
pnpm.cmd tauri dev                      # Verify app compiles AND launches
```

**Do NOT skip any step.** If one fails, FIX before claiming DONE.

Notes:
- `cargo check -p photrez-desktop` will fail due to pre-existing `windres` toolchain issue.
- Use `pnpm.cmd tauri dev` (or `cargo run`) to verify binary compile â€” bypasses windres.
- `cargo test -p photrez-core` only verifies core crate â€” NOT the binary crate.
