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

- [ ] **Wiring tests** — simulate real user input (Tauri event, HTML5 drag, pointer chain) and assert the correct handler is invoked. See `crossDocDragDropWiring.test.tsx` for the canonical pattern. **If a feature has a wiring step, it MUST have a wiring test.** A pure-function test does NOT prove the feature works in the real app.
- [ ] **Unit tests** untuk logic murni (manager, operations, geometry) — minimum 1 test per public method
- [ ] **1 contract test** untuk state machine: minimal `idle → <action> → committed → <cleanup>` transisi. Lihat pattern di `CanvasViewport.test.tsx` §"Phase 3 Tool Switch Contracts"
- [ ] **1 CanvasViewport integration test** dengan real pointer chain (`pointerdown → pointermove → pointerup`) di `CanvasViewport.test.tsx`. Mock `useViewportRenderer`, `useBrushOverlay`, `usePanNavigation` sesuai pattern existing.
- [ ] Test **tool switch round-trip**: tool A → tool B → tool A, verify no orphan state (signals, engine state, DOM)
- [ ] Test **existing 957 tests tetap pass** — verify tidak ada regression

### Definition of Done for any New Feature (non-tool)

Bukan tool? Tetap wajib punya wiring tests. Pattern:

- [ ] **Wiring test**: render the entry-point component (e.g. `GlobalDragDropHost`, `LayerItem`, `AppTitleBar`), simulate the user event, assert the right handler is invoked and the right state is mutated. If the feature touches DOM event listeners, Tauri IPC, or Solid context, there MUST be a test that proves the listener/context is reachable from the simulated event.
- [ ] **Unit tests** untuk pure functions (mirror unit-test rule untuk tools)
- [ ] **State contract test** kalau feature mutations Solid signals (verify signal updates)
- [ ] **No regression** di test suite

Referensi: `crossDocDragDropWiring.test.tsx` (16 tests) — meng-cover 3 Tauri drop zones + 4 in-app drag wiring checks.

### Anti-pattern: "Pure function tests pass, app fails" (REAL CASE 2026-06-16)

Gejala: semua unit test hijau, tapi di real app fitur diam-diam no-op.

Penyebab umum (cek saat review):
1. **Event listener mounted di komponen yang salah** — e.g. `useTauriDragDrop` cuma di `EmptyWorkspace` → unmount saat ada dokumen → OS file drop tidak tertangkap. **Fix**: mount di host global (e.g. `EditorShell`).
2. **State machine method tidak dipanggil dari production** — e.g. `dragController.beginLayerDrag` didefinisikan tapi tidak ada call site di `LayerItem.onDragStart`. **Fix**: wire call site + test-nya.
3. **HTML5 drag handler cek state yang tidak pernah di-set** — drop zone baca `state.dragKind === "layer"` tapi state selalu `null` karena writer tidak ada. **Fix**: same as #2.

Cek wajib saat wiring test: kalau event listener perlu global, test harus fire event SEJAK host global mounted, bukan sejak sub-component mounted. Kalau state machine method dipakai sebagai gate, test harus verify producer (yang set state) dipanggil.

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

Untuk **fitur non-tool** (file drop, drag-drop, dialog, dll), tanya juga:
5. Apakah listener/event handler di-mount di lokasi yang **pasti hidup** saat user trigger? (bukan di sub-component yang bisa unmount)
6. Kalau handler baca state dari Solid context, apakah ada producer yang **benar-benar set state** di production path? (bukan cuma di test)
7. Apakah wiring test mensimulasikan event dari host yang benar (global, bukan sub-component)?

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

## AI Agent Plugins

This project uses AI agent plugins to enforce coding standards. Plugins are vendored locally (not committed to repo) and referenced in `opencode.json`.

### Ponytail (Lazy Senior Dev Mode)

Ponytail is a prompt-engineering ruleset that enforces YAGNI + stdlib-first thinking. Its core principle: **"The best code is the code you never wrote."** This directly addresses the "tests pass but app fails" pattern — over-engineered custom code often has subtle bugs that mocks don't catch.

**Install (one-time, after fresh clone):**
```bash
git clone --depth 1 https://github.com/DietrichGebert/ponytail.git .tools/ponytail
```

(vendored locally, `.tools/` is gitignored — see `.gitignore`)

**Loaded via:** `opencode.json` plugin array: `"./.tools/ponytail/.opencode/plugins/ponytail.mjs"`

**Ladder (applied before any code):**
1. Does this need to exist? → no: skip it (YAGNI)
2. Stdlib does it? → use it
3. Native platform feature? → use it
4. Already-installed dependency? → use it
5. Can this be one line? → one line
6. Only then: write the minimum code that works

**Not lazy about:** input validation at trust boundaries, error handling that prevents data loss, security, accessibility, anything explicitly requested.

**Commands available in chat:** `/ponytail lite | full | ultra | off`, `/ponytail-review`, `/ponytail-audit`, `/ponytail-debt`

### Superpowers (Workflow Skills)

Already configured in `opencode.json`. Provides process skills (brainstorming, writing-plans, subagent-driven-development, test-driven-development, etc.). Loaded on-demand based on task.

Notes:
- `cargo check -p photrez-desktop` will fail due to pre-existing `windres` toolchain issue.
- Use `pnpm.cmd tauri dev` (or `cargo run`) to verify binary compile â€” bypasses windres.
- `cargo test -p photrez-core` only verifies core crate â€” NOT the binary crate.
