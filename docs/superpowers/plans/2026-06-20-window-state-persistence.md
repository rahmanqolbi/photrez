# Window State Persistence Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make Photrez remember its main window geometry (position, size, maximized) between launches.

**Architecture (FINAL — pivoted 2026-06-20):** Single-file Rust change in `apps/desktop/src-tauri/src/main.rs`. Add a `SavedWindowState` struct, `load_window_state`/`save_window_state` helpers, `.setup(...)` to restore on launch, and `.on_window_event(...)` to save on `CloseRequested`. Zero new dependencies, zero frontend changes, zero IPC. Persistence state file lives in the OS app config dir.

**Tech Stack:** Rust (Tauri 2.11), `std::fs`, `serde_json`, `serde`, `tauri::Manager`. No new crates.

**Reference spec:** `docs/superpowers/specs/2026-06-20-window-state-persistence-design.md` (approved 2026-06-20, revised 2026-06-20 to document the pivot).

---

## Pivot notice (2026-06-20)

The original plan (Tasks 1–10 below) used `tauri-plugin-window-state` v2.4.1. That plan was implemented and merged into the working tree, but at runtime the plugin killed all Tauri IPC (`<command> not allowed. Plugin not found` for every core command and every other plugin). After two capabilities file fix attempts failed and the binary was rebuilt, the plugin was removed entirely — IPC was restored, proving the plugin was the trigger. Root cause at the plugin source level is unresolved; the dependency chain in `Cargo.lock` was clean and the plugin's `setup` + `on_window_ready` + `invoke_handler` chain looked correct in source review.

The plan was reimplemented manually in `main.rs` using Tauri core APIs + `std::fs` + `serde_json`. The original Task 1–10 below is retained as historical record of what was tried. The **final shipped implementation** is described in the design spec's "Revision: Pivoted to manual implementation" section.

Verification status at pivot time: `cargo test --workspace` 85 + 11 = 96 passed, `pnpm.cmd --filter photrez-desktop test` 86 files / 1261 tests passed, `pnpm.cmd run build` succeeded, plugin-via-IPC smoke proved the plugin is the regression source. `pnpm.cmd tauri dev` interactive smoke (NATIVE-008) is the remaining manual gate after the user rebuilds with the manual implementation in place.

---

## File Structure (original plan, retained for history)

---

## File Structure

### Files modified

| Path | Responsibility |
| --- | --- |
| `apps/desktop/src-tauri/Cargo.toml` | Add `tauri-plugin-window-state = "2"` dependency. |
| `apps/desktop/src-tauri/src/main.rs` | Register plugin in `tauri::Builder` chain (line 174 area); add wiring test in `mod tests` (after line 344, before closing `}` at 346). |
| `docs/faang-review-rejections/2026-06-18-native-runtime-smoke-checklist.md` | Add NATIVE-008 row to required smoke cases table. |
| `docs/reference/dependency-inventory.md` | Add `tauri-plugin-window-state` row to `### Core Framework` table in §3. |
| `docs/decisions/id-decision-log.md` | Append 2 new rows to existing `## Tambahan Keputusan 2026-06-20` section. |
| `docs/FEATURES.md` | Change line 265 row status from `🗓️ PLANNED (POST-MVP)` to `✅ DONE` (Desktop Shell section). |
| `docs/AI_HISTORY.md` | Append `[2026-06-20] FEATURE - Window State Persistence [COMPLETE]` entry. |
| `docs/AI_CURRENT_TASK.md` | Mark Window State Persistence task `[COMPLETE]`. |

### Files NOT modified (consolidated zero-touch)

- All frontend (SolidJS, TypeScript, Vite) files — Rust-only feature.
- `apps/desktop/src-tauri/tauri.conf.json` — window defaults stay 1280×832 (plugin restores on top, not via config).
- `apps/desktop/src-tauri/src/main.rs` existing tests and commands — no code changes outside the two new additions.
- Any frontend dependency (npm/pnpm) — no SolidJS side.

---

## Task 1: Add wiring test (RED phase — will fail to compile)

**Files:**
- Modify: `apps/desktop/src-tauri/src/main.rs:344-346` (append to `mod tests`)

