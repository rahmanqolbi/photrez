# Native Runtime Smoke Checklist

Status: required release evidence for Tauri-only behavior.

Browser E2E is useful for editor logic, but it does not prove OS drag/drop, native dialogs, installer behavior, or file-on-disk save semantics. Complete this checklist for each release candidate or attach automation output that proves the same behavior.

## Environment

| Field | Value |
| --- | --- |
| Date |  |
| Tester |  |
| OS / version | Windows |
| Commit SHA |  |
| Build artifact | dev / MSI / NSIS |
| Command used | `pnpm.cmd tauri dev` or installer path |

## Required Smoke Cases

| ID | Scenario | Steps | Required evidence | Result |
| --- | --- | --- | --- | --- |
| NATIVE-001 | App launches in Tauri runtime | Start with `pnpm.cmd tauri dev` or installed app. Confirm main shell opens with title bar, tool rail, right dock, and empty workspace. | Screenshot of launched app + command/build log. |  |
| NATIVE-002 | OS file drop creates a new document | Drag a supported image from File Explorer onto empty workspace/tab-empty/outside zone. | Screenshot showing new document tab and visible image. |  |
| NATIVE-003 | OS file drop adds a layer to existing document | Open one document, drag a supported image from File Explorer onto canvas or layers panel. | Screenshot showing layer stack count/name and rendered image. |  |
| NATIVE-004 | In-app cross-doc layer drag works in Tauri | Open two documents, drag a layer to another document tab, wait for hover switch, drop on canvas. Repeat with Alt for move. | Before/after screenshots for copy and Alt-move. |  |
| NATIVE-005 | Native export/save writes a real file | Edit visible pixels, press Ctrl+S or Export, choose PNG/JPG/WebP path, save. | Saved file path, file size, and screenshot/opened file in external viewer. |  |
| NATIVE-006 | Cancel export does not write | Open Export, cancel dialog, verify no new file appears at target location. | Target folder screenshot or shell listing before/after. |  |
| NATIVE-007 | Window controls and app close path work | Minimize, restore/maximize, close. Reopen app. | Short screen recording or screenshots. |  |

## Failure Policy

- Any failed row blocks release until fixed or explicitly waived in `docs/decisions/id-decision-log.md`.
- If a row is waived, record why browser/CI coverage is sufficient or why the scenario is out of scope for the candidate.
- Attach all screenshots/logs to the release artifact folder or PR.

## Relationship To CI

`.github/workflows/ci.yml` proves repeatable static checks, browser E2E, Rust tests, and dependency audit. This checklist proves OS-integrated behavior that CI browser tests cannot observe directly.
