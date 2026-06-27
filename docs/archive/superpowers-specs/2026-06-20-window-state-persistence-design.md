# Window State Persistence — Design Spec

**Date:** 2026-06-20
**Status:** Approved 2026-06-20, scope revised 2026-06-20 after bug report (plugin default `StateFlags::all()` is incompatible with `decorations: false` config), **implementation pivoted 2026-06-20 to manual core-API approach after plugin killed all Tauri IPC at runtime — see §"Revision: Pivoted to manual implementation" below.**
**Scope:** Post-MVP backlog item #1 (per `docs/plans/2026-06-20-post-mvp-ui-backlog.md`)
**Approach (final):** Manual core-API implementation in `main.rs` (replaces original Approach A — `tauri-plugin-window-state`)

## Revision: Pivoted to manual implementation

The original plan was to use `tauri-plugin-window-state` v2.4.1. After implementing with the narrowed `StateFlags::SIZE | POSITION | MAXIMIZED | FULLSCREEN` scope (per D-WSP-002), every Tauri IPC command from the frontend failed at runtime with `<command> not allowed. Plugin not found` — not just the plugin's own commands, but core Tauri commands (`window.toggle_maximize`, `window.minimize`, `event.listen`, etc.) and the `dialog` plugin commands too. The error was identical across all of them, ruling out an ACL/permissions issue in `capabilities/default.json` (multiple capability fix attempts had no effect). The dependency chain in `Cargo.lock` was clean (`tauri v2.11.2`, `tauri-plugin v2.6.2`, `tauri-plugin-window-state v2.4.1`, single versions). Removing the plugin from the builder chain restored IPC immediately; re-adding it killed IPC again — deterministic repro.

Root cause at the plugin source level is unresolved. The symptom-class is consistent with a runtime plugin-system issue in this Tauri 2.11 + multi-plugin configuration, but the specific failure point is not isolated. Shipping the broken path is not acceptable, so the feature was reimplemented using Tauri core APIs + `std::fs` + `serde_json` — Ponytail rung #2 (stdlib) + rung #3 (native platform feature = Tauri core `set_size`/`set_position`/`maximize`/`inner_size`/`outer_position`/`is_maximized`/`on_window_event`). The new implementation is ~60 lines of Rust in `main.rs` instead of 1 line of plugin registration, and uses only APIs that the user has already confirmed work.

The original spec sections below (D-WSP-001, D-WSP-002, Architecture, File Changes, etc.) are retained as historical record. For the **final shipped implementation**, see:

- `apps/desktop/src-tauri/src/main.rs` lines 102–169 (window state structs + helpers), 246–277 (builder integration), 441–489 (tests).
- `docs/decisions/id-decision-log.md` rows "Window state persistence (storage)" and "Window state persistence (scope)" under `## Tambahan Keputusan 2026-06-20` (rewritten 2026-06-20 to describe the manual approach).
- `docs/AI_HISTORY.md` entry `[2026-06-20] BUG FIX - Window-State Plugin Broke All Tauri IPC; Pivoted to Manual Implementation`.

What changed between the original plan and the final implementation:

| Aspect                | Original (plugin)                                         | Final (manual in `main.rs`)                                |
| --------------------- | --------------------------------------------------------- | ---------------------------------------------------------- |
| Dependency added      | `tauri-plugin-window-state = "2"`                         | None (stdlib + Tauri core only)                            |
| Registration code     | 1 `.plugin(Builder::default().with_state_flags(...).build())` | ~60 lines: `SavedWindowState` struct + `load_window_state` / `save_window_state` + `.setup(...)` + `.on_window_event(...)` |
| State flags           | Bitmask `SIZE \| POSITION \| MAXIMIZED \| FULLSCREEN`     | Four struct fields: `width`, `height`, `x: Option<i32>`, `y: Option<i32>`, `maximized: bool` |
| State file path       | `<app_config_dir>/.window-state.json` (plugin-internal)   | `<app_config_dir>/window-state.json` (no leading dot)      |
| Save trigger          | Plugin's own window event listeners (resize/move/close)   | `WindowEvent::CloseRequested` only (single explicit trigger) |
| Test coverage         | 1 compile-gate test (builder builds)                      | 3 tests: roundtrip, default matches `tauri.conf.json`, legacy format forward-compat |
| Frontend code         | None                                                      | None (unchanged)                                           |
| Capabilities file     | Unchanged                                                 | Unchanged (kept the `$schema` + `windows: ["main"]` improvements from debugging) |
| `Cargo.lock` entries  | +1 crate + transitive deps                                | Unchanged from pre-feature baseline                        |