- [ ] **Step 1: Open `apps/desktop/src-tauri/src/main.rs`**

Use `read` tool to view current `mod tests` closing block (lines 339–346).

- [ ] **Step 2: Insert new test before the closing `}` of `mod tests`**

Find the closing `}` of `mod tests` (currently line 346). Insert the following test immediately before it:

```rust
    #[test]
    fn test_window_state_plugin_builder_builds() {
        // ponytail: compile + no-panic gate; proves dependency and API wired.
        // If tauri-plugin-window-state dep is missing or version mismatched, this fails to compile.
        // If Builder::default().build() panics on a future Tauri/plugin incompatibility, this fails at runtime.
        let _plugin = tauri_plugin_window_state::Builder::default().build();
    }
```

Indent matches the existing tests (4 spaces inside `mod tests`).

- [ ] **Step 3: Verify test fails to compile (RED)**

Run from repo root:
```bash
cargo test --workspace --no-run
```

Expected: COMPILE ERROR referencing `tauri-plugin-window-state` as unresolved. The error will look like:
```
error[E0433]: failed to resolve: use of unresolved module or unlinked crate `tauri_plugin_window_state`
 --> apps/desktop/src-tauri/src/main.rs:...
```

This is the expected RED state — the dep is not yet added.

- [ ] **Step 4: (No commit yet)**

Do NOT commit. Continue to Task 2.

---

## Task 2: Add Cargo dependency (makes test compile — GREEN)

**Files:**
- Modify: `apps/desktop/src-tauri/Cargo.toml:6-11`

- [ ] **Step 1: Open `apps/desktop/src-tauri/Cargo.toml`**

Use `read` tool to confirm current state (lines 6–11):
```toml
[dependencies]
tauri = { version = "2.0.0", features = [] }
serde = { version = "1.0", features = ["derive"] }
serde_json = "1.0"
tauri-plugin-dialog = "2"
base64 = "0.22"
```

- [ ] **Step 2: Add `tauri-plugin-window-state = "2"` line**

Use `edit` tool to insert the new dependency. The result must be:
```toml
[dependencies]
tauri = { version = "2.0.0", features = [] }
serde = { version = "1.0", features = ["derive"] }
serde_json = "1.0"
tauri-plugin-dialog = "2"
tauri-plugin-window-state = "2"
base64 = "0.22"
```

Insert the new line after `tauri-plugin-dialog = "2"` and before `base64 = "0.22"`. Version `"2"` matches `tauri = "2.0.0"` major.

- [ ] **Step 3: Verify test now compiles (GREEN)**

Run from repo root:
```bash
cargo test --workspace --no-run
```

Expected: PASS — both `apps/desktop/src-tauri` and `crates/core` compile, `tauri-plugin-window-state` resolves, and the new test binary is generated. `Cargo.lock` is auto-updated.

- [ ] **Step 4: Verify test passes at runtime**

Run from repo root:
```bash
cargo test --workspace test_window_state_plugin_builder_builds
```

Expected: PASS — one test runs, no panic, output ends with `test result: ok. 1 passed; 0 failed`.

- [ ] **Step 5: Verify no regression in existing Rust tests**

Run from repo root:
```bash
cargo test --workspace
```

Expected: All existing tests (photrez-core + photrez-desktop) plus the new test pass. No regressions.

- [ ] **Step 6: Commit**

```bash
git add apps/desktop/src-tauri/Cargo.toml apps/desktop/src-tauri/Cargo.lock apps/desktop/src-tauri/src/main.rs
git commit -m "feat(desktop): wire tauri-plugin-window-state compile + no-panic test"
```

---

## Task 3: Register plugin in `tauri::Builder` chain (production wiring)

**Files:**
- Modify: `apps/desktop/src-tauri/src/main.rs:172-183` (the `fn main()` function)

- [ ] **Step 1: Open `apps/desktop/src-tauri/src/main.rs` `fn main()`**

Use `read` tool to confirm current state (lines 172–183):
```rust
fn main() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .invoke_handler(tauri::generate_handler![
            ping,
            get_contract_info,
            read_file_bytes,
            write_file_bytes,
        ])
        .run(tauri::generate_context!())
        .expect("Error while running Photrez");
}
```

