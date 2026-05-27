# 31 - Dependency Inventory (MVP)

This document tracks planned third-party dependencies, their evaluation status,
and policies for managing them during MVP development.

## 1) Purpose

- Prevent unaudited dependencies from entering the project.
- Ensure license compatibility with `AGPL-3.0-or-later`.
- Track size and security impact of each dependency.
- Provide a reference for CI vulnerability scanning setup.

## 2) Evaluation Criteria

Each dependency is evaluated on:

| Criterion | Weight | Description |
| --- | --- | --- |
| License compatibility | **Mandatory** | Must be compatible with AGPL-3.0-or-later |
| Maintenance status | High | Active maintenance, recent releases, responsive issues |
| Security track record | High | No unpatched critical CVEs, responsive disclosure |
| Size impact | Medium | Contribution to installer and compile time |
| Ecosystem maturity | Medium | Adoption level, documentation quality |
| Alternative availability | Low | Whether viable alternatives exist |

Status labels:

- `Approved`: evaluated and accepted for MVP use.
- `Provisional`: likely needed but pending final evaluation.
- `Research`: under investigation, not yet committed.
- `Rejected`: evaluated and excluded.

## 3) Rust Crate Dependencies

### Core Framework

| Crate | Purpose | Version Target | License | Status | Size Impact | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| `tauri` | Desktop shell framework | `2.x` | MIT/Apache-2.0 | Approved | High (expected) | Core framework, non-negotiable |
| `wgpu` | GPU rendering | Latest stable | MIT/Apache-2.0 | Approved | High (expected) | Core renderer, non-negotiable |
| `serde` | Serialization/deserialization | `1.x` | MIT/Apache-2.0 | Approved | Low | Used for command payloads and config |
| `serde_json` | JSON encoding/decoding | `1.x` | MIT/Apache-2.0 | Approved | Low | IPC transport format |
| `uuid` | Unique ID generation | `1.x` | MIT/Apache-2.0 | Approved | Low | Document/layer/history IDs |

### Image Processing

| Crate | Purpose | Version Target | License | Status | Size Impact | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| `image` | Image decoding/encoding (JPG/PNG/WebP) | `0.25.x` | MIT/Apache-2.0 | Approved | Medium | Core export pipeline |
| `imageproc` | Image processing operations | Latest stable | MIT | Research | Medium | May be needed for transform/resize; evaluate if custom impl is lighter |
| `fast_image_resize` | High-performance resize | Latest stable | MIT/Apache-2.0 | Research | Low | Alternative to `image` resize if performance is insufficient |

### Utilities

| Crate | Purpose | Version Target | License | Status | Size Impact | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| `thiserror` | Error type derivation | `1.x` | MIT/Apache-2.0 | Approved | Negligible | Cleaner error types for command responses |
| `anyhow` | Error handling (internal) | `1.x` | MIT/Apache-2.0 | Provisional | Negligible | For internal error propagation, not user-facing |
| `log` | Logging facade | `0.4.x` | MIT/Apache-2.0 | Approved | Negligible | Structured logging |
| `env_logger` | Log output (dev) | `0.11.x` | MIT/Apache-2.0 | Approved | Negligible | Dev-only, not in release builds |
| `bytemuck` | Safe byte casting | `1.x` | MIT/Apache-2.0 | Provisional | Negligible | Pixel buffer manipulation |
| `lz4_flex` | Compression | Latest stable | MIT/Apache-2.0 | Research | Low | History snapshot compression (if needed) |

### Testing

| Crate | Purpose | Version Target | License | Status | Size Impact | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| `insta` | Snapshot testing | Latest stable | Apache-2.0 | Research | Dev-only | Contract test snapshots |
| `criterion` | Benchmarking | `0.5.x` | MIT/Apache-2.0 | Research | Dev-only | Performance benchmarks |

## 4) Frontend (npm) Dependencies

### Core