Ponytail rationale for the pivot: "Complex request? Ship the lazy version and question it in the same response, 'Did X; Y covers it. Need full X? Say so.'" The plugin would have been the one-line solution, but it doesn't work in this environment. The manual approach is the lazy version that works.



## Goal

Make Photrez remember its main window geometry (position, size, maximized, fullscreen, monitor) between launches. Window state is restored automatically on the next launch, no UX or settings UI required.

## Context

Photrez is a desktop image editor shipped via Tauri 2. The window is configured at `tauri.conf.json` with fixed initial geometry (1280×832, not maximized, primary monitor). Every launch starts at this default, which is friction for users who move the window to a second monitor or resize for their workflow.

There is no existing window state code. The MVP scope deliberately omits this feature, but the post-MVP backlog lists it as item #1 because it is the highest-leverage UX win for low effort — a single official plugin activation covers the entire feature.

## Non-Goals (this spec)

- **Window state reset affordance.** No menu item, no button, no keyboard shortcut to reset to defaults. Users who want a clean slate can delete the state file in their app config dir.
- **Per-window persistence configuration.** All windows get the same default behavior. No flag customization (we always persist all states).
- **State migration across plugin versions.** Handled by the plugin internally; we don't ship our own migration code.
- **CLI flag or env var to bypass persistence.** YAGNI for MVP.
- **Frontend expose of window state** (e.g., for diagnostics or a future settings panel). Not in scope.
- **Mobile target.** Photrez is desktop-only; the plugin is desktop-only too. No `#[cfg(desktop)]` guard.

## Decisions

### D-WSP-001 — Use `tauri-plugin-window-state` (official Tauri 2 plugin)

**Context:** Three storage options were considered: official Tauri plugin, custom Rust commands with manual JSON read/write, or frontend-only via localStorage.

**Decision:** Use `tauri-plugin-window-state` registered via the `tauri::Builder` chain.

**Rationale:**
- This is Ponytail rung #4 (native platform feature covers it) — the official plugin exists, is actively maintained by the Tauri team, and handles auto-save, auto-restore, atomic file writes, multi-monitor recovery, and bounds normalization out of the box.
- Custom Rust commands duplicate everything the plugin does and add an IPC surface that is not needed.
- Frontend-only is not technically possible for window geometry — Tauri 2 frontend cannot read or write window position/size without an IPC bridge.

**Consequence:** Adds one Cargo dependency, one new entry in `Cargo.lock`, one line of registration code. No new commands, capabilities, or frontend code.

### D-WSP-002 — Narrow scope: SIZE | POSITION | MAXIMIZED | FULLSCREEN

**Context:** `StateFlags::all()` includes six flags: `SIZE`, `POSITION`, `MAXIMIZED`, `VISIBLE`, `DECORATIONS`, `FULLSCREEN`. After user reported runtime bug ("window can't be interacted with, titlebar buttons don't respond") post-merge, three upstream Tauri issues confirm the default is unsafe:

- **#2203 (closed)**: `decorations: false` ignored when plugin is active. Reporter on Windows 10.0.26100 — same OS build Photrez ships on.
- **#1970 (closed)**: Plugin ignores `decoration: false` config.
- **#2617 (open feature request)**: Remove `decorations` from default restore flags — community agrees default is unintuitive.