- [ ] **Step 2: Add the plugin registration line**

Use `edit` tool. Insert `.plugin(tauri_plugin_window_state::Builder::default().build())` BEFORE `.plugin(tauri_plugin_dialog::init())`. Result:
```rust
fn main() {
    tauri::Builder::default()
        .plugin(tauri_plugin_window_state::Builder::default().build())
        .plugin(tauri_plugin_dialog::init())
        .invoke_handler(tauri::generate_handler![
            ping,
            get_contract_info,
            read_file_bytes,
            write_file_bytes,
        ])
        .run(tauri::generate_context!())
        .expect("Error while running Photrez");
}
```

Order rationale: registration order does not affect functionality (no plugin-to-plugin dependency), but listing window-state first makes it visually prominent in the builder chain. No `use` import is added — full path is consistent with existing `tauri_plugin_dialog::init()` style.

- [ ] **Step 3: Verify build still succeeds**

Run from repo root:
```bash
cargo build --manifest-path apps/desktop/src-tauri/Cargo.toml
```

Expected: PASS — binary compiles. If the pre-existing `windres` toolchain issue blocks this on Windows, fall back to:
```bash
pnpm.cmd tauri build --debug --bundles none
```
Expected: PASS — bundle generation skipped, binary still compiles.

- [ ] **Step 4: Verify all tests still pass**

Run from repo root:
```bash
cargo test --workspace
```

Expected: All tests pass including `test_window_state_plugin_builder_builds`.

- [ ] **Step 5: Commit**

```bash
git add apps/desktop/src-tauri/src/main.rs
git commit -m "feat(desktop): activate window state persistence via tauri-plugin-window-state"
```

---

## Task 4: Add NATIVE-008 row to native smoke checklist

**Files:**
- Modify: `docs/faang-review-rejections/2026-06-18-native-runtime-smoke-checklist.md:28` (after the existing NATIVE-007 row in the required smoke cases table)

- [ ] **Step 1: Open the checklist**

Use `read` tool to confirm current NATIVE-007 row at line 28:
```markdown
| NATIVE-007 | Window controls and app close path work | Minimize, restore/maximize, close. Reopen app. | Short screen recording or screenshots. | PENDING — custom control clicks not executed. |
```

- [ ] **Step 2: Append NATIVE-008 row**

Use `edit` tool. Insert the following row immediately after the NATIVE-007 row (before the blank line that precedes `## Evidence — 2026-06-20`):
```markdown
| NATIVE-008 | Window state restored after restart | Launch app, resize/move/maximize the main window, close app, relaunch via `pnpm.cmd tauri dev` or installed app. Verify the window reopens at the same position, size, maximized state, and monitor. | Before/after screenshots showing identical geometry; inspect `%APPDATA%\com.photrez.app\.window-state.json` on Windows to confirm file exists and is non-empty. | PENDING — manual follow-up. |
```

- [ ] **Step 3: Verify edit**

Run `grep -n "NATIVE-008" docs/faang-review-rejections/2026-06-18-native-runtime-smoke-checklist.md`. Expected: one line containing `NATIVE-008`.

- [ ] **Step 4: Commit**

```bash
git add docs/faang-review-rejections/2026-06-18-native-runtime-smoke-checklist.md
git commit -m "docs: add NATIVE-008 window-state-restore smoke row"
```

---

## Task 5: Update dependency inventory

**Files:**
- Modify: `docs/reference/dependency-inventory.md:39` (Core Framework table in §3)

- [ ] **Step 1: Open the inventory**

Use `read` tool to confirm Core Framework table at lines 37–44:
```markdown
| Crate | Purpose | Version Target | License | Status | Size Impact | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| `tauri` | Desktop shell framework | `2.x` | MIT/Apache-2.0 | Approved | High (expected) | Core framework, non-negotiable |
| `wgpu` | GPU rendering | Latest stable | MIT/Apache-2.0 | Approved | High (expected) | Core renderer, non-negotiable |
```

- [ ] **Step 2: Insert new row after `tauri` row**