| Package | Purpose | Version Target | License | Status | Size Impact | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| `solid-js` | UI framework | `1.x` | MIT | Approved | Low | Core framework, non-negotiable |
| `typescript` | Type safety | `5.x` | Apache-2.0 | Approved | Dev-only | |
| `vite` | Build tooling | `5.x` | MIT | Approved | Dev-only | |
| `@tauri-apps/api` | Tauri IPC bridge | `2.x` | MIT/Apache-2.0 | Approved | Low | Shell-core communication |
| `@tauri-apps/cli` | Tauri CLI tooling | `2.x` | MIT/Apache-2.0 | Approved | Dev-only | Build and dev server |

### Testing (Frontend)

| Package | Purpose | Version Target | License | Status | Size Impact | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| `vitest` | Unit testing | Latest stable | MIT | Provisional | Dev-only | Frontend unit tests |
| `@testing-library/jest-dom` | DOM assertions | Latest stable | MIT | Research | Dev-only | If DOM testing is needed |

### Dev Tooling

| Package | Purpose | Version Target | License | Status | Size Impact | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| `eslint` | Linting | `9.x` | MIT | Approved | Dev-only | |
| `prettier` | Formatting | `3.x` | MIT | Approved | Dev-only | |
| `eslint-plugin-solid` | SolidJS lint rules | Latest stable | MIT | Provisional | Dev-only | |

## 5) License Compatibility Matrix

| Dependency License | Compatible with AGPL-3.0? | Notes |
| --- | --- | --- |
| MIT | ✅ Yes | Permissive, no conflict |
| Apache-2.0 | ✅ Yes | Compatible with GPL family |
| MIT/Apache-2.0 dual | ✅ Yes | Standard Rust ecosystem dual license |
| BSD-2/3 | ✅ Yes | Permissive |
| GPL-3.0 | ✅ Yes | Same family |
| LGPL-2.1/3.0 | ⚠️ Conditional | OK for dynamic linking; static linking requires review |
| MPL-2.0 | ⚠️ Conditional | File-level copyleft; generally compatible but review |
| Proprietary | ❌ No | Not allowed |
| SSPL | ❌ No | Not OSI-approved, incompatible |

## 6) Security Scanning Policy

### CI Integration

- Run `cargo audit` on every PR merge gate (integrate into `preflight` CI stage).
- Run `npm audit` on every PR merge gate.
- Block merge if critical or high severity vulnerability is unpatched.

### Cadence

- Automated: on every PR via CI.
- Manual review: once per milestone for full dependency tree audit.
- Emergency: immediate response for any disclosed CVE affecting approved dependencies.

### Response Policy

| Severity | Response Time | Action |
| --- | --- | --- |
| Critical | Within 24 hours | Patch, upgrade, or remove dependency |
| High | Within 1 week | Evaluate and plan mitigation |
| Medium | Within 1 milestone | Track in risk register |
| Low | Best effort | Document and monitor |

## 7) Dependency Update Policy

- **Pin major versions**: avoid automatic major version bumps.
- **Review minor/patch updates**: allow for security and bug fixes.
- **Lockfile discipline**: `Cargo.lock` and `pnpm-lock.yaml` must be committed.
- **Update cadence**: review dependency updates at the start of each milestone.
- **Breaking changes**: any dependency upgrade that changes APIs requires code review.

## 8) Size Impact Monitoring

- Track `cargo bloat` output for top contributors to binary size.
- Track installer size trend across milestones per `docs/16-performance-measurement-protocol.md`.
- If a new dependency adds `> 2 MB` to installer size, document justification.

## 9) Rejection Log

Track rejected dependencies with rationale to avoid re-evaluation cycles.

| Crate/Package | Reason for Rejection | Date | Alternative |
| --- | --- | --- | --- |
| — | — | — | — |

## 10) Change Control

- Adding a new dependency requires updating this file first.
- Removing an approved dependency requires noting the reason.
- Status changes must include date and brief rationale.
- Major dependency decisions should be recorded in `docs/01-id-decision-log.md`.
