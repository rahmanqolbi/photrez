# 16 - Performance Measurement Protocol (MVP)

This protocol defines how Photrez performance is measured consistently.

## 1) Purpose

- Ensure startup, idle RAM, and installer size are measured with the same method.
- Avoid misleading one-off measurements.
- Provide comparable evidence across milestones and contributors.

## 2) Metrics and Targets

- Startup time target: `< 2s`
- Idle RAM target: `< 250 MB`
- Installer size target: `< 80 MB`

All results must be reported against these targets.

## 3) Baseline Environment (Mandatory)

Each report must include:

1. OS version (Windows edition/build).
2. CPU model.
3. RAM total.
4. Storage type (`SSD` or `HDD`).
5. GPU model (if available).
6. App build mode used (`dev` or `release`).

If baseline environment changes materially, mark comparison as `non-equivalent`.

## 4) Measurement Rules

- Use at least `5 runs` per metric.
- Ignore first run only if explicitly labeled as warm-up.
- Report `min`, `max`, `median`, and `average`.
- Include raw values in evidence.
- Any failed run must be listed, not hidden.

## 5) Startup Time Procedure

Definition:

- Startup time = app process start until main window is interactive.

Procedure:

1. Close app fully.
2. Ensure no previous dev hot-reload process is attached.
3. Start app.
4. Record elapsed time until window is interactive.
5. Repeat for 5 runs.

Output format example:

```txt
startup_ms_runs: [1840, 1760, 1895, 1810, 1788]
startup_ms_min: 1760
startup_ms_max: 1895
startup_ms_median: 1810
startup_ms_avg: 1818.6
target_ms: <2000
result: PASS
```

## 6) Idle RAM Procedure

Definition:

- Idle RAM = steady memory usage after app launch with no active edit operation.

Procedure:

1. Launch app and wait 30 seconds.
2. Keep default document/state (or explicitly report document state).
3. Capture memory usage.
4. Repeat for 5 runs.

Output format example:

```txt
idle_ram_mb_runs: [212, 219, 215, 217, 214]
idle_ram_mb_min: 212
idle_ram_mb_max: 219
idle_ram_mb_median: 215
idle_ram_mb_avg: 215.4
target_mb: <250
result: PASS
```

## 7) Installer Size Procedure

Definition:

- Installer size = final packaged installer artifact size for release candidate.

Procedure:

1. Build release artifact using the same packaging path each run.
2. Measure final installer file size in MB.
3. Repeat if packaging differs by channel/profile.

Output format example:

```txt
installer_mb: 71.8
target_mb: <80
result: PASS
artifact: photrez-setup-x64.exe
```

## 8) Evidence Template

Use this exact section in milestone/release notes:

```md
## Performance Evidence

Environment:
- OS:
- CPU:
- RAM:
- Storage:
- GPU:
- Build mode:

Startup:
- Runs:
- Min/Max/Median/Avg:
- Target:
- PASS/FAIL:

Idle RAM:
- Runs:
- Min/Max/Median/Avg:
- Target:
- PASS/FAIL:

Installer:
- Size:
- Target:
- PASS/FAIL:

Notes:
- Failed runs (if any):
- Known measurement caveats:
```

## 8a) Filled Evidence Example (2026-07-02 Alpha Baseline)

```md
## Performance Evidence

Environment:
- OS: Windows 11
- CPU: (user's machine)
- RAM: 13.8 GB total
- Storage: SSD
- GPU: (user's machine)
- Build mode: release

Startup:
- Runs: 1001, 124, 114, 108, 112
- Min/Max/Median/Avg: 108ms / 1001ms / 114ms / 292ms
- Target: <2000ms
- PASS/FAIL: PASS

Idle RAM:
- Runs: 34, 34, 34, 34, 34
- Min/Max/Median/Avg: 34MB / 34MB / 34MB / 34MB
- Target: <250MB
- PASS/FAIL: PASS

Installer:
- Size: 4.1 MB (NSIS), 6.26 MB (MSI)
- Target: <80 MB
- PASS/FAIL: PASS

Notes:
- Startup measures window handle creation (not JS init). True interactive time ~+500ms.
- RAM does not include WebGL GPU textures (not counted in WorkingSet64).
- Large image (4000×4000 noise PNG, 52MB file → 61MB decoded) loaded without crash or RAM spike.
```

## 9) Gate Decision Rules

- `PASS`: all 3 metrics meet target.
- `CONDITIONAL`: one metric misses target by <= 10% with explicit mitigation plan and owner.
- `FAIL`: one metric misses target by > 10%, or evidence is incomplete.

Conditional/Fail cannot be closed without update in:

1. risk register maintained alongside the repository
2. milestone exit notes

## 10) Ownership

- Primary owner: Core + Shell + Build maintainers.
- Reviewer: project owner/maintainer who approves milestone exit.