Use `edit` tool. Insert the following row immediately after the `tauri` row and before the `wgpu` row:
```markdown
| `tauri-plugin-window-state` | Official window state persistence plugin (Tauri 2) | `2.x` | MIT/Apache-2.0 | Approved | Low | Registered in builder chain; handles auto-save/auto-restore, atomic writes, multi-monitor recovery, bounds normalization. License parity with `tauri-plugin-dialog`. |
```

- [ ] **Step 3: Verify edit**

Run `grep -n "tauri-plugin-window-state" docs/reference/dependency-inventory.md`. Expected: at least one match in the Core Framework section.

- [ ] **Step 4: Commit**

```bash
git add docs/reference/dependency-inventory.md
git commit -m "docs: register tauri-plugin-window-state in dependency inventory"
```

---

## Task 6: Append decisions to decision log

**Files:**
- Modify: `docs/decisions/id-decision-log.md:118-124` (append rows inside the existing `## Tambahan Keputusan 2026-06-20` section)

- [ ] **Step 1: Open the decision log**

Use `read` tool to confirm current `## Tambahan Keputusan 2026-06-20` section ending at line 124:
```markdown
## Tambahan Keputusan 2026-06-20

| Area | Keputusan | Status |
| ---- | --------- | ------ |
| Brush/eraser footprint boundary | ... | Locked 2026-06-20 |
| Brush/eraser feather curve | ... | Locked 2026-06-20 |
| Post-MVP requested UI backlog | ... | Planned post-MVP 2026-06-20 |
```

- [ ] **Step 2: Append two new rows to the existing section table**

Use `edit` tool. Match the LAST existing row (the `Post-MVP requested UI backlog` row) and append two new rows immediately after it, BEFORE the next blank line. The edit's `newString` is the last existing row plus the two new rows:

```markdown
| Post-MVP requested UI backlog | History Panel, native menu integration, window state persistence, a general context-menu system, tooltip system, and modal/dialog system remain desired work. They are planned after release-candidate native evidence and do not expand the locked MVP release gate. | Planned post-MVP 2026-06-20 |
| Window state persistence (storage) | Window state persistence uses `tauri-plugin-window-state` (official Tauri 2 plugin) registered in the `tauri::Builder` chain. No custom Rust commands, no IPC, no frontend code. Plugin handles auto-save on close, auto-restore on launch, atomic file writes, multi-monitor recovery, and bounds normalization. Rationale: Ponytail rung #4 (native platform feature covers it) — official plugin is actively maintained and replaces what would otherwise be ~100 lines of custom Rust code. | Locked 2026-06-20 |
| Window state persistence (scope) | Persist all five runtime state flags (`POSITION`, `SIZE`, `MAXIMIZED`, `FULLSCREEN`, `MONITOR`) via `Builder::default().build()`. Decorations flag is plugin-internal and effectively a no-op for our config-time `decorations: false` setup. Rationale: Ponytail rung #1 (YAGNI) — there is no product reason to exclude any state; excluding fullscreen or monitor would create friction without justification. Upgrade path: replace with `.with_state_flags(...)` if a future requirement needs selective filtering. | Locked 2026-06-20 |
```

- [ ] **Step 3: Verify edit**

Run `grep -c "Window state persistence" docs/decisions/id-decision-log.md`. Expected: `2` (one for storage, one for scope).

- [ ] **Step 4: Commit**

```bash
git add docs/decisions/id-decision-log.md
git commit -m "docs: log window state persistence decisions (storage + scope)"
```

---

## Task 7: Update FEATURES.md

**Files:**
- Modify: `docs/FEATURES.md:265` (Desktop Shell section row)

- [ ] **Step 1: Open FEATURES.md Desktop Shell section**

Use `read` tool to confirm line 265:
```markdown
| 🗓️ PLANNED (POST-MVP) | Window state persistence (size/position)   |
```

- [ ] **Step 2: Change row status to DONE**

Use `edit` tool. Replace:
```markdown
| 🗓️ PLANNED (POST-MVP) | Window state persistence (size/position)   |
```
with:
```markdown
| ✅ DONE      | Window state persistence (size/position)   |
```

- [ ] **Step 3: Verify edit**