Root cause analysis of `tauri-plugin-window-state-2.4.1/src/lib.rs`:
- `restore_state` (line 181-187) calls `self.set_decorations(state.decorated)` whenever `flags.contains(DECORATIONS)`. `WindowState::default()` has `decorated: true` (line 103). On any subsequent launch where the cached state is non-default, the plugin flips `decorations` to `true`, overlaying the native title bar on Photrez's custom title bar (`apps/desktop/src-tauri/tauri.conf.json` line 19: `decorations: false`).
- `restore_state` (line 262-265) also calls `self.show()` + `self.set_focus()` whenever `flags.contains(VISIBLE)`. `on_window_ready` fires before the webview fully hydrates, so the focus race causes the webview to lose input handling until the window is clicked.

**Decision:** Use `.with_state_flags(StateFlags::SIZE | StateFlags::POSITION | StateFlags::MAXIMIZED | StateFlags::FULLSCREEN)`. Exclude `DECORATIONS` and `VISIBLE`. Multi-monitor recovery remains enabled (it's handled inside the `POSITION` branch, not as a separate flag).

**Rationale:**
- Ponytail rung #1 (YAGNI): Decorations are config-time in Photrez (`decorations: false`); persisting them creates a known-bad state. Visibility is already handled by Tauri's window lifecycle; persisting it adds a focus race for zero product benefit.
- Ponytail rung #4 (native feature covers it): The plugin is still the right tool — we just don't take its default scope.
- Spec error correction: The original draft claimed `StateFlags::all()` had five flags including `MONITOR`. The actual plugin has six flags (SIZE, POSITION, MAXIMIZED, VISIBLE, DECORATIONS, FULLSCREEN), no `MONITOR`. Multi-monitor behavior is built into the `POSITION` branch (plugin checks `available_monitors()` and falls back if the saved monitor is disconnected).

**Consequence:** If a future requirement needs flag filtering (e.g., "never restore fullscreen because users complain about invisible menus"), the upgrade path is `.with_state_flags(...)` again. This is a one-line change at the registration site.

**Confirmed source references (read 2026-06-20):**
- Plugin source: `~/.cargo/registry/src/index.crates.io-*/tauri-plugin-window-state-2.4.1/src/lib.rs` (lines 50-60 StateFlags bitflags, 92-106 WindowState default, 160-268 restore_state, 396-501 setup + on_window_ready).
- Upstream issues: `github.com/tauri-apps/plugins-workspace/issues/2203`, `/1970`, `/2617`.
- Tauri 2 docs: `v2.tauri.app/plugin/window-state/` (verified via Context7, `/tauri-apps/plugins-workspace`).

## Architecture

Rust-only feature. The plugin runs entirely in the Tauri Rust process. There is no SolidJS state, no IPC, no frontend touchpoint.

### Component diagram

```
┌──────────────────────────────────────────────────────┐
│ Tauri runtime (apps/desktop/src-tauri)               │
│                                                      │
│  main.rs                                             │
│    tauri::Builder::default()                         │
│      .plugin(tauri_plugin_window_state::Builder::    │
│                default().build())       ← NEW       │
│      .plugin(tauri_plugin_dialog::init())           │
│      .run(tauri::generate_context!())               │
│                                                      │
│  ┌─────────────────────────────────────────────┐     │
│  │ tauri-plugin-window-state (Rust)            │     │
│  │  • Reads <config_dir>/.window-state.json    │     │
│  │  • Applies state to main window on startup  │     │
│  │  • Listens to window events (resize/move/   │     │
│  │    maximize/fullscreen/monitor change)      │     │
│  │  • Writes state atomically on window close  │     │
│  └─────────────────────────────────────────────┘     │
│                       │                              │
│                       ▼                              │
│               OS app config dir                      │
│   Windows: %APPDATA%\com.photrez.app\.window-state.json│
│   macOS:   ~/Library/Application Support/            │
│             com.photrez.app/.window-state.json       │
│   Linux:   $XDG_CONFIG_HOME/com.photrez.app/         │
│             .window-state.json                       │
└──────────────────────────────────────────────────────┘
```

### Registration pattern

Direct `.plugin()` call in the builder chain — same pattern as `tauri_plugin_dialog::init()` already used in `main.rs`. No `.setup()` hook needed; the plugin registers and attaches its window listeners during builder construction, before any window is created.

```rust
// apps/desktop/src-tauri/src/main.rs
fn main() {
    tauri::Builder::default()
        .plugin(tauri_plugin_window_state::Builder::default().build())  // NEW
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

No `use` import is added. Full path is consistent with the existing `tauri_plugin_dialog::init()` style.

**Deviation from official Tauri docs (conscious):** The Context7-verified official example wraps registration in `.setup(|app| ...)` + `#[cfg(desktop)]` guard:

```rust
.setup(|app| {
    #[cfg(desktop)]
    app.handle().plugin(tauri_plugin_window_state::Builder::default().build());
    Ok(())
})
```

Photrez rejects this pattern for two reasons:

1. **No `#[cfg(desktop)]` guard needed.** Per `Cargo.toml` workspace (`members = ["apps/desktop/src-tauri", "crates/core"]`), Photrez ships a desktop-only Tauri binary. There is no mobile target, no secondary binary that could conditionally compile out the plugin. The guard adds noise without enabling any code path. Ponytail rung #1 (YAGNI).
2. **No `.setup()` wrapper needed.** The plugin's `Builder::default().build()` is a synchronous constructor that returns a `TauriPlugin<R>` ready to be chained via `.plugin()`. Wrapping it in `.setup()` adds one frame of indirection and one extra closure capture with no observable benefit. Direct chaining matches our existing `tauri_plugin_dialog::init()` style.

If a future requirement introduces a mobile target or a binary variant that should opt out of persistence, both decisions revert together: add `#[cfg(desktop)]` and move registration inside `.setup()`. Single small change, single obvious upgrade path.

### Behavior table

| Trigger                          | Plugin behavior                                         |
| -------------------------------- | ------------------------------------------------------- |
| First launch (no state file)     | Fall back to `tauri.conf.json` defaults (1280×832, not maximized). |
| Subsequent launch (state exists) | Restore position, size, maximized, fullscreen, monitor. |
| Window resize / move             | Plugin observes event, updates in-memory state.        |
| Window close / app quit          | Plugin writes current state atomically (temp file + rename). |
| Corrupt state file               | Plugin logs warning, falls back to defaults.           |
| Multi-monitor: saved monitor disconnected | Plugin falls back to primary monitor at default position. |
| Saved bounds off-screen          | Plugin normalizes bounds against current monitor layout. |
| Plugin init fails                | Tauri logs the error and app fails to start. (Acceptable — plugin init must succeed for the feature to work.) |

## File Changes

### `apps/desktop/src-tauri/Cargo.toml`

Add one dependency:

```toml
[dependencies]
tauri = { version = "2.0.0", features = [] }
serde = { version = "1.0", features = ["derive"] }
serde_json = "1.0"
tauri-plugin-dialog = "2"
tauri-plugin-window-state = "2"   # NEW
base64 = "0.22"
```

Version `"2"` matches the major version of `tauri = "2.0.0"`. Cargo will resolve the latest compatible patch release.

**`Cargo.lock` is auto-updated** by `cargo build` / `cargo test` and must be committed alongside the manifest change (per `docs/reference/dependency-inventory.md` §7 "Lockfile discipline: `Cargo.lock` and `pnpm-lock.yaml` must be committed").

### `apps/desktop/src-tauri/src/main.rs`

Two additions: one line in the builder chain, one test in `mod tests`.

```rust
fn main() {
    tauri::Builder::default()
        .plugin(tauri_plugin_window_state::Builder::default().build())  // NEW
        .plugin(tauri_plugin_dialog::init())
        // ... rest unchanged
}
```

```rust
#[cfg(test)]
mod tests {
    // ... existing tests unchanged

    #[test]
    fn test_window_state_plugin_builder_builds() {
        // ponytail: compile + no-panic gate; proves dependency and API wired.
        // If tauri-plugin-window-state dep is missing or version mismatched, this fails to compile.
        // If Builder::default().build() panics on a future Tauri/plugin incompatibility, this fails at runtime.
        let _plugin = tauri_plugin_window_state::Builder::default().build();
    }
}
```

### `docs/faang-review-rejections/2026-06-18-native-runtime-smoke-checklist.md`

Add NATIVE-008 row to the required smoke cases table:

```markdown
| NATIVE-008 | Window state restored after restart | Launch app, resize/move/maximize the main window, close app, relaunch via `pnpm.cmd tauri dev` or installed app. Verify the window reopens at the same position, size, maximized state, and monitor. | Before/after screenshots showing identical geometry; inspect `%APPDATA%\com.photrez.app\.window-state.json` on Windows to confirm file exists and is non-empty. | PENDING — manual follow-up. |
```

Also update the Environment section `Commit SHA` field after the next commit.

### `docs/reference/dependency-inventory.md`

Per the locked decision *"Adding a new dependency requires updating this file first"* (§10 Change Control, line 163). Append one new row to the `### Core Framework` table in §3 Rust Crate Dependencies (right after the `tauri` row, before `wgpu`):

```markdown
| `tauri-plugin-window-state` | Official window state persistence plugin (Tauri 2) | `2.x` | MIT/Apache-2.0 | Approved | Low | Registered in builder chain; handles auto-save/auto-restore, atomic writes, multi-monitor recovery, bounds normalization. License parity with `tauri-plugin-dialog`. |
```

License confirmed MIT/Apache-2.0 (matches `tauri-plugin-dialog` at line 10 of `Cargo.toml` and the existing `tauri` core row). Size impact Low: the plugin is a thin shim around `tauri-plugin-dialog`'s pattern, no native deps, no heavy runtime.

### `docs/decisions/id-decision-log.md`

Append two new rows to the **existing** `## Tambahan Keputusan 2026-06-20` section (lines 118–124 of the current file). Do not create a duplicate date header — that section already holds today's brush-feather and post-MVP-backlog decisions. Format `| Area | Keputusan | Status |`:

```markdown
| Area | Keputusan | Status |
| ---- | --------- | ------ |
| Window state persistence (storage) | Window state persistence uses `tauri-plugin-window-state` (official Tauri 2 plugin) registered in the `tauri::Builder` chain. No custom Rust commands, no IPC, no frontend code. Plugin handles auto-save on close, auto-restore on launch, atomic file writes, multi-monitor recovery, and bounds normalization. Rationale: Ponytail rung #4 (native platform feature covers it) — official plugin is actively maintained and replaces what would otherwise be ~100 lines of custom Rust code. | Locked 2026-06-20 |
| Window state persistence (scope) | Persist all five runtime state flags (`POSITION`, `SIZE`, `MAXIMIZED`, `FULLSCREEN`, `MONITOR`) via `Builder::default().build()`. Decorations flag is plugin-internal and effectively a no-op for our config-time `decorations: false` setup. Rationale: Ponytail rung #1 (YAGNI) — there is no product reason to exclude any state; excluding fullscreen or monitor would create friction without justification. Upgrade path: replace with `.with_state_flags(...)` if a future requirement needs selective filtering. | Locked 2026-06-20 |
```

### `docs/FEATURES.md`

In the "Desktop Shell (Tauri 2)" section, mark the previously planned row as done:

```markdown
| ✅ DONE      | Window state persistence (size/position)   |
```

(Replaces the existing `🗓️ PLANNED (POST-MVP)` row.)

### `docs/AI_HISTORY.md`

Append one entry following the established `## [YYYY-MM-DD] CATEGORY - Title [COMPLETE]` format. Include Root Cause and Fix Rationale sections (treating this as the closure of a backlog item rather than a bug fix).

### `docs/AI_CURRENT_TASK.md`

Mark the Window State Persistence task `[COMPLETE]` with verification results.

### `docs/superpowers/specs/2026-06-20-window-state-persistence-design.md`

This file. (Created.)

## Testing Strategy

### Wiring test (mandatory per AGENTS.md "Definition of Done for a New Feature")

**`test_window_state_plugin_builder_builds`** in `apps/desktop/src-tauri/src/main.rs` `mod tests`.

What it proves:
- **Compile-time:** The `tauri-plugin-window-state` crate is in `Cargo.toml` and the major-version API (`Builder::default().build()`) is reachable. If the dep is removed, the test fails to compile. If the dep is bumped to a breaking major, the test fails to compile.
- **Runtime:** The Builder API constructs a plugin handle without panicking. If a future plugin release introduces an init-time panic for a known Tauri version, this test catches it before the binary builds.

What it does NOT prove:
- That the plugin actually restores window state across launches (requires real Tauri runtime + windowing system — covered by NATIVE-008 smoke).
- That the state file format is correct (plugin-internal concern).
- That multi-monitor recovery works (plugin-internal + smoke).

This is intentionally minimal. The plugin is the unit; its bounds normalization, atomic writes, and monitor fallback are tested by its maintainers.

### Unit tests

None of our own. The plugin handles all logic; we register one line. There is no Photrez code path to unit-test.

This is documented explicitly here so reviewers don't flag the absence of unit tests for "missing coverage" — the coverage is delegated to the plugin's own test suite plus our NATIVE-008 smoke.

### Tauri restart smoke (NATIVE-008)

Per `docs/faang-review-rejections/2026-06-18-native-runtime-smoke-checklist.md`. Manual follow-up because this environment cannot interactively launch Tauri. Evidence: side-by-side screenshots + inspection of the state file.

### No-regression verification

Run after the change:
1. `pnpm.cmd --filter photrez-desktop test --run` — frontend unit tests must remain green.
2. `pnpm.cmd run type-check` — TypeScript must compile clean.
3. `pnpm.cmd run build` — production frontend build must succeed.
4. `cargo test --workspace` — Rust unit tests (including new wiring test) must pass.
5. **Binary compile check:** `cd apps/desktop/src-tauri && cargo build` — must succeed. If the pre-existing `windres` toolchain issue blocks this, fall back to `pnpm.cmd tauri build --debug` (compiles without launching). Per `AGENTS.md`, `cargo check -p photrez-desktop` is known to fail on Windows; this is not a regression introduced by this change.

## Verification Commands

Run in order from repo root:

```bash
# 1. Frontend regression
pnpm.cmd --filter photrez-desktop test --run
pnpm.cmd run type-check
pnpm.cmd run build

# 2. Rust regression
cargo test --workspace

# 3. Binary compile check
cd apps/desktop/src-tauri
cargo build
# Fallback if windres fails:
# pnpm.cmd tauri build --debug --bundles none

# 4. (Manual, deferred) Tauri restart smoke per NATIVE-008
pnpm.cmd tauri dev   # user-driven; not run in automation
```

Expected outcome: all five commands green; manual smoke evidence recorded against NATIVE-008.

## Follow-ups / Open Questions

- **NATIVE-008 manual smoke.** User must launch the app, change window geometry, close, relaunch, and attach evidence. Deferred from this commit.
- **Release Hardening gate.** The current `[2026-06-20] RELEASE HARDENING` task remains PARTIAL until NATIVE-002 through NATIVE-007 also get interactive evidence. This spec does not change that gate.
- **Backlog entry gate bypassed.** Per `docs/plans/2026-06-20-post-mvp-ui-backlog.md` §"Entry Gate", the recommended order requires completing the native smoke checklist first. The user explicitly waived that gate for this task and asked to follow the recommended order instead. This spec records the waiver so the gate is consciously bypassed, not silently skipped.
- **Post-MVP backlog items #2–#6** remain untouched per the recommended order in `docs/plans/2026-06-20-post-mvp-ui-backlog.md` (Native menu, Tooltip, Context menu, Dialog, History Panel).

## References

- Tauri 2 official docs for `tauri-plugin-window-state`: https://v2.tauri.app/plugin/window-state/ (verified via Context7)
- `tauri-plugin-window-state` source: https://github.com/tauri-apps/plugins-workspace/tree/plugins/window-state-v2
- Project plan: `docs/plans/2026-06-20-post-mvp-ui-backlog.md` (item #1)
- Native smoke checklist: `docs/faang-review-rejections/2026-06-18-native-runtime-smoke-checklist.md` (NATIVE-001..007 current state, NATIVE-008 added by this spec)
- Decision log: `docs/decisions/id-decision-log.md`
- Existing similar plugin registration: `tauri_plugin_dialog::init()` in `apps/desktop/src-tauri/src/main.rs:174`
