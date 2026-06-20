# Native Runtime Smoke Checklist

Status: partial evidence collected 2026-06-20 (NATIVE-001 passed with a retry warning; NATIVE-002 through NATIVE-007 remain pending).

Browser E2E is useful for editor logic, but it does not prove OS drag/drop, native dialogs, installer behavior, or file-on-disk save semantics. Complete this checklist for each release candidate or attach automation output that proves the same behavior.

## Environment

| Field | Value |
| --- | --- |
| Date | 2026-06-20 |
| Tester | Codex automated verification; interactive rows still require user/native operator |
| OS / version | Windows 11 Home Single Language 10.0.26100 x64 |
| Commit SHA | `30e7ade1df0e6bfd78b0aac4ca5a3efae1125ad0` + documented dirty working tree |
| Build artifact | dev |
| Command used | `pnpm.cmd tauri dev` |

## Required Smoke Cases

| ID | Scenario | Steps | Required evidence | Result |
| --- | --- | --- | --- | --- |
| NATIVE-001 | App launches in Tauri runtime | Start with `pnpm.cmd tauri dev` or installed app. Confirm main shell opens with title bar, tool rail, right dock, and empty workspace. | Screenshot of launched app + command/build log. | PASS WITH WARNING — second controlled run compiled, launched `photrez-desktop.exe`, showed the complete empty editor shell, and remained responsive. The first attempt created a non-responsive window and was terminated before the logged retry. |
| NATIVE-002 | OS file drop creates a new document | Drag a supported image from File Explorer onto empty workspace/tab-empty/outside zone. | Screenshot showing new document tab and visible image. | PENDING — real File Explorer drag not executed. |
| NATIVE-003 | OS file drop adds a layer to existing document | Open one document, drag a supported image from File Explorer onto canvas or layers panel. | Screenshot showing layer stack count/name and rendered image. | PENDING — real File Explorer drag not executed. |
| NATIVE-004 | In-app cross-doc layer drag works in Tauri | Open two documents, drag a layer to another document tab, wait for hover switch, drop on canvas. Repeat with Alt for move. | Before/after screenshots for copy and Alt-move. | PENDING — native pointer interaction not executed. |
| NATIVE-005 | Native export/save writes a real file | Edit visible pixels, press Ctrl+S or Export, choose PNG/JPG/WebP path, save. | Saved file path, file size, and screenshot/opened file in external viewer. | PENDING — native save dialog and file-on-disk proof not executed. |
| NATIVE-006 | Cancel export does not write | Open Export, cancel dialog, verify no new file appears at target location. | Target folder screenshot or shell listing before/after. | PENDING — native cancel path not executed. |
| NATIVE-007 | Window controls and app close path work | Minimize, restore/maximize, close. Reopen app. | Short screen recording or screenshots. | PENDING — custom control clicks not executed. |
| NATIVE-008 | Window state restored after restart | Launch app, resize/move/maximize the main window, close app, relaunch via `pnpm.cmd tauri dev` or installed app. Verify the window reopens at the same position, size, maximized state, and monitor. | Before/after screenshots showing identical geometry; inspect `%APPDATA%\com.photrez.app\.window-state.json` on Windows to confirm file exists and is non-empty. | PENDING — manual follow-up. |

## Evidence — 2026-06-20

- [Native Photrez launch screenshot](evidence/2026-06-20/photrez-native-launch.png)
- [Tauri dev stdout](evidence/2026-06-20/tauri-dev-stdout.log)
- [Tauri dev stderr/build log](evidence/2026-06-20/tauri-dev-stderr.log)
- Process evidence: `photrez-desktop`, window title `Photrez`, `Responding: true` on the successful logged run.
- Automated gates: frontend unit coverage passed across split execution after three worker startup timeouts (83 files / 1213 tests plus 3 files / 48 tests = 86 / 1261); browser E2E 21/21 passed after replacing invalid default-framebuffer reads with composited screenshot sampling; type-check, lint, build, core Rust 85 tests, and workspace Rust 95 tests passed.
- Dependency audit: `pnpm audit --prod` passed with no known vulnerabilities. Rust audit remains blocked because `cargo-audit` is absent and its MinGW installation failed while compiling `aws-lc-sys`.

## Failure Policy

- Any failed row blocks release until fixed or explicitly waived in `docs/decisions/id-decision-log.md`.
- If a row is waived, record why browser/CI coverage is sufficient or why the scenario is out of scope for the candidate.
- Attach all screenshots/logs to the release artifact folder or PR.

## Relationship To CI

`.github/workflows/ci.yml` proves repeatable static checks, browser E2E, Rust tests, and dependency audit. This checklist proves OS-integrated behavior that CI browser tests cannot observe directly.
