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
| `zip` | Zipping/Unzipping project format | `2.2.0` | MIT | Approved | Low | Used to pack/unpack .ptz project archives |

### Testing

| Crate | Purpose | Version Target | License | Status | Size Impact | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| `insta` | Snapshot testing | Latest stable | Apache-2.0 | Research | Dev-only | Contract test snapshots |
| `criterion` | Benchmarking | `0.5.x` | MIT/Apache-2.0 | Research | Dev-only | Performance benchmarks |

## 4) Frontend (npm) Dependencies

### Core

| Package | Purpose | Version Target | License | Status | Size Impact | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| `solid-js` | UI framework | `^1.8.15` | MIT | Approved | Low | Core framework, non-negotiable |
| `typescript` | Type safety | `^5.2.2` | Apache-2.0 | Approved | Dev-only | |
| `vite` | Build tooling | `^8.0.14` | MIT | Approved | Dev-only | Active Vite 8 build runner |
| `@tailwindcss/vite` | Tailwind build plugin | `^4.0.0` | MIT | Approved | Dev-only | Tailwind CSS v4 compiler integration |
| `tailwindcss` | Styling framework | `^4.0.0` | MIT | Approved | Low | CSS framework |
| `@tauri-apps/api` | Tauri IPC bridge | `^2.0.0` | MIT/Apache-2.0 | Approved | Low | Shell-core communication |
| `@tauri-apps/plugin-dialog` | Dialog plugin | `^2.0.0` | MIT/Apache-2.0 | Approved | Low | Dialog wrappers |
| `@tauri-apps/plugin-shell` | Shell execution | `^2.0.0` | MIT/Apache-2.0 | Approved | Low | Shell execution bridge |
| `clsx` | Classname composition | `^2.1.1` | MIT | Approved | Negligible | Conditional Tailwind styling helper |
| `lucide-solid` | UI Icons pack | `^1.16.0` | ISC | Approved | Low | Action icons |

### Testing & Dev Tooling

| Package | Purpose | Version Target | License | Status | Size Impact | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| `vitest` | Unit testing | `^4.1.7` | MIT | Approved | Dev-only | Unit testing runner |
| `@testing-library/jest-dom` | DOM assertions | `^6.9.1` | MIT | Approved | Dev-only | Unit testing DOM checks |
| `@playwright/test` | Browser E2E tests | `^1.60.0` | Apache-2.0 | Approved | Dev-only | E2E automation runner |
| `canvas` | Node canvas simulation | `^3.2.3` | MIT | Approved | Dev-only | Test rendering emulation |
| `jsdom` | Test DOM emulation | `^29.1.1` | MIT | Approved | Dev-only | Emulated browser env for Vitest |
| `@vitest/ui` | Vitest graphical UI | `^4.1.7` | MIT | Approved | Dev-only | Visual test reporter |
| `esbuild` | JS bundling/compiling | `^0.28.0` | MIT | Approved | Dev-only | Used by Vite internally |
| `eslint` | Linting | `9.x` | MIT | Approved | Dev-only | |
| `prettier` | Formatting | `3.x` | MIT | Approved | Dev-only | |

## 5) License Compatibility Matrix

| Dependency License | Compatible with AGPL-3.0? | Notes |
| --- | --- | --- |
| MIT | âœ… Yes | Permissive, no conflict |
| Apache-2.0 | âœ… Yes | Compatible with GPL family |
| MIT/Apache-2.0 dual | âœ… Yes | Standard Rust ecosystem dual license |
| BSD-2/3 | âœ… Yes | Permissive |
| GPL-3.0 | âœ… Yes | Same family |
| LGPL-2.1/3.0 | âš ï¸ Conditional | OK for dynamic linking; static linking requires review |
| MPL-2.0 | âš ï¸ Conditional | File-level copyleft; generally compatible but review |
| Proprietary | âŒ No | Not allowed |
| SSPL | âŒ No | Not OSI-approved, incompatible |

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
- Track installer size trend across milestones per `docs/reference/performance-measurement-protocol.md`.
- If a new dependency adds `> 2 MB` to installer size, document justification.

## 9) Rejection Log

Track rejected dependencies with rationale to avoid re-evaluation cycles.

| Crate/Package | Reason for Rejection | Date | Alternative |
| --- | --- | --- | --- |
| â€” | â€” | â€” | â€” |

## 10) Change Control

- Adding a new dependency requires updating this file first.
- Removing an approved dependency requires noting the reason.
- Status changes must include date and brief rationale.
- Major dependency decisions should be recorded in `docs/decisions/id-decision-log.md`.
