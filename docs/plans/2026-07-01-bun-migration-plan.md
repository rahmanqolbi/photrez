---
phase: 1
plan: 1
wave: 1
depends_on: []
files_modified:
  - package.json
  - apps/desktop/package.json
  - pnpm-workspace.yaml (deleted)
  - apps/desktop/src-tauri/tauri.conf.json
  - apps/desktop/playwright.config.ts
  - .github/workflows/ci.yml
  - docs/AI_CURRENT_TASK.md
autonomous: true
user_setup: []
must_haves:
  truths:
    - "Project depends are installable via `bun install` without errors"
    - "All 1561 tests pass with `bun test`"
    - "`bun run build` produces working production build"
    - "Tauri dev commands work with Bun"
    - "CI pipeline works with Bun"
    - "No pnpm-specific config remains"
  artifacts:
    - "bun.lock exists replacing pnpm-lock.yaml"
    - "pnpm-workspace.yaml deleted, workspaces in package.json"
    - "ci.yml uses oven-sh/setup-bun@v2"
  key_links:
    - "Context7 docs confirm Bun supports: workspaces, --filter, overrides, frozen-lockfile, Node-API 95%"
    - "canvas native addon uses Node-API → should work with Bun"
---

# Plan 1.1: pnpm → Bun Migration

<objective>
Migrate project from pnpm to Bun as package manager, runtime, and test runner.

Purpose: Personal preference for Bun's developer experience (faster installs, built-in tooling, cleaner output).
Output: Working project with all 1561 tests passing, CI green, Tauri builds working.

Risk rating: Low-Medium. Changes are mechanical (config/scripts). Main risk is `canvas` native addon, but the docs say Bun implements 95% of Node-API.
</objective>

<context>
- Current root `package.json` — scripts use `pnpm --filter`, has `pnpm.overrides`
- `pnpm-workspace.yaml` — workspace config
- `apps/desktop/package.json` — scripts use `pnpm`
- `apps/desktop/src-tauri/tauri.conf.json` — references `pnpm dev` and `pnpm build`
- `apps/desktop/playwright.config.ts` — uses `pnpm.cmd`
- `.github/workflows/ci.yml` — uses `pnpm/action-setup@v6`
- `docs/AI_CURRENT_TASK.md` — must update
</context>

<tasks>

<task type="checkpoint:human-verify">
  <name>Step 0: Pre-migration safety check</name>
  <files>(no files modified)</files>
  <action>
    BEFORE changing any files, verify:
    
    1. Current state: `pnpm --filter photrez-desktop test --run` ✅ (1561 passing)
    2. Current build: `pnpm run build` ✅
    3. Git state: `git status` — working tree clean (stash or commit any pending changes)
    
    If anything is dirty or failing, STOP and report.
  </action>
  <verify>All green, git clean</verify>
  <done>Baseline confirmed, ready to migrate</done>
</task>

<task type="auto">
  <name>Step 1: Migrate root package.json</name>
  <files>
    - package.json
    - pnpm-workspace.yaml
  </files>
  <action>
    Apply these changes to root `package.json`:

    a) Change `"packageManager": "pnpm@10.33.0"` → `"packageManager": "bun@1.3.14"` (or just remove it — Bun ignores this field)

    b) Add `"workspaces": ["apps/*"]` at root level (replaces `pnpm-workspace.yaml`)

    c) Move `"pnpm": { "overrides": { "undici": "^7.28.0", "esbuild": "^0.28.1" } }` 
       → root-level `"overrides": { "undici": "^7.28.0", "esbuild": "^0.28.1" }`
       (Bun supports npm-style `"overrides"` at root level)

    d) Remove the `"pnpm": { ... }` block entirely from `package.json`

    e) Keep `"prepare": "husky"` — Bun supports lifecycle hooks. Change to `"bunx husky"` only if needed.

    f) Rewrite all scripts:
       - `pnpm --filter photrez-desktop` → `bun run --filter photrez-desktop`
       - `pnpm audit --prod` → `bun audit` (if Bun supports it) or keep as `pnpm audit --prod` for now (audit is read-only)
       - `pnpm run` → `bun run`
       
       NOTE: `bun audit` may not have the same CLI. Check: `bun audit --help`. 
       If unavailable, the audit script can temporarily use `pnpm audit --prod` or `npm audit --prod`.
       The verify script also uses `pnpm audit --prod` — same treatment.

    g) Delete `pnpm-workspace.yaml` entirely — Bun doesn't use it.
  </action>
  <verify>Check: `cat package.json` — no `"pnpm"` block, has `"workspaces"`, has `"overrides"`, scripts use `bun`</verify>
  <done>Root package.json uses Bun-native config</done>
