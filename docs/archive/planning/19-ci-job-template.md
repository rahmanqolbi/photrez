# 19 - CI Job Template (How To Use)

This document provides ready-to-adapt CI templates for Photrez.

## 1) Why This Exists

- Help contributors who are not familiar with CI setup.
- Translate `docs/archive/planning/18-ci-verification-plan.md` into practical job blocks.
- Keep milestone gates consistent across platforms.

## 2) What You Need Before Using It

1. Repository already has real commands (example: build/test/type-check).
2. Team knows current milestone target (`M1` to `M6`).
3. CI platform is chosen:
- GitHub Actions, or
- GitLab CI.

## 3) How To Use (Step-by-Step)

1. Open `docs/archive/planning/18-ci-verification-plan.md`.
2. Pick required stages for your milestone.
3. Copy the template from section 5 (pseudo template).
4. Replace placeholder commands with real project commands.
5. Add the file to your CI platform:
- GitHub: `.github/workflows/ci.yml`
- GitLab: `.gitlab-ci.yml`
6. Run on a PR and confirm stage results.
7. Store CI evidence (summary/artifacts) in PR notes.

## 4) Stage Checklist by Milestone

- M1: `preflight`, `build-and-static-checks`, `test-contract`, `test-render-smoke`
- M2: `preflight`, `build-and-static-checks`, `test-core`, `test-contract`
- M3: `preflight`, `build-and-static-checks`, `test-core`, `test-contract`
- M4: `preflight`, `build-and-static-checks`, `test-core`, `test-render-smoke`
- M5: `preflight`, `build-and-static-checks`, `test-core`, `test-contract`
- M6: all stages + `perf-gate` + `packaging-check`

## 5) Platform-Agnostic Pseudo Template

```yaml
pipeline:
  stages:
    - preflight
    - build-and-static-checks
    - test-core
    - test-contract
    - test-render-smoke
    - perf-gate
    - packaging-check

  preflight:
    run:
      - <check toolchain versions>
      - <check lockfiles and workspace files>

  build-and-static-checks:
    run:
      - <rust build/check command>
      - <frontend type-check command>
      - <lint command>

  test-core:
    run:
      - <unit test command for touched core modules>

  test-contract:
    run:
      - <contract tests command>

  test-render-smoke:
    run:
      - <renderer smoke test command>

  perf-gate:
    run:
      - <startup/ram/installer measurement commands>
    artifacts:
      - <performance summary>

  packaging-check:
    run:
      - <release package command>
      - <installer size capture command>
    artifacts:
      - <installer artifact>
      - <size report>
```

## 6) Example - GitHub Actions (Minimal Skeleton)

```yaml
name: ci

on:
  pull_request:
  push:
    branches: [main]

jobs:
  preflight:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Check toolchain
        run: |
          rustc --version
          node --version

  build_and_static_checks:
    runs-on: ubuntu-latest
    needs: preflight
    steps:
      - uses: actions/checkout@v4
      - name: Build and checks
        run: |
          # Replace with real commands
          echo "cargo check"
          echo "pnpm type-check"
          echo "pnpm lint"

  test_contract:
    runs-on: ubuntu-latest
    needs: build_and_static_checks
    steps:
      - uses: actions/checkout@v4
      - name: Contract tests
        run: |
          # Replace with real commands
          echo "cargo test contract"
```

## 7) Example - GitLab CI (Minimal Skeleton)

```yaml
stages:
  - preflight
  - build_and_static_checks
  - test_contract

preflight:
  stage: preflight
  script:
    - rustc --version
    - node --version

build_and_static_checks:
  stage: build_and_static_checks
  script:
    - echo "cargo check"
    - echo "pnpm type-check"
    - echo "pnpm lint"

test_contract:
  stage: test_contract
  script:
    - echo "cargo test contract"
```

## 8) Common Mistakes

- Running all stages for every change without milestone filter.
- Using placeholder commands and forgetting replacement.
- Not uploading perf/packaging evidence artifacts.
- Skipping failing required stage without exception note.

## 9) Quick Starter Prompt for AI Agent

```md
Set up CI using docs/archive/planning/18-ci-verification-plan.md and docs/archive/planning/19-ci-job-template.md.
Target milestone: <M1..M6>.
Use only required stages for that milestone.
Replace placeholders with real commands from current repo.
Return:
1) CI file path(s),
2) stage list implemented,
3) commands used,
4) gaps/blockers.
```