Run `grep -n "Window state persistence" docs/FEATURES.md`. Expected: line 265 shows `✅ DONE` status.

- [ ] **Step 4: Commit**

```bash
git add docs/FEATURES.md
git commit -m "docs: mark window state persistence as DONE in FEATURES.md"
```

---

## Task 8: Append entry to AI_HISTORY.md

**Files:**
- Modify: `docs/AI_HISTORY.md` (append at end of file)

- [ ] **Step 1: Open AI_HISTORY.md**

Use `read` tool to find the last entry's format. The latest entry today is:
```markdown
## [2026-06-20] BUG FIX - Release Hardening documentation verification [COMPLETE]
```

- [ ] **Step 2: Append new entry**

Use `edit` tool. The last line of the file is the end of the previous entry. Append the following block (blank line first, then the new entry):

```markdown

## [2026-06-20] FEATURE - Window state persistence [COMPLETE]

**Goal:** Add main window geometry persistence (position, size, maximized, fullscreen, monitor) to Photrez via official `tauri-plugin-window-state` Tauri 2 plugin. Backlog item #1 per `docs/plans/2026-06-20-post-mvp-ui-backlog.md`.

**Done:** Spec at `docs/superpowers/specs/2026-06-20-window-state-persistence-design.md` approved 2026-06-20. Implementation: one Cargo dep added (`tauri-plugin-window-state = "2"`), one builder-chain line in `apps/desktop/src-tauri/src/main.rs`, one compile + no-panic wiring test in `mod tests`. NATIVE-008 row added to smoke checklist. Dependency inventory, decision log, FEATURES.md all synchronized. Frontend untouched (Rust-only feature).

**Fix Rationale (pre-emptive):** Documented conscious deviation from official Tauri docs example (which uses `.setup()` + `#[cfg(desktop)]`). Photrez is desktop-only (`Cargo.toml` workspace has no mobile target) and uses direct `.plugin()` chaining to match the existing `tauri_plugin_dialog::init()` style. Upgrade path is a one-line revert if a mobile target is ever added. Conscious waiver of backlog plan's Entry Gate recorded per user instruction to follow recommended order without manual NATIVE-002..007 evidence.
```

- [ ] **Step 3: Verify encoding is UTF-8 no BOM**

Run:
```bash
git diff --numstat docs/AI_HISTORY.md
```
Expected: a numeric output line (e.g., `1       0       docs/AI_HISTORY.md`), proving the file is text/UTF-8. If output is `-       -       docs/AI_HISTORY.md` (binary diff), convert file to UTF-8 no BOM first.

- [ ] **Step 4: Commit**

```bash
git add docs/AI_HISTORY.md
git commit -m "docs: log window state persistence completion in AI_HISTORY.md"
```

---

## Task 9: Mark task COMPLETE in AI_CURRENT_TASK.md

**Files:**
- Modify: `docs/AI_CURRENT_TASK.md` (find and update the Window State Persistence line)

- [ ] **Step 1: Find the Window State Persistence line**

Run `grep -n "Window State Persistence\|WINDOW STATE PERSISTENCE" docs/AI_CURRENT_TASK.md`. Expected: one match, the task line currently marked `[BRAINSTORMING]`.

- [ ] **Step 2: Change status to `[COMPLETE]`**

Use `edit` tool. The current line is something like:
```markdown
- [2026-06-20] POST-MVP - Window state persistence [BRAINSTORMING]
```

Replace with:
```markdown
- [2026-06-20] POST-MVP - Window state persistence [COMPLETE] — wired tauri-plugin-window-state plugin + NATIVE-008 smoke row; Cargo dep, builder chain registration, and wiring test added; docs (FEATURES, decision log, dependency inventory, smoke checklist, AI_HISTORY) synced. Verification: cargo test --workspace green; frontend regression green; binary compile pending windres-free path. Manual NATIVE-008 restart smoke deferred to user.
```

- [ ] **Step 3: Verify encoding is UTF-8 no BOM**

Run:
```bash
git diff --numstat docs/AI_CURRENT_TASK.md
```
Expected: numeric output (text diff). Convert to UTF-8 no BOM if binary.

- [ ] **Step 4: Commit**

```bash
git add docs/AI_CURRENT_TASK.md
git commit -m "docs: mark window state persistence task COMPLETE in AI_CURRENT_TASK.md"
```

---

## Task 10: Final verification pipeline

**Files:**
- No file modifications. Run all verification commands from spec.

- [ ] **Step 1: Frontend unit tests (must remain green)**

```bash
pnpm.cmd --filter photrez-desktop test --run
```
Expected: 1261+ tests pass (existing count was 1261 from `docs/FEATURES.md` line 317). No frontend files were touched, so this should be identical to the previous baseline.

- [ ] **Step 2: TypeScript type-check (must compile clean)**

```bash
pnpm.cmd run type-check
```
Expected: exit code 0, no errors.

- [ ] **Step 3: Frontend production build (must succeed)**

```bash
pnpm.cmd run build
```
Expected: build completes, Vite reports output bundle.

- [ ] **Step 4: Rust workspace tests (must pass including new wiring test)**

```bash
cargo test --workspace
```
Expected: `test_window_state_plugin_builder_builds` and all pre-existing tests pass.

- [ ] **Step 5: Binary compile check**

```bash
cd apps/desktop/src-tauri && cargo build && cd ../..
```
Expected: binary compiles. If `windres` toolchain error blocks this on Windows, fall back to:
```bash
pnpm.cmd tauri build --debug --bundles none
```
Expected: binary compiles, bundle step skipped.

- [ ] **Step 6: Document final status**

The `AI_CURRENT_TASK.md` line updated in Task 9 already records the verification results. Update if any step produced unexpected output.

- [ ] **Step 7: NO commit (verification only)**

No commit. The branch is ready for user review. The user must explicitly approve before any commit related to verification results (per AGENTS.md "NEVER commit unless the user explicitly asks").

---

## Self-Review Checklist (run before declaring plan complete)

- [x] **Spec coverage:** Each spec section maps to a task:
  - Goal + Non-Goals → covered by scope boundary in plan header, no implementation task needed.
  - Decisions D-WSP-001 + D-WSP-002 → captured in Task 6 (decision log append).
  - Architecture + Registration pattern → Tasks 1–3.
  - Behavior table → documented in spec, no code task needed (plugin-internal).
  - File changes (all 7 docs files + Cargo.toml + main.rs) → Tasks 2–9.
  - Testing strategy (wiring test) → Task 1 + 2.
  - Verification commands → Task 10.
- [x] **Placeholder scan:** No "TBD", "TODO", "fill in", "appropriate error handling", "similar to Task N", "implement later" patterns. All steps show exact code or exact commands.
- [x] **Type consistency:** `Builder::default().build()` referenced identically in Task 1 (test) and Task 3 (production). `tauri-plugin-window-state = "2"` referenced identically in Task 2 (Cargo.toml) and Task 6 (decision log). No name drift.
- [x] **No off-plan scope:** Plan implements exactly the spec, no extras (no reset affordance, no frontend exposure, no multi-window config — all explicitly non-goals in spec).
- [x] **DRY:** Each commit is one logical change (test setup → dep → wiring → docs in 5 separate small commits). User can cherry-pick or revert any commit cleanly.
- [x] **Frequent commits:** 7 separate commits across 10 tasks (some tasks like docs batching are committed per file). No mega-commits.
- [x] **Exact paths:** All file paths use absolute repo paths (e.g., `apps/desktop/src-tauri/src/main.rs`). Line numbers reference exact insertion points in current file state.
- [x] **UTF-8 no BOM guard:** Tasks 8 and 9 include verification step to catch the pre-existing encoding bug class documented in AGENTS.md §1.7.
- [x] **windres guard:** Tasks 3 and 10 include fallback `pnpm.cmd tauri build --debug --bundles none` per AGENTS.md known issue.

---

## Execution Handoff

Plan complete and saved to `docs/superpowers/plans/2026-06-20-window-state-persistence.md`.

**Two execution options:**

1. **Subagent-Driven (recommended)** — I dispatch a fresh subagent per task, review between tasks, fast iteration with minimal context bleed.
2. **Inline Execution** — Execute tasks in this session using executing-plans, batch execution with checkpoints for review.

Which approach?