</task>

<task type="auto">
  <name>Step 2: Migrate Tauri and Playwright configs</name>
  <files>
    - apps/desktop/src-tauri/tauri.conf.json
    - apps/desktop/playwright.config.ts
  </files>
  <action>
    a) In `tauri.conf.json`:
       - Find `"beforeDevCommand": "pnpm dev"` → `"beforeDevCommand": "bun run dev"`
       - Find `"beforeBuildCommand": "pnpm build"` → `"beforeBuildCommand": "bun run build"`

    b) In `playwright.config.ts`:
       - Find `command: "pnpm.cmd dev -- --host 127.0.0.1"` → `command: "bun run dev -- --host 127.0.0.1"`
       (Note: `bun run dev` — Bun doesn't use .cmd extension on Windows, but `bun` works from cmd/powershell)
  </action>
  <verify>Grep for "pnpm" in both files — zero matches</verify>
  <done>Tauri + Playwright configs reference Bun</done>
</task>

<task type="auto">
  <name>Step 3: Migrate CI workflow</name>
  <files>
    - .github/workflows/ci.yml
  </files>
  <action>
    Rewrite the CI `frontend` job:

    ```yaml
    - uses: oven-sh/setup-bun@v2
      with:
        bun-version: "1.3.14"  # pin for cache
    ```

    REMOVE:
    - `pnpm/action-setup@v6` step
    - `actions/setup-node@v4` step (Bun includes JS runtime)
    - `cache: pnpm` (Bun caching is automatic with pinned version)

    CHANGE:
    - `pnpm install --frozen-lockfile` → `bun install --frozen-lockfile`
    - `hashFiles('pnpm-lock.yaml')` → `hashFiles('bun.lock')`
    - All `pnpm run` → `bun run`
    - All `pnpm --filter` → `bun run --filter`
    - `pnpm audit --prod` → keep as-is OR use `bun run audit` if that script works
    
    Keep the Playwright cache key but update to `bun.lock` hash.
    Keep the Rust job unchanged — Bun doesn't affect Rust.
  </action>
  <verify>CI file has `oven-sh/setup-bun`, no `pnpm/action-setup`, no `setup-node`</verify>
  <done>CI configured for Bun</done>
</task>

<task type="checkpoint:human-verify">
  <name>Step 4: Lockfile migration + first Bun install</name>
  <files>
    - node_modules/ (will be regenerated)
    - bun.lock (new, replaces pnpm-lock.yaml)
    - pnpm-lock.yaml (can be deleted after migration)
  </files>
  <action>
    1. Delete `node_modules` directory — forces clean install
    2. Delete `pnpm-lock.yaml` — Bun will create `bun.lock`
    3. Run: `bun install` (Bun auto-migrates and creates bun.lock)
    4. AVOID `bun install --linker isolated` — isolated linker can break some native addons.
       Use default linker for maximum compatibility.
    
    If `bun install` fails on `canvas` native addon:
    - Check if `canvas` is still needed (tests pass without it — jsdom just warns)
    - If needed: try `bun install --no-optional` or install Visual Studio Build Tools
    - Fallback: delete `canvas` from devDependencies and see if tests still pass
  </action>
  <verify>`bun install` exits 0, `bun.lock` exists</verify>
  <done>Dependencies installed via Bun</done>
</task>

<task type="auto">
  <name>Step 5: Run all tests with Bun</name>
  <files>(no files modified)</files>
  <action>
    Run full test suite:
    ```
    bun run --filter photrez-desktop test -- --run
    ```
    
    Compare against baseline: 121 files / 1561 tests passing.
    
    If tests fail:
    - Check if `canvas` native addon is the cause (getContext errors during import)
    - Try: `bun install --no-optional` to skip optional deps
    - If specific tests fail due to Bun runtime differences, fix the test code
    - If `vitest` has issues with Bun, try: `bunx vitest run` instead of `bun run test`
    
    Report any test failures with full error messages.
  </action>
  <verify>`bun run --filter photrez-desktop test -- --run` → 121 files / 1561 tests ✅</verify>
  <done>All tests pass with Bun</done>
</task>

<task type="auto">
  <name>Step 6: Build verification</name>
  <files>(no files modified)</files>
  <action>
    Run production build:
    ```
    bun run --filter photrez-desktop build
    ```
    
    Should produce dist/ folder with same files as before.
    The INEFFECTIVE_DYNAMIC_IMPORT warning is pre-existing and harmless.
  </action>
  <verify>`bun run build` → TypeScript + Vite build succeeds</verify>
  <done>Production build works</done>
</task>

<task type="auto">
  <name>Step 7: TypeScript check + lint</name>
  <files>(no files modified)</files>
  <action>
    Run: `bun run --filter photrez-desktop type-check`
    (This runs `tsc --noEmit`)
    
    This ensures Bun doesn't break TypeScript compilation.
  </action>
  <verify>`bun run --filter photrez-desktop type-check` → no errors</verify>
  <done>TypeScript check passes</done>
</task>

<task type="checkpoint:human-action">
  <name>Step 8: Manual Tauri dev verification</name>
  <files>(no files modified)</files>
  <action>
    THE USER MUST RUN THIS — requires Tauri runtime:
    
    ```
    bun run tauri dev
    ```
    
    Verify:
    - App launches without errors
    - Titlebar buttons work (minimize/maximize/close)
    - Menu bar works
    - Canvas loads
    - Window action buttons (restore icon) renders correctly
  </action>
  <verify>App launches, all major features work</verify>
  <done>Binary/App-level verification passed</done>
</task>

<task type="auto">
  <name>Step 9: Update docs</name>
  <files>
    - docs/AI_CURRENT_TASK.md
    - docs/AI_HISTORY.md
  </files>
  <action>
    Update `docs/AI_CURRENT_TASK.md` — mark migration COMPLETE.
    
    Add entry to `docs/AI_HISTORY.md`:
    ```
    ## [2026-07-01] pnpm → Bun Migration
    Goal: Migrate from pnpm to Bun as package manager.
    Done: All configs migrated, 1561 tests passing, build green.
    Notes: Used `bun run --filter` for monorepo commands. canvas native addon works via Node-API compat.
    ```
    
    If any step failed or needed workaround, document it in the history entry.
  </action>
  <verify>Both docs updated</verify>
  <done>Documentation reflects Bun migration</done>
</task>

</tasks>

<verification>
After all tasks, verify:
- [ ] `bun install --frozen-lockfile` succeeds (reproducible install)
- [ ] `bun run build` → TypeScript + Vite ✅
- [ ] `bun run --filter photrez-desktop test -- --run` → 121 files / 1561 tests ✅
- [ ] `bun run --filter photrez-desktop type-check` → no TS errors ✅
- [ ] No `pnpm-workspace.yaml` exists
- [ ] No `pnpm` references in `package.json` or `tauri.conf.json` or `playwright.config.ts`
- [ ] CI file uses `oven-sh/setup-bun@v2`
- [ ] `bun.lock` exists (committed to repo)
- [ ] Tauri dev launches successfully (manual check)
</verification>

<success_criteria>
- [ ] All steps completed
- [ ] All verification checks green
- [ ] No pnpm-specific files remain (pnpm-lock.yaml, pnpm-workspace.yaml)
- [ ] Full test suite passes
- [ ] Production build works
- [ ] CI would work with Bun
</success_criteria>
